import cron from 'node-cron';
import { NotificationService } from '../services/notifications';
import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();
const notifications = new NotificationService();

export class CronScheduler {
  private static instance: CronScheduler;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CronScheduler {
	if (!CronScheduler.instance) {
  	CronScheduler.instance = new CronScheduler();
	}
	return CronScheduler.instance;
  }

  // Inicializar todos los trabajos programados
  public initialize(): void {
	if (this.isInitialized) {
  	console.log('⚠️ Scheduler ya inicializado');
  	return;
	}

	console.log('🕒 Inicializando trabajos programados...');

	// Recordatorios de 24 horas - Ejecutar diariamente a las 9:00 AM
	this.scheduleJob('daily-reminders', '0 9 * * *', async () => {
  	console.log('📧 Ejecutando recordatorios de 24 horas...');
  	await this.sendDailyReminders();
	});

	// Recordatorios de 2 horas - Ejecutar cada 30 minutos
	this.scheduleJob('hourly-reminders', '*/30 * * * *', async () => {
  	console.log('📧 Verificando recordatorios de 2 horas...');
  	await this.send2HourReminders();
	});

	// Verificar citas no confirmadas - Ejecutar cada 2 horas
	this.scheduleJob('check-unconfirmed', '0 */2 * * *', async () => {
  	console.log('🔍 Verificando citas no confirmadas...');
  	await this.checkUnconfirmedAppointments();
	});

	// Marcar citas como "No asistió" - Ejecutar cada hora
	this.scheduleJob('mark-no-show', '0 * * * *', async () => {
  	console.log('📋 Verificando citas sin asistencia...');
  	await this.markNoShowAppointments();
	});

	// Limpiar notificaciones antiguas - Ejecutar diariamente a las 2:00 AM
	this.scheduleJob('cleanup-notifications', '0 2 * * *', async () => {
  	console.log('🧹 Limpiando datos antiguos...');
  	await this.cleanupOldData();
	});

	// Backup automático - Ejecutar diariamente a las 3:00 AM
	this.scheduleJob('daily-backup', '0 3 * * *', async () => {
  	console.log('💾 Ejecutando backup automático...');
  	await this.performDailyBackup();
	});

	// Reporte diario de actividad - Ejecutar a las 8:00 PM
	this.scheduleJob('daily-report', '0 20 * * *', async () => {
  	console.log('📊 Generando reporte diario...');
  	await this.generateDailyReport();
	});

	this.isInitialized = true;
	console.log(`✅ ${this.jobs.size} trabajos programados inicializados`);
  }

  // Programar un trabajo específico
  private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
	try {
  	if (this.jobs.has(name)) {
    	console.log(`⚠️ Trabajo "${name}" ya existe, reemplazando...`);
    	this.jobs.get(name)?.destroy();
  	}

  	const job = cron.schedule(schedule, async () => {
    	try {
      	await task();
    	} catch (error) {
      	console.error(`❌ Error en trabajo "${name}":`, error);
    	}
  	}, {
    	scheduled: true,
    	timezone: 'America/Argentina/Cordoba'
  	});

  	this.jobs.set(name, job);
  	console.log(`✅ Trabajo "${name}" programado: ${schedule}`);

	} catch (error) {
  	console.error(`❌ Error ejecutando trabajo "${name}" manualmente:`, error);
  	return false;
	}
  }

  // Verificar salud del scheduler
  public async healthCheck(): Promise<{
	isRunning: boolean;
	jobCount: number;
	lastExecution?: Date;
	errors?: string[];
  }> {
	const errors = [];
    
	try {
  	// Verificar conexión a base de datos
  	await prisma.$queryRaw`SELECT 1`;
	} catch (dbError) {
  	errors.push('Error de conexión a base de datos');
	}

	// Verificar servicio de notificaciones
	try {
  	const notificationStatus = await notifications.getServiceStatus();
  	if (!notificationStatus.emailEnabled) {
    	errors.push('Servicio de email deshabilitado');
  	}
	} catch (notifError) {
  	errors.push('Error en servicio de notificaciones');
	}

	return {
  	isRunning: this.isInitialized,
  	jobCount: this.jobs.size,
  	errors: errors.length > 0 ? errors : undefined
	};
  }
}

