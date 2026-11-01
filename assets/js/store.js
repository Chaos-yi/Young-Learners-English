/*
 * 小耳朵英语 · 学习进度
 * ------------------------------------------------------------
 * 不打分，只记录「学到哪里了」：每个视频系列看到第几集、跟我说学到第几课、磨耳朵玩到第几关。
 * 原型阶段用 localStorage 保存在本机浏览器；正式版换成云端同步时只需替换 load/save。
 */
(function () {
  const KEY = 'little-ears.v2';
  const MAX_PROFILES = 3;
  const COLORS = ['sky', 'leaf', 'grape', 'sun', 'coral'];

  const DEFAULTS = {
    settings: {
      name: 'Tom',
      nameConfigured: false,
      age: 6,
      dailyMinutes: 15,
      accent: 'en-GB',
      rate: 0.85,
      voiceURI: '',
      showChinese: true
    },
    // 视频：lists[系列id] = { episodes: [{ kind: 'bili', bvid, page } | { kind: 'file', src }], watched: [集序号] }
    videos: { lists: {}, custom: [], current: '' },
    lessons: {},            // lessons[课id] = { done: true, n: 学过几遍 }
    games: { listen: 0, move: 0 },
    days: {},               // days['YYYY-MM-DD'] = { secs, steps: {}, done, log: { watched, lessons, games } }
    stars: 0,
    stickers: [],
    onboarding: { step: 0, started: false, completed: false, page: '' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // 补齐缺少的字段（旧版本的数据、备份恢复都走这里）
  function normalize(saved) {
    const s = clone(DEFAULTS);
    if (saved && typeof saved === 'object') {
      Object.assign(s, saved);
      s.settings = Object.assign(clone(DEFAULTS.settings), saved.settings || {});
      s.videos = Object.assign(clone(DEFAULTS.videos), saved.videos || {});
      s.games = Object.assign(clone(DEFAULTS.games), saved.games || {});
    }
    const name = typeof s.settings.name === 'string' ? s.settings.name.trim().slice(0, 20) : '';
    s.settings.name = name || 'Tom';
    if (!saved || !saved.settings || typeof saved.settings.nameConfigured !== 'boolean')
      s.settings.nameConfigured = !!name && name !== 'Tom';
    const guide = saved && saved.onboarding || {};
    s.onboarding = {
      step: Number.isInteger(guide.step) && guide.step >= 0 && guide.step <= 2 ? guide.step : 0,
      started: guide.started === true,
      completed: guide.completed === true,
      page: (guide.step === 1 && guide.page === 'videos') || (guide.step === 2 && guide.page === 'device') ? guide.page : ''
    };
    return s;
  }

  function newId() {
    return 'child-' + (window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  }
  function makeProfile(data, color) {
    return { id: newId(), color: COLORS.includes(color) ? color : COLORS[0], data: normalize(data) };
  }
  function isRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function validFamily(saved) {
    return isRecord(saved) && saved.schemaVersion === 3 && Array.isArray(saved.profiles) &&
      saved.profiles.length >= 1 && saved.profiles.length <= MAX_PROFILES &&
      saved.profiles.every(p => isRecord(p) && typeof p.id === 'string' && p.id.length > 0 && isRecord(p.data)) &&
      new Set(saved.profiles.map(p => p.id)).size === saved.profiles.length &&
      saved.profiles.some(p => p.id === saved.activeProfileId);
  }
  function normalizeFamily(saved) {
    if (validFamily(saved)) {
      return {
        schemaVersion: 3,
        activeProfileId: saved.activeProfileId,
        profiles: saved.profiles.map(p => ({ id: p.id, color: COLORS.includes(p.color) ? p.color : COLORS[0], data: normalize(p.data) }))
      };
    }
    // 旧的单孩子对象原样交给 normalize：包括视频、日志、设置和未识别的扩展字段。
    const first = makeProfile(saved);
    return { schemaVersion: 3, activeProfileId: first.id, profiles: [first] };
  }
  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    return normalizeFamily(saved);
  }

  let family = load();
  function currentProfile() { return family.profiles.find(p => p.id === family.activeProfileId); }
  let state = currentProfile().data;
  let saveTimer = null;

  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(family)); } catch (e) { /* 隐私模式等情况下不保存，页面照常可用 */ }
  }
  function save() {
    if (!saveTimer) saveTimer = setTimeout(saveNow, 300);
  }
  window.addEventListener('pagehide', saveNow);
  // 启动即持久化迁移，不必等孩子再完成一次学习；继续使用原 key，避免留下过时的单孩子副本。
  saveNow();

  function profiles() {
    return family.profiles.map(p => ({ id: p.id, name: p.data.settings.name, configured: p.data.settings.nameConfigured, color: p.color }));
  }
  function validName(value) {
    return typeof value === 'string' && value.trim().length <= 20 && /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value.trim());
  }
  function addProfile(name, color) {
    if (family.profiles.length >= MAX_PROFILES || !validName(name)) return false;
    const p = makeProfile({ settings: { name: name.trim(), nameConfigured: true }, onboarding: { completed: true } }, color);
    family.profiles.push(p);
    saveNow();
    return p.id;
  }
  function updateProfile(id, name, color) {
    const p = family.profiles.find(p => p.id === id);
    if (!p || !validName(name)) return false;
    p.data.settings.name = name.trim();
    p.data.settings.nameConfigured = true;
    if (COLORS.includes(color)) p.color = color;
    saveNow();
    return true;
  }
  function switchProfile(id) {
    const next = family.profiles.find(p => p.id === id);
    if (!next) return false;
    saveNow(); // 包括尚未写盘的学习秒数和防抖中的进度。
    family.activeProfileId = id;
    state = next.data;
    saveNow();
    return true;
  }
  function deleteProfile(id) {
    if (family.profiles.length <= 1 || !family.profiles.some(p => p.id === id)) return false;
    family.profiles = family.profiles.filter(p => p.id !== id);
    if (family.activeProfileId === id) {
      family.activeProfileId = family.profiles[0].id;
      state = currentProfile().data;
    }
    saveNow();
    return true;
  }

  // 区分系统示例名与家长实际填写的名字（实际填写 Tom 也有效）。
  function hasName() { return state.settings.nameConfigured && !!state.settings.name.trim(); }
  function setName(value) {
    const name = String(value).trim().slice(0, 20);
    state.settings.name = name || 'Tom';
    state.settings.nameConfigured = !!name;
    saveNow();
  }
  function hasVideos() {
    return Object.values(state.videos.lists).some(l => l && Array.isArray(l.episodes) && l.episodes.length);
  }
  function needsOnboarding() {
    return !state.onboarding.completed && (state.onboarding.started || (!hasName() && !hasVideos()));
  }
  function startOnboarding() { state.onboarding.started = true; saveNow(); }
  function advanceOnboarding() {
    state.onboarding.started = true;
    state.onboarding.page = '';
    if (state.onboarding.step < 2) state.onboarding.step += 1;
    else state.onboarding.completed = true;
    saveNow();
  }
  function openOnboardingPage() {
    state.onboarding.page = state.onboarding.step === 1 ? 'videos' : state.onboarding.step === 2 ? 'device' : '';
    saveNow();
    return state.onboarding.page;
  }

  // ---------- 日期 ----------
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + n));
  }
  function today() { return dateKey(); }

  function day(key) {
    key = key || today();
    if (!state.days[key]) state.days[key] = { secs: 0, steps: {}, done: false, log: { watched: 0, lessons: 0, games: 0 } };
    const d = state.days[key];
    if (!d.log) d.log = { watched: 0, lessons: 0, games: 0 };
    return d;
  }

  function addStars(n) {
    state.stars += n;
    save();
    document.dispatchEvent(new CustomEvent('le:stars'));
  }

  // ---------- 内容索引 ----------
  const D = LE.DATA;
  const lessonById = {};
  D.lessons.forEach((l, i) => { l.index = i; lessonById[l.id] = l; });
  const themeById = {};
  D.themes.forEach(t => { themeById[t.id] = t; t.words.forEach(w => { w.id = t.id + ':' + w.en; w.theme = t.id; }); });

  // ---------- 看动画 ----------
  function seriesList() {
    return D.series.concat(state.videos.custom.map(c => Object.assign({ stage: 0, pic: '📺', tone: 'sky', custom: true }, c)));
  }
  function seriesById(id) { return seriesList().find(s => s.id === id) || null; }
  function list(id) {
    if (!state.videos.lists[id]) state.videos.lists[id] = { episodes: [], watched: [] };
    return state.videos.lists[id];
  }
  function episodes(id) { return (state.videos.lists[id] || { episodes: [] }).episodes; }
  function watched(id) { return (state.videos.lists[id] || { watched: [] }).watched; }
  function setEpisodes(id, eps) {
    const l = list(id);
    l.episodes = eps;
    l.watched = l.watched.filter(i => i < eps.length);
    saveNow();
  }
  function markWatched(id, idx) {
    const l = list(id);
    state.videos.current = id;
    if (l.watched.indexOf(idx) >= 0) { save(); return false; }
    l.watched.push(idx);
    day().log.watched += 1;
    save();
    return true;
  }
  // 下一集：上次看过的那集之后第一集没看过的；都看完了返回 -1
  function nextEpisode(id) {
    const eps = episodes(id), w = watched(id);
    if (!eps.length) return -1;
    const last = w.length ? Math.max.apply(null, w) : -1;
    for (let i = last + 1; i < eps.length; i++) if (w.indexOf(i) < 0) return i;
    for (let i = 0; i < eps.length; i++) if (w.indexOf(i) < 0) return i;
    return -1;
  }
  // 正在看的系列：家长/孩子最近选的；它看完了就按推荐顺序找下一个有视频、没看完的
  function currentSeries() {
    const all = seriesList();
    const ready = s => episodes(s.id).length && nextEpisode(s.id) >= 0;
    const cur = all.find(s => s.id === state.videos.current);
    if (cur && ready(cur)) return cur;
    return all.find(ready) || null;
  }
  function setCurrent(id) { state.videos.current = id; save(); }
  function removeCustom(id) {
    state.videos.custom = state.videos.custom.filter(c => c.id !== id);
    delete state.videos.lists[id];
    if (state.videos.current === id) state.videos.current = '';
    saveNow();
  }
  function addCustom(title) {
    const id = 'c' + Date.now().toString(36);
    state.videos.custom.push({ id, stage: 0, title, zh: '家长添加', why: '', q: title });
    saveNow();
    return id;
  }

  // ---------- 跟我说 ----------
  function lessonDone(id) { return !!(state.lessons[id] && state.lessons[id].done); }
  function nextLesson() { return D.lessons.find(l => !lessonDone(l.id)) || null; }
  function completeLesson(id) {
    const rec = state.lessons[id] || { done: false, n: 0 };
    const first = !rec.done;
    rec.done = true;
    rec.n += 1;
    state.lessons[id] = rec;
    day().log.lessons += 1;
    save();
    return first;
  }
  function lessonsDone() { return D.lessons.filter(l => lessonDone(l.id)).length; }

  // ---------- 磨耳朵 ----------
  function listenLevel() { return state.games.listen + 1; }
  function levelTheme(level) { return D.themes[(level - 1) % D.themes.length]; }
  function finishGame(kind) {
    state.games[kind] = (state.games[kind] || 0) + 1;
    day().log.games += 1;
    save();
  }

  // ---------- 今日路线 ----------
  function completeStep(step) { day().steps[step] = true; save(); }

  // 完成今日路线：解锁贴纸，返回新贴纸（当天已解锁则返回 null）
  function completeDay() {
    const d = day();
    if (d.done) return null;
    d.done = true;
    const next = D.stickers[state.stickers.length % D.stickers.length];
    state.stickers.push(next);
    saveNow();
    return next;
  }

  function streak() {
    let n = 0;
    let key = today();
    const active = k => state.days[k] && (state.days[k].done || state.days[k].secs >= 300);
    if (!active(key)) key = addDays(key, -1); // 今天还没学不打断连续记录
    while (active(key)) { n += 1; key = addDays(key, -1); }
    return n;
  }

  // 计时每秒调用一次，不在这里写盘；由调用方定期 save()，离开页面时 pagehide 也会保存
  function addSeconds(n) { day().secs += n; }

  function totals() {
    return {
      watched: Object.keys(state.videos.lists).reduce((n, id) => n + state.videos.lists[id].watched.length, 0),
      lessons: lessonsDone(),
      games: state.games.listen + state.games.move
    };
  }

  function reset() {
    // 重置只影响当前孩子的学习内容，保留档案身份和学习设置。
    state = normalize({ settings: clone(state.settings), onboarding: clone(state.onboarding) });
    currentProfile().data = state;
    saveNow();
  }

  // 备份与恢复：换设备、换网址时把视频链接、进度和设置整个搬过去
  function exportData() {
    saveNow();
    return JSON.stringify({ app: 'little-ears', version: 3, savedAt: new Date().toISOString(), data: family });
  }
  function importData(text) {
    let obj = null;
    try { obj = JSON.parse(String(text).trim()); } catch (e) { return false; }
    if (!obj || obj.app !== 'little-ears' || !isRecord(obj.data)) return false;
    // 新格式必须完整合法；拒绝损坏/未来版本备份，不能用空档案覆盖现有家庭。
    if (obj.version === 3) {
      if (!validFamily(obj.data)) return false;
    } else if (obj.version !== 2 || !isRecord(obj.data.settings) || 'profiles' in obj.data || 'schemaVersion' in obj.data) return false;
    family = normalizeFamily(obj.data);
    state = currentProfile().data;
    saveNow();
    document.dispatchEvent(new CustomEvent('le:stars'));
    return true;
  }

  LE.store = {
    get state() { return state; },
    get settings() { return state.settings; },
    get onboarding() { return clone(state.onboarding); },
    get profiles() { return profiles(); },
    get activeProfileId() { return family.activeProfileId; },
    get profileColors() { return COLORS.slice(); },
    maxProfiles: MAX_PROFILES,
    addProfile, updateProfile, switchProfile, deleteProfile,
    hasName, setName, hasVideos, needsOnboarding, startOnboarding, advanceOnboarding, openOnboardingPage,
    save, saveNow, today, addDays, day, addStars,
    lessonById, themeById,
    seriesList, seriesById, episodes, watched, setEpisodes, markWatched, nextEpisode, currentSeries, setCurrent, addCustom, removeCustom,
    lessonDone, nextLesson, completeLesson, lessonsDone,
    listenLevel, levelTheme, finishGame,
    completeStep, completeDay, streak, addSeconds, totals, reset, exportData, importData
  };
})();
