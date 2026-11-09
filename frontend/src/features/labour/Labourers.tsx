import { Button, Input, Table, Card, Badge as Status } from '../../components/ui';
import { SectionHead } from '../../components/SectionHead';
import { action } from '../../components/AddAction';
import { INR } from '../../utils/format';
import { TODAY } from '../../utils/dates';
import { Search, History } from 'lucide-react';
import type { Application } from '../../hooks/useApplication';
export function Labourers({ model }: {
    model: Application;
}) {
    const { open, query, setQuery, filteredLabour, currentRate, setSelectedLabour } = model;
    return <><SectionHead title="Labour Management" subtitle="Maintain worker profiles, daily wages and salary revision history." action={action('Add Labourer', () => open('labour'))}/><Card className="overflow-hidden"><div className="p-5 flex flex-wrap gap-3 items-center justify-between"><div className="relative max-w-sm w-full"><Search size={17} aria-hidden="true" className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none"/><Input className="input input-search" aria-label="Search labourers" placeholder="Search labourers..." value={query} onChange={e => setQuery(e.target.value)}/></div><span className="text-xs muted">{filteredLabour.length} labourers</span></div><Table><thead><tr><th>Labourer</th><th>Category</th><th>Phone</th><th>Daily Rate</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredLabour.map(l => <tr key={l.id}><td><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">{l.initials}</div><div><div className="font-semibold">{l.name}</div><div className="text-[11px] muted">{l.labourCode||l.id}</div></div></div></td><td>{l.category}</td><td>{l.phone}</td><td className="font-semibold">{INR(currentRate(l.id, TODAY))}</td><td><Status value={l.status}/></td><td><Button className="text-blue-600 font-semibold text-xs flex items-center gap-1" onClick={() => { setSelectedLabour(l.id); open('profile'); }}><History size={14}/> View history</Button></td></tr>)}</tbody></Table></Card></>;
}
