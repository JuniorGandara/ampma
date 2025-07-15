import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { userValidation, validateRequest } from '../utils/validation';

const prisma = new PrismaClient();

/**
 * Controlador de Usuarios
 * Maneja CRUD completo de usuarios del sistema
 */
export class UsersController {

  /**
   * GET ALL USERS - Obtener todos los usuarios
   * GET /api/users
   */
  static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	// Validar parámetros de consulta
  	const { error, value } = userValidation.queryParams.validate(req.query);
  	if (error) {
    	res.status(400).json({
      	error: 'Parámetros de consulta inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { page, limit, search, role, isActive } = value;
  	const skip = (page - 1) * limit;

  	// Construir filtros de búsqueda
  	const where: any = {};
 	 
  	if (search) {
    	where.OR = [
      	{ firstName: { contains: search, mode: 'insensitive' } },
      	{ lastName: { contains: search, mode: 'insensitive' } },
      	{ email: { contains: search, mode: 'insensitive' } }
    	];
  	}

  	if (role) {
    	where.role = role;
  	}

  	if (isActive !== undefined) {
    	where.isActive = isActive;
  	}

  	// Obtener usuarios con paginación
  	const [users, total] = await Promise.all([
    	prisma.user.findMany({
      	where,
      	select: {
        	id: true,
        	email: true,
        	firstName: true,
        	lastName: true,
        	phone: true,
        	avatar: true,
        	role: true,
        	isActive: true,
        	createdAt: true,
        	updatedAt: true,
        	_count: {
          	select: {
            	createdPatients: true,
            	assignedPatients: true,
            	appointments: true,
            	invoices: true
          	}
        	}
      	},
      	skip,
      	take: limit,
      	orderBy: [
        	{ isActive: 'desc' },
        	{ role: 'asc' },
        	{ firstName: 'asc' }
      	]
    	}),
    	prisma.user.count({ where })
  	]);

  	const totalPages = Math.ceil(total / limit);

  	res.json({
    	users,
    	pagination: {
      	page,
      	limit,
      	total,
      	totalPages,
      	hasNextPage: page < totalPages,
      	hasPrevPage: page > 1
    	}
  	});

	} catch (error) {
  	console.error('Error obteniendo usuarios:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USERS_GET_ERROR'
  	});
	}
  }

  /**
   * GET USER BY ID - Obtener usuario por ID
   * GET /api/users/:id
   */
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	const user = await prisma.user.findUnique({
    	where: { id },
    	select: {
      	id: true,
      	email: true,
      	firstName: true,
      	lastName: true,
      	phone: true,
      	avatar: true,
      	role: true,
      	isActive: true,
      	createdAt: true,
      	updatedAt: true,
      	_count: {
        	select: {
          	createdPatients: true,
          	assignedPatients: true,
          	appointments: true,
          	invoices: true,
          	movements: true
        	}
      	}
    	}
  	});

