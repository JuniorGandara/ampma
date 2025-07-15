FROM node:18-alpine

# Instalar dependencias globales de Expo
RUN npm install -g @expo/cli@latest

# Crear directorio de trabajo
WORKDIR /app

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copiar archivos de configuración
COPY package*.json ./
COPY app.json ./

# Instalar dependencias
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Cambiar permisos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puertos Expo
EXPOSE 19000 19001 19002 19006

# Variables de entorno
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Comando por defecto
CMD ["npx", "expo", "start", "--web", "--tunnel"]
