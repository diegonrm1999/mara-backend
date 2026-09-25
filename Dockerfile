# Etapa 1: Instala dependencias y genera Prisma Client
FROM node:18-alpine AS builder
WORKDIR /app

# Copiamos package.json y prisma/schema.prisma
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Instalamos dependencias necesarias para prisma generate
RUN npm install

# Generar cliente prisma en entorno Linux compatible
RUN npx prisma generate

# Copiamos el resto del código
COPY . .

# Compilamos el proyecto NestJS
RUN npm run build

# Etapa 2: Imagen final, más liviana
FROM node:18-alpine
WORKDIR /app

# Copiar node_modules y dist desde builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Variables y ejecución
EXPOSE 8080
ENV PORT=8080

CMD ["npm", "run", "start:prod"]