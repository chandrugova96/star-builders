import type { Attendance, Labour, Advance } from '../../types';
export type SalaryHistory = Record<string, {
    from: string;
    rate: number;
}[]>;
export type Recovery = {
    advanceId: string;
    amount: number;
};
export type PayrollRow = {
    id: string;
    name: string;
    days: number;
    gross: number;
    advance: number;
    net: number;
    recoveries: Recovery[];
    items: (Attendance & {
        rate: number;
        earned: number;
    })[];
};
export type Approval = {
    rows: PayrollRow[];
    approvedOn: string;
};
export type Approvals = Record<string, Approval>;
export type PayrollPayment = {
    id: string;
    labourId: string;
    week: string;
    date: string;
    amount: number;
    mode: string;
    requestId: string;
};
// Calendar arithmetic uses UTC only to avoid timezone/DST shifts in date-only values.
export function shiftDay(day: string, count: number) { const date = new Date(day + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); }
export function weekStart(day: string) { const date = new Date(day + 'T00:00:00Z'); return shiftDay(day, -((date.getUTCDay() + 6) % 7)); }
export const weekEnd = (week: string) => shiftDay(week, 6);
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function effectiveRate(labour: Labour, day: string, history: SalaryHistory) { return history[labour.id]?.filter(h => h.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0]?.rate ?? labour.rate; }
export function buildRows(week: string, labour: Labour[], attendance: Attendance[], advances: Advance[], history: SalaryHistory, approvals: Approvals): PayrollRow[] {
    const end = weekEnd(week);
    return labour.filter(l => l.status === 'Active' || attendance.some(a => a.labourId === l.id && a.date >= week && a.date <= end)).map(l => {
        const items = attendance.filter(a => a.labourId === l.id && a.date >= week && a.date <= end).map(a => { const rate = effectiveRate(l, a.date, history); return { ...a, rate, earned: money(rate * (a.units + a.ot / 8)) }; });
        const gross = money(items.reduce((s, a) => s + a.earned, 0));
        let eligible = gross;
        // Each advance has its own recovery balance. Never deduct it twice.
        const recoveries: Recovery[] = [];
        for (const advance of advances.filter(a => a.labourId === l.id && a.date <= end).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
            const recovered = Object.values(approvals).flatMap(p => p.rows).flatMap(r => r.recoveries).filter(r => r.advanceId === advance.id).reduce((s, r) => s + r.amount, 0);
            const amount = money(Math.min(eligible, Math.max(0, advance.amount - recovered)));
            if (amount > 0) {
                recoveries.push({ advanceId: advance.id, amount });
                eligible = money(eligible - amount);
            }
        }
        const advance = money(gross - eligible);
        return { id: l.id, name: l.name, days: items.reduce((s, a) => s + a.units, 0), gross, advance, net: eligible, recoveries, items };
    });
}
export function paidFor(payments: PayrollPayment[], week: string, labourId: string) { return money(payments.filter(p => p.week === week && p.labourId === labourId).reduce((s, p) => s + p.amount, 0)); }
export function outstanding(approvals: Approvals, payments: PayrollPayment[], week: string, labourId: string) { const row = approvals[week]?.rows.find(r => r.id === labourId); return money(Math.max(0, (row?.net || 0) - paidFor(payments, week, labourId))); }
export function priorBalances(approvals: Approvals, payments: PayrollPayment[], week: string, labourId: string) { return Object.keys(approvals).filter(w => w < week).sort().map(w => ({ week: w, amount: outstanding(approvals, payments, w, labourId) })).filter(b => b.amount > 0); }
export function validatePayment(approvals: Approvals, payments: PayrollPayment[], payment: PayrollPayment) {
    if (payments.some(p => p.requestId === payment.requestId))
        return 'This payment has already been recorded.';
    if (!approvals[payment.week]?.rows.some(r => r.id === payment.labourId))
        return 'Approve this payroll before recording a payment.';
    if (!Number.isFinite(payment.amount) || payment.amount <= 0 || money(payment.amount) !== payment.amount)
        return 'Enter a positive amount with at most two decimal places.';
    if (payment.amount > outstanding(approvals, payments, payment.week, payment.labourId))
        return 'Payment exceeds the outstanding balance for this week.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date) || !['Cash', 'UPI', 'Bank'].includes(payment.mode))
        return 'Enter a valid date and payment method.';
    return '';
}
export function approveWeek(week: string, today: string, labour: Labour[], attendance: Attendance[], advances: Advance[], history: SalaryHistory, approvals: Approvals): {
    approvals: Approvals;
    error: string;
} {
    if (approvals[week])
        return { approvals, error: 'This week is already approved.' };
    const rows = buildRows(week, labour, attendance, advances, history, approvals);
    if (!rows.some(r => r.items.length))
        return { approvals, error: 'There is no attendance to approve for this week.' };
    // Recovery eligibility for approvals out of chronological order is still an open policy.
    const relatedAdvances = advances.filter(a => a.date <= weekEnd(week) && rows.some(r => r.id === a.labourId && r.gross > 0));
    const earlierPending = attendance.some(a => a.date < week && !approvals[weekStart(a.date)] && relatedAdvances.some(v => v.labourId === a.labourId && v.date <= weekEnd(weekStart(a.date))));
    const laterRecovery = Object.entries(approvals).some(([w, p]) => w > week && p.rows.some(r => r.recoveries.some(recovery => relatedAdvances.some(a => a.id === recovery.advanceId))));
    if (earlierPending || laterRecovery)
        return { approvals, error: 'Advance recovery needs chronological review. Approve earlier pending weeks first; recovery changes affecting approved weeks require a separate adjustment.' };
    return { approvals: { ...approvals, [week]: { rows, approvedOn: today } }, error: '' };
}
