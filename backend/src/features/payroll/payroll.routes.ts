import {adjustmentInput, createAdjustment} from './adjustments.js';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { AttendanceModel, Period, Adjustment } from '../../domain/models.js';
import { monday, weekValue } from '../../domain/values.js';
import { post } from '../../domain/posting.js';
import { approve, payrollView } from './payroll.service.js';
export const requestKey = z.string().uuid();
export function payrollRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret), requireAdmin);
    router.get('/periods', async (_request, response) => {
        const days = await AttendanceModel.distinct('date');
        const periods = await Period.find();
        const correctionWeeks = await Adjustment.distinct('settlementWeek');
        response.json({
            data: [...new Set([...days.map(monday), ...periods.map(period => period.start), ...correctionWeeks])].sort().map(week => ({
                week, approved: periods.some(period => period.start === week && period.status === 'Approved')
            }))
        });
    });
    router.get('/', async (request, response) => {
        const { week } = z.strictObject({
            week: weekValue
        }).parse(request.query);
        response.json({
            data: await payrollView(week)
        });
    });
    router.post('/approve', async (request, response) => {
        const input = z.strictObject({
            week: weekValue, requestId: requestKey
        }).parse(request.body);
        const actor = response.locals.user.id as string;
        await post('approval', input.requestId, {
            ...input, actor
        }, async (session) => {
            await approve(input.week, actor, session);
            return {
                approved: true
            };
        });
        response.json({
            data: await payrollView(input.week)
        });
    });
    router.post('/adjustments', async (request, response) => {
        const input = adjustmentInput.parse(request.body);
        const actor = response.locals.user.id as string;
        const result = await post('payroll-adjustment', input.requestId, {...input, actor}, session => createAdjustment(input, actor, session));
        response.status(201).json({data: result});
    });
    return router;
}
