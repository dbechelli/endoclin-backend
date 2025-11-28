# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Instalar dumb-init para melhor manejo de sinais
RUN apk add --no-cache dumb-init

# Copiar node_modules do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Usar dumb-init para iniciar a aplicação
ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "start"]
