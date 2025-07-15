import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Extender Request para incluir user
export interface AuthenticatedRequest extends Request {
  user?: {
	id: string;
	email: string;
	role: UserRole;
	firstName: string;
	lastName: string;
  };
}

// JWT Secret desde variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'estetica_jwt_secret_key_2025_cordoba';

/**
 * Middleware principal de autenticación
 * Verifica el token JWT y carga los datos del usuario
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
	// Obtener token del header Authorization
	const authHeader = req.headers.authorization;
    
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
  	res.status(401).json({
    	error: 'Token de acceso requerido',
    	code: 'AUTH_TOKEN_MISSING'
  	});
  	return;
	}

	const token = authHeader.substring(7); // Remover 'Bearer '

	// Verificar y decodificar token
	const decoded = jwt.verify(token, JWT_SECRET) as any;

	// Buscar usuario en la base de datos
	const user = await prisma.user.findUnique({
  	where: { id: decoded.userId },
  	select: {
    	id: true,
    	email: true,
    	firstName: true,
    	lastName: true,
    	role: true,
    	isActive: true
  	}
	});

	if (!user) {
  	res.status(401).json({
    	error: 'Usuario no encontrado',
    	code: 'AUTH_USER_NOT_FOUND'
  	});
  	return;
	}

	if (!user.isActive) {
  	res.status(401).json({
    	error: 'Usuario inactivo',
    	code: 'AUTH_USER_INACTIVE'
  	});
  	return;
	}

	// Agregar datos del usuario al request
	req.user = user;
	next();

  } catch (error) {
	if (error instanceof jwt.JsonWebTokenError) {
  	res.status(401).json({
    	error: 'Token inválido',
    	code: 'AUTH_TOKEN_INVALID'
  	});
	} else if (error instanceof jwt.TokenExpiredError) {
  	res.status(401).json({
    	error: 'Token expirado',
    	code: 'AUTH_TOKEN_EXPIRED'
  	});
	} else {
  	console.error('Error en autenticación:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_INTERNAL_ERROR'
  	});
	}
  }
};

/**
 * Middleware para verificar roles específicos
 * @param allowedRoles - Array de roles permitidos
 */
export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
	if (!req.user) {
  	res.status(401).json({
    	error: 'Usuario no autenticado',
    	code: 'AUTH_USER_REQUIRED'
  	});
  	return;
	}

	if (!allowedRoles.includes(req.user.role)) {
  	res.status(403).json({
    	error: 'No tienes permisos para acceder a este recurso',
    	code: 'AUTH_INSUFFICIENT_PERMISSIONS',
    	requiredRoles: allowedRoles,
    	userRole: req.user.role
  	});
  	return;
	}

	next();
  };
};

/**
 * Middleware específico para ADMIN
 */
export const adminOnly = roleMiddleware([UserRole.ADMIN]);

/**
 * Middleware específico para ADMIN y MEDICO
 */
export const adminOrMedico = roleMiddleware([UserRole.ADMIN, UserRole.MEDICO]);

/**
 * Middleware específico para ADMIN, MEDICO y SECRETARIA
 */
export const adminMedicoSecretaria = roleMiddleware([
  UserRole.ADMIN,
  UserRole.MEDICO,
  UserRole.SECRETARIA
]);

/**
 * Middleware para permitir todos los roles autenticados
 */
export const allRoles = roleMiddleware([
  UserRole.ADMIN,
  UserRole.MEDICO,
  UserRole.SECRETARIA,
  UserRole.VIEWER
]);

/**
 * Utilidad para generar tokens JWT
 * @param userId - ID del usuario
 * @param expiresIn - Tiempo de expiración (default: 24h)
 */
export const generateToken = (userId: string, expiresIn = '24h'): string => {
  return jwt.sign(
	{ userId },
	JWT_SECRET,
	{ expiresIn }
  );
};

/**
 * Utilidad para verificar si un usuario tiene un rol específico
 * @param userRole - Rol del usuario
 * @param requiredRole - Rol requerido
 */
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  // ADMIN tiene acceso a todo
  if (userRole === UserRole.ADMIN) return true;
 
  // Verificación exacta para otros roles
  return userRole === requiredRole;
};

/**
 * Utilidad para verificar permisos granulares por módulo
 */
export const checkModulePermission = (
  userRole: UserRole,
  module: string,
  action: 'read' | 'write' | 'delete'
): boolean => {
  // Matriz de permisos por módulo
  const permissions: Record<string, Record<UserRole, string[]>> = {
	users: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: [],
  	[UserRole.SECRETARIA]: [],
  	[UserRole.VIEWER]: []
	},
	patients: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: ['read', 'write'],
  	[UserRole.SECRETARIA]: ['read', 'write'],
  	[UserRole.VIEWER]: ['read']
	},
	appointments: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: ['read', 'write'],
  	[UserRole.SECRETARIA]: ['read', 'write'],
  	[UserRole.VIEWER]: ['read']
	},
	treatments: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: ['read', 'write'],
  	[UserRole.SECRETARIA]: ['read'],
  	[UserRole.VIEWER]: ['read']
	},
	inventory: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: ['read'],
  	[UserRole.SECRETARIA]: ['read', 'write'],
  	[UserRole.VIEWER]: ['read']
	},
	invoices: {
  	[UserRole.ADMIN]: ['read', 'write', 'delete'],
  	[UserRole.MEDICO]: [],
  	[UserRole.SECRETARIA]: ['read', 'write'],
  	[UserRole.VIEWER]: ['read']
	},
	reports: {
  	[UserRole.ADMIN]: ['read'],
  	[UserRole.MEDICO]: ['read'],
  	[UserRole.SECRETARIA]: ['read'],
  	[UserRole.VIEWER]: ['read']
	}
  };

  const modulePermissions = permissions[module];
  if (!modulePermissions) return false;

  const userPermissions = modulePermissions[userRole];
  return userPermissions.includes(action);
};

export default {
  authMiddleware,
  roleMiddleware,
  adminOnly,
  adminOrMedico,
  adminMedicoSecretaria,
  allRoles,
  generateToken,
  hasRole,
  checkModulePermission
};
