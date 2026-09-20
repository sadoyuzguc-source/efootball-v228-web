# eFootball v228 Web - production image
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# Kalıcı veri klasörü - Render/Fly/Railway'de volume olarak bağla
ENV DATA_DIR=/data
ENV HOST=0.0.0.0
ENV PORT=3228

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/public ./public
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/index.html ./index.html
COPY --from=build /app/vite.config.mjs ./vite.config.mjs

# Boş data klasörü - ilk açılışta import gerekir veya volume'den gelir
RUN mkdir -p /data /app/public/uploads /app/public/themes

EXPOSE 3228
CMD ["node", "server/index.mjs", "--production"]

# bust cache 234ce2b-2
