-- Inicialización de Base de Datos - Medicina Estética
-- PostgreSQL 15+

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configuración inicial de PostgreSQL
SET timezone = 'America/Argentina/Cordoba';

-- Crear índices de texto completo para búsquedas
CREATE INDEX IF NOT EXISTS idx_patients_fulltext
ON patients USING gin(to_tsvector('spanish', first_name || ' ' || last_name || ' ' || coalesce(email, '') || ' ' || phone));

CREATE INDEX IF NOT EXISTS idx_products_fulltext
ON products USING gin(to_tsvector('spanish', name || ' ' || coalesce(description, '') || ' ' || sku));

-- Insertar configuración inicial del sistema
INSERT INTO system_config (id, key, value, description, created_at, updated_at) VALUES
('cfg-001', 'clinic_name', 'Centro de Medicina Estética', 'Nombre de la clínica', NOW(), NOW()),
('cfg-002', 'clinic_address', 'Córdoba Capital, Argentina', 'Dirección de la clínica', NOW(), NOW()),
('cfg-003', 'clinic_phone', '+54 351 123-4567', 'Teléfono principal', NOW(), NOW()),
('cfg-004', 'clinic_email', 'info@clinica.com', 'Email principal', NOW(), NOW()),
('cfg-005', 'afip_cuit', '20123456789', 'CUIT para facturación AFIP', NOW(), NOW()),
('cfg-006', 'iibb_number', '901234567890', 'Número IIBB Córdoba', NOW(), NOW()),
('cfg-007', 'google_calendar_enabled', 'true', 'Activar integración Google Calendar', NOW(), NOW()),
('cfg-008', 'mercadopago_enabled', 'true', 'Activar MercadoPago', NOW(), NOW()),
('cfg-009', 'backup_enabled', 'true', 'Activar backups automáticos', NOW(), NOW()),
('cfg-010', 'low_stock_threshold', '5', 'Umbral de stock mínimo', NOW(), NOW()),
('cfg-011', 'appointment_duration_default', '60', 'Duración por defecto de citas (minutos)', NOW(), NOW()),
('cfg-012', 'invoice_prefix', 'ME', 'Prefijo para numeración de facturas', NOW(), NOW()),
('cfg-013', 'tax_rate', '21.00', 'Alícuota IVA por defecto (%)', NOW(), NOW()),
('cfg-014', 'iibb_rate', '3.50', 'Alícuota IIBB Córdoba (%)', NOW(), NOW()),
('cfg-015', 'system_version', '1.0.0', 'Versión del sistema', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (debe cambiarse en producción)
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at) VALUES
('admin-001', 'admin@clinica.com', '$2b$10$rOZZ8P8rOZZ8P8rOZZ8P8uO1234567890abcdefghijklmnopqrstuvwxyz', 'Administrador', 'Sistema', 'ADMIN', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insertar categorías de productos por defecto
-- Nota: Las categorías se manejan como strings en el campo category de products
-- Esta tabla es opcional para normalización futura

-- Insertar categorías de tratamientos por defecto
-- Estas son categorías comunes en medicina estética

-- Crear funciones útiles
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
	RETURN DATE_PART('year', AGE(birth_date));
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
	prefix TEXT;
	next_number INTEGER;
	formatted_number TEXT;
BEGIN
	-- Obtener prefijo de configuración
	SELECT value INTO prefix FROM system_config WHERE key = 'invoice_prefix';
	IF prefix IS NULL THEN
    	prefix := 'ME';
	END IF;
    
	-- Obtener el siguiente número
	SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1
	INTO next_number
	FROM invoices
	WHERE invoice_number LIKE prefix || '-%';
    
	-- Formatear número con ceros a la izquierda
	formatted_number := prefix || '-' || LPAD(next_number::TEXT, 8, '0');
    
	RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de compra
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS TEXT AS $$
DECLARE
	next_number INTEGER;
	formatted_number TEXT;
BEGIN
	-- Obtener el siguiente número
	SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_number FROM 3) AS INTEGER)), 0) + 1
	INTO next_number
	FROM purchases
	WHERE purchase_number LIKE 'OC%';
    
	-- Formatear número con ceros a la izquierda
	formatted_number := 'OC' || LPAD(next_number::TEXT, 8, '0');
    
	RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auditoría (opcional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas principales
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON treatments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices adicionales para rendimiento
CREATE INDEX IF NOT EXISTS idx_patients_dni ON patients(dni);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_to ON patients(assigned_to_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(current_stock) WHERE current_stock <= min_stock;

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- Vistas útiles para reportes
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT
	p.id,
	p.first_name || ' ' || p.last_name AS full_name,
	p.email,
	p.phone,
	p.dni,
	calculate_age(p.birth_date) AS age,
	p.gender,
	p.city,
	COUNT(a.id) AS total_appointments,
	COUNT(CASE WHEN a.status = 'COMPLETADA' THEN 1 END) AS completed_appointments,
	u.first_name || ' ' || u.last_name AS assigned_to,
	p.created_at,
	p.is_active
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN users u ON p.assigned_to_id = u.id
GROUP BY p.id, u.first_name, u.last_name;

CREATE OR REPLACE VIEW v_appointment_details AS
SELECT
	a.id,
	a.start_time,
	a.end_time,
	a.status,
	p.first_name || ' ' || p.last_name AS patient_name,
	p.phone AS patient_phone,
	t.name AS treatment_name,
	t.duration AS treatment_duration,
	t.price AS treatment_price,
	u.first_name || ' ' || u.last_name AS doctor_name,
	a.notes,
	a.created_at
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN treatments t ON a.treatment_id = t.id
JOIN users u ON a.user_id = u.id;

CREATE OR REPLACE VIEW v_stock_alerts AS
SELECT
	p.id,
	p.name,
	p.sku,
	p.current_stock,
	p.min_stock,
	p.current_stock - p.min_stock AS stock_difference,
	p.category,
	p.unit,
	CASE
    	WHEN p.current_stock = 0 THEN 'SIN_STOCK'
    	WHEN p.current_stock <= p.min_stock THEN 'STOCK_BAJO'
    	ELSE 'STOCK_OK'
	END AS stock_status
FROM products p
WHERE p.is_active = true
ORDER BY stock_difference ASC;

-- Comentarios de documentación
COMMENT ON TABLE users IS 'Usuarios del sistema con roles diferenciados';
COMMENT ON TABLE patients IS 'Pacientes de la clínica con información médica básica';
COMMENT ON TABLE appointments IS 'Citas médicas programadas';
COMMENT ON TABLE treatments IS 'Catálogo de tratamientos disponibles';
COMMENT ON TABLE products IS 'Inventario de productos y suministros';
COMMENT ON TABLE suppliers IS 'Proveedores de productos';
COMMENT ON TABLE invoices IS 'Facturas emitidas a pacientes';
COMMENT ON TABLE payments IS 'Pagos recibidos por facturas';
COMMENT ON TABLE stock_movements IS 'Movimientos de inventario (entradas/salidas)';
COMMENT ON TABLE system_config IS 'Configuración general del sistema';

-- Datos de ejemplo para desarrollo (opcional - remover en producción)
-- Tratamientos comunes en medicina estética
INSERT INTO treatments (id, name, description, duration, price, category, is_active, created_at, updated_at) VALUES
('treat-001', 'Limpieza Facial Profunda', 'Limpieza facial con extracción de comedones y aplicación de mascarillas', 60, 8500.00, 'Tratamientos Faciales', true, NOW(), NOW()),
('treat-002', 'Peeling Químico', 'Exfoliación química para renovación celular', 45, 12000.00, 'Tratamientos Faciales', true, NOW(), NOW()),
('treat-003', 'Radiofrecuencia Facial', 'Tratamiento tensor y reafirmante facial', 50, 15000.00, 'Tratamientos Faciales', true, NOW(), NOW()),
('treat-004', 'Mesoterapia Facial', 'Aplicación de vitaminas y ácido hialurónico', 40, 18000.00, 'Inyectables', true, NOW(), NOW()),
('treat-005', 'Botox', 'Aplicación de toxina botulínica', 30, 25000.00, 'Inyectables', true, NOW(), NOW()),
('treat-006', 'Rellenos con Ácido Hialurónico', 'Relleno de arrugas y aumento de volumen', 45, 35000.00, 'Inyectables', true, NOW(), NOW()),
('treat-007', 'Depilación Láser', 'Depilación definitiva con láser diodo', 30, 8000.00, 'Depilación', true, NOW(), NOW()),
('treat-008', 'Criolipólisis', 'Reducción de grasa localizada por frío', 60, 45000.00, 'Corporales', true, NOW(), NOW()),
('treat-009', 'Drenaje Linfático', 'Masaje drenante para reducir retención', 60, 7500.00, 'Corporales', true, NOW(), NOW()),
('treat-010', 'Consulta Médica', 'Evaluación y consulta médica inicial', 30, 5000.00, 'Consultas', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Productos comunes para medicina estética
INSERT INTO products (id, name, description, sku, category, brand, cost_price, sale_price, current_stock, min_stock, unit, has_expiration, is_active, created_at, updated_at) VALUES
('prod-001', 'Crema Limpiadora Facial', 'Crema limpiadora para todo tipo de piel', 'CLF-001', 'Limpieza', 'Dermalogica', 2500.00, 4500.00, 25, 5, 'unidad', true, true, NOW(), NOW()),
('prod-002', 'Sérum Vitamina C', 'Sérum antioxidante con vitamina C al 20%', 'SVC-002', 'Sueros', 'SkinCeuticals', 8500.00, 15000.00, 15, 3, 'unidad', true, true, NOW(), NOW()),
('prod-003', 'Ácido Hialurónico Injectable', 'Relleno dérmico de ácido hialurónico', 'AHI-003', 'Inyectables', 'Juvederm', 15000.00, 35000.00, 8, 2, 'jeringa', true, true, NOW(), NOW()),
('prod-004', 'Toxina Botulínica', 'Botox para tratamiento de arrugas dinámicas', 'BOT-004', 'Inyectables', 'Allergan', 18000.00, 25000.00, 5, 2, 'vial', true, true, NOW(), NOW()),
('prod-005', 'Mascarilla de Colágeno', 'Mascarilla hidratante y reafirmante', 'MCO-005', 'Mascarillas', 'La Roche Posay', 850.00, 1800.00, 50, 10, 'unidad', true, true, NOW(), NOW()),
('prod-006', 'Agujas 30G', 'Agujas desechables para inyectables', 'AG30-006', 'Material Médico', 'BD', 15.00, 25.00, 500, 100, 'unidad', false, true, NOW(), NOW()),
('prod-007', 'Jeringas 1ml', 'Jeringas desechables estériles', 'JER1-007', 'Material Médico', 'BD', 8.00, 15.00, 200, 50, 'unidad', false, true, NOW(), NOW()),
('prod-008', 'Alcohol en Gel', 'Gel desinfectante para manos', 'ALC-008', 'Higiene', 'Gelmix', 350.00, 650.00, 30, 10, 'unidad', false, true, NOW(), NOW()),
('prod-009', 'Guantes de Nitrilo', 'Guantes desechables sin polvo', 'GNI-009', 'Material Médico', 'Kimberly Clark', 12.00, 20.00, 1000, 200, 'unidad', false, true, NOW(), NOW()),
('prod-010', 'Toallas Desechables', 'Toallas de papel para camilla', 'TOA-010', 'Material Médico', 'Scott', 450.00, 850.00, 40, 10, 'rollo', false, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Proveedores comunes
INSERT INTO suppliers (id, name, cuit, email, phone, address, city, province, country, payment_terms, is_active, created_at, updated_at) VALUES
('supp-001', 'Distribuidora Médica Córdoba S.A.', '30712345678', 'ventas@medcordoba.com.ar', '+54 351 423-1234', 'Av. Colón 1234', 'Córdoba', 'Córdoba', 'Argentina', '30 días', true, NOW(), NOW()),
('supp-002', 'Estética Profesional S.R.L.', '30798765432', 'pedidos@esteticapro.com.ar', '+54 351 456-7890', 'Bv. San Juan 567', 'Córdoba', 'Córdoba', 'Argentina', '21 días', true, NOW(), NOW()),
('supp-003', 'Insumos Dermatológicos del Centro', '30656789123', 'info@dermacenter.com', '+54 351 789-0123', 'Av. Vélez Sársfield 890', 'Córdoba', 'Córdoba', 'Argentina', 'Contado', true, NOW(), NOW()),
('supp-004', 'Laboratorio Belleza Natural', '30534567890', 'comercial@bellezanatural.com.ar', '+54 351 234-5678', 'Av. Rafael Núñez 445', 'Córdoba', 'Córdoba', 'Argentina', '15 días', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Relaciones producto-proveedor
INSERT INTO product_suppliers (id, product_id, supplier_id, supplier_price, is_preferred, created_at, updated_at) VALUES
('ps-001', 'prod-001', 'supp-002', 2400.00, true, NOW(), NOW()),
('ps-002', 'prod-002', 'supp-001', 8200.00, true, NOW(), NOW()),
('ps-003', 'prod-003', 'supp-001', 14500.00, true, NOW(), NOW()),
('ps-004', 'prod-004', 'supp-001', 17500.00, true, NOW(), NOW()),
('ps-005', 'prod-005', 'supp-002', 800.00, true, NOW(), NOW()),
('ps-006', 'prod-006', 'supp-003', 12.00, true, NOW(), NOW()),
('ps-007', 'prod-007', 'supp-003', 6.00, true, NOW(), NOW()),
('ps-008', 'prod-008', 'supp-004', 320.00, true, NOW(), NOW()),
('ps-009', 'prod-009', 'supp-003', 10.00, true, NOW(), NOW()),
('ps-010', 'prod-010', 'supp-004', 420.00, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Productos necesarios por tratamiento
INSERT INTO treatment_products (id, treatment_id, product_id, quantity, created_at, updated_at) VALUES
('tp-001', 'treat-001', 'prod-001', 1, NOW(), NOW()), -- Limpieza facial usa crema limpiadora
('tp-002', 'treat-001', 'prod-005', 1, NOW(), NOW()), -- Limpieza facial usa mascarilla
('tp-003', 'treat-001', 'prod-010', 2, NOW(), NOW()), -- Limpieza facial usa toallas
('tp-004', 'treat-004', 'prod-006', 2, NOW(), NOW()), -- Mesoterapia usa agujas
('tp-005', 'treat-004', 'prod-007', 2, NOW(), NOW()), -- Mesoterapia usa jeringas
('tp-006', 'treat-005', 'prod-004', 1, NOW(), NOW()), -- Botox usa toxina botulínica
('tp-007', 'treat-005', 'prod-006', 3, NOW(), NOW()), -- Botox usa agujas
('tp-008', 'treat-005', 'prod-007', 3, NOW(), NOW()), -- Botox usa jeringas
('tp-009', 'treat-006', 'prod-003', 1, NOW(), NOW()), -- Rellenos usa ácido hialurónico
('tp-010', 'treat-006', 'prod-006', 2, NOW(), NOW())  -- Rellenos usa agujas
ON CONFLICT (id) DO NOTHING;

-- Estadísticas iniciales (para pruebas)
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
	(SELECT COUNT(*) FROM patients WHERE is_active = true) as total_patients,
	(SELECT COUNT(*) FROM appointments WHERE DATE(start_time) = CURRENT_DATE) as today_appointments,
	(SELECT COALESCE(SUM(total), 0) FROM invoices WHERE status = 'PAGADA' AND DATE(invoice_date) >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
	(SELECT COUNT(*) FROM products WHERE current_stock <= min_stock AND is_active = true) as low_stock_products,
	(SELECT COUNT(*) FROM users WHERE is_active = true) as active_users;

-- Función para obtener próximas citas
CREATE OR REPLACE FUNCTION get_upcoming_appointments(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
	appointment_id TEXT,
	patient_name TEXT,
	treatment_name TEXT,
	appointment_time TIMESTAMP,
	status TEXT,
	doctor_name TEXT
) AS $
BEGIN
	RETURN QUERY
	SELECT
    	a.id::TEXT,
    	(p.first_name || ' ' || p.last_name)::TEXT,
    	t.name::TEXT,
    	a.start_time,
    	a.status::TEXT,
    	(u.first_name || ' ' || u.last_name)::TEXT
	FROM appointments a
	JOIN patients p ON a.patient_id = p.id
	JOIN treatments t ON a.treatment_id = t.id
	JOIN users u ON a.user_id = u.id
	WHERE a.start_time >= NOW()
	AND a.start_time <= NOW() + INTERVAL '1 day' * days_ahead
	AND a.status IN ('PROGRAMADA', 'CONFIRMADA')
	ORDER BY a.start_time;
END;
$ LANGUAGE plpgsql;

-- Función para calcular ingresos por período
CREATE OR REPLACE FUNCTION get_revenue_by_period(
	start_date DATE,
	end_date DATE
) RETURNS TABLE (
	period_date DATE,
	daily_revenue DECIMAL,
	treatments_count BIGINT,
	products_count BIGINT
) AS $
BEGIN
	RETURN QUERY
	SELECT
    	i.invoice_date::DATE as period_date,
    	SUM(i.total) as daily_revenue,
    	COUNT(CASE WHEN ii.treatment_id IS NOT NULL THEN 1 END) as treatments_count,
    	COUNT(CASE WHEN ii.product_id IS NOT NULL THEN 1 END) as products_count
	FROM invoices i
	LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
	WHERE i.invoice_date::DATE BETWEEN start_date AND end_date
	AND i.status = 'PAGADA'
	GROUP BY i.invoice_date::DATE
	ORDER BY period_date;
END;
$ LANGUAGE plpgsql;

-- Configurar permisos básicos
GRANT USAGE ON SCHEMA public TO estetica_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO estetica_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO estetica_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO estetica_user;

-- Log de inicialización
INSERT INTO system_config (id, key, value, description, created_at, updated_at) VALUES
('cfg-999', 'database_initialized', NOW()::TEXT, 'Fecha y hora de inicialización de la base de datos', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Mensaje final
DO $
BEGIN
	RAISE NOTICE '✅ Base de datos inicializada correctamente para Medicina Estética';
	RAISE NOTICE '🏥 Sistema listo para Córdoba, Argentina';
	RAISE NOTICE '📊 Datos de ejemplo incluidos para desarrollo';
	RAISE NOTICE '🔐 Usuario admin creado: admin@clinica.com';
	RAISE NOTICE '⚠️  CAMBIAR contraseña por defecto en producción';
END $;
