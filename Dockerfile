FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app ./app
COPY web ./web
COPY .env.example ./

CMD ["node", "app/index.js"]
