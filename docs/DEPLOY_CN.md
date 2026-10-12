# 部署到中国大陆云服务器

把「小耳朵英语」放到阿里云或腾讯云的轻量应用服务器上，用自己的域名通过 ICP 备案后访问。网站是纯静态文件：Nginx 直接提供 `index.html` 和 `assets/`，不需要数据库、Node 或 Python 常驻进程。

动画在 B 站播放器里播放，流量不经过这台服务器。这台机器只负责页面、字体、脚本和图标。

## 1. 国内访问审计

发布前检查了 `index.html`、`sw.js`、`manifest.webmanifest`、`assets/css/`、`assets/js/`、`assets/fonts/`。页面运行时**没有**这些在大陆经常打不开或很慢的资源：

| 类型 | 结果 |
|---|---|
| Google Fonts / `fonts.gstatic.com` | 没有。字体已放在 `assets/fonts/`，由 `assets/fonts/fonts.css` 用相对路径加载（SIL OFL 1.1） |
| jsDelivr、unpkg、cdnjs、BootCDN | 没有。样式和脚本都在本仓库 |
| Google Analytics、gtag 或其他统计脚本 | 没有，也没有为国内另加统计 |
| YouTube 或其他境外视频嵌入 | 没有 |

保留下来的第三方只有家长自己粘贴的 **B 站** 链接，域名是 `player.bilibili.com`、`www.bilibili.com`、`search.bilibili.com`。这是给大陆网络用的视频来源，用来代替 YouTube。Service Worker 只缓存本站文件，不拦截、不缓存这些跨域请求，避免播放器被离线缓存弄坏。

朗读用浏览器自带的 `speechSynthesis`，声音在平板本机合成，不会去请求 Google 的语音服务。代码里出现的 “Google UK English” 是 Chrome 本机语音的名字，不是网络地址。

因此这次没有要替换的外链。页脚和样式有改动，`sw.js` 的 `VERSION` 已从 `v2` 改为 `v3`，旧缓存会在下次打开时换掉。

网站要放在域名**根路径**（`https://你的域名/`）。`manifest.webmanifest` 的 `scope` 是 `./`。不要放到 `https://你的域名/english/` 这种子目录，否则「添加到桌面」和离线缓存会对不上。

## 2. 开始之前

按这个顺序做，后面的步骤会用到前面的结果：

1. 买一台**中国大陆**地域的轻量服务器，记下公网 IPv4。
2. 买域名，并用**同一个人的身份证**完成域名实名。
3. 域名解析到这台服务器，放行 80 端口，让首页能打开。
4. 提交 ICP 备案，等管局通过。
5. 配置 HTTPS。
6. 用本文的脚本或 GitHub Actions 发布文件。
7. 把备案号填进 `index.html` 页脚，再发布一次。
8. 网站上线后 30 日内做公安备案，把公安备案号也填进页脚。

备案期间可以先用 HTTP 让审核人员打开首页。话筒录音和 Service Worker 只在 `https://`（或本机 `http://localhost`）下可用，所以给孩子正式用之前必须做完第 5 步。

## 3. 买服务器

家庭使用选**轻量应用服务器**即可，不必买高配 ECS。阿里云产品名是「轻量应用服务器」，腾讯云产品名也是「轻量应用服务器」（控制台里有时写作 Lighthouse）。如果已经有同地域的 ECS，可以继续用，Nginx 配置一样。

| 项目 | 建议 |
|---|---|
| 地域 | 中国大陆，例如杭州、上海、北京、广州、成都。选离家里近的即可。**不要**买香港、澳门、新加坡、硅谷，那些机器不能做大陆 ICP 备案 |
| 镜像 | Ubuntu 22.04 LTS 或 24.04 LTS 的**系统镜像**。不要选预装网站面板的应用镜像，本文按系统自带的 Nginx 来写 |
| 配置 | 2 核 CPU、2 GB 内存、40 GB SSD。只有 1 核 2 GB 也够 |
| 带宽 | 峰值 3–5 Mbps。页面一共不到几 MB；看动画的流量在 B 站 |
| 流量 | 用轻量套餐自带的月流量。家庭每天打开几次，用不到多少 |
| 时长 | 备案期间不要释放实例。可以先买一个月把流程走通，提交备案之后不要随便更换公网 IP |

