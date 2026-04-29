FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Ensure data directory exists and has proper permissions
RUN mkdir -p data/uploads && chown -R node:node data

EXPOSE 3107

CMD ["node", "server.js"]
