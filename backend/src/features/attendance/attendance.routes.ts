import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware.js';
import type { UserView } from '../users/user.model.js';
import { AttendanceModel, LabourModel, Period, SiteModel } from '../../domain/models.js';
import { transaction, audit } from '../../domain/posting.js';
import { accessibleSite } from '../sites/site.routes.js';
import { rateFor } from '../labour/labour.routes.js';
import { dateValue, decimalValue, idValue, monday, entryEarnings, rupees, today } from '../../domain/values.js';
import { HttpError } from '../../lib/http-error.js';
export function attendanceRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret));
    router.get('/', async (request, response) => {
        const { date } = z.strictObject({
            date: dateValue
        }).parse(request.query);
        const user = response.locals.user as UserView;
        const sites = await SiteModel.find(user.role === 'ADMIN' ? {} : {
            supervisorId: user.id
        }).select('_id');
        const allowed = new Set(sites.map(site => String(site._id)));
        const days = await AttendanceModel.find({
            date, 'allocations.siteId': {
                $in: sites.map(site => site._id)
            }
        });
        const workers = await LabourModel.find({
            _id: {
                $in: days.map(day => day.labourId)
            }
        });
        const approved = Boolean(await Period.exists({
            start: monday(date), status: 'Approved'
        }));
        const rows = days.flatMap(day => day.allocations.filter(allocation => allowed.has(String(allocation.siteId))).map(allocation => {
            const worker = workers.find(worker => String(worker._id) === String(day.labourId))!;
            const rate = rateFor(worker, date);
            return {
                labourId: String(day.labourId), date, siteId: String(allocation.siteId), units: allocation.halves / 2, ot: allocation.ot, approved, ...(user.role === 'ADMIN' ? {
                    rate: rupees(rate), earned: rupees(entryEarnings(rate, allocation.halves, allocation.ot))
                } : {})
            };
        }));
        response.json({
            data: rows
        });
    });
    router.post('/', async (request, response) => {
        const input = z.strictObject({
            labourId: idValue, siteId: idValue, date: dateValue, units: z.union([z.literal(0), z.literal(.5), z.literal(1)]), ot: decimalValue
        }).parse(request.body);
        const user = response.locals.user as UserView;
        if (input.date > today())
            throw new HttpError(400, 'FUTURE_ATTENDANCE', 'Attendance cannot be entered for a future date.');
        await transaction(async (session) => {
            await accessibleSite(input.siteId, user, session);
            if (await Period.exists({
                start: monday(input.date), status: 'Approved'
            }).session(session))
                throw new HttpError(409, 'PAYROLL_LOCKED', 'Attendance for this approved week is locked.');
            const worker = await LabourModel.findOne({
                _id: input.labourId, status: 'Active'
            }).session(session);
            if (!worker)
                throw new HttpError(400, 'INVALID_WORKER', 'Choose an active worker.');
            const rate = rateFor(worker, input.date);
            entryEarnings(rate, input.units * 2, input.ot);
            let day = await AttendanceModel.findOne({
                labourId: input.labourId, date: input.date
            }).session(session);
            if (!day)
                day = new AttendanceModel({
                    labourId: input.labourId, date: input.date, allocations: []
                });
            const other = day.allocations.filter(allocation => String(allocation.siteId) !== input.siteId);
            if (other.reduce((sum, allocation) => sum + allocation.halves, 0) + input.units * 2 > 2)
                throw new HttpError(409, 'DAY_LIMIT', 'Regular attendance exceeds one day across sites.');
            day.allocations.pull(...day.allocations.filter(allocation => String(allocation.siteId) === input.siteId));
            day.allocations.push({
                siteId: input.siteId, halves: input.units * 2, ot: input.ot, updatedBy: user.id
            });
            await day.save({
                session
            });
            await audit(session, user.id, 'ATTENDANCE_SAVED', day.id, {
                siteId: input.siteId, date: input.date
            });
        });
        response.json({
            data: {
                saved: true
            }
        });
    });
    return router;
}
