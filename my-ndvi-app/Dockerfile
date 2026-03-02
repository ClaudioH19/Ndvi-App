FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
RUN chmod -R 755 node_modules/.bin
COPY . .
RUN sh src/images/rebuild_video.sh
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]