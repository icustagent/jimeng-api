FROM nginx:1.29-alpine

# 提供 htpasswd 工具用來生成 /etc/nginx/.htpasswd
RUN apk add --no-cache apache2-utils

COPY deploy/web-auth/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/web-auth/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
