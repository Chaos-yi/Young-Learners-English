// 无第三方依赖。执行：node tests/multi-child-store.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/legacy-v2-backup.json'), 'utf8'));
const KEY = 'little-ears.v2';
const plain = value => JSON.parse(JSON.stringify(value));

function boot(saved, storage = new Map()) {
  if (saved !== undefined) storage.set(KEY, JSON.stringify(saved));
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    crypto: { randomUUID },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    document: { dispatchEvent() {} },
    CustomEvent: class { constructor(type) { this.type = type; } },
    addEventListener: (type, fn) => listeners.set(type, fn),
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  context.window = context;
  for (const file of ['data.js', 'store.js'])
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), context, { filename: file });
  return { store: context.LE.store, storage, pagehide: () => listeners.get('pagehide')() };
}

let count = 0;
function test(title, run) {
  run();
  console.log(`PASS ${++count}: ${title}`);
}

test('旧 localStorage 全字段无损迁为第一个档案，启动即写盘，刷新不重复迁移', () => {
  const { store, storage } = boot(fixture.data);
  assert.equal(store.profiles.length, 1);
  assert.equal(store.profiles[0].name, 'Lily');
  assert.deepEqual(plain(store.state), fixture.data);
  const persisted = JSON.parse(storage.get(KEY));
  assert.equal(persisted.schemaVersion, 3);
  assert.deepEqual(persisted.profiles[0].data, fixture.data);
  const again = boot(undefined, storage).store;
  assert.equal(again.activeProfileId, store.activeProfileId);
  assert.deepEqual(plain(again.state), fixture.data);
});

test('较早的单孩子数据补默认值，保留实际英文名、进度和引导步骤', () => {
  const { store } = boot({ settings: { name: 'Amy' }, stars: 9, onboarding: { step: 1, started: true, page: 'videos' } });
  assert.equal(store.hasName(), true);
  assert.equal(store.settings.age, 6);
  assert.equal(store.state.stars, 9);
  assert.equal(store.onboarding.page, 'videos');
  assert.equal(store.onboarding.step, 1);
  assert.equal(boot({ settings: { name: 'Tom', nameConfigured: true } }).store.hasName(), true);
});

test('选择旧 v2 备份文件可恢复全部内容为第一个档案', () => {
  const { store } = boot();
  store.addProfile('Ben', 'leaf');
  assert.equal(store.importData(fs.readFileSync(path.join(__dirname, 'fixtures/legacy-v2-backup.json'), 'utf8')), true);
  assert.equal(store.profiles.length, 1);
  assert.deepEqual(plain(store.state), fixture.data);
});

test('切换立即保存尚未落盘的进度，各孩子的设置、视频、日志、星星和引导独立', () => {
  const { store, storage } = boot(fixture.data);
  const first = store.activeProfileId;
  const ben = store.addProfile('Ben', 'leaf');
  store.addStars(2); // 防抖保存尚未执行
  store.addSeconds(12);
  const expectedFirst = plain(store.state);
  assert.equal(store.switchProfile(ben), true);
  assert.equal(store.settings.name, 'Ben');
  assert.equal(store.settings.age, 6);
  assert.equal(store.hasVideos(), false);
  assert.equal(store.state.stars, 0);
  assert.deepEqual(plain(store.state.days), {});
  assert.deepEqual(plain(store.state.lessons), {});
  store.settings.age = 5;
  store.settings.rate = 1;
  store.setEpisodes('sss', [{ kind: 'file', src: 'https://example.com/ben.mp4' }]);
  store.markWatched('sss', 0);
  store.completeLesson('l01');
  store.finishGame('move');
  store.completeStep('speak');
  store.completeDay();
  store.addStars(5);
  store.addSeconds(35);
  const expectedBen = plain(store.state);
  store.switchProfile(first);
  assert.deepEqual(plain(store.state), expectedFirst);
  const afterReload = boot(undefined, storage).store;
  assert.equal(afterReload.activeProfileId, first);
  afterReload.switchProfile(ben);
  assert.deepEqual(plain(afterReload.state), expectedBen);
});

