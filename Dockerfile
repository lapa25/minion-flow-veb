FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_MOCK_API=false

RUN VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL VITE_MOCK_API=$VITE_MOCK_API npm run build


FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]