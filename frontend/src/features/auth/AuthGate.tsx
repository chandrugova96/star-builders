import type {ReactNode} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {Button, Card} from '../../components/ui';
import {useAuth} from './AuthProvider';
export function AuthGate({children}: {children: ReactNode}) {
    const auth = useAuth(); const location = useLocation();
    if (auth.status === 'anonymous') return <Navigate to="/login" state={{from: location.pathname}} replace/>;
    if (auth.status === 'loading') return <main className="min-h-screen flex items-center justify-center"><p role="status" className="text-sm muted">Checking your session…</p></main>;
    if (auth.status === 'error') return <main className="min-h-screen flex items-center justify-center p-5"><Card className="p-6 max-w-md"><p role="alert" className="text-sm mb-4">{auth.message}</p><div className="flex gap-2"><Button className="btn-primary" onClick={auth.retry}>Retry</Button><Button className="btn-secondary" onClick={auth.logout}>Sign Out</Button></div></Card></main>;
    return <>{children}</>;
}
