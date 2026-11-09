// Test-only HTTP responses. Runtime UI does not import this file or seed records.
export function makeBusinessAPI(){
 const site={id:'000000000000000000000011',siteCode:'ST001',name:'Test Residence',location:'Test location',supervisorId:'',supervisor:'Unassigned',workers:1,status:'Active',budget:'100000.00'};
 const worker={id:'000000000000000000000021',labourCode:'LAB001',name:'Test Worker',category:'Mason',phone:'',rate:'1200.00',status:'Active',initials:'TW',salaryHistory:[{from:'2026-01-01',rate:'1200.00'}]};
 const sites=[site],workers=[worker],approved=new Set(),paid=new Map();let payments=[],advances=[],corrections=[];
 return function handle(path,method='GET',body,role='ADMIN'){
  const url=new URL(path,'http://test');const route=url.pathname;
  if(route==='/api/sites'&&method==='GET')return {data:role==='ADMIN'?sites:sites.map(({budget,...site})=>site)};
  if(route==='/api/sites'&&method==='POST'){const value={...site,...body,id:'000000000000000000000012',siteCode:'ST002',workers:0};sites.push(value);return {data:value};}
  if(route.endsWith('/supervisor')&&method==='PATCH'){sites[0].supervisorId=body.supervisorId||'';sites[0].supervisor=body.supervisorId?'Test Supervisor':'Unassigned';return {data:sites[0]};}
  if(route==='/api/labourers'&&method==='POST'){const value={...worker,...body,id:'000000000000000000000022',salaryHistory:[{from:body.from,rate:body.rate}]};workers.push(value);return {data:value};}
  if(route==='/api/labourers'&&method==='GET')return {data:role==='ADMIN'?workers:workers.map(({phone,rate,salaryHistory,...worker})=>worker)};
  if(route==='/api/attendance'&&method==='GET'){const value={labourId:worker.id,siteId:site.id,date:url.searchParams.get('date'),units:1,ot:'0',approved:false};return {data:[role==='ADMIN'?{...value,rate:'1200.00',earned:'1200.00'}:value]};}
  if(route==='/api/attendance'&&method==='POST')return {data:{saved:true}};
  if(route==='/api/advances'&&method==='GET')return {data:advances};
  if(route==='/api/advances'&&method==='POST'){const value={...body,id:'000000000000000000000031',remaining:body.amount,recovered:'0.00',status:'Active'};advances.push(value);return {data:value};}
  if(route.startsWith('/api/advances/')&&route.endsWith('/reverse')){const row=advances.find(row=>route.includes(row.id));row.status='Reversed';row.remaining='0.00';row.reversal={date:body.date,reason:body.reason,refund:'0.00',settlementWeek:null};return {data:{id:'test-reversal'}};}
  if(route.startsWith('/api/payments/')&&route.endsWith('/reverse')){const row=payments.find(row=>route.includes(row.id));row.status='Reversed';row.reversal={date:body.date,reason:body.reason};paid.set(row.week,0);return {data:{id:'test-reversal'}};}
  if(route==='/api/payroll/adjustments'){const end=new Date(body.originalWeek+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+7);const value={...body,id:'test-correction',kind:'WAGE',amount:(body.direction==='Debit'?'-':'')+body.amount,settlementWeek:end.toISOString().slice(0,10)};corrections.push(value);return {data:value};}
  if(route==='/api/payments'&&method==='GET')return {data:payments};
  if(route==='/api/payments'&&method==='POST'){paid.set(body.throughWeek,(paid.get(body.throughWeek)||0)+Number(body.amount));payments.push({id:'test-payment',...body,week:body.throughWeek,status:'Paid'});return {data:{id:'test-payment'}};}
  if(route==='/api/payroll/periods')return {data:[...approved].map(week=>({week,approved:true}))};
  if(route==='/api/payroll/approve'){approved.add(body.week);return {data:{approved:true}};}
  if(route==='/api/payroll'){const week=url.searchParams.get('week');const amount=paid.get(week)||0;return {data:{week,end:week,status:approved.has(week)?'Approved':'Pending',rows:[{id:worker.id,name:worker.name,days:1,gross:'1200.00',advance:'0.00',adjustment:'0.00',corrections:corrections.filter(row=>row.originalWeek===week||row.settlementWeek===week),net:'1200.00',paid:String(amount),balance:String(1200-amount),broughtForward:'0.00',totalOutstanding:String(1200-amount),items:[{date:week,siteId:site.id,units:1,ot:'0',rate:'1200.00',earned:'1200.00'}],prior:[],history:[]}]}};}
  if(route==='/api/reports/dashboard')return {data:{activeSites:1,activeLabourers:1,present:1,todayCost:'1200.00'}};
  if(route.startsWith('/api/reports/'))return {content:'Worker,Amount\nTest Worker,1200.00'};
  return undefined;
 };
}
