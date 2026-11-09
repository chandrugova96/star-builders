import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ClientSession } from 'mongoose';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import type { UserView } from '../users/user.model.js';
import { User } from '../users/user.model.js';
import { SiteModel, AttendanceModel } from '../../domain/models.js';
import { transaction, audit } from '../../domain/posting.js';
import { idValue, moneyValue, paise, rupees, today } from '../../domain/values.js';
import { HttpError } from '../../lib/http-error.js';
export async function accessibleSite(id: string, user: UserView, session?: ClientSession) {
    const site = await SiteModel.findById(id).session(session || null);
    if (!site)
        throw new HttpError(404, 'NOT_FOUND', 'Site not found.');
    if (user.role !== 'ADMIN' && String(site.supervisorId) !== user.id)
        throw new HttpError(403, 'FORBIDDEN', 'This site is not assigned to you.');
    return site;
}
async function checkSupervisor(id: string | null, session: ClientSession) {
    if (id && !await User.exists({
        _id: id, role: 'SUPERVISOR', active: true
    }).session(session))
        throw new HttpError(400, 'INVALID_SUPERVISOR', 'Choose an active Supervisor user.');
}
export async function siteView(site: InstanceType<typeof SiteModel>, user: UserView) {
    const supervisor = site.supervisorId ? await User.findOne({
        _id: site.supervisorId, role: 'SUPERVISOR', active: true
    }) : null;
    const workers = await AttendanceModel.countDocuments({
        date: today(), allocations: {
            $elemMatch: {
                siteId: site._id, halves: {
                    $gt: 0
                }
            }
        }
    });
    return {
        id: site.id, siteCode: site.siteCode, name: site.name, location: site.location, status: site.status, supervisorId: supervisor?.id || '', supervisor: supervisor?.name || 'Unassigned', workers, ...(user.role === 'ADMIN' ? {
            budget: rupees(site.budgetPaise)
        } : {})
    };
}
const supervisorField = idValue.nullable().default(null);
const create = z.strictObject({
    name: z.string().trim().min(1).max(160), location: z.string().trim().max(300).default(''), budget: moneyValue.default('0'), supervisorId: supervisorField
});
export function siteRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret));
    router.get('/', async (_request, response) => {
        const user = response.locals.user as UserView;
        const sites = await SiteModel.find(user.role === 'ADMIN' ? {} : {
            supervisorId: user.id
        }).sort({
            createdAt: 1
        });
        response.json({
            data: await Promise.all(sites.map(site => siteView(site, user)))
        });
    });
    router.post('/', requireAdmin, async (request, response) => {
        const input = create.parse(request.body);
        const user = response.locals.user as UserView;
        const site = await transaction(async (session) => {
            await checkSupervisor(input.supervisorId, session);
            const [site] = await SiteModel.create([{
                    siteCode: 'ST' + randomUUID().slice(0, 8).toUpperCase(), name: input.name, location: input.location, budgetPaise: paise(input.budget), supervisorId: input.supervisorId, assignments: input.supervisorId ? [{
                            userId: input.supervisorId, assignedFrom: new Date()
                        }] : []
                }], {
                session
            });
            await audit(session, user.id, 'SITE_CREATED', site.id);
            return site;
        });
        response.status(201).json({
            data: await siteView(site, user)
        });
    });
    router.patch('/:id/supervisor', requireAdmin, async (request, response) => {
        const id = idValue.parse(request.params.id);
        const input = z.strictObject({
            supervisorId: supervisorField
        }).parse(request.body);
        const user = response.locals.user as UserView;
        const site = await transaction(async (session) => {
            await checkSupervisor(input.supervisorId, session);
            const site = await accessibleSite(id, user, session);
            const previous = String(site.supervisorId || '');
            if (previous !== String(input.supervisorId || '')) {
                const now = new Date();
                for (const assignment of site.assignments)
                    if (!assignment.assignedTo)
                        assignment.assignedTo = now;
                if (input.supervisorId)
                    site.assignments.push({
                        userId: input.supervisorId, assignedFrom: now
                    });
                site.supervisorId = input.supervisorId as never;
                await site.save({
                    session
                });
                await audit(session, user.id, 'SITE_SUPERVISOR_CHANGED', id, {
                    previous, next: input.supervisorId
                });
            }
            return site;
        });
        response.json({
            data: await siteView(site, user)
        });
    });
    return router;
}
