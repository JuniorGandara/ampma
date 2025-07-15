import Joi from 'joi';
import { UserRole } from '@prisma/client';

/**
 * Validaciones para autenticación
 */
export const authValidation = {
  /**
   * Validación para login
   */
  login: Joi.object({
	email: Joi.string()
  	.email({ minDomainSegments: 2 })
  	.required()
  	.messages({
    	'string.email': 'El email debe tener un formato válido',
    	'any.required': 'El email es requerido'
  	}),
	password: Joi.string()
  	.min(6)
  	.required()
  	.messages({
    	'string.min': 'La contraseña debe tener al menos 6 caracteres',
    	'any.required': 'La contraseña es requerida'
  	})
  }),

  /**
   * Validación para registro
   */
  register: Joi.object({
	email: Joi.string()
  	.email({ minDomainSegments: 2 })
  	.required()
  	.messages({
    	'string.email': 'El email debe tener un formato válido',
    	'any.required': 'El email es requerido'
  	}),
	password: Joi.string()
  	.min(8)
  	.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  	.required()
  	.messages({
    	'string.min': 'La contraseña debe tener al menos 8 caracteres',
    	'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
    	'any.required': 'La contraseña es requerida'
  	}),
	firstName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.required()
  	.messages({
    	'string.min': 'El nombre debe tener al menos 2 caracteres',
    	'string.max': 'El nombre no puede exceder 50 caracteres',
    	'string.pattern.base': 'El nombre solo puede contener letras y espacios',
    	'any.required': 'El nombre es requerido'
  	}),
	lastName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.required()
  	.messages({
    	'string.min': 'El apellido debe tener al menos 2 caracteres',
    	'string.max': 'El apellido no puede exceder 50 caracteres',
    	'string.pattern.base': 'El apellido solo puede contener letras y espacios',
    	'any.required': 'El apellido es requerido'
  	}),
	phone: Joi.string()
  	.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)
  	.optional()
  	.allow(null, '')
  	.messages({
    	'string.pattern.base': 'El teléfono debe tener un formato válido'
  	}),
	role: Joi.string()
  	.valid(...Object.values(UserRole))
  	.optional()
  	.messages({
    	'any.only': 'El rol debe ser uno de: ADMIN, MEDICO, SECRETARIA, VIEWER'
  	})
  }),

  /**
   * Validación para actualizar perfil
   */
  updateProfile: Joi.object({
	firstName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.optional()
  	.messages({
    	'string.min': 'El nombre debe tener al menos 2 caracteres',
    	'string.max': 'El nombre no puede exceder 50 caracteres',
    	'string.pattern.base': 'El nombre solo puede contener letras y espacios'
  	}),
	lastName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.optional()
  	.messages({
    	'string.min': 'El apellido debe tener al menos 2 caracteres',
    	'string.max': 'El apellido no puede exceder 50 caracteres',
    	'string.pattern.base': 'El apellido solo puede contener letras y espacios'
  	}),
	phone: Joi.string()
  	.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)
  	.optional()
  	.allow(null, '')
  	.messages({
    	'string.pattern.base': 'El teléfono debe tener un formato válido'
  	}),
	avatar: Joi.string()
  	.uri()
  	.optional()
  	.allow(null, '')
  	.messages({
    	'string.uri': 'El avatar debe ser una URL válida'
  	})
  }),

  /**
   * Validación para cambio de contraseña
   */
  changePassword: Joi.object({
	currentPassword: Joi.string()
  	.required()
  	.messages({
    	'any.required': 'La contraseña actual es requerida'
  	}),
	newPassword: Joi.string()
  	.min(8)
  	.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  	.required()
  	.messages({
    	'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
    	'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número',
    	'any.required': 'La nueva contraseña es requerida'
  	}),
	confirmPassword: Joi.string()
  	.valid(Joi.ref('newPassword'))
  	.required()
  	.messages({
    	'any.only': 'La confirmación de contraseña no coincide',
    	'any.required': 'La confirmación de contraseña es requerida'
  	})
  })
};

