// ================= input =================
const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  if (!$('#title').hidden) { if (ev.code === 'Escape' && started) resume(); return; }
  if (!$('#death').hidden) return;
  if (Panel.kind) {
    if (ev.code === 'Escape' || (ev.code === 'KeyI' && Panel.kind === 'bag') || (ev.code === 'Tab' && Panel.kind === 'bag')) { ev.preventDefault(); closePanel(); }
    return;
  }
  if (GAME_KEYS.has(ev.code)) ev.preventDefault();
  if (ev.code === 'Backquote' || ev.code === 'F3') { ev.preventDefault(); perf.on = !perf.on; $('#perf').hidden = !perf.on; return; }
  if (ev.repeat) return;
  keys[ev.code] = true;
  switch (ev.code) {
    case 'Space': case 'ShiftLeft': case 'ShiftRight': tryDodge(); break;
    case 'KeyE': case 'KeyF': interact(); break;
    case 'KeyQ': usePotion(false); break;
    case 'KeyR': usePotion(true); break;
    case 'KeyT': useScroll(); break;
    case 'KeyI': case 'Tab': case 'KeyB': openPanel('bag'); break;
    case 'Escape': showTitle(); break;
  }
});
window.addEventListener('keyup', (ev) => { keys[ev.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; touchAtk = false; });
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'touch') { setTouchMode(true); return; }
  if (isPaused()) return;
  if (ev.button === 0) mouseDown = true;
  if (ev.button === 2) tryDodge();
});
window.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'touch' && ev.button === 0) mouseDown = false; });
window.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'touch') return;
  if (touchMode && ev.pointerType === 'mouse') setTouchMode(false);
  mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on;
  $('#touch').hidden = !on || !started;
  $('#actionBar').hidden = on;
  nearI = undefined;
}
(function stickSetup() {
  const el = $('#stick'), knob = $('#knob');
  let id = null, cx = 0, cy = 0;
  const set = (x, y) => {
    let dx = x - cx, dy = y - cy; const l = Math.hypot(dx, dy), m = 46;
    if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    stick.x = dx / m; stick.y = dy / m;
  };
  el.addEventListener('pointerdown', (ev) => { id = ev.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(ev.clientX, ev.clientY); });
  el.addEventListener('pointermove', (ev) => { if (ev.pointerId === id) set(ev.clientX, ev.clientY); });
  const end = (ev) => { if (ev.pointerId !== id) return; id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  const atk = $('#tAtk');
  atk.addEventListener('pointerdown', (ev) => { atk.setPointerCapture(ev.pointerId); touchAtk = true; });
  for (const t of ['pointerup', 'pointercancel']) atk.addEventListener(t, () => { touchAtk = false; });
  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', (ev) => { ev.preventDefault(); fn(); });
  tap('#tDodge', tryDodge); tap('#tUse', interact); tap('#tPot', () => usePotion()); tap('#tScroll', useScroll); tap('#tBag', () => openPanel('bag'));
})();

// ================= title, menu, death =================
let started = false;
function showTitle() {
  const has = !!loadSave() || started;
  $('#menuBtns').innerHTML = (started ? '<button class="btn" type="button" id="mResume">Resume</button>' : has ? `<button class="btn" type="button" id="mCont">Continue · Level ${S.level}, deepest ${S.best || 0}</button>` : '<button class="btn" type="button" id="mNew">Begin</button>')
    + (has ? '<button class="btn ghost" type="button" id="mNew2">New hero</button>' : '')
    + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  $('#title').hidden = false; $('#confirmNew').hidden = true; mouseDown = false;
  const b = $('#mResume') || $('#mCont') || $('#mNew'); if (b) b.focus();
}
function resume() { $('#title').hidden = true; }
function begin() {
  started = true;
  $('#title').hidden = true; $('#hud').hidden = false;
  setTouchMode(touchMode || window.matchMedia('(pointer: coarse)').matches);
  $('#touch').hidden = !touchMode;
  hud(); save();
  if (S.runs === 0 && S.kills === 0) setTimeout(() => toast('Walk to the glowing gate at the south of town to begin your first descent.', 'var(--brass-2)', true), 600);
}
function freshHero() {
  S = newSave(); uid = 1;
  S.equip.weapon = genItem(1, { slot: 'weapon', kind: 'sword', rarity: 0 });
  S.equip.chest = genItem(1, { slot: 'chest', rarity: 0 });
  ST = calcStats(); loadTown();
}
$('#title').addEventListener('click', (ev) => {
  const id = ev.target.closest('button') && ev.target.closest('button').id;
  if (id === 'mResume') resume();
  else if (id === 'mCont') begin();
  else if (id === 'mNew') { freshHero(); begin(); }
  else if (id === 'mNew2') { $('#confirmNew').hidden = false; $('#btnWipe').focus(); }
  else if (id === 'btnWipe') { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ } started = false; RUN = null; freshHero(); begin(); }
  else if (id === 'btnKeep') $('#confirmNew').hidden = true;
  else if (id === 'mSound') { toggleMute(); showTitle(); }
});
function toggleMute() { muted = !muted; $('#btnMute').textContent = muted ? 'Sound off' : 'Sound on'; if (!muted) sfx('coin'); }
$('#btnMute').addEventListener('click', toggleMute);
$('#btnMenu').addEventListener('click', showTitle);
$('#btnRevive').addEventListener('click', () => { $('#death').hidden = true; P.dead = false; returnToTown(true); });
$('#keyList').innerHTML = [
  ['WASD', 'Move'], ['Mouse', 'Aim'], ['Left click', 'Attack (hold)'], ['Space', 'Roll'], ['E', 'Use, open, talk'], ['Q / R', 'Draught / Greater'], ['T', 'Portal scroll'], ['I', 'Bag and character'], ['Esc', 'Menu'], ['`', 'Performance readout'],
].map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('') + '<div><kbd>Touch</kbd><span>Stick to move, Strike auto-aims</span></div>';

