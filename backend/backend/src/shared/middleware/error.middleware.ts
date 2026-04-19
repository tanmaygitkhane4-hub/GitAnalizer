import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
    });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  });
}
