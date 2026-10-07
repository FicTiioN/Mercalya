# syntax=docker/dockerfile:1
#
# Imagem de producao da API. O contexto do build e a RAIZ do monorepo:
#
#   docker build -f apps/api/Dockerfile -t mercalya-api .
#
# Ao subir, o container aplica as migracoes pendentes (`migrate deploy`, nunca
# `migrate dev`) e so entao inicia a API. Com varias replicas subindo juntas, o
# Prisma serializa as migracoes por um lock no proprio Postgres.

FROM node:20.19-bookworm-slim AS base
# O engine do Prisma precisa de OpenSSL; a imagem slim nao traz.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------------------
# Manifestos do monorepo. Copiados sozinhos para o `npm ci` ficar em cache
# enquanto nenhuma dependencia mudar.
FROM base AS manifestos
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/domain/package.json packages/domain/

# ---------------------------------------------------------------------------
# Build: dependencias completas, client do Prisma e `nest build`.
FROM manifestos AS build
RUN npm ci --workspace @mercalya/api
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN npm run prisma:generate --workspace @mercalya/api \
  && npm run build --workspace @mercalya/api

# ---------------------------------------------------------------------------
# So as dependencias de producao. O client gerado vem do estagio de build,
# porque o `npm ci` daqui gera um client vazio (nao enxerga o schema).
FROM manifestos AS dependencias
RUN npm ci --workspace @mercalya/api --omit=dev \
  && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS producao
ENV NODE_ENV=production
# As datas "de hoje" do painel e das notificacoes usam o fuso do processo.
ENV TZ=America/Sao_Paulo

COPY --from=dependencias /app ./
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma

# Sem root: se a API for comprometida, o processo nao manda no container.
USER node
WORKDIR /app/apps/api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# `exec` faz o node virar o PID 1: o SIGTERM do orquestrador chega na API, que
# fecha as conexoes do Prisma antes de sair.
CMD ["sh", "-c", "npx --no-install prisma migrate deploy && exec node dist/main.js"]
