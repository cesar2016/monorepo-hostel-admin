export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado o sesión expirada', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tiene permisos para realizar esta acción', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: unknown) {
    super(message, 409, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos de entrada inválidos', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}
