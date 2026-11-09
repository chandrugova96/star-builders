import {useEffect, useRef} from 'react';
import {useOverlay} from '../../hooks/useOverlay';
import {TODAY} from '../../utils/dates';
import {AccountMenu} from './AccountMenu';
import {useAuth} from '../../features/auth/AuthProvider';
import {canAccessPage} from '../../features/auth/access';
import {NavLink} from 'react-router-dom';
import {pagePaths} from '../../routes/paths';
import { Button } from '../../components/ui';
import { LayoutDashboard, Building2, HardHat, CalendarCheck, Wallet, HandCoins, CreditCard, BarChart3, Settings, Menu, CalendarDays } from 'lucide-react';
import type { Page } from '../../types';
import type { Application } from '../../hooks/useApplication';
const nav: {
    label: Page;
    icon: typeof LayoutDashboard;
}[] = [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Sites', icon: Building2 }, { label: 'Labourers', icon: HardHat }, { label: 'Attendance', icon: CalendarCheck }, { label: 'Weekly Payroll', icon: Wallet }, { label: 'Advances', icon: HandCoins }, { label: 'Payments', icon: CreditCard }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }];
export function Sidebar({ model }: {
    model: Application;
}) {
    const {user} = useAuth();
    const { mobile, setMobile, setQuery, setNotice } = model;
    const drawer = useRef<HTMLElement>(null);
    useOverlay(mobile, drawer, () => setMobile(false));
    useEffect(() => {
        const resize = () => {if (window.innerWidth >= 1024) setMobile(false);};
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [setMobile]);
    return <><aside ref={drawer} id="sidebar-navigation" tabIndex={-1} aria-label="Main navigation" className={'app-sidebar fixed z-40 inset-y-0 left-0 w-[246px] bg-[#142e50] text-white flex flex-col transition-transform lg:translate-x-0 ' + (mobile ? 'translate-x-0' : '-translate-x-full')}><div className="h-[76px] shrink-0 flex items-center px-6 gap-3 border-b border-white/10"><img src="/star-builders-logo.jpg" alt="Star Builders logo" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1"/><div className="font-extrabold text-[16px] tracking-wide">STAR BUILDERS</div></div><nav className="min-h-0 overflow-y-auto flex-1 px-3 pt-4 space-y-1">{nav.filter(item => user && canAccessPage(user.role, item.label)).map(({ label, icon: Icon }) => <NavLink key={label} to={pagePaths[label]} onClick={() => { setMobile(false); setQuery(''); setNotice(''); }} className={({isActive}) => 'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium transition-colors ' + (isActive ? 'bg-[#2863d6] text-white shadow-sm' : 'text-[#c2d0e1] hover:bg-white/10')}><Icon size={18}/>{label}</NavLink>)}</nav><AccountMenu/></aside>{mobile && <Button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobile(false)} aria-label="Close navigation"/>}
    </>;
}
export function Header({ model }: {
    model: Application;
}) {
    const { page, setMobile } = model;
    return <header className="app-header h-[76px] bg-white border-b border-slate-200 flex items-center justify-between px-5 lg:px-9"><div className="min-w-0 flex items-center gap-2 sm:gap-3"><Button aria-label="Open navigation" aria-expanded={model.mobile} aria-controls="sidebar-navigation" className="lg:hidden" onClick={() => setMobile(true)}><Menu size={22}/></Button><span className="hidden sm:inline text-sm text-slate-400">Workspace</span><span className="hidden sm:inline text-slate-300">/</span><span className="text-sm font-bold truncate">{page}</span></div><span className="flex shrink-0 items-center gap-2 text-xs text-slate-500"><CalendarDays size={15}/> {new Date(TODAY+'T00:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}</span></header>;
}