  	if (!user) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	res.json({ user });

	} catch (error) {
  	console.error('Error obteniendo usuario:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_GET_BY_ID_ERROR'
  	});
	}
  }

  /**
   * CREATE USER - Crear nuevo usuario (solo ADMIN)
   * POST /api/users
   */
  static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	// Validar datos de entrada
  	const { error, value } = userValidation.create.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { email, password, firstName, lastName, phone, role, isActive } = value;

  	// Verificar que el email no esté registrado
  	const existingUser = await prisma.user.findUnique({
    	where: { email: email.toLowerCase() }
  	});

  	if (existingUser) {
    	res.status(409).json({
      	error: 'El email ya está registrado',
      	code: 'USER_EMAIL_EXISTS'
    	});
    	return;
  	}

  	// Hashear contraseña
  	const saltRounds = 12;
  	const hashedPassword = await bcrypt.hash(password, saltRounds);

  	// Crear usuario
  	const newUser = await prisma.user.create({
    	data: {
      	email: email.toLowerCase(),
      	password: hashedPassword,
      	firstName,
      	lastName,
      	phone: phone || null,
      	role,
      	isActive: isActive !== undefined ? isActive : true
    	},
    	select: {
      	id: true,
      	email: true,
      	firstName: true,
      	lastName: true,
      	phone: true,
      	role: true,
      	isActive: true,
      	createdAt: true
    	}
  	});

  	res.status(201).json({
    	message: 'Usuario creado exitosamente',
    	user: newUser
  	});

	} catch (error) {
  	console.error('Error creando usuario:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_CREATE_ERROR'
  	});
	}
  }

  /**
   * UPDATE USER - Actualizar usuario (solo ADMIN)
   * PUT /api/users/:id
   */
  static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	// Validar datos de entrada
  	const { error, value } = userValidation.update.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { email, firstName, lastName, phone, role, isActive } = value;

  	// Verificar que el usuario existe
  	const existingUser = await prisma.user.findUnique({
    	where: { id }
  	});

  	if (!existingUser) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Si se está cambiando el email, verificar que no esté en uso
  	if (email && email.toLowerCase() !== existingUser.email) {
    	const emailExists = await prisma.user.findUnique({
      	where: { email: email.toLowerCase() }
    	});

    	if (emailExists) {
      	res.status(409).json({
        	error: 'El email ya está en uso por otro usuario',
        	code: 'USER_EMAIL_EXISTS'
      	});
      	return;
    	}
  	}

  	// Actualizar usuario
  	const updatedUser = await prisma.user.update({
    	where: { id },
    	data: {
      	email: email ? email.toLowerCase() : undefined,
      	firstName: firstName || undefined,
      	lastName: lastName || undefined,
      	phone: phone || undefined,
      	role: role || undefined,
      	isActive: isActive !== undefined ? isActive : undefined
    	},
    	select: {
      	id: true,
      	email: true,
      	firstName: true,
      	lastName: true,
      	phone: true,
      	role: true,
      	isActive: true,
      	updatedAt: true
    	}
  	});

  	res.json({
    	message: 'Usuario actualizado exitosamente',
    	user: updatedUser
  	});

	} catch (error) {
  	console.error('Error actualizando usuario:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_UPDATE_ERROR'
  	});
	}
  }

  /**
   * DELETE USER - Eliminar usuario (solo ADMIN)
   * DELETE /api/users/:id
   */
  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	// Verificar que el usuario existe
  	const existingUser = await prisma.user.findUnique({
    	where: { id },
    	select: {
      	id: true,
      	email: true,
      	role: true,
      	_count: {
        	select: {
          	createdPatients: true,
          	assignedPatients: true,
          	appointments: true,
          	invoices: true
        	}
      	}
    	}
  	});

  	if (!existingUser) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Verificar que no sea el último ADMIN
  	if (existingUser.role === UserRole.ADMIN) {
    	const adminCount = await prisma.user.count({
      	where: {
        	role: UserRole.ADMIN,
        	isActive: true,
        	id: { not: id }
      	}
    	});

    	if (adminCount === 0) {
      	res.status(400).json({
        	error: 'No se puede eliminar el último administrador del sistema',
        	code: 'USER_LAST_ADMIN'
      	});
      	return;
    	}
  	}

  	// Verificar que no tenga datos relacionados
  	const hasRelatedData = existingUser._count.createdPatients > 0 ||
                       	existingUser._count.assignedPatients > 0 ||
                       	existingUser._count.appointments > 0 ||
                       	existingUser._count.invoices > 0;

  	if (hasRelatedData) {
    	// En lugar de eliminar, desactivar el usuario
    	const deactivatedUser = await prisma.user.update({
      	where: { id },
      	data: { isActive: false },
      	select: {
        	id: true,
        	email: true,
        	firstName: true,
        	lastName: true,
        	isActive: true
      	}
    	});

    	res.json({
      	message: 'Usuario desactivado exitosamente (tiene datos relacionados)',
      	user: deactivatedUser,
      	warning: 'El usuario fue desactivado en lugar de eliminado debido a datos relacionados'
    	});
    	return;
  	}

  	// Eliminar usuario
  	await prisma.user.delete({
    	where: { id }
  	});

  	res.json({
    	message: 'Usuario eliminado exitosamente'
  	});

	} catch (error) {
  	console.error('Error eliminando usuario:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_DELETE_ERROR'
  	});
	}
  }

  /**
   * RESET PASSWORD - Resetear contraseña de usuario (solo ADMIN)
   * PUT /api/users/:id/reset-password
   */
  static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	// Validar datos de entrada
  	const { error, value } = userValidation.resetPassword.validate({
    	...req.body,
    	userId: id
  	});
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { newPassword } = value;

  	// Verificar que el usuario existe
  	const existingUser = await prisma.user.findUnique({
    	where: { id },
    	select: { id: true, email: true }
  	});

  	if (!existingUser) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Hashear nueva contraseña
  	const saltRounds = 12;
  	const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  	// Actualizar contraseña
  	await prisma.user.update({
    	where: { id },
    	data: { password: hashedPassword }
  	});

  	res.json({
    	message: 'Contraseña restablecida exitosamente',
    	user: {
      	id: existingUser.id,
      	email: existingUser.email
    	}
  	});

	} catch (error) {
  	console.error('Error restableciendo contraseña:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_RESET_PASSWORD_ERROR'
  	});
	}
  }

  /**
   * TOGGLE ACTIVE - Activar/Desactivar usuario (solo ADMIN)
   * PUT /api/users/:id/toggle-active
   */
  static async toggleActive(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	// Verificar que el usuario existe
  	const existingUser = await prisma.user.findUnique({
    	where: { id },
    	select: { id: true, email: true, role: true, isActive: true }
  	});

  	if (!existingUser) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Verificar que no sea el último ADMIN activo
  	if (existingUser.role === UserRole.ADMIN && existingUser.isActive) {
    	const activeAdminCount = await prisma.user.count({
      	where: {
        	role: UserRole.ADMIN,
        	isActive: true,
        	id: { not: id }
      	}
    	});

    	if (activeAdminCount === 0) {
      	res.status(400).json({
        	error: 'No se puede desactivar el último administrador activo',
        	code: 'USER_LAST_ACTIVE_ADMIN'
      	});
      	return;
    	}
  	}

  	// Cambiar estado
  	const updatedUser = await prisma.user.update({
    	where: { id },
    	data: { isActive: !existingUser.isActive },
    	select: {
      	id: true,
      	email: true,
      	firstName: true,
      	lastName: true,
      	isActive: true
    	}
  	});

  	res.json({
    	message: `Usuario ${updatedUser.isActive ? 'activado' : 'desactivado'} exitosamente`,
    	user: updatedUser
  	});

	} catch (error) {
  	console.error('Error cambiando estado de usuario:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_TOGGLE_ACTIVE_ERROR'
  	});
	}
  }

  /**
   * GET USER STATS - Obtener estadísticas del usuario
   * GET /api/users/:id/stats
   */
  static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	const { id } = req.params;

  	// Verificar que el usuario existe
  	const user = await prisma.user.findUnique({
    	where: { id },
    	select: { id: true, firstName: true, lastName: true, role: true }
  	});

  	if (!user) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Obtener estadísticas
  	const stats = await prisma.user.findUnique({
    	where: { id },
    	select: {
      	_count: {
        	select: {
          	createdPatients: true,
          	assignedPatients: true,
          	appointments: true,
          	invoices: true,
          	movements: true
        	}
      	}
    	}
  	});

  	// Estadísticas adicionales según el rol
  	let additionalStats = {};

  	if (user.role === UserRole.MEDICO) {
    	const appointmentStats = await prisma.appointment.groupBy({
      	by: ['status'],
      	where: { userId: id },
      	_count: { status: true }
    	});

    	additionalStats = {
      	appointmentsByStatus: appointmentStats.reduce((acc, item) => {
        	acc[item.status] = item._count.status;
        	return acc;
      	}, {} as Record<string, number>)
    	};
  	}

  	if (user.role === UserRole.SECRETARIA) {
    	const invoiceStats = await prisma.invoice.groupBy({
      	by: ['status'],
      	where: { userId: id },
      	_count: { status: true }
    	});

    	additionalStats = {
      	invoicesByStatus: invoiceStats.reduce((acc, item) => {
        	acc[item.status] = item._count.status;
        	return acc;
      	}, {} as Record<string, number>)
    	};
  	}

  	res.json({
    	user: {
      	id: user.id,
      	name: `${user.firstName} ${user.lastName}`,
      	role: user.role
    	},
    	stats: {
      	...stats?._count,
      	...additionalStats
    	}
  	});

	} catch (error) {
  	console.error('Error obteniendo estadísticas:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'USER_STATS_ERROR'
  	});
	}
  }
}

export default UsersController;
