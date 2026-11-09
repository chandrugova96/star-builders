import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { SiteModel, LabourModel, AttendanceModel, Payroll, AdvanceModel, PaymentModel, Adjustment, Reversal } from '../../domain/models.js';
import { rateFor } from '../labour/labour.routes.js';
import { today, entryEarnings, rupees, add } from '../../domain/values.js';
import { HttpError } from '../../lib/http-error.js';
function cell(value: unknown) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(?:\.\d{1,2})?$/.test(text))
        text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}
export function reportRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret), requireAdmin);
    router.get('/dashboard', async (_request, response) => {
        const date = today();
        const [sites, workers, days] = await Promise.all([SiteModel.countDocuments({
                status: 'Active'
            }), LabourModel.find(), AttendanceModel.find({
                date
            })]);
        const cost = add(...days.flatMap(day => {
            const worker = workers.find(worker => String(worker._id) === String(day.labourId))!;
            return day.allocations.map(allocation => entryEarnings(rateFor(worker, date), allocation.halves, allocation.ot));
        }));
        response.json({
            data: {
                activeSites: sites, activeLabourers: workers.filter(worker => worker.status === 'Active').length, present: days.filter(day => day.allocations.some(allocation => allocation.halves > 0 || Number(allocation.ot) > 0)).length, todayCost: rupees(cost)
            }
        });
    });
    router.get('/:kind.csv', async (request, response) => {
        const kind = request.params.kind;
        const [workers, sites] = await Promise.all([LabourModel.find(), SiteModel.find()]);
        const name = (id: unknown) => workers.find(worker => String(worker._id) === String(id))?.name || String(id);
        const siteName = (id: unknown) => sites.find(site => String(site._id) === String(id))?.name || String(id);
        let rows: unknown[][] = [];
        if (kind === 'attendance' || kind === 'labour-cost') {
            const days = await AttendanceModel.find().sort({
                date: 1
            });
            const posted = await Payroll.find();
            rows = [['Date', 'Worker', 'Site', 'Day units', 'Overtime hours', 'Daily wage', 'Earnings']];
            for (const day of days) {
                const worker = workers.find(worker => String(worker._id) === String(day.labourId))!;
                for (const allocation of day.allocations) {
                    const snapshot = posted.filter(row => String(row.labourId) === worker.id).flatMap(row => row.items).find(item => item.date === day.date && String(item.siteId) === String(allocation.siteId));
                    const rate = snapshot?.ratePaise ?? rateFor(worker, day.date);
                    rows.push([day.date, worker.name, siteName(allocation.siteId), allocation.halves / 2, allocation.ot, rupees(rate), rupees(snapshot?.earnedPaise ?? entryEarnings(rate, allocation.halves, allocation.ot))]);
                }
            }
        }
        if (kind === 'labour-cost') {
            rows[0].push('Entry type', 'Settlement week', 'Status');
            for (const row of rows.slice(1)) row.push('Attendance', '', '');
            const approved = new Set((await Payroll.distinct('week')));
            for (const correction of await Adjustment.find({kind: 'WAGE'}).sort({createdAt: 1})) {
                rows.push([correction.originalDate, name(correction.labourId), siteName(correction.siteId), '', '', '', rupees(correction.amountPaise), 'Wage correction', correction.settlementWeek, approved.has(correction.settlementWeek) ? 'Approved' : 'Pending']);
            }
        }
        else if (kind === 'salary') {
            rows = [['Week', 'Worker', 'Gross', 'Advance recovery', 'Corrections', 'Net', 'Paid', 'Outstanding'], ...(await Payroll.find().sort({
                    week: 1
                })).map(row => [row.week, row.name, rupees(row.grossPaise), rupees(row.advancePaise), rupees(row.adjustmentPaise || 0), rupees(row.netPaise), rupees(row.paidPaise), rupees(row.netPaise - row.paidPaise)])];
        }
        else if (kind === 'advances') {
            const reversals = await Reversal.find({kind: 'Advance'});
            rows = [['Date', 'Worker', 'Issued', 'Historically recovered', 'Remaining', 'Status', 'Reversal date', 'Refund via payroll', 'Refund settlement week', 'Reversal reason'], ...(await AdvanceModel.find().sort({date: 1})).map(row => {
                const reversal = reversals.find(reversal => String(reversal.sourceId) === row.id);
                return [row.date, name(row.labourId), rupees(row.amountPaise), rupees(row.amountPaise - row.remainingPaise), rupees(reversal ? 0 : row.remainingPaise), reversal ? 'Reversed' : 'Active', reversal?.date || '', rupees(reversal?.recoveredPaise || 0), reversal?.settlementWeek || '', reversal?.reason || ''];
            })];
        }
        else if (kind === 'payments') {
            const reversals = await Reversal.find({kind: 'Payment'});
            rows = [['Date', 'Worker', 'Payment amount', 'Mode', 'Original payroll allocations', 'Entry type', 'Payment ID', 'Reason']];
            for (const row of await PaymentModel.find().sort({date: 1})) {
                const allocations = row.allocations.map(allocation => allocation.week + ': ' + rupees(allocation.amountPaise || 0)).join('; ');
                rows.push([row.date, name(row.labourId), rupees(row.amountPaise), row.mode, allocations, 'Payment', row.id, '']);
                const reversal = reversals.find(reversal => String(reversal.sourceId) === row.id);
                if (reversal) rows.push([reversal.date, name(row.labourId), rupees(-reversal.amountPaise), row.mode, allocations, 'Reversal', row.id, reversal.reason]);
            }
        }
        else if (kind === 'corrections') {
            const approved = new Set(await Payroll.distinct('week'));
            rows = [['Worker', 'Type', 'Original week', 'Original work date', 'Original site', 'Settlement week', 'Amount', 'Reason', 'Status'], ...(await Adjustment.find().sort({createdAt: 1})).map(row => [name(row.labourId), row.kind, row.originalWeek, row.originalDate || '', row.siteId ? siteName(row.siteId) : '', row.settlementWeek, rupees(row.amountPaise), row.reason, approved.has(row.settlementWeek) ? 'Approved' : 'Pending'])];
        }
        else if (kind === 'rates') {
            rows = [['Worker', 'Effective from', 'Daily wage'], ...workers.flatMap(worker => worker.salaryHistory.map(rate => [worker.name, rate.from, rupees(rate.ratePaise)]))];
        }
        else if (kind !== 'attendance')
            throw new HttpError(404, 'NOT_FOUND', 'Report not found.');
        response.type('text/csv').attachment(kind + '.csv').send('\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n'));
    });
    return router;
}
