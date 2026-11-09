import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Users } from 'lucide-react';
import { Card } from './ui';
export function SectionHead({ title, subtitle, action }: {
    title: string;
    subtitle: string;
    action?: ReactNode;
}) { return <div className="section-head flex flex-wrap items-center justify-between gap-3 mb-6"><div><h2 className="text-[25px] font-bold tracking-tight text-[#1c3048]">{title}</h2><p className="text-[13px] muted mt-1">{subtitle}</p></div>{action && <div className="section-action">{action}</div>}</div>; }
export function Metric({ label, value, icon: Icon, change, negative = false }: {
    label: string;
    value: string;
    icon: typeof Users;
    change: string;
    negative?: boolean;
}) { return <Card className="p-5"><div className="flex items-center justify-between"><span className="text-[12px] text-slate-500 font-medium">{label}</span><span className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><Icon size={18}/></span></div><div className="text-[27px] font-bold mt-3 tracking-tight">{value}</div><div className={'text-xs mt-2 flex items-center gap-1 ' + (negative ? 'text-amber-600' : 'text-emerald-600')}>{negative ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {change}</div></Card>; }
