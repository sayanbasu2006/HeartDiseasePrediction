FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
ENV NEXT_TELEMETRY_DISABLED=1 BACKEND_URL=http://backend:8000
RUN npm run build
EXPOSE 3000
CMD ["npx","next","start","--hostname","0.0.0.0"]
