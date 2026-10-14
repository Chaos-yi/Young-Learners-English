/*
 * 小耳朵英语 · 页面与活动
 * ------------------------------------------------------------
 * 四个分栏：今天 · 看动画 · 跟我说 · 磨耳朵。不打分，只让孩子看到自己学到哪里了。
 *
 * 路由（hash）：
 *   #/                     今天（今日路线 + 我的进度）   #/today/<video|speak|listen>  路线中的某一步
 *   #/videos               看动画                        #/series/<id>                  某个系列的选集
 *   #/watch/<id>/<n>[/listen]  播放第 n 集（listen = 只听不看）
 *   #/speak                跟我说课程表                  #/lesson/<id>                  某一课
 *   #/listen               磨耳朵                        #/game/listen  #/game/move  #/loop
 *   #/stickers             贴纸墙                        #/parent                       家长中心
 */
(function () {
  const S = LE.store, SP = LE.speech, D = LE.DATA;
  const view = document.getElementById('view');
  const layer = document.getElementById('layer');
  const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  // ================= 小工具 =================
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // 英文句子里的 {age} 读成单词，中文提示里的 {age} 用数字
  function fill(text) {
    const s = S.settings;
    return text.replace(/\{name\}/g, s.name || 'Tom').replace(/\{age\}/g, NUM_WORDS[s.age] || String(s.age));
  }
  function fillZh(text) {
    const s = S.settings;
    return text.replace(/\{name\}/g, s.name || 'Tom').replace(/\{age\}/g, String(s.age));
  }

  // 自动朗读序列的「令牌」：新序列开始、点词、换页面都会让旧序列停下
  let autoToken = 0;
  function newAuto() { const t = ++autoToken; return () => t === autoToken; }
  function interrupt() { autoToken++; }

  // 页面切换时要清理的东西（录音、计时等）
  let cleanups = [];
  let dismissGuide = () => {};
  function onCleanup(fn) { cleanups.push(fn); }

  // 看视频、循环听时孩子不一定点屏幕，这期间也要计时
  let keepAlive = false;

  // ================= 图标 =================
  const ICONS = {
    today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    tv: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M8.5 2.5L12 6l3.5-3.5"/><path d="M10.2 10v5l4.3-2.5z" fill="currentColor"/>',
    speak: '<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13.2h5"/>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.8"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.8"/>',
    speaker: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
    play: '<path d="M7.5 5v14l11.5-7z" fill="currentColor"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    star: '<path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.3 9.6l6-.9z" fill="currentColor" stroke-width="1.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(name, cls) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  // ================= 通用片段 =================
  function picHTML(item, size) {
    size = size || 'md';
    if (item.color) {
      return `<span class="pic pic-${size} pic-swatch" aria-hidden="true"><span class="swatch" style="--c:${item.color}"></span><span class="on-swatch">${item.pic}</span></span>`;
    }
    if (item.count) {
      return `<span class="pic pic-${size} pic-count" aria-hidden="true">${Array.from({ length: item.count }, () => '<span>' + item.pic + '</span>').join('')}</span>`;
    }
    return `<span class="pic pic-${size}" aria-hidden="true">${item.pic}</span>`;
  }

  // 可点读的英文句子：每个词是一个 span，记录它在句子里的字符位置，用于朗读时逐词高亮
  function lineHTML(text, cls) {
    const re = /[A-Za-z0-9][A-Za-z0-9'’-]*|[^A-Za-z0-9]+/g;
    let html = '', m;
    while ((m = re.exec(text))) {
      const t = m[0];
      html += /^[A-Za-z0-9]/.test(t) ? `<span class="w" data-i="${m.index}">${esc(t)}</span>` : esc(t);
    }
    return `<p class="say-line ${cls || ''}" lang="en" data-text="${esc(text)}">${html}</p>`;
  }

  function readLine(el, opts) {
    if (!el) return Promise.resolve(false);
    opts = opts || {};
    const ws = $$('.w', el);
    const clear = () => ws.forEach(w => w.classList.remove('on'));
    return SP.speak(el.dataset.text, {
      rate: opts.rate,
      onWord: idx => {
        let hit = null;
        ws.forEach(w => { if (+w.dataset.i <= idx) hit = w; });
        clear();
        if (hit) hit.classList.add('on');
      }
    }).then(ok => { clear(); return ok; });
  }

  function dots(n, cur) {
    return Array.from({ length: n }, (_, k) => `<i class="${k < cur ? 'on' : k === cur ? 'cur' : ''}"></i>`).join('');
  }
  function barHTML(done, total, label) {
    const pct = total ? Math.round(done / total * 100) : 0;
    return `<span class="bar-track" role="img" aria-label="${esc(label || '')}"><i style="width:${pct}%"></i></span>`;
  }

  let toastTimer = null;
  function toast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  // 点任意英文单词 → 发音；带 data-say 的元素 → 读出内容
  document.addEventListener('click', e => {
    const w = e.target.closest('.say-line .w');
    if (w) {
      interrupt();
      w.classList.add('on');
      SP.speak(w.textContent, { rate: 0.9 }).then(() => w.classList.remove('on'));
      return;
    }
    const s = e.target.closest('[data-say]');
    if (s) { interrupt(); SP.speak(s.dataset.say); }
  });

  // ================= 录音跟读（不打分） =================
  let micUnavailable = false;

  /* 话筒按钮：录一遍、回放自己的声音、说一句鼓励。onSaid() 在孩子说完后调用 */
  function recWidget(el, onSaid) {
    let ctrl = null, mine = null;
    el.innerHTML = `
      <div class="rec">
        <button class="mic" type="button" aria-label="点一下开始说">${icon('mic')}</button>
        <div class="rec-side">
          <p class="rec-status"></p>
          <button class="btn btn-soft play-mine" type="button" hidden>${icon('play')} 听我的</button>
        </div>
      </div>`;
    const mic = $('.mic', el), status = $('.rec-status', el), playMine = $('.play-mine', el);
    status.textContent = micUnavailable ? '大声说出来，说完点话筒' : '点话筒，跟着说一遍';

    function said(msg) {
      const c = SP.cheer();
      status.textContent = msg || c;
      SP.speak(c);
      if (onSaid) onSaid();
    }
    playMine.onclick = () => {
      if (!mine) return;
      interrupt();
      SP.stop();
      new Audio(mine).play().catch(() => toast('播放录音失败'));
    };
    mic.onclick = async () => {
      interrupt();
      SP.stop();
      if (ctrl) { ctrl.stop(); return; }
      if (micUnavailable) { said(); return; }
      mic.classList.add('recording');
      mic.innerHTML = icon('stop');
      mic.setAttribute('aria-label', '说完了，点一下停止');
      status.textContent = '我在听……说完再点一下';
      ctrl = SP.capture({ maxMs: 7000 });
      const r = await ctrl.done;
      ctrl = null;
      if (!el.isConnected) return;
      mic.classList.remove('recording');
      mic.innerHTML = icon('mic');
      mic.setAttribute('aria-label', '点一下开始说');
      if (r.url) {
        if (mine) URL.revokeObjectURL(mine);
        mine = r.url;
        playMine.hidden = false;
        said('说得好！点「听我的」听听自己的声音');
      } else if (r.error === 'denied' || r.error === 'no-mic' || r.error === 'unsupported') {
        micUnavailable = true;
        said('话筒用不了也没关系，大声说出来就好');
      } else {
        status.textContent = '没听到声音，再说一次吧';
      }
    };
    onCleanup(() => {
      if (ctrl) ctrl.stop();
      if (mine) URL.revokeObjectURL(mine);
    });
  }

  // ================= 视频 =================
  // 解析家长粘贴的链接：每行一个 B 站链接（可带 ?p=第几集）或 mp4 地址；
  // 只有一个 B 站链接且填了总集数时，展开成第 1…N 集（B 站的「选集」/分 P）
  function parseLinks(text, parts) {
    const eps = [], bad = [];
    text.split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(line => {
      const bv = line.match(/BV[0-9A-Za-z]{10}/);
      if (bv) {
        const p = line.match(/[?&]p=(\d+)/);
        eps.push({ kind: 'bili', bvid: bv[0], page: p ? +p[1] : 1 });
      } else if (/^(https?:\/\/)?\S+\.(mp4|webm|m4v)(\?\S*)?$/i.test(line)) {
        eps.push({ kind: 'file', src: line });
      } else {
        bad.push(line);
      }
    });
    if (eps.length === 1 && eps[0].kind === 'bili' && parts > 1) {
      return { eps: Array.from({ length: parts }, (_, i) => ({ kind: 'bili', bvid: eps[0].bvid, page: i + 1 })), bad };
    }
    return { eps, bad };
  }
  // 反过来：把已保存的选集还原成输入框里的文字
  function linksText(eps) {
    if (!eps.length) return { text: '', parts: '' };
    const one = eps[0];
    const allPages = eps.every((e, i) => e.kind === 'bili' && e.bvid === one.bvid && e.page === i + 1);
    if (allPages) return { text: 'https://www.bilibili.com/video/' + one.bvid + '/', parts: eps.length > 1 ? eps.length : '' };
    return {
      text: eps.map(e => e.kind === 'bili' ? 'https://www.bilibili.com/video/' + e.bvid + '/' + (e.page > 1 ? '?p=' + e.page : '') : e.src).join('\n'),
      parts: ''
    };
  }
  function biliSearch(q) { return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(q); }

  function playerHTML(ep, title) {
    if (ep.kind === 'bili') {
      return `<iframe class="player" src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(ep.bvid)}&page=${ep.page || 1}&autoplay=0&danmaku=0&high_quality=1" title="${esc(title)}" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    return `<video class="player" src="${esc(ep.src)}" controls playsinline preload="metadata" title="${esc(title)}"></video>`;
  }

  /*
   * 播放器 + 「只听不看」+「看完了」+ 选集条。
   * opts.onWatched(idx, isNew) 看完后调用；opts.onPick(idx) 点选集时调用（默认直接换集）
   */
  function renderWatch(box, ser, idx, opts) {
    opts = opts || {};
    keepAlive = true;
    onCleanup(() => { keepAlive = false; });
    let listenOnly = !!opts.listen;

    function draw() {
      const eps = S.episodes(ser.id), w = S.watched(ser.id), ep = eps[idx];
      box.innerHTML = `
        <div class="player-wrap">
          ${playerHTML(ep, ser.title + ' 第 ' + (idx + 1) + ' 集')}
          <div class="listen-cover" ${listenOnly ? '' : 'hidden'}>
            <span class="pic pic-lg" aria-hidden="true">🎧</span>
            <h3>闭上眼睛，听一听</h3>
            <p>画面挡住了，声音还在继续</p>
            <button class="btn btn-soft" type="button" data-act="cover">${icon('eye')} 看画面</button>
          </div>
        </div>
        <div class="watch-bar">
          <div class="watch-title">
            <h2><span lang="en">${esc(ser.title)}</span> 第 ${idx + 1} 集</h2>
            <span class="muted">共 ${eps.length} 集 · 已看完 ${w.length} 集</span>
          </div>
          <div class="row">
            <button class="btn btn-soft" type="button" data-act="cover">${icon(listenOnly ? 'eye' : 'headphones')} ${listenOnly ? '看画面' : '只听不看'}</button>
            <button class="btn btn-lg" type="button" data-act="done">${icon('check')} 看完了</button>
          </div>
        </div>
        <p class="muted watch-hint">先点视频里的播放键。想让眼睛休息，就点「只听不看」，声音会继续播放。</p>
        <div class="ep-strip" aria-label="选集">${eps.map((e, i) => `<button class="ep ${w.indexOf(i) >= 0 ? 'seen' : ''} ${i === idx ? 'cur' : ''}" type="button" data-ep="${i}" aria-label="第 ${i + 1} 集${w.indexOf(i) >= 0 ? '，已看完' : ''}">${w.indexOf(i) >= 0 ? icon('check') : i + 1}</button>`).join('')}</div>`;
      const v = $('video.player', box);
      if (v) v.addEventListener('ended', done);
      // 选集条只横向滚到当前集，不带动整页滚动
      const strip = $('.ep-strip', box), cur = $('.ep.cur', box);
      if (strip && cur) strip.scrollLeft = cur.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2;
    }
    function done() {
      const isNew = S.markWatched(ser.id, idx);
      if (isNew) S.addStars(1);
      SP.speak(SP.cheer());
      if (opts.onWatched) opts.onWatched(idx, isNew);
    }
    box.onclick = e => {
      const b = e.target.closest('[data-act], [data-ep]');
      if (!b) return;
      if (b.dataset.ep !== undefined) {
        const i = +b.dataset.ep;
        if (opts.onPick) opts.onPick(i); else { idx = i; draw(); }
      } else if (b.dataset.act === 'cover') {
        listenOnly = !listenOnly;
        $('.listen-cover', box).hidden = !listenOnly;
        const btn = $('.watch-bar [data-act="cover"]', box);
        btn.innerHTML = `${icon(listenOnly ? 'eye' : 'headphones')} ${listenOnly ? '看画面' : '只听不看'}`;
      } else if (b.dataset.act === 'done') {
        done();
      }
    };
    S.setCurrent(ser.id);
    draw();
  }

  function watchedPanel(box, ser, idx, isNew) {
    const next = S.nextEpisode(ser.id);
    box.onclick = null;
    box.innerHTML = `
      <div class="done-panel">
        <span class="badge">${icon('check')}</span>
        <h2>第 ${idx + 1} 集看完啦！</h2>
        <p class="muted">${esc(ser.title)} · 已看完 ${S.watched(ser.id).length} / ${S.episodes(ser.id).length} 集${isNew ? ' · 得到 1 颗星' : ''}</p>
        <div class="row center">
          ${next >= 0 ? `<a class="btn btn-lg" href="#/watch/${ser.id}/${next + 1}">${icon('play')} 接着看第 ${next + 1} 集</a>` : '<p>这个系列全部看完了，真棒！</p>'}
          <a class="btn btn-ghost" href="#/series/${ser.id}">回到选集</a>
        </div>
      </div>`;
  }

  // ================= 跟我说 =================
  function runSpeak(stage, lesson, onDone) {
    let i = 0;
    const n = lesson.lines.length;
    function show() {
      const it = lesson.lines[i];
      const q = it.q ? fill(it.q) : '';
      const a = fill(it.a);
      const last = i === n - 1;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(n, i)}</span><span class="mode-tag">${q ? '问答：听问题，回答它' : '跟读：听一遍，跟着说'}</span></div>
        <div class="stage-body">
          <div class="col-pic"><div class="pic-stage">${picHTML(it, 'lg')}</div></div>
          <div class="col-act">
            ${q ? `<div class="bubble q"><span class="who">Question</span>${lineHTML(q)}<button class="btn btn-soft btn-icon" type="button" data-act="q" aria-label="再听问题">${icon('speaker')}</button></div>` : ''}
            <div class="bubble answer" ${q ? 'hidden' : ''}><span class="who">${q ? 'Answer' : 'Say it'}</span>${lineHTML(a, 'big')}<button class="btn btn-icon" type="button" data-act="a" aria-label="听一遍">${icon('speaker')}</button></div>
            ${S.settings.showChinese ? `<p class="zh-hint answer-zh" ${q ? 'hidden' : ''}>${esc(fillZh(it.zh))}</p>` : ''}
            ${q ? `<button class="btn btn-soft" type="button" data-act="hint">${icon('bulb')} 听听怎么回答</button>` : ''}
            <div class="rec-slot"></div>
          </div>
        </div>
        <div class="stage-nav">
          ${i > 0 ? `<button class="btn btn-ghost" type="button" data-act="prev">${icon('prev')} 上一句</button>` : ''}
          <button class="btn" type="button" data-act="next">${last ? '这一课学完了' : '下一句'} ${icon(last ? 'check' : 'next')}</button>
        </div>`;
      const reveal = () => {
        $('.bubble.answer', stage).hidden = false;
        const zh = $('.answer-zh', stage);
        if (zh) zh.hidden = false;
        const h = $('[data-act="hint"]', stage);
        if (h) h.hidden = true;
      };
      recWidget($('.rec-slot', stage), reveal);
      stage.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'q') { interrupt(); readLine($('.bubble.q .say-line', stage)); }
        else if (act === 'a') { interrupt(); readLine($('.bubble.answer .say-line', stage)); }
        else if (act === 'hint') { reveal(); interrupt(); readLine($('.bubble.answer .say-line', stage)); }
        else if (act === 'prev') { i -= 1; show(); }
        else if (act === 'next') { if (last) finish(); else { i += 1; show(); } }
      };
      const alive = newAuto();
      wait(300).then(() => { if (alive()) readLine($(q ? '.bubble.q .say-line' : '.bubble.answer .say-line', stage)); });
    }
    function finish() {
      interrupt();
      const first = S.completeLesson(lesson.id);
      if (first) S.addStars(1);
      stage.onclick = null;
      onDone(first);
    }
    show();
  }

  // ================= 磨耳朵：听音选图（一关 6 题，用一个主题） =================
  function runListen(stage, level, onDone) {
    const theme = S.levelTheme(level);
    const targets = shuffle(theme.words).slice(0, 6);
    let r = 0;

    function options(w) {
      const others = shuffle(theme.words.filter(x => x.en !== w.en && x.pic !== w.pic));
      const out = [];
      others.forEach(x => { if (out.length < 3 && !out.some(o => o.pic === x.pic)) out.push(x); });
      return shuffle([w].concat(out));
    }
    function show() {
      const w = targets[r];
      let locked = false;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(targets.length, r)}</span><span class="mode-tag">第 ${level} 关 · <span lang="en">${esc(theme.en)}</span>：听到什么，点什么</span></div>
        <button class="btn btn-lg" type="button" data-act="listen">${icon('speaker')} 再听一遍</button>
        <div class="options">${options(w).map(o => `<button class="option" type="button" data-en="${esc(o.en)}" aria-label="选项">${picHTML(o, 'lg')}</button>`).join('')}</div>`;
      stage.onclick = e => {
        if (e.target.closest('[data-act="listen"]')) { interrupt(); SP.speak(w.en); return; }
        const b = e.target.closest('.option');
        if (!b || locked || b.disabled) return;
        if (b.dataset.en === w.en) {
          locked = true;
          b.classList.add('right');
          interrupt();
          SP.speak('Yes! ' + w.en + '!').then(() => wait(400)).then(() => {
            if (!stage.isConnected) return;
            r += 1;
            if (r < targets.length) show(); else end();
          });
        } else {
          b.classList.add('wrong');
          b.disabled = true;
          interrupt();
          SP.speak(w.en);
        }
      };
      const alive = newAuto();
      wait(350).then(() => { if (alive()) SP.speak(w.en); });
    }
    function end() {
      S.finishGame('listen');
      S.addStars(1);
      stage.onclick = null;
      onDone(level);
    }
    show();
  }

  // ================= 磨耳朵：动起来（TPR） =================
  function runMove(stage, onDone) {
    const list = shuffle(D.actions).slice(0, 8);
    let i = 0;
    function show() {
      const a = list[i];
      const last = i === list.length - 1;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(list.length, i)}</span><span class="mode-tag">动起来：听指令，做动作</span></div>
        <div class="stage-body">
          <div class="col-pic"><div class="pic-stage">${picHTML(a, 'xl')}</div></div>
          <div class="col-act">
            ${lineHTML(a.say, 'big')}
            <div class="row center">
              <button class="btn btn-soft" type="button" data-act="say">${icon('speaker')} 再说一遍</button>
              <button class="btn" type="button" data-act="next">做到了！ ${icon(last ? 'check' : 'next')}</button>
            </div>
          </div>
        </div>`;
      stage.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'say') { interrupt(); readLine($('.say-line', stage)); }
        else if (last) { S.finishGame('move'); S.addStars(1); stage.onclick = null; onDone(); }
        else { i += 1; show(); }
      };
      const alive = newAuto();
      wait(300).then(() => { if (alive()) readLine($('.say-line', stage)); });
    }
    show();
  }

  // ================= 今日路线 =================
  const STEPS = [
    { id: 'video', en: 'Cartoon', zh: '看动画', mins: 8, mod: 'm-videos', icon: 'tv' },
    { id: 'speak', en: 'Say It', zh: '跟我说', mins: 4, mod: 'm-speak', icon: 'speak' },
    { id: 'listen', en: 'Listen', zh: '磨耳朵', mins: 3, mod: 'm-listen', icon: 'headphones' }
  ];

  // 每一步「接下来是什么」，让孩子知道学到哪里了
  function stepNext(id) {
    if (id === 'video') {
      const ser = S.currentSeries();
      return ser ? `${ser.title} 第 ${S.nextEpisode(ser.id) + 1} 集` : '家长还没添加动画';
    }
    if (id === 'speak') {
      const l = S.nextLesson();
      return l ? `第 ${l.index + 1} 课 · ${l.en}` : '全部学完，复习一课';
    }
    const lv = S.listenLevel();
    return `听音选图 第 ${lv} 关`;
  }

  function weekHTML() {
    const t = S.today();
    const [y, m, d] = t.split('-').map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 周一 = 0
    return ['一', '二', '三', '四', '五', '六', '日'].map((lb, i) => {
      const key = S.addDays(t, i - dow);
      const day = S.state.days[key];
      const st = day && day.done ? 'full' : day && day.secs >= 300 ? 'part' : '';
      const label = st === 'full' ? '完成路线' : st === 'part' ? '学了 5 分钟以上' : '未学习';
      return `<div class="d ${st} ${key === t ? 'today' : ''}" title="周${lb}：${label}"><span class="dot">${st === 'full' ? icon('check') : ''}</span>周${lb}</div>`;
    }).join('');
  }

  // 「我学到哪里了」：三块进度
  function progressHTML() {
    const withEps = S.seriesList().filter(s => S.episodes(s.id).length);
    const done = S.lessonsDone();
    const g = S.state.games;
    return `
      <div class="progress-grid">
        <div class="card progress-card m-videos">
          <h3>${icon('tv')} 看动画</h3>
          ${withEps.length ? withEps.map(s => {
            const total = S.episodes(s.id).length, w = S.watched(s.id).length;
            return `<a class="prog-row" href="#/series/${s.id}"><span class="prog-name" lang="en">${esc(s.title)}</span>${barHTML(w, total, s.title + ' 看完 ' + w + ' 集，共 ' + total + ' 集')}<span class="prog-num">${w} / ${total} 集</span></a>`;
          }).join('') : '<p class="muted">还没有动画。请家长到 <a href="#/parent">家长中心 → 视频管理</a> 添加。</p>'}
        </div>
        <div class="card progress-card m-speak">
          <h3>${icon('speak')} 跟我说</h3>
          <div class="lesson-dots" role="img" aria-label="已学 ${done} 课，共 ${D.lessons.length} 课">${D.lessons.map(l => `<i class="${S.lessonDone(l.id) ? 'on' : ''}"></i>`).join('')}</div>
          <p class="prog-line">已学 <b>${done}</b> / ${D.lessons.length} 课</p>
        </div>
        <div class="card progress-card m-listen">
          <h3>${icon('headphones')} 磨耳朵</h3>
          <p class="prog-line">听音选图过了 <b>${g.listen}</b> 关</p>
          <p class="prog-line">动起来做了 <b>${g.move}</b> 次</p>
        </div>
      </div>`;
  }

  function viewToday() {
    view.classList.add('home-view');
    const s = S.settings;
    const d = S.day();
    const next = STEPS.find(st => !d.steps[st.id]);
    const started = Object.keys(d.steps).length > 0;
    const hour = new Date().getHours();
    const greet = (hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + (S.hasName() ? ', ' + s.name + '!' : '');
    const noVideos = !S.seriesList().some(x => S.episodes(x.id).length);
    const total = STEPS.reduce((n, st) => n + st.mins, 0);
    const now = new Date();
    const dateLabel = `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${'日一二三四五六'[now.getDay()]}`;
    const lastSticker = S.state.stickers[S.state.stickers.length - 1];

    view.innerHTML = `
      ${!SP.supported ? '<div class="notice">当前浏览器不支持英语朗读。请用平板自带的浏览器，或电脑上的 Chrome / Edge 打开。</div>' : ''}
      ${noVideos ? '<div class="notice"><span>家长请先到 <a href="#/parent">家长中心</a>：在「学习设置」填孩子的英文名，在「视频管理」添加要看的动画。</span></div>' : ''}
      <section class="card hero m-today">
        <div>
          <p class="eyebrow">${dateLabel}</p>
          <h1 lang="en"><button type="button" data-say="${esc(greet)}">${esc(greet)}</button></h1>
          <p class="lead">${next ? `今天：看动画 → 跟我说 → 磨耳朵，大约 ${total} 分钟` : '今天的路线全部完成啦！还想玩可以去磨耳朵。'}</p>
        </div>
        <span class="hero-pic pic" aria-hidden="true">${!next && lastSticker ? lastSticker : '🎧'}</span>
        <div class="hero-actions">
          ${next
            ? `<a class="btn btn-lg" href="#/today/${next.id}">${icon('play')} ${started ? '继续今天的学习' : '开始今天的学习'}</a>`
            : '<a class="btn btn-lg" href="#/listen">去磨耳朵</a><a class="btn btn-soft" href="#/stickers">看看我的贴纸</a>'}
        </div>
        <div class="stats">
          <div class="stat"><b>${S.streak()}</b><span>连续学习（天）</span></div>
          <div class="stat"><b>${S.state.stars}</b><span>星星</span></div>
          <div class="stat"><b>${S.state.stickers.length}</b><span>贴纸</span></div>
        </div>
      </section>
      <section class="grid home-route">
        <div class="section-head"><h2>今日路线</h2><p>做完一步打一个勾</p></div>
        <div class="route">${STEPS.map((st, i) => {
          const done = !!d.steps[st.id];
          return `<a class="step ${st.mod} ${done ? 'done' : ''} ${next && next.id === st.id ? 'next' : ''}" href="#/today/${st.id}">
            <span class="num">${done ? icon('check') : i + 1}</span>
            <h3>${st.zh} <span class="muted" lang="en">${st.en}</span></h3>
            <span class="meta">${done ? '今天已完成' : '接下来：' + esc(stepNext(st.id))}</span>
            <span class="meta">约 ${st.mins} 分钟</span>
          </a>`;
        }).join('')}</div>
      </section>
      <section class="grid">
        <div class="section-head"><h2>我学到哪里了</h2><p>点一下可以接着学</p></div>
        ${progressHTML()}
      </section>
      <section class="card grid">
        <div class="section-head"><h2>本周打卡</h2><p>绿色 = 完成路线，黄色 = 学了 5 分钟以上</p></div>
        <div class="week">${weekHTML()}</div>
      </section>`;

    // 没有英语发音人时提醒家长（发音人列表在安卓/鸿蒙上加载较慢，稍后再查）
    if (SP.supported) {
      const hero = $('.hero', view);
      SP.voiceStatus(2500).then(st => {
        if (st.count || !hero.isConnected) return;
        hero.insertAdjacentHTML('beforebegin', '<div class="notice"><span>这台设备没有找到英语发音，跟我说和磨耳朵可能没有声音。请家长到 <a href="#/parent">家长中心 → 设备检查</a> 看一看。</span></div>');
      });
    }
  }

  function viewStep(stepId) {
    const idx = STEPS.findIndex(s => s.id === stepId);
    if (idx < 0) { location.hash = '#/'; return; }
    const st = STEPS[idx];
    view.className = st.mod;
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/" aria-label="回到今天">${icon('back')}</a>
        <div><p class="eyebrow">今日路线 · 第 ${idx + 1} 步 / 共 ${STEPS.length} 步</p><h1>${st.zh} <span class="sub" lang="en">${st.en}</span></h1></div>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    const finish = msg => stepDone(stage, st, msg);

    if (stepId === 'video') {
      const ser = S.currentSeries();
      if (!ser) {
        stage.innerHTML = `
          <div class="done-panel">
            <span class="pic pic-lg" aria-hidden="true">📺</span>
            <h2>还没有可以看的动画</h2>
            <p class="muted">请家长到「家长中心 → 视频管理」，给推荐的系列添加 B 站链接。今天可以先跳过这一步。</p>
            <div class="row center"><a class="btn" href="#/parent">去添加</a><button class="btn btn-ghost" type="button" id="skipVideo">跳过这一步</button></div>
          </div>`;
        $('#skipVideo').onclick = () => finish('今天先不看动画');
        return;
      }
      const box = document.createElement('div');
      box.className = 'watch';
      stage.appendChild(box);
      let ep = S.nextEpisode(ser.id);
      const draw = () => renderWatch(box, ser, ep, {
        onWatched: i => finish(`${ser.title} 第 ${i + 1} 集看完了`),
        onPick: i => { ep = i; draw(); }
      });
      draw();
    } else if (stepId === 'speak') {
      const lesson = S.nextLesson() || D.lessons[Math.floor(Math.random() * D.lessons.length)];
      runSpeak(stage, lesson, () => finish(`第 ${lesson.index + 1} 课「${lesson.en}」学完了`));
    } else if (stepId === 'listen') {
      runListen(stage, S.listenLevel(), lv => finish(`听音选图第 ${lv} 关通过了`));
    }
  }

  function stepDone(stage, st, msg) {
    S.completeStep(st.id);
    const d = S.day();
    const next = STEPS.find(s => !d.steps[s.id]);
    stage.onclick = null;
    stage.innerHTML = `
      <div class="done-panel">
        <span class="badge">${icon('check')}</span>
        <h2>${st.zh}完成！</h2>
        ${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
        <div class="row center">
          ${next
            ? `<a class="btn btn-lg ${next.mod}" href="#/today/${next.id}">下一步：${next.zh} ${icon('next')}</a>`
            : `<button class="btn btn-lg m-today" type="button" id="finishDay">领取今天的贴纸 ${icon('star')}</button>`}
          <a class="btn btn-ghost" href="#/">回到今天</a>
        </div>
      </div>`;
    if (next) {
      SP.speak('Well done!');
    } else if (!d.done) {
      $('#finishDay').onclick = celebrate;
      celebrate();
    } else {
      $('#finishDay').hidden = true;
    }
  }

  function celebrate() {
    const sticker = S.completeDay();
    if (!sticker) { location.hash = '#/'; return; }
    const name = S.settings.name;
    const colors = ['var(--coral)', 'var(--sky)', 'var(--leaf)', 'var(--grape)', 'var(--sun)'];
    layer.innerHTML = `
      <div class="overlay" role="dialog" aria-modal="true" aria-label="今日完成">
        <div class="card celebrate done-panel">
          <div class="confetti">${Array.from({ length: 36 }, (_, i) => `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${colors[i % 5]};animation-delay:${(Math.random() * .8).toFixed(2)}s"></i>`).join('')}</div>
          <div class="sticker-big" aria-hidden="true">${sticker}</div>
          <h2 lang="en">Well done, ${esc(name)}!</h2>
          <p class="muted">今天的路线全部完成，得到一张新贴纸！已经连续学习 ${S.streak()} 天。</p>
          <button class="btn btn-lg m-today" type="button" id="takeSticker">收下贴纸</button>
        </div>
      </div>`;
    SP.speak(`Well done, ${name}! Here is a new sticker for you.`);
    $('#takeSticker').onclick = () => { layer.innerHTML = ''; location.hash = '#/stickers'; };
  }

  // ================= 看动画 =================
  function seriesCard(s, href) {
    const total = S.episodes(s.id).length, w = S.watched(s.id).length;
    const next = S.nextEpisode(s.id);
    return `<a class="series-card" href="${href}">
      <span class="art tone-${s.tone || 'sky'}">${picHTML({ pic: s.pic }, 'lg')}</span>
      <h3 lang="en">${esc(s.title)}</h3>
      <span class="meta">${esc(s.zh || '')}</span>
      ${barHTML(w, total, '看完 ' + w + ' 集，共 ' + total + ' 集')}
      <span class="meta">${next < 0 ? '全部看完 ✓' : w ? `看到第 ${next + 1} 集 · 共 ${total} 集` : `共 ${total} 集，还没开始`}</span>
    </a>`;
  }

  function viewVideos() {
    const all = S.seriesList();
    const mine = all.filter(s => S.episodes(s.id).length);
    const cur = S.currentSeries();
    const curNext = cur ? S.nextEpisode(cur.id) : -1;
    const stageGroups = Object.keys(D.stages).map(k => ({
      info: D.stages[k],
      list: D.series.filter(s => s.stage === +k && !s.backup),
      backups: D.series.filter(s => s.stage === +k && s.backup)
    }));
    const recItem = s => {
      const n = S.episodes(s.id).length;
      return `<div class="rec-item">
        <span class="art tone-${s.tone}">${picHTML({ pic: s.pic }, 'md')}</span>
        <div class="rec-main">
          <h4><span lang="en">${esc(s.title)}</span> <span class="muted">${esc(s.zh)}</span></h4>
          <div class="tags"><span class="tag">${esc(s.accent)}</span><span class="tag">${esc(s.mins)}</span>${n ? `<span class="tag tag-ok">已添加 ${n} 集</span>` : ''}</div>
          <p>${esc(s.why)}${s.note ? ' ' + esc(s.note) : ''}</p>
          <a class="link" href="${biliSearch(s.q)}" target="_blank" rel="noopener">在 B 站搜索 ${icon('external')}</a>
        </div>
      </div>`;
    };
    view.innerHTML = `
      <div class="page-title"><h1>看动画 <span class="sub" lang="en">Cartoons</span></h1></div>
      ${cur ? `
        <a class="card continue-card" href="#/watch/${cur.id}/${curNext + 1}">
          <span class="art tone-${cur.tone || 'sky'}">${picHTML({ pic: cur.pic }, 'lg')}</span>
          <span class="continue-text">
            <span class="eyebrow">接着看</span>
            <b lang="en">${esc(cur.title)}</b>
            <span>第 ${curNext + 1} 集 · 已看完 ${S.watched(cur.id).length} / ${S.episodes(cur.id).length} 集</span>
          </span>
          <span class="btn btn-lg">${icon('play')} 开始看</span>
        </a>` : ''}
      <section class="grid">
        <div class="section-head"><h2>我的动画</h2><p>点进去可以选集</p></div>
        ${mine.length ? `<div class="series-grid">${mine.map(s => seriesCard(s, '#/series/' + s.id)).join('')}</div>`
          : '<div class="notice"><span>还没有动画。家长到 <a href="#/parent">家长中心 → 视频管理</a>，给下面推荐的系列添加 B 站链接就能看了。</span></div>'}
      </section>
      <section class="card grid">
        <h2>怎么看效果最好</h2>
        <ol class="tips">
          <li>每天看 1–2 集就够，同一集可以看好几天。第一遍可以用中文讲讲情节，之后只放英文。</li>
          <li>看完挑一两句常用的话和孩子说一说，或者到「跟我说」里练。</li>
          <li>眼睛累了就点「只听不看」，把动画当成磨耳朵的声音。</li>
        </ol>
      </section>
      <section class="grid">
        <div class="section-head"><h2>推荐片单 <span class="muted">给家长看</span></h2><p>从上往下看，适合零基础的 6–7 岁孩子</p></div>
        ${stageGroups.map(g => `
          <h3 class="stage-title">${esc(g.info.title)} <span class="muted">${esc(g.info.when)}</span></h3>
          <div class="rec-list">${g.list.map(recItem).join('')}</div>
          ${g.backups.length ? `<p class="backup-note">备选：上面的在 B 站找不到时，可以换成这些</p>
          <div class="rec-list">${g.backups.map(recItem).join('')}</div>` : ''}`).join('')}
      </section>`;
  }

  function viewSeries(id) {
    const ser = S.seriesById(id);
    if (!ser) { location.hash = '#/videos'; return; }
    const eps = S.episodes(id), w = S.watched(id), next = S.nextEpisode(id);
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/videos" aria-label="返回看动画">${icon('back')}</a>
        <h1><span lang="en">${esc(ser.title)}</span> <span class="sub">${esc(ser.zh || '')}</span></h1>
      </div>
      ${eps.length ? `
        <section class="card grid">
          <div class="row" style="justify-content:space-between">
            <p class="prog-line">已看完 <b>${w.length}</b> / ${eps.length} 集</p>
            ${next >= 0 ? `<a class="btn btn-lg" href="#/watch/${id}/${next + 1}">${icon('play')} 接着看第 ${next + 1} 集</a>` : '<p class="prog-line">全部看完啦 ✓</p>'}
          </div>
          ${barHTML(w.length, eps.length, '看完 ' + w.length + ' 集')}
        </section>
        <div class="ep-grid">${eps.map((e, i) => `<a class="ep-tile ${w.indexOf(i) >= 0 ? 'seen' : ''} ${i === next ? 'next' : ''}" href="#/watch/${id}/${i + 1}" aria-label="第 ${i + 1} 集${w.indexOf(i) >= 0 ? '，已看完' : ''}">
          <b>${i + 1}</b><span>${w.indexOf(i) >= 0 ? icon('check') + ' 看完了' : i === next ? '接着看' : '第 ' + (i + 1) + ' 集'}</span></a>`).join('')}</div>`
        : '<div class="notice"><span>这个系列还没有添加视频。家长到 <a href="#/parent">家长中心 → 视频管理</a> 添加。</span></div>'}`;
  }

  function viewWatch(id, n, mode) {
    const ser = S.seriesById(id);
    const eps = ser ? S.episodes(id) : [];
    const idx = +n - 1;
    if (!ser || !eps[idx]) { location.hash = ser ? '#/series/' + id : '#/videos'; return; }
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/series/${id}" aria-label="返回选集">${icon('back')}</a>
        <h1><span lang="en">${esc(ser.title)}</span> <span class="sub">${esc(ser.zh || '')}</span></h1>
      </div>
      <section class="card watch" id="watch"></section>`;
    const box = $('#watch');
    renderWatch(box, ser, idx, {
      listen: mode === 'listen',
      onWatched: (i, isNew) => watchedPanel(box, ser, i, isNew),
      onPick: i => { location.hash = '#/watch/' + id + '/' + (i + 1) + (mode ? '/' + mode : ''); }
    });
  }

  // ================= 跟我说 =================
  function viewSpeak() {
    const next = S.nextLesson();
    const done = S.lessonsDone();
    view.innerHTML = `
      <div class="page-title"><h1>跟我说 <span class="sub" lang="en">Let's Talk</span></h1></div>
      <section class="card grid m-speak">
        <div class="row" style="justify-content:space-between">
          <p class="prog-line">已学 <b>${done}</b> / ${D.lessons.length} 课</p>
          ${next ? `<a class="btn btn-lg" href="#/lesson/${next.id}">${icon('play')} 接着学第 ${next.index + 1} 课</a>` : '<p class="prog-line">全部学完啦！可以挑喜欢的课再练练 ✓</p>'}
        </div>
        ${barHTML(done, D.lessons.length, '已学 ' + done + ' 课')}
        <p class="muted">每课 3–4 句。有问题的是「问答」：先听问题，再自己回答；其余是「跟读」。点话筒录下来，还能听听自己的声音。</p>
      </section>
      <div class="lesson-map">${D.lessons.map(l => {
        const ok = S.lessonDone(l.id), isNext = next && next.id === l.id;
        return `<a class="lesson-tile ${ok ? 'done' : ''} ${isNext ? 'next' : ''}" href="#/lesson/${l.id}">
          <span class="num">${ok ? icon('check') : l.index + 1}</span>
          ${picHTML(l, 'md')}
          <b lang="en">${esc(l.en)}</b>
          <span class="meta">${esc(l.zh)}</span>
        </a>`;
      }).join('')}</div>`;
  }

  function viewLesson(id) {
    const lesson = S.lessonById[id];
    if (!lesson) { location.hash = '#/speak'; return; }
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/speak" aria-label="返回课程表">${icon('back')}</a>
        <div><p class="eyebrow">第 ${lesson.index + 1} 课 / 共 ${D.lessons.length} 课</p><h1><span lang="en">${esc(lesson.en)}</span> <span class="sub">${esc(lesson.zh)}</span></h1></div>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    runSpeak(stage, lesson, () => {
      const next = S.nextLesson();
      stage.innerHTML = `
        <div class="done-panel">
          <span class="badge">${icon('check')}</span>
          <h2>第 ${lesson.index + 1} 课学完啦！</h2>
          <p class="muted">已学 ${S.lessonsDone()} / ${D.lessons.length} 课</p>
          <div class="row center">
            ${next ? `<a class="btn btn-lg" href="#/lesson/${next.id}">接着学第 ${next.index + 1} 课 ${icon('next')}</a>` : ''}
            <a class="btn btn-ghost" href="#/speak">回到课程表</a>
          </div>
        </div>`;
      SP.speak('Well done!');
    });
  }

  // ================= 磨耳朵 =================
  function viewListen() {
    const lv = S.listenLevel();
    const theme = S.levelTheme(lv);
    const cur = S.currentSeries();
    const g = S.state.games;
    view.innerHTML = `
      <div class="page-title"><h1>磨耳朵 <span class="sub" lang="en">Listen</span></h1></div>
      <p class="muted">磨耳朵就是多听：玩听力小游戏，或者在吃饭、搭积木的时候把英语放给孩子听，不用盯着屏幕。</p>
      <div class="hub-cards">
        <a class="hub-card m-listen" href="#/game/listen">
          <span class="art">${picHTML({ pic: '👂🐱🐶' }, 'lg')}</span>
          <h3>听音选图 <span class="muted" lang="en">Listen &amp; Tap</span></h3>
          <p>听到单词，点对应的图片。下一关：第 ${lv} 关 · <span lang="en">${esc(theme.en)}</span></p>
          <span class="meta">已过 ${g.listen} 关</span>
        </a>
        <a class="hub-card m-speak" href="#/game/move">
          <span class="art">${picHTML({ pic: '🙆👏🦘' }, 'lg')}</span>
          <h3>动起来 <span class="muted" lang="en">Do It!</span></h3>
          <p>听指令做动作：<span lang="en">Touch your nose! Jump!</span> 学累了起来活动一下。</p>
          <span class="meta">已做 ${g.move} 次</span>
        </a>
        <a class="hub-card m-today" href="#/loop">
          <span class="art">${picHTML({ pic: '🔁💬' }, 'lg')}</span>
          <h3>循环听句子 <span class="muted" lang="en">Play Again</span></h3>
          <p>把「跟我说」里学过的句子一句一句、一遍一遍地读给孩子听。</p>
          <span class="meta">${S.lessonsDone() ? `学过 ${S.lessonsDone()} 课的句子` : '先放第 1–2 课'}</span>
        </a>
        ${cur ? `<a class="hub-card m-videos" href="#/watch/${cur.id}/${S.nextEpisode(cur.id) + 1}/listen">
          <span class="art">${picHTML({ pic: '🎧📺' }, 'lg')}</span>
          <h3>只听动画 <span class="muted" lang="en">Listen Only</span></h3>
          <p>播放 <span lang="en">${esc(cur.title)}</span>，画面挡住，只听声音，眼睛可以休息。</p>
          <span class="meta">第 ${S.nextEpisode(cur.id) + 1} 集</span>
        </a>` : ''}
      </div>`;
  }

  function viewListenGame() {
    const lv = S.listenLevel();
    view.className = 'm-listen';
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/listen" aria-label="返回磨耳朵">${icon('back')}</a>
        <h1>听音选图 <span class="sub">第 ${lv} 关</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    runListen(stage, lv, level => {
      stage.innerHTML = `
        <div class="done-panel">
          <span class="badge">${icon('check')}</span>
          <h2>第 ${level} 关通过！</h2>
          <p class="muted">下一关：<span lang="en">${esc(S.levelTheme(level + 1).en)}</span></p>
          <div class="row center">
            <a class="btn btn-lg" href="#/game/listen?${level + 1}">玩下一关 ${icon('next')}</a>
            <a class="btn btn-ghost" href="#/listen">回到磨耳朵</a>
          </div>
        </div>`;
      SP.speak('Great listening!');
    });
  }

  function viewMoveGame() {
    view.className = 'm-speak';
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/listen" aria-label="返回磨耳朵">${icon('back')}</a>
        <h1>动起来 <span class="sub" lang="en">Do It!</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    const run = () => runMove(stage, () => {
      stage.innerHTML = `
        <div class="done-panel">
          <span class="badge">${icon('check')}</span>
          <h2 lang="en">Great moving!</h2>
          <p class="muted">做完 8 个动作，已经做了 ${S.state.games.move} 次</p>
          <div class="row center">
            <button class="btn btn-soft" type="button" id="moveAgain">${icon('again')} 再来一轮</button>
            <a class="btn btn-ghost" href="#/listen">回到磨耳朵</a>
          </div>
        </div>`;
      SP.speak('Great moving!');
      $('#moveAgain').onclick = run;
    });
    run();
  }

  // 循环听：学过的课的句子（问题和回答都读），每句读两遍，放完从头再来
  function viewLoop() {
    const lessons = D.lessons.filter(l => S.lessonDone(l.id));
    const source = lessons.length ? lessons : D.lessons.slice(0, 2);
    const items = [];
    source.forEach(l => l.lines.forEach(it => {
      if (it.q) items.push({ pic: it.pic, count: it.count, text: fill(it.q) });
      items.push({ pic: it.pic, count: it.count, text: fill(it.a) });
    }));
    let i = 0, playing = false;
    view.className = 'm-today';
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/listen" aria-label="返回磨耳朵">${icon('back')}</a>
        <h1>循环听句子 <span class="sub">${lessons.length ? `学过的 ${lessons.length} 课` : '第 1–2 课'}</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    function draw() {
      const it = items[i];
      stage.innerHTML = `
        <div class="stage-top"><span class="mode-tag">第 ${i + 1} / ${items.length} 句</span></div>
        <div class="pic-stage">${picHTML(it, 'xl')}</div>
        ${lineHTML(it.text, 'big')}
        <div class="row center">
          <button class="btn btn-ghost btn-icon" type="button" data-act="prev" aria-label="上一句">${icon('prev')}</button>
          <button class="btn btn-lg" type="button" data-act="play">${icon(playing ? 'pause' : 'play')} ${playing ? '暂停' : '开始播放'}</button>
          <button class="btn btn-ghost btn-icon" type="button" data-act="next" aria-label="下一句">${icon('next')}</button>
        </div>
        <p class="muted">每句读两遍，放完自动从头再来。可以放着当背景声，不用一直看屏幕。</p>`;
    }
    async function loop() {
      const alive = newAuto();
      while (playing && alive()) {
        draw();
        const line = $('.say-line', stage);
        await readLine(line); if (!alive() || !playing) return;
        await wait(900); if (!alive() || !playing) return;
        await readLine(line); if (!alive() || !playing) return;
        await wait(1500); if (!alive() || !playing) return;
        i = (i + 1) % items.length;
      }
    }
    function setPlaying(on) {
      playing = on;
      keepAlive = on;
      if (on) loop(); else { interrupt(); SP.stop(); draw(); }
    }
    stage.onclick = e => {
      if (e.target.closest('.say-line .w')) { setPlaying(false); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'play') setPlaying(!playing);
      else {
        i = (i + (b.dataset.act === 'next' ? 1 : items.length - 1)) % items.length;
        if (playing) loop(); else draw();
      }
    };
    onCleanup(() => { playing = false; keepAlive = false; });
    draw();
  }

  // ================= 贴纸墙 =================
  function viewStickers() {
    const got = S.state.stickers;
    view.innerHTML = `
      <div class="page-title"><h1>贴纸墙 <span class="sub" lang="en">My Stickers</span></h1></div>
      <p class="muted">每完成一天的路线，就能得到一张新贴纸。已经收集 ${got.length} / ${D.stickers.length} 张，攒了 ${S.state.stars} 颗星星。</p>
      <div class="sticker-wall">${D.stickers.map((s, i) => i < got.length
        ? `<span class="sticker" role="img" aria-label="贴纸 ${i + 1}">${s}</span>`
        : '<span class="sticker locked" aria-label="还没解锁">?</span>').join('')}</div>`;
  }

  // ================= 家长中心 =================
  let parentUnlocked = false;
  let parentTab = 'report';

  // 首次使用准备按三步保存；跳过也会前进，不会每次打开都打扰家长。
  function advanceGuide() {
    dismissGuide();
    S.advanceOnboarding();
    if (S.onboarding.completed) {
      if (location.hash === '#/' || !location.hash) route();
      else location.hash = '#/';
    } else route();
  }
  function goToGuidePage() {
    dismissGuide();
    const page = S.openOnboardingPage();
    if (!page) return;
    parentUnlocked = true;
    const hash = '#/parent/' + page;
    if (location.hash === hash) route();
    else location.hash = hash;
  }
  function guideBanner() {
    if (!S.needsOnboarding() || !S.onboarding.page) return;
    const guide = S.onboarding;
    const banner = document.createElement('section');
    banner.className = 'card onboarding-banner';
    banner.setAttribute('aria-label', '首次使用引导');
    banner.innerHTML = `<p class="eyebrow">给家长 · 第 ${guide.step + 1} / 3 步</p><h2>${guide.step === 1 ? '添加一个动画，就可以开始了' : '试听一下英语发音'}</h2><p class="muted">${guide.step === 1 ? '展开一个系列，粘贴播放链接并保存。保存后点击下一步，也可以跳过。' : '在下方「英语发音」中点试听，确认声音清楚；需要时可到学习设置调整发音人。'}</p><div class="row"><button class="btn btn-soft" type="button" data-guide-next>${guide.step === 1 ? '动画已添加，下一步' : '试听后，完成引导'}</button><button class="btn btn-ghost" type="button" data-guide-skip>跳过这一步</button>${parentTab !== guide.page ? '<button class="btn btn-ghost" type="button" data-guide-back>回到这一步</button>' : ''}</div>`;
    $('#parentBody').before(banner);
    $('[data-guide-skip]', banner).onclick = advanceGuide;
    $('[data-guide-next]', banner).onclick = () => {
      if (guide.step === 1 && !S.hasVideos()) {
        toast('先保存一个动画链接，也可以跳过这一步');
        return;
      }
      advanceGuide();
    };
    if ($('[data-guide-back]', banner)) $('[data-guide-back]', banner).onclick = goToGuidePage;
  }
  function showGuide() {
    if (!S.needsOnboarding()) return;
    if (S.onboarding.page && /^#\/parent(?:\/|$)/.test(location.hash) && parentUnlocked) return;
    dismissGuide();
    S.startOnboarding();
    const step = S.onboarding.step;
    const titles = ['先填孩子的英文名', '给孩子准备一个动画', '试听一下英语发音'];
    const notes = [
      '名字可以之后再改，也可以先跳过。',
      '去视频管理选一个系列，添加一个可播放的链接。',
      '去设备检查点「试听」，确认这台设备能清楚地读英语。',
    ];
    layer.innerHTML = `<div class="overlay"><section class="card onboarding-dialog m-parent" role="dialog" aria-modal="true" aria-labelledby="guideTitle"><p class="eyebrow">给家长 · 第 ${step + 1} / 3 步</p><div class="guide-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<span class="${i === step ? 'current' : i < step ? 'done' : ''}"></span>`).join('')}</div><span class="guide-art" aria-hidden="true">${['👋', '📺', '🔊'][step]}</span><h2 id="guideTitle">${titles[step]}</h2><p class="muted">${notes[step]}</p>${step === 0 ? `<form id="guideNameForm" class="form"><div class="field"><label for="guideName">孩子的英文名</label><input id="guideName" class="input" maxlength="20" autocomplete="off" placeholder="例如 Lily" value="${S.hasName() ? esc(S.settings.name) : ''}"></div><button class="btn" type="submit">保存，下一步</button></form>` : `<button class="btn" type="button" id="guideGo">去${step === 1 ? '视频管理' : '设备检查'}</button>`}<button class="btn btn-ghost" type="button" id="guideSkip">跳过这一步</button><p class="help">看完三步后会记下来，以后不再自动弹出。</p></section></div>`;
    document.body.classList.add('guide-open');
    const dialog = $('.onboarding-dialog', layer);
    function keydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        advanceGuide();
      } else if (e.key === 'Tab') {
        const elements = Array.from(dialog.querySelectorAll('input, button'));
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', keydown);
    dismissGuide = () => {
      document.removeEventListener('keydown', keydown);
      document.body.classList.remove('guide-open');
      if (dialog.isConnected) layer.innerHTML = '';
      dismissGuide = () => {};
    };
    $('#guideSkip').onclick = advanceGuide;
    if (step === 0)
      $('#guideNameForm').onsubmit = (e) => {
        e.preventDefault();
        if (!$('#guideName').value.trim()) {
          toast('可以填一个名字，或点「跳过这一步」');
          $('#guideName').focus();
          return;
        }
        S.setName($('#guideName').value);
        advanceGuide();
      };
    else $('#guideGo').onclick = goToGuidePage;
    // 手机上先聚焦按钮，避免自动弹出键盘遮住引导。
    $(step === 0 ? '#guideNameForm button' : '#guideGo').focus();
  }

  function viewParent(requestedTab) {
    if (requestedTab) parentTab = requestedTab;
    if (!parentUnlocked) { parentGate(); return; }
    const tab = (id, label) => `<button class="filter" type="button" data-t="${id}" aria-pressed="${parentTab === id}">${label}</button>`;
    view.innerHTML = `
      <div class="page-title"><h1>家长中心</h1><span class="sub">孩子的学习情况和设置</span></div>
      <div class="parent-tabs filters">${tab('report', '学习报告')}${tab('videos', '视频管理')}${tab('settings', '学习设置')}${tab('device', '设备检查')}</div>
      <div id="parentBody" class="grid"></div>`;
    $('.parent-tabs', view).onclick = e => {
      const b = e.target.closest('[data-t]');
      if (b) { parentTab = b.dataset.t; viewParent(); }
    };
    const body = $('#parentBody');
    if (parentTab === 'report') parentReport(body);
    else if (parentTab === 'settings') parentSettings(body);
    else if (parentTab === 'device') parentDevice(body);
    else parentVideos(body);
    guideBanner();
  }

  function parentGate() {
    const a = 3 + Math.floor(Math.random() * 7), b = 3 + Math.floor(Math.random() * 7);
    view.innerHTML = `
      <section class="card gate">
        <span class="back" aria-hidden="true">${icon('lock')}</span>
        <h1>家长中心</h1>
        <p class="muted">请家长回答下面的算术题</p>
        <p class="q">${a} × ${b} = ?</p>
        <form id="gateForm" class="grid" style="justify-items:center">
          <input id="gateAnswer" class="input" inputmode="numeric" autocomplete="off" aria-label="答案">
          <button class="btn" type="submit">进入</button>
        </form>
      </section>`;
    $('#gateForm').onsubmit = e => {
      e.preventDefault();
      if (+$('#gateAnswer').value === a * b) { parentUnlocked = true; viewParent(); }
      else { toast('不对哦，再算一算'); $('#gateAnswer').value = ''; }
    };
  }

  function parentReport(body) {
    const st = S.state, set = S.settings;
    const t = S.today();
    const keys = Array.from({ length: 7 }, (_, i) => S.addDays(t, i - 6));
    const mins = keys.map(k => Math.round(((st.days[k] || {}).secs || 0) / 60));
    const goal = set.dailyMinutes;
    const top = Math.max(goal, ...mins) * 1.2;
    const tot = S.totals();
    const label = k => { const [, m, d] = k.split('-'); return `${+m}/${+d}`; };
    const weekdays = keys.map(k => { const [y, m, d] = k.split('-').map(Number); return '日一二三四五六'[new Date(y, m - 1, d).getDay()]; });
    const log = k => (st.days[k] && st.days[k].log) || { watched: 0, lessons: 0, games: 0 };
    const withEps = S.seriesList().filter(s => S.episodes(s.id).length);

    body.innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${S.streak()}</b><span>连续学习（天）</span></div>
        <div class="kpi"><b>${Math.round(S.day().secs / 60)}</b><span>今天（分钟）</span></div>
        <div class="kpi"><b>${mins.reduce((a, b) => a + b, 0)}</b><span>最近 7 天（分钟）</span></div>
        <div class="kpi"><b>${tot.watched}</b><span>看完的动画（集）</span></div>
        <div class="kpi"><b>${tot.lessons} / ${D.lessons.length}</b><span>跟我说（课）</span></div>
        <div class="kpi"><b>${tot.games}</b><span>磨耳朵游戏（次）</span></div>
      </div>

      <section class="card grid">
        <div class="section-head"><h2>最近 7 天学习时长（分钟）</h2><p>虚线是每日目标</p></div>
        <div style="padding-top:34px">
          <div class="chart" role="img" aria-label="最近 7 天每日学习分钟数：${keys.map((k, i) => label(k) + ' ' + mins[i] + ' 分钟').join('，')}">
            <div class="goal" style="bottom:${goal / top * 100}%"><span>目标 ${goal}</span></div>
            ${keys.map((k, i) => {
              const h = mins[i] / top * 100;
              const lg = log(k);
              return `<button class="col ${k === t ? 'today' : ''}" type="button" style="--h:${h}%">
                <span class="bar" style="height:${h}%"></span>
                ${k === t ? `<span class="val">${mins[i]}</span>` : ''}
                <span class="tip">${label(k)} 周${weekdays[i]}：${mins[i]} 分钟 · 动画 ${lg.watched} 集 · 跟读 ${lg.lessons} 课</span>
              </button>`;
            }).join('')}
          </div>
          <div class="chart-x">${keys.map((k, i) => `<span>${k === t ? '今天' : '周' + weekdays[i]}</span>`).join('')}</div>
        </div>
        <details>
          <summary>查看数据表</summary>
          <div class="table-wrap"><table>
            <thead><tr><th>日期</th><th>分钟</th><th>动画（集）</th><th>跟我说（课）</th><th>磨耳朵（次）</th><th>完成路线</th></tr></thead>
            <tbody>${keys.map((k, i) => { const lg = log(k); return `<tr><td>${label(k)} 周${weekdays[i]}</td><td>${mins[i]}</td><td>${lg.watched}</td><td>${lg.lessons}</td><td>${lg.games}</td><td>${st.days[k] && st.days[k].done ? '是' : '—'}</td></tr>`; }).join('')}</tbody>
          </table></div>
        </details>
      </section>

      <section class="card grid">
        <h2>动画看到哪里了</h2>
        ${withEps.length ? `<div class="theme-rows">${withEps.map(s => {
          const total = S.episodes(s.id).length, w = S.watched(s.id).length;
          return `<div class="theme-row"><span class="name" lang="en">${esc(s.title)}</span>${barHTML(w, total, '')}<span class="nums">${w} / ${total} 集</span></div>`;
        }).join('')}</div>` : '<p class="muted">还没有添加动画，去「视频管理」添加。</p>'}
      </section>

      <section class="card grid">
        <h2>跟我说学到哪里了</h2>
        <div class="lesson-chips">${D.lessons.map(l => `<span class="lesson-chip ${S.lessonDone(l.id) ? 'done' : ''}">${S.lessonDone(l.id) ? icon('check') : ''}第 ${l.index + 1} 课 <span lang="en">${esc(l.en)}</span></span>`).join('')}</div>
      </section>`;
  }

  function parentVideos(body) {
    const all = S.seriesList();
    const cur = S.currentSeries();
    const row = s => {
      const n = S.episodes(s.id).length;
      const lt = linksText(S.episodes(s.id));
      return `<details class="series-edit" data-id="${s.id}">
        <summary>
          ${picHTML({ pic: s.pic }, 'sm')}
          <span class="se-title"><b lang="en">${esc(s.title)}</b> <span class="muted">${esc(s.zh || '')}</span></span>
          <span class="tag ${n ? 'tag-ok' : ''}">${n ? `已添加 ${n} 集` : '未添加'}</span>
          ${cur && cur.id === s.id ? '<span class="tag tag-cur">正在看</span>' : ''}
        </summary>
        <div class="form">
          ${s.why ? `<p class="muted">${esc(s.why)}${s.note ? ' ' + esc(s.note) : ''}</p>` : ''}
          <a class="link" href="${biliSearch(s.q)}" target="_blank" rel="noopener">在 B 站搜索「${esc(s.q)}」 ${icon('external')}</a>
          <div class="field">
            <label for="links-${s.id}">视频链接</label>
            <textarea id="links-${s.id}" class="input" rows="3" placeholder="粘贴 B 站视频链接，每行一个；也可以是 mp4 地址">${esc(lt.text)}</textarea>
          </div>
          <div class="field">
            <label for="parts-${s.id}">总集数（选填）</label>
            <input id="parts-${s.id}" class="input" type="number" min="1" max="500" inputmode="numeric" value="${lt.parts}" placeholder="例如 52">
            <span class="help">B 站上一个视频里有「选集」列表（分 P）时，只要粘贴一个链接，再填总共几集。</span>
          </div>
          <div class="row">
            <button class="btn" type="button" data-save="${s.id}">保存</button>
            ${n ? `<button class="btn btn-soft" type="button" data-cur="${s.id}">设为正在看</button>` : ''}
            ${s.custom ? `<button class="btn btn-ghost" type="button" data-del="${s.id}">${icon('trash')} 删除这个系列</button>` : ''}
          </div>
        </div>
      </details>`;
    };
    body.innerHTML = `
      <section class="card grid">
        <h2>怎么添加视频</h2>
        <ol class="tips">
          <li>点系列里的「在 B 站搜索」，找一个<b>完整、清晰</b>的版本。最好是带「选集」的合集，优先选官方账号上传的。</li>
          <li>复制浏览器地址栏里的链接，粘贴到「视频链接」。合集只要粘贴一个链接，再填总集数。</li>
          <li>点「保存」。孩子在「看动画」里就能按顺序一集一集看，看完的会打勾。</li>
        </ol>
        <p class="muted">视频在 B 站的播放器里播放，网站本身不存视频。已经在别的设备上填好了？到「学习设置 → 备份与恢复」搬过来，不用重新填。</p>
      </section>
      ${Object.keys(D.stages).map(k => `
        <section class="grid">
          <h3 class="stage-title">${esc(D.stages[k].title)} <span class="muted">${esc(D.stages[k].when)}</span></h3>
          ${all.filter(s => s.stage === +k && !s.backup).map(row).join('')}
          <p class="backup-note">备选：上面的找不到时用</p>
          ${all.filter(s => s.stage === +k && s.backup).map(row).join('')}
        </section>`).join('')}
      <section class="grid">
        <h3 class="stage-title">自己添加的系列</h3>
        ${all.filter(s => s.custom).map(row).join('') || '<p class="muted">还没有。想看推荐片单以外的动画，可以在这里加一个系列。</p>'}
        <form id="addSeries" class="row">
          <input id="newSeries" class="input" placeholder="系列名称，例如 Ben and Holly" maxlength="40" autocomplete="off" aria-label="系列名称">
          <button class="btn btn-soft" type="submit">添加系列</button>
        </form>
      </section>`;

    body.onclick = e => {
      const save = e.target.closest('[data-save]');
      const setCur = e.target.closest('[data-cur]');
      const del = e.target.closest('[data-del]');
      if (save) {
        const id = save.dataset.save;
        const parts = parseInt($('#parts-' + id).value, 10) || 0;
        const res = parseLinks($('#links-' + id).value, parts);
        if (res.bad.length) { toast(`有 ${res.bad.length} 行没认出来：请粘贴含 BV 号的 B 站链接，或 mp4 地址`); return; }
        S.setEpisodes(id, res.eps);
        toast(res.eps.length ? `已保存，共 ${res.eps.length} 集` : '已清空这个系列的视频');
        parentVideos(body);
        const open = $(`.series-edit[data-id="${id}"]`, body);
        if (open) open.open = true;
      } else if (setCur) {
        S.setCurrent(setCur.dataset.cur);
        toast('已设为正在看，今日路线会接着播这个系列');
        parentVideos(body);
      } else if (del) {
        S.removeCustom(del.dataset.del);
        toast('已删除');
        parentVideos(body);
      }
    };
    $('#addSeries').onsubmit = e => {
      e.preventDefault();
      const title = $('#newSeries').value.trim();
      if (!title) { toast('请先填系列名称'); return; }
      const id = S.addCustom(title);
      parentVideos(body);
      const open = $(`.series-edit[data-id="${id}"]`, body);
      if (open) { open.open = true; open.scrollIntoView({ block: 'center' }); }
    };
  }

  function parentSettings(body) {
    const s = S.settings;
    const seg = (key, options) => `<div class="seg" data-key="${key}">${options.map(([val, label]) =>
      `<button type="button" data-val='${JSON.stringify(val)}' aria-pressed="${s[key] === val}">${label}</button>`).join('')}</div>`;
    const voices = SP.voices.filter(v => v.lang.replace('_', '-').toLowerCase().indexOf(s.accent.toLowerCase().slice(0, 5)) === 0);
    body.innerHTML = `
      <section class="card form">
        <div class="field">
          <label for="setName">孩子的英文名</label>
          <input id="setName" class="input" value="${S.hasName() ? esc(s.name) : ''}" placeholder="选填，例如 Lily" maxlength="20" autocomplete="off">
          <span class="help">会出现在句子里，比如 <span lang="en">“My name is ${esc(s.name)}.”</span></span>
        </div>
        <div class="field">
          <label for="setAge">年龄</label>
          <select id="setAge" class="input">${[5, 6, 7, 8, 9].map(a => `<option value="${a}" ${s.age === a ? 'selected' : ''}>${a} 岁（${NUM_WORDS[a]}）</option>`).join('')}</select>
        </div>
        <div class="field"><span class="label">每天学习时长</span>${seg('dailyMinutes', [[10, '10 分钟'], [15, '15 分钟'], [20, '20 分钟']])}
          <span class="help">到时间会提醒休息眼睛</span></div>
        <div class="field"><span class="label">发音</span>${seg('accent', [['en-GB', '英音 en-GB'], ['en-US', '美音 en-US']])}
          <span class="help">影响跟我说、磨耳朵里的朗读；动画的口音由视频本身决定</span></div>
        <div class="field">
          <label for="setVoice">发音人</label>
          <div class="row">
            <select id="setVoice" class="input"><option value="">自动选择</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${s.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)}（${esc(v.lang)}）</option>`).join('')}</select>
            <button class="btn btn-soft" type="button" id="testVoice">${icon('speaker')} 试听</button>
          </div>
          <span class="help">${voices.length ? `本设备有 ${voices.length} 个可用的发音人，逐个试听，选最清楚的。` : '还没读到本设备的发音人，点一下「试听」再回来看看。'}</span>
        </div>
        <div class="field">
          <label for="setRate">语速：<b id="rateVal">${s.rate.toFixed(2)}</b></label>
          <input id="setRate" type="range" min="0.6" max="1.1" step="0.05" value="${s.rate}">
          <span class="help">零基础建议 0.8 左右，熟悉后慢慢调到 1.0</span>
        </div>
        <div class="field"><span class="label">中文提示</span>${seg('showChinese', [[true, '显示'], [false, '不显示']])}
          <span class="help">「跟我说」里每句下面的中文意思；孩子熟悉后可以关掉</span></div>
        <div class="field">
          <span class="label">备份与恢复</span>
          <span class="help">换设备、换网址时用。在原来的设备上点「复制备份」，通过微信「文件传输助手」等发到新设备；在新设备上把内容粘贴到下面，点「恢复」。备份里有视频链接、学习进度和设置。</span>
          <div><button class="btn btn-soft" type="button" id="copyBackup">复制备份</button></div>
          <textarea id="backupText" class="input" rows="3" placeholder="把备份内容粘贴到这里" aria-label="备份内容"></textarea>
          <div><button class="btn" type="button" id="restoreBackup">恢复</button></div>
        </div>
        <div class="field danger">
          <span class="label">重置</span>
          <div><button class="btn btn-ghost" type="button" id="resetAll">${icon('trash')} 清空所有学习记录和视频</button></div>
        </div>
      </section>`;

    const changed = msg => { S.save(); toast(msg || '已保存'); };
    $('#setName').onchange = e => { S.setName(e.target.value); changed(); };
    $('#setAge').onchange = e => { s.age = +e.target.value; changed(); };
    $$('.seg', body).forEach(g => {
      g.onclick = e => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        const key = g.dataset.key;
        s[key] = JSON.parse(b.dataset.val);
        if (key === 'accent') s.voiceURI = '';
        changed();
        parentSettings(body);
      };
    });
    $('#setVoice').onchange = e => { s.voiceURI = e.target.value; changed(); };
    $('#testVoice').onclick = () => SP.speak(`Hello, ${s.name}! Let's learn English together.`);
    $('#setRate').oninput = e => { s.rate = +e.target.value; $('#rateVal').textContent = s.rate.toFixed(2); };
    $('#setRate').onchange = () => { changed(); SP.speak('This is my speed.'); };
    $('#copyBackup').onclick = () => {
      const box = $('#backupText');
      box.value = S.exportData();
      const manual = () => { box.focus(); box.select(); toast('请长按输入框里的文字，全选后复制'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value).then(() => toast('已复制，可以粘贴到微信发给新设备'), manual);
      } else {
        manual();
      }
    };
    let restoreArmed = false;
    $('#restoreBackup').onclick = e => {
      const text = $('#backupText').value.trim();
      if (!text) { toast('请先把备份内容粘贴到上面的输入框'); return; }
      if (!restoreArmed) {
        restoreArmed = true;
        e.currentTarget.textContent = '再点一次确认（会覆盖这台设备上的记录）';
        setTimeout(() => {
          restoreArmed = false;
          const b = $('#restoreBackup');
          if (b) b.textContent = '恢复';
        }, 5000);
        return;
      }
      restoreArmed = false;
      if (!S.importData(text)) {
        e.currentTarget.textContent = '恢复';
        toast('没认出这段备份，请确认复制完整了');
        return;
      }
      renderHeader();
      toast('已恢复：视频链接、学习进度和设置都搬过来了');
      parentSettings(body);
    };
    let armed = false;
    $('#resetAll').onclick = e => {
      if (!armed) {
        armed = true;
        e.currentTarget.innerHTML = `${icon('trash')} 再点一次，确认清空`;
        setTimeout(() => {
          armed = false;
          const b = $('#resetAll');
          if (b) b.innerHTML = `${icon('trash')} 清空所有学习记录和视频`;
        }, 4000);
        return;
      }
      S.reset();
      renderHeader();
      toast('已清空');
      parentSettings(body);
    };
  }

  /* 设备检查：第一次在平板上打开时，确认发音、话筒、离线缓存、进度保存都正常 */
  function parentDevice(body) {
    const row = (id, title) => `
      <div class="check" id="${id}">
        <span class="check-state" data-state="wait">…</span>
        <div class="check-main"><h3>${title}</h3><p class="check-text muted">检查中…</p><div class="row check-act"></div></div>
      </div>`;
    body.innerHTML = `
      <section class="card grid">
        <div class="section-head"><h2>设备检查</h2><p>第一次在平板上打开时，按顺序检查一遍</p></div>
        <div class="checks">
          ${row('ckVoice', '英语发音')}
          ${row('ckMic', '话筒（跟读录音）')}
          ${row('ckVideo', '播放动画')}
          ${row('ckOffline', '离线使用')}
          ${row('ckSave', '保存学习进度')}
          ${row('ckApp', '桌面图标')}
        </div>
      </section>`;
    const STATE = { ok: '✓', warn: '!', info: 'i', wait: '…' };
    function set(id, state, text, actions) {
      const el = $('#' + id, body);
      if (!el) return;
      const s = $('.check-state', el);
      s.dataset.state = state;
      s.textContent = STATE[state];
      $('.check-text', el).textContent = text;
      $('.check-act', el).innerHTML = actions || '';
    }

    SP.voiceStatus(3000).then(st => {
      if (!st.supported) {
        set('ckVoice', 'warn', '这个浏览器不支持朗读。请换用平板自带的浏览器打开。');
      } else if (!st.count) {
        set('ckVoice', 'warn', `没有找到英语发音人（本机共有 ${st.total} 个发音人）。跟我说、磨耳朵里可能没声音，或用中文口音读英文。可以到平板「设置 → 辅助功能」里找「文字转语音输出」，选择或下载英语语音后再回来试听。`,
          `<button class="btn btn-soft" type="button" data-ck="voice">${icon('speaker')} 试听</button>`);
      } else {
        set('ckVoice', 'ok', `找到 ${st.count} 个英语发音人，正在使用：${st.voice ? st.voice.name + '（' + st.voice.lang + '）' : '系统默认'}。点「试听」，听听是不是标准、清楚的英语。不满意可以到「学习设置」换发音人。`,
          `<button class="btn btn-soft" type="button" data-ck="voice">${icon('speaker')} 试听</button>`);
      }
    });

    if (!window.isSecureContext) {
      set('ckMic', 'warn', '当前地址不是 https，浏览器不允许用话筒。请用 https 开头的网址打开。');
    } else if (!SP.canRecord) {
      set('ckMic', 'info', '这个浏览器不能录音。跟读时孩子大声说出来就好，不影响使用。');
    } else {
      set('ckMic', 'info', '点下面的按钮，对着平板说一句话（3 秒），听听能不能录上。第一次会弹出「允许使用麦克风」，请点允许。',
        `<button class="btn btn-soft" type="button" data-ck="mic">${icon('mic')} 测试录音</button>`);
    }

    const cur = S.currentSeries();
    set('ckVideo', cur ? 'info' : 'warn', cur
      ? `去「看动画」打开 ${cur.title}，点播放键，看看能不能正常播放、有没有声音。`
      : '还没有添加动画。先到「视频管理」添加一个系列，再回来试播。');

    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      set('ckOffline', 'warn', '当前打开方式不支持离线缓存。用 https 网址打开后，网站本身断网也能打开（动画仍然需要联网）。');
    } else {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.active) set('ckOffline', 'ok', '网站已经存到这台平板上，网络慢时也能直接打开。动画在 B 站播放，仍然需要联网。');
        else set('ckOffline', 'info', '正在把网站存到平板上，稍等几秒后刷新页面再看。');
      }).catch(() => set('ckOffline', 'warn', '离线缓存没开启成功，联网时仍可正常使用。'));
    }

    let canSave = false;
    try {
      localStorage.setItem('little-ears.check', '1');
      canSave = localStorage.getItem('little-ears.check') === '1';
      localStorage.removeItem('little-ears.check');
    } catch (e) { canSave = false; }
    set('ckSave', canSave ? 'ok' : 'warn', canSave
      ? '进度和视频链接保存在这台平板的浏览器里。不要在浏览器设置里「清除数据/缓存」，也不要用无痕模式。'
      : '无法保存进度（可能开了无痕模式或禁止了网站存储）。请用普通模式打开。');

    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    set('ckApp', standalone ? 'ok' : 'info', standalone
      ? '已经是从桌面图标打开的，没有浏览器地址栏，孩子不容易误点到别的网站。'
      : '建议在浏览器菜单里选「添加到桌面」（或「安装应用」），孩子以后点桌面上的小耳朵图标就能进入。');

    body.onclick = e => {
      const b = e.target.closest('[data-ck]');
      if (!b) return;
      if (b.dataset.ck === 'voice') {
        interrupt();
        SP.speak("Hello! I'm your English friend. Apple, banana, orange. Good job!");
      } else if (b.dataset.ck === 'mic') {
        b.disabled = true;
        set('ckMic', 'wait', '正在录音，请说一句话……');
        const ctrl = SP.capture({ maxMs: 3000 });
        onCleanup(() => ctrl.stop());
        ctrl.done.then(r => {
          const again = `<button class="btn btn-soft" type="button" data-ck="mic">${icon('again')} 再测一次</button>`;
          if (r.url) {
            set('ckMic', 'ok', '录音正常，正在回放刚才的声音。', again);
            new Audio(r.url).play().catch(() => {});
          } else if (r.error === 'denied') {
            set('ckMic', 'warn', '话筒权限被拒绝。请在浏览器的网站设置里允许麦克风；如果还不行，到平板「设置 → 应用和服务 → 权限管理」里允许浏览器使用麦克风。', again);
          } else {
            set('ckMic', 'warn', '没有录到声音。请检查话筒权限后再试；录不了也不影响学习。', again);
          }
        });
      }
    };
  }

  // ================= 顶栏、导航、计时 =================
  const TABS = [
    { id: 'today', href: '#/', zh: '今天', en: 'Today', icon: 'today', mod: 'm-today' },
    { id: 'videos', href: '#/videos', zh: '看动画', en: 'Cartoons', icon: 'tv', mod: 'm-videos' },
    { id: 'speak', href: '#/speak', zh: '跟我说', en: 'Speak', icon: 'speak', mod: 'm-speak' },
    { id: 'listen', href: '#/listen', zh: '磨耳朵', en: 'Listen', icon: 'headphones', mod: 'm-listen' }
  ];
  $('#tabs').innerHTML = TABS.map(t => `<a class="tab ${t.mod}" href="${t.href}" data-tab="${t.id}">${icon(t.icon)}<span>${t.zh}</span><small>${t.en}</small></a>`).join('');
  $('#parentLink').innerHTML = icon('lock');

  function setTab(id) {
    $$('.tab').forEach(a => {
      const on = a.dataset.tab === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const t = TABS.find(x => x.id === id);
    view.className = t ? t.mod : 'm-parent';
  }

  function renderTimer() {
    const d = S.day();
    const goal = S.settings.dailyMinutes;
    const mins = Math.floor(d.secs / 60);
    const el = $('#timer');
    el.classList.toggle('reached', mins >= goal);
    el.innerHTML = `${icon(mins >= goal ? 'check' : 'clock')}<span>${mins} / ${goal}<span class="label-long"> 分钟</span></span><span class="bar" style="width:${Math.min(100, d.secs / (goal * 60) * 100)}%"></span>`;
  }
  function renderStars() {
    $('#stars').innerHTML = `${icon('star')}<span class="n">${S.state.stars}</span>`;
  }
  function renderHeader() { renderTimer(); renderStars(); }
  document.addEventListener('le:stars', renderStars);

  // 学习计时：页面可见、且 2 分钟内有操作（或正在看视频、循环听）才计时
  let lastActive = Date.now();
  let ticks = 0;
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!keepAlive && Date.now() - lastActive > 120000) return;
    S.addSeconds(1);
    ticks += 1;
    if (ticks % 10 === 0) S.save();
    renderTimer();
    const d = S.day();
    if (!d.reminded && d.secs >= S.settings.dailyMinutes * 60) {
      d.reminded = true;
      S.save();
      toast(`今天的 ${S.settings.dailyMinutes} 分钟到啦！看完这一集就休息一下眼睛吧`);
    }
  }, 1000);

  // ================= 路由 =================
  const ROUTES = [
    [/^\/?$/, viewToday, 'today'],
    [/^\/today\/(\w+)$/, viewStep, 'today'],
    [/^\/videos$/, viewVideos, 'videos'],
    [/^\/series\/(\w+)$/, viewSeries, 'videos'],
    [/^\/watch\/(\w+)\/(\d+)(?:\/(listen))?$/, viewWatch, 'videos'],
    [/^\/speak$/, viewSpeak, 'speak'],
    [/^\/lesson\/(\w+)$/, viewLesson, 'speak'],
    [/^\/listen$/, viewListen, 'listen'],
    [/^\/game\/listen(?:\?\d+)?$/, viewListenGame, 'listen'],
    [/^\/game\/move$/, viewMoveGame, 'listen'],
    [/^\/loop$/, viewLoop, 'listen'],
    [/^\/stickers$/, viewStickers, ''],
    [/^\/parent(?:\/(videos|device|settings))?$/, viewParent, '']
  ];

  function route() {
    dismissGuide();
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* 忽略 */ } });
    cleanups = [];
    keepAlive = false;
    interrupt();
    SP.stop();
    layer.innerHTML = '';
    const t = $('#toast');
    if (t) t.hidden = true;
    const path = location.hash.replace(/^#/, '') || '/';
    if (S.needsOnboarding() && S.onboarding.page && path === '/parent/' + S.onboarding.page) parentUnlocked = true;
    const hit = ROUTES.find(r => r[0].test(path));
    if (!hit) { location.hash = '#/'; return; }
    setTab(hit[2]);
    view.innerHTML = '';
    hit[1].apply(null, path.match(hit[0]).slice(1));
    window.scrollTo(0, 0);
    renderHeader();
    showGuide();
  }
  window.addEventListener('hashchange', route);
  route();

  // 离线缓存：只在 https 或 localhost 下可用
  if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
})();
