import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
export const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const d = new Date(value + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
});
export const idValue = z.string().regex(/^[a-f0-9]{24}$/i).transform(value => value.toLowerCase());
export const decimalValue = z.string().min(1).max(32).regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/);
export const moneyValue = z.string().min(1).max(20).regex(/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/);
export function safe(value: bigint) {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
        throw new HttpError(400, 'MONEY_RANGE', 'Amount exceeds the supported monetary range.');
    return Number(value);
}
export function paise(value: string) {
    const [whole, fraction = ''] = value.split('.');
    return safe(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
}
export function rupees(value: number) {
    const raw = BigInt(value), n = raw < 0n ? -raw : raw;
    return `${raw < 0n ? '-' : ''}${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
}
export function round(n: bigint, d: bigint) {
    return safe((n + d / 2n) / d);
}
export function entryEarnings(rate: number, halves: number, ot: string) {
    const [whole, fraction = ''] = ot.split('.');
    const scale = 10n ** BigInt(fraction.length);
    const hours = BigInt(whole) * scale + BigInt(fraction || '0');
    return safe(BigInt(round(BigInt(rate) * BigInt(halves), 2n)) + BigInt(round(BigInt(rate) * hours, 8n * scale)));
}
export function shift(day: string, count: number) {
    const date = new Date(day + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
}
export function monday(day: string) {
    return shift(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7));
}
export const sunday = (week: string) => shift(week, 6);
export const today = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
export const weekValue = dateValue.refine(value => monday(value) === value);
export function add(...values: number[]) {
    return safe(values.reduce((sum, value) => sum + BigInt(value), 0n));
}

export function signed(value: bigint) {
    if (value < -BigInt(Number.MAX_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new HttpError(400, 'MONEY_RANGE', 'Amount exceeds the supported monetary range.');
    return Number(value);
}
export const signedAdd = (...values: number[]) => signed(values.reduce((sum, value) => sum + BigInt(value), 0n));
