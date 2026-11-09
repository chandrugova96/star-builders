import {useCallback, useEffect, useRef, useState} from 'react';
import type {DemoUser, Site} from '../../types';
import {validateUser} from './userModel';
import type {UserDraft} from './userModel';
import {useAuth} from '../auth/AuthProvider';
import {fetchUsers, toUser, userPayload} from '../../services/users';
import type {AuthUser} from '../auth/session';

export function useUsers(sites: Site[]) {
    const auth = useAuth();
    const [users, setUsers] = useState<DemoUser[]>([]);
    const [usersLoading, setLoading] = useState(auth.user?.role === 'ADMIN');
    const [usersError, setError] = useState('');
    const [reload, setReload] = useState(0);
    const latest = useRef(users);
    const alive = useRef(true);
    const saving = useRef(false);
    useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
    const refreshUsers = useCallback(() => setReload(value => value + 1), []);
    useEffect(() => {
        if (auth.user?.role !== 'ADMIN') return;
        const controller = new AbortController();
        setLoading(true); setError('');
        fetchUsers(auth.request, controller.signal).then(records => {
            if (controller.signal.aborted) return;
            const next = records.map(user => toUser(user, latest.current.find(existing => existing.id === user.id)?.siteIds));
            latest.current = next; setUsers(next);
        }).catch(error => {if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load users.');})
            .finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, [auth.request, auth.user?.id, auth.user?.role, reload]);

    async function saveUser(draft: UserDraft, editingId?: string, password?: string) {
        if (saving.current) return 'A user is already being saved.';
        const error = validateUser(draft, latest.current, sites, editingId);
        if (error) return error;
        if (!draft.phone || !/^\d{1,32}$/.test(draft.phone)) return 'Enter a phone number containing digits only (maximum 32 digits).';
        if (!editingId && (!password || password.length < 12 || password.length > 128)) return 'Initial password must contain 12–128 characters.';
        saving.current = true;
        try {
            const result = await auth.request<{data: AuthUser}>(editingId ? '/users/' + encodeURIComponent(editingId) : '/users', {method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(userPayload(draft, editingId ? undefined : password))});
            if (!alive.current) return 'The session has changed.';
            const user = toUser(result.data, result.data.role === 'SUPERVISOR' ? draft.siteIds : []);
            const next = editingId ? latest.current.map(existing => existing.id === editingId ? user : existing) : [...latest.current, user];
            latest.current = next; setUsers(next);
            if (result.data.id === auth.user?.id) auth.updateUser(result.data);
            return '';
        } catch (error) {return error instanceof Error ? error.message : 'Unable to save user.';}
        finally {saving.current = false;}
    }
    return {users, usersLoading, usersError, refreshUsers, saveUser};
}
