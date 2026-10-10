# 小耳朵英语 Little Ears

给零基础一年级孩子的家庭英语网站：**每天 10–20 分钟，多听、多说**。
内容与剑桥 Power Up（Pre A1 Starters 难度）主题同步，孩子不识字也能用：图片 + 声音 + 大按钮。

- 搭建思路（目标、学习路线、功能模块、内容规划、技术方案、迭代路线）：[`docs/plan.md`](docs/plan.md)
- **部署到华为学习平板**（一步步操作）：[`docs/deploy-huawei.md`](docs/deploy-huawei.md)
- 可运行原型：本仓库根目录的 `index.html`（纯静态，无需安装任何依赖）
- 开通 GitHub Pages 后的网址：<https://chaos-yi.github.io/Young-Learners-English/>

## 原型里有什么

| 模块 | 内容 |
|---|---|
| **今天** | 每日 5 步路线：复习热身 → 新单词 → 跟我说 → 故事时间 → 小游戏，完成后得贴纸 |
| **单词乐园** | 11 个主题、120 多个词；单词卡含大图、正常/慢速发音、例句点读、跟读录音 |
| **跟我说** | 32 个常用句型，分「问答」（App 提问，孩子回答）和「跟读」；录音回放、自动或家长打星 |
| **故事屋** | 6 本原创小绘本，朗读时逐词高亮，点任意词可单独听；视频角（推荐片单 + 家长添加的 B 站/mp4 视频） |
| **游戏** | 听音选图、动起来（TPR：听指令做动作） |
| **贴纸墙** | 每完成一天解锁一张 |
| **家长中心** | 学习报告（7 天时长、主题掌握度、易错词）、学习设置（主题、时长、新词数、英音/美音、语速）、视频管理 |

复习按间隔重复安排：每答对一次，下次复习的间隔就拉长一档（1 → 2 → 4 → 7 → 15 天）；答错回到隔 1 天。

## 怎么打开

**电脑上试用：** 在仓库目录运行下面的命令，然后用 Chrome / Edge 打开 <http://localhost:8000>

```bash
python3 -m http.server 8000
```

> 直接双击 `index.html` 也能用，但浏览器只允许在 `http://localhost` 或 `https://` 下使用话筒，所以跟读录音需要用上面的方式打开。

**给孩子在平板 / 手机上用：** 部署成 https 网站，用平板浏览器打开一次并刷新，再「添加到桌面」。

- GitHub Pages：仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `claude/epic-gates-w5p8og`、目录 `/ (root)`，保存后几分钟就能通过上面的网址访问。
- 华为学习平板的完整步骤（含学习模式管控、话筒权限、发音检查）：[`docs/deploy-huawei.md`](docs/deploy-huawei.md)
- iPad：用 Safari 打开，点「分享 → 添加到主屏幕」。
- 网站会自动缓存到设备上（Service Worker），第一次打开后断网也能用；字体已放在本地，不依赖国内访问不了的 Google Fonts。
- 国内访问 `github.io` 太慢的话，可以把整个目录上传到腾讯云 / 阿里云的静态网站托管（需要自己的域名并备案）。

**第一次在新设备上用：** 进「家长中心 → 设备检查」，确认英语发音、话筒、离线缓存、进度保存都正常。

## 浏览器支持

| 功能 | 华为平板（华为浏览器） | iPad / iPhone Safari | 电脑 Chrome / Edge |
|---|---|---|---|
| 英语朗读 | ⚠️ 取决于系统语音引擎，用「设备检查」试听确认 | ✅ 系统自带发音人（推荐 Daniel 英音） | ✅ |
| 跟读录音 + 回放 | ✅（需允许麦克风） | ✅ | ✅ |
| 自动打星（语音识别） | 一般不可用 → 家长打星 | ✅ iOS 14.5+ | Edge ✅；Chrome 需要访问 Google 服务，国内一般用不了 |
| 离线使用 / 添加到桌面 | ✅ | ✅ | ✅ |

学习进度保存在当前浏览器里（`localStorage`），换设备或清除浏览器数据会丢失；云同步放在正式版。

## 目录结构

```text
index.html            页面骨架
manifest.webmanifest  添加到桌面用的应用信息（名称、图标）
sw.js                 离线缓存
assets/css/style.css  样式（浅色 / 深色两套配色）
assets/fonts/         本地字体（SIL OFL 1.1 授权，见 OFL-*.txt）
assets/icons/         桌面图标
assets/js/data.js     内容：主题词表、句型、绘本、动作指令、视频片单
assets/js/store.js    学习进度、间隔重复、每日计划
assets/js/speech.js   朗读、录音、语音识别和打星
assets/js/app.js      页面路由和各个学习活动
docs/plan.md          网站搭建方案
docs/deploy-huawei.md 部署到华为学习平板
```

> 改动文件后：`sw.js` 会在后台自动取新版本；如果新增或删除了文件，记得同步修改 `sw.js` 里的 `SHELL` 列表并把 `VERSION` 加一。

## 按 Power Up 单元加词

打开 `assets/js/data.js`，在对应主题的 `words` 里加一行：

```js
{ en: 'rubber', zh: '橡皮', pic: '🧽', say: "I've got a rubber." },
```

- `pic` 目前用 emoji 当插图，正式版换成统一风格的图片。
- 想加新主题，照着已有主题复制一段，换一个新的 `id` 即可；家长中心的「当前学习主题」里会自动出现。
- 新句型加在 `sentences` 里：有 `q` 的是问答，只有 `a` 的是跟读；`{name}`、`{age}` 会换成孩子的名字和年龄。
