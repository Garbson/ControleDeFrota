FROM node:22-alpine

WORKDIR /app

# Dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY migrations ./migrations
COPY uploads ./uploads
COPY scripts ./scripts

RUN chmod +x /app/scripts/backup-loop.sh

EXPOSE 4000

USER node

CMD ["node", "src/app.js"]
