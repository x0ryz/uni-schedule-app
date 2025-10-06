# frontend/Dockerfile

# 1. Строим проект
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# 2. Сервер для статики (nginx)
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Если нужно — можно добавить свой конфиг nginx, например:
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 5000
