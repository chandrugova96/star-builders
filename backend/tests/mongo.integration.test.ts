import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {User} from '../src/features/users/user.model.js';
import {hashPassword} from '../src/features/auth/password.js';

const uri = process.env.STAR_BUILDERS_TEST_MONGODB_URI;
test('real MongoDB: login, unique phones, user privacy and live role authorization', {skip: !uri}, async () => {
    // Never use the URI's database: all writes and cleanup use a new isolated database.
    const dbName = `star_builders_test_${process.pid}_${Date.now()}`;
    await mongoose.connect(uri!, {dbName, serverSelectionTimeoutMS: 3000});
    try {
        await User.createIndexes();
        const password = 'integration-test-password';
        const admin = await User.create({name: 'Test Admin', phone: '0000000001', role: 'ADMIN', passwordHash: await hashPassword(password)});
        const app = createApp({CORS_ORIGINS: ['http://localhost:5173'], JWT_SECRET: 'integration-tests-only-32-character-secret'}, async () => true);
        const login = await request(app).post('/api/auth/login').send({phone: admin.phone, password}).expect(200);
        assert.equal(login.body.data.user.role, 'ADMIN');
        assert.equal(login.body.data.user.passwordHash, undefined);
        const auth = `Bearer ${login.body.data.accessToken}`;
        await request(app).post('/api/auth/login').send({phone: admin.phone, password: 'incorrect'}).expect(401);
        await request(app).get('/api/auth/me').set('Authorization', auth).expect(200);
        const details = {name: 'Test Supervisor', phone: '0000000002', role: 'SUPERVISOR', password};
        const created = await request(app).post('/api/users').set('Authorization', auth).send(details).expect(201);
        assert.equal(created.body.data.passwordHash, undefined);
        await request(app).post('/api/users').set('Authorization', auth).send(details).expect(409);
        const listed = await request(app).get('/api/users?limit=1&page=2').set('Authorization', auth).expect(200);
        assert.equal(listed.body.data.length, 1);assert.equal(listed.body.pagination.total, 2);
        assert.ok(!JSON.stringify(listed.body).includes('passwordHash'));
        await request(app).get('/api/users?limit=5000').set('Authorization', auth).expect(400);
        const supervisor = await request(app).post('/api/auth/login').send({phone: details.phone, password}).expect(200);
        await request(app).get('/api/users').set('Authorization', `Bearer ${supervisor.body.data.accessToken}`).expect(403);
        await request(app).patch(`/api/users/${admin.id}`).set('Authorization', auth).send({role: 'SUPERVISOR'}).expect(409);
        await request(app).patch(`/api/users/${created.body.data.id}`).set('Authorization', auth).send({name: 'Updated Supervisor'}).expect(200);
        // A previously issued Admin token cannot retain privileges after a DB role change.
        await User.updateOne({_id: admin._id}, {$set: {role: 'SUPERVISOR'}});
        await request(app).get('/api/users').set('Authorization', auth).expect(403);
        await User.updateOne({_id: admin._id}, {$set: {active: false}});
        await request(app).get('/api/auth/me').set('Authorization', auth).expect(401);
    } finally {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
});