// ================= performance readout & adaptive resolution =================
const perf = { on: false, acc: 0, cpu: 0, n: 0, slow: 0, fast: 0, ratio: Math.min(window.devicePixelRatio || 1, 2), cap: Math.min(window.devicePixelRatio || 1, 2), ms: 0, cpuMs: 0 };
renderer.setPixelRatio(perf.ratio);
function perfTick(dt, cpuMs) {
  perf.acc += dt; perf.cpu += cpuMs; perf.n++;
  if (perf.n < 60) return;
  perf.ms = (perf.acc / perf.n) * 1000; perf.cpuMs = perf.cpu / perf.n;
  perf.acc = perf.cpu = 0; perf.n = 0;
  // adaptive pixel ratio: fill rate scales with ratio squared, so trade sharpness for frames when the device struggles
  if (perf.ms > 24) { perf.slow++; perf.fast = 0; } else if (perf.ms < 17.5) { perf.fast++; perf.slow = 0; } else { perf.slow = perf.fast = 0; }
  if (perf.slow >= 2 && perf.ratio > 1) { perf.ratio = Math.max(1, perf.ratio - 0.25); renderer.setPixelRatio(perf.ratio); perf.slow = 0; }
  if (perf.fast >= 6 && perf.ratio < perf.cap) { perf.ratio = Math.min(perf.cap, perf.ratio + 0.25); renderer.setPixelRatio(perf.ratio); perf.fast = 0; }
  if (perf.on) {
    const i = renderer.info;
    $('#perf').textContent = `${perf.ms.toFixed(1)} ms/frame · ${perf.cpuMs.toFixed(1)} ms CPU\n${i.render.calls} draw calls · ${fmt(i.render.triangles)} tris\n${i.memory.geometries} geometries · ${i.programs.length} programs\npixel ratio ${perf.ratio.toFixed(2)} · ${enemies.length} foes`;
  }
}

// ================= main loop =================
const timer = new THREE.Timer();
timer.connect(document);
let hudT = 0, miniT = 0, saveT = 0;
function frame(ts) {
  timer.update(ts);
  const dt = Math.min(0.05, timer.getDelta());
  const t0 = performance.now();
  if (!levelReady) { perfTick(dt, 0); return; }
  if (!isPaused()) {
    updPlayer(dt);
    if (LV.type === 'dungeon') {
      flowT -= dt;
      const ti = tidx(P.x, P.z);
      if (flowT <= 0 || ti !== flowTile) { flowT = 0.35; flowTile = ti; computeFlow(); }
      for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.dead) updEnemy(e, dt); }
      separate();
      for (const e of enemies) if (!e.dead) collide(e);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
      updTeles(dt); updDrops(dt);
      revealT -= dt; if (revealT <= 0) { revealT = 0.2; reveal(); }
    }
    updProjs(dt);
    updInteract();
    saveT += dt; if (saveT > 20) { saveT = 0; save(); }
  }
  for (const s of spinners) s.rotation.y += dt * (s.userData.spin || 1);
  updParts(dt); updSwings(dt);
  if (P.mesh) updCamera(dt);
  renderer.render(scene, camera);
  updOverlays(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; hud(); }
  miniT -= dt; if (miniT <= 0 && LV) { miniT = 0.1; drawMini(); }
  perfTick(dt, performance.now() - t0);
}

// ================= boot =================
function boot(data) {
  resize();
  buildActionBar();
  const saved = (data && data.S) || loadSave();
  if (saved) { S = normalizeSave(saved); fixUid(); ST = calcStats(); loadTown(); }
  else freshHero();
  if (data && data.started) { begin(); } else showTitle();
  renderer.setAnimationLoop(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S, started }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
return { get S() { return S; }, get P() { return P; }, get LV() { return LV; }, enemies, renderer, startDelve, begin, freshHero, openPanel, closePanel, loadDungeon, get ready() { return levelReady; }, perf };
