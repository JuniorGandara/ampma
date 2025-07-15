import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Interfaz para errores personalizados
 */
interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Middleware principal de manejo de errores
 * Debe ser el último middleware en la cadena
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log del error para debugging
  console.error('Error capturado:', {
	message: error.message,
	stack: error.stack,
	url: req.url,
	method: req.method,
	body: req.body,
	params: req.params,
	query: req.query,
	timestamp: new Date().toISOString()
  });

  // Manejo específico de errores de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
	handlePrismaError(error, res);
	return;
  }

  // Manejo específico de errores de validación de Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
	res.status(400).json({
  	error: 'Error de validación en la base de datos',
  	code: 'DATABASE_VALIDATION_ERROR',
  	message: 'Los datos proporcionados no cumplen con las restricciones de la base de datos'
	});
	return;
  }

  // Manejo de errores de conexión a la base de datos
  if (error instanceof Prisma.PrismaClientInitializationError) {
	res.status(503).json({
  	error: 'Error de conexión a la base de datos',
  	code: 'DATABASE_CONNECTION_ERROR',
  	message: 'No se pudo establecer conexión con la base de datos'
	});
	return;
  }

  // Manejo de errores de sintaxis JSON
  if (error instanceof SyntaxError && 'body' in error) {
	res.status(400).json({
  	error: 'JSON malformado',
  	code: 'INVALID_JSON',
  	message: 'El cuerpo de la petición contiene JSON inválido'
	});
	return;
  }

  // Manejo de errores JWT (si no fueron manejados en el middleware de auth)
  if (error.name === 'JsonWebTokenError') {
	res.status(401).json({
  	error: 'Token JWT inválido',
  	code: 'INVALID_JWT_TOKEN'
	});
	return;
  }

  if (error.name === 'TokenExpiredError') {
	res.status(401).json({
  	error: 'Token JWT expirado',
  	code: 'EXPIRED_JWT_TOKEN'
	});
	return;
  }

  // Errores personalizados de la aplicación
  if (error.statusCode) {
	res.status(error.statusCode).json({
  	error: error.message,
  	code: error.code || 'CUSTOM_ERROR',
  	details: error.details
	});
	return;
  }

  // Error genérico del servidor
  res.status(500).json({
	error: 'Error interno del servidor',
	code: 'INTERNAL_SERVER_ERROR',
	message: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error inesperado'
  });
};

/**
 * Manejo específico de errores de Prisma
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError, res: Response): void => {
  switch (error.code) {
	case 'P2002':
  	// Violación de restricción única
  	const target = error.meta?.target as string[] || ['campo'];
  	res.status(409).json({
    	error: `Ya existe un registro con el mismo ${target.join(', ')}`,
    	code: 'DUPLICATE_ENTRY',
    	field: target[0]
  	});
  	break;

	case 'P2014':
  	// Violación de relación requerida
  	res.status(400).json({
    	error: 'La operación violaría una relación requerida',
    	code: 'RELATION_CONSTRAINT_VIOLATION'
  	});
  	break;

	case 'P2003':
  	// Violación de clave foránea
  	res.status(400).json({
    	error: 'La operación violaría una restricción de clave foránea',
    	code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
    	field: error.meta?.field_name
  	});
  	break;

	case 'P2025':
  	// Registro no encontrado
  	res.status(404).json({
    	error: 'El registro solicitado no fue encontrado',
    	code: 'RECORD_NOT_FOUND'
  	});
  	break;

	case 'P2021':
  	// Tabla no existe
  	res.status(500).json({
    	error: 'Error de configuración de base de datos',
    	code: 'TABLE_NOT_EXISTS'
  	});
  	break;

	case 'P2022':
  	// Columna no existe
  	res.status(500).json({
    	error: 'Error de configuración de base de datos',
    	code: 'COLUMN_NOT_EXISTS'
  	});
  	break;

	default:
  	// Error de Prisma no específico
  	res.status(500).json({
    	error: 'Error de base de datos',
    	code: 'DATABASE_ERROR',
    	prismaCode: error.code
  	});
  }
};

/**
 * Middleware para manejo de rutas no encontradas (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
	error: 'Ruta no encontrada',
	code: 'ROUTE_NOT_FOUND',
	path: req.originalUrl,
	method: req.method
  });
};

/**
 * Clase para errores personalizados de la aplicación
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'APP_ERROR', details?: any) {
	super(message);
	this.statusCode = statusCode;
	this.code = code;
	this.details = details;
	this.name = 'AppError';

	// Mantener stack trace
	Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errores específicos de la aplicación
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
	super(message, 400, 'VALIDATION_ERROR', details);
	this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autorizado') {
	super(message, 401, 'AUTHENTICATION_ERROR');
	this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permisos insuficientes') {
	super(message, 403, 'AUTHORIZATION_ERROR');
	this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
	super(`${resource} no encontrado`, 404, 'NOT_FOUND_ERROR');
	this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
	super(message, 409, 'CONFLICT_ERROR', details);
	this.name = 'ConflictError';
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
	super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
	this.name = 'BusinessLogicError';
  }
}

/**
 * Wrapper para funciones async que captura errores automáticamente
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
	Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de logging de errores (opcional)
 */
export const errorLogger = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Aquí podrías enviar errores a un servicio de logging como Sentry, LogRocket, etc.
 
  // Log básico a consola
  const logData = {
	timestamp: new Date().toISOString(),
	level: 'ERROR',
	message: error.message,
	statusCode: error.statusCode || 500,
	code: error.code || 'UNKNOWN_ERROR',
	url: req.originalUrl,
	method: req.method,
	userAgent: req.get('User-Agent'),
	ip: req.ip,
	userId: (req as any).user?.id,
	stack: error.stack
  };

  console.error('Error Log:', JSON.stringify(logData, null, 2));

  // Continuar con el siguiente middleware de error
  next(error);
};

export default {
  errorHandler,
  notFoundHandler,
  errorLogger,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  asyncHandler
};