价格以控制台当时的标价为准，选大陆地域的入门套餐即可。

买好之后：

1. 在控制台重置 Linux 登录密码，或绑定你自己的 SSH 公钥。下面发布用的是另一把专门的部署公钥，两把可以同时存在。
2. 打开防火墙（ECS 上叫安全组），放行 TCP **22**、**80**、**443**。只改操作系统里的防火墙不够，云控制台这一层也要放行。
3. 记下公网 IPv4。后面的 `DEPLOY_HOST` 和 DNS 都填它。

## 4. 买域名

在**同一家云厂商**买域名（阿里云万网或腾讯云域名注册），备案时域名和服务器在同一个账号里，领取备案服务号更直接。

1. 在域名注册页查询名字。`.com`、`.cn`、`.net` 都可以。`.cn` 同样要实名。
2. 域名持有者填你本人。个人备案时，**域名实名认证的人必须和备案主体是同一个人**。
3. 按页面上传身份证，完成实名。常见是几小时到 3 个工作日。实名没通过不能提交备案。
4. 先不要把域名解析到境外空间，也不要套 Cloudflare 这类境外代理。备案要求域名指向大陆这段服务器。

解析记录放到第 8 节，等服务器能响应 80 端口再做也可以，但提交备案前必须已经指向这台机器。

## 5. ICP 备案

依据是《非经营性互联网信息服务备案管理办法》。这里写的是**个人、家庭自用、不收费、不招生**的静态学习页。各省通信管理局的表单名称略有差别，以备案系统里当前页面为准。

如果以后要对外开放、收费授课或做成培训机构网站，个人备案通常不够，可能还需要企业主体和办学许可等前置审批。那不在本文范围内。

### 5.1 在哪里提交

登录买服务器的那家控制台，进入「备案」：

- 阿里云：控制台搜索「ICP 备案」
- 腾讯云：控制台搜索「网站备案」

先给这台轻量服务器领取**备案服务号**（页面上也可能叫备案授权码）。一个网站（带 `www` 和不带 `www` 算同一个）用一个服务号。能领几个以控制台显示为准。

### 5.2 材料

准备好这些再开始填，中途缺材料会拖时间：

- 备案人身份证正反面彩色照片，四角完整，不能反光
- 备案人本人实名的手机号（用来收验证码和工信部核验短信）和邮箱
- 域名证书（域名控制台可以下载）
- 网站名称：填 **小耳朵英语**
- 网站内容说明：家庭自用的少儿英语学习页面，不收费、不招生、没有用户注册和支付
- 人脸核验。多数省份用云厂商 App 或小程序做。个别省份仍要求在指定幕布前拍照，按页面提示即可
- 系统生成的备案承诺书，按要求签字或在线确认

网站名称不要用「学校」「培训」「教育机构」，也不要使用「中国」「中华」「全国」这类受限词。首页标题已经是「小耳朵英语」，和备案名称一致即可。

备注里写清楚：页面是静态文件，视频使用 B 站外链，学习记录只保存在使用者自己的浏览器里。

### 5.3 流程和大概时间

1. **云厂商初审**：材料齐全时常见 1–2 个工作日。照片不清晰、域名未实名、网站打不开，会退回来改。
2. **工信部短信核验**：初审通过后，手机会收到工信部核验短信。**24 小时内**按短信里的链接完成核验。超时订单作废，要重新提交。
3. **省通信管理局审核**：多数省份大约 5–20 个工作日，没有全国统一的天数。
4. 全部通过后，系统发备案号，形如 `京ICP备12345678号-1`。省份简称随你的主体所在地变化，不一定是「京」。

整体常见是 **1–3 周**。备案系统里的状态以订单为准，不要按某一篇旧攻略的天数硬等。

审核期间：

