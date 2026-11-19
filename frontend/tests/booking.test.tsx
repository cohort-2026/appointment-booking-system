import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import AppRoutes from '../src/routes/AppRoutes';
import { safeCustomerReturnPath, finishVerifiedBooking } from '../src/lib/bookingFlow';
import { parseBookingDraft, saveBookingDraft } from '../src/lib/bookingDraft';
const date=new Date(Date.now()+86_400_000+7_200_000).toISOString().slice(0,10);
const start=(time:string)=>new Date(`${date}T${time}:00+02:00`).toISOString();
const customer={id:'customer',email:'c@test.invalid',firstName:'Test',role:'CUSTOMER'};
let loggedIn=false,kind='business',posts:Record<string,unknown>[]=[],conflict=false,details=0,availabilityFails=false;
function provider(){return {id:`${kind}:provider`,kind:kind==='business'?'BUSINESS':'SOLE_PROVIDER',name:'Test Studio',category:'Wellness',description:'Consultations',city:'Johannesburg',hours:'Mon-Sun 09:00-17:00',initials:'TS',status:'Closed',services:[{id:'service',name:'Consultation',description:'Full visit',duration:120,price:300,bookable:true}]};}
function Location(){return <output data-testid="location">{useLocation().pathname}</output>;}
function mount(path:string){return render(<MemoryRouter initialEntries={[path]}><AuthProvider><AppRoutes/><Location/></AuthProvider></MemoryRouter>);}
beforeEach(()=>{
  localStorage.clear();loggedIn=false;kind='business';posts=[];conflict=false;details=0;availabilityFails=false;
  vi.stubGlobal('fetch',vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(String(input),'http://localhost'),path=decodeURIComponent(url.pathname);
    const json=(body:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
    if(path==='/api/auth/me')return json(loggedIn?{user:customer}:{message:'Signed out'},loggedIn?200:401);
    if(path==='/api/auth/login'){loggedIn=true;return json({user:customer});}
    if(path==='/api/providers')return json({providers:[provider()]});
    if(path.endsWith('/availability')){
      if(availabilityFails)return json({message:'Availability unavailable'},503);
      return json({success:true,timeZone:'Africa/Johannesburg',cancellationCutoffHours:24,service:{id:'service',name:'Consultation',durationMinutes:120,bufferAfterMinutes:15,expectedPrice:'300'},staff:kind==='business'?[{id:'staff-record',name:'Sam Staff'}]:[],selectedStaffId:url.searchParams.get('staffId'),slots:kind==='business'&&!url.searchParams.get('staffId')?[]:['09:00','09:15','11:00','11:15'].map(t=>({startsAt:start(t),endsAt:new Date(Date.parse(start(t))+7_200_000).toISOString(),label:`${t} SAST`,status:t==='11:00'||(conflict&&posts.length&&t==='09:00')?'BOOKED':'AVAILABLE', ...(t==='11:00'?{recoveryUntil:start('11:15')}:{})}))});
    }
    if(path.startsWith('/api/providers/'))return json({provider:provider()});
    if(path==='/api/customer/appointments'&&init?.method==='POST'){
      const body=JSON.parse(init.body as string);posts.push(body);
      if(conflict&&posts.length===1)return json({message:'That time was just booked'},409);
      return json({appointment:{id:'saved',startsAt:body.startsAt,status:'CONFIRMED'}},201);
    }
    if(path==='/api/customer/appointments/saved'){
      details++;return json({appointment:{id:'saved',time:posts.at(-1)?.startsAt??start('09:00'),endsAt:new Date(Date.parse(start('09:00'))+7_200_000).toISOString(),service:'Consultation',durationMinutes:120,price:'300',status:'CONFIRMED',timeZone:'Africa/Johannesburg',customerNotes:posts.at(-1)?.customerNotes??null,providerName:'Test Studio',providerId:`${kind}:provider`,staffName:kind==='business'?'Sam Staff':null,address:'Johannesburg',phone:null,cancellationCutoffHours:24,changeDeadline:new Date(Date.parse(start('09:00'))-86_400_000).toISOString()}});
    }
    return json({message:`Unexpected API ${path}`},404);
  }));
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function choose(user:ReturnType<typeof userEvent.setup>){
  await user.click(await screen.findByRole('button',{name:/Consultation/}));await user.click(screen.getByRole('button',{name:'Choose a time',exact:true}));
  fireEvent.change(screen.getByLabelText('Choose a date'),{target:{value:date}});
  if(kind==='business'){
    await waitFor(()=>expect((screen.getByLabelText('Choose a staff member') as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(screen.getByLabelText('Choose a staff member'),'staff-record');
  }
  await user.click(await screen.findByRole('button',{name:'09:00 SAST',exact:true}));await user.click(screen.getByRole('button',{name:'Review booking'}));
}
describe('shared booking journey',()=>{
  it('public closed provider allows booking, restores after inline login, handles conflict and saves notes',async()=>{
    conflict=true;const user=userEvent.setup();mount('/providers/business%3Aprovider');
    await choose(user);await user.type(screen.getByLabelText('Notes for the provider (optional)'),'Please call');
    await user.click(screen.getByRole('button',{name:'Sign in to book',exact:true}));
    const dialog=within(await screen.findByRole('dialog'));await user.type(dialog.getByLabelText('Email'),'test@example.invalid');await user.type(dialog.getByLabelText('Password'),'password');await user.click(dialog.getByRole('button',{name:'Sign in',exact:true}));
    const confirm=await screen.findByRole('button',{name:'Confirm appointment',exact:true});await waitFor(()=>expect((confirm as HTMLButtonElement).disabled).toBe(false));await user.click(confirm);
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('just booked'));expect(posts).toHaveLength(1);
    await user.click(await screen.findByRole('button',{name:'09:15 SAST',exact:true}));await user.click(screen.getByRole('button',{name:'Review booking'}));
    expect((screen.getByLabelText('Notes for the provider (optional)') as HTMLTextAreaElement).value).toBe('Please call');
    await user.click(screen.getByRole('button',{name:'Confirm appointment',exact:true}));
    await screen.findByRole('heading',{name:'Appointment confirmed'});expect(posts[1]).toMatchObject({staffId:'staff-record',customerNotes:'Please call',startsAt:start('09:15')});expect(details).toBe(1);
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/customer/appointments/saved');
    cleanup();mount('/dashboard/customer/appointments/saved?confirmed=1');await screen.findByRole('heading',{name:'Appointment confirmed'});expect(details).toBe(2);expect(posts).toHaveLength(2);
  });
  it('dashboard discovery and sole-provider booking remain in shell without staff selection',async()=>{
    loggedIn=true;kind='sole';const user=userEvent.setup();mount('/dashboard/customer/book');
    await user.click(await screen.findByRole('link',{name:/View provider/}));
    expect(screen.getByTestId('location').textContent).toBe('/dashboard/customer/book/sole%3Aprovider');
    await choose(user);expect(screen.queryByLabelText('Choose a staff member')).toBeNull();
    await user.click(screen.getByRole('button',{name:'Confirm appointment',exact:true}));await screen.findByRole('heading',{name:'Appointment confirmed'});
    expect(screen.getByRole('navigation',{name:'Customer dashboard'})).toBeTruthy();expect(posts[0]).not.toHaveProperty('staffId');
  });
  it('another account’s draft is not restored and expired slots cannot auto-submit',async()=>{
    loggedIn=true;saveBookingDraft({version:1,providerId:'business:provider',serviceId:'service',date,startsAt:start('09:00'),customerId:'other',savedAt:Date.now()});
    mount('/dashboard/customer/book/business%3Aprovider');await screen.findByRole('heading',{name:'Choose your service'});expect(posts).toHaveLength(0);
    cleanup();saveBookingDraft({version:1,providerId:'business:provider',serviceId:'service',date,startsAt:start('09:00'),staffId:'staff-record',customerId:'customer',savedAt:0});
    mount('/dashboard/customer/book/business%3Aprovider');await screen.findByRole('heading',{name:'Find a time that suits you'});expect(posts).toHaveLength(0);
  });
  it('availability errors show retry and never enable confirmation',async()=>{
    loggedIn=true;kind='sole';availabilityFails=true;const user=userEvent.setup();mount('/providers/sole%3Aprovider');
    await user.click(await screen.findByRole('button',{name:/Consultation/}));await user.click(screen.getByRole('button',{name:'Choose a time',exact:true}));
    await screen.findByRole('alert');expect((screen.getByRole('button',{name:'Review booking'}) as HTMLButtonElement).disabled).toBe(true);
    availabilityFails=false;await user.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('button',{name:'09:00 SAST',exact:true});expect(posts).toHaveLength(0);
  });
});
it('authentication return paths support both entry points and reject external redirects',()=>{
  expect(safeCustomerReturnPath('/dashboard/customer/book/business%3Aprovider')).toBe('/dashboard/customer/book/business%3Aprovider');
  expect(safeCustomerReturnPath('/providers/sole%3Aprovider')).toBe('/providers/sole%3Aprovider');
  for(const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/dashboard/business'])expect(safeCustomerReturnPath(path)).toBeNull();
});
it('verified signup uses saved notes and routes only to a persisted confirmation',async()=>{
  saveBookingDraft({version:1,providerId:'sole:provider',serviceId:'service',date,startsAt:start('09:00'),source:'public',customerNotes:'Saved notes',savedAt:Date.now()});
  const create=vi.fn().mockResolvedValue({appointment:{id:'saved'}});
  const result=await finishVerifiedBooking(customer,'/providers/sole%3Aprovider',create);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({customerNotes:'Saved notes'}));
  expect(result.destination).toBe('/dashboard/customer/appointments/saved?confirmed=1');
  expect(parseBookingDraft(localStorage.getItem('appointment-booking-draft'))).toBeNull();
});

it('shows a disabled recovery start and enables the boundary after it', async () => {
  loggedIn = true;
  kind = 'sole';
  const user = userEvent.setup();
  mount('/dashboard/customer/book/sole%3Aprovider');
  await user.click(await screen.findByRole('button', { name: /Consultation/ }));
  await user.click(screen.getByRole('button', { name: 'Choose a time', exact: true }));
  fireEvent.change(screen.getByLabelText('Choose a date'), { target: { value: date } });
  const recovery = await screen.findByText('Recovery until 11:15');
  const blockedStart = recovery.closest('button');
  expect(blockedStart?.textContent).toContain('11:00 SAST');
  expect(blockedStart?.disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: '11:15 SAST', exact: true }).disabled).toBe(false);
});
