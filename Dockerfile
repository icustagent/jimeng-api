# =========================
# Build stage
# =========================
FROM node:18-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-engines

COPY . .

ARG VERSION
RUN if [ -n "$VERSION" ]; then \
    echo "Updating package.json version to $VERSION"; \
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json; \
    cat package.json | grep version; \
    fi

RUN yarn build

# =========================
# Production stage
# =========================
FROM node:18-bookworm-slim AS production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && useradd -m -u 1001 -g nodejs jimeng

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# 安裝 production 依賴
RUN yarn install --frozen-lockfile --production --ignore-engines && yarn cache clean

# 關鍵：在「最終運行鏡像」安裝 Playwright 瀏覽器 + OS 依賴
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

COPY --from=builder --chown=jimeng:nodejs /app/dist ./dist
COPY --from=builder --chown=jimeng:nodejs /app/configs ./configs

RUN mkdir -p /app/logs /app/tmp && \
    chown -R jimeng:nodejs /app/logs /app/tmp && \
    chown -R jimeng:nodejs /ms-playwright

ENV SERVER_PORT=5100
USER jimeng

EXPOSE 5100

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://localhost:5100/ping || exit 1

CMD ["yarn", "start"]
