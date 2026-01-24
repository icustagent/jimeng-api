# build stage: 用 Node 22（符合 Vite 7 需求）
FROM node:22-bookworm-slim AS build
WORKDIR /src

# 只複製 package 檔案以利 cache
COPY jimeng-web-ui/package*.json ./
RUN npm ci

# 複製前端原始碼並 build
COPY jimeng-web-ui/ ./
RUN npm run build

# runtime stage: 用 nginx 提供靜態檔
FROM nginx:1.29-alpine
COPY --from=build /src/dist/ /usr/share/nginx/html/
COPY deploy/web-ui/default.conf /etc/nginx/conf.d/default.conf
