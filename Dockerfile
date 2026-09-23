# ==========================================
# Tahap 1: Builder (Kompilasi TypeScript & Prisma)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install openssl & libc6-compat untuk kompabilitas engine Prisma di Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Salin manifest dependensi dan skema database Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Install seluruh dependensi (termasuk devDependencies untuk kompilasi TypeScript)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Salin konfigurasi TypeScript dan seluruh source code backend
COPY tsconfig.json ./
COPY src ./src/

# Kompilasi TypeScript ke folder dist/
RUN npm run build

# ==========================================
# Tahap 2: Runner (Image Produksi yang Ringan & Aman)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies untuk Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5001

# Salin package manifest dan skema Prisma untuk runtime produksi
COPY package*.json ./
COPY prisma ./prisma/

# Install hanya dependensi produksi (hemat ukuran image)
RUN npm ci --only=production && npx prisma generate

# Salin folder dist hasil kompilasi dari builder stage
COPY --from=builder /app/dist ./dist

# Gunakan non-root user demi keamanan kontainer
USER node

# Port yang dibuka kontainer
EXPOSE 5001

# Perintah utama untuk menjalankan server backend
CMD ["node", "dist/server.js"]
