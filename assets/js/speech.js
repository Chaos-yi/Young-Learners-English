/*
 * 小耳朵英语 · 语音
 * ------------------------------------------------------------
 * speak()   浏览器语音合成朗读，支持逐词回调（用于指读高亮）
 * capture() 录音（MediaRecorder），给孩子回放自己的声音；不识别、不打分
 *
 * 正式版建议把 speak() 换成播放预生成的 mp3。
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

  // ---------- 录音 ----------
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  /*
   * capture({ maxMs }) → 控制器 { stop(), done: Promise<{ url, error }> }
   * 只录音、回放，不做识别和打分；录不了时 error 有值（denied / no-mic / unsupported）。
   */
  function capture(opts) {
    opts = opts || {};
    let stream = null, recorder = null, stopped = false, timer = null;
    const chunks = [];
    let resolveDone;
    const done = new Promise(r => { resolveDone = r; });
    const finish = (url, error) => {
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach(t => t.stop());
      resolveDone({ url: url || null, error: url ? null : (error || 'no-input') });
    };

    if (!canRecord) {
      setTimeout(() => finish(null, 'unsupported'), 0);
      return { stop() {}, done };
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      stream = s;
      if (stopped) { finish(null, 'no-input'); return; }
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      recorder = type ? new MediaRecorder(s, { mimeType: type }) : new MediaRecorder(s);
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => finish(chunks.length ? URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })) : null);
      recorder.start();
    }).catch(e => finish(null, e && e.name === 'NotAllowedError' ? 'denied' : 'no-mic'));

    function stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(timer);
      try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch (e) { finish(null, 'no-input'); }
    }
    timer = setTimeout(stop, opts.maxMs || 6000);
    return { stop, done };
  }

  /*
   * 等发音人列表加载完（安卓/鸿蒙浏览器上常常要等一会儿，有的不触发 voiceschanged），
   * 返回 { supported, count: 英语发音人数量, total: 全部发音人数量, voice: 将要使用的发音人 }
   */
  function voiceStatus(timeout) {
    return new Promise(resolve => {
      if (!synth) { resolve({ supported: false, count: 0, total: 0, voice: null }); return; }
      const start = Date.now();
      (function check() {
        loadVoices();
        if (voices.length || Date.now() - start > (timeout || 2500)) {
          resolve({ supported: true, count: voices.length, total: synth.getVoices().length, voice: pickVoice() });
        } else {
          setTimeout(check, 200);
        }
      })();
    });
  }

  function cheer() {
    const list = LE.DATA.cheers;
    return list[Math.floor(Math.random() * list.length)];
  }

  LE.speech = {
    speak, stop, capture, cheer, voiceStatus,
    get supported() { return !!synth; },
    get canRecord() { return canRecord; },
    get voices() { if (!voices.length) loadVoices(); return voices; },
    pickVoice
  };
})();
