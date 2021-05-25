FROM node:14.15.4-alpine
WORKDIR /var/nodejs
COPY package*.json ./
COPY ./dist .
RUN npm install
EXPOSE 7575
CMD npm start