import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// Configuración de multer para archivos médicos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
	const uploadPath = path.join(__dirname, '../../uploads/medical-files');
	try {
  	await fs.mkdir(uploadPath, { recursive: true });
  	cb(null, uploadPath);
	} catch (error) {
  	cb(error, '');
	}
  },
  filename: (req, file, cb) => {
	const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
	cb(null, `medical-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
	const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
	const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
	const mimetype = allowedTypes.test(file.mimetype);
    
	if (mimetype && extname) {
  	return cb(null, true);
	} else {
  	cb(new Error('Tipo de archivo no permitido'));
	}
  }
});

// Validaciones
const patientSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
	'string.min': 'El nombre debe tener al menos 2 caracteres',
	'any.required': 'El nombre es obligatorio'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
	'string.min': 'El apellido debe tener al menos 2 caracteres',
	'any.required': 'El apellido es obligatorio'
  }),
  email: Joi.string().email().optional().allow('').messages({
	'string.email': 'Debe ser un email válido'
  }),
  phone: Joi.string().pattern(/^[\d\s\-\+\(\)]+$/).required().messages({
	'string.pattern.base': 'El teléfono debe contener solo números, espacios y símbolos válidos',
	'any.required': 'El teléfono es obligatorio'
  }),
  dni: Joi.string().pattern(/^\d{7,8}$/).required().messages({
	'string.pattern.base': 'El DNI debe tener 7 u 8 dígitos',
	'any.required': 'El DNI es obligatorio'
  }),
  birthDate: Joi.date().max('now').required().messages({
	'date.max': 'La fecha de nacimiento no puede ser futura',
	'any.required': 'La fecha de nacimiento es obligatoria'
  }),
  gender: Joi.string().valid('MASCULINO', 'FEMENINO', 'OTRO').required(),
  address: Joi.string().max(200).optional().allow(''),
  city: Joi.string().max(50).optional().default('Córdoba'),
  province: Joi.string().max(50).optional().default('Córdoba'),
  country: Joi.string().max(50).optional().default('Argentina'),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional().allow(''),
  allergies: Joi.string().max(500).optional().allow(''),
  medications: Joi.string().max(500).optional().allow(''),
  medicalNotes: Joi.string().max(1000).optional().allow(''),
  assignedToId: Joi.string().optional().allow('')
});

const medicalRecordSchema = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(10).max(2000).required(),
  recordDate: Joi.date().optional()
});

// Obtener todos los pacientes con filtros y paginación
export const getPatients = async (req: Request, res: Response) => {
  try {
	const {
  	page = 1,
  	limit = 10,
  	search = '',
  	gender,
  	city,
  	isActive = 'true',
  	assignedTo,
  	sortBy = 'createdAt',
  	sortOrder = 'desc'
	} = req.query;

	const pageNumber = parseInt(page as string);
	const limitNumber = parseInt(limit as string);
	const skip = (pageNumber - 1) * limitNumber;

	// Construir filtros
	const where: any = {
  	isActive: isActive === 'true',
  	...(search && {
    	OR: [
      	{ firstName: { contains: search as string, mode: 'insensitive' } },
      	{ lastName: { contains: search as string, mode: 'insensitive' } },
      	{ dni: { contains: search as string } },
      	{ phone: { contains: search as string } },
      	{ email: { contains: search as string, mode: 'insensitive' } }
    	]
  	}),
  	...(gender && { gender: gender as any }),
  	...(city && { city: { contains: city as string, mode: 'insensitive' } }),
  	...(assignedTo && { assignedToId: assignedTo as string })
	};

	// Obtener pacientes
	const [patients, total] = await Promise.all([
  	prisma.patient.findMany({
    	where,
    	skip,
    	take: limitNumber,
    	orderBy: {
      	[sortBy as string]: sortOrder as 'asc' | 'desc'
    	},
    	include: {
      	createdBy: {
        	select: { id: true, firstName: true, lastName: true, role: true }
      	},
      	assignedTo: {
        	select: { id: true, firstName: true, lastName: true, role: true }
      	},
      	_count: {
        	select: {
          	medicalRecords: true,
          	appointments: true,
          	treatments: true,
          	invoices: true
        	}
      	}
    	}
  	}),
  	prisma.patient.count({ where })
	]);

	// Calcular edad para cada paciente
	const patientsWithAge = patients.map(patient => ({
  	...patient,
  	age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
	}));

	res.json({
  	patients: patientsWithAge,
  	pagination: {
    	current: pageNumber,
    	total: Math.ceil(total / limitNumber),
    	totalRecords: total,
    	hasNext: pageNumber < Math.ceil(total / limitNumber),
    	hasPrev: pageNumber > 1
  	}
	});

  } catch (error) {
	console.error('Error obteniendo pacientes:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Obtener un paciente específico
export const getPatient = async (req: Request, res: Response) => {
  try {
	const { id } = req.params;

	const patient = await prisma.patient.findUnique({
  	where: { id },
  	include: {
    	createdBy: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	},
    	assignedTo: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	},
    	medicalRecords: {
      	orderBy: { recordDate: 'desc' },
      	take: 10
    	},
    	appointments: {
      	orderBy: { startTime: 'desc' },
      	take: 5,
      	include: {
        	treatment: { select: { name: true, category: true } },
        	user: { select: { firstName: true, lastName: true } }
      	}
    	},
    	treatments: {
      	include: {
        	treatment: { select: { name: true, category: true, price: true } }
      	},
      	orderBy: { startDate: 'desc' }
    	},
    	invoices: {
      	orderBy: { invoiceDate: 'desc' },
      	take: 5,
      	select: {
        	id: true,
        	invoiceNumber: true,
        	total: true,
        	status: true,
        	invoiceDate: true
      	}
    	}
  	}
	});

	if (!patient) {
  	return res.status(404).json({ error: 'Paciente no encontrado' });
	}

	// Calcular edad
	const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();

	// Estadísticas del paciente
	const stats = {
  	totalAppointments: patient.appointments.length,
  	activeTreatments: patient.treatments.filter(t => t.status === 'ACTIVO').length,
  	totalInvoiced: patient.invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
  	lastVisit: patient.appointments[0]?.startTime || null
	};

	res.json({
  	...patient,
  	age,
  	stats
	});

  } catch (error) {
	console.error('Error obteniendo paciente:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Crear nuevo paciente
export const createPatient = async (req: Request, res: Response) => {
  try {
	const { error, value } = patientSchema.validate(req.body);
    
	if (error) {
  	return res.status(400).json({
    	error: 'Datos de entrada inválidos',
    	details: error.details.map(d => d.message)
  	});
	}

	// Verificar que el DNI no exista
	const existingPatient = await prisma.patient.findUnique({
  	where: { dni: value.dni }
	});

	if (existingPatient) {
  	return res.status(409).json({
    	error: 'Ya existe un paciente con ese DNI'
  	});
	}

	// Verificar email si se proporciona
	if (value.email) {
  	const existingEmail = await prisma.patient.findUnique({
    	where: { email: value.email }
  	});

  	if (existingEmail) {
    	return res.status(409).json({
      	error: 'Ya existe un paciente con ese email'
    	});
  	}
	}

	// Crear paciente
	const patient = await prisma.patient.create({
  	data: {
    	...value,
    	createdById: (req as any).user.id,
    	birthDate: new Date(value.birthDate)
  	},
  	include: {
    	createdBy: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	},
    	assignedTo: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	}
  	}
	});

	// Crear registro médico inicial
	await prisma.medicalRecord.create({
  	data: {
    	patientId: patient.id,
    	title: 'Registro inicial',
    	description: `Paciente registrado en el sistema el ${new Date().toLocaleDateString('es-AR')}.`,
    	recordDate: new Date()
  	}
	});

	res.status(201).json({
  	message: 'Paciente creado exitosamente',
  	patient: {
    	...patient,
    	age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
  	}
	});

  } catch (error) {
	console.error('Error creando paciente:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Actualizar paciente
export const updatePatient = async (req: Request, res: Response) => {
  try {
	const { id } = req.params;
	const { error, value } = patientSchema.validate(req.body);

	if (error) {
  	return res.status(400).json({
    	error: 'Datos de entrada inválidos',
    	details: error.details.map(d => d.message)
  	});
	}

	// Verificar que el paciente exista
	const existingPatient = await prisma.patient.findUnique({
  	where: { id }
	});

	if (!existingPatient) {
  	return res.status(404).json({ error: 'Paciente no encontrado' });
	}

	// Verificar DNI duplicado (excluyendo el actual)
	if (value.dni !== existingPatient.dni) {
  	const dniExists = await prisma.patient.findFirst({
    	where: { dni: value.dni, id: { not: id } }
  	});

  	if (dniExists) {
    	return res.status(409).json({
      	error: 'Ya existe un paciente con ese DNI'
    	});
  	}
	}

	// Verificar email duplicado (excluyendo el actual)
	if (value.email && value.email !== existingPatient.email) {
  	const emailExists = await prisma.patient.findFirst({
    	where: { email: value.email, id: { not: id } }
  	});

  	if (emailExists) {
    	return res.status(409).json({
      	error: 'Ya existe un paciente con ese email'
    	});
  	}
	}

	// Actualizar paciente
	const updatedPatient = await prisma.patient.update({
  	where: { id },
  	data: {
    	...value,
    	birthDate: new Date(value.birthDate),
    	updatedAt: new Date()
  	},
  	include: {
    	createdBy: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	},
    	assignedTo: {
      	select: { id: true, firstName: true, lastName: true, role: true }
    	}
  	}
	});

	res.json({
  	message: 'Paciente actualizado exitosamente',
  	patient: {
    	...updatedPatient,
    	age: new Date().getFullYear() - new Date(updatedPatient.birthDate).getFullYear()
  	}
	});

  } catch (error) {
	console.error('Error actualizando paciente:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Desactivar paciente (soft delete)
export const deactivatePatient = async (req: Request, res: Response) => {
  try {
	const { id } = req.params;

	const patient = await prisma.patient.findUnique({
  	where: { id }
	});

	if (!patient) {
  	return res.status(404).json({ error: 'Paciente no encontrado' });
	}

	// Verificar que no tenga citas futuras
	const futureAppointments = await prisma.appointment.count({
  	where: {
    	patientId: id,
    	startTime: { gt: new Date() },
    	status: { in: ['PROGRAMADA', 'CONFIRMADA'] }
  	}
	});

	if (futureAppointments > 0) {
  	return res.status(400).json({
    	error: 'No se puede desactivar un paciente con citas futuras programadas'
  	});
	}

	await prisma.patient.update({
  	where: { id },
  	data: { isActive: false }
	});

	res.json({ message: 'Paciente desactivado exitosamente' });

  } catch (error) {
	console.error('Error desactivando paciente:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Obtener historiales médicos de un paciente
export const getMedicalRecords = async (req: Request, res: Response) => {
  try {
	const { id } = req.params;
	const { page = 1, limit = 10 } = req.query;

	const pageNumber = parseInt(page as string);
	const limitNumber = parseInt(limit as string);
	const skip = (pageNumber - 1) * limitNumber;

	const [records, total] = await Promise.all([
  	prisma.medicalRecord.findMany({
    	where: { patientId: id },
    	skip,
    	take: limitNumber,
    	orderBy: { recordDate: 'desc' }
  	}),
  	prisma.medicalRecord.count({
    	where: { patientId: id }
  	})
	]);

	res.json({
  	records,
  	pagination: {
    	current: pageNumber,
    	total: Math.ceil(total / limitNumber),
    	totalRecords: total
  	}
	});

  } catch (error) {
	console.error('Error obteniendo historiales médicos:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Crear nuevo historial médico
export const createMedicalRecord = async (req: Request, res: Response) => {
  try {
	const { id } = req.params;
	const { error, value } = medicalRecordSchema.validate(req.body);

	if (error) {
  	return res.status(400).json({
    	error: 'Datos de entrada inválidos',
    	details: error.details.map(d => d.message)
  	});
	}

	// Verificar que el paciente exista
	const patient = await prisma.patient.findUnique({
  	where: { id }
	});

	if (!patient) {
  	return res.status(404).json({ error: 'Paciente no encontrado' });
	}

	// Procesar archivos adjuntos si existen
	const attachments = req.files ?
  	(req.files as Express.Multer.File[]).map(file => `/uploads/medical-files/${file.filename}`) :
  	[];

	const record = await prisma.medicalRecord.create({
  	data: {
    	patientId: id,
    	title: value.title,
    	description: value.description,
    	recordDate: value.recordDate ? new Date(value.recordDate) : new Date(),
    	attachments
  	}
	});

	res.status(201).json({
  	message: 'Historial médico creado exitosamente',
  	record
	});

  } catch (error) {
	console.error('Error creando historial médico:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Busqueda avanzada de pacientes
export const searchPatients = async (req: Request, res: Response) => {
  try {
	const {
  	query = '',
  	ageMin,
  	ageMax,
  	gender,
  	city,
  	hasAllergies,
  	hasMedications,
  	treatmentCategory,
  	lastVisitFrom,
  	lastVisitTo
	} = req.query;

	// Construir filtros dinámicos
	const where: any = {
  	isActive: true,
  	...(query && {
    	OR: [
      	{ firstName: { contains: query as string, mode: 'insensitive' } },
      	{ lastName: { contains: query as string, mode: 'insensitive' } },
      	{ dni: { contains: query as string } },
      	{ phone: { contains: query as string } }
    	]
  	}),
  	...(gender && { gender: gender as any }),
  	...(city && { city: { contains: city as string, mode: 'insensitive' } }),
  	...(hasAllergies === 'true' && { allergies: { not: null } }),
  	...(hasMedications === 'true' && { medications: { not: null } })
	};

	// Filtros por edad (requiere cálculo)
	if (ageMin || ageMax) {
  	const currentYear = new Date().getFullYear();
  	const birthYearMax = ageMin ? currentYear - parseInt(ageMin as string) : undefined;
  	const birthYearMin = ageMax ? currentYear - parseInt(ageMax as string) : undefined;
 	 
  	where.birthDate = {
    	...(birthYearMin && { gte: new Date(birthYearMin, 0, 1) }),
    	...(birthYearMax && { lte: new Date(birthYearMax, 11, 31) })
  	};
	}

	// Filtros por tratamiento
	if (treatmentCategory) {
  	where.treatments = {
    	some: {
      	treatment: {
        	category: { contains: treatmentCategory as string, mode: 'insensitive' }
      	}
    	}
  	};
	}

	// Filtros por última visita
	if (lastVisitFrom || lastVisitTo) {
  	where.appointments = {
    	some: {
      	startTime: {
        	...(lastVisitFrom && { gte: new Date(lastVisitFrom as string) }),
        	...(lastVisitTo && { lte: new Date(lastVisitTo as string) })
      	}
    	}
  	};
	}

	const patients = await prisma.patient.findMany({
  	where,
  	take: 50, // Limitar resultados de búsqueda
  	include: {
    	assignedTo: {
      	select: { firstName: true, lastName: true }
    	},
    	treatments: {
      	where: { status: 'ACTIVO' },
      	include: {
        	treatment: { select: { name: true, category: true } }
      	}
    	},
    	appointments: {
      	orderBy: { startTime: 'desc' },
      	take: 1,
      	select: { startTime: true }
    	}
  	},
  	orderBy: { updatedAt: 'desc' }
	});

	// Agregar edad calculada
	const patientsWithAge = patients.map(patient => ({
  	...patient,
  	age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear(),
  	lastVisit: patient.appointments[0]?.startTime || null
	}));

	res.json({
  	patients: patientsWithAge,
  	total: patientsWithAge.length
	});

  } catch (error) {
	console.error('Error en búsqueda avanzada:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};

// Estadísticas de pacientes
export const getPatientStats = async (req: Request, res: Response) => {
  try {
	const [
  	totalPatients,
  	activePatients,
  	newThisMonth,
  	byGender,
  	byCity,
  	byAge
	] = await Promise.all([
  	prisma.patient.count(),
  	prisma.patient.count({ where: { isActive: true } }),
  	prisma.patient.count({
    	where: {
      	createdAt: {
        	gte: new Date(new Date().setDate(1)) // Primer día del mes
      	}
    	}
  	}),
  	prisma.patient.groupBy({
    	by: ['gender'],
    	_count: { gender: true },
    	where: { isActive: true }
  	}),
  	prisma.patient.groupBy({
    	by: ['city'],
    	_count: { city: true },
    	where: { isActive: true },
    	orderBy: { _count: { city: 'desc' } },
    	take: 5
  	}),
  	// Para estadísticas de edad, obtener todos los pacientes activos
  	prisma.patient.findMany({
    	where: { isActive: true },
    	select: { birthDate: true }
  	})
	]);

	// Calcular distribución por edades
	const currentYear = new Date().getFullYear();
	const ageGroups = {
  	'18-25': 0,
  	'26-35': 0,
  	'36-45': 0,
  	'46-55': 0,
  	'56-65': 0,
  	'65+': 0
	};

	byAge.forEach(patient => {
  	const age = currentYear - new Date(patient.birthDate).getFullYear();
  	if (age <= 25) ageGroups['18-25']++;
  	else if (age <= 35) ageGroups['26-35']++;
  	else if (age <= 45) ageGroups['36-45']++;
  	else if (age <= 55) ageGroups['46-55']++;
  	else if (age <= 65) ageGroups['56-65']++;
  	else ageGroups['65+']++;
	});

	res.json({
  	summary: {
    	total: totalPatients,
    	active: activePatients,
    	inactive: totalPatients - activePatients,
    	newThisMonth
  	},
  	demographics: {
    	byGender: byGender.map(g => ({
      	gender: g.gender,
      	count: g._count.gender
    	})),
    	byCity: byCity.map(c => ({
      	city: c.city || 'Sin especificar',
      	count: c._count.city
    	})),
    	byAge: Object.entries(ageGroups).map(([range, count]) => ({
      	ageRange: range,
      	count
    	}))
  	}
	});

  } catch (error) {
	console.error('Error obteniendo estadísticas:', error);
	res.status(500).json({
  	error: 'Error interno del servidor',
  	details: error instanceof Error ? error.message : 'Error desconocido'
	});
  }
};
