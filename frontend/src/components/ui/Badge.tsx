export function Badge({ value }: {
    value: string;
}) { const good = ['Active', 'Paid', 'Present', 'Approved', 'Completed', 'Recovered']; const warn = ['Pending', 'Partially Paid', 'On Hold', 'Partially Recovered']; return <span className={'pill ' + (good.includes(value) ? 'bg-emerald-50 text-emerald-700' : warn.includes(value) ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600')}>{value}</span>; }
