import type {DemoUser} from '../types';
import type {AuthUser} from '../features/auth/session';
import type {UserDraft} from '../features/settings/userModel';
export type ApiRequest = <T>(path: string, options?: RequestInit) => Promise<T>;
export function toUser(user: AuthUser, siteIds: string[] = []): DemoUser {
    return {id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role === 'ADMIN' ? 'Admin' : 'Supervisor', siteIds};
}
export function userPayload(draft: UserDraft, password?: string) {
    return {name: draft.name.trim(), phone: draft.phone, email: draft.email.trim(), role: draft.role === 'Admin' ? 'ADMIN' : 'SUPERVISOR', ...(password !== undefined ? {password} : {})};
}
export async function fetchUsers(request: ApiRequest, signal: AbortSignal) {
    const users: AuthUser[] = [];
    let page = 1;
    while (!signal.aborted) {
        const result = await request<{data: AuthUser[]; pagination: {total: number}}>('/users?page=' + page + '&limit=100', {signal});
        users.push(...result.data);
        if (users.length >= result.pagination.total || result.data.length < 100) break;
        page++;
    }
    return [...new Map(users.map(user => [user.id, user])).values()];
}
