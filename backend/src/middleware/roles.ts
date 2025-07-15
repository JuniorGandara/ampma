import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
	interface Request {
  	user?: {
    	id: string;
    	email: string;
    	role: UserRole;
    	firstName: string;
    	lastName: string;
  	};
	}
  }
}

// Definir permisos por rol
const ROLE_PERMISSIONS = {
  ADMIN: {
	patients: { read: true, write: true, delete: true },
	users: { read: true, write: true, delete: true },
	appointments: { read: true, write: true, delete: true },
	treatments: { read: true, write: true, delete: true },
	products: { read: true, write: true, delete: true },
	suppliers: { read: true, write: true, delete: true },
	invoices: { read: true, write: true, delete: true },
	reports: { read: true, write: false, delete: false },
	medicalRecords: { read: true, write: true, delete: true }
  },
  MEDICO: {
	patients: { read: true, write: true, delete: false },
	users: { read: false, write: false, delete: false },
	appointments: { read: true, write: true, delete: false },
	treatments: { read: true, write: true, delete: false },
	products: { read: true, write: false, delete: false },
	suppliers: { read: false, write: false, delete: false },
	invoices: { read: false, write: false, delete: false },
	reports: { read: true, write: false, delete: false },
	medicalRecords: { read: true, write: true, delete: false }
  },
  SECRETARIA: {
	patients: { read: true, write: true, delete: false },
	users: { read: false, write: false, delete: false },
	appointments: { read: true, write: true, delete: false },
	treatments: { read: true, write: false, delete: false },
	products: { read: true, write: true, delete: false },
	suppliers: { read: true, write: true, delete: false },
	invoices: { read: true, write: true, delete: false },
	reports: { read: true, write: false, delete: false },
	medicalRecords: { read: true, write: false, delete: false }
  },
  VIEWER: {
	patients: { read: true, write: false, delete: false },
	users: { read: false, write: false, delete: false },
	appointments: { read: true, write: false, delete: false },
	treatments: { read: true, write: false, delete: false },
	products: { read: true, write: false, delete: false },
	suppliers: { read: true, write: false, delete: false },
	invoices: { read: true, write: false, delete: false },
	reports: { read: true, write: false, delete: false },
	medicalRecords: { read: true, write: false, delete: false }
  }
};

// Middleware para verificar roles específicos
export const roleMiddleware = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
	if (!req.user) {
  	return res.status(401).json({
    	error: 'Usuario no autenticado'
  	});
	}

	if (!allowedRoles.includes(req.user.role)) {
  	return res.status(403).json({
    	error: 'No tienes permisos para realizar esta acción',
    	requiredRoles: allowedRoles,
    	userRole: req.user.role
  	});
	}

	next();
  };
};

// Middleware para verificar permisos específicos
export const permissionMiddleware = (
  resource: keyof typeof ROLE_PERMISSIONS.ADMIN,
  action: 'read' | 'write' | 'delete'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
	if (!req.user) {
  	return res.status(401).json({
    	error: 'Usuario no autenticado'
  	});
	}

	const userPermissions = ROLE_PERMISSIONS[req.user.role];
	const resourcePermissions = userPermissions[resource];

	if (!resourcePermissions || !resourcePermissions[action]) {
  	return res.status(403).json({
    	error: `No tienes permisos de ${action} para ${resource}`,
    	userRole: req.user.role,
    	requiredPermission: `${resource}:${action}`
  	});
	}

	next();
  };
};

// Middleware para verificar si el usuario es dueño del recurso o tiene permisos administrativos
export const ownershipMiddleware = (
  getOwnerId: (req: Request) => string | Promise<string>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
	if (!req.user) {
  	return res.status(401).json({
    	error: 'Usuario no autenticado'
  	});
	}

	// Los admins pueden acceder a todo
	if (req.user.role === 'ADMIN') {
  	return next();
	}

	try {
  	const ownerId = await getOwnerId(req);
 	 
  	if (req.user.id !== ownerId) {
    	return res.status(403).json({
      	error: 'Solo puedes acceder a tus propios recursos'
    	});
  	}

  	next();
	} catch (error) {
  	return res.status(500).json({
    	error: 'Error verificando permisos de acceso'
  	});
	}
  };
};

// Función helper para verificar permisos programáticamente
export const hasPermission = (
  userRole: UserRole,
  resource: keyof typeof ROLE_PERMISSIONS.ADMIN,
  action: 'read' | 'write' | 'delete'
): boolean => {
  const userPermissions = ROLE_PERMISSIONS[userRole];
  const resourcePermissions = userPermissions[resource];
 
  return resourcePermissions && resourcePermissions[action];
};

// Función helper para obtener todos los permisos de un rol
export const getRolePermissions = (role: UserRole) => {
  return ROLE_PERMISSIONS[role];
};

// Middleware para logging de acciones por rol
export const auditMiddleware = (
  action: string,
  resource: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
	if (req.user) {
  	console.log(`[AUDIT] ${new Date().toISOString()} - Usuario: ${req.user.email} (${req.user.role}) - Acción: ${action} en ${resource}`);
	}
	next();
  };
};

// Middleware específico para historiales médicos (solo médicos y admin)
export const medicalRecordPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
	return res.status(401).json({
  	error: 'Usuario no autenticado'
	});
  }

  if (!['ADMIN', 'MEDICO'].includes(req.user.role)) {
	return res.status(403).json({
  	error: 'Solo los médicos pueden gestionar historiales médicos',
  	userRole: req.user.role
	});
  }

  next();
};

// Middleware para operaciones financieras (facturas, pagos)
export const financialPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
	return res.status(401).json({
  	error: 'Usuario no autenticado'
	});
  }

  if (!['ADMIN', 'SECRETARIA'].includes(req.user.role)) {
	return res.status(403).json({
  	error: 'Solo administradores y secretarias pueden gestionar aspectos financieros',
  	userRole: req.user.role
	});
  }

  next();
};

// Middleware para gestión de usuarios (solo admin)
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
	return res.status(401).json({
  	error: 'Usuario no autenticado'
	});
  }

  if (req.user.role !== 'ADMIN') {
	return res.status(403).json({
  	error: 'Solo los administradores pueden realizar esta acción',
  	userRole: req.user.role
	});
  }

  next();
};

// Middleware para reportes avanzados
export const reportPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
	return res.status(401).json({
  	error: 'Usuario no autenticado'
	});
  }

  // Todos los roles autenticados pueden ver reportes básicos
  // Solo admin y médicos pueden ver reportes médicos detallados
  const { reportType } = req.params || req.query;
 
  if (reportType === 'medical' && !['ADMIN', 'MEDICO'].includes(req.user.role)) {
	return res.status(403).json({
  	error: 'Solo médicos y administradores pueden acceder a reportes médicos',
  	userRole: req.user.role
	});
  }

  next();
};

// Función para filtrar datos según permisos del usuario
export const filterDataByRole = (data: any, userRole: UserRole, dataType: string) => {
  switch (userRole) {
	case 'VIEWER':
  	// Los viewers no pueden ver información sensible
  	if (dataType === 'patient') {
    	const { medicalNotes, allergies, medications, ...publicData } = data;
    	return publicData;
  	}
  	break;
    
	case 'SECRETARIA':
  	// Las secretarias pueden ver todo excepto notas médicas privadas
  	if (dataType === 'medicalRecord') {
    	const { privateNotes, ...publicData } = data;
    	return publicData;
  	}
  	break;
    
	case 'MEDICO':
	case 'ADMIN':
  	// Acceso completo
  	return data;
    
	default:
  	return data;
  }
 
  return data;
};
