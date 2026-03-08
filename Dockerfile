FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Provide a dummy DATABASE_URL for prisma generate (only needs it to parse, not connect)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npm ci

COPY . .

RUN npx prisma generate

# Remove dummy - real URL comes from Railway env vars at runtime
ENV DATABASE_URL=""

EXPOSE 3000

CMD ["node", "src/index.js"]
