import {config as loadEnv} from 'dotenv';
import {createApp} from './app.js';
import {parseEnv} from './config/env.js';
import {connectDatabase, databaseReady, disconnectDatabase} from './database/connection.js';
import {initializeBusiness} from './domain/models.js';
import {frontendBuildDirectory} from './lib/frontend.js';
import {User} from './features/users/user.model.js';

loadEnv({quiet: true});
async function main() {
    const config = parseEnv(process.env);
    await connectDatabase(config.MONGODB_URI, config.NODE_ENV === 'production');
    // The unique phone index is a real constraint, not a pre-insert existence check.
    await User.createIndexes();
    await initializeBusiness();
    const app = createApp(config, databaseReady, {frontendDirectory: config.SERVE_FRONTEND ? frontendBuildDirectory : undefined});
    const server = app.listen(config.PORT, config.HOST);
    await new Promise<void>((resolve, reject) => {server.once('listening', resolve); server.once('error', reject);});
    console.info(`Star Builders API listening on port ${config.PORT}`);
    let stopping = false;
    function shutdown() {
        if (stopping) return;
        stopping = true;
        const timer = setTimeout(() => {server.closeAllConnections(); void disconnectDatabase().finally(() => process.exit(1));}, 10000);
        timer.unref();
        server.close(() => {void disconnectDatabase().then(() => {clearTimeout(timer); process.exitCode = 0;}).catch(() => {process.exitCode = 1;});});
    }
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
}
main().catch(async () => {
    console.error('Backend startup failed. Check environment configuration, MongoDB availability and frontend build output.');
    await disconnectDatabase().catch(() => undefined);
    process.exitCode = 1;
});