/**
 * Validaciones para usuarios
 */
export const userValidation = {
  /**
   * Validación para crear usuario
   */
  create: Joi.object({
	email: Joi.string()
  	.email({ minDomainSegments: 2 })
  	.required()
  	.messages({
    	'string.email': 'El email debe tener un formato válido',
    	'any.required': 'El email es requerido'
  	}),
	password: Joi.string()
  	.min(8)
  	.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  	.required()
  	.messages({
    	'string.min': 'La contraseña debe tener al menos 8 caracteres',
    	'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
    	'any.required': 'La contraseña es requerida'
  	}),
	firstName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.required()
  	.messages({
    	'string.min': 'El nombre debe tener al menos 2 caracteres',
    	'string.max': 'El nombre no puede exceder 50 caracteres',
    	'string.pattern.base': 'El nombre solo puede contener letras y espacios',
    	'any.required': 'El nombre es requerido'
  	}),
	lastName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.required()
  	.messages({
    	'string.min': 'El apellido debe tener al menos 2 caracteres',
    	'string.max': 'El apellido no puede exceder 50 caracteres',
    	'string.pattern.base': 'El apellido solo puede contener letras y espacios',
    	'any.required': 'El apellido es requerido'
  	}),
	phone: Joi.string()
  	.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)
  	.optional()
  	.allow(null, '')
  	.messages({
    	'string.pattern.base': 'El teléfono debe tener un formato válido'
  	}),
	role: Joi.string()
  	.valid(...Object.values(UserRole))
  	.required()
  	.messages({
    	'any.only': 'El rol debe ser uno de: ADMIN, MEDICO, SECRETARIA, VIEWER',
    	'any.required': 'El rol es requerido'
  	}),
	isActive: Joi.boolean()
  	.optional()
  	.default(true)
  }),

  /**
   * Validación para actualizar usuario
   */
  update: Joi.object({
	email: Joi.string()
  	.email({ minDomainSegments: 2 })
  	.optional()
  	.messages({
    	'string.email': 'El email debe tener un formato válido'
  	}),
	firstName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.optional()
  	.messages({
    	'string.min': 'El nombre debe tener al menos 2 caracteres',
    	'string.max': 'El nombre no puede exceder 50 caracteres',
    	'string.pattern.base': 'El nombre solo puede contener letras y espacios'
  	}),
	lastName: Joi.string()
  	.min(2)
  	.max(50)
  	.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
  	.optional()
  	.messages({
    	'string.min': 'El apellido debe tener al menos 2 caracteres',
    	'string.max': 'El apellido no puede exceder 50 caracteres',
    	'string.pattern.base': 'El apellido solo puede contener letras y espacios'
  	}),
	phone: Joi.string()
  	.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)
  	.optional()
  	.allow(null, '')
  	.messages({
    	'string.pattern.base': 'El teléfono debe tener un formato válido'
  	}),
	role: Joi.string()
  	.valid(...Object.values(UserRole))
  	.optional()
  	.messages({
    	'any.only': 'El rol debe ser uno de: ADMIN, MEDICO, SECRETARIA, VIEWER'
  	}),
	isActive: Joi.boolean()
  	.optional()
  }),

  /**
   * Validación para resetear contraseña
   */
  resetPassword: Joi.object({
	userId: Joi.string()
  	.required()
  	.messages({
    	'any.required': 'El ID del usuario es requerido'
  	}),
	newPassword: Joi.string()
  	.min(8)
  	.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  	.required()
  	.messages({
    	'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
    	'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número',
    	'any.required': 'La nueva contraseña es requerida'
  	})
  }),

  /**
   * Validación para parámetros de consulta
   */
  queryParams: Joi.object({
	page: Joi.number()
  	.integer()
  	.min(1)
  	.optional()
  	.default(1)
  	.messages({
    	'number.base': 'El número de página debe ser un número',
    	'number.integer': 'El número de página debe ser un entero',
    	'number.min': 'El número de página debe ser mayor a 0'
  	}),
	limit: Joi.number()
  	.integer()
  	.min(1)
  	.max(100)
  	.optional()
  	.default(10)
  	.messages({
    	'number.base': 'El límite debe ser un número',
    	'number.integer': 'El límite debe ser un entero',
    	'number.min': 'El límite debe ser mayor a 0',
    	'number.max': 'El límite no puede ser mayor a 100'
  	}),
	search: Joi.string()
  	.max(100)
  	.optional()
  	.allow('')
  	.messages({
    	'string.max': 'El término de búsqueda no puede exceder 100 caracteres'
  	}),
	role: Joi.string()
  	.valid(...Object.values(UserRole))
  	.optional()
  	.messages({
    	'any.only': 'El rol debe ser uno de: ADMIN, MEDICO, SECRETARIA, VIEWER'
  	}),
	isActive: Joi.boolean()
  	.optional()
  })
};

