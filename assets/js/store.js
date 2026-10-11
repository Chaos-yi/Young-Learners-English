/*
 * 小耳朵英语 · 学习进度
 * ------------------------------------------------------------
 * 不打分，只记录「学到哪里了」：每个视频系列看到第几集、跟我说学到第几课、磨耳朵玩到第几关。
 * 原型阶段用 localStorage 保存在本机浏览器；正式版换成云端同步时只需替换 load/save。
 */
(function () {
  const KEY = 'little-ears.v2';

  const DEFAULTS = {
    settings: {
      name: 'Tom',
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
    stickers: []
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    const s = clone(DEFAULTS);
    if (saved && typeof saved === 'object') {
      Object.assign(s, saved);
      s.settings = Object.assign(clone(DEFAULTS.settings), saved.settings || {});
      s.videos = Object.assign(clone(DEFAULTS.videos), saved.videos || {});
      s.games = Object.assign(clone(DEFAULTS.games), saved.games || {});
    }
    return s;
  }

  let state = load();
  let saveTimer = null;

  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式等情况下不保存，页面照常可用 */ }
  }
  function save() {
    if (!saveTimer) saveTimer = setTimeout(saveNow, 300);
  }
  window.addEventListener('pagehide', saveNow);

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
    state = clone(DEFAULTS);
    saveNow();
  }

  LE.store = {
    get state() { return state; },
    get settings() { return state.settings; },
    save, saveNow, today, addDays, day, addStars,
    lessonById, themeById,
    seriesList, seriesById, episodes, watched, setEpisodes, markWatched, nextEpisode, currentSeries, setCurrent, addCustom, removeCustom,
    lessonDone, nextLesson, completeLesson, lessonsDone,
    listenLevel, levelTheme, finishGame,
    completeStep, completeDay, streak, addSeconds, totals, reset
  };
})();
