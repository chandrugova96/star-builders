import {useState} from 'react';
import {ReversalDialog} from '../finance/ReversalDialog';
import { Button, Table, Card, Badge as Status } from '../../components/ui';
import { SectionHead } from '../../components/SectionHead';
import { action } from '../../components/AddAction';
import { INR } from '../../utils/format';
import { TODAY } from '../../utils/dates';
import type { Application } from '../../hooks/useApplication';
export function Advances({ model }: {
    model: Application;
}) {
    const { open, active, advances, name } = model;
    const [reversing,setReversing]=useState<string|null>(null);
    const selected=advances.find(advance=>advance.id===reversing);
    return <><SectionHead title="Labour Advances" subtitle="Record cash advances and monitor future salary recoveries." action={action('Record Advance', () => open('advance', { labourId: active[0]?.id || '', date: TODAY }))}/><Card className="overflow-hidden"><div className="p-5 font-bold">Advance Register</div><Table><thead><tr><th>Reference</th><th>Labourer</th><th>Issued On</th><th>Advance Amount</th><th>Recovery</th><th>Status</th><th>Action</th></tr></thead><tbody>{advances.map(a => { const recovered = a.recovered; return <tr key={a.id}><td>{a.id}</td><td className="font-semibold">{name(a.labourId)}</td><td>{a.date}</td><td className="font-semibold">{INR(a.amount)}</td><td>{INR(recovered)} recovered · {INR(a.remaining)} remaining</td><td><Status value={a.status==='Reversed'?'Reversed':recovered >= a.amount ? 'Recovered' : recovered > 0 ? 'Partially Recovered' : 'Pending'}/>{a.reversal&&<p className="text-xs muted mt-1">{a.reversal.date} · {a.reversal.reason}{Number(a.reversal.refund)>0&&<> · Refund {INR(a.reversal.refund)} in week {a.reversal.settlementWeek}</>}</p>}</td><td><Button className="text-blue-600 text-xs font-semibold" disabled={a.status==='Reversed'} onClick={()=>setReversing(a.id)}>Reverse</Button></td></tr>; })}</tbody></Table></Card>{selected&&<ReversalDialog title="Reverse Labour Advance" minimumDate={selected.date} description={'Cancel '+INR(selected.amount)+' for '+name(selected.labourId)+'. Future deductions stop. '+(selected.recovered>0?INR(selected.recovered)+' already deducted will be returned through the next unapproved payroll.':'No salary has been deducted.')} onClose={()=>setReversing(null)} onSubmit={async input=>{await model.write('/advances/'+selected.id+'/reverse',input);model.setNotice('Advance reversed. Any recovered amount is scheduled for refund in payroll.');}}/>}</>;
}
