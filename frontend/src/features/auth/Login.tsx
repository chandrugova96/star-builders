import {useRef, useState} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {Button, Card, FormField, PasswordInput, NumericInput} from '../../components/ui';
import {useAuth} from './AuthProvider';
import {AuthGate} from './AuthGate';
import {homePath} from './access';
import {pagePaths} from '../../routes/paths';

export function Login() {
    const auth = useAuth();
    const location = useLocation();
    const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    const pending = useRef(false);
    if (auth.status === 'loading' || auth.status === 'error') return <AuthGate><></></AuthGate>;
    if (auth.status === 'authenticated' && auth.user) {
        const from = location.state?.from;
        const target = typeof from === 'string' && Object.values(pagePaths).includes(from) ? from : homePath(auth.user.role);
        return <Navigate to={target} replace/>;
    }
    async function submit() {
        if (pending.current) return;
        pending.current = true; setBusy(true); setError('');
        try {await auth.login(phone, password); setPassword('');}
        catch (error) {setError(error instanceof Error ? error.message : 'Unable to sign in.');}
        finally {pending.current = false; setBusy(false);}
    }
    return <main className="login-screen min-h-screen bg-[#142e50] bg-cover bg-center flex items-center justify-center p-5" style={{backgroundImage: "linear-gradient(rgba(20,46,80,.55), rgba(20,46,80,.7)), url('/login-construction-background.png')"}}>
        <Card className="login-panel w-full max-w-md p-6 sm:p-8">
            <div className="flex flex-col items-center text-center gap-3 mb-6"><img src="/star-builders-logo.jpg" alt="Star Builders logo" className="w-32 h-24 object-contain rounded-xl bg-white p-1"/><div><p className="text-xs muted mt-1">Sign in to your workspace</p></div></div>
            <form onSubmit={event => {event.preventDefault(); void submit();}}>
                <FormField label="Phone number"><NumericInput allowDecimal={false} inputMode="tel" autoComplete="username" required maxLength={32} value={phone} onValueChange={setPhone} disabled={busy}/></FormField>
                <FormField label="Password"><PasswordInput autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/></FormField>
                {(error || auth.message) && <p role="alert" className="text-sm text-red-700 mb-4">{error || auth.message}</p>}
                <Button type="submit" className="btn-primary w-full" disabled={busy || !phone || !password}>{busy ? 'Signing in…' : 'Sign In'}</Button>
            </form>
        </Card>
    </main>;
}
