import {z} from 'zod';
export const phoneSchema = z.string().trim().min(1).max(32).regex(/^\d+$/);
export const passwordSchema = z.string().min(12).max(128);
const fields = {
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    email: z.union([z.email().max(254), z.literal('')]).optional(),
    role: z.enum(['ADMIN', 'SUPERVISOR']),
};
export const createUserSchema = z.strictObject({...fields, password: passwordSchema});
export const updateUserSchema = z.strictObject(fields).partial().refine(body => Object.keys(body).length > 0);
export const loginSchema = z.strictObject({phone: phoneSchema, password: z.string().min(1).max(128)});

export const listUsersSchema = z.strictObject({page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(25)});
