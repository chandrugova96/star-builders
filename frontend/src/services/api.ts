export class ApiError extends Error {
    constructor(public status: number, message: string) {super(message);}
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, {once: true});
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 15000);
    try {
        const headers = new Headers(options.headers);
        if (options.body) headers.set('Content-Type', 'application/json');
        if (token) headers.set('Authorization', `Bearer ${token}`);
        const response = await fetch(`/api${path}`, {...options, headers, signal: controller.signal});
        if(response.ok&&response.headers.get('Content-Type')?.includes('text/csv'))return {content:await response.text()} as T;
        let body;
        try {body = await response.json();} catch {throw new ApiError(response.status, 'The server returned an invalid response. Try again.');}
        if (!response.ok) throw new ApiError(response.status, body.error?.message || 'The request could not be completed.');
        return body as T;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (options.signal?.aborted) throw error;
        throw new ApiError(0, controller.signal.aborted ? 'The request timed out. Try again.' : 'Unable to connect to the server. Please try again.');
    } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
    }
}
