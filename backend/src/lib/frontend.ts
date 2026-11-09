import express from 'express';
import type {Express} from 'express';
import {existsSync} from 'node:fs';
import {extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const frontendBuildDirectory = fileURLToPath(new URL('../../../frontend/dist/', import.meta.url));

// Serve only the public build, never the repository or backend configuration.
export function mountFrontend(app: Express, directory: string) {
    const index = resolve(directory, 'index.html');
    if (!existsSync(index)) throw new Error('Frontend build missing. Run npm run build before starting the combined server.');
    app.use(express.static(directory, {index: false, dotfiles: 'ignore', redirect: false}));
    app.get('/{*path}', (request, response, next) => {
        const path = request.path;
        if (!request.accepts('html') || extname(path) || path.startsWith('/assets/') || path.split('/').some(part => part.startsWith('.'))) {
            next(); return;
        }
        response.sendFile(index);
    });
}
