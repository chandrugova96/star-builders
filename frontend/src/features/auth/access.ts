import type {Page} from '../../types';
import type {AuthUser} from './session';
export function canAccessPage(role: AuthUser['role'], page: Page) {return role === 'ADMIN' || page === 'Sites' || page === 'Attendance';}
export function homePath(role: AuthUser['role']) {return role === 'ADMIN' ? '/dashboard' : '/sites';}
