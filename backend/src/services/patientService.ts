import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const prisma = new PrismaClient();

// Configurar transporter de email
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
	user: process.env.SMTP_USER,
	pass: process.env.SMTP_PASS
  }
});

export class PatientService {
 
  // Enviar recordatorio de cita por email
  static async sendAppointmentReminder(patientId: string, appointmentId: string) {
	try {
  	const appointment = await prisma.appointment.findUnique({
    	where: { id: appointmentId },
    	include: {
      	patient: true,
      	treatment: true,
      	user: true
    	}
  	});

  	if (!appointment || !appointment.patient.email) {
    	return false;
  	}

  	const appointmentDate = format(appointment.startTime, "dd 'de' MMMM 'de' yyyy", { locale: es });
  	const appointmentTime = format(appointment.startTime, 'HH:mm');

  	const mailOptions = {
    	from: process.env.SMTP_FROM || process.env.SMTP_USER,
    	to: appointment.patient.email,
    	subject: `Recordatorio de Cita - ${appointment.treatment.name}`,
    	html: `
      	<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        	<h2 style="color: #2c5aa0;">Centro de Medicina Estética</h2>
        	<p>Estimado/a ${appointment.patient.firstName} ${appointment.patient.lastName},</p>
       	 
        	<p>Le recordamos que tiene una cita programada:</p>
       	 
        	<div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          	<h3 style="margin: 0; color: #333;">Detalles de la Cita</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Profesional:</strong> Dr/a. ${appointment.user.firstName} ${appointment.user.lastName}</p>
        	</div>
       	 
        	<p>Si necesita reprogramar o cancelar su cita, por favor contáctenos con al menos 24 horas de anticipación.</p>
       	 
        	<p style="color: #666; font-size: 14px;">
          	Centro de Medicina Estética<br>
          	Córdoba Capital, Argentina<br>
          	Tel: ${process.env.CLINIC_PHONE || '(351) 123-4567'}
        	</p>
      	</div>
    	`
  	};

  	await transporter.sendMail(mailOptions);
  	return true;

	} catch (error) {
  	console.error('Error enviando recordatorio:', error);
  	return false;
	}
  }

  // Generar ficha médica en PDF
  static async generateMedicalCard(patientId: string) {
	try {
  	const patient = await prisma.patient.findUnique({
    	where: { id: patientId },
    	include: {
      	medicalRecords: {
        	orderBy: { recordDate: 'desc' },
        	take: 10
      	},
      	treatments: {
        	include: {
          	treatment: true
        	},
        	where: { status: 'ACTIVO' }
      	},
      	appointments: {
        	where: {
          	status: 'COMPLETADA',
          	startTime: {
            	gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Últimos 90 días
          	}
        	},
        	orderBy: { startTime: 'desc' },
        	include: {
          	treatment: true,
          	user: true
        	}
      	}
    	}
  	});

  	if (!patient) {
    	throw new Error('Paciente no encontrado');
  	}

  	// Aquí integrarías una librería como PDFKit o similar
  	// Por ahora retornamos los datos estructurados
  	return {
    	patient: {
      	...patient,
      	age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    	},
    	summary: {
      	activeTreatments: patient.treatments.length,
      	recentVisits: patient.appointments.length,
      	lastRecord: patient.medicalRecords[0]?.recordDate || null
    	}
  	};

	} catch (error) {
  	console.error('Error generando ficha médica:', error);
  	throw error;
	}
  }

  // Verificar duplicados antes de crear paciente
  static async checkDuplicates(dni: string, email?: string, excludeId?: string) {
	const where: any = {
  	OR: [
    	{ dni },
    	...(email ? [{ email }] : [])
  	]
	};

	if (excludeId) {
  	where.id = { not: excludeId };
	}

	const duplicates = await prisma.patient.findMany({
  	where,
  	select: {
    	id: true,
    	firstName: true,
    	lastName: true,
    	dni: true,
    	email: true,
    	phone: true
  	}
	});

	return {
  	hasDuplicates: duplicates.length > 0,
  	duplicates
	};
  }

