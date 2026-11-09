import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { createHash } from 'node:crypto';
import { Gate, Receipt, Audit } from './models.js';
import { HttpError } from '../lib/http-error.js';
export async function transaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    return mongoose.connection.transaction(async (session) => {
        // A single posting gate serializes business writes, including site assignments,
        // attendance, rate revisions, approvals and payments, across server processes.
        const gate = await Gate.updateOne({
            _id: 'posting'
        }, {
            $inc: {
                version: 1
            }
        }, {
            session
        });
        if (gate.matchedCount !== 1)
            throw new HttpError(503, 'DATABASE_NOT_READY', 'Business collections are not initialized. Restart the API.');
        return work(session);
    }, {
        readConcern: {
            level: "snapshot"
        }, writeConcern: {
            w: "majority"
        }, readPreference: "primary"
    });
}
export async function post<T>(kind: string, key: string, input: unknown, work: (session: ClientSession) => Promise<T>) {
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return transaction(async (session) => {
        const existing = await Receipt.findOne({
            key: kind + ':' + key
        }).session(session);
        if (existing) {
            if (existing.fingerprint !== fingerprint)
                throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was already used for different details.');
            return existing.result as T;
        }
        const result = await work(session);
        await Receipt.create([{
                key: kind + ':' + key, fingerprint, result
            }], {
            session
        });
        return result;
    });
}
export async function audit(session: ClientSession, actorId: string, action: string, entityId: string, details: unknown = {}) {
    await Audit.create([{
            actorId, action, entityId, details
        }], {
        session
    });
}
