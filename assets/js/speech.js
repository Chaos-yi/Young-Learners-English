/*
 * 小耳朵英语 · 语音
 * ------------------------------------------------------------
 * speak()   浏览器语音合成朗读，支持逐词回调（用于指读高亮）
 * capture() 录音（MediaRecorder）+ 语音识别（SpeechRecognition，有则用）
 * score()   把识别结果和目标句比较，给 1–3 颗星（只要开口就至少 1 颗）
 *
 * 正式版建议把 speak() 换成播放预生成的 mp3，把 score() 换成口语评测 API。
 */
(function () {
  const synth = window.speechSynthesis || null;
  let voices = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices().filter(v => /^en[-_]/i.test(v.lang));
  }
  if (synth) {
    loadVoices();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }

  // 优先选音色好的本地发音人
  const PREFERRED = {
    'en-GB': ['Daniel', 'Kate', 'Serena', 'Libby', 'Sonia', 'Hazel', 'Google UK English Female', 'Google UK English Male', 'Martha', 'Arthur'],
    'en-US': ['Samantha', 'Ava', 'Allison', 'Aria', 'Jenny', 'Zira', 'Google US English', 'Alex']
  };

  function pickVoice() {
    const s = LE.store.settings;
    if (!voices.length) loadVoices();
    if (s.voiceURI) {
      const chosen = voices.find(v => v.voiceURI === s.voiceURI);
      if (chosen) return chosen;
    }
    const lang = s.accent;
    const sameLang = voices.filter(v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    for (const name of PREFERRED[lang] || []) {
      const v = sameLang.find(x => x.name.indexOf(name) >= 0);
      if (v) return v;
    }
    return sameLang.find(v => v.localService) || sameLang[0] || voices.find(v => v.localService) || voices[0] || null;
  }

  let current = null;

  /*
   * speak(text, { rate, onWord(charIndex), onEnd })
   * 返回 Promise，读完（或被打断）时 resolve。
   */
  function speak(text, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      if (!synth) { resolve(false); return; }
      stop();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = LE.store.settings.accent; }
      u.rate = (opts.rate || 1) * LE.store.settings.rate;
      u.pitch = 1.05;
      let finished = false;
      const finish = ok => {
        if (finished) return;
        finished = true;
        if (current === u) current = null;
        if (opts.onEnd) opts.onEnd();
        resolve(ok);
      };
      u.onboundary = e => { if (opts.onWord && (e.name === 'word' || e.name === undefined)) opts.onWord(e.charIndex); };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      current = u;
      // Chrome 在 cancel() 后立刻 speak() 偶尔不出声，稍等一下更稳
      setTimeout(() => synth.speak(u), 60);
      // 兜底：个别浏览器不触发 onend
      setTimeout(() => finish(true), 1500 + text.length * 160 / u.rate);
    });
  }

  function stop() {
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    current = null;
  }

  // ---------- 录音 + 识别 ----------
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  /*
   * capture({ maxMs }) → 控制器 { stop(), done: Promise<{ url, transcripts, error }> }
   * 识别和录音各自失败不影响对方；都失败时 error 有值，界面改为家长打星。
   */
  function capture(opts) {
    opts = opts || {};
    const maxMs = opts.maxMs || 6000;
    let stream = null, recorder = null, recog = null;
    const chunks = [];
    const transcripts = [];
    let stopped = false;
    let resolveDone;
    const done = new Promise(r => { resolveDone = r; });
    let recorderDone = !canRecord;
    let recogDone = !Recognition;
    let url = null;
    let error = null;
    let timer = null;

    function maybeFinish() {
      if (recorderDone && recogDone) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        resolveDone({ url, transcripts, error: url || transcripts.length ? null : (error || 'no-input') });
      }
    }

    function stopAll() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); else { recorderDone = true; } } catch (e) { recorderDone = true; }
      try { if (recog) recog.stop(); } catch (e) { recogDone = true; }
      // 识别结果有时迟到，最多再等 1.5 秒
      setTimeout(() => { recogDone = true; maybeFinish(); }, 1500);
      maybeFinish();
    }

    if (canRecord) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        stream = s;
        if (stopped) { recorderDone = true; maybeFinish(); return; }
        const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        recorder = type ? new MediaRecorder(s, { mimeType: type }) : new MediaRecorder(s);
        recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = () => {
          if (chunks.length) url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          recorderDone = true;
          maybeFinish();
        };
        recorder.start();
      }).catch(e => {
        error = e && e.name === 'NotAllowedError' ? 'denied' : 'no-mic';
        recorderDone = true;
        maybeFinish();
      });
    }

    if (Recognition) {
      try {
        recog = new Recognition();
        recog.lang = LE.store.settings.accent;
        recog.interimResults = false;
        recog.maxAlternatives = 5;
        recog.continuous = false;
        recog.onresult = e => {
          for (let i = 0; i < e.results.length; i++) {
            for (let j = 0; j < e.results[i].length; j++) transcripts.push(e.results[i][j].transcript);
          }
        };
        recog.onerror = e => { if (!error && e.error === 'not-allowed') error = 'denied'; };
        recog.onend = () => { recogDone = true; if (stopped) maybeFinish(); };
        recog.start();
      } catch (e) {
        recogDone = true;
      }
    }

    if (!canRecord && !Recognition) {
      error = 'unsupported';
      setTimeout(maybeFinish, 0);
    }

    timer = setTimeout(stopAll, maxMs);
    return { stop: stopAll, done };
  }

  // ---------- 打分 ----------
  const CONTRACTIONS = {
    "it's": 'it is', "i'm": 'i am', "what's": 'what is', "where's": 'where is', "who's": 'who is',
    "he's": 'he is', "she's": 'she is', "here's": 'here is', "let's": 'let us', "i've": 'i have',
    "don't": 'do not', "can't": 'can not', "that's": 'that is', "there's": 'there is'
  };
  const NUMS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  function tokens(text) {
    return text.toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9' ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(w => CONTRACTIONS[w] || (/^\d+$/.test(w) && NUMS[+w]) || w)
      .join(' ')
      .split(' ')
      .map(w => w.replace(/'/g, ''));
  }

  function match(target, heard) {
    const want = tokens(target);
    const got = tokens(heard);
    let hit = 0;
    want.forEach(w => {
      const i = got.indexOf(w);
      if (i >= 0) { hit += 1; got.splice(i, 1); }
    });
    return want.length ? hit / want.length : 0;
  }

  function score(target, transcripts) {
    if (!transcripts || !transcripts.length) return null;
    const best = Math.max.apply(null, transcripts.map(t => match(target, t)));
    return best >= 0.8 ? 3 : best >= 0.5 ? 2 : 1;
  }

  function praise(stars) {
    const list = LE.DATA.praise[stars] || LE.DATA.praise[1];
    return list[Math.floor(Math.random() * list.length)];
  }

  LE.speech = {
    speak, stop, capture, score, praise, tokens,
    get supported() { return !!synth; },
    get canRecord() { return canRecord; },
    get canRecognize() { return !!Recognition; },
    get voices() { if (!voices.length) loadVoices(); return voices; },
    pickVoice
  };
})();
