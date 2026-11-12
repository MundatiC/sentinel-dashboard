# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are compiled into the browser bundle, so they must be known at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Optional same-origin mode: build with --build-arg NEXT_PUBLIC_API_URL=/ --build-arg API_PROXY_TARGET=https://api.example.com
ARG API_PROXY_TARGET=
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN npm run build

# ---- run ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# "standalone" output contains only what the server needs.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/login || exit 1
CMD ["node", "server.js"]
