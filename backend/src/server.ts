import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Agregar import del scheduler
import { cronScheduler } from './scheduler/cronJobs';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import patientRoutes from './routes/patients'; // Para futuros chats
import appointmentRoutes from './routes/appointments';
import treatmentRoutes from './routes/treatments';
import productRoutes from './routes/products';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import stockRoutes from './routes/stock';
import invoiceRoutes from './routes/invoices';
import reportRoutes from './routes/reports';

// Middleware personalizado
import {
  errorHandler,
  notFoundHandler,
  errorLogger
} from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Configuración
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
	? ['query', 'info', 'warn', 'error']
	: ['warn', 'error'],
});

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
	error: 'Demasiadas solicitudes desde esta IP. Inténtalo nuevamente en 15 minutos.',
	code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware para agregar propiedades personalizadas a Request y Response
declare global {
  namespace Express {
	interface Request {
  	startTime?: number;
	}
	interface Response {
  	success?: (data: any, message?: string, statusCode?: number) => void;
  	error?: (message: string, code?: string, statusCode?: number, details?: any) => void;
	}
  }
}

// Middlewares globales
app.use(limiter);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:19006',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware personalizado para logging de requests
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Middleware de respuesta personalizada
app.use((req, res, next) => {
  res.success = (data: any, message?: string, statusCode: number = 200) => {
	res.status(statusCode).json({
  	success: true,
  	message: message || 'Operación exitosa',
  	data,
  	timestamp: new Date().toISOString(),
  	responseTime: req.startTime ? Date.now() - req.startTime : undefined
	});
  };

  res.error = (message: string, code?: string, statusCode: number = 400, details?: any) => {
	res.status(statusCode).json({
  	success: false,
  	error: message,
  	code: code || 'GENERIC_ERROR',
  	details,
  	timestamp: new Date().toISOString(),
  	responseTime: req.startTime ? Date.now() - req.startTime : undefined
	});
  };

  next();
});

// Rutas de salud y estado
app.get('/health', (req, res) => {
  res.json({
	status: 'OK',
	service: 'Medicina Estética API',
	version: '1.0.0',
	timestamp: new Date().toISOString(),
	env: process.env.NODE_ENV,
	uptime: process.uptime()
  });
});

app.get('/api/health', async (req, res) => {
  try {
	// Verificar conexión a la base de datos
	const startTime = Date.now();
	await prisma.$queryRaw`SELECT 1`;
	const dbResponseTime = Date.now() - startTime;

	// Estadísticas básicas del sistema
	const stats = await Promise.all([
  	prisma.user.count(),
  	// Estas tablas se crearán en próximos chats
  	// prisma.patient?.count().catch(() => 0) || 0,
  	// prisma.appointment?.count().catch(() => 0) || 0
	]);

	res.json({
  	status: 'OK',
  	service: 'Medicina Estética API',
  	version: '1.0.0',
  	database: {
    	status: 'Connected',
    	responseTime: `${dbResponseTime}ms`
  	},
  	stats: {
    	users: stats[0],
    	patients: 0, // Placeholder para próximos chats
    	appointments: 0 // Placeholder para próximos chats
  	},
  	timestamp: new Date().toISOString(),
  	uptime: process.uptime()
	});
  } catch (error) {
	res.status(503).json({
  	status: 'ERROR',
  	service: 'Medicina Estética API',
  	database: {
    	status: 'Disconnected',
    	error: error instanceof Error ? error.message : 'Unknown error'
  	},
  	timestamp: new Date().toISOString()
	});
  }
});

