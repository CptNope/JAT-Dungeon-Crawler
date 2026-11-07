// ================= audio =================
// Everything is synthesised: an effects bus and a music bus feed a gentle compressor.
let AC = null, muted = true, lastHit = 0, sfxBus = null, musBus = null, noiseBuf = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(comp);
    musBus = AC.createGain(); musBus.gain.value = SET.music === false ? 0 : 0.5; musBus.connect(comp);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f1, f2, dur, type, vol, at, bus, attack) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f1, at); if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(bus || sfxBus); o.start(at); o.stop(at + dur + 0.05);
  return o;
}
function noise(dur, vol, at, ftype, f1, f2, q, bus) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const fl = AC.createBiquadFilter(); fl.type = ftype || 'lowpass'; fl.Q.value = q || 0.8;
  fl.frequency.setValueAtTime(f1 || 1800, at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(fl).connect(g).connect(bus || sfxBus); s.start(at, Math.random() * 0.5, dur + 0.05);
}
function sfx(t) {
  if (muted) return;
  try {
    audio(); const now = AC.currentTime;
    switch (t) {
      case 'hit': if (now - lastHit < 0.035) return; lastHit = now; tone(160, 55, 0.11, 'sine', 0.22, now); noise(0.06, 0.16, now, 'lowpass', 1600, 500); noise(0.02, 0.08, now, 'highpass', 3000); break;
      case 'crit': tone(1500, 1500, 0.25, 'sine', 0.05, now); tone(2250, 2250, 0.18, 'sine', 0.03, now + 0.01); noise(0.09, 0.12, now, 'bandpass', 2500, 900, 2); break;
      case 'kill': tone(110, 38, 0.22, 'sine', 0.25, now); noise(0.16, 0.12, now, 'bandpass', 900, 200, 1.2); break;
      case 'bigkill': tone(80, 30, 0.6, 'sine', 0.3, now); noise(0.5, 0.18, now, 'lowpass', 1200, 80); tone(220, 110, 0.5, 'triangle', 0.06, now + 0.05); break;
      case 'swing': noise(0.13, 0.09, now, 'bandpass', 700, 2600, 1.4); break;
      case 'heavy': noise(0.2, 0.12, now, 'bandpass', 400, 1500, 1.2); tone(90, 60, 0.15, 'sine', 0.05, now); break;
      case 'whirl': for (let k = 0; k < 3; k++) noise(0.15, 0.09, now + k * 0.13, 'bandpass', 500, 2400, 1.4); break;
      case 'dash': noise(0.25, 0.12, now, 'bandpass', 2600, 400, 1.6); tone(500, 120, 0.22, 'triangle', 0.04, now); break;
      case 'nova': tone(70, 35, 0.7, 'sawtooth', 0.08, now); noise(0.6, 0.22, now, 'lowpass', 2400, 120); noise(0.25, 0.08, now, 'highpass', 5000); break;
      case 'shoot': tone(700, 260, 0.09, 'triangle', 0.05, now); noise(0.05, 0.04, now, 'highpass', 2500); break;
      case 'hurt': tone(220, 80, 0.18, 'sawtooth', 0.07, now); noise(0.08, 0.1, now, 'lowpass', 900); break;
      case 'coin': tone(1320, 1980, 0.08, 'square', 0.02, now); tone(1980, 1980, 0.06, 'square', 0.015, now + 0.05); break;
      case 'rare': tone(660, 660, 0.14, 'triangle', 0.06, now); tone(990, 990, 0.3, 'triangle', 0.06, now + 0.1); tone(1320, 1320, 0.4, 'sine', 0.04, now + 0.2); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.06, now + i * 0.08)); break;
      case 'quest': [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.45, 'triangle', 0.05, now + i * 0.11)); tone(1046, 1046, 0.8, 'sine', 0.04, now + 0.44); break;
      case 'dodge': noise(0.14, 0.07, now, 'bandpass', 1200, 400, 1); break;
      case 'drink': tone(300, 620, 0.22, 'sine', 0.07, now); tone(620, 900, 0.12, 'sine', 0.03, now + 0.18); break;
      case 'boom': noise(0.45, 0.25, now, 'lowpass', 900, 60); tone(90, 32, 0.4, 'sine', 0.2, now); break;
      case 'boss': tone(110, 55, 1.4, 'sawtooth', 0.07, now, null, 0.2); tone(165, 82, 1.4, 'sawtooth', 0.05, now, null, 0.2); noise(1.2, 0.08, now, 'lowpass', 300, 60); break;
      case 'chest': tone(400, 820, 0.18, 'triangle', 0.06, now); noise(0.1, 0.06, now, 'bandpass', 1400, 600, 1); break;
      case 'portal': tone(300, 900, 0.5, 'sine', 0.06, now); tone(450, 1350, 0.5, 'sine', 0.03, now + 0.05); break;
      case 'die': tone(300, 50, 1.4, 'sawtooth', 0.08, now); noise(1, 0.08, now, 'lowpass', 600, 60); break;
      case 'buy': tone(900, 1300, 0.09, 'square', 0.03, now); tone(1300, 1300, 0.09, 'square', 0.03, now + 0.08); break;
      case 'craft': noise(0.1, 0.1, now, 'bandpass', 2400, 1600, 2); tone(500, 500, 0.12, 'square', 0.03, now + 0.06); break;
      case 'trap': noise(0.12, 0.14, now, 'highpass', 2200); tone(900, 300, 0.1, 'square', 0.03, now); break;
      case 'shrine': [523, 659, 784].forEach((f) => tone(f, f, 1.2, 'sine', 0.05, now, null, 0.05)); tone(1046, 1046, 1.4, 'sine', 0.03, now + 0.2, null, 0.1); break;
      case 'ambush': tone(98, 49, 1.6, 'sawtooth', 0.09, now, null, 0.02); noise(1.2, 0.12, now, 'lowpass', 500, 60); tone(147, 73, 1.4, 'square', 0.03, now + 0.1); break;
      case 'lock': tone(1200, 1600, 0.06, 'square', 0.025, now); break;
      case 'step': noise(0.05, 0.03, now, 'lowpass', 600); break;
    }
  } catch (err) { /* audio unavailable */ }
}

