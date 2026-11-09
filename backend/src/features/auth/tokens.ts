import jwt from 'jsonwebtoken';
export const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const issuer = 'star-builders-api', audience = 'star-builders-ui';
export function issueToken(userId: string, secret: string) {
    return jwt.sign({}, secret, {algorithm: 'HS256', subject: userId, issuer, audience, expiresIn: ACCESS_TOKEN_TTL_SECONDS});
}
export function tokenSubject(token: string, secret: string) {
    const payload = jwt.verify(token, secret, {algorithms: ['HS256'], issuer, audience});
    if (typeof payload === 'string' || !payload.sub || !/^[a-f0-9]{24}$/i.test(payload.sub)) throw new Error('Invalid subject');
    return payload.sub;
}
