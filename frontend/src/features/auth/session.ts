export type AuthUser = {id: string; name: string; phone: string; email: string; role: 'ADMIN' | 'SUPERVISOR'; active: boolean};
export type StoredSession = {accessToken: string; expiresAt: number};
export const sessionStorageKey = 'star-builders.session';
export function readSession(): StoredSession | null {
    try {
        const stored = localStorage.getItem(sessionStorageKey);
        const value = JSON.parse(stored || sessionStorage.getItem(sessionStorageKey) || 'null');
        if (typeof value?.accessToken === 'string' && value.accessToken && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now()) {
            // Preserve existing valid tab sessions when upgrading storage behavior.
            if (!stored) localStorage.setItem(sessionStorageKey, JSON.stringify(value));
            sessionStorage.removeItem(sessionStorageKey);
            return value;
        }
        localStorage.removeItem(sessionStorageKey);
        sessionStorage.removeItem(sessionStorageKey);
    } catch { /* Storage may be unavailable; sign-in still works in memory. */ }
    return null;
}
export function writeSession(session: StoredSession | null) {
    try {
        if (session) localStorage.setItem(sessionStorageKey, JSON.stringify(session));
        else localStorage.removeItem(sessionStorageKey);
        sessionStorage.removeItem(sessionStorageKey);
    } catch { /* Memory session remains usable. */ }
}
