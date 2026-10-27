# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# Dùng npm ci nếu có package-lock.json, ngược lại npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
# Build frontend (Vite) -> /app/dist
RUN npx vite build
 
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# server.ts import 'vite' và chạy bằng tsx nên giữ nguyên node_modules (gồm devDependencies)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json server.ts tsconfig.json ./
COPY src ./src
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/ws/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "server.ts"]
 