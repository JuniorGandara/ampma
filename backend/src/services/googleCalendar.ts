import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees?: Array<{ email: string; name?: string }>;
  location?: string;
  reminders?: {
	useDefault: boolean;
	overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar | null = null;
  private auth: OAuth2Client | null = null;
  private isInitialized = false;

  constructor() {
	this.initialize();
  }

  private async initialize() {
	try {
  	// Verificar si Google Calendar está habilitado
  	const isEnabled = process.env.GOOGLE_CALENDAR_ENABLED === 'true';
  	if (!isEnabled) {
    	console.log('📅 Google Calendar deshabilitado en configuración');
    	return;
  	}

  	// Cargar credenciales
  	const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS ||
    	path.join(process.cwd(), 'credentials', 'google-calendar.json');

  	if (!fs.existsSync(credentialsPath)) {
    	console.warn('⚠️ Archivo de credenciales de Google Calendar no encontrado:', credentialsPath);
    	return;
  	}

  	const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
 	 
  	// Configurar autenticación OAuth2
  	this.auth = new google.auth.OAuth2(
    	credentials.client_id,
    	credentials.client_secret,
    	credentials.redirect_uris[0]
  	);

  	// Cargar tokens de acceso si existen
  	const tokenPath = path.join(process.cwd(), 'credentials', 'google-tokens.json');
  	if (fs.existsSync(tokenPath)) {
    	const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    	this.auth.setCredentials(tokens);
  	}

  	// Inicializar cliente de Calendar
  	this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  	this.isInitialized = true;

  	console.log('✅ Google Calendar inicializado correctamente');

	} catch (error) {
  	console.error('❌ Error inicializando Google Calendar:', error);
  	this.isInitialized = false;
	}
  }

  // Verificar si el servicio está disponible
  isAvailable(): boolean {
	return this.isInitialized && this.calendar !== null && this.auth !== null;
  }

  // Obtener URL de autorización (para configuración inicial)
  getAuthUrl(): string {
	if (!this.auth) {
  	throw new Error('Google Calendar no inicializado');
	}

	const scopes = [
  	'https://www.googleapis.com/auth/calendar',
  	'https://www.googleapis.com/auth/calendar.events'
	];

	return this.auth.generateAuthUrl({
  	access_type: 'offline',
  	scope: scopes,
	});
  }

  // Intercambiar código de autorización por tokens
  async exchangeCodeForTokens(code: string): Promise<void> {
	if (!this.auth) {
  	throw new Error('Google Calendar no inicializado');
	}

	try {
  	const { tokens } = await this.auth.getToken(code);
  	this.auth.setCredentials(tokens);

  	// Guardar tokens para uso futuro
  	const tokenPath = path.join(process.cwd(), 'credentials', 'google-tokens.json');
  	fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

  	console.log('✅ Tokens de Google Calendar guardados');
	} catch (error) {
  	console.error('❌ Error intercambiando código por tokens:', error);
  	throw error;
	}
  }

  // Crear evento en Google Calendar
  async createEvent(event: CalendarEvent): Promise<string | null> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando creación de evento');
  	return null;
	}

	try {
  	const calendarEvent: calendar_v3.Schema$Event = {
    	summary: event.summary,
    	description: event.description,
    	start: {
      	dateTime: event.start.toISOString(),
      	timeZone: 'America/Argentina/Cordoba'
    	},
    	end: {
      	dateTime: event.end.toISOString(),
      	timeZone: 'America/Argentina/Cordoba'
    	},
    	attendees: event.attendees?.map(attendee => ({
      	email: attendee.email,
      	displayName: attendee.name
    	})),
    	location: event.location,
    	reminders: event.reminders || {
      	useDefault: false,
      	overrides: [
        	{ method: 'email', minutes: 24 * 60 }, // 1 día antes
        	{ method: 'popup', minutes: 30 }   	// 30 minutos antes
      	]
    	}
  	};

  	const response = await this.calendar!.events.insert({
    	calendarId: 'primary',
    	requestBody: calendarEvent,
    	sendUpdates: 'all'
  	});

  	console.log('✅ Evento creado en Google Calendar:', response.data.id);
  	return response.data.id || null;

	} catch (error) {
  	console.error('❌ Error creando evento en Google Calendar:', error);
  	throw error;
	}
  }

  // Actualizar evento en Google Calendar
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando actualización de evento');
  	return;
	}

	try {
  	const updateData: calendar_v3.Schema$Event = {};

  	if (event.summary) updateData.summary = event.summary;
  	if (event.description) updateData.description = event.description;
  	if (event.location) updateData.location = event.location;

  	if (event.start) {
    	updateData.start = {
      	dateTime: event.start.toISOString(),
      	timeZone: 'America/Argentina/Cordoba'
    	};
  	}

  	if (event.end) {
    	updateData.end = {
      	dateTime: event.end.toISOString(),
      	timeZone: 'America/Argentina/Cordoba'
    	};
  	}

  	if (event.attendees) {
    	updateData.attendees = event.attendees.map(attendee => ({
      	email: attendee.email,
      	displayName: attendee.name
    	}));
  	}

  	await this.calendar!.events.update({
    	calendarId: 'primary',
    	eventId: eventId,
    	requestBody: updateData,
    	sendUpdates: 'all'
  	});

  	console.log('✅ Evento actualizado en Google Calendar:', eventId);

	} catch (error) {
  	console.error('❌ Error actualizando evento en Google Calendar:', error);
  	throw error;
	}
  }

  // Cancelar evento en Google Calendar
  async cancelEvent(eventId: string): Promise<void> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando cancelación de evento');
  	return;
	}

	try {
  	await this.calendar!.events.update({
    	calendarId: 'primary',
    	eventId: eventId,
    	requestBody: {
      	status: 'cancelled'
    	},
    	sendUpdates: 'all'
  	});

  	console.log('✅ Evento cancelado en Google Calendar:', eventId);

	} catch (error) {
  	console.error('❌ Error cancelando evento en Google Calendar:', error);
  	throw error;
	}
  }

  // Eliminar evento de Google Calendar
  async deleteEvent(eventId: string): Promise<void> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando eliminación de evento');
  	return;
	}

	try {
  	await this.calendar!.events.delete({
    	calendarId: 'primary',
    	eventId: eventId,
    	sendUpdates: 'all'
  	});

  	console.log('✅ Evento eliminado de Google Calendar:', eventId);

	} catch (error) {
  	console.error('❌ Error eliminando evento de Google Calendar:', error);
  	throw error;
	}
  }

  // Obtener eventos de un rango de fechas
  async getEvents(startDate: Date, endDate: Date): Promise<calendar_v3.Schema$Event[]> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, retornando array vacío');
  	return [];
	}

	try {
  	const response = await this.calendar!.events.list({
    	calendarId: 'primary',
    	timeMin: startDate.toISOString(),
    	timeMax: endDate.toISOString(),
    	singleEvents: true,
    	orderBy: 'startTime'
  	});

  	return response.data.items || [];

	} catch (error) {
  	console.error('❌ Error obteniendo eventos de Google Calendar:', error);
  	throw error;
	}
  }

  // Buscar conflictos de horario
  async checkConflicts(startTime: Date, endTime: Date, excludeEventId?: string): Promise<boolean> {
	if (!this.isAvailable()) {
  	return false; // Si no está disponible, asumimos que no hay conflictos
	}

	try {
  	const events = await this.getEvents(startTime, endTime);
 	 
  	const conflicts = events.filter(event => {
    	// Excluir el evento actual si se está editando
    	if (excludeEventId && event.id === excludeEventId) {
      	return false;
    	}

    	// Verificar solapamiento
    	if (!event.start?.dateTime || !event.end?.dateTime) {
      	return false;
    	}

    	const eventStart = new Date(event.start.dateTime);
    	const eventEnd = new Date(event.end.dateTime);

    	return startTime < eventEnd && endTime > eventStart;
  	});

  	return conflicts.length > 0;

	} catch (error) {
  	console.error('❌ Error verificando conflictos en Google Calendar:', error);
  	return false;
	}
  }

  // Sincronizar eventos existentes
  async syncExistingAppointments(appointments: Array<{
	id: string;
	summary: string;
	description?: string;
	start: Date;
	end: Date;
	attendees?: Array<{ email: string; name?: string }>;
  }>): Promise<{ success: number; errors: number }> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando sincronización');
  	return { success: 0, errors: 0 };
	}

	let success = 0;
	let errors = 0;

	for (const appointment of appointments) {
  	try {
    	await this.createEvent({
      	summary: appointment.summary,
      	description: appointment.description,
      	start: appointment.start,
      	end: appointment.end,
      	attendees: appointment.attendees
    	});
    	success++;
  	} catch (error) {
    	console.error(`❌ Error sincronizando cita ${appointment.id}:`, error);
    	errors++;
  	}
	}

	console.log(`✅ Sincronización completada: ${success} éxito, ${errors} errores`);
	return { success, errors };
  }

  // Configurar recordatorios por defecto
  async setDefaultReminders(reminders: Array<{ method: 'email' | 'popup'; minutes: number }>): Promise<void> {
	if (!this.isAvailable()) {
  	console.warn('⚠️ Google Calendar no disponible, saltando configuración de recordatorios');
  	return;
	}

	try {
  	await this.calendar!.calendarList.update({
    	calendarId: 'primary',
    	requestBody: {
      	defaultReminders: reminders
    	}
  	});

  	console.log('✅ Recordatorios por defecto configurados');

	} catch (error) {
  	console.error('❌ Error configurando recordatorios por defecto:', error);
  	throw error;
	}
  }

  // Obtener información del calendario
  async getCalendarInfo(): Promise<calendar_v3.Schema$Calendar | null> {
	if (!this.isAvailable()) {
  	return null;
	}

	try {
  	const response = await this.calendar!.calendars.get({
    	calendarId: 'primary'
  	});

  	return response.data;

	} catch (error) {
  	console.error('❌ Error obteniendo información del calendario:', error);
  	return null;
	}
  }

  // Verificar conexión
  async testConnection(): Promise<boolean> {
	if (!this.isAvailable()) {
  	return false;
	}

	try {
  	await this.calendar!.calendarList.list();
  	return true;
	} catch (error) {
  	console.error('❌ Error verificando conexión con Google Calendar:', error);
  	return false;
	}
  }
}
