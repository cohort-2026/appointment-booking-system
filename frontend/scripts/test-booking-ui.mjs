// Browser contract tests against explicit fixtures, not the live deployment.
import { chromium, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
const root=resolve('dist');
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/') && file!==root){res.writeHead(403).end();return;}
  try{const data=await readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]??'application/octet-stream');res.end(data);}
  catch{res.setHeader('Content-Type','text/html');res.end(await readFile(resolve(root,'index.html')));}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const date=new Date(Date.now()+86_400_000+2*3_600_000).toISOString().slice(0,10);
const starts=time=>new Date(`${date}T${time}:00+02:00`).toISOString();
const user={id:'customer-1',firstName:'Test',lastName:'Customer',email:'test@example.invalid',role:'CUSTOMER'};
const provider=kind=>({id:kind==='business'?'business:biz':'sole:solo',kind:kind==='business'?'BUSINESS':'SOLE_PROVIDER',name:kind==='business'?'Test Studio':'Independent Studio',category:'Wellness',description:'Local appointment test provider.',city:'Johannesburg',hours:'Mon-Sun 09:00-17:00',initials:'TS',status:'Closed',services:[{id:'service-1',name:'Consultation',description:'A full consultation',duration:120,price:300,bookable:true}]});
let checks=0;
async function setup({loggedIn=false,kind='business',width=1280,conflict=false}={}){
  const context=await browser.newContext({viewport:{width,height:900},timezoneId:'America/New_York'});
  const page=await context.newPage();let authenticated=loggedIn,creates=0,details=0,failDetail=false,savedStart=starts('09:00'),savedNotes='';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=decodeURIComponent(url.pathname);
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/auth/me')return json(authenticated?{success:true,user}:{message:'Signed out'},authenticated?200:401);
    if(path==='/api/auth/login'){authenticated=true;return json({success:true,user});}
    if(path==='/api/providers')return json({success:true,providers:[provider(kind)]});
    if(path.endsWith('/availability'))return json({success:true,timeZone:'Africa/Johannesburg',cancellationCutoffHours:24,
      service:{id:'service-1',name:'Consultation',durationMinutes:120,bufferAfterMinutes:15,expectedPrice:'300'},
      staff:kind==='business'?[{id:'staff-1',name:'Sam Staff'}]:[],selectedStaffId:url.searchParams.get('staffId'),
      slots:kind==='business'&&!url.searchParams.get('staffId')?[]:['09:00','09:15','09:30'].map(time=>({startsAt:starts(time),endsAt:new Date(Date.parse(starts(time))+120*60_000).toISOString(),label:`${time} SAST`,status:conflict&&creates>0&&time==='09:00'?'BOOKED':'AVAILABLE'}))});
    if(path.startsWith('/api/providers/'))return json({success:true,provider:provider(kind)});
    if(path==='/api/customer/appointments'&&request.method()==='POST'){
      creates++;const input=request.postDataJSON();assert.equal(input.providerId,provider(kind).id);
      assert.equal(input.staffId,kind==='business'?'staff-1':undefined);
      if(conflict&&creates===1)return json({message:'That time was just booked. Choose another slot.'},409);
      savedStart=input.startsAt;savedNotes=input.customerNotes??'';return json({success:true,appointment:{id:'saved-appointment',startsAt:savedStart,status:'CONFIRMED',durationMinutes:120,service:'Consultation'}},201);
    }
    if(path==='/api/customer/appointments/saved-appointment'){
      details++;if(failDetail){failDetail=false;return json({message:'Temporarily unavailable'},503);}
      return json({success:true,appointment:{id:'saved-appointment',time:savedStart,endsAt:new Date(Date.parse(savedStart)+120*60_000).toISOString(),service:'Consultation',durationMinutes:120,price:'300',status:'CONFIRMED',timeZone:'Africa/Johannesburg',customerNotes:savedNotes,providerName:provider(kind).name,providerId:provider(kind).id,staffName:kind==='business'?'Sam Staff':null,address:'Johannesburg',phone:null,cancellationCutoffHours:24,changeDeadline:new Date(Date.parse(savedStart)-24*3_600_000).toISOString()}});
    }
    return json({message:`Unexpected test API: ${path}`},404);
  });
  return {page,context,errors,get creates(){return creates;},get details(){return details;},failNextDetail(){failDetail=true;}};
}
async function pick(page,kind){
  await page.getByRole('button',{name:/Consultation/}).click();await page.getByRole('button',{name:'Choose a time',exact:true}).click();
  await page.getByLabel('Choose a date').fill(date);
  if(kind==='business')await page.getByRole('combobox',{name:/Choose a staff member/}).selectOption('staff-1');
  await page.getByRole('button',{name:'09:00 SAST',exact:true}).click();await page.getByRole('button',{name:'Review booking'}).click();
}
try{
  const guest=await setup({conflict:true});const p=guest.page;
  await p.goto(`${origin}/providers/business%3Abiz`);await expect(p.getByText('Closed right now?',{exact:false})).toBeVisible();
  await pick(p,'business');await p.getByLabel('Notes for the provider (optional)').fill('Please call on arrival');
  await p.getByRole('button',{name:'Sign in to book',exact:true}).click();
  const dialog=p.getByRole('dialog');await dialog.getByLabel('Email',{exact:true}).fill('test@example.invalid');await dialog.getByLabel('Password',{exact:true}).fill('fixture-password');await dialog.getByRole('button',{name:'Sign in',exact:true}).click();
  await p.getByRole('button',{name:'Confirm appointment',exact:true}).click();
  await expect(p.getByRole('alert')).toContainText('just booked');assert.equal(guest.creates,1);
  await p.getByRole('button',{name:'09:15 SAST',exact:true}).click();await p.getByRole('button',{name:'Review booking'}).click();
  await expect(p.getByLabel('Notes for the provider (optional)')).toHaveValue('Please call on arrival');
  await p.getByRole('button',{name:'Confirm appointment',exact:true}).click();await expect(p).toHaveURL(/dashboard\/customer\/appointments\/saved-appointment/);
  await expect(p.getByRole('heading',{name:'Appointment confirmed'})).toBeVisible();await expect(p.getByText('Please call on arrival',{exact:true})).toBeVisible();
  await p.reload();await expect(p.getByRole('heading',{name:'Appointment confirmed'})).toBeVisible();assert.ok(guest.details>=2);assert.equal(guest.creates,2);
  const download=p.waitForEvent('download');await p.getByRole('button',{name:'Add to calendar'}).click();assert.ok((await download).suggestedFilename().endsWith('.ics'));
  if(process.env.UI_SCREENSHOT_DIR)await p.screenshot({path:`${process.env.UI_SCREENSHOT_DIR}/desktop.png`,fullPage:true});
  assert.deepEqual(guest.errors,[]);await guest.context.close();checks++;console.log('PASS public closed provider → inline login → conflict recovery → saved confirmation/refresh/calendar');

  const mobile=await setup({loggedIn:true,kind:'sole',width:390});const m=mobile.page;
  await m.goto(`${origin}/dashboard/customer/book`);await m.getByRole('link',{name:/View provider/}).click();await expect(m).toHaveURL(/dashboard\/customer\/book\/sole/);
  await pick(m,'sole');await expect(m.getByRole('combobox',{name:/Choose a staff member/})).toHaveCount(0);
  assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  if(process.env.UI_SCREENSHOT_DIR)await m.screenshot({path:`${process.env.UI_SCREENSHOT_DIR}/mobile-review.png`,fullPage:true});
  await m.getByRole('button',{name:'Confirm appointment',exact:true}).click();await expect(m.getByRole('heading',{name:'Appointment confirmed'})).toBeVisible();
  mobile.failNextDetail();await m.reload();await expect(m.getByRole('alert')).toHaveText('Temporarily unavailable');await m.getByRole('button',{name:'Try again'}).click();await expect(m.getByRole('heading',{name:'Appointment confirmed'})).toBeVisible();
  assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.deepEqual(mobile.errors,[]);assert.equal(mobile.creates,1);
  await mobile.context.close();checks++;console.log('PASS 390px dashboard sole booking stays in shell; no staff picker; detail error/retry');

  const restore=await setup({loggedIn:true});const r=restore.page;
  await restore.context.addInitScript(({date,starts})=>localStorage.setItem('appointment-booking-draft',JSON.stringify({version:1,providerId:'business:biz',serviceId:'service-1',date,staffId:'staff-1',startsAt:starts,source:'dashboard',customerId:'someone-else',savedAt:Date.now()})),{date,starts:starts('09:00')});
  await r.goto(`${origin}/dashboard/customer/book/business%3Abiz`);await expect(r.getByRole('heading',{name:'Choose your service'})).toBeVisible();await expect(r.getByRole('button',{name:'Confirm appointment',exact:true})).toHaveCount(0);assert.equal(restore.creates,0);
  await restore.context.close();checks++;console.log('PASS another customer’s persisted draft is not restored');
  console.log(`${checks} browser journey scenarios passed (mock API contracts)`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