- 域名已经解析到这台大陆服务器，80 端口能打开首页
- 不要释放服务器，不要更换公网 IP。换了 IP 要在备案里更新接入信息
- 首页必须能直接打开，不要加登录墙
- 页脚里的 `XXXXXXXX` 占位这时是隐藏的，页面上不会出现一个假备案号

通过之后，按第 10 节把真实编号填上并重新发布。备案号要放在首页底部，并且链接到 <https://beian.miit.gov.cn/>。这一点页脚已经做好了。

## 6. 安装 Nginx

下面的命令在服务器上用 `root` 执行（腾讯云 Ubuntu 镜像有时默认用户是 `ubuntu`，先 `sudo -i`）。把 `example.com` 换成你的域名。

```bash
apt update
apt install -y nginx rsync openssh-server
systemctl enable --now nginx

adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -d -m 755 -o deploy -g deploy /var/www/little-ears

# 把你的部署公钥贴进 authorized_keys（一行，以 ssh-ed25519 开头）
nano /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

如果系统里还开着 `ufw`，同样放行 22、80、443：

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

公钥的生成在第 9 节。可以先跳过去生成好，再回到这里粘贴。

确认网站目录空着也能由 Nginx 读到。发布脚本会把文件的属主写成 `deploy`，权限是目录 `755`、文件 `644`，`www-data` 可以读。

### 6.1 先启用 HTTP 配置

备案审核和申请证书之前，用只监听 80 端口的配置。仓库里的文件：

- `deploy/nginx/little-ears.locations.conf`
- `deploy/nginx/little-ears.http.conf`
- `deploy/nginx/little-ears.conf`（有证书之后再换这个）

在**你自己的电脑**上，从仓库目录把配置拷到服务器（这时还没有部署密钥也可以用 root 密码或你自己的密钥）：

```bash
scp deploy/nginx/little-ears.locations.conf root@你的公网IP:/etc/nginx/snippets/little-ears.locations.conf
scp deploy/nginx/little-ears.http.conf root@你的公网IP:/etc/nginx/sites-available/little-ears.conf
```

然后在服务器上：

```bash
mkdir -p /etc/nginx/snippets /etc/nginx/ssl/little-ears /var/www/little-ears
sed -i 's/example.com/你的域名/g' /etc/nginx/sites-available/little-ears.conf
ln -sf /etc/nginx/sites-available/little-ears.conf /etc/nginx/sites-enabled/little-ears.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

有的云镜像不用 `sites-enabled`，而是把配置放在 `/etc/nginx/conf.d/`。如果 `sites-enabled` 不存在，改成：

```bash
sed -i 's/example.com/你的域名/g' /etc/nginx/conf.d/little-ears.conf
rm -f /etc/nginx/conf.d/default.conf
nginx -t && systemctl reload nginx
```

`little-ears.locations.conf` 仍然放在 `/etc/nginx/snippets/`，两个主配置都是从这个绝对路径引入的。

这份 HTTP 配置会：

- 打开 gzip
- `sw.js`、`.css`、`.js`、`index.html` 使用 `Cache-Control: no-cache`，避免平板一直拿着旧的 Service Worker
- `.webmanifest` 的类型是 `application/manifest+json`
- `.woff2` 的类型是 `font/woff2`，并缓存 30 天
- 图标缓存 30 天
- 未知路径回落到 `index.html`（页面路由在 `#/` 后面，服务器平时只收到 `/`）
- 拒绝 `/.git` 这类点开头的路径；`/.well-known/acme-challenge/` 单独放行，给证书申请用

IPv6 默认没有打开。大陆轻量服务器经常没配 IPv6，写上 `listen [::]:80` 会导致 Nginx 启动失败。机器确实有公网 IPv6 时，再按配置文件里的注释加上。

## 7. 免费 HTTPS 证书

给孩子正式用之前要做这一步。没有 HTTPS，浏览器不允许录音，也不会注册 Service Worker。

优先用云厂商控制台的免费 DV 证书。在大陆申请和下载都比较直接。Let's Encrypt 作为备选。

### 7.1 阿里云或腾讯云免费证书

