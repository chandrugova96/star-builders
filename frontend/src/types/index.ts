export type Page = 'Dashboard' | 'Sites' | 'Labourers' | 'Attendance' | 'Weekly Payroll' | 'Advances' | 'Payments' | 'Reports' | 'Settings';
export type Labour = {
    id: string;
    name: string;
    category: string;
    phone: string;
    rate: number;
    status: 'Active' | 'Inactive';
    initials: string;
    labourCode?: string;
};
export type Site = {
    id: string;
    name: string;
    location: string;
    supervisor: string;
    supervisorId?: string;
    siteCode?: string;
    workers: number;
    status: 'Active' | 'On Hold' | 'Completed';
    budget: number;
};
export type Attendance = {
    labourId: string;
    date: string;
    siteId: string;
    units: number;
    ot: number;
    rate?: number;
    earned?: number;
    approved?: boolean;
};
export type Advance = {
    id: string;
    labourId: string;
    date: string;
    amount: number;
};

export type UserRole = 'Admin' | 'Supervisor';
export type DemoUser = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    siteIds: string[];
};
