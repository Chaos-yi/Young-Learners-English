/*
 * 小耳朵英语 · 学习进度
 * ------------------------------------------------------------
 * 原型阶段用 localStorage 保存在本机浏览器；正式版换成云端同步时只需替换 load/save。
 * 复习算法：5 级 Leitner 盒子。新词学过进 1 级；答对升一级，答错回 1 级。
 */
(function () {
  const KEY = 'little-ears.v1';
  const INTERVALS = [0, 1, 2, 4, 7, 15]; // 盒子等级 → 间隔天数
  const MASTERED = 4;

  const DEFAULTS = {
    settings: {
      name: 'Tom',
      age: 6,
      dailyMinutes: 15,
      newPerDay: 5,
      themes: ['hello', 'colours', 'animals'],
      accent: 'en-GB',
      rate: 0.85,
      voiceURI: '',
      showChinese: true
    },
    words: {},
    sentences: {},
    stories: {},
    days: {},
    stars: 0,
    stickers: [],
    videos: []
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    const s = clone(DEFAULTS);
    if (saved && typeof saved === 'object') {
      Object.assign(s, saved);
      s.settings = Object.assign(clone(DEFAULTS.settings), saved.settings || {});
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
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function addDays(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dateKey(new Date(y, m - 1, d + n));
  }
  function today() { return dateKey(); }

  // ---------- 内容索引 ----------
  const D = LE.DATA;
  const themeById = {};
  const wordById = {};
  D.themes.forEach(t => {
    themeById[t.id] = t;
    t.words.forEach((w, i) => {
      w.id = t.id + ':' + w.en;
      w.theme = t.id;
      w.index = i;
      wordById[w.id] = w;
    });
  });
  const sentenceById = {};
  D.sentences.forEach(s => { sentenceById[s.id] = s; });
  const storyById = {};
  D.stories.forEach(s => { storyById[s.id] = s; });

  // ---------- 每日记录 ----------
  function day(key) {
    key = key || today();
    if (!state.days[key]) state.days[key] = { secs: 0, stars: 0, steps: {}, plan: null, done: false };
    return state.days[key];
  }

  function addStars(n) {
    state.stars += n;
    day().stars += n;
    save();
    document.dispatchEvent(new CustomEvent('le:stars'));
  }

  // ---------- 单词与复习 ----------
  function wordState(id) { return state.words[id] || null; }

  function markSeen(id) {
    const w = state.words[id];
    if (!w) {
      state.words[id] = { box: 1, due: addDays(today(), INTERVALS[1]), seen: 1, right: 0, wrong: 0 };
    } else {
      w.seen += 1;
    }
    save();
  }

  function grade(id, ok) {
    const w = state.words[id] || { box: 0, due: today(), seen: 0, right: 0, wrong: 0 };
    w.seen += 1;
    if (ok) {
      w.right += 1;
      w.box = Math.min(w.box + 1, INTERVALS.length - 1);
    } else {
      w.wrong += 1;
      w.box = 1;
    }
    w.due = addDays(today(), INTERVALS[w.box]);
    state.words[id] = w;
    save();
  }

  function dueWords(limit) {
    const t = today();
    return Object.keys(state.words)
      .filter(id => wordById[id] && state.words[id].due <= t)
      .sort((a, b) => state.words[a].due.localeCompare(state.words[b].due) || state.words[a].box - state.words[b].box)
      .slice(0, limit);
  }

  function themeProgress(themeId) {
    const t = themeById[themeId];
    let learned = 0, mastered = 0;
    t.words.forEach(w => {
      const s = state.words[w.id];
      if (s) learned += 1;
      if (s && s.box >= MASTERED) mastered += 1;
    });
    return { total: t.words.length, learned, mastered };
  }

  function totals() {
    const ids = Object.keys(state.words).filter(id => wordById[id]);
    return {
      learned: ids.length,
      mastered: ids.filter(id => state.words[id].box >= MASTERED).length
    };
  }

  // ---------- 句型与故事 ----------
  function practiseSentence(id, starsGot) {
    const s = state.sentences[id] || { n: 0, best: 0 };
    s.n += 1;
    s.best = Math.max(s.best, starsGot);
    state.sentences[id] = s;
    save();
  }
  function readStory(id) {
    const s = state.stories[id] || { n: 0 };
    s.n += 1;
    state.stories[id] = s;
    save();
  }

  // ---------- 今日计划 ----------
  function selectedThemes() {
    const ids = state.settings.themes.filter(id => themeById[id]);
    return ids.length ? ids : [D.themes[0].id];
  }

  function buildPlan() {
    const themes = selectedThemes();
    const review = dueWords(6);

    // 新词：先从选中的主题里找没学过的；都学完了就顺延到其他主题
    const order = themes.concat(D.themes.map(t => t.id).filter(id => themes.indexOf(id) < 0));
    const fresh = [];
    order.forEach(tid => {
      themeById[tid].words.forEach(w => {
        if (fresh.length < state.settings.newPerDay && !state.words[w.id] && review.indexOf(w.id) < 0) fresh.push(w.id);
      });
    });

    // 句型：选中主题里练得最少的 2 个
    let pool = D.sentences.filter(s => themes.indexOf(s.theme) >= 0);
    if (pool.length < 2) pool = D.sentences.slice();
    const sentences = pool
      .map((s, i) => ({ id: s.id, n: (state.sentences[s.id] || { n: 0 }).n, i }))
      .sort((a, b) => a.n - b.n || a.i - b.i)
      .slice(0, 2)
      .map(s => s.id);

    // 故事：和选中主题相关、读得最少的一本
    let stories = D.stories.filter(s => s.themes.some(t => themes.indexOf(t) >= 0));
    if (!stories.length) stories = D.stories.slice();
    stories.sort((a, b) => (state.stories[a.id] || { n: 0 }).n - (state.stories[b.id] || { n: 0 }).n);

    return { review, fresh, sentences, story: stories[0].id };
  }

  function todayPlan() {
    const d = day();
    if (!d.plan) {
      d.plan = buildPlan();
      save();
    }
    return d.plan;
  }

  function resetTodayPlan() {
    const d = day();
    if (!Object.keys(d.steps).length) d.plan = null;
    save();
  }

  function completeStep(step) {
    const d = day();
    d.steps[step] = true;
    save();
  }

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
  function addSeconds(n) {
    day().secs += n;
  }

  function reset() {
    state = clone(DEFAULTS);
    saveNow();
  }

  LE.store = {
    get state() { return state; },
    get settings() { return state.settings; },
    save, saveNow, today, addDays, dateKey,
    themeById, wordById, sentenceById, storyById,
    day, addStars, wordState, markSeen, grade, dueWords, themeProgress, totals,
    practiseSentence, readStory, selectedThemes, todayPlan, resetTodayPlan, completeStep, completeDay,
    streak, addSeconds, reset, MASTERED
  };
})();
