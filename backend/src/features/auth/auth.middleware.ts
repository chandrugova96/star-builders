import type {RequestHandler} from 'express';
import {User, publicUser} from '../users/user.model.js';
import type {UserView} from '../users/user.model.js';
import {HttpError} from '../../lib/http-error.js';
import {tokenSubject} from './tokens.js';

export function authenticate(secret: string): RequestHandler {
    return async (request, response, next) => {
        const match = /^Bearer (\S+)$/.exec(request.headers.authorization || '');
        let id: string;
        try {if (!match) throw new Error(); id = tokenSubject(match[1], secret);} catch {throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');}
        // Read current role/status from MongoDB: token claims cannot grant stale privileges.
        const user = await User.findById(id);
        if (!user?.active) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
        response.locals.user = publicUser(user);
        next();
    };
}
export const requireAdmin: RequestHandler = (_request, response, next) => {
    const user = response.locals.user as UserView | undefined;
    if (user?.role !== 'ADMIN') throw new HttpError(403, 'FORBIDDEN', 'Admin access is required.');
    next();
};
