import type {ErrorRequestHandler} from 'express';
import {ZodError} from 'zod';
import {HttpError} from '../lib/http-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) {next(error); return;}
    let status = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred.';
    if (error instanceof HttpError) {status = error.status; code = error.code; message = error.message;}
    else if (error instanceof ZodError) {status = 400; code = 'VALIDATION_ERROR'; message = 'Check the submitted fields.';}
    else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') {status = 400; code = 'INVALID_JSON'; message = 'Request body must contain valid JSON.';}
    else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large.';}
    else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {status = 409; code = 'DUPLICATE_RECORD'; message = 'A record with this identifier already exists.';}
    if(typeof error==='object'&&error!==null&&'code' in error&&error.code===20){status=503;code='TRANSACTIONS_REQUIRED';message='MongoDB replica set transactions are required for business posting.';}
    response.status(status).json({error: {code, message, requestId: response.locals.requestId}});
};