// Ruta de información de la API
app.get('/api/info', (req, res) => {
  res.json({
	name: 'Sistema de Gestión - Medicina Estética',
	version: '1.0.0',
	description: 'API completa para gestión de centros de medicina estética',
	location: 'Córdoba Capital, Argentina',
	features: [
  	'Gestión de usuarios y roles',
  	'Autenticación JWT',
  	'Gestión de pacientes',
  	'Sistema de agenda',
  	'Control de inventario',
  	'Facturación AFIP',
  	'Integración MercadoPago',
  	'Reportes y analytics'
	],
	endpoints: {
  	auth: '/api/auth',
  	users: '/api/users',
  	patients: '/api/patients (próximamente)',
  	appointments: '/api/appointments (próximamente)',
  	treatments: '/api/treatments (próximamente)',
  	products: '/api/products (próximamente)',
  	suppliers: '/api/suppliers (próximamente)',
  	invoices: '/api/invoices (próximamente)',
  	reports: '/api/reports (próximamente)'
	},
	contact: 'Desarrollado para medicina estética en Córdoba'
  });
});

// Rutas principales de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Rutas futuras (comentadas hasta implementar en próximos chats)
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/appointments', authMiddleware, appointmentRoutes);
// app.use('/api/treatments', authMiddleware, treatmentRoutes);
// app.use('/api/products', authMiddleware, productRoutes);
// app.use('/api/suppliers', authMiddleware, supplierRoutes);
// app.use('/api/invoices', authMiddleware, invoiceRoutes);
// app.use('/api/reports', authMiddleware, reportRoutes);

// Middleware de logging de errores
app.use(errorLogger);

// Middleware para rutas no encontradas
app.use('*', notFoundHandler);

// Middleware principal de manejo de errores (debe ser el último)
app.use(errorHandler);

// Funciones de inicialización
async function initializeDatabase() {
  try {
	await prisma.$connect();
	console.log('✅ Conexión a PostgreSQL establecida');

	// Verificar si existe al menos un usuario admin
	const adminCount = await prisma.user.count({
  	where: {
    	role: 'ADMIN',
    	isActive: true
  	}
	});

	if (adminCount === 0) {
  	console.log('⚠️  No se encontraron administradores activos');
  	console.log('💡 Ejecuta el siguiente comando para crear un admin:');
  	console.log('   docker-compose exec backend npm run create-admin');
	}

	return true;
  } catch (error) {
	console.error('❌ Error conectando a la base de datos:', error);
	return false;
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n🔄 Recibida señal ${signal}. Cerrando servidor...`);
 
  try {
	await prisma.$disconnect();
	console.log('✅ Conexión a BD cerrada correctamente');
	process.exit(0);
  } catch (error) {
	console.error('❌ Error cerrando conexión a BD:', error);
	process.exit(1);
  }
}

// Iniciar servidor
async function startServer() {
  try {
	console.log('🚀 Iniciando Sistema de Medicina Estética...');
    
	// Inicializar base de datos
	const dbConnected = await initializeDatabase();
	if (!dbConnected) {
  	console.error('❌ No se pudo conectar a la base de datos');
  	process.exit(1);
	}

	// Iniciar servidor HTTP
	const server = app.listen(PORT, '0.0.0.0', () => {
  	console.log('');
  	console.log('🏥 ======================================');
  	console.log('🏥	MEDICINA ESTÉTICA - CÓRDOBA 	');
  	console.log('🏥 ======================================');
  	console.log(`🚀 Servidor: http://localhost:${PORT}`);
  	console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  	console.log(`🌐 Health: http://localhost:${PORT}/health`);
  	console.log(`📋 API Info: http://localhost:${PORT}/api/info`);
  	console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  	console.log(`👥 Users: http://localhost:${PORT}/api/users`);
  	console.log('');
  	console.log('✅ Sistema listo para recibir peticiones');
  	console.log('📱 Frontend disponible en: http://localhost:19006');
  	console.log('🗄️  Adminer disponible en: http://localhost:8080');
  	console.log('');
	});

	// Configurar timeouts
	server.timeout = 30000; // 30 segundos
	server.keepAliveTimeout = 5000; // 5 segundos

	return server;

  } catch (error) {
	console.error('❌ Error iniciando servidor:', error);
	process.exit(1);
  }
}

// Manejo de señales del sistema para cierre graceful
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Iniciar aplicación
startServer();

// Al final de startServer(), antes del listen
cronScheduler.initialize();

// Exportar para testing
export { app, prisma };

