/*
 * 小耳朵英语 · 页面与活动
 * ------------------------------------------------------------
 * 路由（hash）：
 *   #/                今天（今日路线）        #/today/<step>   路线中的某一步
 *   #/words           单词乐园主题            #/words/<theme>  主题单词
 *   #/word/<theme>/<i> 单词卡                 #/speak          跟我说   #/speak/<id>
 *   #/stories         故事屋 + 视频角          #/story/<id>     绘本     #/video/<i>
 *   #/games           游戏                    #/game/listen    #/game/move
 *   #/stickers        贴纸墙                  #/parent         家长中心
 *
 * 活动组件（runWords / runReview / runSpeak / runStory / runListen / runMove）
 * 在「今日路线」和各模块里复用，结束时回调 onDone(本次得到的星星数)。
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
  function fill(text) {
    const s = S.settings;
    return text.replace(/\{name\}/g, s.name || 'Tom').replace(/\{age\}/g, NUM_WORDS[s.age] || String(s.age));
  }

  // 自动朗读序列的「令牌」：新序列开始、点词、换页面都会让旧序列停下
  let autoToken = 0;
  function newAuto() { const t = ++autoToken; return () => t === autoToken; }
  function interrupt() { autoToken++; }

  // 页面切换时要清理的东西（录音、计时器等）
  let cleanups = [];
  function onCleanup(fn) { cleanups.push(fn); }

  // ================= 图标 =================
  const ICONS = {
    today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    words: '<rect x="3" y="3.5" width="18" height="17" rx="4"/><text x="12" y="16" text-anchor="middle" font-size="9.5" font-weight="800" font-family="system-ui, sans-serif" fill="currentColor" stroke="none">Aa</text>',
    speak: '<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13.2h5"/>',
    story: '<path d="M3 5.5c3-1.5 6-1.5 9 .7 3-2.2 6-2.2 9-.7V19c-3-1.4-6-1.4-9 .6-3-2-6-2-9-.6z"/><path d="M12 6.2v13.4"/>',
    game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.3" r=".9" fill="currentColor"/><circle cx="17.8" cy="13.7" r=".9" fill="currentColor"/>',
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
    again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'
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
    el.classList.add('reading');
    return SP.speak(el.dataset.text, {
      rate: opts.rate,
      onWord: idx => {
        let hit = null;
        ws.forEach(w => { if (+w.dataset.i <= idx) hit = w; });
        clear();
        if (hit) hit.classList.add('on');
      }
    }).then(ok => {
      clear();
      el.classList.remove('reading');
      return ok;
    });
  }

  function starsHTML(n) {
    return `<span class="stars" role="img" aria-label="${n} 颗星">${[1, 2, 3].map(k => icon('star', k <= n ? 'got' : '')).join('')}</span>`;
  }
  function dots(n, cur) {
    return Array.from({ length: n }, (_, k) => `<i class="${k < cur ? 'on' : k === cur ? 'cur' : ''}"></i>`).join('');
  }
  function meterHTML(p) {
    const a = p.mastered / p.total * 100;
    const b = (p.learned - p.mastered) / p.total * 100;
    return `<span class="meter" role="img" aria-label="已掌握 ${p.mastered}，认识 ${p.learned}，共 ${p.total}">` +
      (a ? `<i class="m1" style="width:${a}%"></i>` : '') + (b ? `<i class="m2" style="width:${b}%"></i>` : '') + '</span>';
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

  // ================= 录音跟读组件 =================
  let micUnavailable = false;

  /* 在 el 里放一个话筒按钮；孩子说完后自动打星（浏览器支持识别时），否则请家长打星。
     onEarn(新增星星数, 本次星级) */
  function recWidget(el, target, onEarn) {
    let ctrl = null, mine = null, awarded = 0;
    el.innerHTML = `
      <div class="rec">
        <button class="mic" type="button" aria-label="点一下开始说">${icon('mic')}</button>
        <div class="rec-side">
          <p class="rec-status"></p>
          <div class="row res" hidden><span class="stars-slot"></span><button class="btn btn-soft play-mine" type="button" hidden>${icon('play')} 听我的</button></div>
          <div class="rate" hidden>
            <button class="btn btn-soft" type="button" data-s="1">再练练</button>
            <button class="btn btn-soft" type="button" data-s="2">不错</button>
            <button class="btn" type="button" data-s="3">太棒了</button>
          </div>
        </div>
      </div>`;
    const mic = $('.mic', el), status = $('.rec-status', el), res = $('.res', el), rate = $('.rate', el), playMine = $('.play-mine', el);
    status.textContent = micUnavailable ? '大声说出来，说完点话筒' : '点话筒，大声跟着说';

    function result(stars) {
      rate.hidden = true;
      res.hidden = false;
      $('.stars-slot', el).innerHTML = starsHTML(stars);
      const words = SP.praise(stars);
      status.textContent = words + (stars < 3 ? ' 再听一遍，试试拿 3 颗星' : '');
      const add = Math.max(0, stars - awarded);
      awarded = Math.max(awarded, stars);
      if (add) S.addStars(add);
      if (onEarn) onEarn(add, stars);
      SP.speak(words);
    }
    function askParent(msg) {
      status.textContent = msg;
      $('.stars-slot', el).innerHTML = '';
      res.hidden = !mine;
      rate.hidden = false;
    }
    rate.onclick = e => {
      const b = e.target.closest('[data-s]');
      if (b) result(+b.dataset.s);
    };
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
      if (micUnavailable) { askParent('请爸爸妈妈听一听，给个分：'); return; }
      mic.classList.add('recording');
      mic.innerHTML = icon('stop');
      mic.setAttribute('aria-label', '说完了，点一下停止');
      status.textContent = '我在听……说完再点一下';
      res.hidden = true;
      rate.hidden = true;
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
      }
      const stars = SP.score(target, r.transcripts);
      if (stars) { result(stars); return; }
      if (r.error === 'denied' || r.error === 'no-mic' || r.error === 'unsupported') {
        micUnavailable = true;
        askParent('话筒用不了。请大声说出来，爸爸妈妈来打分：');
      } else {
        askParent(mine ? '听听自己的录音，请爸爸妈妈打分：' : '请爸爸妈妈听一听，给个分：');
      }
    };
    onCleanup(() => {
      if (ctrl) ctrl.stop();
      if (mine) URL.revokeObjectURL(mine);
    });
  }

  // ================= 活动：单词卡 =================
  function runWords(stage, ids, onDone, opts) {
    opts = opts || {};
    let i = opts.start || 0;
    let earned = 0;

    async function intro(w) {
      const alive = newAuto();
      await wait(250); if (!alive()) return;
      await SP.speak(w.en); if (!alive()) return;
      await wait(500); if (!alive()) return;
      await SP.speak(w.en, { rate: 0.75 }); if (!alive()) return;
      await wait(600); if (!alive()) return;
      await readLine($('.example .say-line', stage));
    }

    function show() {
      const w = S.wordById[ids[i]];
      const last = i === ids.length - 1;
      S.markSeen(w.id);
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(ids.length, i)}</span><span class="mode-tag">${esc(opts.label || '认单词：听两遍，跟着说')}</span></div>
        <div class="stage-body">
          <div class="col-pic">
            <button class="pic-stage" type="button" data-act="word" aria-label="再听一遍">${picHTML(w, 'xl')}</button>
          </div>
          <div class="col-act">
            ${lineHTML(w.en, 'word')}
            ${S.settings.showChinese ? `<p class="zh-hint">${esc(w.zh)}</p>` : ''}
            <div class="row center">
              <button class="btn" type="button" data-act="word">${icon('speaker')} 听</button>
              <button class="btn btn-soft" type="button" data-act="slow"><span class="btn-emoji" aria-hidden="true">🐢</span> 慢速</button>
            </div>
            <div class="example">${lineHTML(w.say)}<button class="btn btn-soft btn-icon" type="button" data-act="sentence" aria-label="听例句">${icon('speaker')}</button></div>
            <div class="rec-slot"></div>
          </div>
        </div>
        <div class="stage-nav">
          ${i > 0 ? `<button class="btn btn-ghost" type="button" data-act="prev">${icon('prev')} 上一个</button>` : ''}
          <button class="btn" type="button" data-act="next">${last ? esc(opts.doneLabel || '完成') : '下一个'} ${icon(last ? 'check' : 'next')}</button>
        </div>`;
      recWidget($('.rec-slot', stage), w.en, add => { earned += add; });
      stage.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'word') { interrupt(); SP.speak(w.en); }
        else if (act === 'slow') { interrupt(); SP.speak(w.en, { rate: 0.6 }); }
        else if (act === 'sentence') { interrupt(); readLine($('.example .say-line', stage)); }
        else if (act === 'prev') { i -= 1; show(); }
        else if (act === 'next') { if (last) onDone(earned); else { i += 1; show(); } }
      };
      intro(w);
    }
    show();
  }

  // ================= 活动：复习热身（看图说词） =================
  function askFor(w) {
    return w.ask || S.themeById[w.theme].ask || "What's this?";
  }

  function runReview(stage, ids, onDone) {
    let i = 0, earned = 0;
    function show() {
      const w = S.wordById[ids[i]];
      const last = i === ids.length - 1;
      const ask = askFor(w);
      let hinted = false, graded = false;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(ids.length, i)}</span><span class="mode-tag">复习：看图，说出英文</span></div>
        <div class="stage-body">
          <div class="col-pic">
            <div class="pic-stage">${picHTML(w, 'xl')}</div>
            <div class="answer" hidden>${lineHTML(w.en, 'word')}${S.settings.showChinese ? `<p class="zh-hint">${esc(w.zh)}</p>` : ''}</div>
          </div>
          <div class="col-act">
            <div class="bubble"><span class="who">Question</span>${lineHTML(ask)}<button class="btn btn-soft btn-icon" type="button" data-act="ask" aria-label="再听问题">${icon('speaker')}</button></div>
            <button class="btn btn-soft" type="button" data-act="hint">${icon('bulb')} 想不起来？听答案</button>
            <div class="rec-slot"></div>
          </div>
        </div>
        <div class="stage-nav"><button class="btn" type="button" data-act="next">${last ? '完成' : '下一个'} ${icon(last ? 'check' : 'next')}</button></div>`;
      const reveal = () => { $('.answer', stage).hidden = false; $('[data-act="hint"]', stage).hidden = true; };
      recWidget($('.rec-slot', stage), w.en, (add, stars) => {
        earned += add;
        if (!graded) { graded = true; S.grade(w.id, stars >= 2 && !hinted); }
        reveal();
      });
      stage.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'ask') { interrupt(); readLine($('.bubble .say-line', stage)); }
        else if (b.dataset.act === 'hint') { hinted = true; reveal(); interrupt(); SP.speak(w.en); }
        else if (b.dataset.act === 'next') { if (last) onDone(earned); else { i += 1; show(); } }
      };
      const alive = newAuto();
      wait(300).then(() => { if (alive()) readLine($('.bubble .say-line', stage)); });
    }
    show();
  }

  // ================= 活动：跟我说（问答 / 跟读） =================
  function runSpeak(stage, items, onDone, opts) {
    opts = opts || {};
    let i = opts.start || 0, earned = 0;
    function show() {
      const it = items[i];
      const q = it.q ? fill(it.q) : '';
      const a = fill(it.a);
      const last = i === items.length - 1;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(items.length, i)}</span><span class="mode-tag">${q ? '问答：听问题，回答它' : '跟读：听一遍，跟着说'}</span></div>
        <div class="stage-body">
          <div class="col-pic"><div class="pic-stage">${picHTML(it, 'lg')}</div></div>
          <div class="col-act">
            ${q ? `<div class="bubble q"><span class="who">Question</span>${lineHTML(q)}<button class="btn btn-soft btn-icon" type="button" data-act="q" aria-label="再听问题">${icon('speaker')}</button></div>` : ''}
            <div class="bubble answer" ${q ? 'hidden' : ''}><span class="who">${q ? 'Answer' : 'Say it'}</span>${lineHTML(a, 'big')}<button class="btn btn-icon" type="button" data-act="a" aria-label="听一遍">${icon('speaker')}</button></div>
            ${q ? `<button class="btn btn-soft" type="button" data-act="hint">${icon('bulb')} 听听怎么回答</button>` : ''}
            <div class="rec-slot"></div>
          </div>
        </div>
        <div class="stage-nav">
          ${i > 0 ? `<button class="btn btn-ghost" type="button" data-act="prev">${icon('prev')} 上一句</button>` : ''}
          <button class="btn" type="button" data-act="next">${last ? esc(opts.doneLabel || '完成') : '下一句'} ${icon(last ? 'check' : 'next')}</button>
        </div>`;
      const reveal = () => {
        $('.bubble.answer', stage).hidden = false;
        const h = $('[data-act="hint"]', stage);
        if (h) h.hidden = true;
      };
      recWidget($('.rec-slot', stage), a, (add, stars) => {
        earned += add;
        S.practiseSentence(it.id, stars);
        reveal();
      });
      stage.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'q') { interrupt(); readLine($('.bubble.q .say-line', stage)); }
        else if (act === 'a') { interrupt(); readLine($('.bubble.answer .say-line', stage)); }
        else if (act === 'hint') { reveal(); interrupt(); readLine($('.bubble.answer .say-line', stage)); }
        else if (act === 'prev') { i -= 1; show(); }
        else if (act === 'next') { if (last) onDone(earned); else { i += 1; show(); } }
      };
      const alive = newAuto();
      wait(300).then(() => { if (alive()) readLine($(q ? '.bubble.q .say-line' : '.bubble.answer .say-line', stage)); });
    }
    show();
  }

  // ================= 活动：绘本 =================
  function runStory(stage, story, onDone) {
    let p = 0, autoplay = false, earned = 0;

    async function readPage() {
      const alive = newAuto();
      await wait(250); if (!alive()) return;
      await readLine($('.story-text', stage));
      if (!alive() || !autoplay) return;
      await wait(1200);
      if (!alive() || !autoplay) return;
      go(1);
    }
    function setAuto(on) {
      autoplay = on;
      const b = $('[data-act="auto"]', stage);
      if (!b) return;
      b.classList.toggle('toggle-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = `${icon(on ? 'pause' : 'play')} ${on ? '暂停' : '自动播放'}`;
    }
    function go(step) {
      const n = p + step;
      if (n < 0) return;
      if (n >= story.pages.length) { end(); return; }
      p = n;
      render();
    }
    function render() {
      const page = story.pages[p];
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(story.pages.length, p)}</span><span class="mode-tag" lang="en">${esc(story.title)}</span></div>
        <div class="scene tone-${story.tone}"><span class="pic">${page.scene}</span></div>
        ${lineHTML(page.text, 'big story-text')}
        <div class="story-controls">
          <button class="btn btn-ghost btn-icon" type="button" data-act="prev" aria-label="上一页" ${p === 0 ? 'disabled' : ''}>${icon('prev')}</button>
          <button class="btn" type="button" data-act="read">${icon('speaker')} 读给我听</button>
          <button class="btn btn-soft" type="button" data-act="auto" aria-pressed="false"></button>
          <button class="btn btn-ghost btn-icon" type="button" data-act="next" aria-label="下一页">${icon('next')}</button>
        </div>
        <div class="rec-slot"></div>`;
      setAuto(autoplay);
      recWidget($('.rec-slot', stage), page.text, add => { earned += add; });
      stage.onclick = e => {
        if (e.target.closest('.w, .rec')) { setAuto(false); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'prev') { setAuto(false); go(-1); }
        else if (act === 'next') go(1);
        else if (act === 'read') readPage();
        else if (act === 'auto') { setAuto(!autoplay); if (autoplay) readPage(); else { interrupt(); SP.stop(); } }
      };
      readPage();
    }
    function end() {
      interrupt();
      S.readStory(story.id);
      S.addStars(2);
      earned += 2;
      stage.onclick = null;
      stage.innerHTML = `
        <div class="done-panel">
          <span class="pic pic-xl" aria-hidden="true">${story.cover}</span>
          <h2 lang="en">The End</h2>
          <p class="muted">读完《${esc(story.title)}》，得到 2 颗星</p>
          <div class="row center">
            <button class="btn btn-soft" type="button" id="storyAgain">${icon('again')} 再读一遍</button>
            <button class="btn" type="button" id="storyDone">完成 ${icon('check')}</button>
          </div>
        </div>`;
      SP.speak('The end. Well done!');
      $('#storyAgain').onclick = () => { p = 0; setAuto(false); render(); };
      $('#storyDone').onclick = () => onDone(earned);
    }
    render();
  }

  // ================= 活动：听音选图 =================
  function distractors(w, n) {
    const ok = x => x.en !== w.en && x.pic !== w.pic;
    const same = shuffle(S.themeById[w.theme].words.filter(ok));
    const others = shuffle(Object.values(S.wordById).filter(x => x.theme !== w.theme && ok(x)));
    const out = [];
    same.concat(others).forEach(x => {
      if (out.length < n && !out.some(o => o.en === x.en || o.pic === x.pic)) out.push(x);
    });
    return out;
  }

  function runListen(stage, pool, rounds, onDone) {
    const targets = [];
    let bag = [];
    while (targets.length < rounds) {
      if (!bag.length) bag = shuffle(pool);
      const next = bag.pop();
      if (pool.length > 1 && next === targets[targets.length - 1]) { bag.unshift(next); continue; }
      targets.push(next);
    }
    let r = 0, correct = 0, earned = 0;

    function show() {
      const w = S.wordById[targets[r]];
      const options = shuffle([w].concat(distractors(w, 3)));
      let firstTry = true, locked = false;
      stage.innerHTML = `
        <div class="stage-top"><span class="dots">${dots(rounds, r)}</span><span class="mode-tag">听音选图：听到什么，点什么</span></div>
        <button class="btn btn-lg" type="button" data-act="listen">${icon('speaker')} 再听一遍</button>
        <div class="options">${options.map(o => `<button class="option" type="button" data-id="${esc(o.id)}" aria-label="选项">${picHTML(o, 'lg')}</button>`).join('')}</div>`;
      stage.onclick = e => {
        if (e.target.closest('[data-act="listen"]')) { interrupt(); SP.speak(w.en); return; }
        const b = e.target.closest('.option');
        if (!b || locked || b.disabled) return;
        if (b.dataset.id === w.id) {
          locked = true;
          b.classList.add('right');
          if (firstTry) { correct += 1; earned += 1; S.addStars(1); }
          if (S.wordState(w.id)) S.grade(w.id, firstTry);
          interrupt();
          SP.speak('Yes! ' + w.en + '!').then(() => wait(500)).then(() => {
            if (!stage.isConnected) return;
            r += 1;
            if (r < rounds) show(); else end();
          });
        } else {
          firstTry = false;
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
      stage.onclick = null;
      const stars = correct >= rounds - 1 ? 3 : correct >= rounds / 2 ? 2 : 1;
      stage.innerHTML = `
        <div class="done-panel">
          ${starsHTML(stars)}
          <h2>答对 ${correct} / ${rounds} 题</h2>
          <p class="muted">${stars === 3 ? '耳朵真灵！' : '多听几遍，下次会更好'}</p>
          <div class="row center">
            <button class="btn btn-soft" type="button" id="gameAgain">${icon('again')} 再玩一次</button>
            <button class="btn" type="button" id="gameDone">完成 ${icon('check')}</button>
          </div>
        </div>`;
      SP.speak(SP.praise(stars));
      $('#gameAgain').onclick = () => { r = 0; correct = 0; show(); };
      $('#gameDone').onclick = () => onDone(earned);
    }
    show();
  }

  // ================= 活动：动起来（TPR） =================
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
        else if (last) end();
        else { i += 1; show(); }
      };
      const alive = newAuto();
      wait(300).then(() => { if (alive()) readLine($('.say-line', stage)); });
    }
    function end() {
      S.addStars(3);
      stage.onclick = null;
      stage.innerHTML = `
        <div class="done-panel">
          <span class="badge">${icon('check')}</span>
          <h2 lang="en">Great moving!</h2>
          <p class="muted">做完 ${list.length} 个动作，得到 3 颗星</p>
          <div class="row center">
            <button class="btn btn-soft" type="button" id="moveAgain">${icon('again')} 再来一轮</button>
            <button class="btn" type="button" id="moveDone">完成 ${icon('check')}</button>
          </div>
        </div>`;
      SP.speak('Great moving!');
      $('#moveAgain').onclick = () => runMove(stage, onDone);
      $('#moveDone').onclick = () => onDone(3);
    }
    show();
  }

  // ================= 今日路线 =================
  const GREETING = { id: 'greet', pic: '👋', q: 'Hello, {name}! How are you today?', a: "I'm fine, thank you." };

  const STEPS = [
    { id: 'warmup', en: 'Warm-up', zh: '复习热身', mins: 2, mod: 'm-today', desc: p => p.review.length ? `复习 ${p.review.length} 个词` : '打个招呼' },
    { id: 'words', en: 'New Words', zh: '新单词', mins: 4, mod: 'm-words', desc: p => p.fresh.length ? `${p.fresh.length} 个新词` : '温习老朋友' },
    { id: 'speak', en: 'Say It', zh: '跟我说', mins: 4, mod: 'm-speak', desc: p => `${p.sentences.length} 个句型` },
    { id: 'story', en: 'Story Time', zh: '故事时间', mins: 4, mod: 'm-stories', desc: p => S.storyById[p.story].title },
    { id: 'game', en: 'Game', zh: '小游戏', mins: 3, mod: 'm-games', desc: () => '听音选图 6 题' }
  ];

  function gamePool(plan) {
    const ids = [];
    const add = id => { if (ids.indexOf(id) < 0) ids.push(id); };
    plan.fresh.concat(plan.review).forEach(add);
    const themes = S.selectedThemes();
    if (ids.length < 4) themes.forEach(t => S.themeById[t].words.forEach(w => { if (S.wordState(w.id)) add(w.id); }));
    if (ids.length < 4) themes.forEach(t => S.themeById[t].words.forEach(w => { if (ids.length < 6) add(w.id); }));
    return ids;
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

  function viewToday() {
    const s = S.settings;
    const plan = S.todayPlan();
    const d = S.day();
    const tot = S.totals();
    const next = STEPS.find(st => !d.steps[st.id]);
    const started = Object.keys(d.steps).length > 0;
    const hour = new Date().getHours();
    const greet = (hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + ', ' + s.name + '!';
    const firstTime = !Object.keys(S.state.words).length && !S.state.stars;
    const total = STEPS.reduce((n, st) => n + st.mins, 0);
    const now = new Date();
    const dateLabel = `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${'日一二三四五六'[now.getDay()]}`;
    const lastSticker = S.state.stickers[S.state.stickers.length - 1];

    view.innerHTML = `
      ${!SP.supported ? '<div class="notice">当前浏览器不支持英语朗读。请用 iPad 的 Safari，或电脑上的 Chrome / Edge 打开。</div>' : ''}
      ${firstTime ? '<div class="notice"><span>第一次使用？请家长先到 <a href="#/parent">家长中心</a> 填写孩子的英文名，并勾选机构 Power Up 当前单元对应的主题。</span></div>' : ''}
      <section class="card hero m-today">
        <div>
          <p class="eyebrow">${dateLabel}</p>
          <h1 lang="en"><button type="button" data-say="${esc(greet)}">${esc(greet)}</button></h1>
          <p class="lead">${next ? `今天的路线：${STEPS.length} 步，大约 ${total} 分钟` : '今天的路线全部完成啦！还想玩可以去听故事、做游戏。'}</p>
        </div>
        <span class="hero-pic pic" aria-hidden="true">${!next && lastSticker ? lastSticker : '🎧'}</span>
        <div class="hero-actions">
          ${next
            ? `<a class="btn btn-lg" href="#/today/${next.id}">${icon('play')} ${started ? '继续今天的学习' : '开始今天的学习'}</a>`
            : '<a class="btn btn-lg" href="#/stories">再听个故事</a><a class="btn btn-soft" href="#/stickers">看看我的贴纸</a>'}
        </div>
        <div class="stats">
          <div class="stat"><b>${S.streak()}</b><span>连续学习（天）</span></div>
          <div class="stat"><b>${S.state.stars}</b><span>星星</span></div>
          <div class="stat"><b>${tot.learned}</b><span>认识的单词</span></div>
        </div>
      </section>
      <section class="grid">
        <div class="section-head"><h2>今日路线</h2><p>按顺序做最好，也可以点任意一步</p></div>
        <div class="route">${STEPS.map((st, i) => {
          const done = !!d.steps[st.id];
          return `<a class="step ${st.mod} ${done ? 'done' : ''} ${next && next.id === st.id ? 'next' : ''}" href="#/today/${st.id}">
            <span class="num">${done ? icon('check') : i + 1}</span>
            <h3 lang="en">${st.en}</h3>
            <span class="zh">${st.zh}</span>
            <span class="meta">${esc(st.desc(plan))} · ${st.mins} 分钟</span>
          </a>`;
        }).join('')}</div>
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
        hero.insertAdjacentHTML('beforebegin', '<div class="notice"><span>这台设备没有找到英语发音，点读可能没有声音或带中文口音。请家长到 <a href="#/parent">家长中心 → 设备检查</a> 看一看。</span></div>');
      });
    }
  }

  function viewStep(stepId) {
    const idx = STEPS.findIndex(s => s.id === stepId);
    if (idx < 0) { location.hash = '#/'; return; }
    const st = STEPS[idx];
    const plan = S.todayPlan();
    view.className = st.mod;
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/" aria-label="回到今天">${icon('back')}</a>
        <div><p class="eyebrow">今日路线 · 第 ${idx + 1} 步 / 共 ${STEPS.length} 步</p><h1><span lang="en">${st.en}</span> <span class="sub">${st.zh}</span></h1></div>
      </div>
      <section class="card stage" id="stage"></section>`;
    const stage = $('#stage');
    const finish = earned => stepDone(stage, st, earned);

    if (stepId === 'warmup') {
      if (plan.review.length) runReview(stage, plan.review, finish);
      else runSpeak(stage, [GREETING], finish, { doneLabel: '完成热身' });
    } else if (stepId === 'words') {
      let ids = plan.fresh;
      let label = '认单词：听两遍，跟着说';
      if (!ids.length) {
        ids = shuffle(Object.keys(S.state.words).filter(id => S.wordById[id])).slice(0, 3);
        label = '新词都学完啦，温习几个老朋友';
      }
      if (!ids.length) ids = S.themeById[S.selectedThemes()[0]].words.slice(0, 3).map(w => w.id);
      runWords(stage, ids, finish, { label });
    } else if (stepId === 'speak') {
      runSpeak(stage, plan.sentences.map(id => S.sentenceById[id]), finish);
    } else if (stepId === 'story') {
      runStory(stage, S.storyById[plan.story], finish);
    } else if (stepId === 'game') {
      runListen(stage, gamePool(plan), 6, finish);
    }
  }

  function stepDone(stage, st, earned) {
    S.completeStep(st.id);
    const d = S.day();
    const next = STEPS.find(s => !d.steps[s.id]);
    stage.onclick = null;
    stage.innerHTML = `
      <div class="done-panel">
        <span class="badge">${icon('check')}</span>
        <h2>${st.zh}完成！</h2>
        ${earned ? `<p class="muted">这一步得到 ${earned} 颗星</p>` : ''}
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

  // ================= 单词乐园 =================
  function viewThemes() {
    const sel = S.settings.themes;
    view.innerHTML = `
      <div class="page-title"><h1>单词乐园 <span class="sub" lang="en">Word Park</span></h1></div>
      <p class="muted">点主题进去，点图片就能听发音。标着「学习中」的是家长选的当前主题。</p>
      <div class="themes">${D.themes.map(t => {
        const p = S.themeProgress(t.id);
        return `<a class="theme" href="#/words/${t.id}">
          ${sel.indexOf(t.id) >= 0 ? '<span class="cur">学习中</span>' : ''}
          ${picHTML({ pic: t.pic }, 'md')}
          <h3 lang="en">${esc(t.en)}</h3>
          <span class="zh">${esc(t.zh)} · ${p.learned}/${p.total}</span>
          ${meterHTML(p)}
        </a>`;
      }).join('')}</div>`;
  }

  function viewThemeWords(themeId) {
    const t = S.themeById[themeId];
    if (!t) { location.hash = '#/words'; return; }
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/words" aria-label="返回单词乐园">${icon('back')}</a>
        <h1><span lang="en">${esc(t.en)}</span> <span class="sub">${esc(t.zh)}</span></h1>
      </div>
      <div class="row">
        <a class="btn" href="#/word/${t.id}/0">${icon('play')} 一张一张学</a>
        <button class="btn btn-soft" type="button" id="playAll">${icon('speaker')} 全部听一遍</button>
      </div>
      <div class="words-grid">${t.words.map((w, i) => {
        const st = S.wordState(w.id);
        const box = st ? st.box : 0;
        return `<a class="word-tile" href="#/word/${t.id}/${i}" data-id="${esc(w.id)}">
          <span class="lvl" title="${st ? (box >= S.MASTERED ? '已掌握' : '学习中') : '还没学'}">${[1, 3, S.MASTERED].map(k => `<i class="${box >= k ? 'on' : ''}"></i>`).join('')}</span>
          ${picHTML(w, 'md')}
          <b lang="en">${esc(w.en)}</b>
          ${S.settings.showChinese ? `<span class="zh">${esc(w.zh)}</span>` : ''}
        </a>`;
      }).join('')}</div>`;
    $('#playAll').onclick = async () => {
      const alive = newAuto();
      for (const tile of $$('.word-tile', view)) {
        if (!alive()) break;
        tile.classList.add('playing');
        tile.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await SP.speak(S.wordById[tile.dataset.id].en);
        tile.classList.remove('playing');
        await wait(450);
      }
    };
  }

  function viewWord(themeId, idx) {
    const t = S.themeById[themeId];
    if (!t || !t.words[+idx]) { location.hash = '#/words'; return; }
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/words/${t.id}" aria-label="返回主题">${icon('back')}</a>
        <h1><span lang="en">${esc(t.en)}</span> <span class="sub">单词卡</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    runWords($('#stage'), t.words.map(w => w.id), () => { location.hash = '#/words/' + t.id; },
      { start: +idx, label: t.en + ' · ' + t.zh, doneLabel: '学完这个主题' });
  }

  // ================= 跟我说 =================
  let speakFilter = 'current';
  let speakQueue = [];

  function viewSpeakList() {
    const themes = S.selectedThemes();
    const items = D.sentences.filter(s => speakFilter === 'all' || (speakFilter === 'current' ? themes.indexOf(s.theme) >= 0 : s.theme === speakFilter));
    speakQueue = items.map(s => s.id);
    const chip = (id, label) => `<button class="filter" type="button" data-f="${id}" aria-pressed="${speakFilter === id}">${esc(label)}</button>`;
    view.innerHTML = `
      <div class="page-title"><h1>跟我说 <span class="sub" lang="en">Let's Talk</span></h1></div>
      <p class="muted">有问题的是「问答」：App 先问，孩子来回答；其余是「跟读」。说完会得到星星。</p>
      <div class="filters">${chip('current', '学习中的主题')}${chip('all', '全部')}${D.themes.map(t => chip(t.id, t.zh)).join('')}</div>
      ${items.length ? `<div><a class="btn" href="#/speak/${items[0].id}">${icon('play')} 从第一句开始练</a></div>` : ''}
      <div class="sentence-list">${items.map(s => {
        const rec = S.state.sentences[s.id];
        return `<a class="sentence-item" href="#/speak/${s.id}">
          ${picHTML(s, 'sm')}
          ${s.q ? `<span class="q" lang="en">${esc(fill(s.q))}</span>` : '<span class="q">跟读</span>'}
          <span class="a" lang="en">${esc(fill(s.a))}</span>
          ${rec ? starsHTML(rec.best) : '<span class="muted">还没练过</span>'}
        </a>`;
      }).join('') || '<p class="muted">这个主题还没有句型。</p>'}</div>`;
    $('.filters', view).onclick = e => {
      const b = e.target.closest('[data-f]');
      if (b) { speakFilter = b.dataset.f; viewSpeakList(); }
    };
  }

  function viewSpeakOne(id) {
    if (!S.sentenceById[id]) { location.hash = '#/speak'; return; }
    const queue = speakQueue.indexOf(id) >= 0 ? speakQueue : [id];
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/speak" aria-label="返回句型列表">${icon('back')}</a>
        <h1>跟我说 <span class="sub" lang="en">Let's Talk</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    runSpeak($('#stage'), queue.map(x => S.sentenceById[x]), () => { location.hash = '#/speak'; }, { start: queue.indexOf(id) });
  }

  // ================= 故事屋 + 视频角 =================
  function parseVideo(url) {
    const bv = String(url).match(/BV[0-9A-Za-z]{10}/);
    if (bv) return { kind: 'bilibili', id: bv[0] };
    if (/^https?:\/\/\S+\.(mp4|webm|m4v)(\?\S*)?$/i.test(url)) return { kind: 'file', src: url };
    return null;
  }
  function biliSearch(q) { return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(q); }

  function viewStories() {
    const mine = S.state.videos;
    view.innerHTML = `
      <div class="page-title"><h1>故事屋 <span class="sub" lang="en">Story House</span></h1></div>
      <p class="muted">每本 6 页。会一边读一边把读到的词点亮，点任何一个词还能单独听。</p>
      <div class="story-grid">${D.stories.map(st => {
        const n = (S.state.stories[st.id] || { n: 0 }).n;
        return `<a class="story-cover" href="#/story/${st.id}">
          <span class="art tone-${st.tone}">${picHTML({ pic: st.cover }, 'lg')}</span>
          <h3 lang="en">${esc(st.title)}</h3>
          <span class="meta">${esc(st.zh)} · ${n ? `读过 ${n} 次` : '还没读过'}</span>
        </a>`;
      }).join('')}</div>

      <section class="grid">
        <div class="section-head"><h2>视频角 <span class="muted" lang="en">Video Corner</span></h2><p>建议周末或固定时间看，一次 10 分钟以内</p></div>
        <div class="card grid">
          <h3>怎么看效果最好</h3>
          <ol class="tips">
            <li>同一集反复看一周。第一遍可以用中文讲讲情节，之后只放英文。</li>
            <li>每集挑 2–3 句常用的话，和孩子角色扮演，比如 <span lang="en">“Do you like cake?”</span></li>
            <li>平时把这一集的声音当背景音放，磨耳朵。</li>
          </ol>
        </div>
        ${mine.length ? `<h3>我的视频</h3><div class="video-list">${mine.map((v, i) => `
          <a class="video-card" href="#/video/${i}">
            <h3>${icon('play')} ${esc(v.title)}</h3>
            <p>${parseVideo(v.url) && parseVideo(v.url).kind === 'bilibili' ? 'B 站视频' : '视频文件'}</p>
          </a>`).join('')}</div>` : ''}
        <h3>推荐片单 <span class="muted">（以英音、慢语速为主）</span></h3>
        <div class="video-list">${D.videos.map(v => `
          <div class="video-card">
            <h3 lang="en">${esc(v.title)} <span class="muted">${esc(v.zh)}</span></h3>
            <div class="tags"><span class="tag">${esc(v.accent)}</span><span class="tag">${esc(v.level)}</span><span class="tag">${esc(v.mins)}</span></div>
            <p>${esc(v.why)}</p>
            <a class="link" href="${biliSearch(v.q)}" target="_blank" rel="noopener">在 B 站搜索 ${icon('external')}</a>
          </div>`).join('')}</div>
        <p class="muted">找到合适的正版视频后，家长可以在 <a href="#/parent">家长中心 → 视频管理</a> 把链接加进「我的视频」，孩子在这里直接看。</p>
      </section>`;
  }

  function viewStory(id) {
    const story = S.storyById[id];
    if (!story) { location.hash = '#/stories'; return; }
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/stories" aria-label="返回故事屋">${icon('back')}</a>
        <h1><span lang="en">${esc(story.title)}</span> <span class="sub">${esc(story.zh)}</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    runStory($('#stage'), story, () => { location.hash = '#/stories'; });
  }

  let keepAlive = false;
  function viewVideo(i) {
    const v = S.state.videos[+i];
    const src = v && parseVideo(v.url);
    if (!src) { location.hash = '#/stories'; return; }
    keepAlive = true;
    onCleanup(() => { keepAlive = false; });
    const player = src.kind === 'bilibili'
      ? `<iframe class="player" src="https://player.bilibili.com/player.html?bvid=${src.id}&autoplay=0&danmaku=0&high_quality=1" allow="fullscreen; picture-in-picture" allowfullscreen title="${esc(v.title)}"></iframe>`
      : `<video class="player" src="${esc(src.src)}" controls playsinline></video>`;
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/stories" aria-label="返回故事屋">${icon('back')}</a>
        <h1>${esc(v.title)}</h1>
      </div>
      ${player}
      <div class="card grid">
        <h3>看完说一说</h3>
        ${lineHTML('What can you see?', 'big')}
        <p class="muted">看完问问孩子，让他用学过的词说一说：<span lang="en">I can see a pig. It's pink.</span></p>
      </div>`;
  }

  // ================= 游戏 =================
  function viewGames() {
    view.innerHTML = `
      <div class="page-title"><h1>游戏 <span class="sub" lang="en">Games</span></h1></div>
      <div class="game-cards">
        <a class="game-card m-games" href="#/game/listen">
          <span class="art">${picHTML({ pic: '👂🐱🐶' }, 'lg')}</span>
          <h3>听音选图 <span class="muted" lang="en">Listen &amp; Tap</span></h3>
          <p>听到单词，点对应的图片。用学过的单词出题，答对的词会更晚才再出现。</p>
        </a>
        <a class="game-card m-speak" href="#/game/move">
          <span class="art">${picHTML({ pic: '🙆👏🦘' }, 'lg')}</span>
          <h3>动起来 <span class="muted" lang="en">Do It!</span></h3>
          <p>听指令做动作：<span lang="en">Touch your nose! Jump!</span> 适合学累了起来活动一下。</p>
        </a>
      </div>`;
  }

  function viewListenGame() {
    const seen = Object.keys(S.state.words).filter(id => S.wordById[id]);
    let pool = seen.length >= 4 ? seen : [];
    if (!pool.length) S.selectedThemes().forEach(t => S.themeById[t].words.forEach(w => pool.push(w.id)));
    view.className = 'm-games';
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/games" aria-label="返回游戏">${icon('back')}</a>
        <h1>听音选图 <span class="sub" lang="en">Listen &amp; Tap</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    runListen($('#stage'), pool, 8, () => { location.hash = '#/games'; });
  }

  function viewMoveGame() {
    view.className = 'm-speak';
    view.innerHTML = `
      <div class="page-title">
        <a class="back" href="#/games" aria-label="返回游戏">${icon('back')}</a>
        <h1>动起来 <span class="sub" lang="en">Do It!</span></h1>
      </div>
      <section class="card stage" id="stage"></section>`;
    runMove($('#stage'), () => { location.hash = '#/games'; });
  }

  // ================= 贴纸墙 =================
  function viewStickers() {
    const got = S.state.stickers;
    view.innerHTML = `
      <div class="page-title"><h1>贴纸墙 <span class="sub" lang="en">My Stickers</span></h1></div>
      <p class="muted">每完成一天的路线，就能得到一张新贴纸。已经收集 ${got.length} / ${D.stickers.length} 张，攒了 ${S.state.stars} 颗星星。</p>
      <div class="sticker-wall">${D.stickers.map((s, i) => i < got.length
        ? `<span class="sticker" role="img" aria-label="贴纸 ${i + 1}">${s}</span>`
        : `<span class="sticker locked" aria-label="还没解锁">?</span>`).join('')}</div>`;
  }

  // ================= 家长中心 =================
  let parentUnlocked = false;
  let parentTab = 'report';

  function viewParent() {
    if (!parentUnlocked) { parentGate(); return; }
    const tab = (id, label) => `<button class="filter" type="button" data-t="${id}" aria-pressed="${parentTab === id}">${label}</button>`;
    view.innerHTML = `
      <div class="page-title"><h1>家长中心</h1><span class="sub">孩子的学习情况和设置</span></div>
      <div class="parent-tabs filters">${tab('report', '学习报告')}${tab('settings', '学习设置')}${tab('videos', '视频管理')}${tab('device', '设备检查')}</div>
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
          ${row('ckAsr', '自动打星（语音识别）')}
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
        set('ckVoice', 'warn', '这个浏览器不支持朗读。请换用平板自带的浏览器（华为浏览器）打开。');
      } else if (!st.count) {
        set('ckVoice', 'warn', `没有找到英语发音人（本机共有 ${st.total} 个发音人）。孩子点读时可能没声音，或用中文口音读英文。可以到平板「设置 → 辅助功能」里找「文字转语音输出」，选择或下载英语语音后再回来试听。`,
          `<button class="btn btn-soft" type="button" data-ck="voice">${icon('speaker')} 试听</button>`);
      } else {
        set('ckVoice', 'ok', `找到 ${st.count} 个英语发音人，正在使用：${st.voice ? st.voice.name + '（' + st.voice.lang + '）' : '系统默认'}。点「试听」，听听是不是标准、清楚的英语。不满意可以到「学习设置」换发音人。`,
          `<button class="btn btn-soft" type="button" data-ck="voice">${icon('speaker')} 试听</button>`);
      }
    });

    if (!window.isSecureContext) {
      set('ckMic', 'warn', '当前地址不是 https，浏览器不允许用话筒。请用 https 开头的网址打开（比如 GitHub Pages 地址）。');
    } else if (!SP.canRecord) {
      set('ckMic', 'info', '这个浏览器不能录音。跟读时孩子大声说出来，由家长打星，不影响使用。');
    } else {
      set('ckMic', 'info', '点下面的按钮，对着平板说一句话（3 秒），听听能不能录上。第一次会弹出「允许使用麦克风」，请点允许。',
        `<button class="btn btn-soft" type="button" data-ck="mic">${icon('mic')} 测试录音</button>`);
    }

    set('ckAsr', 'info', SP.canRecognize
      ? '浏览器有语音识别功能，但在国内常常连不上识别服务。录音测试或跟读时如果自动给了星，就说明能用；否则会由家长打星，不影响使用。'
      : '这个浏览器没有语音识别，跟读时由家长听完打星，不影响使用。');

    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      set('ckOffline', 'warn', '当前打开方式不支持离线缓存。用 https 网址打开后，断网也能用。');
    } else {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.active) set('ckOffline', 'ok', '网站已经存到这台平板上，断网或网络慢时也能直接打开。');
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
      ? '进度保存在这台平板的浏览器里。不要在浏览器设置里「清除数据/缓存」，也不要用无痕模式，否则星星和单词记录会丢失。'
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
          if (r.url) {
            set('ckMic', 'ok', '录音正常，正在回放刚才的声音。' + (SP.score('hello', r.transcripts) ? '（语音识别也能用）' : ''),
              `<button class="btn btn-soft" type="button" data-ck="mic">${icon('again')} 再测一次</button>`);
            new Audio(r.url).play().catch(() => {});
          } else if (r.error === 'denied') {
            set('ckMic', 'warn', '话筒权限被拒绝。请在浏览器的网站设置里允许麦克风；如果还不行，到平板「设置 → 应用和服务 → 权限管理」里允许浏览器使用麦克风。',
              `<button class="btn btn-soft" type="button" data-ck="mic">${icon('again')} 再测一次</button>`);
          } else {
            set('ckMic', 'warn', '没有录到声音。请检查话筒权限后再试；实在不行，跟读时由家长打星。',
              `<button class="btn btn-soft" type="button" data-ck="mic">${icon('again')} 再测一次</button>`);
          }
        });
      }
    };
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
    const practise = Object.keys(st.words)
      .filter(id => S.wordById[id] && st.words[id].wrong > 0 && st.words[id].box <= 2)
      .sort((a, b) => st.words[b].wrong - st.words[a].wrong)
      .slice(0, 12);

    body.innerHTML = `
      <div class="kpis">
        <div class="kpi"><b>${S.streak()}</b><span>连续学习（天）</span></div>
        <div class="kpi"><b>${Math.round((S.day().secs) / 60)}</b><span>今天（分钟）</span></div>
        <div class="kpi"><b>${mins.reduce((a, b) => a + b, 0)}</b><span>最近 7 天（分钟）</span></div>
        <div class="kpi"><b>${st.stars}</b><span>累计星星</span></div>
        <div class="kpi"><b>${tot.learned}</b><span>认识的单词</span></div>
        <div class="kpi"><b>${tot.mastered}</b><span>已掌握的单词</span></div>
      </div>

      <section class="card grid">
        <div class="section-head"><h2>最近 7 天学习时长（分钟）</h2><p>虚线是每日目标</p></div>
        <div style="padding-top:34px">
          <div class="chart" role="img" aria-label="最近 7 天每日学习分钟数：${keys.map((k, i) => label(k) + ' ' + mins[i] + ' 分钟').join('，')}">
            <div class="goal" style="bottom:${goal / top * 100}%"><span>目标 ${goal}</span></div>
            ${keys.map((k, i) => {
              const h = mins[i] / top * 100;
              const done = st.days[k] && st.days[k].done;
              return `<button class="col ${k === t ? 'today' : ''}" type="button" style="--h:${h}%">
                <span class="bar" style="height:${h}%"></span>
                ${k === t ? `<span class="val">${mins[i]}</span>` : ''}
                <span class="tip">${label(k)} 周${weekdays[i]}：${mins[i]} 分钟${done ? ' · 完成路线' : ''}</span>
              </button>`;
            }).join('')}
          </div>
          <div class="chart-x">${keys.map((k, i) => `<span>${k === t ? '今天' : '周' + weekdays[i]}</span>`).join('')}</div>
        </div>
        <details>
          <summary>查看数据表</summary>
          <div class="table-wrap"><table>
            <thead><tr><th>日期</th><th>分钟</th><th>星星</th><th>完成路线</th></tr></thead>
            <tbody>${keys.map((k, i) => `<tr><td>${label(k)} 周${weekdays[i]}</td><td>${mins[i]}</td><td>${(st.days[k] || {}).stars || 0}</td><td>${st.days[k] && st.days[k].done ? '是' : '—'}</td></tr>`).join('')}</tbody>
          </table></div>
        </details>
      </section>

      <section class="card grid">
        <div class="section-head"><h2>各主题词汇</h2>
          <div class="legend"><span><i style="background:var(--sky)"></i>已掌握（复习 4 轮以上）</span><span><i style="background:color-mix(in srgb, var(--sky) 40%, var(--track))"></i>学习中</span></div>
        </div>
        <div class="theme-rows">${D.themes.map(th => {
          const p = S.themeProgress(th.id);
          return `<div class="theme-row"><span class="name">${esc(th.zh)} <span class="muted" lang="en">${esc(th.en)}</span></span>${meterHTML(p)}<span class="nums">掌握 ${p.mastered} · 认识 ${p.learned} / ${p.total}</span></div>`;
        }).join('')}</div>
      </section>

      <section class="card grid">
        <div class="section-head"><h2>需要多练的词</h2><p>答错过、还没巩固的词，点一下听发音</p></div>
        ${practise.length
          ? `<div class="word-chips">${practise.map(id => `<button class="word-chip" type="button" lang="en" data-say="${esc(S.wordById[id].en)}">${esc(S.wordById[id].en)}</button>`).join('')}</div>`
          : '<p class="muted">暂时没有。孩子在复习和游戏里答错的词会出现在这里。</p>'}
      </section>`;
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
          <input id="setName" class="input" value="${esc(s.name)}" maxlength="20" autocomplete="off">
          <span class="help">会出现在句子里，比如 <span lang="en">“My name is ${esc(s.name)}.”</span></span>
        </div>
        <div class="field">
          <label for="setAge">年龄</label>
          <select id="setAge" class="input">${[5, 6, 7, 8, 9].map(a => `<option value="${a}" ${s.age === a ? 'selected' : ''}>${a} 岁（${NUM_WORDS[a]}）</option>`).join('')}</select>
        </div>
        <div class="field"><span class="label">每天学习时长</span>${seg('dailyMinutes', [[10, '10 分钟'], [15, '15 分钟'], [20, '20 分钟']])}
          <span class="help">到时间会提醒休息眼睛</span></div>
        <div class="field"><span class="label">每天新单词</span>${seg('newPerDay', [[3, '3 个'], [5, '5 个'], [8, '8 个']])}
          <span class="help">零基础建议 3–5 个，宁少勿多</span></div>
        <div class="field">
          <span class="label">当前学习主题</span>
          <span class="help">勾选机构 Power Up 当前单元对应的主题，每天的新词和句型从这里出</span>
          <div class="row" id="setThemes">${D.themes.map(t => `<button class="check-chip" type="button" data-theme="${t.id}" aria-pressed="${s.themes.indexOf(t.id) >= 0}"><span class="pic" aria-hidden="true">${t.pic}</span>${esc(t.zh)}</button>`).join('')}</div>
        </div>
        <div class="field"><span class="label">发音</span>${seg('accent', [['en-GB', '英音 en-GB'], ['en-US', '美音 en-US']])}
          <span class="help">剑桥教材以英式英语为主，建议选英音</span></div>
        <div class="field">
          <label for="setVoice">发音人</label>
          <div class="row">
            <select id="setVoice" class="input"><option value="">自动选择</option>${voices.map(v => `<option value="${esc(v.voiceURI)}" ${s.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)}（${esc(v.lang)}）</option>`).join('')}</select>
            <button class="btn btn-soft" type="button" id="testVoice">${icon('speaker')} 试听</button>
          </div>
          <span class="help">${voices.length ? `本设备有 ${voices.length} 个可用的发音人。iPad 推荐 Daniel（英音）。` : '还没读到本设备的发音人，点一下「试听」再回来看看。'}</span>
        </div>
        <div class="field">
          <label for="setRate">语速：<b id="rateVal">${s.rate.toFixed(2)}</b></label>
          <input id="setRate" type="range" min="0.6" max="1.1" step="0.05" value="${s.rate}">
          <span class="help">零基础建议 0.8 左右，熟悉后慢慢调到 1.0</span>
        </div>
        <div class="field"><span class="label">中文提示</span>${seg('showChinese', [[true, '显示'], [false, '不显示']])}
          <span class="help">孩子熟悉后可以关掉，让他直接把图片和英文联系起来</span></div>
        <div class="field danger">
          <span class="label">重置</span>
          <div><button class="btn btn-ghost" type="button" id="resetAll">${icon('trash')} 清空所有学习记录</button></div>
        </div>
      </section>`;

    const changed = (msg, replan) => {
      S.save();
      if (replan) S.resetTodayPlan();
      toast(msg || '已保存');
    };
    $('#setName').onchange = e => { s.name = e.target.value.trim() || 'Tom'; changed(); };
    $('#setAge').onchange = e => { s.age = +e.target.value; changed(); };
    $$('.seg', body).forEach(g => {
      g.onclick = e => {
        const b = e.target.closest('[data-val]');
        if (!b) return;
        const key = g.dataset.key;
        s[key] = JSON.parse(b.dataset.val);
        if (key === 'accent') s.voiceURI = '';
        changed(key === 'newPerDay' && Object.keys(S.day().steps).length ? '已保存，明天开始生效' : '已保存', key === 'newPerDay');
        parentSettings(body);
      };
    });
    $('#setThemes').onclick = e => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      const id = b.dataset.theme;
      const i = s.themes.indexOf(id);
      if (i >= 0) {
        if (s.themes.length === 1) { toast('至少要选一个主题'); return; }
        s.themes.splice(i, 1);
      } else {
        s.themes.push(id);
      }
      b.setAttribute('aria-pressed', String(i < 0));
      changed(Object.keys(S.day().steps).length ? '已保存，明天的路线会用新主题' : '已保存，今天的路线已更新', true);
    };
    $('#setVoice').onchange = e => { s.voiceURI = e.target.value; changed(); };
    $('#testVoice').onclick = () => SP.speak(`Hello, ${s.name}! Let's learn English together.`);
    $('#setRate').oninput = e => { s.rate = +e.target.value; $('#rateVal').textContent = s.rate.toFixed(2); };
    $('#setRate').onchange = () => { changed(); SP.speak('This is my speed.'); };
    let armed = false;
    $('#resetAll').onclick = e => {
      if (!armed) {
        armed = true;
        e.currentTarget.innerHTML = `${icon('trash')} 再点一次，确认清空`;
        setTimeout(() => {
          armed = false;
          const b = $('#resetAll');
          if (b) b.innerHTML = `${icon('trash')} 清空所有学习记录`;
        }, 4000);
        return;
      }
      S.reset();
      renderHeader();
      toast('已清空所有学习记录');
      parentSettings(body);
    };
  }

  function parentVideos(body) {
    const list = S.state.videos;
    body.innerHTML = `
      <section class="card grid">
        <h2>添加视频</h2>
        <form id="addVideo" class="form">
          <div class="field">
            <label for="vTitle">视频名称</label>
            <input id="vTitle" class="input" placeholder="例如：Peppa Pig 第 1 集" maxlength="40" autocomplete="off">
          </div>
          <div class="field">
            <label for="vUrl">视频链接</label>
            <input id="vUrl" class="input" placeholder="B 站视频链接、BV 号，或 mp4 地址" autocomplete="off">
            <span class="help">在 B 站打开视频，复制浏览器地址栏里的链接粘贴到这里。请选择官方或正版授权的上传。</span>
          </div>
          <div><button class="btn" type="submit">添加到视频角</button></div>
        </form>
      </section>
      <section class="card grid">
        <h2>我的视频（${list.length}）</h2>
        ${list.length ? `<div class="grid">${list.map((v, i) => `
          <div class="video-row">
            <span><b>${esc(v.title)}</b> <span class="muted">${esc(v.url)}</span></span>
            <span class="row">
              <a class="btn btn-soft" href="#/video/${i}">${icon('play')} 播放</a>
              <button class="btn btn-ghost btn-icon" type="button" data-del="${i}" aria-label="删除">${icon('trash')}</button>
            </span>
          </div>`).join('')}</div>` : '<p class="muted">还没有添加视频。可以先到「故事屋 → 推荐片单」里点「在 B 站搜索」找视频。</p>'}
      </section>`;
    $('#addVideo').onsubmit = e => {
      e.preventDefault();
      const url = $('#vUrl').value.trim();
      const src = parseVideo(url);
      if (!src) { toast('没认出这个链接：请粘贴含 BV 号的 B 站链接，或 mp4 地址'); return; }
      list.push({ title: $('#vTitle').value.trim() || (src.kind === 'bilibili' ? 'B 站视频 ' + src.id : '视频'), url });
      S.save();
      toast('已添加到视频角');
      parentVideos(body);
    };
    body.onclick = e => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      list.splice(+b.dataset.del, 1);
      S.save();
      parentVideos(body);
    };
  }

  // ================= 顶栏、导航、计时 =================
  const TABS = [
    { id: 'today', href: '#/', zh: '今天', en: 'Today', icon: 'today', mod: 'm-today' },
    { id: 'words', href: '#/words', zh: '单词', en: 'Words', icon: 'words', mod: 'm-words' },
    { id: 'speak', href: '#/speak', zh: '跟我说', en: 'Speak', icon: 'speak', mod: 'm-speak' },
    { id: 'stories', href: '#/stories', zh: '故事', en: 'Stories', icon: 'story', mod: 'm-stories' },
    { id: 'games', href: '#/games', zh: '游戏', en: 'Games', icon: 'game', mod: 'm-games' }
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
    view.className = t ? t.mod : 'm-words';
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

  // 学习计时：页面可见、且 2 分钟内有操作（或正在看视频）才计时
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
      toast(`今天的 ${S.settings.dailyMinutes} 分钟到啦！做完这一步就休息一下眼睛吧`);
    }
  }, 1000);

  // ================= 路由 =================
  const ROUTES = [
    [/^\/?$/, viewToday, 'today'],
    [/^\/today\/(\w+)$/, viewStep, 'today'],
    [/^\/words$/, viewThemes, 'words'],
    [/^\/words\/(\w+)$/, viewThemeWords, 'words'],
    [/^\/word\/(\w+)\/(\d+)$/, viewWord, 'words'],
    [/^\/speak$/, viewSpeakList, 'speak'],
    [/^\/speak\/(\w+)$/, viewSpeakOne, 'speak'],
    [/^\/stories$/, viewStories, 'stories'],
    [/^\/story\/(\w+)$/, viewStory, 'stories'],
    [/^\/video\/(\d+)$/, viewVideo, 'stories'],
    [/^\/games$/, viewGames, 'games'],
    [/^\/game\/listen$/, viewListenGame, 'games'],
    [/^\/game\/move$/, viewMoveGame, 'games'],
    [/^\/stickers$/, viewStickers, ''],
    [/^\/parent$/, viewParent, '']
  ];

  function route() {
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* 忽略 */ } });
    cleanups = [];
    interrupt();
    SP.stop();
    layer.innerHTML = '';
    const path = location.hash.replace(/^#/, '') || '/';
    const hit = ROUTES.find(r => r[0].test(path));
    if (!hit) { location.hash = '#/'; return; }
    setTab(hit[2]);
    view.innerHTML = '';
    hit[1].apply(null, path.match(hit[0]).slice(1));
    window.scrollTo(0, 0);
    renderHeader();
  }
  window.addEventListener('hashchange', route);
  route();

  // 离线缓存：只在 https 或 localhost 下可用
  if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
