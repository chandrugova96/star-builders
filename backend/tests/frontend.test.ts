import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import request from 'supertest';
import {createApp} from '../src/app.js';
const config={CORS_ORIGINS:['https://example.test'],JWT_SECRET:'test-only-secret-with-at-least-32-characters'};

test('combined deployment serves deep links/assets without swallowing API errors or exposing dotfiles',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'star-builders-static-'));
    try {
        const index='<!doctype html><html><body><div id="root">Star Builders test build</div></body></html>';
        await mkdir(join(directory,'assets'));
        await writeFile(join(directory,'index.html'),index);
        await writeFile(join(directory,'assets','app.js'),'console.log("test build");');
        await writeFile(join(directory,'.env'),'test-private-file-must-not-be-served');
        const app=createApp({...config,TRUST_PROXY:1},async()=>true,{frontendDirectory:directory});
        assert.equal(app.get('trust proxy'),1);
        for (const path of ['/', '/login', '/weekly-payroll','/settings','/unknown-client-route']) {
            const result=await request(app).get(path).set('Accept','text/html').expect(200);
            assert.equal(result.text,index);assert.match(result.headers['content-type'],/text\/html/);
            assert.ok(result.headers['content-security-policy']);
        }
        await request(app).get('/assets/app.js').expect(200);
        for (const path of ['/api/missing','/api','/assets/missing.js','/assets/missing','/.env','/backend/.env','/backend/package.json']) {
            const result=await request(app).get(path).set('Accept','text/html').expect(404);
            assert.equal(result.body.error.code,'NOT_FOUND');assert.ok(!result.text.includes('Star Builders test build'));assert.ok(!result.text.includes('test-private-file'));
        }
        await request(app).post('/weekly-payroll').expect(404);
        const protectedAPI=await request(app).get('/api/users').expect(401);
        assert.equal(protectedAPI.headers['cache-control'],'no-store');
        await request(app).get('/api/health/ready').expect(200);
        // Render's canonical origin is accepted; unrelated browser origins are rejected.
        await request(app).post('/api/auth/login').set('Origin',config.CORS_ORIGINS[0]).send({}).expect(400);
        await request(app).get('/api/health').set('Origin','https://untrusted.test').expect(403);
        assert.throws(()=>createApp(config,async()=>true,{frontendDirectory:join(directory,'missing-build')}),/Frontend build missing/);
        await request(createApp(config,async()=>true)).get('/login').expect(404);
    } finally {await rm(directory,{recursive:true,force:true});}
});

test('trusted ingress keeps login throttling separate per client IP',async()=>{
    const app=createApp({...config,TRUST_PROXY:1},async()=>false);
    for (let attempt=0;attempt<10;attempt++) await request(app).post('/api/auth/login').set('X-Forwarded-For','198.51.100.10').send({}).expect(400);
    await request(app).post('/api/auth/login').set('X-Forwarded-For','198.51.100.10').send({}).expect(429);
    await request(app).post('/api/auth/login').set('X-Forwarded-For','192.0.2.99, 198.51.100.10').send({}).expect(429);
    await request(app).post('/api/auth/login').set('X-Forwarded-For','198.51.100.11').send({}).expect(400);
});
