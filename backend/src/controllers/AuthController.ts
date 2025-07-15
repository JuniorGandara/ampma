import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';
import { authValidation } from '../utils/validation';

const prisma = new PrismaClient();

/**
 * Controlador de Autenticación
 * Maneja login, registro, refresh tokens y recuperación de contraseña
 */
export class AuthController {
 
  /**
   * LOGIN - Autenticar usuario
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
	try {
  	// Validar datos de entrada
  	const { error, value } = authValidation.login.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { email, password } = value;

  	// Buscar usuario por email
  	const user = await prisma.user.findUnique({
    	where: { email: email.toLowerCase() },
    	select: {
      	id: true,
      	email: true,
      	password: true,
      	firstName: true,
      	lastName: true,
      	phone: true,
      	avatar: true,
      	role: true,
      	isActive: true,
      	createdAt: true,
      	updatedAt: true
    	}
  	});

  	if (!user) {
    	res.status(401).json({
      	error: 'Credenciales inválidas',
      	code: 'AUTH_INVALID_CREDENTIALS'
    	});
    	return;
  	}

  	// Verificar que el usuario esté activo
  	if (!user.isActive) {
    	res.status(401).json({
      	error: 'Usuario inactivo. Contacta al administrador.',
      	code: 'AUTH_USER_INACTIVE'
    	});
    	return;
  	}

  	// Verificar contraseña
  	const isPasswordValid = await bcrypt.compare(password, user.password);
  	if (!isPasswordValid) {
    	res.status(401).json({
      	error: 'Credenciales inválidas',
      	code: 'AUTH_INVALID_CREDENTIALS'
    	});
    	return;
  	}

  	// Generar token JWT
  	const token = generateToken(user.id);

  	// Respuesta exitosa (sin password)
  	const { password: _, ...userWithoutPassword } = user;
 	 
  	res.json({
    	message: 'Login exitoso',
    	token,
    	user: userWithoutPassword,
    	expiresIn: '24h'
  	});

	} catch (error) {
  	console.error('Error en login:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_LOGIN_ERROR'
  	});
	}
  }

  /**
   * REGISTER - Registrar nuevo usuario (solo ADMIN)
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response): Promise<void> {
	try {
  	// Validar datos de entrada
  	const { error, value } = authValidation.register.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { email, password, firstName, lastName, phone, role } = value;

  	// Verificar que el email no esté registrado
  	const existingUser = await prisma.user.findUnique({
    	where: { email: email.toLowerCase() }
  	});

  	if (existingUser) {
    	res.status(409).json({
      	error: 'El email ya está registrado',
      	code: 'AUTH_EMAIL_EXISTS'
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
      	role: role || UserRole.SECRETARIA
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
    	message: 'Usuario registrado exitosamente',
    	user: newUser
  	});

	} catch (error) {
  	console.error('Error en registro:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_REGISTER_ERROR'
  	});
	}
  }

  /**
   * ME - Obtener datos del usuario autenticado
   * GET /api/auth/me
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	if (!req.user) {
    	res.status(401).json({
      	error: 'Usuario no autenticado',
      	code: 'AUTH_USER_REQUIRED'
    	});
    	return;
  	}

  	// Obtener datos completos del usuario
  	const user = await prisma.user.findUnique({
    	where: { id: req.user.id },
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
      	// Contar relaciones
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

  	if (!user) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'AUTH_USER_NOT_FOUND'
    	});
    	return;
  	}

  	res.json({
    	user,
    	permissions: {
      	canManageUsers: user.role === UserRole.ADMIN,
      	canManagePatients: [UserRole.ADMIN, UserRole.MEDICO, UserRole.SECRETARIA].includes(user.role),
      	canManageTreatments: [UserRole.ADMIN, UserRole.MEDICO].includes(user.role),
      	canManageInventory: [UserRole.ADMIN, UserRole.SECRETARIA].includes(user.role),
      	canManageInvoices: [UserRole.ADMIN, UserRole.SECRETARIA].includes(user.role),
      	canViewReports: true
    	}
  	});

	} catch (error) {
  	console.error('Error obteniendo perfil:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_PROFILE_ERROR'
  	});
	}
  }

  /**
   * UPDATE PROFILE - Actualizar perfil del usuario
   * PUT /api/auth/profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	if (!req.user) {
    	res.status(401).json({
      	error: 'Usuario no autenticado',
      	code: 'AUTH_USER_REQUIRED'
    	});
    	return;
  	}

  	// Validar datos de entrada
  	const { error, value } = authValidation.updateProfile.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { firstName, lastName, phone, avatar } = value;

  	// Actualizar usuario
  	const updatedUser = await prisma.user.update({
    	where: { id: req.user.id },
    	data: {
      	firstName: firstName || undefined,
      	lastName: lastName || undefined,
      	phone: phone || undefined,
      	avatar: avatar || undefined
    	},
    	select: {
      	id: true,
      	email: true,
      	firstName: true,
      	lastName: true,
      	phone: true,
      	avatar: true,
      	role: true,
      	updatedAt: true
    	}
  	});

  	res.json({
    	message: 'Perfil actualizado exitosamente',
    	user: updatedUser
  	});

	} catch (error) {
  	console.error('Error actualizando perfil:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_UPDATE_PROFILE_ERROR'
  	});
	}
  }

  /**
   * CHANGE PASSWORD - Cambiar contraseña
   * PUT /api/auth/change-password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	if (!req.user) {
    	res.status(401).json({
      	error: 'Usuario no autenticado',
      	code: 'AUTH_USER_REQUIRED'
    	});
    	return;
  	}

  	// Validar datos de entrada
  	const { error, value } = authValidation.changePassword.validate(req.body);
  	if (error) {
    	res.status(400).json({
      	error: 'Datos inválidos',
      	details: error.details.map(d => d.message)
    	});
    	return;
  	}

  	const { currentPassword, newPassword } = value;

  	// Obtener usuario con contraseña actual
  	const user = await prisma.user.findUnique({
    	where: { id: req.user.id },
    	select: { password: true }
  	});

  	if (!user) {
    	res.status(404).json({
      	error: 'Usuario no encontrado',
      	code: 'AUTH_USER_NOT_FOUND'
    	});
    	return;
  	}

  	// Verificar contraseña actual
  	const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  	if (!isCurrentPasswordValid) {
    	res.status(400).json({
      	error: 'Contraseña actual incorrecta',
      	code: 'AUTH_CURRENT_PASSWORD_INVALID'
    	});
    	return;
  	}

  	// Hashear nueva contraseña
  	const saltRounds = 12;
  	const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  	// Actualizar contraseña
  	await prisma.user.update({
    	where: { id: req.user.id },
    	data: { password: hashedNewPassword }
  	});

  	res.json({
    	message: 'Contraseña cambiada exitosamente'
  	});

	} catch (error) {
  	console.error('Error cambiando contraseña:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_CHANGE_PASSWORD_ERROR'
  	});
	}
  }

  /**
   * REFRESH TOKEN - Renovar token JWT
   * POST /api/auth/refresh
   */
  static async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	if (!req.user) {
    	res.status(401).json({
      	error: 'Usuario no autenticado',
      	code: 'AUTH_USER_REQUIRED'
    	});
    	return;
  	}

  	// Verificar que el usuario siga activo
  	const user = await prisma.user.findUnique({
    	where: { id: req.user.id },
    	select: { isActive: true }
  	});

  	if (!user || !user.isActive) {
    	res.status(401).json({
      	error: 'Usuario inactivo',
      	code: 'AUTH_USER_INACTIVE'
    	});
    	return;
  	}

  	// Generar nuevo token
  	const newToken = generateToken(req.user.id);

  	res.json({
    	message: 'Token renovado exitosamente',
    	token: newToken,
    	expiresIn: '24h'
  	});

	} catch (error) {
  	console.error('Error renovando token:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_REFRESH_TOKEN_ERROR'
  	});
	}
  }

  /**
   * LOGOUT - Cerrar sesión
   * POST /api/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
	try {
  	// En una implementación con tokens en base de datos, aquí se invalidaría el token
  	// Por ahora, solo confirmamos el logout del lado del cliente
 	 
  	res.json({
    	message: 'Sesión cerrada exitosamente'
  	});

	} catch (error) {
  	console.error('Error en logout:', error);
  	res.status(500).json({
    	error: 'Error interno del servidor',
    	code: 'AUTH_LOGOUT_ERROR'
  	});
	}
  }
}

export default AuthController;