/**
 * Validaciones comunes
 */
export const commonValidation = {
  /**
   * Validación para ID
   */
  id: Joi.string()
	.required()
	.messages({
  	'any.required': 'El ID es requerido',
  	'string.base': 'El ID debe ser una cadena de texto'
	}),

  /**
   * Validación para paginación
   */
  pagination: Joi.object({
	page: Joi.number()
  	.integer()
  	.min(1)
  	.optional()
  	.default(1),
	limit: Joi.number()
  	.integer()
  	.min(1)
  	.max(100)
  	.optional()
  	.default(10)
  }),

  /**
   * Validación para fechas
   */
  dateRange: Joi.object({
	startDate: Joi.date()
  	.iso()
  	.optional()
  	.messages({
    	'date.format': 'La fecha de inicio debe tener formato ISO'
  	}),
	endDate: Joi.date()
  	.iso()
  	.min(Joi.ref('startDate'))
  	.optional()
  	.messages({
    	'date.format': 'La fecha de fin debe tener formato ISO',
    	'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio'
  	})
  })
};

/**
 * Middleware de validación genérico
 */
export const validateRequest = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
	const { error, value } = schema.validate(req[property], {
  	abortEarly: false,
  	stripUnknown: true
	});

	if (error) {
  	return res.status(400).json({
    	error: 'Datos de entrada inválidos',
    	details: error.details.map(detail => ({
      	field: detail.path.join('.'),
      	message: detail.message,
      	value: detail.context?.value
    	}))
  	});
	}

	req[property] = value;
	next();
  };
};

/**
 * Validación personalizada para Argentina
 */
export const argentineValidation = {
  /**
   * Validación para CUIT argentino
   */
  cuit: Joi.string()
	.pattern(/^(20|23|24|27|30|33|34)\d{8}\d$/)
	.messages({
  	'string.pattern.base': 'El CUIT debe tener un formato válido (XX-XXXXXXXX-X)'
	}),

  /**
   * Validación para DNI argentino
   */
  dni: Joi.string()
	.pattern(/^\d{7,8}$/)
	.messages({
  	'string.pattern.base': 'El DNI debe contener entre 7 y 8 dígitos'
	}),

  /**
   * Validación para teléfono argentino
   */
  phoneArgentine: Joi.string()
	.pattern(/^(\+54|0054|54)?[\s\-]?(\d{2,4})[\s\-]?(\d{6,8})$/)
	.messages({
  	'string.pattern.base': 'El teléfono debe tener un formato argentino válido'
	}),

  /**
   * Validación para código postal argentino
   */
  postalCode: Joi.string()
	.pattern(/^[A-Z]?\d{4}[A-Z]{3}?$/)
	.messages({
  	'string.pattern.base': 'El código postal debe tener formato argentino (ej: 5000, X5000ABC)'
	})
};

export default {
  authValidation,
  userValidation,
  commonValidation,
  argentineValidation,
  validateRequest
};