  // Obtener historial completo de un paciente
  static async getPatientHistory(patientId: string) {
	try {
  	const [patient, medicalRecords, appointments, treatments, invoices] = await Promise.all([
    	prisma.patient.findUnique({
      	where: { id: patientId },
      	include: {
        	createdBy: { select: { firstName: true, lastName: true } },
        	assignedTo: { select: { firstName: true, lastName: true } }
      	}
    	}),
    	prisma.medicalRecord.findMany({
      	where: { patientId },
      	orderBy: { recordDate: 'desc' }
    	}),
    	prisma.appointment.findMany({
      	where: { patientId },
      	include: {
        	treatment: { select: { name: true, category: true } },
        	user: { select: { firstName: true, lastName: true } }
      	},
      	orderBy: { startTime: 'desc' }
    	}),
    	prisma.patientTreatment.findMany({
      	where: { patientId },
      	include: {
        	treatment: { select: { name: true, category: true, price: true } }
      	},
      	orderBy: { startDate: 'desc' }
    	}),
    	prisma.invoice.findMany({
      	where: { patientId },
      	include: {
        	items: {
          	include: {
            	treatment: { select: { name: true } },
            	product: { select: { name: true } }
          	}
        	},
        	payments: true
      	},
      	orderBy: { invoiceDate: 'desc' }
    	})
  	]);

  	if (!patient) {
    	throw new Error('Paciente no encontrado');
  	}

  	// Crear timeline de eventos
  	const timeline = [];

  	// Agregar registros médicos
  	medicalRecords.forEach(record => {
    	timeline.push({
      	type: 'medical_record',
      	date: record.recordDate,
      	title: record.title,
      	description: record.description,
      	data: record
    	});
  	});

  	// Agregar citas
  	appointments.forEach(appointment => {
    	timeline.push({
      	type: 'appointment',
      	date: appointment.startTime,
      	title: `Cita - ${appointment.treatment.name}`,
      	description: `${appointment.status} - Dr/a. ${appointment.user.firstName} ${appointment.user.lastName}`,
      	data: appointment
    	});
  	});

  	// Agregar tratamientos
  	treatments.forEach(treatment => {
    	timeline.push({
      	type: 'treatment',
      	date: treatment.startDate,
      	title: `Inicio de tratamiento: ${treatment.treatment.name}`,
      	description: `${treatment.sessions} sesiones - Estado: ${treatment.status}`,
      	data: treatment
    	});
  	});

  	// Agregar facturas
  	invoices.forEach(invoice => {
    	timeline.push({
      	type: 'invoice',
      	date: invoice.invoiceDate,
      	title: `Factura ${invoice.invoiceNumber}`,
      	description: `${invoice.total} - ${invoice.status}`,
      	data: invoice
    	});
  	});

  	// Ordenar timeline por fecha descendente
  	timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  	return {
    	patient: {
      	...patient,
      	age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear()
    	},
    	timeline,
    	summary: {
      	totalAppointments: appointments.length,
      	completedAppointments: appointments.filter(a => a.status === 'COMPLETADA').length,
      	activeTreatments: treatments.filter(t => t.status === 'ACTIVO').length,
      	totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      	pendingPayments: invoices.filter(inv => inv.status === 'PENDIENTE').length,
      	lastVisit: appointments.find(a => a.status === 'COMPLETADA')?.startTime || null
    	}
  	};

	} catch (error) {
  	console.error('Error obteniendo historial del paciente:', error);
  	throw error;
	}
  }

  // Validar disponibilidad para nuevo tratamiento
  static async validateTreatmentAvailability(patientId: string, treatmentId: string) {
	try {
  	// Verificar si ya tiene el mismo tratamiento activo
  	const activeTreatment = await prisma.patientTreatment.findFirst({
    	where: {
      	patientId,
      	treatmentId,
      	status: 'ACTIVO'
    	}
  	});

  	if (activeTreatment) {
    	return {
      	available: false,
      	reason: 'El paciente ya tiene este tratamiento activo'
    	};
  	}

  	// Verificar tratamientos incompatibles (esto se puede personalizar)
  	const treatment = await prisma.treatment.findUnique({
    	where: { id: treatmentId }
  	});

  	if (!treatment) {
    	return {
      	available: false,
      	reason: 'Tratamiento no encontrado'
    	};
  	}

  	// Verificar contraindicaciones basadas en alergias del paciente
  	const patient = await prisma.patient.findUnique({
    	where: { id: patientId },
    	select: { allergies: true, medications: true }
  	});

  	if (patient?.allergies && treatment.category === 'INYECTABLE') {
    	return {
      	available: true,
      	warnings: ['Verificar alergias del paciente antes del tratamiento inyectable']
    	};
  	}

  	return {
    	available: true,
    	warnings: []
  	};

	} catch (error) {
  	console.error('Error validando disponibilidad de tratamiento:', error);
  	throw error;
	}
  }

