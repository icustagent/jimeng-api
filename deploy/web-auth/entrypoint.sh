#!/bin/sh
set -e

# 必須由 docker compose 用環境變數帶入
: "${JIMENG_GUI_USER:?missing JIMENG_GUI_USER}"
: "${JIMENG_GUI_APIKEY:?missing JIMENG_GUI_APIKEY}"

# 生成 htpasswd 檔案（-b: 非互動, -c: 建立新檔）
htpasswd -bc /etc/nginx/.htpasswd "$JIMENG_GUI_USER" "$JIMENG_GUI_APIKEY" >/dev/null

exec nginx -g "daemon off;"
