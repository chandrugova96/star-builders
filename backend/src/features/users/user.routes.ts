import {Router} from 'express';
import mongoose from 'mongoose';
import {authenticate, requireAdmin} from '../auth/auth.middleware.js';
import {hashPassword} from '../auth/password.js';
import {HttpError} from '../../lib/http-error.js';
import {User, publicUser} from './user.model.js';
import {createUserSchema, updateUserSchema, listUsersSchema} from './user.validation.js';

export function userRoutes(secret: string) {
    const router = Router();
    router.use(authenticate(secret), requireAdmin);
    router.get('/', async (request, response) => {
        const {page, limit} = listUsersSchema.parse(request.query);
        const [users, total] = await Promise.all([User.find().sort({createdAt: 1, _id: 1}).skip((page - 1) * limit).limit(limit), User.countDocuments()]);
        response.json({data: users.map(publicUser), pagination: {page, limit, total}});
    });
    router.post('/', async (request, response) => {
        const input = createUserSchema.parse(request.body);
        const {password, ...details} = input;
        const user = await User.create({...details, passwordHash: await hashPassword(password)});
        response.status(201).json({data: publicUser(user)});
    });
    router.patch('/:id', async (request, response) => {
        const id = request.params.id;
        if (typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id)) throw new HttpError(400, 'INVALID_ID', 'Invalid user ID.');
        const input = updateUserSchema.parse(request.body);
        if (id === response.locals.user.id && input.role === 'SUPERVISOR') throw new HttpError(409, 'SELF_DEMOTION', 'You cannot remove your own Admin role.');
        const user = await User.findByIdAndUpdate(id, {$set: input}, {new: true, runValidators: true});
        if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
        response.json({data: publicUser(user)});
    });
    return router;
}