  // Programar recordatorios automáticos
  static async scheduleReminders(patientId: string) {
	try {
  	const upcomingAppointments = await prisma.appointment.findMany({
    	where: {
      	patientId,
      	startTime: {
        	gte: new Date(),
        	lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 días
      	},
      	status: { in: ['PROGRAMADA', 'CONFIRMADA'] }
    	},
    	include: {
      	patient: { select: { email: true, phone: true } },
      	treatment: { select: { name: true } }
    	}
  	});

  	const reminders = [];

  	for (const appointment of upcomingAppointments) {
    	if (appointment.patient.email) {
      	// Programar recordatorio 24 horas antes
      	const reminderTime = new Date(appointment.startTime.getTime() - 24 * 60 * 60 * 1000);
     	 
      	if (reminderTime > new Date()) {
        	reminders.push({
          	appointmentId: appointment.id,
          	reminderTime,
          	type: 'email',
          	status: 'scheduled'
        	});
      	}
    	}
  	}

  	return reminders;

	} catch (error) {
  	console.error('Error programando recordatorios:', error);
  	throw error;
	}
  }

  // Calcular métricas del paciente
  static async calculatePatientMetrics(patientId: string) {
	try {
  	const [appointments, treatments, invoices] = await Promise.all([
    	prisma.appointment.findMany({
      	where: { patientId },
      	select: { status: true, startTime: true }
    	}),
    	prisma.patientTreatment.findMany({
      	where: { patientId },
      	select: { status: true, sessions: true, completedSessions: true }
    	}),
    	prisma.invoice.findMany({
      	where: { patientId },
      	select: { total: true, status: true, invoiceDate: true }
    	})
  	]);

  	const metrics = {
    	adherence: {
      	totalAppointments: appointments.length,
      	completedAppointments: appointments.filter(a => a.status === 'COMPLETADA').length,
      	canceledAppointments: appointments.filter(a => a.status === 'CANCELADA').length,
      	noShowAppointments: appointments.filter(a => a.status === 'NO_ASISTIO').length,
      	adherenceRate: appointments.length > 0 ?
        	(appointments.filter(a => a.status === 'COMPLETADA').length / appointments.length) * 100 : 0
    	},
    	treatments: {
      	total: treatments.length,
      	active: treatments.filter(t => t.status === 'ACTIVO').length,
      	completed: treatments.filter(t => t.status === 'COMPLETADO').length,
      	suspended: treatments.filter(t => t.status === 'SUSPENDIDO').length,
      	completionRate: treatments.length > 0 ?
        	treatments.reduce((acc, t) => acc + (t.completedSessions / t.sessions), 0) / treatments.length * 100 : 0
    	},
    	financial: {
      	totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      	paidInvoices: invoices.filter(inv => inv.status === 'PAGADA').length,
      	pendingInvoices: invoices.filter(inv => inv.status === 'PENDIENTE').length,
      	averageInvoiceAmount: invoices.length > 0 ?
        	invoices.reduce((sum, inv) => sum + Number(inv.total), 0) / invoices.length : 0,
      	paymentCompliance: invoices.length > 0 ?
        	(invoices.filter(inv => inv.status === 'PAGADA').length / invoices.length) * 100 : 0
    	},
    	activity: {
      	firstVisit: appointments.length > 0 ?
        	appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0].startTime : null,
      	lastVisit: appointments.length > 0 ?
        	appointments.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0].startTime : null,
      	totalVisits: appointments.filter(a => a.status === 'COMPLETADA').length,
      	monthsSinceFirstVisit: appointments.length > 0 ?
        	Math.floor((Date.now() - new Date(appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0].startTime).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0
    	}
  	};

  	return metrics;

	} catch (error) {
  	console.error('Error calculando métricas del paciente:', error);
  	throw error;
	}
  }
}
