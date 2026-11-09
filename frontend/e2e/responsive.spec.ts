import {makeBusinessAPI} from '../tests/fixtures/business.mjs';
import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
const admin = {id: '000000000000000000000001', name: 'Test Administrator', phone: '0000000001', email: 'test@example.invalid', role: 'ADMIN', active: true};
async function prepare(page: Page, role = 'ADMIN') {
    const businessAPI=makeBusinessAPI();
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        const user = {...admin, role};
        const body = path === '/api/auth/me' ? {data: user} : path === '/api/users' ? {data: [user], pagination: {total: 1}} : businessAPI(route.request().url(),route.request().method(),route.request().postDataJSON(),role) || {error: {message: 'Unexpected test request'}};
        await route.fulfill({json: body});
    });
    await page.addInitScript(() => localStorage.setItem('star-builders.session', JSON.stringify({accessToken: 'browser-test-only', expiresAt: Date.now() + 86400000})));
}
async function fits(page: Page) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
test('every Admin page fits without horizontal page scrolling', async ({page}, testInfo) => {
    await prepare(page);
    for (const path of ['/dashboard', '/sites', '/labourers', '/attendance', '/weekly-payroll', '/advances', '/payments', '/reports', '/settings']) {
        await page.goto(path);
        await expect(page.locator('header')).toBeVisible();
        await expect(page.getByText('Loading records…',{exact:true})).not.toBeVisible();
        await fits(page);
        if (path === '/labourers' && page.viewportSize()!.width < 640) {
            const row = page.locator('tbody tr').first();
            await expect(row.locator('td').first()).toHaveAttribute('data-label', 'Labourer');
            expect(await row.locator('td').first().evaluate(element => getComputedStyle(element).display)).toBe('grid');
        }
        if (path === '/attendance' || path === '/weekly-payroll') await page.screenshot({path: testInfo.outputPath(path.slice(1) + '.png'), fullPage: true});
    }
});
test('drawer, account menu and dialog work on touch-sized screens', async ({page}, testInfo) => {
    await prepare(page);
    await page.goto('/labourers');
    if (page.viewportSize()!.width < 1024) {
        await page.getByRole('button', {name: 'Open navigation'}).click();
        await expect(page.locator('#sidebar-navigation')).toBeInViewport();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
        await page.getByRole('button', {name: 'Account menu'}).click();
        await expect(page.getByRole('menuitem', {name: 'Sign Out'})).toBeVisible();
        await page.keyboard.press('Escape');
        await page.getByRole('link', {name: 'Attendance', exact: true}).click();
        await expect(page.getByRole('button', {name: 'Open navigation'})).toHaveAttribute('aria-expanded', 'false');
    } else await page.goto('/attendance');
    await page.getByRole('button', {name: 'Mark Attendance'}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await fits(page);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({path: testInfo.outputPath('attendance-dialog.png'), fullPage: true});
    await page.getByRole('button', {name: 'Close dialog'}).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});
test('Supervisor mobile navigation exposes only assigned sites and attendance', async ({page}) => {
    await prepare(page, 'SUPERVISOR'); await page.goto('/sites');
    await expect(page.getByText('Test Residence', {exact: true})).toBeVisible(); await fits(page);
    if (page.viewportSize()!.width < 1024) await page.getByRole('button', {name: 'Open navigation'}).click();
    await expect(page.getByRole('link', {name: 'Weekly Payroll', exact: true})).toHaveCount(0);
    await page.getByRole('link', {name: 'Attendance', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Daily Attendance'})).toBeVisible(); await fits(page);
});
test('login fits on narrow and short viewports with readable inputs', async ({page}, testInfo) => {
    await page.goto('/login');
    await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible(); await fits(page);
    if (page.viewportSize()!.width < 640) {
        expect(await page.getByLabel('Phone number').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    }
    await page.screenshot({path: testInfo.outputPath('login.png'), fullPage: true});
});

test('payroll payment dialog fits and records a partial payment on each viewport', async ({page}, testInfo) => {
    await prepare(page); await page.goto('/weekly-payroll');
    await page.getByRole('button', {name: 'Previous payroll week'}).click();
    await page.getByRole('button', {name: 'Approve Payroll', exact: true}).click();
    await page.getByRole('button', {name: 'Pay / Details', exact: true}).first().click();
    const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await fits(page);
    await page.getByLabel('Payment amount (₹)').fill('100');
    await page.screenshot({path: testInfo.outputPath('payment-dialog.png'), fullPage: true});
    await page.getByRole('button', {name: 'Record Payment', exact: true}).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('status').filter({hasText: 'Payment recorded'})).toBeVisible();
    await fits(page);
});

test('salary correction and payment reversal dialogs work across viewports', async ({page}, testInfo) => {
    await prepare(page); await page.goto('/weekly-payroll');
    await page.getByRole('button', {name:'Previous payroll week'}).click();
    await page.getByRole('button', {name:'Approve Payroll',exact:true}).click();
    await page.getByRole('button', {name:'Pay / Details',exact:true}).click();
    await page.getByRole('button', {name:'Add correction',exact:true}).click();
    await page.getByLabel('Correction amount (₹)').fill('125.25');
    await page.getByLabel('Correction reason *').fill('Missed overtime');
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('salary-correction.png'),fullPage:true});
    await page.getByRole('button', {name:'Save correction',exact:true}).click();
    await expect(page.getByText('Missed overtime',{exact:true})).toBeVisible();
    await page.getByLabel('Payment amount (₹)').fill('100');
    await page.getByRole('button', {name:'Record Payment',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.goto('/payments');
    await page.getByRole('button', {name:'Reverse',exact:true}).click();
    await expect(page.getByRole('button', {name:'Confirm reversal'})).toBeDisabled();
    await page.getByLabel('Reason *').fill('Incorrect payment entry');
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('payment-reversal.png'),fullPage:true});
    await page.getByRole('button', {name:'Confirm reversal'}).click();
    await expect(page.getByText('Reversed',{exact:true})).toBeVisible();
    await expect(page.getByRole('button', {name:'Reverse',exact:true})).toBeDisabled();
});

test('advance reversal retains history on every viewport', async ({page}, testInfo) => {
    await prepare(page); await page.goto('/advances');
    await expect(page.getByText('Loading records…',{exact:true})).not.toBeVisible();
    await page.getByRole('button', {name:'Record Advance',exact:true}).click();
    await page.getByLabel('Advance Amount (₹)').fill('500');
    await page.getByRole('button', {name:'Save',exact:true}).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button', {name:'Reverse',exact:true}).click();
    await page.getByLabel('Reason *').fill('Duplicate advance');
    await fits(page);
    await page.screenshot({path:testInfo.outputPath('advance-reversal.png'),fullPage:true});
    await page.getByRole('button', {name:'Confirm reversal'}).click();
    await expect(page.getByText('Reversed',{exact:true})).toBeVisible();
    await fits(page);
});