// Exportar instancia singleton
export const cronScheduler = CronScheduler.getInstance();error(`❌ Error programando trabajo "${name}":`, error);
	}
  }

  // Enviar recordatorios diarios (24 horas antes)
  private async sendDailyReminders(): Promise<void> {
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
        	in: [AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA]
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

  	let sentCount = 0;
  	let errorCount = 0;

  	for (const appointment of tomorrowAppointments) {
    	try {
      	await notifications.sendAppointmentReminder(appointment, '24h');
      	sentCount++;
     	 
      	// Pausa entre envíos para no sobrecargar
      	await new Promise(resolve => setTimeout(resolve, 2000));
    	} catch (error) {
      	console.error(`❌ Error enviando recordatorio para cita ${appointment.id}:`, error);
      	errorCount++;
    	}
  	}

  	console.log(`✅ Recordatorios 24h: ${sentCount} enviados, ${errorCount} errores`);

	} catch (error) {
  	console.error('❌ Error en sendDailyReminders:', error);
	}
  }

  // Enviar recordatorios de 2 horas
  private async send2HourReminders(): Promise<void> {
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
        	in: [AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA]
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

  	let sentCount = 0;
  	let errorCount = 0;

  	for (const appointment of upcomingAppointments) {
    	try {
      	await notifications.sendAppointmentReminder(appointment, '2h');
      	sentCount++;
     	 
      	await new Promise(resolve => setTimeout(resolve, 1000));
    	} catch (error) {
      	console.error(`❌ Error enviando recordatorio 2h para cita ${appointment.id}:`, error);
      	errorCount++;
    	}
  	}

  	if (sentCount > 0 || errorCount > 0) {
    	console.log(`✅ Recordatorios 2h: ${sentCount} enviados, ${errorCount} errores`);
  	}

	} catch (error) {
  	console.error('❌ Error en send2HourReminders:', error);
	}
  }

  // Verificar citas no confirmadas (48 horas después de creadas)
  private async checkUnconfirmedAppointments(): Promise<void> {
	try {
  	const twoDaysAgo = new Date();
  	twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  	const unconfirmedAppointments = await prisma.appointment.findMany({
    	where: {
      	status: AppointmentStatus.PROGRAMADA,
      	createdAt: {
        	lt: twoDaysAgo
      	},
      	startTime: {
        	gt: new Date() // Solo citas futuras
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

  	for (const appointment of unconfirmedAppointments) {
    	try {
      	// Enviar recordatorio de confirmación
      	await notifications.sendAppointmentConfirmation(appointment);
     	 
      	console.log(`📧 Recordatorio de confirmación enviado para cita ${appointment.id}`);
     	 
      	await new Promise(resolve => setTimeout(resolve, 1000));
    	} catch (error) {
      	console.error(`❌ Error enviando recordatorio de confirmación para cita ${appointment.id}:`, error);
    	}
  	}

  	if (unconfirmedAppointments.length > 0) {
    	console.log(`✅ Procesadas ${unconfirmedAppointments.length} citas sin confirmar`);
  	}

	} catch (error) {
  	console.error('❌ Error en checkUnconfirmedAppointments:', error);
	}
  }

  // Marcar citas como "No asistió" (30 minutos después de la hora programada)
  private async markNoShowAppointments(): Promise<void> {
	try {
  	const thirtyMinutesAgo = new Date();
  	thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

  	const missedAppointments = await prisma.appointment.findMany({
    	where: {
      	status: {
        	in: [AppointmentStatus.PROGRAMADA, AppointmentStatus.CONFIRMADA]
      	},
      	startTime: {
        	lt: thirtyMinutesAgo
      	}
    	}
  	});

  	const updatedCount = await prisma.appointment.updateMany({
    	where: {
      	id: {
        	in: missedAppointments.map(apt => apt.id)
      	}
    	},
    	data: {
      	status: AppointmentStatus.NO_ASISTIO,
      	updatedAt: new Date()
    	}
  	});

  	if (updatedCount.count > 0) {
    	console.log(`📋 ${updatedCount.count} citas marcadas como "No asistió"`);
  	}

	} catch (error) {
  	console.error('❌ Error en markNoShowAppointments:', error);
	}
  }

  // Limpiar datos antiguos
  private async cleanupOldData(): Promise<void> {
	try {
  	const oneYearAgo = new Date();
  	oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  	// Limpiar movimientos de stock antiguos (más de 1 año)
  	const deletedMovements = await prisma.stockMovement.deleteMany({
    	where: {
      	createdAt: {
        	lt: oneYearAgo
      	}
    	}
  	});

  	// Limpiar logs antiguos si los hubiera
  	// const deletedLogs = await prisma.systemLog.deleteMany({
  	//   where: {
  	// 	createdAt: {
  	//   	lt: oneYearAgo
  	// 	}
  	//   }
  	// });

  	console.log(`🧹 Limpieza completada: ${deletedMovements.count} movimientos eliminados`);

	} catch (error) {
  	console.error('❌ Error en cleanupOldData:', error);
	}
  }

  // Realizar backup diario
  private async performDailyBackup(): Promise<void> {
	try {
  	const backupDate = new Date().toISOString().split('T')[0];
 	 
  	// En un entorno real, aquí ejecutarías pg_dump o similar
  	console.log(`💾 Backup diario iniciado para fecha: ${backupDate}`);
 	 
  	// Ejemplo de comando que ejecutarías:
  	// const { exec } = require('child_process');
  	// const backupCommand = `pg_dump ${process.env.DATABASE_URL} > backups/backup_${backupDate}.sql`;
  	// exec(backupCommand, (error, stdout, stderr) => {
  	//   if (error) {
  	// 	console.error('❌ Error en backup:', error);
  	//   } else {
  	// 	console.log('✅ Backup completado exitosamente');
  	//   }
  	// });

  	console.log('💾 Proceso de backup simulado completado');

	} catch (error) {
  	console.error('❌ Error en performDailyBackup:', error);
	}
  }

  // Generar reporte diario
  private async generateDailyReport(): Promise<void> {
	try {
  	const today = new Date();
  	today.setHours(0, 0, 0, 0);
  	const tomorrow = new Date(today);
  	tomorrow.setDate(tomorrow.getDate() + 1);

  	// Estadísticas del día
  	const todayStats = await prisma.appointment.groupBy({
    	by: ['status'],
    	where: {
      	startTime: {
        	gte: today,
        	lt: tomorrow
      	}
    	},
    	_count: {
      	status: true
    	}
  	});

  	const totalAppointments = todayStats.reduce((sum, stat) => sum + stat._count.status, 0);
  	const completedAppointments = todayStats.find(s => s.status === AppointmentStatus.COMPLETADA)?._count.status || 0;
  	const cancelledAppointments = todayStats.find(s => s.status === AppointmentStatus.CANCELADA)?._count.status || 0;
  	const noShowAppointments = todayStats.find(s => s.status === AppointmentStatus.NO_ASISTIO)?._count.status || 0;

  	// Ingresos del día (esto requeriría la tabla de invoices)
  	// const dailyRevenue = await prisma.invoice.aggregate({
  	//   where: {
  	// 	invoiceDate: {
  	//   	gte: today,
  	//   	lt: tomorrow
  	// 	},
  	// 	status: 'PAGADA'
  	//   },
  	//   _sum: {
  	// 	total: true
  	//   }
  	// });

  	const reportData = {
    	date: today.toISOString().split('T')[0],
    	appointments: {
      	total: totalAppointments,
      	completed: completedAppointments,
      	cancelled: cancelledAppointments,
      	noShow: noShowAppointments
    	},
    	// revenue: dailyRevenue._sum.total || 0
  	};

  	console.log('📊 Reporte diario generado:', JSON.stringify(reportData, null, 2));

  	// Aquí podrías enviar el reporte por email a los administradores
  	// await notifications.sendDailyReport(reportData);

	} catch (error) {
  	console.error('❌ Error en generateDailyReport:', error);
	}
  }

  // Detener un trabajo específico
  public stopJob(name: string): boolean {
	const job = this.jobs.get(name);
	if (job) {
  	job.destroy();
  	this.jobs.delete(name);
  	console.log(`🛑 Trabajo "${name}" detenido`);
  	return true;
	}
	return false;
  }

  // Detener todos los trabajos
  public stopAllJobs(): void {
	console.log('🛑 Deteniendo todos los trabajos programados...');
    
	for (const [name, job] of this.jobs.entries()) {
  	job.destroy();
  	console.log(`🛑 Trabajo "${name}" detenido`);
	}
    
	this.jobs.clear();
	this.isInitialized = false;
	console.log('✅ Todos los trabajos detenidos');
  }

  // Obtener estado de los trabajos
  public getJobsStatus(): Array<{ name: string; running: boolean; nextRun?: Date }> {
	const status = [];
    
	for (const [name, job] of this.jobs.entries()) {
  	status.push({
    	name,
    	running: job.getStatus() === 'scheduled',
    	// nextRun: job.nextDate() // Esto dependería de la implementación de node-cron
  	});
	}
    
	return status;
  }

  // Ejecutar un trabajo manualmente
  public async runJobManually(name: string): Promise<boolean> {
	try {
  	switch (name) {
    	case 'daily-reminders':
      	await this.sendDailyReminders();
      	break;
    	case 'hourly-reminders':
      	await this.send2HourReminders();
      	break;
    	case 'check-unconfirmed':
      	await this.checkUnconfirmedAppointments();
      	break;
    	case 'mark-no-show':
      	await this.markNoShowAppointments();
      	break;
    	case 'cleanup-notifications':
      	await this.cleanupOldData();
      	break;
    	case 'daily-backup':
      	await this.performDailyBackup();
      	break;
    	case 'daily-report':
      	await this.generateDailyReport();
      	break;
    	default:
      	console.log(`❌ Trabajo "${name}" no encontrado`);
      	return false;
  	}
 	 
  	console.log(`✅ Trabajo "${name}" ejecutado manualmente`);
  	return true;
 	 
	} catch (error) {
  	console.