1. 在同一账号的 SSL 证书控制台申请免费证书（名称可能是「免费证书」「个人测试证书」或 TrustAsia / DigiCert 免费 DV）。有效期和每个账号能申请的数量以控制台为准，近几年常见是大约 90 天。
2. 绑定你的域名。`www` 和根域名都要能访问的话，申请时把两个名字都写上，或分别申请。
3. 下载时选择 **Nginx** 格式。
4. 把证书文件放到服务器：

```bash
# 下载包里的 pem（证书，若还有 chain 就把证书放在上面、链放在下面，合成一个文件）
# 对应 fullchain.pem；key 文件对应 privkey.pem
install -m 644 /root/fullchain.pem /etc/nginx/ssl/little-ears/fullchain.pem
install -m 600 /root/privkey.pem /etc/nginx/ssl/little-ears/privkey.pem
```

5. 换成 HTTPS 配置。在你自己的电脑上：

```bash
scp deploy/nginx/little-ears.conf root@你的公网IP:/etc/nginx/sites-available/little-ears.conf
```

在服务器上把域名替换掉并检查：

```bash
sed -i 's/example.com/你的域名/g' /etc/nginx/sites-available/little-ears.conf
nginx -t && systemctl reload nginx
```

`nginx -t` 失败时，先确认两个 pem 文件都在 `/etc/nginx/ssl/little-ears/`，并且配置里的域名已经换掉。证书文件不存在时，Nginx 会拒绝加载这个配置。

到期前在控制台续费或重新申请，覆盖那两个 pem，再执行一次 `nginx -t && systemctl reload nginx`。过期之后网站会打不开，录音和离线缓存也会一起失效。

### 7.2 备选：acme.sh 和 Let's Encrypt

80 端口已经指向这台机器、HTTP 配置已经启用时，可以在服务器上：

```bash
apt install -y curl socat
curl https://get.acme.sh | sh
source ~/.bashrc
acme.sh --issue -d 你的域名 -d www.你的域名 --webroot /var/www/little-ears
mkdir -p /etc/nginx/ssl/little-ears
acme.sh --install-cert -d 你的域名 \
  --key-file /etc/nginx/ssl/little-ears/privkey.pem \
  --fullchain-file /etc/nginx/ssl/little-ears/fullchain.pem \
  --reloadcmd "systemctl reload nginx"
```

然后同样换成 `deploy/nginx/little-ears.conf` 并 `nginx -t && systemctl reload nginx`。acme.sh 会安装定时任务自动续期。如果服务器访问 Let's Encrypt 不稳定，改回 7.1 的云厂商证书。

## 8. DNS

在域名控制台添加两条记录，记录值都是服务器公网 IPv4：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| `@` | A | 公网 IPv4 |
| `www` | A | 同一个公网 IPv4 |

TTL 用 10 分钟即可。不要开启境外 CDN 代理。

检查：

```bash
dig +short 你的域名 A
dig +short www.你的域名 A
```

两条都应该是那台服务器的 IP。有的网络禁 ping，解析正确即可，不必要求 ping 通。

HTTPS 配好之后：

```bash
curl -fsSI https://你的域名/ | head -n 15
curl -fsSI https://你的域名/sw.js | grep -i -E 'HTTP/|cache-control|content-type'
curl -fsSI https://你的域名/manifest.webmanifest | grep -i content-type
```

期望：

- 访问 `http://` 会跳到 `https://`
- `sw.js` 的 `Cache-Control` 含 `no-cache`，类型是 JavaScript
- `manifest.webmanifest` 的类型是 `application/manifest+json`

## 9. 发布

发布只上传网站运行需要的文件：`index.html`、`sw.js`、`manifest.webmanifest`、`assets/`。`.git/`、`.github/`、`deploy/`、`docs/` 和 `README.md` 不会放到网站目录。`DEPLOY_PATH` 必须是这个站专用的目录，脚本拒绝把文件同步到 `/` 或 `/var/www` 这种过宽的路径，并且会 `--delete` 删掉目录里多余的旧文件。

静态文件换掉之后不用重启 Nginx。只有改了 Nginx 配置才需要 `nginx -t && systemctl reload nginx`。

