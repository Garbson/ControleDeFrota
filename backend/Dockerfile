FROM node:20-alpine

WORKDIR /app

# Dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
COPY migrations ./migrations
COPY uploads ./uploads

EXPOSE 4000

USER node

CMD ["node", "src/app.js"]