// ================= music =================
// A tiny step sequencer schedules notes ~0.3 s ahead of the audio clock. Tracks: town, one per biome, boss.
const Music = { want: null, track: null, next: 0, step: 0, bpm: 80, nodes: [], out: null, echo: null };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const BIOME_ROOT = { crypt: 45, fungal: 48, magma: 38, frost: 50, void: 43 }; // MIDI note of each biome's drone
function setMusic(track) { Music.want = track; }
function stopTrack() {
  if (!Music.out) { Music.track = null; return; }
  const t = AC.currentTime, out = Music.out, nodes = Music.nodes;
  out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (err) { /* already stopped */ } } out.disconnect(); }, 1500);
  Music.out = null; Music.nodes = []; Music.track = null;
}
function startTrack(name) {
  Music.track = name; Music.step = 0; Music.next = AC.currentTime + 0.1;
  const out = AC.createGain(); out.gain.setValueAtTime(0.0001, AC.currentTime); out.gain.linearRampToValueAtTime(1, AC.currentTime + 2); out.connect(musBus);
  const echo = AC.createDelay(1); echo.delayTime.value = 0.42; const fb = AC.createGain(); fb.gain.value = 0.32; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2200;
  echo.connect(ef).connect(fb).connect(echo); ef.connect(out);
  Music.out = out; Music.echo = echo; Music.nodes = [];
  if (name === 'town') Music.bpm = 84;
  else if (name === 'boss') Music.bpm = 136;
  else if (name.startsWith('dng:')) {
    Music.bpm = 58;
    const root = hz(BIOME_ROOT[name.slice(4)] || 45);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280; f.Q.value = 1.2;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.06; lg.gain.value = 110; lfo.connect(lg).connect(f.frequency); lfo.start();
    const dg = AC.createGain(); dg.gain.value = 0.028; f.connect(dg).connect(out);
    for (const [m, det] of [[1, -6], [1.5, 4], [0.5, 0]]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * m; o.detune.value = det; o.connect(f); o.start(); Music.nodes.push(o); }
    Music.nodes.push(lfo);
  }
}
function musicTick() {
  if (muted || !AC || SET.music === false || !Music.want) { if (Music.track && AC) stopTrack(); return; }
  if (Music.want !== Music.track) { stopTrack(); startTrack(Music.want); }
  const now = AC.currentTime;
  if (Music.next < now) Music.next = now + 0.05;
  const step = 60 / Music.bpm / 2; // eighth notes
  while (Music.next < now + 0.3) { playStep(Music.step, Music.next); Music.step++; Music.next += step; }
}
const TOWN_CHORDS = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]; // D, Bm, G, A
const MINOR_PENTA = [0, 3, 5, 7, 10];
function playStep(i, at) {
  const out = Music.out; if (!out) return;
  const tr = Music.track;
  if (tr === 'town') {
    const ch = TOWN_CHORDS[Math.floor(i / 16) % 4], beat = 60 / Music.bpm;
    if (i % 16 === 0) for (const n of ch) { tone(hz(n - 12), hz(n - 12), beat * 8, 'triangle', 0.018, at, out, 0.8); tone(hz(n - 12) * 1.004, hz(n - 12) * 1.004, beat * 8, 'triangle', 0.012, at, out, 0.9); }
    if (i % 8 === 0) tone(hz(ch[0] - 24), hz(ch[0] - 24), beat * 3.5, 'sine', 0.06, at, out, 0.02);
    if (Math.random() < 0.62) { const n = ch[randi(0, 2)] + pick([0, 12, 12]); tone(hz(n), hz(n), 0.6, 'sine', 0.026, at, Music.echo, 0.004); tone(hz(n), hz(n), 0.5, 'sine', 0.02, at, out, 0.004); }
    if (Math.random() < 0.03) for (let k = 0; k < randi(2, 4); k++) tone(2600 + Math.random() * 900, 3600, 0.06, 'sine', 0.008, at + k * 0.09, out); // birdsong
  } else if (tr === 'boss') {
    const root = 40, pat = [0, 0, 12, 0, 3, 0, 7, 5], beat = 60 / Music.bpm;
    if (i % 2 === 0) tone(140, 42, 0.26, 'sine', 0.16, at, out);
    if (i % 8 === 2 || i % 8 === 6) noise(0.13, 0.06, at, 'highpass', 1800, 0, 0.7, out);
    noise(0.03, 0.018, at, 'highpass', 7000, 0, 0.7, out);
    tone(hz(root + pat[i % 8]), hz(root + pat[i % 8]), beat * 0.45, 'sawtooth', 0.03, at, out);
    if (i % 2 === 1) { const n = 64 + [0, 3, 7, 11, 12, 11, 7, 3][(i >> 1) % 8]; tone(hz(n), hz(n), beat * 0.4, 'triangle', 0.016, at, Music.echo); }
  } else if (tr && tr.startsWith('dng:')) {
    const id = tr.slice(4), root = BIOME_ROOT[id] || 45;
    if (Math.random() < 0.13) { const n = root + 24 + MINOR_PENTA[randi(0, 4)] + pick([0, 12]); tone(hz(n), hz(n), 3, 'sine', 0.024, at, Music.echo, 0.01); tone(hz(n) * 2.01, hz(n) * 2.01, 1.4, 'sine', 0.006, at, out, 0.01); }
    if (i % 16 === 0) tone(hz(root - 12), hz(root - 14), 1.6, 'sine', 0.07, at, out, 0.02);
    if ((id === 'crypt' || id === 'frost' || id === 'fungal') && Math.random() < 0.025) tone(1900 + Math.random() * 600, 700, 0.09, 'sine', 0.014, at, Music.echo); // drips
    if (id === 'magma' && Math.random() < 0.03) noise(1.2, 0.04, at, 'lowpass', 140, 60, 0.7, out); // rumble
    if (id === 'void' && Math.random() < 0.04) tone(hz(root + 36 + MINOR_PENTA[randi(0, 4)]), hz(root + 48), 1.5, 'sine', 0.01, at, Music.echo, 0.4);
  }
}
