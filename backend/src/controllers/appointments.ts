import { Request, Response } from 'express';
import { PrismaClient, AppointmentStatus, UserRole } from '@prisma/client';
import { GoogleCalendarService } from '../services/googleCalendar';
import { NotificationService } from '../services/notifications';
import { validateAppointment, validateAppointmentUpdate } from '../validators/appointment';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const googleCalendar = new GoogleCalendarService();
const notifications = new NotificationService();

export class AppointmentController {
 
  // Obtener todas las citas con filtros
  async getAppointments(req: AuthRequest, res: Response) {
	try {
  	const {
    	date,
    	patientId,
    	status,
    	userId,
    	startDate,
    	endDate,
    	page = 1,
    	limit = 20
  	} = req.query;

  	const user = req.user!;
 	 
  	// Construir filtros según permisos del usuario
  	const where: any = {};
 	 
  	// Solo médicos y admins pueden ver todas las citas
  	if (user.role === UserRole.SECRETARIA || user.role === UserRole.VIEWER) {
    	// Secretarias solo ven citas que crearon o están asignadas
    	where.OR = [
      	{ userId: user.id },
      	{ patient: { createdById: user.id } }
    	];
  	}

  	// Aplicar filtros adicionales
  	if (date) {
    	const filterDate = new Date(date as string);
    	const nextDay = new Date(filterDate);
    	nextDay.setDate(nextDay.getDate() + 1);
   	 
    	where.startTime = {
      	gte: filterDate,
      	lt: nextDay
    	};
  	}

  	if (startDate && endDate) {
    	where.startTime = {
      	gte: new Date(startDate as string),
      	lte: new Date(endDate as string)
    	};
  	}

  	if (patientId) where.patientId = patientId;
  	if (status) where.status = status;
  	if (userId) where.userId = userId;

  	const appointments = await prisma.appointment.findMany({
    	where,
    	include: {
      	patient: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	phone: true,
          	email: true
        	}
      	},
      	treatment: {
        	select: {
          	id: true,
          	name: true,
          	duration: true,
          	price: true,
          	category: true
        	}
      	},
      	user: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	role: true
        	}
      	}
    	},
    	orderBy: { startTime: 'asc' },
    	skip: (Number(page) - 1) * Number(limit),
    	take: Number(limit)
  	});

  	// Contar total para paginación
  	const total = await prisma.appointment.count({ where });

  	res.json({
    	appointments,
    	pagination: {
      	page: Number(page),
      	limit: Number(limit),
      	total,
      	pages: Math.ceil(total / Number(limit))
    	}
  	});

	} catch (error) {
  	console.error('Error fetching appointments:', error);
  	res.status(500).json({ error: 'Error al obtener citas' });
	}
  }

  // Obtener cita por ID
  async getAppointmentById(req: AuthRequest, res: Response) {
	try {
  	const { id } = req.params;
  	const user = req.user!;

  	const appointment = await prisma.appointment.findFirst({
    	where: {
      	id,
      	// Aplicar filtros de permisos
      	...(user.role === UserRole.SECRETARIA || user.role === UserRole.VIEWER
        	? {
            	OR: [
              	{ userId: user.id },
              	{ patient: { createdById: user.id } }
            	]
          	}
        	: {})
    	},
    	include: {
      	patient: true,
      	treatment: {
        	include: {
          	requiredProducts: {
            	include: { product: true }
          	}
        	}
      	},
      	user: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	role: true
        	}
      	}
    	}
  	});

  	if (!appointment) {
    	return res.status(404).json({ error: 'Cita no encontrada' });
  	}

  	res.json(appointment);

	} catch (error) {
  	console.error('Error fetching appointment:', error);
  	res.status(500).json({ error: 'Error al obtener cita' });
	}
  }

  // Crear nueva cita
  async createAppointment(req: AuthRequest, res: Response) {
	try {
  	const user = req.user!;
 	 
  	// Validar permisos
  	if (user.role === UserRole.VIEWER) {
    	return res.status(403).json({ error: 'No tienes permisos para crear citas' });
  	}

  	// Validar datos de entrada
  	const { error, value } = validateAppointment(req.body);
  	if (error) {
    	return res.status(400).json({ error: error.details[0].message });
  	}

  	const {
    	patientId,
    	treatmentId,
    	userId: assignedUserId,
    	startTime,
    	endTime,
    	notes,
    	googleSync = true
  	} = value;

  	// Verificar que el paciente existe
  	const patient = await prisma.patient.findUnique({
    	where: { id: patientId }
  	});
 	 
  	if (!patient) {
    	return res.status(404).json({ error: 'Paciente no encontrado' });
  	}

  	// Verificar que el tratamiento existe
  	const treatment = await prisma.treatment.findUnique({
    	where: { id: treatmentId }
  	});
 	 
  	if (!treatment) {
    	return res.status(404).json({ error: 'Tratamiento no encontrado' });
  	}

  	// Verificar disponibilidad de horario
  	const conflictingAppointment = await prisma.appointment.findFirst({
    	where: {
      	userId: assignedUserId,
      	status: {
        	not: AppointmentStatus.CANCELADA
      	},
      	OR: [
        	{
          	startTime: { lt: new Date(endTime) },
          	endTime: { gt: new Date(startTime) }
        	}
      	]
    	}
  	});

  	if (conflictingAppointment) {
    	return res.status(409).json({
      	error: 'Ya existe una cita en ese horario',
      	conflictingAppointment: conflictingAppointment.id
    	});
  	}

  	// Crear la cita
  	const appointment = await prisma.appointment.create({
    	data: {
      	patientId,
      	treatmentId,
      	userId: assignedUserId,
      	startTime: new Date(startTime),
      	endTime: new Date(endTime),
      	notes,
      	status: AppointmentStatus.PROGRAMADA
    	},
    	include: {
      	patient: true,
      	treatment: true,
      	user: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	email: true
        	}
      	}
    	}
  	});

  	// Sincronizar con Google Calendar si está habilitado
  	let googleEventId = null;
  	if (googleSync) {
    	try {
      	googleEventId = await googleCalendar.createEvent({
        	summary: `${treatment.name} - ${patient.firstName} ${patient.lastName}`,
        	description: `Tratamiento: ${treatment.name}\nPaciente: ${patient.firstName} ${patient.lastName}\nTeléfono: ${patient.phone}\nNotas: ${notes || 'Sin notas'}`,
        	start: new Date(startTime),
        	end: new Date(endTime),
        	attendees: [
          	{ email: patient.email, name: `${patient.firstName} ${patient.lastName}` },
          	{ email: appointment.user.email, name: `${appointment.user.firstName} ${appointment.user.lastName}` }
        	].filter(attendee => attendee.email)
      	});

      	// Actualizar cita con el ID de Google Calendar
      	await prisma.appointment.update({
        	where: { id: appointment.id },
        	data: { googleEventId }
      	});

    	} catch (googleError) {
      	console.error('Error syncing with Google Calendar:', googleError);
      	// No fallar la creación de la cita si Google Calendar falla
    	}
  	}

  	// Enviar recordatorio de confirmación
  	try {
    	await notifications.sendAppointmentConfirmation(appointment);
  	} catch (notificationError) {
    	console.error('Error sending confirmation:', notificationError);
  	}

  	res.status(201).json({
    	...appointment,
    	googleEventId
  	});

	} catch (error) {
  	console.error('Error creating appointment:', error);
  	res.status(500).json({ error: 'Error al crear cita' });
	}
  }

  // Actualizar cita
  async updateAppointment(req: AuthRequest, res: Response) {
	try {
  	const { id } = req.params;
  	const user = req.user!;

  	// Validar permisos
  	if (user.role === UserRole.VIEWER) {
    	return res.status(403).json({ error: 'No tienes permisos para modificar citas' });
  	}

  	// Validar datos de entrada
  	const { error, value } = validateAppointmentUpdate(req.body);
  	if (error) {
    	return res.status(400).json({ error: error.details[0].message });
  	}

  	// Verificar que la cita existe y el usuario tiene permisos
  	const existingAppointment = await prisma.appointment.findFirst({
    	where: {
      	id,
      	...(user.role === UserRole.SECRETARIA
        	? {
            	OR: [
              	{ userId: user.id },
              	{ patient: { createdById: user.id } }
            	]
          	}
        	: {})
    	},
    	include: {
      	patient: true,
      	treatment: true
    	}
  	});

  	if (!existingAppointment) {
    	return res.status(404).json({ error: 'Cita no encontrada' });
  	}

  	const {
    	startTime,
    	endTime,
    	status,
    	notes,
    	googleSync = true
  	} = value;

  	// Si se cambia el horario, verificar disponibilidad
  	if (startTime && endTime) {
    	const conflictingAppointment = await prisma.appointment.findFirst({
      	where: {
        	id: { not: id },
        	userId: existingAppointment.userId,
        	status: {
          	not: AppointmentStatus.CANCELADA
        	},
        	OR: [
          	{
            	startTime: { lt: new Date(endTime) },
            	endTime: { gt: new Date(startTime) }
          	}
        	]
      	}
    	});

    	if (conflictingAppointment) {
      	return res.status(409).json({
        	error: 'Ya existe una cita en ese horario',
        	conflictingAppointment: conflictingAppointment.id
      	});
    	}
  	}

  	// Actualizar la cita
  	const updatedAppointment = await prisma.appointment.update({
    	where: { id },
    	data: {
      	...(startTime && { startTime: new Date(startTime) }),
      	...(endTime && { endTime: new Date(endTime) }),
      	...(status && { status }),
      	...(notes !== undefined && { notes }),
      	updatedAt: new Date()
    	},
    	include: {
      	patient: true,
      	treatment: true,
      	user: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	email: true
        	}
      	}
    	}
  	});

  	// Sincronizar cambios con Google Calendar
  	if (googleSync && existingAppointment.googleEventId) {
    	try {
      	await googleCalendar.updateEvent(existingAppointment.googleEventId, {
        	summary: `${updatedAppointment.treatment.name} - ${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`,
        	description: `Tratamiento: ${updatedAppointment.treatment.name}\nPaciente: ${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}\nTeléfono: ${updatedAppointment.patient.phone}\nNotas: ${updatedAppointment.notes || 'Sin notas'}\nEstado: ${updatedAppointment.status}`,
        	start: updatedAppointment.startTime,
        	end: updatedAppointment.endTime
      	});
    	} catch (googleError) {
      	console.error('Error updating Google Calendar:', googleError);
    	}
  	}

  	// Enviar notificaciones según el cambio de estado
  	try {
    	if (status === AppointmentStatus.CONFIRMADA) {
      	await notifications.sendAppointmentConfirmed(updatedAppointment);
    	} else if (status === AppointmentStatus.CANCELADA) {
      	await notifications.sendAppointmentCancelled(updatedAppointment);
    	} else if (startTime || endTime) {
      	await notifications.sendAppointmentRescheduled(updatedAppointment);
    	}
  	} catch (notificationError) {
    	console.error('Error sending notification:', notificationError);
  	}

  	res.json(updatedAppointment);

	} catch (error) {
  	console.error('Error updating appointment:', error);
  	res.status(500).json({ error: 'Error al actualizar cita' });
	}
  }

  // Cancelar cita
  async cancelAppointment(req: AuthRequest, res: Response) {
	try {
  	const { id } = req.params;
  	const { reason } = req.body;
  	const user = req.user!;

  	// Validar permisos
  	if (user.role === UserRole.VIEWER) {
    	return res.status(403).json({ error: 'No tienes permisos para cancelar citas' });
  	}

  	// Verificar que la cita existe
  	const appointment = await prisma.appointment.findFirst({
    	where: {
      	id,
      	...(user.role === UserRole.SECRETARIA
        	? {
            	OR: [
              	{ userId: user.id },
              	{ patient: { createdById: user.id } }
            	]
          	}
        	: {})
    	},
    	include: {
      	patient: true,
      	treatment: true
    	}
  	});

  	if (!appointment) {
    	return res.status(404).json({ error: 'Cita no encontrada' });
  	}

  	if (appointment.status === AppointmentStatus.CANCELADA) {
    	return res.status(400).json({ error: 'La cita ya está cancelada' });
  	}

  	// Cancelar la cita
  	const cancelledAppointment = await prisma.appointment.update({
    	where: { id },
    	data: {
      	status: AppointmentStatus.CANCELADA,
      	notes: appointment.notes ?
        	`${appointment.notes}\n\nCancelada: ${reason || 'Sin motivo especificado'}` :
        	`Cancelada: ${reason || 'Sin motivo especificado'}`,
      	updatedAt: new Date()
    	},
    	include: {
      	patient: true,
      	treatment: true,
      	user: {
        	select: {
          	id: true,
          	firstName: true,
          	lastName: true,
          	email: true
        	}
      	}
    	}
  	});

  	// Cancelar en Google Calendar
  	if (appointment.googleEventId) {
    	try {
      	await googleCalendar.cancelEvent(appointment.googleEventId);
    	} catch (googleError) {
      	console.error('Error cancelling Google Calendar event:', googleError);
    	}
  	}

  	// Enviar notificación de cancelación
  	try {
    	await notifications.sendAppointmentCancelled(cancelledAppointment, reason);
  	} catch (notificationError) {
    	console.error('Error sending cancellation notification:', notificationError);
  	}

  	res.json(cancelledAppointment);

	} catch (error) {
  	console.error('Error cancelling appointment:', error);
  	res.status(500).json({ error: 'Error al cancelar cita' });
	}
  }

  // Marcar cita como completada
  async completeAppointment(req: AuthRequest, res: Response) {
	try {
  	const { id } = req.params;
  	const { notes, treatmentNotes } = req.body;
  	const user = req.user!;

  	// Solo médicos pueden completar citas
  	if (user.role !== UserRole.MEDICO && user.role !== UserRole.ADMIN) {
    	return res.status(403).json({ error: 'Solo médicos pueden completar citas' });
  	}

  	const appointment = await prisma.appointment.findUnique({
    	where: { id },
    	include: {
      	patient: true,
      	treatment: {
        	include: {
          	requiredProducts: {
            	include: { product: true }
          	}
        	}
      	}
    	}
  	});

  	if (!appointment) {
    	return res.status(404).json({ error: 'Cita no encontrada' });
  	}

  	if (appointment.status === AppointmentStatus.COMPLETADA) {
    	return res.status(400).json({ error: 'La cita ya está completada' });
  	}

  	// Iniciar transacción para completar la cita y actualizar stock
  	const result = await prisma.$transaction(async (tx) => {
    	// Marcar cita como completada
    	const completedAppointment = await tx.appointment.update({
      	where: { id },
      	data: {
        	status: AppointmentStatus.COMPLETADA,
        	notes: notes || appointment.notes,
        	updatedAt: new Date()
      	},
      	include: {
        	patient: true,
        	treatment: true
      	}
    	});

    	// Crear registro médico si hay notas del tratamiento
    	if (treatmentNotes) {
      	await tx.medicalRecord.create({
        	data: {
          	patientId: appointment.patientId,
          	title: `Tratamiento: ${appointment.treatment.name}`,
          	description: treatmentNotes,
          	recordDate: new Date()
        	}
      	});
    	}

    	// Descontar productos del stock
    	for (const requiredProduct of appointment.treatment.requiredProducts) {
      	// Crear movimiento de stock
      	await tx.stockMovement.create({
        	data: {
          	productId: requiredProduct.productId,
          	userId: user.id,
          	type: 'USO_TRATAMIENTO',
          	quantity: -requiredProduct.quantity,
          	reason: `Uso en tratamiento: ${appointment.treatment.name}`,
          	reference: appointment.id
        	}
      	});

      	// Actualizar stock actual del producto
      	await tx.product.update({
        	where: { id: requiredProduct.productId },
        	data: {
          	currentStock: {
            	decrement: requiredProduct.quantity
          	}
        	}
      	});
    	}

    	// Actualizar progreso del tratamiento del paciente
    	const patientTreatment = await tx.patientTreatment.findFirst({
      	where: {
        	patientId: appointment.patientId,
        	treatmentId: appointment.treatmentId,
        	status: 'ACTIVO'
      	}
    	});

    	if (patientTreatment) {
      	const newCompletedSessions = patientTreatment.completedSessions + 1;
      	const shouldComplete = newCompletedSessions >= patientTreatment.sessions;

      	await tx.patientTreatment.update({
        	where: { id: patientTreatment.id },
        	data: {
          	completedSessions: newCompletedSessions,
          	status: shouldComplete ? 'COMPLETADO' : 'ACTIVO',
          	...(shouldComplete && { endDate: new Date() })
        	}
      	});
    	}

    	return completedAppointment;
  	});

  	res.json(result);

	} catch (error) {
  	console.error('Error completing appointment:', error);
  	res.status(500).json({ error: 'Error al completar cita' });
	}
  }

  // Obtener disponibilidad de horarios
  async getAvailability(req: AuthRequest, res: Response) {
	try {
  	const { userId, date, treatmentId } = req.query;

  	if (!userId || !date) {
    	return res.status(400).json({ error: 'userId y date son requeridos' });
  	}

  	const queryDate = new Date(date as string);
  	const nextDay = new Date(queryDate);
  	nextDay.setDate(nextDay.getDate() + 1);

  	// Obtener tratamiento para conocer la duración
  	let treatmentDuration = 60; // por defecto 60 minutos
  	if (treatmentId) {
    	const treatment = await prisma.treatment.findUnique({
      	where: { id: treatmentId as string }
    	});
    	if (treatment) {
      	treatmentDuration = treatment.duration;
    	}
  	}

  	// Obtener citas existentes del día
  	const existingAppointments = await prisma.appointment.findMany({
    	where: {
      	userId: userId as string,
      	startTime: {
        	gte: queryDate,
        	lt: nextDay
      	},
      	status: {
        	not: AppointmentStatus.CANCELADA
      	}
    	},
    	select: {
      	startTime: true,
      	endTime: true
    	},
    	orderBy: { startTime: 'asc' }
  	});

  	// Generar slots disponibles (ejemplo: de 9:00 a 18:00, cada 30 minutos)
  	const availableSlots = [];
  	const startHour = 9;
  	const endHour = 18;
  	const slotInterval = 30; // minutos

  	for (let hour = startHour; hour < endHour; hour++) {
    	for (let minute = 0; minute < 60; minute += slotInterval) {
      	const slotStart = new Date(queryDate);
      	slotStart.setHours(hour, minute, 0, 0);
     	 
      	const slotEnd = new Date(slotStart);
      	slotEnd.setMinutes(slotEnd.getMinutes() + treatmentDuration);

      	// Verificar si el slot está disponible
      	const isAvailable = !existingAppointments.some(appointment => {
        	return (
          	slotStart < appointment.endTime &&
          	slotEnd > appointment.startTime
        	);
      	});

      	if (isAvailable && slotEnd.getHours() <= endHour) {
        	availableSlots.push({
          	start: slotStart.toISOString(),
          	end: slotEnd.toISOString(),
          	duration: treatmentDuration
        	});
      	}
    	}
  	}

  	res.json({
    	date: queryDate.toISOString().split('T')[0],
    	userId,
    	treatmentDuration,
    	availableSlots,
    	existingAppointments: existingAppointments.map(apt => ({
      	start: apt.startTime.toISOString(),
      	end: apt.endTime.toISOString()
    	}))
  	});

	} catch (error) {
  	console.error('Error getting availability:', error);
  	res.status(500).json({ error: 'Error al obtener disponibilidad' });
	}
  }

  // Obtener estadísticas de citas
  async getAppointmentStats(req: AuthRequest, res: Response) {
	try {
  	const user = req.user!;
  	const { startDate, endDate } = req.query;

  	// Validar permisos
  	if (user.role === UserRole.VIEWER) {
    	// Los viewers pueden ver estadísticas básicas
  	}

  	const dateFilter = startDate && endDate ? {
    	startTime: {
      	gte: new Date(startDate as string),
      	lte: new Date(endDate as string)
    	}
  	} : {};

  	// Aplicar filtros según rol
  	const baseWhere = {
    	...dateFilter,
    	...(user.role === UserRole.SECRETARIA ? {
      	OR: [
        	{ userId: user.id },
        	{ patient: { createdById: user.id } }
      	]
    	} : {})
  	};

  	// Estadísticas por estado
  	const statusStats = await prisma.appointment.groupBy({
    	by: ['status'],
    	where: baseWhere,
    	_count: { status: true }
  	});

  	// Total de citas
  	const totalAppointments = await prisma.appointment.count({
    	where: baseWhere
  	});

  	// Citas de hoy
  	const today = new Date();
  	const tomorrow = new Date(today);
  	tomorrow.setDate(tomorrow.getDate() + 1);
 	 
  	const todayAppointments = await prisma.appointment.count({
    	where: {
      	...baseWhere,
      	startTime: {
        	gte: today,
        	lt: tomorrow
      	}
    	}
  	});

  	// Próximas citas (próximos 7 días)
  	const nextWeek = new Date(today);
  	nextWeek.setDate(nextWeek.getDate() + 7);
 	 
  	const upcomingAppointments = await prisma.appointment.count({
    	where: {
      	...baseWhere,
      	startTime: {
        	gte: today,
        	lt: nextWeek
      	},
      	status: {
        	in: [AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA]
      	}
    	}
  	});

  	// Tratamientos más solicitados
  	const popularTreatments = await prisma.appointment.groupBy({
    	by: ['treatmentId'],
    	where: baseWhere,
    	_count: { treatmentId: true },
    	orderBy: { _count: { treatmentId: 'desc' } },
    	take: 5
  	});

  	const treatmentDetails = await prisma.treatment.findMany({
    	where: {
      	id: { in: popularTreatments.map(t => t.treatmentId) }
    	},
    	select: { id: true, name: true, category: true }
  	});

  	const popularTreatmentsWithDetails = popularTreatments.map(stat => {
    	const treatment = treatmentDetails.find(t => t.id === stat.treatmentId);
    	return {
      	treatment,
      	count: stat._count.treatmentId
    	};
  	});

  	res.json({
    	totalAppointments,
    	todayAppointments,
    	upcomingAppointments,
    	statusStats: statusStats.map(stat => ({
      	status: stat.status,
      	count: stat._count.status
    	})),
    	popularTreatments: popularTreatmentsWithDetails,
    	period: {
      	startDate: startDate || 'all',
      	endDate: endDate || 'all'
    	}
  	});

	} catch (error) {
  	console.error('Error getting appointment stats:', error);
  	res.status(500).json({ error: 'Error al obtener estadísticas' });
	}
  }
}
