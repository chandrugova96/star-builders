import {test} from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {hashPassword, verifyPassword} from '../src/features/auth/password.js';
import {issueToken, tokenSubject, ACCESS_TOKEN_TTL_SECONDS} from '../src/features/auth/tokens.js';
import {createUserSchema, loginSchema, updateUserSchema} from '../src/features/users/user.validation.js';
const secret = 'test-only-secret-with-at-least-32-characters';
test('password hashes are salted, verified safely and never plaintext', async () => {
    const password = 'test-password-only';
    const first = await hashPassword(password), second = await hashPassword(password);
    assert.notEqual(first, second); assert.ok(!first.includes(password));
    assert.equal(await verifyPassword(password, first), true);
    assert.equal(await verifyPassword('incorrect', first), false);
    assert.equal(await verifyPassword(password, 'invalid'), false);
});
test('JWT verification restricts signature, expiration, audience and issuer', () => {
    const id = '000000000000000000000001';
    assert.equal(tokenSubject(issueToken(id, secret), secret), id);
    assert.throws(() => tokenSubject(issueToken(id, secret), secret + 'wrong'));
    const expired = jwt.sign({}, secret, {subject: id, expiresIn: -1, issuer: 'star-builders-api', audience: 'star-builders-ui'});
    assert.throws(() => tokenSubject(expired, secret));
    assert.throws(() => tokenSubject(jwt.sign({}, secret, {subject: id, audience: 'wrong'}), secret));
});
test('login uses digit strings and user creation rejects role injection and weak passwords', () => {
    assert.equal(loginSchema.parse({phone: '0012345678', password: 'test-password'}).phone, '0012345678');
    const user = {name: 'Test User', phone: '0012345678', password: 'test-password-only', role: 'SUPERVISOR'};
    assert.equal(createUserSchema.safeParse(user).success, true);
    for (const patch of [{phone: 'abc'}, {role: 'OWNER'}, {password: 'short'}, {passwordHash: 'injected'}]) assert.equal(createUserSchema.safeParse({...user, ...patch}).success, false);
    assert.equal(updateUserSchema.safeParse({passwordHash: 'injected'}).success, false);
    assert.equal(updateUserSchema.safeParse({active: false}).success, false);
    assert.equal(updateUserSchema.safeParse({}).success, false);
});

test('new login tokens last exactly one day', () => {
    const token = issueToken('000000000000000000000001', secret);
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    assert.equal(ACCESS_TOKEN_TTL_SECONDS, 86400);
    assert.equal(payload.exp! - payload.iat!, 86400);
});
