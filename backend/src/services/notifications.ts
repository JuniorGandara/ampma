import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

interface AppointmentData {
  id: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  patient: {
	firstName: string;
	lastName: string;
	email?: string;
	phone: string;
  };
  treatment: {
	name: string;
	duration: number;
	price: number;
  };
  user: {
	firstName: string;
	lastName: string;
	email?: string;
  };
}

export class NotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private isEmailEnabled: boolean = false;

  constructor() {
	this.initializeEmail();
  }

  private async initializeEmail() {
	try {
  	// Verificar si las notificaciones están habilitadas
  	this.isEmailEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';
 	 
  	if (!this.isEmailEnabled) {
    	console.log('📧 Notificaciones por email deshabilitadas');
    	return;
  	}

  	// Configurar transporter de email
  	this.transporter = nodemailer.createTransporter({
    	host: process.env.SMTP_HOST || 'smtp.gmail.com',
    	port: parseInt(process.env.SMTP_PORT || '587'),
    	secure: process.env.SMTP_SECURE === 'true',
    	auth: {
      	user: process.env.SMTP_USER,
      	pass: process.env.SMTP_PASS
    	}
  	});

  	// Verificar conexión
  	await this.transporter.verify();
  	console.log('✅ Servicio de email inicializado correctamente');

	} catch (error) {
  	console.error('❌ Error inicializando servicio de email:', error);
  	this.isEmailEnabled = false;
	}
  }

  // Enviar confirmación de cita creada
  async sendAppointmentConfirmation(appointment: AppointmentData): Promise<void> {
	try {
  	const subject = `Confirmación de Cita - ${appointment.treatment.name}`;
  	const html = this.generateConfirmationEmailHTML(appointment);

  	await this.sendEmail(appointment.patient.email, subject, html);
 	 
  	// También enviar al profesional
  	if (appointment.user.email) {
    	const professionalSubject = `Nueva Cita Programada - ${appointment.patient.firstName} ${appointment.patient.lastName}`;
    	const professionalHtml = this.generateProfessionalNotificationHTML(appointment, 'programada');
    	await this.sendEmail(appointment.user.email, professionalSubject, professionalHtml);
  	}

  	console.log(`✅ Confirmación enviada para cita ${appointment.id}`);

	} catch (error) {
  	console.error('❌ Error enviando confirmación de cita:', error);
  	throw error;
	}
  }

  // Enviar notificación de cita confirmada
  async sendAppointmentConfirmed(appointment: AppointmentData): Promise<void> {
	try {
  	const subject = `Cita Confirmada - ${appointment.treatment.name}`;
  	const html = this.generateConfirmedEmailHTML(appointment);

  	await this.sendEmail(appointment.patient.email, subject, html);
  	console.log(`✅ Notificación de confirmación enviada para cita ${appointment.id}`);

	} catch (error) {
  	console.error('❌ Error enviando notificación de cita confirmada:', error);
  	throw error;
	}
  }

  // Enviar notificación de cita cancelada
  async sendAppointmentCancelled(appointment: AppointmentData, reason?: string): Promise<void> {
	try {
  	const subject = `Cita Cancelada - ${appointment.treatment.name}`;
  	const html = this.generateCancelledEmailHTML(appointment, reason);

  	await this.sendEmail(appointment.patient.email, subject, html);
  	console.log(`✅ Notificación de cancelación enviada para cita ${appointment.id}`);

	} catch (error) {
  	console.error('❌ Error enviando notificación de cancelación:', error);
  	throw error;
	}
  }

  // Enviar notificación de cita reprogramada
  async sendAppointmentRescheduled(appointment: AppointmentData): Promise<void> {
	try {
  	const subject = `Cita Reprogramada - ${appointment.treatment.name}`;
  	const html = this.generateRescheduledEmailHTML(appointment);

  	await this.sendEmail(appointment.patient.email, subject, html);
  	console.log(`✅ Notificación de reprogramación enviada para cita ${appointment.id}`);

	} catch (error) {
  	console.error('❌ Error enviando notificación de reprogramación:', error);
  	throw error;
	}
  }

  // Enviar recordatorio de cita
  async sendAppointmentReminder(appointment: AppointmentData, hoursBeforeType: '24h' | '2h'): Promise<void> {
	try {
  	const reminderText = hoursBeforeType === '24h' ? 'mañana' : 'dentro de 2 horas';
  	const subject = `Recordatorio: Su cita es ${reminderText}`;
  	const html = this.generateReminderEmailHTML(appointment, hoursBeforeType);

  	await this.sendEmail(appointment.patient.email, subject, html);
  	console.log(`✅ Recordatorio ${hoursBeforeType} enviado para cita ${appointment.id}`);

	} catch (error) {
  	console.error(`❌ Error enviando recordatorio ${hoursBeforeType}:`, error);
  	throw error;
	}
  }

  // Función privada para enviar emails
  private async sendEmail(to?: string, subject: string, html: string): Promise<void> {
	if (!this.isEmailEnabled || !this.transporter || !to) {
  	console.warn('⚠️ Email no enviado - servicio deshabilitado o email no disponible');
  	return;
	}

	try {
  	await this.transporter.sendMail({
    	from: `"${process.env.CLINIC_NAME || 'Medicina Estética'}" <${process.env.SMTP_USER}>`,
    	to,
    	subject,
    	html
  	});

	} catch (error) {
  	console.error('❌ Error enviando email:', error);
  	throw error;
	}
  }

  // Generar HTML para confirmación de cita
  private generateConfirmationEmailHTML(appointment: AppointmentData): string {
	const appointmentDate = appointment.startTime.toLocaleDateString('es-AR', {
  	weekday: 'long',
  	year: 'numeric',
  	month: 'long',
  	day: 'numeric'
	});

	const appointmentTime = appointment.startTime.toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
	});

	const reminderTitle = type === '24h' ? 'Recordatorio: Su cita es mañana' : 'Recordatorio: Su cita es en 2 horas';
	const reminderMessage = type === '24h' ? 'mañana' : 'dentro de 2 horas';

	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>${reminderTitle}</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      	.highlight { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>🔔 ${reminderTitle}</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong>,</p>
       	 
        	<p>Le recordamos que tiene una cita programada <strong>${reminderMessage}</strong>.</p>
       	 
        	<div class="appointment-details">
          	<h3>Detalles de su Cita:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Profesional:</strong> ${appointment.user.firstName} ${appointment.user.lastName}</p>
        	</div>
       	 
        	<div class="highlight">
          	<p><strong>Recordatorios importantes:</strong></p>
          	<ul>
            	<li>Llegue 10 minutos antes de su cita</li>
            	<li>Traiga su documento de identidad</li>
            	<li>Si necesita cancelar, contáctenos lo antes posible</li>
          	</ul>
        	</div>
       	 
        	<p>¡Nos vemos pronto!</p>
      	</div>
     	 
      	<div class="footer">
        	<p>${process.env.CLINIC_NAME || 'Medicina Estética'}<br>
        	${process.env.CLINIC_ADDRESS || 'Córdoba, Argentina'}<br>
        	${process.env.CLINIC_PHONE || ''} | ${process.env.CLINIC_EMAIL || ''}</p>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Generar HTML para notificaciones al profesional
  private generateProfessionalNotificationHTML(appointment: AppointmentData, action: string): string {
	const appointmentDate = appointment.startTime.toLocaleDateString('es-AR', {
  	weekday: 'long',
  	year: 'numeric',
  	month: 'long',
  	day: 'numeric'
	});

	const appointmentTime = appointment.startTime.toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
	});

	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>Notificación de Agenda</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.patient-info { background: #e9ecef; padding: 10px; border-radius: 3px; margin: 10px 0; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>📋 Cita ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>Dr./Dra. ${appointment.user.firstName} ${appointment.user.lastName}</strong>,</p>
       	 
        	<p>Se ha ${action} una nueva cita en su agenda.</p>
       	 
        	<div class="appointment-details">
          	<h3>Detalles de la Cita:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Duración:</strong> ${appointment.treatment.duration} minutos</p>
          	${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
        	</div>
       	 
        	<div class="patient-info">
          	<h3>Información del Paciente:</h3>
          	<p><strong>Nombre:</strong> ${appointment.patient.firstName} ${appointment.patient.lastName}</p>
          	<p><strong>Teléfono:</strong> ${appointment.patient.phone}</p>
          	${appointment.patient.email ? `<p><strong>Email:</strong> ${appointment.patient.email}</p>` : ''}
        	</div>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Programar recordatorios automáticos
  async scheduleReminders(appointment: AppointmentData): Promise<void> {
	try {
  	// Este método sería llamado desde un job scheduler como node-cron
  	// Por ahora, simplemente logueamos que se programó
  	console.log(`📅 Recordatorios programados para cita ${appointment.id}:
    	- 24 horas antes: ${new Date(appointment.startTime.getTime() - 24 * 60 * 60 * 1000)}
    	- 2 horas antes: ${new Date(appointment.startTime.getTime() - 2 * 60 * 60 * 1000)}`);

  	// En una implementación real, aquí programarías los jobs con node-cron o similar
  	// cron.schedule('0 9 * * *', () => this.checkAndSendDailyReminders());
  	// cron.schedule('*/30 * * * *', () => this.checkAndSend2HourReminders());

	} catch (error) {
  	console.error('❌ Error programando recordatorios:', error);
	}
  }

  // Verificar y enviar recordatorios diarios (para ejecutar con cron)
  async checkAndSendDailyReminders(): Promise<void> {
	const prisma = new PrismaClient();
    
	try {
  	const tomorrow = new Date();
  	tomorrow.setDate(tomorrow.getDate() + 1);
  	tomorrow.setHours(0, 0, 0, 0);
 	 
  	const dayAfterTomorrow = new Date(tomorrow);
  	dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  	const tomorrowAppointments = await prisma.appointment.findMany({
    	where: {
      	startTime: {
        	gte: tomorrow,
        	lt: dayAfterTomorrow
      	},
      	status: {
        	in: ['PROGRAMADA', 'CONFIRMADA']
      	}
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

  	for (const appointment of tomorrowAppointments) {
    	await this.sendAppointmentReminder(appointment, '24h');
   	 
    	// Pequeña pausa entre envíos para no sobrecargar
    	await new Promise(resolve => setTimeout(resolve, 1000));
  	}

  	console.log(`✅ Enviados ${tomorrowAppointments.length} recordatorios de 24h`);

	} catch (error) {
  	console.error('❌ Error enviando recordatorios diarios:', error);
	} finally {
  	await prisma.$disconnect();
	}
  }

  // Verificar y enviar recordatorios de 2 horas (para ejecutar con cron)
  async checkAndSend2HourReminders(): Promise<void> {
	const prisma = new PrismaClient();
    
	try {
  	const now = new Date();
  	const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  	const in2Hours15Min = new Date(now.getTime() + 2.25 * 60 * 60 * 1000);

  	const upcomingAppointments = await prisma.appointment.findMany({
    	where: {
      	startTime: {
        	gte: in2Hours,
        	lt: in2Hours15Min
      	},
      	status: {
        	in: ['PROGRAMADA', 'CONFIRMADA']
      	}
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

  	for (const appointment of upcomingAppointments) {
    	await this.sendAppointmentReminder(appointment, '2h');
   	 
    	// Pequeña pausa entre envíos
    	await new Promise(resolve => setTimeout(resolve, 1000));
  	}

  	console.log(`✅ Enviados ${upcomingAppointments.length} recordatorios de 2h`);

	} catch (error) {
  	console.error('❌ Error enviando recordatorios de 2h:', error);
	} finally {
  	await prisma.$disconnect();
	}
  }

  // Verificar estado del servicio
  async getServiceStatus(): Promise<{
	emailEnabled: boolean;
	smtpConnected: boolean;
	lastTestResult?: boolean;
  }> {
	let smtpConnected = false;
	let lastTestResult;

	if (this.isEmailEnabled && this.transporter) {
  	try {
    	lastTestResult = await this.transporter.verify();
    	smtpConnected = lastTestResult;
  	} catch (error) {
    	console.error('❌ Error verificando conexión SMTP:', error);
    	smtpConnected = false;
    	lastTestResult = false;
  	}
	}

	return {
  	emailEnabled: this.isEmailEnabled,
  	smtpConnected,
  	lastTestResult
	};
  }

  // Enviar email de prueba
  async sendTestEmail(to: string): Promise<boolean> {
	try {
  	const testSubject = 'Prueba de Notificaciones - Medicina Estética';
  	const testHtml = `
    	<h2>✅ Prueba de Email Exitosa</h2>
    	<p>Este es un email de prueba del sistema de notificaciones.</p>
    	<p>Si recibe este mensaje, las notificaciones están funcionando correctamente.</p>
    	<p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
  	`;

  	await this.sendEmail(to, testSubject, testHtml);
  	console.log(`✅ Email de prueba enviado a ${to}`);
  	return true;

	} catch (error) {
  	console.error('❌ Error enviando email de prueba:', error);
  	return false;
	}
  }
}
	});

	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>Confirmación de Cita</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #007bff; color: white; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      	.button { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>Confirmación de Cita</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong>,</p>
       	 
        	<p>Hemos recibido su solicitud de cita y la hemos programado exitosamente.</p>
       	 
        	<div class="appointment-details">
          	<h3>Detalles de su Cita:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Duración:</strong> ${appointment.treatment.duration} minutos</p>
          	<p><strong>Profesional:</strong> ${appointment.user.firstName} ${appointment.user.lastName}</p>
          	${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
        	</div>
       	 
        	<p><strong>Importante:</strong></p>
        	<ul>
          	<li>Por favor llegue 10 minutos antes de su cita</li>
          	<li>Si necesita cancelar, hágalo con al menos 24 horas de anticipación</li>
          	<li>Traiga su documento de identidad</li>
        	</ul>
       	 
        	<p>Si tiene alguna pregunta, no dude en contactarnos al ${process.env.CLINIC_PHONE || 'teléfono de la clínica'}.</p>
      	</div>
     	 
      	<div class="footer">
        	<p>${process.env.CLINIC_NAME || 'Medicina Estética'}<br>
        	${process.env.CLINIC_ADDRESS || 'Córdoba, Argentina'}<br>
        	${process.env.CLINIC_PHONE || ''} | ${process.env.CLINIC_EMAIL || ''}</p>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Generar HTML para cita confirmada
  private generateConfirmedEmailHTML(appointment: AppointmentData): string {
	const appointmentDate = appointment.startTime.toLocaleDateString('es-AR', {
  	weekday: 'long',
  	year: 'numeric',
  	month: 'long',
  	day: 'numeric'
	});

	const appointmentTime = appointment.startTime.toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
	});

	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>Cita Confirmada</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #28a745; color: white; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>✅ Cita Confirmada</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong>,</p>
       	 
        	<p>Su cita ha sido <strong>confirmada</strong> exitosamente.</p>
       	 
        	<div class="appointment-details">
          	<h3>Detalles Confirmados:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Profesional:</strong> ${appointment.user.firstName} ${appointment.user.lastName}</p>
        	</div>
       	 
        	<p>Nos vemos pronto. ¡Gracias por confiar en nosotros!</p>
      	</div>
     	 
      	<div class="footer">
        	<p>${process.env.CLINIC_NAME || 'Medicina Estética'}<br>
        	${process.env.CLINIC_ADDRESS || 'Córdoba, Argentina'}</p>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Generar HTML para cita cancelada
  private generateCancelledEmailHTML(appointment: AppointmentData, reason?: string): string {
	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>Cita Cancelada</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #dc3545; color: white; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>❌ Cita Cancelada</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong>,</p>
       	 
        	<p>Le informamos que su cita ha sido <strong>cancelada</strong>.</p>
       	 
        	<div class="appointment-details">
          	<h3>Cita Cancelada:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Fecha:</strong> ${appointment.startTime.toLocaleDateString('es-AR')}</p>
          	<p><strong>Hora:</strong> ${appointment.startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
          	${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
        	</div>
       	 
        	<p>Si desea reprogramar, no dude en contactarnos.</p>
      	</div>
     	 
      	<div class="footer">
        	<p>${process.env.CLINIC_NAME || 'Medicina Estética'}<br>
        	${process.env.CLINIC_PHONE || ''} | ${process.env.CLINIC_EMAIL || ''}</p>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Generar HTML para cita reprogramada
  private generateRescheduledEmailHTML(appointment: AppointmentData): string {
	const appointmentDate = appointment.startTime.toLocaleDateString('es-AR', {
  	weekday: 'long',
  	year: 'numeric',
  	month: 'long',
  	day: 'numeric'
	});

	const appointmentTime = appointment.startTime.toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
	});

	return `
  	<!DOCTYPE html>
  	<html>
  	<head>
    	<meta charset="utf-8">
    	<title>Cita Reprogramada</title>
    	<style>
      	body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      	.container { max-width: 600px; margin: 0 auto; padding: 20px; }
      	.header { background: #ffc107; color: #333; padding: 20px; text-align: center; }
      	.content { padding: 20px; background: #f8f9fa; }
      	.appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
      	.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    	</style>
  	</head>
  	<body>
    	<div class="container">
      	<div class="header">
        	<h1>📅 Cita Reprogramada</h1>
      	</div>
     	 
      	<div class="content">
        	<p>Estimado/a <strong>${appointment.patient.firstName} ${appointment.patient.lastName}</strong>,</p>
       	 
        	<p>Su cita ha sido <strong>reprogramada</strong> para una nueva fecha y hora.</p>
       	 
        	<div class="appointment-details">
          	<h3>Nueva Información:</h3>
          	<p><strong>Tratamiento:</strong> ${appointment.treatment.name}</p>
          	<p><strong>Nueva Fecha:</strong> ${appointmentDate}</p>
          	<p><strong>Nueva Hora:</strong> ${appointmentTime}</p>
          	<p><strong>Profesional:</strong> ${appointment.user.firstName} ${appointment.user.lastName}</p>
        	</div>
       	 
        	<p>Gracias por su comprensión.</p>
      	</div>
     	 
      	<div class="footer">
        	<p>${process.env.CLINIC_NAME || 'Medicina Estética'}<br>
        	${process.env.CLINIC_ADDRESS || 'Córdoba, Argentina'}</p>
      	</div>
    	</div>
  	</body>
  	</html>
	`;
  }

  // Generar HTML para recordatorios
  private generateReminderEmailHTML(appointment: AppointmentData, type: '24h' | '2h'): string {
	const appointmentDate = appointment.startTime.toLocaleDateString('es-AR', {
  	weekday: 'long',
  	year: 'numeric',
  	month: 'long',
  	day: 'numeric'
	});

	const appointmentTime = appointment.startTime.toLocaleTimeString('es-AR', {
  	hour: '2-digit',
  	minute: '2-digit'
