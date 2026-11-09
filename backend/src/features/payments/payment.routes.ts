import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { Payroll, Period, PaymentModel, Reversal } from '../../domain/models.js';
import { dateValue, idValue, moneyValue, weekValue, paise, rupees, today, add } from '../../domain/values.js';
import { post, audit } from '../../domain/posting.js';
import { requestKey } from '../payroll/payroll.routes.js';
import { HttpError } from '../../lib/http-error.js';
export function paymentRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret), requireAdmin);
    router.get('/', async (_request, response) => {
        const rows = await PaymentModel.find().sort({
            createdAt: -1
        });
        const reversals = await Reversal.find({kind: 'Payment'});
        response.json({
            data: rows.map(row => ({
                status: reversals.some(reversal => String(reversal.sourceId) === row.id) ? 'Reversed' : 'Paid', reversal: reversals.filter(reversal => String(reversal.sourceId) === row.id).map(reversal => ({date: reversal.date, reason: reversal.reason}))[0] || null,
                id: row.id, labourId: String(row.labourId), date: row.date, amount: rupees(row.amountPaise), mode: row.mode, week: row.allocations.map(allocation => allocation.week).join(', '), allocations: row.allocations.map(allocation => ({
                    week: allocation.week, amount: rupees(allocation.amountPaise || 0)
                }))
            }))
        });
    });
    router.post('/', async (request, response) => {
        const input = z.strictObject({
            labourId: idValue, throughWeek: weekValue, date: dateValue, amount: moneyValue, mode: z.enum(['Cash', 'UPI', 'Bank']), requestId: requestKey
        }).parse(request.body);
        const actor = response.locals.user.id as string;
        const amountPaise = paise(input.amount);
        if (!amountPaise || input.date > today())
            throw new HttpError(400, 'INVALID_PAYMENT', 'Enter a positive amount and a date no later than today.');
        const result = await post('payment', input.requestId, {
            ...input, actor
        }, async (session) => {
            if (!await Period.exists({
                start: input.throughWeek, status: 'Approved'
            }).session(session))
                throw new HttpError(409, 'PAYROLL_NOT_APPROVED', 'Approve the selected payroll before recording a payment.');
            const unpaid = await Payroll.find({
                labourId: input.labourId, week: {
                    $lte: input.throughWeek
                }, $expr: {
                    $gt: ['$netPaise', '$paidPaise']
                }
            }).sort({
                week: 1
            }).session(session);
            const total = add(...unpaid.map(row => row.netPaise - row.paidPaise));
            if (amountPaise > total)
                throw new HttpError(409, 'OVERPAYMENT', 'Payment exceeds the total outstanding salary through this week.');
            let remaining = amountPaise;
            const allocations = [];
            for (const row of unpaid) {
                const amountPaise = Math.min(remaining, row.netPaise - row.paidPaise);
                if (!amountPaise)
                    continue;
                row.paidPaise += amountPaise;
                remaining -= amountPaise;
                await row.save({
                    session
                });
                allocations.push({
                    payrollId: row._id, week: row.week, amountPaise
                });
            }
            const [payment] = await PaymentModel.create([{
                    labourId: input.labourId, date: input.date, amountPaise, mode: input.mode, throughWeek: input.throughWeek, createdBy: actor, allocations
                }], {
                session
            });
            await audit(session, actor, 'SALARY_PAID', payment.id, {
                amountPaise, allocations
            });
            return {
                id: payment.id, amount: rupees(amountPaise)
            };
        });
        response.status(201).json({
            data: result
        });
    });
    router.post('/:id/reverse', async (request, response) => {
        const id = idValue.parse(request.params.id);
        const input = z.strictObject({date: dateValue, reason: z.string().trim().min(1).max(1000), requestId: requestKey}).parse(request.body);
        if (input.date > today()) throw new HttpError(400, 'FUTURE_REVERSAL', 'Reversal date cannot be in the future.');
        const actor = response.locals.user.id as string;
        const result = await post('payment-reversal', input.requestId, {...input, id, actor}, async session => {
            const payment = await PaymentModel.findById(id).session(session);
            if (!payment) throw new HttpError(404, 'NOT_FOUND', 'Payment not found.');
            if (input.date < payment.date) throw new HttpError(400, 'REVERSAL_DATE', 'Reversal date cannot be before the payment date.');
            if (await Reversal.exists({kind: 'Payment', sourceId: id}).session(session)) throw new HttpError(409, 'ALREADY_REVERSED', 'This payment has already been reversed.');
            for (const allocation of payment.allocations) {
                const amount = allocation.amountPaise || 0;
                const changed = await Payroll.updateOne({_id: allocation.payrollId, paidPaise: {$gte: amount}}, {$inc: {paidPaise: -amount}}, {session});
                if (changed.matchedCount !== 1) throw new HttpError(409, 'LEDGER_CONFLICT', 'Payment allocations do not match the salary ledger.');
            }
            const [reversal] = await Reversal.create([{kind: 'Payment', sourceId: payment._id, labourId: payment.labourId, amountPaise: payment.amountPaise, date: input.date, reason: input.reason, createdBy: actor}], {session});
            await audit(session, actor, 'PAYMENT_REVERSED', reversal.id, {paymentId: id, amountPaise: payment.amountPaise, reason: input.reason});
            return {id: reversal.id};
        });
        response.status(201).json({data: result});
    });
    return router;
}
