FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY lib ./lib
COPY data ./data
COPY worker ./worker
ENV NODE_ENV=production
CMD ["node", "worker/server.mjs"]
