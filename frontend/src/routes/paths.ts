import type {Page} from '../types';

export const pagePaths: Record<Page, string> = {
  Dashboard: '/dashboard',
  Sites: '/sites',
  Labourers: '/labourers',
  Attendance: '/attendance',
  'Weekly Payroll': '/weekly-payroll',
  Advances: '/advances',
  Payments: '/payments',
  Reports: '/reports',
  Settings: '/settings',
};

export function pageForPath(pathname: string): Page {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(pagePaths) as Page[]).find(page => pagePaths[page] === normalized) || 'Dashboard';
}
