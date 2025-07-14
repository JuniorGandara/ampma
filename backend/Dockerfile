FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache openssl postgresql-client

# Crear directorio de trabajo
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Crear directorios necesarios con permisos correctos
RUN mkdir -p /app/uploads /app/certs /app/credentials /app/logs
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando por defecto
CMD ["npm", "run", "dev"]
