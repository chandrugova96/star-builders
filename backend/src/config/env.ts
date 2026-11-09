import {z} from 'zod';

const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    SERVE_FRONTEND: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
    TRUST_PROXY: z.enum(['0', '1']).default('0').transform(value => value === '1' ? 1 as const : false),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGINS: z.string().default('http://localhost:5173').transform(value => value.split(',').map(origin => origin.trim())).pipe(z.array(z.url().refine(value => {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    })).min(1)),
});

export type Config = z.infer<typeof schema>;
export function parseEnv(env: NodeJS.ProcessEnv): Config {
    // Render supplies its canonical HTTPS origin. Explicit origins still take precedence.
    const result = schema.safeParse({...env, CORS_ORIGINS: env.CORS_ORIGINS ?? env.RENDER_EXTERNAL_URL});
    if (!result.success) {
        // Never include env values: a MongoDB URI may contain credentials.
        throw new Error('Invalid backend configuration: ' + [...new Set(result.error.issues.map(issue => issue.path.join('.')))].join(', '));
    }
    return result.data;
}
