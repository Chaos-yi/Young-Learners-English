// 在仓库外安装 playwright，启动静态服务器后执行本脚本。详见 docs/multi-child-profiles.md。
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const screenshotDir = process.env.SCREENSHOTS_DIR || path.resolve(root, '../screenshots');
const committedDir = path.join(root, 'docs/screenshots/multi-child');
const fixturePath = path.join(__dirname, 'fixtures/legacy-v2-backup.json');
const pageErrors = [];
const screenshotPaths = [];

async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
async function checkState(page, fn, arg) { await page.waitForFunction(fn, arg); }
async function openProfiles(page) {
  await page.getByRole('button', { name: /，切换孩子档案$/ }).click();
  await visible(page.getByRole('dialog', { name: '今天谁来学？' }));
}
async function switchTo(page, name) {
  await openProfiles(page);
  await page.getByRole('button', { name: `切换到 ${name}`, exact: true }).click();
  await visible(page.getByRole('button', { name: `${name}，切换孩子档案`, exact: true }));
}
async function parentSettings(page) {
  await page.locator('#parentLink').click();
  await page.waitForFunction(() => /^#\/parent/.test(location.hash) && (document.querySelector('#gateAnswer') || document.querySelector('.parent-tabs')));
  if (await page.locator('#gateAnswer').count()) {
    const [a, b] = (await page.locator('.gate .q').innerText()).match(/\d+/g).map(Number);
    await page.getByRole('textbox', { name: '答案', exact: true }).fill(String(a * b));
    await page.getByRole('button', { name: '进入', exact: true }).click();
  }
  await page.getByRole('button', { name: '学习设置', exact: true }).click();
  await visible(page.locator('#backupText'));
}
async function addChild(page, name, color) {
  await openProfiles(page);
  await page.getByRole('button', { name: '＋ 添加孩子档案', exact: true }).click();
  await page.getByRole('textbox', { name: '孩子的英文名', exact: true }).fill(name);
  await page.getByRole('radio', { name: color, exact: true }).check();
  await page.getByRole('button', { name: '创建并开始学习', exact: true }).click();
  await checkState(page, name => LE.store.settings.name === name, name);
}
async function assertLayout(page, width) {
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    barHeight: document.querySelector('.topbar').getBoundingClientRect().height,
    dialog: document.querySelector('dialog[open]')?.getBoundingClientRect().toJSON()
  }));
  assert.equal(metrics.width, width);
  assert.ok(metrics.scroll <= width, `页面横向溢出：${JSON.stringify(metrics)}`);
  assert.ok(metrics.barHeight <= 66, `顶栏增加了额外行：${JSON.stringify(metrics)}`);
  if (metrics.dialog) {
    assert.ok(metrics.dialog.x >= 0 && metrics.dialog.right <= width);
    assert.ok(metrics.dialog.y >= 0);
  }
}
async function capture(page, width, scene) {
  await page.evaluate(() => document.fonts.ready);
  await assertLayout(page, width);
  const filename = `${width}-${scene}.png`;
  const destination = path.join(screenshotDir, filename);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled' });
  await fs.copyFile(destination, path.join(committedDir, filename));
  screenshotPaths.push(destination);
}

