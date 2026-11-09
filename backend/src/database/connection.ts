import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);
export async function connectDatabase(uri: string, production: boolean) {
    await mongoose.connect(uri, {serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 5000, autoIndex: !production, autoCreate: !production});
}
export async function databaseReady() {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
    try {await mongoose.connection.db.admin().ping(); return true;} catch {return false;}
}
export async function disconnectDatabase() {await mongoose.disconnect();}
