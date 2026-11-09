import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {ApiError, apiRequest} from '../../services/api';
import {readSession, writeSession, sessionStorageKey} from './session';
import type {AuthUser, StoredSession} from './session';

type Auth = {
    user: AuthUser | null;
    status: 'loading' | 'authenticated' | 'anonymous' | 'error';
    message: string;
    login: (phone: string, password: string) => Promise<void>;
    logout: () => void;
    retry: () => void;
    request: <T>(path: string, options?: RequestInit) => Promise<T>;
    updateUser: (user: AuthUser) => void;
};
export const AuthContext = createContext<Auth | null>(null);
export function useAuth() {const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider is required'); return auth;}

export function AuthProvider({children}: {children: ReactNode}) {
    const [session, setSession] = useState<StoredSession | null>(readSession);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<Auth['status']>(session ? 'loading' : 'anonymous');
    const [message, setMessage] = useState('');
    const [attempt, setAttempt] = useState(0);
    const current = useRef(session);
    const generation = useRef(0);
    const logout = useCallback(() => {
        generation.current++;
        current.current = null; writeSession(null); setSession(null); setUser(null); setStatus('anonymous'); setMessage('');
    }, []);
    const expire = useCallback(() => {logout(); setMessage('Your session has expired. Please sign in again.');}, [logout]);
    const request = useCallback(async <T,>(path: string, options: RequestInit = {}) => {
        const token = current.current?.accessToken;
        if (!token || current.current!.expiresAt <= Date.now()) {expire(); throw new ApiError(401, 'Please sign in again.');}
        const version = generation.current;
        try {
            const result = await apiRequest<T>(path, options, token);
            if (version !== generation.current) throw new ApiError(401, 'The session has changed.');
            return result;
        } catch (error) {
            if (version === generation.current && error instanceof ApiError && error.status === 401) expire();
            throw error;
        }
    }, [expire]);
    useEffect(() => {
        if (!session) return;
        const timer = setTimeout(() => {if (current.current?.accessToken === session.accessToken) expire();}, Math.max(0, session.expiresAt - Date.now()));
        return () => clearTimeout(timer);
    }, [session, expire]);
    useEffect(() => {
        if (!session) return;
        const controller = new AbortController();
        const version = generation.current;
        setStatus('loading');
        request<{data: AuthUser}>('/auth/me', {signal: controller.signal}).then(result => {
            if (!controller.signal.aborted && version === generation.current) {setUser(result.data); setStatus('authenticated'); setMessage('');}
        }).catch(error => {
            if (!controller.signal.aborted && version === generation.current) {setStatus('error'); setMessage(error instanceof Error ? error.message : 'Unable to restore your session.');}
        });
        return () => controller.abort();
    }, [session, attempt, request]);
    useEffect(() => {
        function synchronize(event: StorageEvent) {
            if (event.key !== null && event.key !== sessionStorageKey) return;
            if (event.storageArea && event.storageArea !== window.localStorage) return;
            const next = readSession();
            if (next?.accessToken === current.current?.accessToken && next?.expiresAt === current.current?.expiresAt) return;
            generation.current++;
            current.current = next;
            setUser(null); setSession(next); setMessage(''); setStatus(next ? 'loading' : 'anonymous');
        }
        window.addEventListener('storage', synchronize);
        return () => window.removeEventListener('storage', synchronize);
    }, []);
    async function login(phone: string, password: string) {
        const version = ++generation.current;
        const result = await apiRequest<{data: {accessToken: string; expiresIn: number; user: AuthUser}}>('/auth/login', {method: 'POST', body: JSON.stringify({phone, password})});
        if (version !== generation.current) return;
        const next = {accessToken: result.data.accessToken, expiresAt: Date.now() + result.data.expiresIn * 1000};
        current.current = next; writeSession(next); setSession(next); setUser(null); setStatus('loading'); setMessage('');
    }
    return <AuthContext.Provider value={{user, status, message, login, logout, retry: () => setAttempt(value => value + 1), request, updateUser: setUser}}>{children}</AuthContext.Provider>;
}
