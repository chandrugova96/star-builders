import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv} from '../src/config/env.js';
const env = {MONGODB_URI: 'mongodb://127.0.0.1:27017/star_builders_test', JWT_SECRET: 'test-only-secret-with-at-least-32-characters'};
test('configuration validates ports, MongoDB and explicit frontend origins', () => {
    const config = parseEnv(env);
    assert.equal(config.PORT, 4000);
    assert.deepEqual(config.CORS_ORIGINS, ['http://localhost:5173']);
    for (const invalid of [{PORT: '0'}, {PORT: '65536'}, {MONGODB_URI: 'postgresql://host/db'}, {JWT_SECRET: 'short'}, {CORS_ORIGINS: '*'}, {CORS_ORIGINS: 'https://example.com/path'}]) assert.throws(() => parseEnv({...env, ...invalid}));
});
test('configuration errors omit secret values and MongoDB credentials', () => {
    assert.throws(() => parseEnv({...env, MONGODB_URI: 'bad-uri-containing-private-password'}), error => error instanceof Error && error.message.includes('MONGODB_URI') && !error.message.includes('private-password'));
});

test('deployment config uses Render origin and validates bounded proxy/static settings', () => {
    const rendered = parseEnv({...env, NODE_ENV:'production', HOST:'0.0.0.0', PORT:'10000', SERVE_FRONTEND:'true', TRUST_PROXY:'1', RENDER_EXTERNAL_URL:'https://star-builders-test.onrender.com'});
    assert.equal(rendered.HOST,'0.0.0.0');assert.equal(rendered.PORT,10000);
    assert.equal(rendered.SERVE_FRONTEND,true);assert.equal(rendered.TRUST_PROXY,1);
    assert.deepEqual(rendered.CORS_ORIGINS,['https://star-builders-test.onrender.com']);
    const explicit=parseEnv({...env, CORS_ORIGINS:'https://example.test', RENDER_EXTERNAL_URL:'https://other.test'});
    assert.deepEqual(explicit.CORS_ORIGINS,['https://example.test']);
    assert.equal(parseEnv(env).SERVE_FRONTEND,false);assert.equal(parseEnv(env).TRUST_PROXY,false);
    for (const invalid of [{TRUST_PROXY:'true'}, {TRUST_PROXY:'2'}, {SERVE_FRONTEND:'yes'}, {RENDER_EXTERNAL_URL:'https://example.test/path'}]) assert.throws(()=>parseEnv({...env,...invalid}));
});
