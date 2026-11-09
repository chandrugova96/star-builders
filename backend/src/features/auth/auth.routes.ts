import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import {User, publicUser} from '../users/user.model.js';
import {loginSchema} from '../users/user.validation.js';
import {HttpError} from '../../lib/http-error.js';
import {authenticate} from './auth.middleware.js';
import {hashPassword, verifyPassword} from './password.js';
import {issueToken, ACCESS_TOKEN_TTL_SECONDS} from './tokens.js';

export function authRoutes(secret: string) {
    const router = Router();
    // Unknown phones still run scrypt to reduce account-enumeration timing differences.
    const dummyHash = hashPassword('internal-timing-placeholder');
    router.post('/login', rateLimit({windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
        handler: (_request, response) => {response.status(429).json({error: {code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.'}});},
    }), async (request, response) => {
        const input = loginSchema.parse(request.body);
        const user = await User.findOne({phone: input.phone}).select('+passwordHash');
        const valid = await verifyPassword(input.password, user?.passwordHash || await dummyHash);
        if (!user?.active || !valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Phone number or password is incorrect.');
        response.set('Cache-Control', 'no-store').json({data: {accessToken: issueToken(user.id, secret), tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL_SECONDS, user: publicUser(user)}});
    });
    router.get('/me', authenticate(secret), (_request, response) => {response.set('Cache-Control', 'no-store').json({data: response.locals.user});});
    return router;
}
