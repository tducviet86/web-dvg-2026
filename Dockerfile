# syntax=docker/dockerfile:1.7
# FE-DVG production image (Next.js standalone server).
ARG NODE_VERSION=22.22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
# Rewrites to the API and allowed image hosts are fixed at build time.
ARG API_INTERNAL_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_COMPANY_PHONE=""
ARG MEDIA_REMOTE_PATTERNS=""
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_COMPANY_PHONE=$NEXT_PUBLIC_COMPANY_PHONE \
    MEDIA_REMOTE_PATTERNS=$MEDIA_REMOTE_PATTERNS \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN test -n "$API_INTERNAL_URL" && npx next build --webpack

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
