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
delete process.env.RESEND_API_KEY;
process.env.CRON_SECRET='local-cron-test';
delete process.env.VERCEL;
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
    INSERT INTO "Service"(id,"businessId","soleProviderId",name,"durationMinutes","expectedPrice","updatedAt") VALUES
      ('business-service','biz',NULL,'Consultation',120,300,now()),('sole-service',NULL,'sole','Independent consultation',120,NULL,now());
    INSERT INTO "StaffService"(id,"staffId","serviceId") VALUES ('assignment','worker','business-service');
    INSERT INTO "BusinessAvailability"(id,"businessId","dayOfWeek","startTime","endTime","updatedAt") SELECT 'bh'||d,'biz',d,'09:00','17:00',now() FROM generate_series(0,6) d;
    INSERT INTO "Availability"(id,"soleProviderId","dayOfWeek","startTime","endTime","updatedAt") SELECT 'sh'||d,'sole',d,'09:00','17:00',now() FROM generate_series(0,6) d;`);
  const business={customerId:'c1',providerKind:'business',providerId:'biz',serviceId:'business-service',staffId:'worker',startsAt:start};
  const sole={customerId:'c1',providerKind:'sole',providerId:'sole',serviceId:'sole-service',startsAt:start};
  const available={providerKind:'business',providerId:'biz',serviceId:'business-service',staffId:'worker',date:day};
  async function clear(){await prisma.outboxMessage.deleteMany();await prisma.appointmentEvent.deleteMany();await prisma.appointment.deleteMany();}
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
    await prisma.service.update({where:{id:'business-service'},data:{durationMinutes:30,expectedPrice:999,bufferAfterMinutes:30}});
    const r=await resolveBookingAvailability(prisma,available);
    const serviceEnd = new Date(+start + 120 * 60_000);
    const recoveryEnd = new Date(+start + 135 * 60_000);
    const recovery = r.slots.find(s => s.startsAt === serviceEnd.toISOString());
    assert.equal(recovery.status, 'BOOKED');
    assert.equal(recovery.recoveryUntil, recoveryEnd.toISOString());
    assert.equal(r.slots.find(s => s.startsAt === recoveryEnd.toISOString()).status, 'AVAILABLE');
    // Historical zero snapshots still receive the minimum in the live availability engine.
    await prisma.appointment.update({ where: { id: booked.id }, data: { bufferAfterMinutesAtBooking: 0 } });
    await assert.rejects(createBooking({ ...business, customerId: 'c2', startsAt: serviceEnd }), e => e.status === 409);
    const next = await createBooking({ ...business, customerId: 'c2', startsAt: recoveryEnd });
    assert.equal(+next.scheduledStart, +recoveryEnd);
    assert.equal(next.bufferAfterMinutesAtBooking, 30);
    await prisma.outboxMessage.deleteMany({ where: { appointmentId: next.id } });
    await prisma.appointmentEvent.deleteMany({ where: { appointmentId: next.id } });
    await prisma.appointment.delete({ where: { id: next.id } });
    await prisma.appointment.update({ where: { id: booked.id }, data: { bufferAfterMinutesAtBooking: 15 } });
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
  const app=express();app.use(express.json());app.use('/api/customer',router);
  for (const role of ['auth', 'business', 'provider', 'staff']) {
    app.use(`/api/${role}`, (await import(`../src/routes/${role}.routes.js`)).default);
  }
  server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  await check('auth requests share a PostgreSQL limit under concurrency and recover after expiry', async () => {
    const attempt = () => fetch(origin + '/api/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    const responses = await Promise.all(Array.from({ length: 8 }, attempt));
    assert.equal(responses.filter(response => response.status === 400).length, 5);
    const limited = responses.filter(response => response.status === 429);
    assert.equal(limited.length, 3);
    for (const response of limited) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      assert.ok(retryAfter >= 1 && retryAfter <= 900);
    }
    await sql.query('UPDATE "AuthRateLimit" SET "expiresAt" = NOW()');
    assert.equal((await attempt()).status, 400);
    const buckets = await prisma.authRateLimit.findMany();
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].count, 1);
  });
  const token=id=>jwt.sign({userId:id,role:'CUSTOMER'},process.env.JWT_SECRET);
  await check('signed-in customer can save their profile while email remains read-only', async () => {
    const headers = { authorization: `Bearer ${token('c1')}`, 'Content-Type': 'application/json' };
    const profile = origin + '/api/auth/me';
    const update = body => fetch(profile, { method: 'PATCH', headers, body: JSON.stringify(body) });
    assert.equal((await fetch(profile, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    assert.equal((await update({ email: 'different@test.invalid' })).status, 400);
    const response = await update({ firstName: 'Updated', lastName: 'Customer', phone: '0821234567' });
    assert.equal(response.status, 200);
    const { user } = await response.json();
    assert.equal(user.firstName, 'Updated');
    assert.equal(user.lastName, 'Customer');
    assert.equal(user.email, 'c1@test.invalid');
    const { user: saved } = await (await fetch(profile, { headers })).json();
    assert.equal(saved.firstName, 'Updated');
    assert.equal(saved.lastName, 'Customer');
    assert.ok(saved.phone);
    assert.equal(saved.email, 'c1@test.invalid');
  });
  await check('saved detail is direct, ownership-checked and excludes internal tokens',async()=>{
    const r=await fetch(`${origin}/api/customer/appointments/${booked.id}`,{headers:{authorization:`Bearer ${token('c1')}`}});assert.equal(r.status,200);
    const {appointment}=await r.json();assert.equal(appointment.price,'300');assert.equal(appointment.durationMinutes,120);assert.match(appointment.calendarUid,/^[A-Za-z0-9_-]{43}@itthynkappoint$/);assert.ok(!appointment.calendarUid.includes(booked.id));assert.equal(appointment.customerNotes,'Please call on arrival');assert.equal('manageTokenHash' in appointment,false);
    assert.equal((await fetch(`${origin}/api/customer/appointments/${booked.id}`,{headers:{authorization:`Bearer ${token('c2')}`}})).status,404);
    assert.equal((await fetch(`${origin}/api/customer/appointments/${booked.id}`)).status,401);
  });
  await check('HTTP input validation rejects timezone-free starts and oversized notes',async()=>{
    const headers={authorization:`Bearer ${token('c1')}`,'Content-Type':'application/json'};
    const body={providerId:'business:biz',serviceId:'business-service',staffId:'worker',startsAt:`${day}T09:00:00`};
    assert.equal((await fetch(`${origin}/api/customer/appointments`,{method:'POST',headers,body:JSON.stringify(body)})).status,400);
    assert.equal((await fetch(`${origin}/api/customer/appointments`,{method:'POST',headers,body:JSON.stringify({...body,startsAt:start.toISOString(),customerNotes:'x'.repeat(501)})})).status,400);
  });
  const request=async (customer,path,method='GET',body)=>{
    const response=await fetch(`${origin}/api/customer/appointments${path}`,{
      method, headers:{authorization:`Bearer ${token(customer)}`,'Content-Type':'application/json'},
      ...(body!==undefined?{body:JSON.stringify(body)}:{}),
    });
    return {status:response.status,...await response.json()};
  };
  const manageDay=bookingDate(new Date(Date.now()+3*DAY_MS));
  const time=(hour,minute=0)=>new Date(+parseBookingDate(manageDay)+(hour*60+minute)*60_000).toISOString();
  let savedId;
  await check('HTTP booking opens by ID; unauthorized reads and writes do not disclose it',async()=>{
    await clear();
    await prisma.service.update({where:{id:'business-service'},data:{durationMinutes:120,expectedPrice:300,bufferAfterMinutes:30}});
    const saved=await request('c1','','POST',{providerId:'business:biz',serviceId:'business-service',staffId:'worker',startsAt:time(9)});
    assert.equal(saved.status,201);
    savedId=saved.appointment.id;
    const detail=await request('c1',`/${savedId}`);
    assert.equal(detail.appointment.canCancel,true);assert.equal(detail.appointment.canReschedule,true);
    const dashboard = await fetch(origin + '/api/customer/dashboard', {
      headers: { authorization: `Bearer ${token('c1')}` },
    });
    assert.equal(dashboard.status, 200);
    const { upcomingAppointments } = await dashboard.json();
    assert.equal(upcomingAppointments[0].id, savedId);
    assert.equal(upcomingAppointments[0].canReschedule, detail.appointment.canReschedule);
    assert.equal(upcomingAppointments[0].calendarUid, detail.appointment.calendarUid);
    assert.equal(upcomingAppointments[0].endsAt, detail.appointment.endsAt);
    assert.deepEqual(detail.appointment.events.map(event=>event.type),['CREATED']);
    assert.equal((await request('c2',`/${savedId}/reschedule-options?date=${manageDay}`)).status,404);
    assert.equal((await request('c2',`/${savedId}/reschedule`,'PATCH',{startsAt:time(10)})).status,404);
    assert.equal((await request('c2',`/${savedId}/cancel`,'PATCH',{})).status,404);
  });
  await check('replacement options exclude only the owned booking; conflict leaves original and history intact',async()=>{
    await createBooking({...business,customerId:'c2',startsAt:new Date(time(13))});
    await prisma.service.update({where:{id:'business-service'},data:{durationMinutes:30,expectedPrice:900,bufferAfterMinutes:15}});
    const options=await request('c1',`/${savedId}/reschedule-options?date=${manageDay}`);
    assert.equal(options.status,200);
    assert.equal(options.slots.some(slot=>slot.startsAt===time(9)),false);
    assert.equal(options.slots.find(slot=>slot.startsAt===time(9,15)).status,'AVAILABLE');
    assert.equal(options.slots.find(slot=>slot.startsAt===time(13)).status,'BOOKED');
    assert.equal((await request('c1',`/${savedId}/reschedule`,'PATCH',{startsAt:time(12)})).status,409);
    assert.equal((await request('c1',`/${savedId}/reschedule`,'PATCH',{startsAt:time(9)})).status,422);
    const {appointment}=await request('c1',`/${savedId}`);
    assert.equal(appointment.time,time(9));assert.deepEqual(appointment.events.map(event=>event.type),['CREATED']);
  });
  await check('move preserves the reference, snapshot and assigned staff; cancel releases the replacement',async()=>{
    const move=await request('c1',`/${savedId}/reschedule`,'PATCH',{startsAt:time(9,15)});
    assert.equal(move.status,200);assert.equal(move.appointment.id,savedId);
    assert.equal(move.appointment.time,time(9,15));assert.equal(move.appointment.endsAt,time(11,15));
    assert.equal(move.appointment.price,'300');assert.equal(move.appointment.status,'RESCHEDULED');
    assert.deepEqual(move.appointment.events.map(event=>event.type),['CREATED','RESCHEDULED']);
    assert.equal(move.appointment.events[1].oldScheduledStart,time(9));
    const stored=await prisma.appointment.findUniqueOrThrow({where:{id:savedId}});
    assert.equal(stored.rescheduleCount,1);assert.equal(stored.staffId,'worker');assert.equal(stored.bufferAfterMinutesAtBooking,30);
    const publicSlots=()=>resolveBookingAvailability(prisma,{...available,date:manageDay});
    assert.equal((await publicSlots()).slots.find(slot=>slot.startsAt===time(11,30)).status,'BOOKED');
    const cancel=await request('c1',`/${savedId}/cancel`,'PATCH',{reason:'Schedule changed'});
    assert.equal(cancel.status,200);assert.equal(cancel.appointment.status,'CANCELLED');
    assert.equal(cancel.appointment.canCancel,false);assert.equal(cancel.appointment.canReschedule,false);
    assert.deepEqual(cancel.appointment.events.map(event=>event.type),['CREATED','RESCHEDULED','CANCELLED']);
    assert.equal(cancel.appointment.events[2].reason,'Schedule changed');
    assert.equal((await publicSlots()).slots.find(slot=>slot.startsAt===time(9,15)).status,'AVAILABLE');
    assert.equal((await request('c1',`/${savedId}/cancel`,'PATCH',{})).status,422);
    assert.equal((await request('c1',`/${savedId}/reschedule`,'PATCH',{startsAt:time(10)})).status,422);
    assert.equal(await prisma.appointmentEvent.count({where:{appointmentId:savedId}}),3);
  });
  await check('changes inside the cutoff preserve the saved appointment',async()=>{
    const soon=await prisma.appointment.create({data:{
      customerId:'c1',serviceId:'sole-service',soleProviderId:'sole',
      scheduledStart:new Date(Date.now()+3_600_000),scheduledEnd:new Date(Date.now()+7_200_000),
    }});
    const {appointment}=await request('c1',`/${soon.id}`);
    assert.equal(appointment.canCancel,false);assert.equal(appointment.canReschedule,false);
    assert.equal((await request('c1',`/${soon.id}/reschedule-options?date=${manageDay}`)).status,422);
    assert.equal((await request('c1',`/${soon.id}/cancel`,'PATCH',{})).status,422);
    assert.equal((await request('c1',`/${soon.id}/reschedule`,'PATCH',{startsAt:time(10)})).status,422);
    assert.equal(await prisma.appointmentEvent.count({where:{appointmentId:soon.id}}),0);
  });
  await check('rescheduling and another booking cannot both claim a replacement',async()=>{
    await clear();
    const source=await createBooking({...business,startsAt:new Date(time(9))});
    const [move,book]=await Promise.all([
      request('c1',`/${source.id}/reschedule`,'PATCH',{startsAt:time(12)}),
      request('c2','','POST',{providerId:'business:biz',serviceId:'business-service',staffId:'worker',startsAt:time(12)}),
    ]);
    assert.ok(move.status===200 ? book.status===409 : move.status===409 && book.status===201);
    assert.equal(await prisma.appointment.count({where:{scheduledStart:new Date(time(12))}}),1);
    const detail=await request('c1',`/${source.id}`);
    assert.equal(detail.appointment.events.length,move.status===200?2:1);
  });
  const api = async (path, { userId, role, method = 'GET', body, authorization } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (userId) headers.authorization = `Bearer ${jwt.sign({ userId, role }, process.env.JWT_SECRET)}`;
    if (authorization) headers.authorization = authorization;
    return fetch(origin + '/api' + path, { method, headers, body: JSON.stringify(body) });
  };
  await check('role-scoped history and terminal transitions enforce timing and record one actor under concurrency', async () => {
    const owned = { userId: 'owner', role: 'BUSINESS_OWNER' };
    const provider = { userId: 'sole-user', role: 'SOLE_PROVIDER' };
    const worker = { userId: 'worker-user', role: 'BUSINESS_STAFF' };
    const future = await createBooking({ ...business, startsAt: new Date(time(10)) });
    const update = (path, auth, status, reason) => api(path + '/status', { ...auth, method: 'PATCH', body: { status, reason } });
    const path = '/business/appointments/' + future.id;
    assert.equal((await update(path, owned, 'COMPLETED')).status, 422);
    assert.equal((await update('/staff/appointments/' + future.id, worker, 'NO_SHOW')).status, 422);
    assert.equal((await api('/provider/appointments/' + future.id + '/events', provider)).status, 404);
    assert.deepEqual((await (await api(path + '/events', owned)).json()).allowedStatuses, ['CANCELLED']);
    const [first, second] = await Promise.all([
      update(path, owned, 'CANCELLED', 'Owner unavailable'),
      update(path, owned, 'CANCELLED', 'Owner unavailable'),
    ]);
    assert.equal([first, second].filter(result => result.ok).length, 1);
    assert.ok([409, 422].includes([first, second].find(result => !result.ok).status));
    const saved = await prisma.appointment.findUniqueOrThrow({ where: { id: future.id }, include: { events: true } });
    assert.equal(saved.cancelledBy, 'OWNER');
    assert.equal(saved.events.filter(event => event.type === 'CANCELLED').length, 1);
    assert.equal(saved.events.find(event => event.type === 'CANCELLED').actorUserId, 'owner');

    const past = await prisma.appointment.create({ data: {
      customerId: 'c1', soleProviderId: 'sole', serviceId: 'sole-service',
      scheduledStart: new Date(Date.now() - 7_200_000), scheduledEnd: new Date(Date.now() - 3_600_000),
    } });
    const solePath = '/provider/appointments/' + past.id;
    assert.equal((await update(solePath, provider, 'NO_SHOW', 'Did not arrive')).status, 200);
    assert.equal((await update(solePath, provider, 'COMPLETED')).status, 422);
    const { events } = await (await api(solePath + '/events', provider)).json();
    assert.equal(events.length, 1);
    assert.equal(events[0].actor, 'PROVIDER');
    assert.equal(events[0].reason, 'Did not arrive');
    assert.equal(events[0].actorUser.firstName, 'Sole');
  });

  await check('reminders target the previous Johannesburg calendar day and skip repeat sends', async () => {
    await clear();
    const now = new Date('2026-12-31T22:30:00.000Z'); // 1 January, 00:30 SAST.
    const tomorrow = parseBookingDate('2027-01-02');
    const { sendTomorrowReminders } = await import('../src/services/appointment-reminders.service.js');
    const start = new Date(+tomorrow + 9 * 3_600_000);
    const base = {
      customerId: 'c1', soleProviderId: 'sole', serviceId: 'sole-service',
      scheduledStart: start, scheduledEnd: new Date(+start + 3_600_000),
    };
    const eligible = await prisma.appointment.create({ data: base });
    await prisma.appointment.create({ data: { ...base, status: 'CANCELLED' } });
    await prisma.appointment.create({ data: {
      ...base, scheduledStart: new Date(+start + DAY_MS),
      scheduledEnd: new Date(+start + DAY_MS + 3_600_000),
    } });
    const sent = [];
    const send = async message => { sent.push(message); };
    const outcomes = await Promise.all([sendTomorrowReminders(now, send), sendTomorrowReminders(now, send)]);
    assert.equal(outcomes.reduce((total, outcome) => total + outcome.accepted, 0), 1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].startsAt.toISOString(), start.toISOString());
    assert.equal(new URL(sent[0].appointmentUrl).pathname, '/dashboard/customer/appointments');
    assert.ok(!sent[0].appointmentUrl.includes(eligible.id));
    assert.equal((await sendTomorrowReminders(now, send)).accepted, 0);
  });

  console.log(`${checks} real PostgreSQL integration checks passed`);
}finally{
  if(server)await new Promise(r=>server.close(r));if(prisma)await prisma.$disconnect();await sql.end();await admin.query(`DROP DATABASE "${name}"`);await admin.end();
}
