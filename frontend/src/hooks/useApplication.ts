import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pageForPath, pagePaths } from '../routes/paths';
import type { Page, Attendance } from '../types';
import { TODAY } from '../utils/dates';
import { useUsers } from '../features/settings/useUsers';
import { useBusinessData } from '../features/workspace/useBusinessData';
import { usePayroll } from '../features/payroll/usePayroll';
import { useAuth } from '../features/auth/AuthProvider';
export function useApplication() {
    const location = useLocation();
    const navigate = useNavigate();
    const auth = useAuth();
    const isAdmin = auth.user?.role === 'ADMIN';
    const page = pageForPath(location.pathname);
    const navigateTo = (target: Page) => navigate(pagePaths[target]);
    const [mobile, setMobile] = useState(false);
    const [modal, setModal] = useState('');
    const [query, setQuery] = useState('');
    const [selectedLabour, setSelectedLabour] = useState('');
    const [date, setDate] = useState(TODAY);
    const [siteFilter, setSiteFilter] = useState('ALL');
    const [notice, setNotice] = useState('');
    const [form, setForm] = useState<Record<string, string>>({});
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const requestId = useRef('');
    const business = useBusinessData(date);
    const users = useUsers(business.sites);
    const payroll = usePayroll(business.periods, business.refreshData);
    const { labour, sites, salaryHistory } = business;
    const setF = (key: string, value: string) => setForm(previous => ({
        ...previous, [key]: value
    }));
    const flash = (message: string) => {
        setNotice(message);
        setModal('');
    };
    const name = (id: string) => labour.find(worker => worker.id === id)?.name || id;
    const siteName = (id: string) => sites.find(site => site.id === id)?.name || id;
    const currentRate = (id: string, day: string) => salaryHistory[id]?.filter(rate => rate.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0]?.rate || 0;
    const amount = (entry: Attendance) => entry.earned || 0;
    const active = labour.filter(worker => worker.status === 'Active');
    const todayAttendance = business.todayEntries;
    const present = business.dashboard.present;
    const todayCost = business.dashboard.todayCost;
    const open = (kind: string, defaults: Record<string, string> = {}, attendanceToEdit: Attendance | null = null) => {
        setNotice('');
        setEditingAttendance(kind === 'attendance' ? attendanceToEdit : null);
        requestId.current = crypto.randomUUID();
        setForm(defaults);
        setModal(kind);
    };
    async function submit() {
        if (pending.current)
            return;
        pending.current = true;
        setSaving(true);
        try {
            if (modal === 'site') {
                await business.write('/sites', {
                    name: form.name || '', location: form.location || '', budget: form.budget || '0', supervisorId: form.supervisorId || null
                });
                flash('Site created');
            }
            else if (modal === 'site-supervisor') {
                await business.write('/sites/' + form.siteId + '/supervisor', {
                    supervisorId: form.supervisorId || null
                }, 'PATCH');
                flash('Site supervisor updated');
            }
            else if (modal === 'labour') {
                await business.write('/labourers', {
                    name: form.name || '', phone: form.phone || '', category: form.category || 'Mason', rate: form.rate || '', from: form.from || TODAY
                });
                flash('Labourer created');
            }
            else if (modal === 'salary') {
                await business.write('/labourers/' + selectedLabour + '/rates', {
                    rate: form.rate || '', from: form.from || ''
                });
                flash('Salary revision added');
            }
            else if (modal === 'attendance') {
                await business.write('/attendance', {
                    labourId: form.labourId, siteId: form.siteId, date: form.date, units: Number(form.units), ot: form.ot || '0'
                });
                flash('Attendance saved');
            }
            else if (modal === 'advance') {
                await business.write('/advances', {
                    labourId: form.labourId, date: form.date, amount: form.amount || '', requestId: requestId.current
                });
                flash('Advance recorded');
            }
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Unable to save.');
        }
        finally {
            pending.current = false;
            setSaving(false);
        }
    }
    useEffect(() => {
        setMobile(false);
        setQuery('');
        setNotice('');
        setModal('');
        setEditingAttendance(null);
    }, [location.pathname]);
    const filteredLabour = labour.filter(worker => (worker.name + ' ' + worker.id + ' ' + worker.category).toLowerCase().includes(query.toLowerCase()));
    return {
        ...business, ...users, page, navigateTo, isAdmin, mobile, setMobile, modal, setModal, query, setQuery, selectedLabour, setSelectedLabour, date, setDate, siteFilter, setSiteFilter, notice, setNotice, form, setF, flash, name, siteName, currentRate, amount, active, todayAttendance, present, todayCost, open, submit, filteredLabour, payroll, editingAttendance, saving, authRequest: auth.request
    };
}
export type Application = ReturnType<typeof useApplication>;