test('最多三个档案，改名配色不影响原记录，拒绝空名和无效名字', () => {
  const { store } = boot(fixture.data);
  const first = store.activeProfileId;
  const before = plain(store.state);
  assert.equal(store.addProfile('', 'leaf'), false);
  assert.equal(store.addProfile('<script>', 'leaf'), false);
  assert.equal(store.addProfile('A'.repeat(21), 'leaf'), false);
  const ben = store.addProfile('Ben', 'leaf');
  const amy = store.addProfile("Amy-Jane", 'grape');
  assert.ok(ben && amy);
  assert.equal(store.addProfile('Dan', 'sun'), false);
  assert.equal(store.updateProfile(first, "Lily Rose", 'coral'), true);
  assert.equal(store.profiles[0].color, 'coral');
  before.settings.name = 'Lily Rose';
  assert.deepEqual(plain(store.state), before);
  assert.equal(store.updateProfile(first, '   ', 'sky'), false);
  assert.equal(store.switchProfile('missing'), false);
});

test('新版全家备份往返保留三个档案、颜色、数据和当前选择', () => {
  const { store } = boot(fixture.data);
  const ben = store.addProfile('Ben', 'leaf');
  store.addProfile("O'Neil", 'sun');
  store.switchProfile(ben);
  store.addStars(8);
  store.settings.showChinese = false;
  const backup = store.exportData();
  const expected = JSON.parse(backup);
  assert.equal(expected.version, 3);
  const restored = boot().store;
  assert.equal(restored.importData(backup), true);
  assert.equal(restored.activeProfileId, ben);
  assert.deepEqual(JSON.parse(restored.exportData()).data, expected.data);
});

test('重置只清当前孩子的记录与视频；删除当前孩子回落，至少保留一个档案', () => {
  const { store, storage } = boot(fixture.data);
  const first = store.activeProfileId;
  const ben = store.addProfile('Ben', 'leaf');
  store.switchProfile(ben);
  store.addStars(8);
  store.settings.age = 9;
  store.reset();
  assert.equal(store.state.stars, 0);
  assert.equal(store.settings.name, 'Ben');
  assert.equal(store.settings.age, 9);
  store.switchProfile(first);
  assert.deepEqual(plain(store.state), fixture.data);
  assert.equal(store.deleteProfile(ben), true); // 删除非当前档案
  assert.equal(store.activeProfileId, first);
  const amy = store.addProfile('Amy', 'grape');
  store.switchProfile(amy);
  assert.equal(store.deleteProfile(amy), true);
  assert.equal(store.activeProfileId, first);
  assert.deepEqual(plain(store.state), fixture.data);
  assert.equal(store.deleteProfile(first), false);
  assert.equal(boot(undefined, storage).store.profiles.length, 1);
});

test('损坏、不支持版本和不完整家庭备份不覆盖已有记录', () => {
  const { store } = boot(fixture.data);
  const before = JSON.parse(store.exportData()).data;
  const bad = [
    'not JSON', '{}',
    JSON.stringify({ ...fixture, version: 99 }),
    JSON.stringify({ ...fixture, data: [] }),
    JSON.stringify({ app: 'little-ears', version: 3, data: { ...before, profiles: [] } }),
    JSON.stringify({ app: 'little-ears', version: 3, data: { ...before, activeProfileId: 'missing' } }),
    JSON.stringify({ app: 'little-ears', version: 3, data: { ...before, profiles: [...before.profiles, ...before.profiles] } })
  ];
  for (const input of bad) {
    assert.equal(store.importData(input), false);
    assert.deepEqual(JSON.parse(store.exportData()).data, before);
  }
});

test('新用户只有一个未配置档案，创建首个档案及 pagehide 保存有效', () => {
  const { store, pagehide, storage } = boot();
  assert.equal(store.profiles.length, 1);
  assert.equal(store.needsOnboarding(), true);
  assert.equal(store.updateProfile(store.activeProfileId, 'Tom', 'grape'), true);
  assert.equal(store.hasName(), true);
  store.addSeconds(7);
  pagehide();
  assert.equal(boot(undefined, storage).store.day().secs, 7);
});

console.log(`\n${count} / ${count} migration and profile tests passed.`);
