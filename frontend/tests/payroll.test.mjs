import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Load the actual TypeScript model without adding a test framework dependency.
const source=readFileSync(new URL('../src/features/payroll/model.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {weekStart,weekEnd,shiftDay,buildRows,approveWeek,validatePayment,priorBalances,outstanding}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const worker={id:'L1',name:'Example worker',category:'Helper',phone:'',rate:800,status:'Active',initials:'EW'};
const day=(date,units=1,ot=0,siteId='S1')=>({labourId:'L1',date,units,ot,siteId});
const advance=(id,date,amount)=>({id,labourId:'L1',date,amount});
const approve=(week,attendance,advances=[],approvals={},history={})=>approveWeek(week,'2026-11-09',[worker],attendance,advances,history,approvals);
const payment=(overrides={})=>({id:'P1',requestId:'request1',labourId:'L1',week:'2026-11-02',date:'2026-11-09',mode:'Cash',amount:300,...overrides});

test('Monday–Sunday periods handle Sunday and year boundaries',()=>{
 assert.equal(weekStart('2026-11-08'),'2026-11-02');assert.equal(weekStart('2026-11-09'),'2026-11-09');
 assert.equal(weekEnd('2026-11-02'),'2026-11-08');assert.equal(weekStart('2027-01-01'),'2026-12-28');assert.equal(shiftDay('2026-12-28',7),'2027-01-04');
});
test('payroll filters dates and pays Sunday only when attendance exists',()=>{
 const rows=buildRows('2026-11-02',[worker],[day('2026-11-01'),day('2026-11-02'),day('2026-11-09')],[],{},{});
 assert.equal(rows[0].gross,800);assert.equal(rows[0].days,1);
 const sunday=buildRows('2026-11-02',[worker],[day('2026-11-08')],[],{},{});
 assert.equal(sunday[0].gross,800);
});
test('split sites, half-day overtime and effective midweek rates use work dates',()=>{
 const rows=buildRows('2026-11-02',[worker],[day('2026-11-02',.5,2),day('2026-11-02',.5,0,'S2'),day('2026-11-05')],[],{L1:[{from:'2026-01-01',rate:800},{from:'2026-11-04',rate:1000}]},{});
 assert.equal(rows[0].gross,2000);assert.equal(rows[0].days,2);assert.deepEqual(rows[0].items.map(i=>i.rate),[800,800,1000]);
});
test('approval snapshots do not change after wage, attendance or advance edits',()=>{
 const records=[day('2026-11-02')];const result=approve('2026-11-02',records);
 assert.equal(result.error,'');const snapshot=structuredClone(result.approvals);
 records[0].units=.5;worker.rate=900;
 assert.deepEqual(result.approvals,snapshot);worker.rate=800;
 assert.match(approve('2026-11-02',records,[],result.approvals).error,/already approved/);
});
test('advances are capped, carried and not recovered twice; later advances do not reopen approval',()=>{
 const advances=[advance('A1','2026-11-02',1000),advance('A2','2026-11-09',100)];
 const first=approve('2026-11-02',[day('2026-11-02')],advances);
 assert.equal(first.approvals['2026-11-02'].rows[0].advance,800);assert.equal(first.approvals['2026-11-02'].rows[0].net,0);
 const next=buildRows('2026-11-09',[worker],[day('2026-11-09')],advances,{},first.approvals)[0];
 assert.equal(next.advance,300);assert.equal(next.net,500);assert.equal(first.approvals['2026-11-02'].rows[0].advance,800);
});
test('ambiguous out-of-order advance recovery requests chronological review',()=>{
 const result=approve('2026-11-09',[day('2026-11-02'),day('2026-11-09')],[advance('A1','2026-11-02',900)]);
 assert.match(result.error,/chronological review/);assert.deepEqual(result.approvals,{});
});
test('partial payments, overpayments, repeated requests and invalid amounts',()=>{
 const {approvals}=approve('2026-11-02',[day('2026-11-02')]);
 assert.equal(validatePayment(approvals,[],payment()),'');assert.equal(outstanding(approvals,[payment()],'2026-11-02','L1'),500);
 assert.match(validatePayment(approvals,[payment()],payment()),/already/);
 assert.match(validatePayment(approvals,[payment()],payment({requestId:'new',amount:501})),/exceeds/);
 assert.equal(validatePayment(approvals,[payment()],payment({requestId:'new',amount:500})), '');
 for(const amount of [0,-1,NaN,Infinity,1.001])assert.match(validatePayment(approvals,[],payment({amount})),/positive amount/);
 assert.match(validatePayment({},[],payment()),/Approve/);
});
test('brought-forward balance stays on its original week and payments reduce it once',()=>{
 const first=approve('2026-11-02',[day('2026-11-02')]);
 const second=approve('2026-11-09',[day('2026-11-09')],[],first.approvals);
 assert.deepEqual(priorBalances(second.approvals,[payment()],'2026-11-09','L1'),[{week:'2026-11-02',amount:500}]);
 assert.equal(second.approvals['2026-11-09'].rows[0].net,800);
 assert.deepEqual(priorBalances(second.approvals,[payment({amount:800})],'2026-11-09','L1'),[]);
});
test('inactive workers retain payroll when they have historical attendance',()=>{
 const rows=buildRows('2026-11-02',[{...worker,status:'Inactive'}],[day('2026-11-02')],[],{},{});assert.equal(rows[0].gross,800);
});
