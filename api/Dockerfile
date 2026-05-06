FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json .
RUN npm install
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/server.js"]
