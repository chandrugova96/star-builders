import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import {createApp} from '../src/app.js';
import {requireAdmin} from '../src/features/auth/auth.middleware.js';
import {errorHandler} from '../src/middleware/errors.js';
const config = {CORS_ORIGINS: ['http://localhost:5173'], JWT_SECRET: 'test-only-secret-with-at-least-32-characters'};
test('liveness and readiness distinguish server availability from MongoDB availability', async () => {
    const app = createApp(config, async () => false);
    const live = await request(app).get('/api/health').expect(200);
    assert.equal(live.body.data.status, 'ok'); assert.ok(live.headers['x-request-id']);
    await request(app).get('/api/health/ready').expect(503);
    await request(createApp(config, async () => true)).get('/api/health/ready').expect(200);
    await request(createApp(config, async () => {throw new Error('private-details');})).get('/api/health/ready').expect(503);
});
test('CORS and security headers apply without exposing framework details', async () => {
    const app = createApp(config, async () => true);
    const response = await request(app).get('/api/health').set('Origin', config.CORS_ORIGINS[0]).expect(200);
    assert.equal(response.headers['access-control-allow-origin'], config.CORS_ORIGINS[0]);
    assert.equal(response.headers['x-content-type-options'], 'nosniff'); assert.equal(response.headers['x-powered-by'], undefined);
    await request(app).get('/api/health').set('Origin', 'https://untrusted.example').expect(403);
});
test('malformed JSON, large requests and unknown routes return structured errors', async () => {
    const app = createApp(config, async () => true);
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{').expect(400);
    assert.equal(bad.body.error.code, 'INVALID_JSON'); assert.ok(!JSON.stringify(bad.body).includes('stack'));
    await request(app).post('/api/auth/login').send({data: 'x'.repeat(110000)}).expect(413);
    const missing = await request(app).get('/api/missing').expect(404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
});
test('user endpoints reject missing/invalid JWT before accessing MongoDB', async () => {
    const app = createApp(config, async () => false);
    await request(app).get('/api/users').expect(401);
    await request(app).post('/api/users').send({role: 'ADMIN'}).expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401);
    await request(app).patch('/api/users/000000000000000000000001').expect(401);
});
test('supervisors cannot pass the Admin authorization boundary', async () => {
    const app = express();
    app.use((_req, res, next) => {res.locals.user = {role: 'SUPERVISOR'}; next();});
    app.get('/admin', requireAdmin, (_req, res) => {res.sendStatus(200);}); app.use(errorHandler);
    await request(app).get('/admin').expect(403);
});