### 9.1 在自己的电脑上发布

在你自己的电脑上生成一把**只用于发布**的密钥，不要把私钥提交进仓库：

```bash
ssh-keygen -t ed25519 -C "little-ears-deploy" -f "$HOME/.ssh/little-ears-deploy"
```

把 `~/.ssh/little-ears-deploy.pub` 里的那一行追加到服务器 `/home/deploy/.ssh/authorized_keys`（第 6 节）。

在仓库目录执行：

```bash
DEPLOY_HOST=你的公网IP或域名 \
DEPLOY_USER=deploy \
DEPLOY_SSH_KEY="$HOME/.ssh/little-ears-deploy" \
DEPLOY_PATH=/var/www/little-ears \
bash deploy/deploy.sh
```

可选环境变量：

| 变量 | 是否必填 | 作用 |
|---|---|---|
| `DEPLOY_HOST` | 必填 | 服务器公网 IPv4 或已解析好的域名 |
| `DEPLOY_USER` | 必填 | SSH 用户，按本文是 `deploy` |
| `DEPLOY_SSH_KEY` | 必填 | 私钥**文件路径**。在 GitHub Actions 里则是私钥全文 |
| `DEPLOY_PATH` | 必填 | 网站目录，例如 `/var/www/little-ears` |
| `DEPLOY_PORT` | 可选 | SSH 端口，不填则是 `22` |
| `DEPLOY_KNOWN_HOSTS` | 可选 | `ssh-keyscan -H 你的主机` 的输出。不填则脚本现场获取指纹 |
| `DEPLOY_DRY_RUN` | 可选 | 设为 `1` 时只检查变量，不连接服务器 |

服务器上需要有 `rsync`（第 6 节已经安装）。SSH 使用密钥，并且 `BatchMode` 禁止交互式询问密码，避免 Actions 一直卡住。

### 9.2 用 GitHub Actions 发布

工作流文件是 `.github/workflows/deploy-cn.yml`，名字是 **Deploy to mainland server**。它调用同一个 `deploy/deploy.sh`。

在 GitHub 仓库页面打开 **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名字 | 是否必填 | 填什么 |
|---|---|---|
| `DEPLOY_HOST` | 必填 | 公网 IPv4 或域名 |
| `DEPLOY_USER` | 必填 | `deploy` |
| `DEPLOY_SSH_KEY` | 必填 | 私钥**全文**，包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----` 两行。不要填公钥 |
| `DEPLOY_PATH` | 必填 | `/var/www/little-ears` |
| `DEPLOY_PORT` | 可选 | SSH 端口。不创建这个 secret 时使用 22 |
| `DEPLOY_KNOWN_HOSTS` | 可选 | 在你电脑上执行 `ssh-keyscan -H 你的公网IP`，把终端输出整段贴进去。不创建时，工作流会在运行时自己 `ssh-keyscan` |

这些值只放在 GitHub Secrets 或你本机的环境变量里。不要写进脚本、workflow 或提交到仓库。

运行方式：

- **手动**：Actions → Deploy to mainland server → Run workflow。secret 缺任何一项时，这次运行会失败，并在日志里写出缺的名字（不会打印密钥内容）。
- **自动**：推送到 `claude/epic-gates-w5p8og` 时也会部署。secret 还没配时，这次 push **跳过**部署，不把流水线标红。以后如果默认分支改了名字，要同时改 workflow 里的 `branches`。

GitHub 的托管运行器在境外，通过公网 SSH 连你的服务器。因此 22 端口（或你改过的 `DEPLOY_PORT`）要对公网开放，并且只允许密钥登录。不要给 `deploy` 用户设置密码。

## 10. 填写备案号

备案通过后，编辑仓库里的 `index.html`，找到 `<footer class="site-footer">`：

- 把 `京ICP备XXXXXXXX号` 换成完整编号，例如 `京ICP备12345678号-1`。`href` 保持 `https://beian.miit.gov.cn/`，不要改成别的网址。
- 公安备案还没做时，让 `京公网安备XXXXXXXXXXXXX号` 保持原样。文字里连续出现 `X` 时，这个链接不显示。

