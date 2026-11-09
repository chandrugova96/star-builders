import {useState} from 'react';
import {ReversalDialog} from '../finance/ReversalDialog';
import { Button, Table, Card, Badge as Status } from '../../components/ui';
import { SectionHead } from '../../components/SectionHead';
import { INR } from '../../utils/format';
import type { Application } from '../../hooks/useApplication';
export function Payments({ model }: {
    model: Application;
}) {
    const { payments, name, navigateTo } = model;
    const [reversing, setReversing] = useState<string | null>(null);
    const selected = payments.find(payment => payment.id === reversing);
    return <><SectionHead title="Salary Payments" subtitle="Salary payment history. Record payments within approved Weekly Payroll." action={<Button className="btn-secondary" onClick={() => navigateTo('Weekly Payroll')}>Open Weekly Payroll</Button>}/><Card className="overflow-hidden"><div className="p-5 font-bold">Payment History</div><Table><thead><tr><th>Payment ID</th><th>Labourer</th><th>Date</th><th>Amount</th><th>Method</th><th>Payroll Week</th><th>Status</th><th>Action</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.id}</td><td className="font-semibold">{name(p.labourId)}</td><td>{p.date}</td><td className="font-bold">{INR(p.amount)}</td><td>{p.mode}</td><td>{p.week}</td><td><Status value={p.status||'Paid'}/>{p.reversal&&<p className="text-xs muted mt-1">{p.reversal.date} · {p.reversal.reason}</p>}</td><td><Button className="text-blue-600 text-xs font-semibold" disabled={p.status==='Reversed'} onClick={()=>setReversing(p.id)}>Reverse</Button></td></tr>)}</tbody></Table></Card><p className="text-xs text-amber-700 mt-4">Payments remain allocated to their original payroll week.</p>{selected&&<ReversalDialog title="Reverse Salary Payment" minimumDate={selected.date} description={'Reverse '+INR(selected.amount)+' for '+name(selected.labourId)+'. The original payment stays in history and its salary balances become unpaid again. Use for an incorrect payment entry or money returned.'} onClose={()=>setReversing(null)} onSubmit={async input=>{await model.write('/payments/'+selected.id+'/reverse',input);model.setNotice('Payment reversed. Original salary balances restored.');}}/>}</>;
}
