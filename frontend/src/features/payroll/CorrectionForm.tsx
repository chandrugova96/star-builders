import {useRef, useState} from 'react';
import {Button, DatePicker, FormField, Input, NumericInput, Select} from '../../components/ui';
import type {Site} from '../../types';
import type {PayrollApiRow, PayrollController} from './usePayroll';
import {weekEnd} from './model';

type Props = {row: PayrollApiRow; week: string; sites: Site[]; payroll: PayrollController; onClose: () => void};
export function CorrectionForm({row, week, sites, payroll, onClose}: Props) {
    const [direction, setDirection] = useState('Credit');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(row.items[0]?.date || week);
    const [siteId, setSiteId] = useState(row.items[0]?.siteId || sites[0]?.id || '');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const requestId = useRef(crypto.randomUUID());
    async function save() {
        const message = await payroll.adjust({labourId: row.id, originalWeek: week, originalDate: date, siteId, direction, amount, reason: reason.trim(), requestId: requestId.current});
        if (message) {setError(message); return;}
        onClose();
    }
    return <div className="mt-5 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-bold mb-2">Correct approved salary</h4>
        <p className="text-xs muted mb-4">The approved salary stays unchanged. This correction will settle in the next unapproved week, with its cost linked to the original work date and site.</p>
        <FormField label="Correction type"><Select value={direction} disabled={payroll.busy} onChange={event => setDirection(event.target.value)}><option value="Credit">Add missed salary</option><option value="Debit">Deduct excess salary</option></Select></FormField>
        <FormField label="Correction amount (₹)"><NumericInput value={amount} disabled={payroll.busy} onValueChange={setAmount}/></FormField>
        <FormField label="Original work date"><DatePicker value={date} min={week} max={weekEnd(week)} disabled={payroll.busy} onChange={event => setDate(event.target.value)}/></FormField>
        <FormField label="Original site"><Select value={siteId} disabled={payroll.busy} onChange={event => setSiteId(event.target.value)}>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</Select></FormField>
        <FormField label="Correction reason *"><Input value={reason} maxLength={1000} disabled={payroll.busy} onChange={event => setReason(event.target.value)}/></FormField>
        {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
        <div className="flex justify-end gap-2"><Button className="btn-secondary" disabled={payroll.busy} onClick={onClose}>Cancel correction</Button><Button className="btn-primary" disabled={payroll.busy || !amount || !reason.trim() || !siteId || !date || date<week || date>weekEnd(week)} onClick={() => void save()}>{payroll.busy ? 'Saving…' : 'Save correction'}</Button></div>
    </div>;
}
