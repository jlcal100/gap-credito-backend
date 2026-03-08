FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Dummy DATABASE_URL only for prisma generate (does not connect, only parses)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npm ci

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

EXPOSE 3000

CMD ["node", "src/index.js"]
