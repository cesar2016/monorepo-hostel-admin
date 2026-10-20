import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError || (err && typeof err === 'object' && 'name' in err && err.name === 'ZodError')) {
    const zodErr = err as ZodError;
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados son inválidos',
        details: typeof zodErr.flatten === 'function' ? zodErr.flatten().fieldErrors : zodErr,
      },
    });
    return;
  }

  // 2. Errores operacionales controlados (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 3. Errores provenientes de PostgreSQL / Supabase
  if (err && typeof err === 'object' && 'code' in err) {
    const pgError = err as { code: string; message: string; hint?: string; details?: string };

    // Unique violation
    if (pgError.code === '23505') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: pgError.message || 'El registro ya existe o viola una regla de unicidad.',
          details: pgError.details,
        },
      });
      return;
    }

    // Insufficient privilege / RLS bloqueado
    if (pgError.code === '42501') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'No tiene permisos para acceder o modificar este recurso.',
        },
      });
      return;
    }

    // Excepciones lanzadas por nuestras funciones plpgsql (P0001)
    if (pgError.code === 'P0001') {
      res.status(400).json({
        error: {
          code: pgError.hint || 'BUSINESS_RULE_VIOLATION',
          message: pgError.message,
          details: pgError.details,
        },
      });
      return;
    }

    // No encontrado en funciones RPC (P0002)
    if (pgError.code === 'P0002') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: pgError.message || 'Recurso no encontrado.',
        },
      });
      return;
    }
  }

  // 4. Errores no controlados (500)
  logger.error(err, 'Unhandled error occurred');

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err instanceof Error ? err.message : 'Ocurrió un error interno en el servidor.',
      details: env.NODE_ENV !== 'production' ? (err instanceof Error ? err.stack : err) : undefined,
    },
  });
};
