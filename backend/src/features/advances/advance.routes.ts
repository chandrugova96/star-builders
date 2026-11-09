import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { AdvanceModel, LabourModel, Reversal, Payroll, Adjustment } from '../../domain/models.js';
import { dateValue, idValue, moneyValue, paise, rupees, today } from '../../domain/values.js';
import { post, audit } from '../../domain/posting.js';
import {nextSettlementWeek} from '../payroll/adjustments.js';
import { requestKey } from '../payroll/payroll.routes.js';
import { HttpError } from '../../lib/http-error.js';
export function advanceRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret), requireAdmin);
    router.get('/', async (_request, response) => {
        const rows = await AdvanceModel.find().sort({
            date: -1, createdAt: -1
        });
        const reversals = await Reversal.find({kind: 'Advance'});
        response.json({
            data: rows.map(row => ({
                id: row.id, labourId: String(row.labourId), date: row.date, amount: rupees(row.amountPaise), status: reversals.some(reversal => String(reversal.sourceId) === row.id) ? 'Reversed' : 'Active', reversal: reversals.filter(reversal => String(reversal.sourceId) === row.id).map(reversal => ({date: reversal.date, reason: reversal.reason, refund: rupees(reversal.recoveredPaise || 0), settlementWeek: reversal.settlementWeek || null}))[0] || null, remaining: rupees(reversals.some(reversal => String(reversal.sourceId) === row.id) ? 0 : row.remainingPaise), recovered: rupees(row.amountPaise - row.remainingPaise)
            }))
        });
    });
    router.post('/', async (request, response) => {
        const input = z.strictObject({
            labourId: idValue, date: dateValue, amount: moneyValue, requestId: requestKey
        }).parse(request.body);
        const actor = response.locals.user.id as string;
        const amountPaise = paise(input.amount);
        if (!amountPaise || input.date > today())
            throw new HttpError(400, 'INVALID_ADVANCE', 'Enter a positive advance amount and a date no later than today.');
        const result = await post('advance', input.requestId, {
            ...input, actor
        }, async (session) => {
            if (!await LabourModel.exists({
                _id: input.labourId, status: 'Active'
            }).session(session))
                throw new HttpError(400, 'INVALID_WORKER', 'Choose an active worker.');
            const [advance] = await AdvanceModel.create([{
                    labourId: input.labourId, date: input.date, amountPaise, remainingPaise: amountPaise, createdBy: actor
                }], {
                session
            });
            await audit(session, actor, 'ADVANCE_ISSUED', advance.id, {
                amountPaise
            });
            return {
                id: advance.id
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
        const result = await post('advance-reversal', input.requestId, {...input, id, actor}, async session => {
            const advance = await AdvanceModel.findById(id).session(session);
            if (!advance) throw new HttpError(404, 'NOT_FOUND', 'Advance not found.');
            if (input.date < advance.date) throw new HttpError(400, 'REVERSAL_DATE', 'Reversal date cannot be before the advance date.');
            if (await Reversal.exists({kind: 'Advance', sourceId: id}).session(session)) throw new HttpError(409, 'ALREADY_REVERSED', 'This advance has already been reversed.');
            const recoveredPaise = advance.amountPaise - advance.remainingPaise;
            const settlementWeek = recoveredPaise ? await nextSettlementWeek(session) : undefined;
            const [reversal] = await Reversal.create([{kind: 'Advance', sourceId: advance._id, labourId: advance.labourId, amountPaise: advance.amountPaise, recoveredPaise, settlementWeek, date: input.date, reason: input.reason, createdBy: actor}], {session});
            const payrolls = await Payroll.find({'recoveries.advanceId': advance._id}).session(session);
            let credited = 0;
            for (const payroll of payrolls) {
                const amountPaise = payroll.recoveries.filter(row => String(row.advanceId) === id).reduce((total, row) => total + (row.amountPaise || 0), 0);
                if (!amountPaise) continue;
                credited += amountPaise;
                await Adjustment.create([{labourId: advance.labourId, originalPayrollId: payroll._id, originalWeek: payroll.week, settlementWeek, kind: 'ADVANCE_REFUND', amountPaise, reason: input.reason, sourceReversalId: reversal._id, createdBy: actor}], {session});
            }
            if (credited !== recoveredPaise) throw new HttpError(409, 'LEDGER_CONFLICT', 'Advance recoveries do not match the salary ledger.');
            await audit(session, actor, 'ADVANCE_REVERSED', reversal.id, {advanceId: id, recoveredPaise, settlementWeek, reason: input.reason});
            return {id: reversal.id, refund: rupees(recoveredPaise), settlementWeek};
        });
        response.status(201).json({data: result});
    });
    return router;
}
