import Joi from 'joi';
import { AppointmentStatus } from '@prisma/client';

// Validador para crear cita
export const validateAppointment = (data: any) => {
  const schema = Joi.object({
	patientId: Joi.string()
  	.required()
  	.messages({
    	'string.empty': 'El ID del paciente es requerido',
    	'any.required': 'El ID del paciente es requerido'
  	}),

	treatmentId: Joi.string()
  	.required()
  	.messages({
    	'string.empty': 'El ID del tratamiento es requerido',
    	'any.required': 'El ID del tratamiento es requerido'
  	}),

	userId: Joi.string()
  	.required()
  	.messages({
    	'string.empty': 'El ID del profesional es requerido',
    	'any.required': 'El ID del profesional es requerido'
  	}),

	startTime: Joi.date()
  	.iso()
  	.greater('now')
  	.required()
  	.messages({
    	'date.base': 'La fecha de inicio debe ser válida',
    	'date.greater': 'La fecha de inicio debe ser futura',
    	'any.required': 'La fecha de inicio es requerida'
  	}),

	endTime: Joi.date()
  	.iso()
  	.greater(Joi.ref('startTime'))
  	.required()
  	.messages({
    	'date.base': 'La fecha de fin debe ser válida',
    	'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio',
    	'any.required': 'La fecha de fin es requerida'
  	}),

	notes: Joi.string()
  	.max(500)
  	.allow('')
  	.optional()
  	.messages({
    	'string.max': 'Las notas no pueden exceder 500 caracteres'
  	}),

	googleSync: Joi.boolean()
  	.default(true)
  	.optional()
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para actualizar cita
export const validateAppointmentUpdate = (data: any) => {
  const schema = Joi.object({
	startTime: Joi.date()
  	.iso()
  	.optional()
  	.messages({
    	'date.base': 'La fecha de inicio debe ser válida'
  	}),

	endTime: Joi.date()
  	.iso()
  	.when('startTime', {
    	is: Joi.exist(),
    	then: Joi.date().greater(Joi.ref('startTime')),
    	otherwise: Joi.date()
  	})
  	.optional()
  	.messages({
    	'date.base': 'La fecha de fin debe ser válida',
    	'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
  	}),

	status: Joi.string()
  	.valid(...Object.values(AppointmentStatus))
  	.optional()
  	.messages({
    	'any.only': 'Estado de cita inválido'
  	}),

	notes: Joi.string()
  	.max(500)
  	.allow('')
  	.optional()
  	.messages({
    	'string.max': 'Las notas no pueden exceder 500 caracteres'
  	}),

	googleSync: Joi.boolean()
  	.default(true)
  	.optional()
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para filtros de búsqueda
export const validateAppointmentFilters = (data: any) => {
  const schema = Joi.object({
	date: Joi.date()
  	.iso()
  	.optional()
  	.messages({
    	'date.base': 'La fecha debe ser válida'
  	}),

	startDate: Joi.date()
  	.iso()
  	.optional()
  	.messages({
    	'date.base': 'La fecha de inicio debe ser válida'
  	}),

	endDate: Joi.date()
  	.iso()
  	.greater(Joi.ref('startDate'))
  	.optional()
  	.messages({
    	'date.base': 'La fecha de fin debe ser válida',
    	'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
  	}),

	patientId: Joi.string()
  	.optional(),

	treatmentId: Joi.string()
  	.optional(),

	userId: Joi.string()
  	.optional(),

	status: Joi.string()
  	.valid(...Object.values(AppointmentStatus))
  	.optional()
  	.messages({
    	'any.only': 'Estado de cita inválido'
  	}),

	page: Joi.number()
  	.integer()
  	.min(1)
  	.default(1)
  	.optional()
  	.messages({
    	'number.base': 'La página debe ser un número',
    	'number.integer': 'La página debe ser un número entero',
    	'number.min': 'La página debe ser mayor a 0'
  	}),

	limit: Joi.number()
  	.integer()
  	.min(1)
  	.max(100)
  	.default(20)
  	.optional()
  	.messages({
    	'number.base': 'El límite debe ser un número',
    	'number.integer': 'El límite debe ser un número entero',
    	'number.min': 'El límite debe ser mayor a 0',
    	'number.max': 'El límite no puede ser mayor a 100'
  	})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para disponibilidad
export const validateAvailabilityQuery = (data: any) => {
  const schema = Joi.object({
	userId: Joi.string()
  	.required()
  	.messages({
    	'string.empty': 'El ID del profesional es requerido',
    	'any.required': 'El ID del profesional es requerido'
  	}),

	date: Joi.date()
  	.iso()
  	.greater('now')
  	.required()
  	.messages({
    	'date.base': 'La fecha debe ser válida',
    	'date.greater': 'La fecha debe ser futura',
    	'any.required': 'La fecha es requerida'
  	}),

	treatmentId: Joi.string()
  	.optional()
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para completar cita
export const validateCompleteAppointment = (data: any) => {
  const schema = Joi.object({
	notes: Joi.string()
  	.max(500)
  	.allow('')
  	.optional()
  	.messages({
    	'string.max': 'Las notas no pueden exceder 500 caracteres'
  	}),

	treatmentNotes: Joi.string()
  	.max(1000)
  	.allow('')
  	.optional()
  	.messages({
    	'string.max': 'Las notas del tratamiento no pueden exceder 1000 caracteres'
  	})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para cancelar cita
export const validateCancelAppointment = (data: any) => {
  const schema = Joi.object({
	reason: Joi.string()
  	.max(200)
  	.required()
  	.messages({
    	'string.empty': 'El motivo de cancelación es requerido',
    	'string.max': 'El motivo no puede exceder 200 caracteres',
    	'any.required': 'El motivo de cancelación es requerido'
  	})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador para estadísticas
export const validateStatsQuery = (data: any) => {
  const schema = Joi.object({
	startDate: Joi.date()
  	.iso()
  	.optional()
  	.messages({
    	'date.base': 'La fecha de inicio debe ser válida'
  	}),

	endDate: Joi.date()
  	.iso()
  	.greater(Joi.ref('startDate'))
  	.optional()
  	.messages({
    	'date.base': 'La fecha de fin debe ser válida',
    	'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
  	})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validador personalizado para horarios de trabajo
export const validateWorkingHours = (startTime: Date, endTime: Date): { isValid: boolean; message?: string } => {
  const start = new Date(startTime);
  const end = new Date(endTime);
 
  // Verificar que sea día laboral (lunes a sábado)
  const dayOfWeek = start.getDay();
  if (dayOfWeek === 0) { // Domingo
	return {
  	isValid: false,
  	message: 'No se pueden programar citas los domingos'
	};
  }

  // Verificar horarios de trabajo
  const startHour = start.getHours();
  const endHour = end.getHours();
  const startMinute = start.getMinutes();
  const endMinute = end.getMinutes();

  // Horario de trabajo: 8:00 a 18:00
  const workingStart = 8;
  const workingEnd = 18;

  if (startHour < workingStart || (startHour === workingStart && startMinute < 0)) {
	return {
  	isValid: false,
  	message: `Las citas deben programarse después de las ${workingStart}:00`
	};
  }

  if (endHour > workingEnd || (endHour === workingEnd && endMinute > 0)) {
	return {
  	isValid: false,
  	message: `Las citas deben finalizar antes de las ${workingEnd}:00`
	};
  }

  // Verificar duración mínima (15 minutos) y máxima (4 horas)
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);

  if (durationMinutes < 15) {
	return {
  	isValid: false,
  	message: 'La duración mínima de una cita es 15 minutos'
	};
  }

  if (durationMinutes > 240) { // 4 horas
	return {
  	isValid: false,
  	message: 'La duración máxima de una cita es 4 horas'
	};
  }

  // Verificar que los minutos sean múltiplos de 15
  if (startMinute % 15 !== 0 || endMinute % 15 !== 0) {
	return {
  	isValid: false,
  	message: 'Las citas deben programarse en intervalos de 15 minutos'
	};
  }

  return { isValid: true };
};

// Validador para verificar conflictos de horario
export const validateTimeConflict = (
  newStart: Date,
  newEnd: Date,
  existingAppointments: Array<{ startTime: Date; endTime: Date; id: string }>,
  excludeId?: string
): { hasConflict: boolean; conflictingAppointment?: string } => {
 
  for (const appointment of existingAppointments) {
	// Excluir la cita actual si se está editando
	if (excludeId && appointment.id === excludeId) {
  	continue;
	}

	// Verificar solapamiento
	const appointmentStart = new Date(appointment.startTime);
	const appointmentEnd = new Date(appointment.endTime);

	if (newStart < appointmentEnd && newEnd > appointmentStart) {
  	return {
    	hasConflict: true,
    	conflictingAppointment: appointment.id
  	};
	}
  }

  return { hasConflict: false };
};

// Validador para tiempo de anticipación
export const validateAdvanceNotice = (appointmentTime: Date, action: 'create' | 'cancel' | 'reschedule'): { isValid: boolean; message?: string } => {
  const now = new Date();
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);

  switch (action) {
	case 'create':
  	if (hoursUntilAppointment < 1) {
    	return {
      	isValid: false,
      	message: 'Las citas deben programarse con al menos 1 hora de anticipación'
    	};
  	}
  	break;

	case 'cancel':
  	if (hoursUntilAppointment < 24) {
    	return {
      	isValid: false,
      	message: 'Las cancelaciones deben realizarse con al menos 24 horas de anticipación'
    	};
  	}
  	break;

	case 'reschedule':
  	if (hoursUntilAppointment < 2) {
    	return {
      	isValid: false,
      	message: 'Las reprogramaciones deben realizarse con al menos 2 horas de anticipación'
    	};
  	}
  	break;
  }

  return { isValid: true };
};
