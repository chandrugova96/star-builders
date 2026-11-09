import {siteRoutes} from './features/sites/site.routes.js';
import {labourRoutes} from './features/labour/labour.routes.js';
import {attendanceRoutes} from './features/attendance/attendance.routes.js';
import {payrollRoutes} from './features/payroll/payroll.routes.js';
import {advanceRoutes} from './features/advances/advance.routes.js';
import {paymentRoutes} from './features/payments/payment.routes.js';
import {reportRoutes} from './features/reports/report.routes.js';
import {mountFrontend} from './lib/frontend.js';
import {randomUUID} from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type {Config} from './config/env.js';
import {HttpError} from './lib/http-error.js';
import {errorHandler} from './middleware/errors.js';
import {authRoutes} from './features/auth/auth.routes.js';
import {userRoutes} from './features/users/user.routes.js';

export function createApp(config: Pick<Config, 'CORS_ORIGINS' | 'JWT_SECRET'> & Partial<Pick<Config, 'TRUST_PROXY'>>, checkDatabase: () => Promise<boolean>, options: {frontendDirectory?: string} = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', config.TRUST_PROXY ?? false);
    app.use((_request, response, next) => {response.locals.requestId = randomUUID(); response.set('X-Request-ID', response.locals.requestId); next();});
    app.use(helmet());
    app.use(cors({origin(origin, callback) {
        if (!origin || config.CORS_ORIGINS.includes(origin)) callback(null, true);
        else callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'));
    }, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization']}));
    app.use(express.json({limit: '100kb'}));
    app.use((_request, response, next) => {response.set('Cache-Control', 'no-store'); next();});
    app.get('/api/health', (_request, response) => {response.json({data: {status: 'ok', service: 'star-builders-api'}});});
    app.get('/api/health/ready', async (_request, response) => {
        let ready = false;
        try {ready = await checkDatabase();} catch {ready = false;}
        response.status(ready ? 200 : 503).json({data: {status: ready ? 'ready' : 'unavailable'}});
    });
    app.use('/api/auth', authRoutes(config.JWT_SECRET));
    app.use('/api/users', userRoutes(config.JWT_SECRET));
    app.use('/api/sites', siteRoutes(config.JWT_SECRET));
    app.use('/api/labourers', labourRoutes(config.JWT_SECRET));
    app.use('/api/attendance', attendanceRoutes(config.JWT_SECRET));
    app.use('/api/payroll', payrollRoutes(config.JWT_SECRET));
    app.use('/api/advances', advanceRoutes(config.JWT_SECRET));
    app.use('/api/payments', paymentRoutes(config.JWT_SECRET));
    app.use('/api/reports', reportRoutes(config.JWT_SECRET));
    // API failures must stay JSON and must never fall through to the SPA.
    app.use('/api', (_request, _response, next) => {next(new HttpError(404, 'NOT_FOUND', 'API route not found.'));});
    if (options.frontendDirectory) mountFrontend(app, options.frontendDirectory);
    app.use((_request, _response, next) => {next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));});
    app.use(errorHandler);
    return app;
}
