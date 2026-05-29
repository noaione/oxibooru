FROM --platform=$BUILDPLATFORM node:lts AS builder
WORKDIR /opt/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./

ARG BUILD_INFO="docker-latest"
ARG BASE_URL="/"
ARG GIT_LINK=""
RUN BUILD_INFO="${BUILD_INFO}" BASE_URL="${BASE_URL}" GIT_LINK="${GIT_LINK}" pnpm run build


FROM nginx:alpine AS release

RUN apk --no-cache add dumb-init

COPY nginx.conf.docker /etc/nginx/nginx.conf
COPY docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh

COPY --from=builder /opt/app/dist /var/www

CMD ["/docker-start.sh"]
VOLUME ["/data"]

ARG DOCKER_REPO
ARG BUILD_DATE
ARG SOURCE_COMMIT
LABEL \
    org.opencontainers.image.title="${DOCKER_REPO}" \
    org.opencontainers.image.url="https://github.com/liamw1/oxibooru" \
    org.opencontainers.image.documentation="https://github.com/liamw1/oxibooru/blob/${SOURCE_COMMIT}/docs/INSTALL.md" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.source="https://github.com/liamw1/oxibooru" \
    org.opencontainers.image.revision="${SOURCE_COMMIT}" \
    org.opencontainers.image.licenses="GPL-3.0"
