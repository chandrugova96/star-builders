import {model, Schema} from 'mongoose';

const userSchema = new Schema({
    name: {type: String, required: true, trim: true, maxlength: 120},
    phone: {type: String, required: true, trim: true, match: /^\d+$/, maxlength: 32},
    email: {type: String, trim: true, lowercase: true, maxlength: 254},
    passwordHash: {type: String, required: true, select: false},
    role: {type: String, enum: ['ADMIN', 'SUPERVISOR'], required: true},
    active: {type: Boolean, default: true, required: true},
}, {timestamps: true, strict: 'throw'});
userSchema.index({phone: 1}, {unique: true});
export const User = model('User', userSchema);
export type UserView = {id: string; name: string; phone: string; email: string; role: 'ADMIN' | 'SUPERVISOR'; active: boolean};
export function publicUser(user: InstanceType<typeof User>): UserView {
    return {id: user.id as string, name: user.name, phone: user.phone, email: user.email || '', role: user.role, active: user.active};
}
