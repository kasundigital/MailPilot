FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --chown=node:node --chmod=755 src ./src
COPY --chown=node:node --chmod=755 public ./public
RUN test -r /app/src/server.js && test -x /app/src && test -r /app/public/index.html
USER node
EXPOSE 3088
CMD ["node","src/server.js"]
