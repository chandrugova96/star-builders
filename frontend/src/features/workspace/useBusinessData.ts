import {useCallback, useEffect, useRef, useState} from 'react';
import {TODAY} from '../../utils/dates';
import {useAuth} from '../auth/AuthProvider';
import type {Site, Labour, Attendance, Advance} from '../../types';
import type {SalaryHistory, PayrollPayment} from '../payroll/model';

type SiteResponse = Omit<Site, 'budget'> & {budget?: string};
type WorkerResponse = Omit<Labour, 'phone' | 'rate'> & {
    phone?: string; rate?: string; salaryHistory?: {from: string; rate: string}[];
};
type AttendanceResponse = Omit<Attendance, 'ot' | 'rate' | 'earned'> & {
    ot: string; rate?: string; earned?: string;
};
type AdvanceRecord = Advance & {recovered: number; remaining: number; status?: 'Active' | 'Reversed'; reversal?: {date: string; reason: string; refund: string; settlementWeek: string | null} | null};
type AdvanceResponse = Omit<AdvanceRecord, 'amount' | 'recovered' | 'remaining'> & {amount: string; recovered: string; remaining: string};
type PaymentRecord = PayrollPayment & {status?: 'Paid' | 'Reversed'; reversal?: {date: string; reason: string} | null};
type PaymentResponse = Omit<PaymentRecord, 'amount' | 'requestId'> & {amount: string};
type PeriodResponse = {week: string; approved: boolean};
type DashboardResponse = {activeSites: number; activeLabourers: number; present: number; todayCost: string};
const emptyDashboard: DashboardResponse = {activeSites: 0, activeLabourers: 0, present: 0, todayCost: '0.00'};
const attendanceView = (entry: AttendanceResponse): Attendance => ({
    ...entry, ot: Number(entry.ot), rate: Number(entry.rate || 0), earned: Number(entry.earned || 0),
});

export function useBusinessData(date: string) {
    const auth = useAuth();
    const admin = auth.user?.role === 'ADMIN';
    const [sites, setSites] = useState<Site[]>([]);
    const [labour, setLabour] = useState<Labour[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [todayEntries, setTodayEntries] = useState<Attendance[]>([]);
    const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [salaryHistory, setHistory] = useState<SalaryHistory>({});
    const [periods, setPeriods] = useState<PeriodResponse[]>([]);
    const [dashboard, setDashboard] = useState({...emptyDashboard, todayCost: 0});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const alive = useRef(true);
    useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
    const refresh = useCallback(() => setRevision(value => value + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        const options = {signal: controller.signal};
        const get = <T,>(path: string) => auth.request<{data: T}>(path, options);
        const adminGet = <T,>(path: string, fallback: T) => admin ? get<T>(path) : Promise.resolve({data: fallback});
        setLoading(true); setError('');
        const dayRequest = get<AttendanceResponse[]>('/attendance?date=' + date);
        Promise.all([
            get<SiteResponse[]>('/sites'),
            get<WorkerResponse[]>('/labourers'),
            dayRequest,
            adminGet<AdvanceResponse[]>('/advances', []),
            adminGet<PaymentResponse[]>('/payments', []),
            adminGet<PeriodResponse[]>('/payroll/periods', []),
            adminGet<DashboardResponse>('/reports/dashboard', emptyDashboard),
            admin && date === TODAY ? dayRequest : adminGet<AttendanceResponse[]>('/attendance?date=' + TODAY, []),
        ]).then(([siteResult, workerResult, dayResult, advanceResult, paymentResult, periodResult, summary, todayResult]) => {
            if (controller.signal.aborted) return;
            setSites(siteResult.data.map(site => ({...site, budget: Number(site.budget || 0)})));
            setLabour(workerResult.data.map(worker => ({...worker, rate: Number(worker.rate || 0), phone: worker.phone || ''})));
            setHistory(Object.fromEntries(workerResult.data.map(worker => [worker.id,
                (worker.salaryHistory || []).map(rate => ({from: rate.from, rate: Number(rate.rate)})),
            ])));
            setAttendance(dayResult.data.map(attendanceView));
            setAdvances(advanceResult.data.map(row => ({...row,
                amount: Number(row.amount), recovered: Number(row.recovered), remaining: Number(row.remaining),
            })));
            setPayments(paymentResult.data.map(row => ({...row, amount: Number(row.amount), requestId: row.id})));
            setPeriods(periodResult.data);
            setDashboard({...summary.data, todayCost: Number(summary.data.todayCost)});
            setTodayEntries(todayResult.data.map(attendanceView));
        }).catch(error => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load business records.');
        }).finally(() => {if (!controller.signal.aborted) setLoading(false);});
        return () => controller.abort();
    }, [auth.request, admin, date, revision]);

    async function write(path: string, body: unknown, method = 'POST') {
        await auth.request(path, {method, body: JSON.stringify(body)});
        if (alive.current) refresh();
    }
    const exportReport = (kind: string) => auth.request<{content: string}>('/reports/' + kind + '.csv');
    return {sites, labour, attendance, todayEntries, advances, payments, salaryHistory, periods, dashboard,
        dataLoading: loading, dataError: error, refreshData: refresh, write, exportReport};
}
