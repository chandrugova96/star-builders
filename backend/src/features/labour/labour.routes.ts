import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import type { UserView } from '../users/user.model.js';
import { LabourModel, Payroll, SiteModel } from '../../domain/models.js';
import { transaction, audit } from '../../domain/posting.js';
import { dateValue, idValue, moneyValue, paise, rupees, today, sunday } from '../../domain/values.js';
import { HttpError } from '../../lib/http-error.js';
export function rateFor(worker: InstanceType<typeof LabourModel>, day: string) {
    const rate = [...worker.salaryHistory].filter(rate => rate.from <= day).sort((a, b) => b.from.localeCompare(a.from))[0];
    if (!rate)
        throw new HttpError(409, 'MISSING_RATE', 'No wage rate is effective for this work date.');
    return rate.ratePaise;
}
export function labourView(worker: InstanceType<typeof LabourModel>, admin: boolean) {
    return {
        id: worker.id, labourCode: worker.labourCode, name: worker.name, category: worker.category, status: worker.status, initials: worker.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase(), ...(admin ? {
            phone: worker.phone, rate: rupees([...worker.salaryHistory].filter(rate => rate.from <= today()).sort((a, b) => b.from.localeCompare(a.from))[0]?.ratePaise || 0), salaryHistory: worker.salaryHistory.map(rate => ({
                from: rate.from, rate: rupees(rate.ratePaise)
            }))
        } : {})
    };
}
export function labourRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret));
    router.get('/', async (_request, response) => {
        const user = response.locals.user as UserView;
        if (user.role !== 'ADMIN' && !await SiteModel.exists({
            supervisorId: user.id
        })) {
            response.json({
                data: []
            });
            return;
        }
        const workers = await LabourModel.find(user.role === 'ADMIN' ? {} : {
            status: 'Active'
        }).sort({
            createdAt: 1
        });
        response.json({
            data: workers.map(worker => labourView(worker, user.role === 'ADMIN'))
        });
    });
    router.post('/', requireAdmin, async (request, response) => {
        const input = z.strictObject({
            name: z.string().trim().min(1).max(120), phone: z.string().regex(/^\d*$/).max(32).default(''), category: z.string().trim().min(1).max(80), rate: moneyValue, from: dateValue
        }).parse(request.body);
        const ratePaise = paise(input.rate);
        if (!ratePaise)
            throw new HttpError(400, 'INVALID_RATE', 'Daily wage must be greater than zero.');
        const actor = response.locals.user as UserView;
        const worker = await transaction(async (session) => {
            const [worker] = await LabourModel.create([{
                    labourCode: 'LAB' + randomUUID().slice(0, 8).toUpperCase(), name: input.name, phone: input.phone, category: input.category, salaryHistory: [{
                            from: input.from, ratePaise, changedBy: actor.id
                        }]
                }], {
                session
            });
            await audit(session, actor.id, 'LABOUR_CREATED', worker.id);
            return worker;
        });
        response.status(201).json({
            data: labourView(worker, true)
        });
    });
    router.post('/:id/rates', requireAdmin, async (request, response) => {
        const id = idValue.parse(request.params.id);
        const input = z.strictObject({
            from: dateValue, rate: moneyValue
        }).parse(request.body);
        const ratePaise = paise(input.rate);
        if (!ratePaise)
            throw new HttpError(400, 'INVALID_RATE', 'Daily wage must be greater than zero.');
        const actor = response.locals.user as UserView;
        const worker = await transaction(async (session) => {
            const worker = await LabourModel.findById(id).session(session);
            if (!worker)
                throw new HttpError(404, 'NOT_FOUND', 'Worker not found.');
            const locked = await Payroll.find({
                labourId: id
            }).session(session);
            if (locked.some(row => input.from <= sunday(row.week)))
                throw new HttpError(409, 'PAYROLL_LOCKED', 'This revision affects approved payroll. Record a separate adjustment.');
            if (worker.salaryHistory.some(rate => rate.from === input.from))
                throw new HttpError(409, 'RATE_DATE_EXISTS', 'A rate already starts on this date.');
            worker.salaryHistory.push({
                from: input.from, ratePaise, changedBy: actor.id
            });
            worker.salaryHistory.sort((a, b) => a.from.localeCompare(b.from));
            await worker.save({
                session
            });
            await audit(session, actor.id, 'WAGE_REVISED', id, {
                from: input.from, ratePaise
            });
            return worker;
        });
        response.json({
            data: labourView(worker, true)
        });
    });
    return router;
}
