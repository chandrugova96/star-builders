import {makeBusinessAPI} from './fixtures/business.mjs';
import {test, after, afterEach, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:5173'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','Node','MutationObserver','sessionStorage','localStorage'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let scrollCalls=[];
window.scrollTo=(options)=>scrollCalls.push(options);
const folder=mkdtempSync(join(process.cwd(),'tests/.auth-'));
after(()=>{rmSync(folder,{recursive:true,force:true});dom.window.close();});
const bundle=await build({stdin:{contents:`
 import React from 'react';
 import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
 import {MemoryRouter} from 'react-router-dom';
 import {AuthProvider} from './src/features/auth/AuthProvider';
 import App from './src/App';
 import userEvent from '@testing-library/user-event';
 export {userEvent};
 export {screen,fireEvent,waitFor,cleanup,act};
 export function mount(path='/login') {return render(<MemoryRouter initialEntries={[path]}><AuthProvider><App/></AuthProvider></MemoryRouter>);}
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,packages:'external',platform:'node',format:'cjs',jsx:'automatic',write:false});
const entry=join(folder,'harness.cjs');writeFileSync(entry,bundle.outputFiles[0].text);
const {mount,screen,fireEvent,waitFor,cleanup,userEvent}=createRequire(import.meta.url)(entry);
const admin={id:'000000000000000000000001',name:'API Admin',phone:'0000000001',email:'',role:'ADMIN',active:true};
let currentUser, users, calls, rejectUsers, failLogin;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{
 const businessAPI=makeBusinessAPI();
 scrollCalls=[];localStorage.clear();sessionStorage.clear();currentUser={...admin};users=[{...admin}];calls=[];rejectUsers=0;failLogin=false;
 globalThis.fetch=async(path,options={})=>{
  const method=options.method||'GET';const body=options.body?JSON.parse(options.body):null;
  calls.push({path,method,body,authorization:options.headers?.get('Authorization')});
  if(path==='/api/auth/login')return failLogin?reply({error:{message:'Phone number or password is incorrect.'}},401):reply({data:{accessToken:'test-only-token',expiresIn:86400,user:currentUser}});
  if(path==='/api/auth/me')return reply({data:currentUser});
  const business=businessAPI(path,method,body,currentUser.role);if(business!==undefined)return reply(business);
  if(path.startsWith('/api/users')&&rejectUsers)return reply({error:{message:'Please sign in again.'}},rejectUsers);
  if(path.startsWith('/api/users?'))return reply({data:users,pagination:{total:users.length}});
  if(path==='/api/users'&&method==='POST'){
   const created={id:'000000000000000000000002',...body,active:true};delete created.password;users.push(created);return reply({data:created},201);
  }
  if(path.startsWith('/api/users/')&&method==='PATCH'){
   const id=path.split('/').at(-1);const user=users.find(user=>user.id===id);Object.assign(user,body);return reply({data:user});
  }
  throw new Error('Unexpected API request');
 };
});
afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
async function login(path='/settings'){
 mount(path);
 await screen.findByRole('button',{name:'Sign In'});
 fireEvent.change(screen.getByLabelText('Phone number'),{target:{value:'0000000001'}});
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-password-only'}});
 fireEvent.click(screen.getByRole('button',{name:'Sign In'}));
}
test('protected deep link signs in and loads real API users instead of example users',async()=>{
 await login();await screen.findByRole('button',{name:'Add User'});
 await waitFor(()=>assert.ok(screen.getAllByText('API Admin').length>=2));
 assert.equal(screen.queryByText('Suresh K'),null);
 assert.ok(calls.some(call=>call.path==='/api/auth/me'&&call.authorization==='Bearer test-only-token'));
 assert.ok(calls.some(call=>call.path.startsWith('/api/users?')&&call.authorization==='Bearer test-only-token'));
});
test('incorrect credentials remain on login and do not cache a session',async()=>{
 failLogin=true;await login();await screen.findByRole('alert');
 assert.ok(screen.getByRole('button',{name:'Sign In'}));assert.equal(localStorage.length,0);
});
test('user creation posts required phone/password and editing never sends a password or site assignment',async()=>{
 await login();const add=await screen.findByRole('button',{name:'Add User'});await waitFor(()=>assert.equal(add.disabled,false));fireEvent.click(add);
 fireEvent.change(screen.getByLabelText('Full Name *'),{target:{value:'New Supervisor'}});
 fireEvent.change(screen.getByLabelText('Phone number *'),{target:{value:'0000000002'}});
 fireEvent.change(screen.getByLabelText('Initial password *'),{target:{value:'new-test-password'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('User added.');assert.ok(screen.getByText('New Supervisor'));
 const created=calls.find(call=>call.method==='POST'&&call.path==='/api/users');assert.equal(created.body.password,'new-test-password');assert.equal(created.body.role,'SUPERVISOR');assert.equal(created.body.siteIds,undefined);
 fireEvent.click(screen.getAllByRole('button',{name:'Edit'})[1]);
 assert.equal(screen.queryByLabelText('Initial password *'),null);
 fireEvent.change(screen.getByLabelText('Full Name *'),{target:{value:'Updated Supervisor'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));await screen.findByText('User updated.');
 const patched=calls.find(call=>call.method==='PATCH');assert.equal(patched.body.name,'Updated Supervisor');assert.equal(patched.body.password,undefined);assert.equal(patched.body.siteIds,undefined);
});
test('sign out clears the session and removes protected content',async()=>{
 await login();await screen.findByText('User Management',{selector:'h3'});
 fireEvent.click(screen.getByRole('button',{name:'Account menu'}));
 fireEvent.click(screen.getByRole('menuitem',{name:'Sign Out'}));await screen.findByRole('button',{name:'Sign In'});
 assert.equal(localStorage.length,0);assert.equal(screen.queryByRole('button',{name:'Add User'}),null);
});
test('expired stored sessions never render protected screens',async()=>{
 localStorage.setItem('star-builders.session',JSON.stringify({accessToken:'expired',expiresAt:Date.now()-1000}));mount('/weekly-payroll');
 await screen.findByRole('button',{name:'Sign In'});assert.equal(screen.queryByText('Labour-wise Payroll'),null);
});
test('restored sessions are verified through current-user API before showing private content',async()=>{
 localStorage.setItem('star-builders.session',JSON.stringify({accessToken:'test-only-token',expiresAt:Date.now()+900000}));
 mount('/settings');await screen.findByRole('button',{name:'Add User'});
 assert.ok(calls.some(call=>call.path==='/api/auth/me'));assert.equal(calls.filter(call=>call.path==='/api/auth/login').length,0);
});
test('401 on a protected API call expires the session',async()=>{
 rejectUsers=401;await login();await screen.findByRole('button',{name:'Sign In'});
 await waitFor(()=>assert.equal(localStorage.length,0));assert.equal(screen.queryByRole('button',{name:'Add User'}),null);
});
test('Supervisor sees only allowed navigation and no Admin example records',async()=>{
 currentUser={...admin,role:'SUPERVISOR',name:'API Supervisor'};await login('/');
 await screen.findByText('Test Residence');
 assert.equal(screen.queryByRole('link',{name:'Weekly Payroll'}),null);assert.equal(screen.queryByRole('link',{name:'Settings'}),null);
 assert.equal(screen.queryByText('Today\'s Labour Cost'),null);assert.equal(calls.some(call=>call.path.startsWith('/api/users')),false);
});

test('phone input rejects letters and uses a text field without scroll increments',async()=>{
 mount();const input=screen.getByLabelText('Phone number');
 await userEvent.setup().type(input,'0012abc.34');
 assert.equal(input.value,'001234');assert.equal(input.type,'text');assert.equal(input.inputMode,'tel');
});
test('server validation failure keeps the user form open for correction',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(path,options)=>path==='/api/users'&&options?.method==='POST'?reply({error:{message:'A user with this phone number already exists.'}},409):original(path,options);
 await login();const add=await screen.findByRole('button',{name:'Add User'});await waitFor(()=>assert.equal(add.disabled,false));fireEvent.click(add);
 fireEvent.change(screen.getByLabelText('Full Name *'),{target:{value:'Duplicate User'}});
 fireEvent.change(screen.getByLabelText('Phone number *'),{target:{value:'0000000002'}});
 fireEvent.change(screen.getByLabelText('Initial password *'),{target:{value:'test-password-only'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('A user with this phone number already exists.');assert.ok(screen.getByRole('dialog'));assert.equal(screen.getByLabelText('Full Name *').value,'Duplicate User');
});
test('failed restoration shows retry without revealing protected data',async()=>{
 localStorage.setItem('star-builders.session',JSON.stringify({accessToken:'test-only-token',expiresAt:Date.now()+900000}));
 const original=globalThis.fetch;let offline=true;
 globalThis.fetch=async(path,options)=>{if(offline&&path==='/api/auth/me')throw new Error('offline');return original(path,options);};
 mount('/settings');await screen.findByRole('button',{name:'Retry'});
 assert.equal(screen.queryByRole('button',{name:'Add User'}),null);assert.equal(localStorage.length,1);
 offline=false;fireEvent.click(screen.getByRole('button',{name:'Retry'}));await screen.findByRole('button',{name:'Add User'});
});
test('invalid restored token is cleared and redirects to sign-in',async()=>{
 localStorage.setItem('star-builders.session',JSON.stringify({accessToken:'invalid',expiresAt:Date.now()+900000}));
 globalThis.fetch=async()=>reply({error:{message:'Sign in to continue.'}},401);
 mount('/settings');await screen.findByRole('button',{name:'Sign In'});
 assert.equal(localStorage.length,0);assert.equal(screen.queryByRole('button',{name:'Add User'}),null);
});
test('active session expires automatically even without a new API request',async()=>{
 localStorage.setItem('star-builders.session',JSON.stringify({accessToken:'test-only-token',expiresAt:Date.now()+250}));
 mount('/settings');await screen.findByRole('button',{name:'Sign In'});
 assert.equal(localStorage.length,0);assert.ok(screen.getByText('Your session has expired. Please sign in again.'));
});

test('password eye toggles visibility without changing the value or submitting login',async()=>{
 mount();const input=screen.getByLabelText('Password');
 fireEvent.change(input,{target:{value:'test-password-only'}});assert.equal(input.type,'password');
 fireEvent.click(screen.getByRole('button',{name:'Show password'}));
 assert.equal(input.type,'text');assert.equal(input.value,'test-password-only');
 fireEvent.click(screen.getByRole('button',{name:'Hide password'}));assert.equal(input.type,'password');
 assert.equal(calls.length,0);
});

test('sidebar chevron alone opens Sign Out; Escape and outside clicks close it',async()=>{
 await login();await screen.findByRole('button',{name:'Add User'});
 assert.equal(screen.queryByRole('menuitem',{name:'Sign Out'}),null);
 const trigger=screen.getByRole('button',{name:'Account menu'});
 fireEvent.click(trigger);assert.ok(screen.getByRole('menuitem',{name:'Sign Out'}));assert.equal(trigger.getAttribute('aria-expanded'),'true');
 fireEvent.keyDown(document,{key:'Escape'});assert.equal(screen.queryByRole('menuitem',{name:'Sign Out'}),null);assert.equal(document.activeElement,trigger);
 fireEvent.click(trigger);fireEvent.pointerDown(document.body);assert.equal(screen.queryByRole('menuitem',{name:'Sign Out'}),null);
});

test('closing and reopening the tab retains login until its existing expiry',async()=>{
 await login();await screen.findByRole('button',{name:'Add User'});
 assert.equal(localStorage.length,1);cleanup();sessionStorage.clear();
 calls=[];mount('/settings');await screen.findByRole('button',{name:'Add User'});
 assert.ok(calls.some(call=>call.path==='/api/auth/me'));assert.equal(calls.some(call=>call.path==='/api/auth/login'),false);
});
test('sign-out in another tab clears private content in this tab',async()=>{
 await login();await screen.findByRole('button',{name:'Add User'});
 localStorage.removeItem('star-builders.session');
 fireEvent(window,new window.StorageEvent('storage',{key:'star-builders.session',newValue:null}));
 await screen.findByRole('button',{name:'Sign In'});assert.equal(screen.queryByRole('button',{name:'Add User'}),null);
});

test('navigation opens each page at the top',async()=>{
 await login();await screen.findByRole('button',{name:'Add User'});scrollCalls=[];
 fireEvent.click(screen.getByRole('link',{name:'Sites'}));await screen.findByText('Site Management');
 assert.deepEqual(scrollCalls.at(-1),{top:0,left:0,behavior:'instant'});
 scrollCalls=[];fireEvent.click(screen.getByRole('link',{name:'Reports'}));await screen.findByText('Reports & Analytics');
 assert.deepEqual(scrollCalls.at(-1),{top:0,left:0,behavior:'instant'});assert.equal(window.history.scrollRestoration,'manual');
});

test('business creation sends API records and keeps salary money as a decimal string',async()=>{
 await login('/sites');await screen.findByText('Test Residence');
 fireEvent.click(screen.getByRole('button',{name:'Add New Site'}));
 fireEvent.change(screen.getByLabelText('Site Name *'),{target:{value:'New API Site'}});
 fireEvent.change(screen.getByLabelText('Budget (₹)'),{target:{value:'10000.25'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('Site created');
 await screen.findByText('New API Site');
 const site=calls.find(call=>call.path==='/api/sites'&&call.method==='POST');assert.equal(site.body.budget,'10000.25');assert.equal(site.body.supervisorId,null);
 fireEvent.click(screen.getByRole('link',{name:'Labourers',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Add Labourer'}));
 fireEvent.change(screen.getByLabelText('Full Name *'),{target:{value:'New API Worker'}});
 fireEvent.change(screen.getByLabelText('Daily Wage (₹)'),{target:{value:'850.25'}});
 fireEvent.change(screen.getByLabelText('Effective From'),{target:{value:'2026-01-01'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('Labourer created');
 const worker=calls.find(call=>call.path==='/api/labourers'&&call.method==='POST');assert.equal(worker.body.rate,'850.25');assert.equal(worker.body.from,'2026-01-01');
});

test('Supervisor saves attendance through API and never requests financial endpoints',async()=>{
 currentUser={...admin,role:'SUPERVISOR',name:'API Supervisor'};await login('/attendance');
 await screen.findByRole('button',{name:'Mark Attendance'});
 await waitFor(()=>assert.equal(screen.queryByText('Loading records…'),null));
 fireEvent.click(screen.getByRole('button',{name:'Mark Attendance'}));
 fireEvent.change(screen.getByLabelText('Attendance'),{target:{value:'0.5'}});
 fireEvent.change(screen.getByLabelText('Overtime Hours'),{target:{value:'0.5'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await screen.findByText('Attendance saved');
 const entry=calls.find(call=>call.path==='/api/attendance'&&call.method==='POST');assert.equal(entry.body.units,.5);assert.equal(entry.body.ot,'0.5');
 assert.equal(screen.queryByText('Wage Rate'),null);assert.equal(screen.queryByText('Earned'),null);
 assert.equal(calls.some(call=>/^\/api\/(payroll|payments|advances|reports|users)/.test(call.path)),false);
});

test('business API failures show retry without substituting example records',async()=>{
 const original=globalThis.fetch;let failing=true;
 globalThis.fetch=(path,options)=>path==='/api/sites'&&failing?Promise.resolve(reply({error:{message:'Site service unavailable.'}},503)):original(path,options);
 await login('/sites');await screen.findByText('Site service unavailable.');
 assert.equal(screen.queryByText('Anna Nagar Residence'),null);assert.equal(screen.queryByText('Test Residence'),null);
 failing=false;fireEvent.click(screen.getByRole('button',{name:'Retry records'}));await screen.findByText('Test Residence');
});

test('Mark Attendance keeps identity fields enabled even when defaults match an existing entry',async()=>{
 await login('/attendance');
 await screen.findByRole('button',{name:'Edit',exact:true});
 fireEvent.click(screen.getByRole('button',{name:'Mark Attendance'}));
 for(const label of ['Labourer','Site','Work Date','Attendance','Overtime Hours'])assert.equal(screen.getByLabelText(label,{selector:'[role="dialog"] *'}).disabled,false);
 fireEvent.change(screen.getByLabelText('Work Date'),{target:{value:'2026-11-02'}});
 assert.equal(screen.getByLabelText('Work Date').value,'2026-11-02');
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 fireEvent.click(screen.getByRole('button',{name:'Edit',exact:true}));
 for(const label of ['Labourer','Work Date'])assert.equal(screen.getByLabelText(label).disabled,true);
 assert.equal(screen.getByLabelText('Site',{selector:'[role="dialog"] *'}).disabled,true);
 assert.equal(screen.getByLabelText('Attendance').disabled,false);
 assert.equal(screen.getByLabelText('Overtime Hours').disabled,false);
 fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
 fireEvent.click(screen.getByRole('button',{name:'Mark Attendance'}));
 assert.equal(screen.getByLabelText('Work Date').disabled,false);
 assert.equal(screen.getByLabelText('Labourer').disabled,false);
});

test('approved payroll correction posts original site/date and retains the approved week',async()=>{
 await login('/weekly-payroll');
 const approve=await screen.findByRole('button',{name:'Approve Payroll',exact:true});await waitFor(()=>assert.equal(approve.disabled,false));
 fireEvent.click(approve);await screen.findByText('Payroll approved. You can record payments below.');
 fireEvent.click(screen.getByRole('button',{name:'Pay / Details',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Add correction'}));
 const save=screen.getByRole('button',{name:'Save correction'});assert.equal(save.disabled,true);
 fireEvent.change(screen.getByLabelText('Correction amount (₹)'),{target:{value:'125.25'}});
 fireEvent.change(screen.getByLabelText('Correction reason *'),{target:{value:'Missed overtime'}});
 const originalDate=screen.getByLabelText('Original work date').value;
 fireEvent.click(save);
 await screen.findByText('Missed overtime');
 const sent=calls.find(call=>call.path==='/api/payroll/adjustments'&&call.method==='POST');
 assert.equal(sent.body.amount,'125.25');assert.equal(sent.body.direction,'Credit');assert.equal(sent.body.originalDate,originalDate);assert.equal(sent.body.siteId,'000000000000000000000011');assert.match(sent.body.requestId,/^[a-f0-9-]{36}$/);
 assert.ok(screen.getByText(/Settlement week:/));
});

test('payment reversal requires a reason, retries with the same key and retains reversed history',async()=>{
 await login('/weekly-payroll');const approve=await screen.findByRole('button',{name:'Approve Payroll',exact:true});await waitFor(()=>assert.equal(approve.disabled,false));
 fireEvent.click(approve);await screen.findByText('Payroll approved. You can record payments below.');
 fireEvent.click(screen.getByRole('button',{name:'Pay / Details',exact:true}));
 fireEvent.change(screen.getByLabelText('Payment amount (₹)'),{target:{value:'100'}});
 fireEvent.click(screen.getByRole('button',{name:'Record Payment',exact:true}));await screen.findByText('Payment recorded. Oldest outstanding weeks were settled first.');
 fireEvent.click(screen.getByRole('link',{name:'Payments',exact:true}));
 const reverse=await screen.findByRole('button',{name:'Reverse',exact:true});fireEvent.click(reverse);
 const confirm=screen.getByRole('button',{name:'Confirm reversal'});assert.equal(confirm.disabled,true);
 fireEvent.change(screen.getByLabelText('Reason *'),{target:{value:'Incorrect entry'}});
 const original=globalThis.fetch;let fail=true;
 globalThis.fetch=(path,options)=>path.endsWith('/reverse')&&fail?(calls.push({path,method:options.method,body:JSON.parse(options.body)}),Promise.resolve(reply({error:{message:'Retry reversal.'}},503))):original(path,options);
 fireEvent.click(confirm);await screen.findByText('Retry reversal.');
 fail=false;fireEvent.click(screen.getByRole('button',{name:'Confirm reversal'}));
 await screen.findByText('Payment reversed. Original salary balances restored.');await screen.findByText('Reversed');
 const reversals=calls.filter(call=>call.path.endsWith('/reverse'));assert.equal(reversals.length,2);assert.equal(reversals[0].body.requestId,reversals[1].body.requestId);
 assert.equal(screen.getByRole('button',{name:'Reverse',exact:true}).disabled,true);assert.ok(screen.getByText(/Incorrect entry/));
});

test('advance reversal retains the original record and updates its status through the API',async()=>{
 await login('/advances');await waitFor(()=>assert.equal(screen.queryByText('Loading records…'),null));
 fireEvent.click(await screen.findByRole('button',{name:'Record Advance',exact:true}));
 fireEvent.change(screen.getByLabelText('Advance Amount (₹)'),{target:{value:'500'}});
 fireEvent.click(screen.getByRole('button',{name:'Save',exact:true}));await screen.findByText('Advance recorded');
 fireEvent.click(await screen.findByRole('button',{name:'Reverse',exact:true}));
 fireEvent.change(screen.getByLabelText('Reason *'),{target:{value:'Duplicate advance'}});
 fireEvent.click(screen.getByRole('button',{name:'Confirm reversal'}));await screen.findByText('Reversed');
 const reversal=calls.find(call=>call.path==='/api/advances/000000000000000000000031/reverse');assert.equal(reversal.body.reason,'Duplicate advance');
 assert.ok(screen.getByText(/Duplicate advance/));assert.equal(screen.getByRole('button',{name:'Reverse',exact:true}).disabled,true);
});
