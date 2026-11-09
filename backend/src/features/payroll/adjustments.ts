import type {ClientSession} from 'mongoose';
import {z} from 'zod';
import {Adjustment, Period, Payroll, SiteModel} from '../../domain/models.js';
import {dateValue, idValue, weekValue, moneyValue, paise, signedAdd, shift, sunday} from '../../domain/values.js';
import {HttpError} from '../../lib/http-error.js';
import {audit} from '../../domain/posting.js';

export const adjustmentInput = z.strictObject({
    labourId: idValue, originalWeek: weekValue, originalDate: dateValue, siteId: idValue,
    direction: z.enum(['Credit', 'Debit']), amount: moneyValue,
    reason: z.string().trim().min(1).max(1000), requestId: z.string().uuid(),
});
export async function nextSettlementWeek(session: ClientSession) {
    const latest = await Period.findOne({status: 'Approved'}).sort({start: -1}).session(session);
    if (!latest) throw new HttpError(409, 'NO_APPROVED_PAYROLL', 'An approved payroll is required before posting a correction.');
    return shift(latest.start, 7);
}
export async function createAdjustment(input: z.infer<typeof adjustmentInput>, actor: string, session: ClientSession) {
    const payroll = await Payroll.findOne({week: input.originalWeek, labourId: input.labourId}).session(session);
    if (!payroll) throw new HttpError(409, 'PAYROLL_NOT_APPROVED', 'Choose an approved worker payroll to correct.');
    if (input.originalDate < input.originalWeek || input.originalDate > sunday(input.originalWeek)) throw new HttpError(400, 'WORK_DATE', 'Work date must belong to the original payroll week.');
    if (!await SiteModel.exists({_id: input.siteId}).session(session)) throw new HttpError(400, 'INVALID_SITE', 'Choose a valid construction site.');
    const amount = paise(input.amount);
    if (!amount) throw new HttpError(400, 'INVALID_AMOUNT', 'Correction amount must be greater than zero.');
    const amountPaise = input.direction === 'Debit' ? -amount : amount;
    const previous = await Adjustment.find({originalPayrollId: payroll._id, kind: 'WAGE'}).session(session);
    if (signedAdd(payroll.grossPaise, ...previous.map(row => row.amountPaise), amountPaise) < 0) throw new HttpError(409, 'EXCESS_DEDUCTION', 'Deductions cannot exceed the original earnings plus earlier wage corrections.');
    const settlementWeek = await nextSettlementWeek(session);
    const [adjustment] = await Adjustment.create([{
        labourId: payroll.labourId, originalPayrollId: payroll._id, originalWeek: payroll.week,
        originalDate: input.originalDate, siteId: input.siteId, settlementWeek, kind: 'WAGE', amountPaise,
        reason: input.reason, createdBy: actor,
    }], {session});
    await audit(session, actor, 'PAYROLL_CORRECTION_CREATED', adjustment.id, {originalWeek: payroll.week, settlementWeek, amountPaise, reason: input.reason});
    return {id: adjustment.id, settlementWeek};
}
