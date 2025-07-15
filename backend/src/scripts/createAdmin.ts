#!/usr/bin/env ts-node

/**
 * Script para crear usuario administrador inicial
 * Uso: npm run create-admin
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer preguntas en consola
const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
	rl.question(prompt, resolve);
  });
};

// Función para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Función para validar contraseña
const isValidPassword = (password: string): boolean => {
  // Al menos 8 caracteres, una minúscula, una mayúscula y un número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

async function createAdmin() {
  console.log('\n🏥 CREACIÓN DE USUARIO ADMINISTRADOR');
  console.log('=====================================\n');

  try {
	// Verificar conexión a BD
	await prisma.$connect();
	console.log('✅ Conectado a la base de datos\n');

	// Verificar si ya existe un admin
	const existingAdmins = await prisma.user.findMany({
  	where: {
    	role: 'ADMIN',
    	isActive: true
  	},
  	select: {
    	email: true,
    	firstName: true,
    	lastName: true,
    	createdAt: true
  	}
	});

	if (existingAdmins.length > 0) {
  	console.log('⚠️  Ya existen administradores en el sistema:');
  	existingAdmins.forEach((admin, index) => {
    	console.log(`   ${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
    	console.log(`  	Creado: ${admin.createdAt.toLocaleDateString()}`);
  	});
  	console.log('');

  	const proceed = await question('¿Deseas crear otro administrador? (s/N): ');
  	if (proceed.toLowerCase() !== 's' && proceed.toLowerCase() !== 'si') {
    	console.log('❌ Operación cancelada');
    	process.exit(0);
  	}
  	console.log('');
	}

	// Recopilar datos del nuevo admin
	let email: string;
	do {
  	email = await question('📧 Email del administrador: ');
  	if (!isValidEmail(email)) {
    	console.log('❌ Email inválido. Por favor ingresa un email válido.');
    	continue;
  	}

  	// Verificar que el email no esté en uso
  	const existingUser = await prisma.user.findUnique({
    	where: { email: email.toLowerCase() }
  	});

  	if (existingUser) {
    	console.log('❌ Este email ya está registrado. Usa otro email.');
    	email = '';
    	continue;
  	}
  	break;
	} while (true);

	let password: string;
	do {
  	password = await question('🔐 Contraseña (min 8 caracteres, mayúscula, minúscula y número): ');
  	if (!isValidPassword(password)) {
    	console.log('❌ Contraseña inválida. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
    	continue;
  	}

  	const confirmPassword = await question('🔐 Confirmar contraseña: ');
  	if (password !== confirmPassword) {
    	console.log('❌ Las contraseñas no coinciden.');
    	password = '';
    	continue;
  	}
  	break;
	} while (true);

	const firstName = await question('👤 Nombre: ');
	const lastName = await question('👤 Apellido: ');
	const phone = await question('📱 Teléfono (opcional): ');

	console.log('\n📋 DATOS A CREAR:');
	console.log('================');
	console.log(`Email: ${email}`);
	console.log(`Nombre: ${firstName} ${lastName}`);
	console.log(`Teléfono: ${phone || 'No especificado'}`);
	console.log(`Rol: ADMINISTRADOR`);

	const confirm = await question('\n¿Confirmas la creación? (S/n): ');
	if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
  	console.log('❌ Operación cancelada');
  	process.exit(0);
	}

	// Crear usuario administrador
	console.log('\n🔄 Creando usuario administrador...');

	const saltRounds = 12;
	const hashedPassword = await bcrypt.hash(password, saltRounds);

	const newAdmin = await prisma.user.create({
  	data: {
    	email: email.toLowerCase(),
    	password: hashedPassword,
    	firstName: firstName.trim(),
    	lastName: lastName.trim(),
    	phone: phone.trim() || null,
    	role: 'ADMIN',
    	isActive: true
  	},
  	select: {
    	id: true,
    	email: true,
    	firstName: true,
    	lastName: true,
    	phone: true,
    	role: true,
    	createdAt: true
  	}
	});

	console.log('\n✅ USUARIO ADMINISTRADOR CREADO EXITOSAMENTE');
	console.log('===========================================');
	console.log(`ID: ${newAdmin.id}`);
	console.log(`Email: ${newAdmin.email}`);
	console.log(`Nombre: ${newAdmin.firstName} ${newAdmin.lastName}`);
	console.log(`Teléfono: ${newAdmin.phone || 'No especificado'}`);
	console.log(`Rol: ${newAdmin.role}`);
	console.log(`Creado: ${newAdmin.createdAt.toLocaleString()}`);

	console.log('\n🎉 PRÓXIMOS PASOS:');
	console.log('==================');
	console.log('1. Accede al sistema con las credenciales creadas');
	console.log('2. Cambia la contraseña desde el perfil si es necesario');
	console.log('3. Crea usuarios adicionales desde la interfaz');
	console.log('4. Configura los datos de la clínica');
	console.log('\n🌐 Acceso al sistema:');
	console.log(`   Web: http://localhost:19006`);
	console.log(`   API: http://localhost:3000/api/auth/login`);

  } catch (error) {
	console.error('\n❌ ERROR CREANDO ADMINISTRADOR:', error);
    
	if (error instanceof Error) {
  	console.error('Detalles:', error.message);
	}
    
	process.exit(1);
  } finally {
	await prisma.$disconnect();
	rl.close();
  }
}

// Función para crear admin con datos por defecto (para desarrollo)
async function createDefaultAdmin() {
  console.log('\n🔧 MODO DESARROLLO - CREANDO ADMIN POR DEFECTO');
  console.log('===============================================\n');

  try {
	await prisma.$connect();

	// Verificar si ya existe
	const existingAdmin = await prisma.user.findUnique({
  	where: { email: 'admin@estetica.com' }
	});

	if (existingAdmin) {
  	console.log('✅ Admin por defecto ya existe: admin@estetica.com');
  	console.log('🔐 Contraseña: Admin123!');
  	return;
	}

	const hashedPassword = await bcrypt.hash('Admin123!', 12);

	const newAdmin = await prisma.user.create({
  	data: {
    	email: 'admin@estetica.com',
    	password: hashedPassword,
    	firstName: 'Administrador',
    	lastName: 'Sistema',
    	phone: '+54 351 123-4567',
    	role: 'ADMIN',
    	isActive: true
  	}
	});

	console.log('✅ Admin por defecto creado exitosamente');
	console.log('📧 Email: admin@estetica.com');
	console.log('🔐 Contraseña: Admin123!');
	console.log('⚠️  CAMBIAR CREDENCIALES EN PRODUCCIÓN');

  } catch (error) {
	console.error('❌ Error creando admin por defecto:', error);
  } finally {
	await prisma.$disconnect();
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--default') || args.includes('-d')) {
  createDefaultAdmin();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('\n🏥 SCRIPT DE CREACIÓN DE ADMINISTRADOR');
  console.log('====================================');
  console.log('');
  console.log('Uso:');
  console.log('  npm run create-admin       	# Modo interactivo');
  console.log('  npm run create-admin -- -d 	# Crear admin por defecto');
  console.log('  npm run create-admin -- -h 	# Mostrar ayuda');
  console.log('');
  console.log('Admin por defecto (solo desarrollo):');
  console.log('  Email: admin@estetica.com');
  console.log('  Contraseña: Admin123!');
  console.log('');
} else {
  createAdmin();
}
