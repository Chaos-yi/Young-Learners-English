# 多孩子档案与验证

一个家庭保留 1–3 个孩子档案，名字最多 20 个字符，可使用英文字母、空格、连字符和英文单引号。头像采用名字首字母，可选五种颜色。手机入口复用原有单行顶栏，管理时才打开原生 `dialog`，支持键盘操作、Escape 关闭和关闭后焦点还原。

## 本机数据与兼容

- 继续使用 `localStorage['little-ears.v2']`，新的对象为 `{ schemaVersion: 3, activeProfileId, profiles: [{ id, color, data }] }`。`data` 保持原有单孩子结构，现有学习 API 读取当前孩子的数据。
- 旧对象完整迁入第一个档案并立即保存；重复打开不会再次迁移。旧名字、设置、视频链接、观看进度、课程次数、游戏、按日记录、星星、贴纸及引导步骤保留。
- 切换前立即保存当前孩子（包括防抖中的记录和学习秒数），结束原页面活动，再回到新孩子首页。新档案从零开始，视频链接也独立；重置只清当前孩子的记录和视频，保留其档案与设置。
- 删除先显示带名字的确认界面，可以取消；最后一个档案禁止删除。删除当前孩子后选中第一个剩余档案。
- 导出 JSON 为 `{ app: 'little-ears', version: 3, savedAt, data: <整个家庭> }`，包含全部档案和当前选择。旧 `version: 2` 备份会恢复成第一个档案。选择文件只读入预览文本，仍需点击恢复并再次确认；修改文本后需重新确认。恢复会替换本机全部档案。
- 没有账号、网络同步或后台。Service Worker 缓存版本为 `v5`。

## 不依赖浏览器的迁移测试

在仓库目录执行（仅用 Node 内置模块，无需安装依赖）：

```sh
node tests/multi-child-store.cjs
```

脚本在 Node VM 中加载真实的 `data.js` 和 `store.js`，使用 Map 模拟 localStorage，并从 `tests/fixtures/legacy-v2-backup.json` 读取合成的旧版备份数据。9 组断言覆盖：

1. 旧 localStorage 全字段深比较、启动写盘、重复加载 ID 不变。
2. 更早的数据补默认值，保留名字与引导步骤，包括家长实际填写的 Tom。
3. 旧版 JSON 备份恢复后与原内容深比较。
4. 尚未保存的记录切换时写盘，孩子间设置、视频、日志、课程、游戏、星星、贴纸隔离。
5. 三档案上限、英文名校验、改名配色不改变已有记录。
6. 三孩子新版备份往返，数据、颜色和当前档案完整保留。
7. 当前孩子重置，当前或非当前孩子删除及最后一个档案保护。
8. 非法 JSON、不支持的版本、空家庭、重复 ID 和无效当前 ID 不覆盖已有数据。
9. 新用户创建第一个档案，离开页面保存秒数。

本次执行结果：**9 / 9 通过**。

## Playwright 页面验证和截图

所有测试数据均为合成数据。Playwright 安装在克隆仓库的父工作目录，没有写入仓库依赖或全局 npm 包。

终端一在仓库根目录启动静态服务器：

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

终端二进入父工作目录（本次仓库目录名为 `repo`）：

```sh
npm init -y
npm i -D playwright
npx playwright install chromium
node repo/tests/multi-child-ui.cjs
```

`BASE_URL` 可指定其他本地服务器地址；`SCREENSHOTS_DIR` 可指定截图输出目录。脚本默认将截图保存在仓库旁的 `screenshots/`，并复制到仓库的 `docs/screenshots/multi-child/`。

本次 Chromium 在 **1280×900、390×844** 两种视口均通过：真实旧数据迁移、通过表单添加孩子、完成一课和修改年龄后的档案隔离、三档案上限、改名配色、删除取消和确认、刷新持久化、下载全家备份、上传旧备份和二次恢复确认、新版备份恢复、首个档案引导、Escape 和焦点还原、单行顶栏与横向溢出检查、v5 缓存及断网重载。未出现未捕获的 JavaScript 错误。

截图为视口截图，手机首页可直接看到今日路线的三个步骤。四个场景各有两种尺寸：

| 场景 | 1280×900 | 390×844 |
| --- | --- | --- |
| 首页 | [1280-home.png](screenshots/multi-child/1280-home.png) | [390-home.png](screenshots/multi-child/390-home.png) |
| 切换孩子 | [1280-switch-child.png](screenshots/multi-child/1280-switch-child.png) | [390-switch-child.png](screenshots/multi-child/390-switch-child.png) |
| 添加孩子 | [1280-add-child.png](screenshots/multi-child/1280-add-child.png) | [390-add-child.png](screenshots/multi-child/390-add-child.png) |
| 删除确认 | [1280-delete-child-confirm.png](screenshots/multi-child/1280-delete-child-confirm.png) | [390-delete-child-confirm.png](screenshots/multi-child/390-delete-child-confirm.png) |
