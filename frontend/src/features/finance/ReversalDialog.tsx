import {useRef, useState} from 'react';
import {Button, DatePicker, FormField, Input, Modal} from '../../components/ui';
import {TODAY} from '../../utils/dates';

type Props = {title: string; description: string; minimumDate: string; onClose: () => void; onSubmit: (input: {date: string; reason: string; requestId: string}) => Promise<void>};
export function ReversalDialog({title, description, minimumDate, onClose, onSubmit}: Props) {
    const [date, setDate] = useState(TODAY);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const requestId = useRef(crypto.randomUUID());
    const pending = useRef(false);
    async function submit() {
        if (pending.current) return;
        pending.current = true; setSaving(true); setError('');
        try {await onSubmit({date, reason: reason.trim(), requestId: requestId.current}); onClose();}
        catch (error) {setError(error instanceof Error ? error.message : 'Unable to reverse this record.');}
        finally {pending.current = false; setSaving(false);}
    }
    return <Modal title={title} onClose={() => {if (!saving) onClose();}}>
        <p className="text-sm muted mb-4">{description}</p>
        <FormField label="Reversal date"><DatePicker value={date} min={minimumDate} max={TODAY} disabled={saving} onChange={event => setDate(event.target.value)}/></FormField>
        <FormField label="Reason *"><Input value={reason} maxLength={1000} disabled={saving} onChange={event => setReason(event.target.value)}/></FormField>
        {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button className="btn-primary" disabled={saving || !reason.trim() || !date || date < minimumDate || date > TODAY} onClick={() => void submit()}>{saving ? 'Saving…' : 'Confirm reversal'}</Button>
        </div>
    </Modal>;
}
