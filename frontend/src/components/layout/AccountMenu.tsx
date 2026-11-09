import {useEffect, useId, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {ChevronDown, LogOut} from 'lucide-react';
import {Button} from '../ui';
import {useAuth} from '../../features/auth/AuthProvider';

export function AccountMenu() {
    const {user, logout} = useAuth();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const action = useRef<HTMLButtonElement>(null);
    const menuId = useId();
    const {pathname} = useLocation();
    const initials = user?.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase();
    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open) return;
        action.current?.focus();
        function outside(event: PointerEvent) {if (!root.current?.contains(event.target as Node)) setOpen(false);}
        function keyboard(event: KeyboardEvent) {
            if (event.key === 'Escape') {event.preventDefault(); setOpen(false); trigger.current?.focus();}
        }
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keyboard);
        return () => {document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard);};
    }, [open]);
    return <div className="shrink-0 p-4 border-t border-white/10">
        <div ref={root} className="relative" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);}}>
            {open && <div id={menuId} role="menu" aria-label="Account" className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-slate-200 shadow-lg p-1 z-50">
                <Button ref={action} role="menuitem" className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none rounded-lg px-3 py-3 w-full text-left" onClick={logout}
                    onKeyDown={event => {if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {event.preventDefault(); action.current?.focus();}}}>
                    <LogOut size={16} aria-hidden="true"/>Sign Out
                </Button>
            </div>}
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <div className="h-9 w-9 shrink-0 bg-[#d6e7ff] text-[#24549c] rounded-full flex items-center justify-center font-bold text-xs">{initials}</div>
                <div className="min-w-0"><div className="font-semibold text-xs truncate">{user?.name}</div><div className="text-[11px] text-slate-300">{user?.role === 'ADMIN' ? 'Administrator' : 'Supervisor'}</div></div>
                <Button ref={trigger} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
                    className="ml-auto shrink-0 p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-300 rounded"
                    onClick={() => setOpen(value => !value)} onKeyDown={event => {if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {event.preventDefault(); setOpen(true);}}}>
                    <ChevronDown size={15} aria-hidden="true"/>
                </Button>
            </div>
        </div>
    </div>;
}
