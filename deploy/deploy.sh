#!/usr/bin/env bash
# 把本仓库的静态站点用 rsync 同步到服务器。
# 连接信息全部来自环境变量，不要在这个文件里写 IP、账号或私钥。
# 变量说明见 docs/DEPLOY_CN.md。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need() {
  if [[ -z "${!1:-}" ]]; then
    echo "缺少环境变量 $1。需要的名字和填法见 docs/DEPLOY_CN.md。" >&2
    exit 1
  fi
}

need DEPLOY_HOST
need DEPLOY_USER
need DEPLOY_SSH_KEY
need DEPLOY_PATH

if [[ -z "${DEPLOY_PORT:-}" ]]; then
  DEPLOY_PORT=22
fi

if [[ ! "$DEPLOY_PORT" =~ ^[0-9]+$ ]] || (( DEPLOY_PORT < 1 || DEPLOY_PORT > 65535 )); then
  echo "DEPLOY_PORT 必须是 1 到 65535 的数字。" >&2
  exit 1
fi
if [[ ! "$DEPLOY_HOST" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "DEPLOY_HOST 只能包含字母、数字、点、下划线和连字符（填公网 IPv4 或域名）。" >&2
  exit 1
fi
if [[ ! "$DEPLOY_USER" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "DEPLOY_USER 格式不正确。" >&2
  exit 1
fi
if [[ ! "$DEPLOY_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "DEPLOY_PATH 必须是不含空格的绝对路径，例如 /var/www/little-ears。" >&2
  exit 1
fi

DEST="${DEPLOY_PATH%/}"
case "${DEST}/" in
  *//*|*/./*|*/../*)
    echo "DEPLOY_PATH 不能包含重复斜杠或 .、.. 路径段。" >&2
    exit 1
    ;;
esac
case "$DEST" in
  /|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/opt|/proc|/root|/run|/sbin|/sys|/tmp|/usr|/var|/var/www)
    echo "DEPLOY_PATH 过于宽泛（$DEST）。请使用只放这个网站的目录，例如 /var/www/little-ears。" >&2
    exit 1
    ;;
  /etc/*|/var/lib/letsencrypt|/var/lib/letsencrypt/*|/var/log/letsencrypt|/var/log/letsencrypt/*)
    echo "DEPLOY_PATH 不能指向系统配置或 certbot 目录。" >&2
    exit 1
    ;;
esac

KEY_FILE="$(mktemp)"
KNOWN_FILE="$(mktemp)"
trap 'rm -f "$KEY_FILE" "$KNOWN_FILE"' EXIT

if [[ -f "$DEPLOY_SSH_KEY" ]]; then
  cp "$DEPLOY_SSH_KEY" "$KEY_FILE"
elif [[ "$DEPLOY_SSH_KEY" == *"PRIVATE KEY"* ]]; then
  printf '%s\n' "$DEPLOY_SSH_KEY" > "$KEY_FILE"
else
  echo "DEPLOY_SSH_KEY 既不是已存在的私钥文件路径，也不是私钥内容。" >&2
  exit 1
fi
chmod 600 "$KEY_FILE"
if [[ ! -s "$KEY_FILE" ]]; then
  echo "DEPLOY_SSH_KEY 是空的。本地使用时填私钥文件路径；GitHub Actions 里填私钥全文。" >&2
  exit 1
fi

if [[ "${DEPLOY_DRY_RUN:-}" == "1" ]]; then
  echo "dry-run：将把站点同步到 ${DEPLOY_USER}@${DEPLOY_HOST}:${DEST}/ （SSH 端口 ${DEPLOY_PORT}），未连接服务器。"
  exit 0
fi

if [[ -n "${DEPLOY_KNOWN_HOSTS:-}" ]]; then
  printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$KNOWN_FILE"
else
  echo "未设置 DEPLOY_KNOWN_HOSTS，正在获取 ${DEPLOY_HOST} 的主机指纹……"
  ssh-keyscan -p "$DEPLOY_PORT" -H "$DEPLOY_HOST" > "$KNOWN_FILE" 2>/dev/null || true
fi
if [[ ! -s "$KNOWN_FILE" ]]; then
  echo "拿不到服务器主机指纹。请确认地址和端口，或设置 DEPLOY_KNOWN_HOSTS。" >&2
  exit 1
fi

RSYNC_RSH="ssh -i ${KEY_FILE} -p ${DEPLOY_PORT} -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${KNOWN_FILE} -o IdentitiesOnly=yes"

echo "创建目录 ${DEST}"
# shellcheck disable=SC2029
ssh -i "$KEY_FILE" -p "$DEPLOY_PORT" \
  -o BatchMode=yes -o ConnectTimeout=20 -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$KNOWN_FILE" -o IdentitiesOnly=yes \
  "${DEPLOY_USER}@${DEPLOY_HOST}" "mkdir -p ${DEST}"

echo "同步文件……"
# 只发布站点入口和 assets；其余文件既不上传，也不参与 --delete。
# 显式保护 ACME 校验目录，证书和 Nginx 配置始终由服务器单独管理。
rsync -az --delete --human-readable --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  --filter 'P /.well-known/***' \
  --exclude '/.well-known/' \
  --include '/index.html' \
  --include '/sw.js' \
  --include '/manifest.webmanifest' \
  --include '/assets/***' \
  --exclude '*' \
  -e "$RSYNC_RSH" \
  "${ROOT}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEST}/"

echo "已同步到 ${DEPLOY_USER}@${DEPLOY_HOST}:${DEST}/"
echo "静态文件替换后不需要重启 Nginx。若刚改过 Nginx 配置，在服务器上执行：sudo nginx -t && sudo systemctl reload nginx"
