// Real PostgreSQL; only a new local s1_test_* database is created/dropped.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import express from 'express';
import jwt from 'jsonwebtoken';
const connection = process.env.S1_TEST_DATABASE_URL;
if (!connection || !['localhost','127.0.0.1','[::1]'].includes(new URL(connection).hostname)) throw new Error('S1_TEST_DATABASE_URL must point to a LOCAL PostgreSQL maintenance database. Remote/shared URLs are refused.');
const name=`s1_test_${Date.now()}_${process.pid}`;
const admin=new pg.Pool({connectionString:connection});
await admin.query(`CREATE DATABASE "${name}"`);
const url=new URL(connection); url.pathname=`/${name}`;
process.env.DATABASE_URL=url.toString(); process.env.JWT_SECRET='local-test-secret';
const sql=new pg.Pool({connectionString:url.toString()});
let prisma,server; let checks=0;
async function check(label,run){await run();checks++;console.log(`PASS ${label}`);}
try {
  const dir=new URL('../prisma/migrations/',import.meta.url);
  for(const m of (await readdir(dir)).filter(n=>/^\d/.test(n)).sort()) await sql.query(await readFile(new URL(`${m}/migration.sql`,dir),'utf8'));
  prisma=(await import('../src/lib/prisma.js')).default;
  const {createBooking,resolveBookingAvailability}=await import('../src/services/booking.service.js');
  const {bookingDate,parseBookingDate,DAY_MS}=await import('../src/lib/time.js');
  const day=bookingDate(new Date(Date.now()+DAY_MS));
  const start=new Date(+parseBookingDate(day)+9*3_600_000);
  await sql.query(`INSERT INTO "User"(id,email,"passwordHash","firstName",role,"isVerified","updatedAt") VALUES
    ('c1','c1@test.invalid','unused','One','CUSTOMER',true,now()),('c2','c2@test.invalid','unused','Two','CUSTOMER',true,now()),
    ('owner','owner@test.invalid','unused','Owner','BUSINESS_OWNER',true,now()),('worker-user','worker@test.invalid','unused','Worker','BUSINESS_STAFF',true,now()),
    ('sole-user','sole@test.invalid','unused','Sole','SOLE_PROVIDER',true,now());
    INSERT INTO "Business"(id,"ownerUserId",name,"updatedAt") VALUES ('biz','owner','Test Studio',now());
    INSERT INTO "BusinessStaff"(id,"businessId","userId","updatedAt") VALUES ('worker','biz','worker-user',now());
    INSERT INTO "SoleProvider"(id,"userId","displayName","updatedAt") VALUES ('sole','sole-user','Independent',now());
    INSERT INTO "Service"(id,"businessId","soleProviderId",name,"durationMinutes","bufferAfterMinutes","expectedPrice","updatedAt") VALUES
      ('business-service','biz',NULL,'Consultation',120,15,300,now()),('sole-service',NULL,'sole','Independent consultation',120,15,NULL,now());
    INSERT INTO "StaffService"(id,"staffId","serviceId") VALUES ('assignment','worker','business-service');
    INSERT INTO "BusinessAvailability"(id,"businessId","dayOfWeek","startTime","endTime","updatedAt") SELECT 'bh'||d,'biz',d,'09:00','17:00',now() FROM generate_series(0,6) d;
    INSERT INTO "Availability"(id,"soleProviderId","dayOfWeek","startTime","endTime","updatedAt") SELECT 'sh'||d,'sole',d,'09:00','17:00',now() FROM generate_series(0,6) d;`);
  const business={customerId:'c1',providerKind:'business',providerId:'biz',serviceId:'business-service',staffId:'worker',startsAt:start};
  const sole={customerId:'c1',providerKind:'sole',providerId:'sole',serviceId:'sole-service',startsAt:start};
  const available={providerKind:'business',providerId:'biz',serviceId:'business-service',staffId:'worker',date:day};
  async function clear(){await prisma.appointmentEvent.deleteMany();await prisma.appointment.deleteMany();}
  async function race(a,b){
    let arrived=0,release;const gate=new Promise(r=>{release=r;});
    const wrapped={$transaction:(op,options)=>prisma.$transaction(tx=>op(new Proxy(tx,{get(target,key){
      if(key!=='appointment') return Reflect.get(target,key);
      return new Proxy(target.appointment,{get(delegate,method){
        if(method!=='create') return Reflect.get(delegate,method);
        return async args=>{if(++arrived===2)release();let timer;
          try{await Promise.race([gate,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Writers did not reach barrier')),5000);})]);}finally{clearTimeout(timer);}
          return delegate.create(args);
        };
      }});
    }})),options)};
    const results=await Promise.allSettled([createBooking(a,wrapped),createBooking(b,wrapped)]);
    assert.equal(arrived,2);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
    assert.equal(await prisma.appointment.count(),1);assert.equal(await prisma.appointmentEvent.count(),1);
  }
  await check('plain-read availability uses SAST and BusinessStaff identity',async()=>{
    const r=await resolveBookingAvailability(prisma,available);assert.equal(r.slots[0].startsAt,start.toISOString());assert.equal(r.slots[0].label,'09:00 SAST');
    await assert.rejects(resolveBookingAvailability(prisma,{...available,staffId:'worker-user'}),e=>e.status===400);
  });
  await check('competing overlapping staff bookings: exactly one commits',async()=>{await race(business,{...business,customerId:'c2',startsAt:new Date(+start+15*60_000)});await clear();});
  await check('competing sole-provider bookings: exactly one commits',async()=>{await race(sole,{...sole,customerId:'c2'});await clear();});
  await check('customer overlap across different providers is protected concurrently',async()=>{await race(business,sole);await clear();});
  let booked;
  await check('snapshots and cleanup survive later service edits',async()=>{
    booked=await createBooking({...business,customerNotes:'Please call on arrival'});
    assert.equal(booked.priceAtBooking.toString(),'300');assert.equal(+booked.scheduledEnd,+start+120*60_000);assert.equal(booked.bufferAfterMinutesAtBooking,15);
    await prisma.service.update({where:{id:'business-service'},data:{durationMinutes:30,expectedPrice:999,bufferAfterMinutes:0}});
    const r=await resolveBookingAvailability(prisma,available);
    assert.equal(r.slots.find(s=>Date.parse(s.startsAt)===+start+120*60_000).status,'BOOKED');
    assert.equal(r.slots.find(s=>Date.parse(s.startsAt)===+start+135*60_000).status,'AVAILABLE');
  });
  await check('S2 can exclude its authorized current appointment and retain its saved interval',async()=>{
    const r=await resolveBookingAvailability(prisma,{...available,excludeAppointmentId:booked.id,snapshot:{durationMinutes:120,bufferAfterMinutes:15}});
    assert.equal(r.service.durationMinutes,120);assert.equal(r.slots[0].status,'AVAILABLE');assert.equal(Date.parse(r.slots[0].endsAt)-Date.parse(r.slots[0].startsAt),120*60_000);
  });
  await check('cross-day occupied intervals are not missed',async()=>{
    await prisma.appointment.create({data:{customerId:'c2',serviceId:'sole-service',soleProviderId:'sole',scheduledStart:new Date(+start-DAY_MS),scheduledEnd:new Date(+start+30*60_000),bufferAfterMinutesAtBooking:15}});
    const r=await resolveBookingAvailability(prisma,{providerKind:'sole',providerId:'sole',serviceId:'sole-service',date:day});
    assert.equal(r.slots[0].status,'BOOKED');assert.equal(r.slots.find(s=>Date.parse(s.startsAt)===+start+45*60_000).status,'AVAILABLE');
  });
  await check('inactive service and unverified staff are rejected',async()=>{
    await prisma.service.update({where:{id:'sole-service'},data:{active:false}});
    await assert.rejects(resolveBookingAvailability(prisma,{providerKind:'sole',providerId:'sole',serviceId:'sole-service',date:day}),e=>e.status===404);
    await prisma.user.update({where:{id:'worker-user'},data:{isVerified:false}});
    await assert.rejects(resolveBookingAvailability(prisma,available),e=>e.status===400);
    await prisma.user.update({where:{id:'worker-user'},data:{isVerified:true}});
  });
  const router=(await import('../src/routes/customer.routes.js')).default;
  const app=express();app.use(express.json());app.use('/api/customer',router);server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  const token=id=>jwt.sign({userId:id,role:'CUSTOMER'},process.env.JWT_SECRET);
  await check('saved detail is direct, ownership-checked and excludes internal tokens',async()=>{
    const r=await fetch(`${origin}/api/customer/appointments/${booked.id}`,{headers:{authorization:`Bearer ${token('c1')}`}});assert.equal(r.status,200);
    const {appointment}=await r.json();assert.equal(appointment.price,'300');assert.equal(appointment.durationMinutes,120);assert.equal(appointment.customerNotes,'Please call on arrival');assert.equal('manageTokenHash' in appointment,false);
    assert.equal((await fetch(`${origin}/api/customer/appointments/${booked.id}`,{headers:{authorization:`Bearer ${token('c2')}`}})).status,404);
    assert.equal((await fetch(`${origin}/api/customer/appointments/${booked.id}`)).status,401);
  });
  await check('HTTP input validation rejects timezone-free starts and oversized notes',async()=>{
    const headers={authorization:`Bearer ${token('c1')}`,'Content-Type':'application/json'};
    const body={providerId:'business:biz',serviceId:'business-service',staffId:'worker',startsAt:`${day}T09:00:00`};
    assert.equal((await fetch(`${origin}/api/customer/appointments`,{method:'POST',headers,body:JSON.stringify(body)})).status,400);
    assert.equal((await fetch(`${origin}/api/customer/appointments`,{method:'POST',headers,body:JSON.stringify({...body,startsAt:start.toISOString(),customerNotes:'x'.repeat(501)})})).status,400);
  });
  console.log(`${checks} real PostgreSQL integration checks passed`);
}finally{
  if(server)await new Promise(r=>server.close(r));if(prisma)await prisma.$disconnect();await sql.end();await admin.query(`DROP DATABASE "${name}"`);await admin.end();
}
