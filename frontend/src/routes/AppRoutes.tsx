import type {ReactNode} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import type {Page} from '../types';
import type {Application} from '../hooks/useApplication';
import {pagePaths} from './paths';
import {TODAY} from '../utils/dates';
import {Dashboard} from '../features/dashboard/Dashboard';
import {Sites} from '../features/sites/Sites';
import {Labourers} from '../features/labour/Labourers';
import {Attendance} from '../features/attendance/Attendance';
import {WeeklyPayroll} from '../features/payroll/WeeklyPayroll';
import {Advances} from '../features/advances/Advances';
import {Payments} from '../features/payments/Payments';
import {Reports} from '../features/reports/Reports';
import {useAuth} from '../features/auth/AuthProvider';
import {canAccessPage, homePath} from '../features/auth/access';
import {CompanySettings} from '../features/settings/CompanySettings';

export function AppRoutes({model}: {model: Application}) {
  const {user} = useAuth();
  if (!user) return null;
  const screens: Record<Page, ReactNode> = {
    Dashboard: <Dashboard model={model}/>,
    Sites: <Sites model={model}/>,
    Labourers: <Labourers model={model}/>,
    Attendance: <Attendance model={model}/>,
    'Weekly Payroll': <WeeklyPayroll payroll={model.payroll} today={TODAY} sites={model.sites}/>,
    Advances: <Advances model={model}/>,
    Payments: <Payments model={model}/>,
    Reports: <Reports model={model}/>,
    Settings: <CompanySettings model={model}/>,
  };
  return <Routes>
    {(Object.keys(pagePaths) as Page[]).map(page => <Route key={page} path={pagePaths[page]} element={canAccessPage(user.role, page) ? screens[page] : <Navigate to={homePath(user.role)} replace/>}/>)}
    <Route path="/" element={<Navigate to={homePath(user.role)} replace/>}/>
    <Route path="*" element={<Navigate to={homePath(user.role)} replace/>}/>
  </Routes>;
}