保存后重新执行第 9 节的发布。打开首页，滚到内容底部，应能看到工信部备案号，点击后进入 <https://beian.miit.gov.cn/>。

### 公安备案

网站对外打开后 **30 日内**，到全国互联网安全管理服务平台 <https://www.beian.gov.cn/> 提交公安联网备案。准备的材料和 ICP 类似：身份证、域名、服务器、网站负责人手机号。审核时间由各地网安部门决定。

通过后会得到类似 `京公网安备11010502012345号` 的编号。把页脚里公安那一行换成这个完整文字。页面脚本会把其中的数字接到：

`https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=数字`

再发布一次即可。

## 11. 上线后检查

在电脑浏览器打开 `https://你的域名/`：

1. 首页能显示「小耳朵英语」，四个底部导航可以切换。
2. 开发者工具 Network 里，字体、css、js 都来自你的域名，没有 `fonts.googleapis.com`、`jsdelivr`、`unpkg`、`cdnjs`、`google-analytics`。
3. Application（或「应用」）→ Service Workers 里，`sw.js` 已激活。再刷新一次，让新版本缓存写完。
4. 断网后重新打开首页，页面仍在。进入需要 B 站的播放页时，动画仍然要联网，这是预期行为。
5. 家长中心 → 设备检查：试听英语发音，并测试录音。录音弹窗出现，说明 HTTPS 生效。
6. 平板上用浏览器打开一次并刷新，再「添加到桌面」。学习模式的网址白名单需要放行你的域名；要看动画还要放行 `player.bilibili.com`。平板上的操作细节在 [`deploy-huawei.md`](deploy-huawei.md)。

本机先看效果时，在仓库目录运行 `python3 -m http.server 8000`，打开 <http://localhost:8000>。Python 自带的这个服务器可能把 `.webmanifest` 标成通用二进制类型，这只影响本机预览；线上以第 8 节的 Nginx 响应头为准。

## 12. 常见问题

**`nginx -t` 报证书文件不存在**
还在用 HTTP 配置时不要启用 `little-ears.conf`。证书下载完成并放到 `/etc/nginx/ssl/little-ears/` 之后再换。

**`nginx -t` 报 `listen [::]` 失败**
删掉配置里的 IPv6 那几行。本文默认配置没有监听 IPv6。

**`nginx -t` 提示 `http2` 参数已弃用**
你的 Nginx 新于 1.25.1。把 `listen 443 ssl http2;` 改成两行：`listen 443 ssl;` 和 `http2 on;`。Ubuntu 22.04 / 24.04 自带的版本继续用原来那一行。

**备案订单被退回，理由是网站打不开**
确认 DNS 已经指向这台服务器、云防火墙放行了 80、`sites-enabled` 里启用的是 HTTP 配置，并且 `curl -I http://你的域名/` 返回 200 或 301。

**备案被问到培训、学校或前置审批**
在订单里说明这是家庭自用、不收费、不招生的个人页面，网站名称保持「小耳朵英语」。不要在页面上写招生、价格、机构地址。若审核意见明确要求办学许可，个人主体无法继续办理经营性培训站点。

**Actions 一直转圈或 SSH 超时**
看云防火墙是否放行了 `DEPLOY_PORT`，`DEPLOY_HOST` 是否是公网地址，`deploy` 用户的 `authorized_keys` 是否是对应的公钥。私钥填进 `DEPLOY_SSH_KEY`，公钥留在服务器上。

**平板上的进度在换成自己的域名后没了**
进度保存在浏览器里，跟着网址走。在旧网址的家长中心「备份与恢复」里复制，到新网址粘贴恢复。步骤见 [`deploy-huawei.md`](deploy-huawei.md)。

**更新了页面，平板还是旧的**
`sw.js` 必须是 `no-cache`。孩子联网打开两次：第一次在后台取新版本，第二次才显示新版本。如果新增或删除了文件，要同时改 `sw.js` 里的 `SHELL` 列表和 `VERSION`。
