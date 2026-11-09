import type { ClientSession } from 'mongoose';
import { LabourModel, AttendanceModel, AdvanceModel, Payroll, Period, PaymentModel, Reversal, Adjustment } from '../../domain/models.js';
import { rateFor } from '../labour/labour.routes.js';
import { entryEarnings, add, monday, sunday, rupees, today, signedAdd } from '../../domain/values.js';
import { HttpError } from '../../lib/http-error.js';
import { audit } from '../../domain/posting.js';
export async function draftRows(week: string, session?: ClientSession) {
    const workers = await LabourModel.find().sort({
        _id: 1
    }).session(session || null);
    const days = await AttendanceModel.find({
        date: {
            $gte: week, $lte: sunday(week)
        }
    }).session(session || null);
    const cancelled = await Reversal.find({kind: 'Advance'}).session(session || null);
    const corrections = await Adjustment.find({settlementWeek: week}).sort({createdAt: 1, _id: 1}).session(session || null);
    const advances = await AdvanceModel.find({
        _id: {$nin: cancelled.map(row => row.sourceId)},
        date: {
            $lte: sunday(week)
        }, remainingPaise: {
            $gt: 0
        }
    }).sort({
        date: 1, createdAt: 1, _id: 1
    }).session(session || null);
    const outstanding = await Payroll.find({
        $expr: {
            $gt: ['$netPaise', '$paidPaise']
        }
    }).session(session || null);
    return workers.filter(worker => worker.status === 'Active' || corrections.some(row => String(row.labourId) === worker.id) || days.some(day => String(day.labourId) === worker.id) || outstanding.some(row => String(row.labourId) === worker.id)).map(worker => {
        const items = days.filter(day => String(day.labourId) === worker.id).flatMap(day => day.allocations.map(allocation => {
            const ratePaise = rateFor(worker, day.date);
            return {
                date: day.date, siteId: allocation.siteId, halves: allocation.halves, ot: allocation.ot, ratePaise, earnedPaise: entryEarnings(ratePaise, allocation.halves, allocation.ot)
            };
        }));
        const grossPaise = add(...items.map(item => item.earnedPaise));
        const adjustments = corrections.filter(row => String(row.labourId) === worker.id).map(row => ({adjustmentId: row._id, amountPaise: row.amountPaise, kind: row.kind, originalWeek: row.originalWeek, originalDate: row.originalDate, siteId: row.siteId, reason: row.reason}));
        const adjustmentPaise = signedAdd(...adjustments.map(row => row.amountPaise));
        const wageBasis = signedAdd(grossPaise, ...adjustments.filter(row => row.kind === 'WAGE').map(row => row.amountPaise));
        let available = Math.max(0, wageBasis);
        const recoveries = advances.filter(advance => String(advance.labourId) === worker.id).flatMap(advance => {
            const amountPaise = Math.min(available, advance.remainingPaise);
            available -= amountPaise;
            return amountPaise ? [{
                    advanceId: advance._id, amountPaise
                }] : [];
        });
        return {
            week, labourId: worker._id, name: worker.name, days: items.reduce((sum, item) => sum + item.halves / 2, 0), grossPaise, adjustmentPaise, adjustments, advancePaise: Math.max(0, wageBasis) - available, netPaise: signedAdd(grossPaise, adjustmentPaise, -(Math.max(0, wageBasis) - available)), paidPaise: 0, items, recoveries
        };
    });
}
export async function approve(week: string, actor: string, session: ClientSession) {
    if (week > monday(today()))
        throw new HttpError(409, 'FUTURE_PERIOD', 'A future week cannot be approved.');
    if (await Period.exists({
        start: week, status: 'Approved'
    }).session(session))
        return;
    const approvedPeriods = await Period.find({
        status: 'Approved'
    }).session(session);
    const posted = new Set(approvedPeriods.map(period => period.start));
    if (approvedPeriods.some(period => period.start > week))
        throw new HttpError(409, 'CHRONOLOGY', 'A later week is already approved. A historical adjustment review is required.');
    const earlierCorrections = await Adjustment.find({settlementWeek: {$lt: week}}).session(session);
    if (earlierCorrections.some(row => !posted.has(row.settlementWeek))) throw new HttpError(409, 'EARLIER_PENDING', 'Approve earlier weeks containing corrections first.');
    const earlier = await AttendanceModel.find({
        date: {
            $lt: week
        }
    }).select('date').session(session);
    if (earlier.some(day => !posted.has(monday(day.date))))
        throw new HttpError(409, 'EARLIER_PENDING', 'Approve earlier pending attendance weeks first.');
    const rows = await draftRows(week, session);
    if (!rows.some(row => row.items.length || row.adjustments.length))
        throw new HttpError(409, 'NO_ATTENDANCE', 'There is no attendance or correction to approve for this week.');
    if (rows.some(row => row.netPaise < 0)) throw new HttpError(409, 'NEGATIVE_PAYROLL', 'A correction exceeds this week’s available salary. Add a correcting adjustment or enter eligible attendance before approval.');
    for (const row of rows) {
        await Payroll.create([row], {
            session
        });
        for (const recovery of row.recoveries) {
            const changed = await AdvanceModel.updateOne({
                _id: recovery.advanceId, remainingPaise: {
                    $gte: recovery.amountPaise
                }
            }, {
                $inc: {
                    remainingPaise: -recovery.amountPaise
                }
            }, {
                session
            });
            if (changed.modifiedCount !== 1)
                throw new HttpError(409, 'RECOVERY_CONFLICT', 'Advance balance changed. Retry approval.');
        }
    }
    await Period.updateOne({
        start: week
    }, {
        $set: {
            end: sunday(week), status: 'Approved', approvedBy: actor, approvedAt: new Date()
        }
    }, {
        upsert: true, session
    });
    await audit(session, actor, 'PAYROLL_APPROVED', week);
}
export async function payrollView(week: string) {
    const approved = Boolean(await Period.exists({
        start: week, status: 'Approved'
    }));
    const rows = approved ? await Payroll.find({
        week
    }).sort({
        labourId: 1
    }) : await draftRows(week);
    const previous = await Payroll.find({
        week: {
            $lt: week
        }, $expr: {
            $gt: ['$netPaise', '$paidPaise']
        }
    }).sort({
        week: 1
    });
    const payments = await PaymentModel.find({
        'allocations.week': week
    }).sort({
        createdAt: 1
    });
    const corrections = await Adjustment.find({$or: [{originalWeek: week}, {settlementWeek: week}]}).sort({createdAt: 1});
    const reversals = await Reversal.find({kind: 'Payment', sourceId: {$in: payments.map(payment => payment._id)}});
    return {
        week, end: sunday(week), status: approved ? 'Approved' : 'Pending', rows: rows.map(row => {
            const id = String(row.labourId);
            const prior = previous.filter(old => String(old.labourId) === id).map(old => ({
                week: old.week, amount: rupees(old.netPaise - old.paidPaise)
            }));
            const brought = add(...previous.filter(old => String(old.labourId) === id).map(old => old.netPaise - old.paidPaise));
            const balance = row.netPaise - row.paidPaise;
            return {
                id, name: row.name, days: row.days, gross: rupees(row.grossPaise), adjustment: rupees(row.adjustmentPaise || 0), corrections: corrections.filter(correction => String(correction.labourId) === id).map(correction => ({id: correction.id, kind: correction.kind, amount: rupees(correction.amountPaise), reason: correction.reason, originalWeek: correction.originalWeek, settlementWeek: correction.settlementWeek, siteId: correction.siteId ? String(correction.siteId) : null, originalDate: correction.originalDate || null})), advance: rupees(row.advancePaise), net: rupees(row.netPaise), paid: rupees(row.paidPaise), broughtForward: rupees(brought), balance: rupees(balance), totalOutstanding: rupees(signedAdd(balance, brought)), items: row.items.map(item => ({
                    date: item.date, siteId: String(item.siteId), units: (item.halves || 0) / 2, ot: item.ot, rate: rupees(item.ratePaise || 0), earned: rupees(item.earnedPaise || 0)
                })), prior, history: payments.filter(payment => String(payment.labourId) === id).map(payment => ({
                    status: reversals.some(reversal => String(reversal.sourceId) === payment.id) ? 'Reversed' : 'Paid', id: payment.id, date: payment.date, mode: payment.mode, amount: rupees(payment.allocations.filter(allocation => allocation.week === week).reduce((sum, allocation) => sum + (allocation.amountPaise || 0), 0))
                }))
            };
        })
    };
}
