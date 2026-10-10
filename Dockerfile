FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY public ./public
COPY .env.example ./
RUN mkdir -p /var/data && chown -R node:node /app /var/data
USER node
ENV DATA_DIR=/var/data
EXPOSE 3000
CMD ["npm", "start"]
