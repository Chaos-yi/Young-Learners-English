# 国内部署说明

本站是纯静态儿童英语学习站和 PWA，无构建步骤。学习记录保存在浏览器本地；日常发布只更新站点文件。

## 当前线上信息

| 项目 | 当前值 |
|---|---|
| 域名 | `loveran.com.cn`、`www.loveran.com.cn` |
| HTTPS 入口 | <https://loveran.com.cn/>、<https://www.loveran.com.cn/> |
| 服务器 | 阿里云 ECS，Ubuntu 20.04，公网 IP `8.133.216.64` |
| 站点目录 | `/var/www/little-ears` |
| Web 服务 | Nginx |
| HTTPS | certbot 管理的 Let's Encrypt 证书，自动续期 |
| ICP 备案 | `沪ICP备2026035258号-2`，首页页脚可见并链接到 <https://beian.miit.gov.cn/> |
| 公安备案 | 审核中，号码尚未下发，页脚占位链接保持隐藏 |

根域名和 `www` 的 DNS A 记录均指向 `8.133.216.64`；安全组需允许 HTTP 80、HTTPS 443 以及部署使用的 SSH 端口。

## Nginx 与证书

仓库保存三份配置，供管理员核对、手动维护：

- `deploy/nginx/little-ears.conf`：根据 certbot 修改后的线上配置整理。80 端口除 ACME 校验路径外，均以 301 跳转 HTTPS；443 同时服务两个域名。
- `deploy/nginx/little-ears.locations.conf`：由主配置引入，服务器上放在 `/etc/nginx/snippets/little-ears.locations.conf`。
- `deploy/nginx/little-ears.http.conf`：仅用于新服务器首次申请证书前的 HTTP 引导，不能与 HTTPS 配置同时启用。现有线上服务器无需切回此配置。

HTTPS 配置引用以下服务器文件，仓库不保存证书或私钥内容：

```text
/etc/letsencrypt/live/loveran.com.cn/fullchain.pem
/etc/letsencrypt/live/loveran.com.cn/privkey.pem
/etc/letsencrypt/options-ssl-nginx.conf
/etc/letsencrypt/ssl-dhparams.pem
```

HTTP 和 HTTPS 均单独放行 `/.well-known/acme-challenge/`，文件位于 `/var/www/little-ears/.well-known/acme-challenge/`。certbot 的自动续期任务由服务器管理；管理员可在服务器执行 `sudo certbot renew --dry-run` 检查续期。仅管理员手动修改 Nginx 配置时，才需执行 `sudo nginx -t && sudo systemctl reload nginx`。

缓存策略：`sw.js`、`index.html`、无内容哈希的 CSS / JS 使用 `Cache-Control: no-cache`；manifest 缓存一天，字体和图标缓存 30 天。启用 gzip，拒绝访问 `.git` 等隐藏路径，ACME 校验目录除外。

## 发布范围与保护

`deploy/deploy.sh` 通过 SSH / rsync 发布到 `DEPLOY_PATH`，只允许上传：

```text
index.html
sw.js
manifest.webmanifest
assets/
```

`deploy/`、`docs/`、`.github/`、`.git/`、README 及其他非站点文件不会上传。脚本不会复制 Nginx 配置、重启服务或运行 certbot。

rsync 使用 `--delete` 清理发布范围内的旧文件，但显式保护并排除 `/.well-known/`；其余非站点文件也由排除规则保护，不参与删除。不得添加 `--delete-excluded` 或移除 ACME 保护规则。证书仍保存在 `/etc/letsencrypt/`，与站点目录分开。`DEPLOY_PATH` 必须使用站点专用目录 `/var/www/little-ears`，不要指向 Nginx、certbot 或其他系统目录。

### GitHub Actions

工作流 `.github/workflows/deploy-cn.yml`（**Deploy to mainland server**）在 push 到 `claude/epic-gates-w5p8og` 时发布，也支持 `workflow_dispatch` 手动运行。它调用同一个部署脚本。

在仓库 **Settings → Secrets and variables → Actions** 配置：

| Secret | 必填 | 内容 |
|---|---|---|
| `DEPLOY_HOST` | 是 | `8.133.216.64`，或解析到该 ECS 的域名 |
| `DEPLOY_USER` | 是 | 有权写入站点目录的 SSH 部署用户 |
| `DEPLOY_SSH_KEY` | 是 | 部署私钥全文，对应公钥应已配置在部署用户的 `authorized_keys` 中 |
| `DEPLOY_PATH` | 是 | `/var/www/little-ears` |
| `DEPLOY_KNOWN_HOSTS` | 否 | 已核对的 SSH 主机指纹内容；有值时直接写入临时 known_hosts，没有时使用 `ssh-keyscan` 获取 |
| `DEPLOY_PORT` | 否 | SSH 端口，默认 `22` |

私钥只经环境变量写入权限为 `600` 的临时文件，退出时删除，不打印到日志，不提交到仓库。缺少必填 Secrets 时，push 触发的部署跳过，手动触发则失败并只列出缺少的变量名。

### 本机手动发布

以下命令会连接服务器，仅在需要实际发布时由维护者执行：

```bash
DEPLOY_HOST=8.133.216.64 \
DEPLOY_USER=deploy \
DEPLOY_SSH_KEY="$HOME/.ssh/little-ears-deploy" \
DEPLOY_PATH=/var/www/little-ears \
bash deploy/deploy.sh
```

本机的 `DEPLOY_SSH_KEY` 可以是私钥文件路径。设置 `DEPLOY_DRY_RUN=1` 时只检查变量和密钥，不连接服务器。

## 备案与发布后检查

ICP 号保存在 `index.html` 页脚，当前为 `沪ICP备2026035258号-2`，链接保持 `https://beian.miit.gov.cn/`，使用 `target="_blank" rel="noopener"`，不隐藏。

公安备案审核通过前，保留 `京公网安备XXXXXXXXXXXXX号` 占位及隐藏逻辑。号码下发后替换为完整编号；页面脚本会显示链接，并将数字拼入公安备案查询地址。

每次发布后检查：

1. 两个域名均可通过 HTTPS 打开，HTTP 自动跳转，页脚备案号可见。
2. `sw.js`、`index.html` 的响应头含 `Cache-Control: no-cache`，manifest 类型为 `application/manifest+json`。
3. 首页、新手引导、家长中心、英语发音和录音正常；联网打开并刷新后，PWA 离线可打开页面。B 站动画仍需联网。
4. 发布没有删除 `/.well-known/`，certbot 自动续期任务正常。

离线缓存当前版本为 `v4`。以后增删站点资源时，须同步更新 `sw.js` 的 `SHELL` 列表并递增 `VERSION`。所有站内资源使用相对路径，字体自托管。

本地验证可在仓库运行 `python3 -m http.server 8000 --bind 127.0.0.1`，用 `curl` 检查首页、备案号和静态资源。
