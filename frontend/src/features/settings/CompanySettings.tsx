import { Card, Tabs } from '../../components/ui';
import { SectionHead } from '../../components/SectionHead';
import type {Application} from '../../hooks/useApplication';
import {UserManagement} from './UserManagement';
export function CompanySettings({model}: {model: Application}) {
    return <><SectionHead title="Settings" subtitle="Application configuration and company preferences."/><Tabs label="Settings sections" defaultTab="users" items={[
        {id: 'users', label: 'User Management', content: <UserManagement model={model}/>},
        {id: 'settings', label: 'Settings', content: <Card className="p-6 max-w-2xl"><h3 className="font-bold mb-5">Company Settings</h3><div className="grid sm:grid-cols-2 gap-4">{[['Company', 'Star Builders'], ['Currency', 'INR (₹)'], ['Payroll Week', 'Monday – Sunday'], ['Standard Workday', '8 hours'], ['Overtime Rate', 'Daily wage ÷ 8'], ['Timezone', 'Asia/Kolkata']].map(([k, v]) => <div key={k} className="p-4 bg-slate-50 rounded-lg"><div className="text-xs muted">{k}</div><div className="font-semibold text-sm mt-1">{v}</div></div>)}</div><p className="text-xs muted mt-5">Company settings are read-only.</p></Card>},
    ]}/></>;
}