async function runViewport(browser, width, height, fixture) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390, locale: 'zh-CN', timezoneId: 'Asia/Taipei', colorScheme: 'light' });
  // 只在首次导航写入真实旧格式；随后的刷新不能再次覆盖已经迁移的数据。
  await context.addInitScript(data => {
    if (!localStorage.getItem('little-ears.v2')) localStorage.setItem('little-ears.v2', JSON.stringify(data));
  }, fixture.data);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => pageErrors.push(`${width}: ${e.message}`));
  await page.goto(baseURL);
  await visible(page.getByRole('button', { name: 'Lily，切换孩子档案', exact: true }));
  assert.equal(await page.locator('#stars .n').innerText(), '17');
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('little-ears.v2')));
  assert.deepEqual(migrated.profiles[0].data, fixture.data);
  const firstId = migrated.activeProfileId;

  // 第二个孩子通过真实表单创建，不直接修改 store 来模拟 UI 成功。
  await addChild(page, 'Ben', '绿色');
  assert.equal(await page.locator('#stars .n').innerText(), '0');
  await switchTo(page, 'Lily');
  await page.waitForTimeout(2800); // 等待系统发音人检测和切换提示结束。
  await capture(page, width, 'home');

  await openProfiles(page);
  await capture(page, width, 'switch-child');
  console.log(`${width}: homepage and switch dialog captured`);
  // 原生 dialog 的 Escape 关闭及焦点还原。
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#profileSwitch').evaluate(el => el === document.activeElement), true);
  await switchTo(page, 'Ben');
  assert.equal(await page.locator('#stars .n').innerText(), '0');
  assert.equal(await page.evaluate(() => LE.store.settings.age), 6);

  // Ben 真正完成一课，Lily 已有的学习次数和星星不能被改动。
  await page.getByRole('link', { name: '跟我说 Speak', exact: true }).click();
  await page.getByRole('link', { name: '接着学第 1 课', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /下一句/ }).click();
  await page.getByRole('button', { name: /这一课学完了/ }).click();
  await checkState(page, () => LE.store.state.stars === 1 && LE.store.state.lessons.l01.n === 1);
  console.log(`${width}: Ben completed one lesson`);
  await parentSettings(page);
  await page.getByLabel('年龄', { exact: true }).selectOption('5');
  await switchTo(page, 'Lily');
  assert.equal(await page.evaluate(() => LE.store.settings.age), 8);
  assert.equal(await page.locator('#stars .n').innerText(), '17');
  assert.equal(await page.evaluate(() => LE.store.state.lessons.l01.n), 3);
  await switchTo(page, 'Ben');
  assert.equal(await page.evaluate(() => LE.store.settings.age), 5);
  assert.equal(await page.locator('#stars .n').innerText(), '1');
  console.log(`${width}: learning and settings isolation verified`);

  await openProfiles(page);
  await page.getByRole('button', { name: '＋ 添加孩子档案', exact: true }).click();
  await page.getByRole('textbox', { name: '孩子的英文名', exact: true }).fill('Amy');
  await page.getByRole('radio', { name: '紫色', exact: true }).check();
  await capture(page, width, 'add-child');
  await page.getByRole('button', { name: '创建并开始学习', exact: true }).click();
  await checkState(page, () => LE.store.profiles.length === 3 && LE.store.settings.name === 'Amy');
  await openProfiles(page);
  assert.equal(await page.getByRole('button', { name: '＋ 添加孩子档案', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '编辑 Amy 的档案', exact: true }).click();
  await page.getByRole('textbox', { name: '孩子的英文名', exact: true }).fill('Amy Rose');
  await page.getByRole('radio', { name: '黄色', exact: true }).check();
  await page.getByRole('button', { name: '保存档案', exact: true }).click();
  await checkState(page, () => LE.store.settings.name === 'Amy Rose');
  await openProfiles(page);
  await page.getByRole('button', { name: '编辑 Amy Rose 的档案', exact: true }).click();
  await page.getByRole('button', { name: '删除这个孩子档案', exact: true }).click();
  await capture(page, width, 'delete-child-confirm');
  assert.equal(await page.evaluate(() => LE.store.profiles.length), 3);
  await page.getByRole('button', { name: '取消，保留档案', exact: true }).click();
  assert.equal(await page.evaluate(() => LE.store.profiles.length), 3);
  await page.getByRole('button', { name: '删除这个孩子档案', exact: true }).click();
  await page.getByRole('button', { name: '确认删除 Amy Rose', exact: true }).click();
  await checkState(page, id => LE.store.profiles.length === 2 && LE.store.activeProfileId === id, firstId);
  assert.equal(await page.locator('#stars .n').innerText(), '17');
  await page.reload();
  await visible(page.getByRole('button', { name: 'Lily，切换孩子档案', exact: true }));
  assert.equal(await page.evaluate(() => LE.store.profiles.length), 2);

  // 浏览器实际下载新版备份、上传旧 JSON 备份，并逐次点击恢复确认。
  await parentSettings(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载备份文件', exact: true }).click();
  const download = await downloadEvent;
  const newBackupText = await fs.readFile(await download.path(), 'utf8');
  const newBackup = JSON.parse(newBackupText);
  assert.equal(newBackup.version, 3);
  assert.equal(newBackup.data.profiles.length, 2);
  await page.getByLabel('选择备份文件（新旧格式均可）', { exact: true }).setInputFiles(fixturePath);
  await checkState(page, () => document.querySelector('#backupText').value.includes('"version": 2'));
  await page.locator('#restoreBackup').click();
  assert.equal(await page.evaluate(() => LE.store.profiles.length), 2);
  await page.locator('#backupText').fill(JSON.stringify(fixture)); // 修改内容必须重新确认。
  assert.equal(await page.locator('#restoreBackup').innerText(), '恢复');
  await page.locator('#restoreBackup').click();
  await page.locator('#restoreBackup').click();
  await checkState(page, () => LE.store.profiles.length === 1 && LE.store.settings.name === 'Lily');
  assert.equal(await page.evaluate(() => LE.store.state.stars), 17);
  assert.deepEqual(await page.evaluate(() => LE.store.state.videos), fixture.data.videos);
  await openProfiles(page);
  await page.getByRole('button', { name: '编辑 Lily 的档案', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '删除这个孩子档案', exact: true }).isDisabled(), true);
  await page.keyboard.press('Escape');
  await page.locator('#backupText').fill(newBackupText);
  await page.locator('#restoreBackup').click();
  await page.locator('#restoreBackup').click();
  await checkState(page, () => LE.store.profiles.length === 2);
  await switchTo(page, 'Ben');
  assert.equal(await page.locator('#stars .n').innerText(), '1');
  assert.equal(await page.evaluate(() => LE.store.settings.age), 5);

  // PWA 壳缓存为 v5，断网重载后仍可用本机档案。
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  assert.ok((await page.evaluate(() => caches.keys())).includes('little-ears-v5'));
  await context.setOffline(true);
  await page.reload();
  await visible(page.getByRole('button', { name: 'Ben，切换孩子档案', exact: true }));
  await switchTo(page, 'Lily');
  assert.equal(await page.locator('#stars .n').innerText(), '17');
  await context.close();
  console.log(`PASS ${width}×${height}: migration, learning/settings isolation, add/rename/delete confirmation, limit, file backups, focus, layout, offline v5`);
}

