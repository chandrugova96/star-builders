import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { weekStart, weekEnd } from './model';
import { TODAY } from '../../utils/dates';
export type PayrollApiRow = {
    id: string;
    name: string;
    days: number;
    gross: string;
    adjustment?: string;
    corrections?: {id: string; kind: string; amount: string; reason: string; originalWeek: string; settlementWeek: string; originalDate: string | null; siteId: string | null}[];
    advance: string;
    net: string;
    paid: string;
    broughtForward: string;
    balance: string;
    totalOutstanding: string;
    items: {
        date: string;
        siteId: string;
        units: number;
        ot: string;
        rate: string;
        earned: string;
    }[];
    prior: {
        week: string;
        amount: string;
    }[];
    history: {
        status?: 'Paid' | 'Reversed';
        id: string;
        date: string;
        amount: string;
        mode: string;
    }[];
};
export type PayrollApiView = {
    week: string;
    end: string;
    status: 'Pending' | 'Approved';
    rows: PayrollApiRow[];
};
export function usePayroll(periods: {
    week: string;
    approved: boolean;
}[], onUpdated: () => void) {
    const auth = useAuth();
    const [week, setWeek] = useState(weekStart(TODAY));
    const [data, setData] = useState<PayrollApiView>({
        week, end: weekEnd(week), status: 'Pending', rows: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const writing = useRef(false);
    const keys = useRef<Record<string, string>>({});
    const reload = useCallback(async (signal?: AbortSignal) => {
        const result = await auth.request<{
            data: PayrollApiView;
        }>('/payroll?week=' + week, {
            signal
        });
        if (!signal?.aborted)
            setData(result.data);
    }, [auth.request, week]);
    useEffect(() => {
        if (auth.user?.role !== 'ADMIN') {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError('');
        reload(controller.signal).catch(error => {
            if (!controller.signal.aborted)
                setError(error instanceof Error ? error.message : 'Unable to load payroll.');
        }).finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [reload, periods, auth.user?.role]);
    async function mutate(path: string, body: unknown) {
        if (writing.current)
            return 'A request is already in progress.';
        writing.current = true;
        setBusy(true);
        try {
            await auth.request(path, {
                method: 'POST', body: JSON.stringify(body)
            });
            await reload();
            onUpdated();
            return '';
        }
        catch (error) {
            return error instanceof Error ? error.message : 'Unable to save payroll.';
        }
        finally {
            writing.current = false;
            setBusy(false);
        }
    }
    const approve = () => {
        keys.current[week] ||= crypto.randomUUID();
        return mutate('/payroll/approve', {
            week, requestId: keys.current[week]
        });
    };
    const pay = (input: {
        labourId: string;
        week: string;
        amount: string;
        date: string;
        mode: string;
        requestId: string;
    }) => mutate('/payments', {
        labourId: input.labourId, throughWeek: input.week, amount: input.amount, date: input.date, mode: input.mode, requestId: input.requestId
    });
    return {
        week, setWeek, data, loading, error, busy, approve, pay, adjust: (input: {labourId: string; originalWeek: string; originalDate: string; siteId: string; direction: string; amount: string; reason: string; requestId: string}) => mutate('/payroll/adjustments', input), refresh: () => reload().catch(error => setError(error.message)), isApproved: (day: string) => periods.some(period => period.week === weekStart(day) && period.approved)
    };
}
export type PayrollController = ReturnType<typeof usePayroll>;
