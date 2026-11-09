import type {DemoUser, Site, UserRole} from '../../types';

export type UserDraft = Omit<DemoUser, 'id'>;

export function validateUser(draft: UserDraft, users: DemoUser[], sites: Site[], editingId?: string) {
    if (!draft.name.trim()) return 'Enter the user’s full name.';
    if (!(['Admin', 'Supervisor'] as UserRole[]).includes(draft.role)) return 'Choose Admin or Supervisor.';
    if (draft.phone && !/^\d+$/.test(draft.phone)) return 'Phone number must contain digits only.';
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return 'Enter a valid email address.';
    if (draft.email && users.some(user => user.id !== editingId && user.email.toLowerCase() === draft.email.trim().toLowerCase())) return 'A user already has this email address.';
    if (draft.role === 'Supervisor' && draft.siteIds.some(id => !sites.some(site => site.id === id))) return 'One of the selected sites no longer exists.';
    return '';
}

export function normalizeUser(draft: UserDraft, id: string): DemoUser {
    return {
        id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone,
        role: draft.role,
        // Admins have all-site access by definition; individual assignments apply to supervisors.
        siteIds: draft.role === 'Supervisor' ? [...new Set(draft.siteIds)] : [],
    };
}

// V1 sites display one supervisor; a supervisor may be assigned to several sites.
export function assignSiteSupervisor(users: DemoUser[], siteId: string, supervisorId: string): {users: DemoUser[]; error: string} {
    if (!siteId) return {users, error: 'Choose a site.'};
    if (supervisorId && !users.some(user => user.id === supervisorId && user.role === 'Supervisor')) {
        return {users, error: 'Choose an existing Supervisor user.'};
    }
    return {users: users.map(user => ({...user, siteIds: [
        ...user.siteIds.filter(id => id !== siteId),
        ...(user.id === supervisorId ? [siteId] : []),
    ]})), error: ''};
}