async function onboarding(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => pageErrors.push(`${width} onboarding: ${e.message}`));
  await page.goto(baseURL);
  await visible(page.getByRole('heading', { name: '创建第一个孩子档案', exact: true }));
  await page.getByRole('textbox', { name: '孩子的英文名', exact: true }).fill('Tom');
  await page.getByRole('radio', { name: '珊瑚色', exact: true }).check();
  await page.getByRole('button', { name: '创建档案，下一步', exact: true }).click();
  await page.getByRole('button', { name: '跳过这一步', exact: true }).click();
  await page.getByRole('button', { name: '跳过这一步', exact: true }).click();
  await checkState(page, () => LE.store.onboarding.completed && LE.store.hasName());
  assert.equal(await page.evaluate(() => LE.store.profiles.length), 1);
  assert.equal(await page.evaluate(() => LE.store.profiles[0].color), 'coral');
  await page.reload();
  assert.equal(await page.getByRole('heading', { name: '创建第一个孩子档案', exact: true }).count(), 0);
  await assertLayout(page, width);
  await context.close();
  console.log(`PASS ${width}×${height}: first-profile onboarding and reload`);
}

(async () => {
  await fs.mkdir(screenshotDir, { recursive: true });
  await fs.mkdir(committedDir, { recursive: true });
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  const browser = await chromium.launch();
  try {
    for (const [width, height] of [[1280, 900], [390, 844]]) {
      await runViewport(browser, width, height, fixture);
      await onboarding(browser, width, height);
    }
    assert.deepEqual(pageErrors, [], '浏览器出现未捕获的 JavaScript 错误');
    console.log('\n8 screenshots saved and copied into docs/screenshots/multi-child/:');
    for (const file of screenshotPaths) console.log(file);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
