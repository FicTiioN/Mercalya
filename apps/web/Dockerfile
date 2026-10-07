# syntax=docker/dockerfile:1
#
# Frontend estatico servido por nginx. O contexto do build e a RAIZ do monorepo
# e a URL da API entra no build (o Vite a grava no bundle):
#
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://api.exemplo.com/api -t mercalya-web .
#
# Hospedagens de site estatico (Cloudflare Pages, Vercel) dispensam esta
# imagem: basta `npm run build --workspace @mercalya/web` com VITE_API_URL.

FROM node:20.19-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/
RUN npm ci --workspace @mercalya/web

COPY packages/domain packages/domain
COPY apps/web apps/web

ARG VITE_API_URL
ARG VITE_PROVEDOR_PAGAMENTO
ENV VITE_API_URL=$VITE_API_URL \
    VITE_PROVEDOR_PAGAMENTO=$VITE_PROVEDOR_PAGAMENTO
RUN npm run build --workspace @mercalya/web

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS producao
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
