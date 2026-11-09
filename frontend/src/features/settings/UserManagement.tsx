import {useRef, useState} from 'react';
import {Plus} from 'lucide-react';
import {Button, Card, FormField, Input, Modal, NumericInput, Select, Table} from '../../components/ui';
import type {Application} from '../../hooks/useApplication';
import type {DemoUser, UserRole} from '../../types';
import type {UserDraft} from './userModel';

export function UserManagement({model}: {model: Application}) {
    const {users, usersLoading, usersError, refreshUsers, saveUser} = model;
    const [draft, setDraft] = useState<UserDraft | null>(null);
    const [editingId, setEditingId] = useState<string>();
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const submitted = useRef(false);

    function open(role: UserRole, user?: DemoUser) {
        setDraft(user ? {...user, siteIds: [...user.siteIds]} : {name: '', email: '', phone: '', role, siteIds: []});
        setEditingId(user?.id);
        setError('');
        setNotice('');
        submitted.current = false; setPassword('');
    }
    function update<K extends keyof UserDraft>(key: K, value: UserDraft[K]) {
        setDraft(current => current ? {...current, [key]: value} : null);
        setError('');
    }
    async function submit() {
        if (!draft || submitted.current) return;
        submitted.current = true; setBusy(true);
        const error = await saveUser(draft, editingId, password);
        setBusy(false);
        if (error) {submitted.current = false; setError(error); return;}
        submitted.current = true;
        setDraft(null); setPassword('');
        setNotice(editingId ? 'User updated.' : 'User added.');
    }

    return <>
        <Card className="overflow-hidden">
            <div className="p-5 flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-bold">User Management</h3><p className="text-xs muted mt-1">Manage admins and supervisors. Assign supervisors from the Sites page.</p></div>
                <div className="flex flex-wrap gap-2">
                    <Button className="btn-primary flex items-center gap-2" disabled={usersLoading || Boolean(usersError) || busy} onClick={() => open('Supervisor')}><Plus size={16}/>Add User</Button>
                </div>
            </div>
            {notice && <p role="status" className="mx-5 mb-4 text-sm text-blue-700">{notice}</p>}
            {usersError && <div role="alert" className="mx-5 mb-4 text-sm text-red-700">{usersError} <Button className="text-blue-600 font-semibold" onClick={refreshUsers}>Retry</Button></div>}
            {usersLoading && <p role="status" className="mx-5 mb-4 text-sm muted">Loading users…</p>}
            <Table><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th>Action</th></tr></thead><tbody>
                {!usersLoading && !usersError && !users.length && <tr><td colSpan={5} className="muted">No users found.</td></tr>}
                {users.map(user => <tr key={user.id}>
                    <td className="font-semibold">{user.name}</td>
                    <td><span className="pill bg-blue-50 text-blue-700">{user.role}</span></td>
                    <td>{user.phone || '—'}</td><td>{user.email || '—'}</td>
                    <td><Button className="text-blue-600 font-semibold text-xs" onClick={() => open(user.role, user)}>Edit</Button></td>
                </tr>)}
            </tbody></Table>
            
        </Card>
        {draft && <Modal title={editingId ? 'Edit User' : 'Add User'} onClose={() => {if (!busy) {setDraft(null); setPassword('');}}}>
            <form onSubmit={event => {event.preventDefault(); void submit();}}>
                <FormField label="Full Name *"><Input disabled={busy} value={draft.name} onChange={event => update('name', event.target.value)} autoComplete="name" required/></FormField>
                <FormField label="Role"><Select disabled={busy} value={draft.role} onChange={event => update('role', event.target.value as UserRole)}><option>Admin</option><option>Supervisor</option></Select></FormField>
                <FormField label="Phone number *"><NumericInput disabled={busy} allowDecimal={false} inputMode="tel" required maxLength={32} value={draft.phone} onValueChange={value => update('phone', value)} autoComplete="tel"/></FormField>
                <FormField label="Email (optional)"><Input disabled={busy} type="email" value={draft.email} onChange={event => update('email', event.target.value)} autoComplete="email"/></FormField>
                {!editingId && <FormField label="Initial password *"><Input disabled={busy} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)}/></FormField>}
                {!editingId && <p className="text-xs muted mb-4">Use 12–128 characters for the initial password.</p>}
                {draft.role === 'Supervisor' && <p className="text-xs muted mb-4">Assign this supervisor from the Sites page.</p>}
                {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <Button className="btn-secondary" disabled={busy} onClick={() => {setDraft(null); setPassword('');}}>Cancel</Button>
                    <Button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
                </div>
            </form>
        </Modal>}
    </>;
}
