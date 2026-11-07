// ================= input =================
const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  if (!$('#title').hidden) { if (ev.code === 'Escape' && started) resume(); return; }
  if (!$('#death').hidden) return;
  if (Panel.kind) {
    if (ev.code === 'Escape' || ((ev.code === 'KeyI' || ev.code === 'KeyB' || ev.code === 'KeyK') && Panel.kind === 'bag') || (ev.code === 'KeyC' && Panel.kind === 'codex')) { ev.preventDefault(); closePanel(); }
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
    case 'KeyI': case 'KeyB': openPanel('bag'); break;
    case 'KeyK': case 'KeyN': openPanel('bag', 'talents'); break;
    case 'KeyC': openPanel('codex'); break;
    case 'Tab': cycleLock(); break;
    case 'KeyX': releaseLock(); break;
    case 'Digit1': useSkill(0); break;
    case 'Digit2': useSkill(1); break;
    case 'Digit3': useSkill(2); break;
    case 'Escape': showTitle(); break;
    case 'KeyV': cycleCam(); break;
  }
});
window.addEventListener('keyup', (ev) => { keys[ev.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; touchAtk = false; });
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'touch') { setTouchMode(true); if (SET.cam !== 'top') { lookTouch = ev.pointerId; lookX = ev.clientX; lookY = ev.clientY; } return; }
  if (isPaused()) return;
  // third and first person: the first click captures the mouse for looking around (optional; works without it)
  if (SET.cam !== 'top' && document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* not available */ } }
  if (ev.button === 0) mouseDown = true;
  if (ev.button === 1) { ev.preventDefault(); if (lockT) releaseLock(); else cycleLock(); }
  if (ev.button === 2) tryDodge();
});
let lookTouch = null, lookX = 0, lookY = 0;
canvas.addEventListener('pointermove', (ev) => { if (ev.pointerId === lookTouch && !isPaused()) { lookBy((ev.clientX - lookX) * 1.6, (ev.clientY - lookY) * 1.6); lookX = ev.clientX; lookY = ev.clientY; } });
for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, (ev) => { if (ev.pointerId === lookTouch) lookTouch = null; });
canvas.addEventListener('wheel', (ev) => {
  if (isPaused()) return; ev.preventDefault();
  if (SET.cam === 'top') camZoom = clamp(camZoom * (ev.deltaY > 0 ? 1.08 : 0.93), 0.55, 1.5);
  else if (SET.cam === 'third') CAM.dist = clamp(CAM.dist * (ev.deltaY > 0 ? 1.1 : 0.9), 2.2, 9);
}, { passive: false });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) mouseDown = false; });
window.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'touch' && ev.button === 0) mouseDown = false; });
window.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'touch') return;
  if (touchMode && ev.pointerType === 'mouse') setTouchMode(false);
  mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  if (SET.cam !== 'top' && !isPaused() && started) lookBy(ev.movementX || 0, ev.movementY || 0);
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
  tap('#tView', cycleCam); tap('#tDodge', tryDodge);
  tap('#tS1', () => useSkill(0)); tap('#tS2', () => useSkill(1)); tap('#tS3', () => useSkill(2)); tap('#tLock', () => (lockT ? releaseLock() : cycleLock())); tap('#tUse', interact); tap('#tPot', () => usePotion()); tap('#tScroll', useScroll); tap('#tBag', () => openPanel('bag'));
})();

// ================= title, menu, death =================
let started = false;
let titleSlots = false, eraseSlot = -1;
function slotLine(i) {
  const s = peekSlot(i); if (!s) return null;
  return `${s.cls ? CLASSES[s.cls].n : 'Delver'}, level ${s.level} · deepest ${s.best || 0}${s.time ? ' · ' + fmtTime(s.time) : ''}`;
}
function showTitle() {
  if (started && !titleSlots) {
    $('#menuBtns').innerHTML = '<button class="btn" type="button" id="mResume">Resume</button><button class="btn ghost" type="button" id="mCodex">Codex</button><button class="btn ghost" type="button" id="mSlots">Change hero</button>'
      + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  } else {
    $('#menuBtns').innerHTML = `<div class="slots">${[0, 1, 2].map((i) => { const l = slotLine(i); return `<div class="slotrow${i === SET.slot && started ? ' cur' : ''}"><button class="btn${l ? '' : ' ghost'} slotb" type="button" id="mSlot${i}"><b>Slot ${i + 1}</b><span>${l ? esc(l) : 'Empty · begin a new hero'}</span></button>${l ? `<button class="btn ghost sm" type="button" id="mDel${i}" aria-label="Erase slot ${i + 1}">Erase</button>` : ''}</div>`; }).join('')}</div>`
      + (started ? '<button class="btn ghost" type="button" id="mBack">Back</button>' : '') + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  }
  $('#opts').innerHTML = optRow('View', 'cam', [['top', 'Overhead'], ['third', 'Third person'], ['first', 'First person']]) + optRow('Graphics', 'q', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]) + optRow('Look speed', 'sens', [[0.6, 'Slow'], [1, 'Normal'], [1.6, 'Fast']])
    + optRow('Music', 'music', [[true, 'On'], [false, 'Off']]) + optRow('Screen shake', 'shake', [[true, 'On'], [false, 'Off']]);
  if (document.pointerLockElement) document.exitPointerLock();
  $('#title').hidden = false; $('#confirmNew').hidden = true; mouseDown = false;
  const b = $('#mResume') || $('#mSlot' + (SET.slot || 0)); if (b) b.focus();
}
function resume() { $('#title').hidden = true; }
function optRow(label, key, items) { return `<div class="opt"><span>${label}</span><div class="seg">${items.map(([v, n]) => `<button type="button" class="${String(SET[key]) === String(v) ? 'on' : ''}" data-opt="${key}" data-v="${v}">${n}</button>`).join('')}</div></div>`; }
function setQuality(q) { SET.q = q; saveSettings(); applyQuality(); perf.cap = Math.min(window.devicePixelRatio || 1, Q.ratioCap); perf.ratio = Math.min(perf.ratio, perf.cap); renderer.setPixelRatio(perf.ratio); Post.setup(); warmLevel(); }
function begin() {
  started = true;
  $('#title').hidden = true; $('#hud').hidden = false;
  setTouchMode(touchMode || window.matchMedia('(pointer: coarse)').matches);
  $('#touch').hidden = !touchMode;
  hud(); save();
  if (!S.cls) openPanel('class');
  else if (S.runs === 0 && S.kills === 0) setTimeout(() => toast('Walk to the glowing gate at the south of town to begin your first descent.', 'var(--brass-2)', true), 600);
}
function freshHero() {
  S = newSave(); uid = 1; RUN = null; P.dead = false;
  S.equip.weapon = genItem(1, { slot: 'weapon', kind: 'sword', rarity: 0 });
  S.equip.chest = genItem(1, { slot: 'chest', rarity: 0 });
  setClassSkills(); buildActionBar();
  ST = calcStats(); rebuildHero(); loadTown();
}
$('#title').addEventListener('click', (ev) => {
  const id = ev.target.closest('button') && ev.target.closest('button').id;
  if (id === 'mResume') resume();
  else if (id === 'mCodex') { resume(); openPanel('codex'); }
  else if (id === 'mSlots') { titleSlots = true; showTitle(); }
  else if (id === 'mBack') { titleSlots = false; showTitle(); }
  else if (id && id.startsWith('mSlot')) {
    const i = +id.slice(5);
    if (started && i === SET.slot) { titleSlots = false; resume(); return; }
    save(); SET.slot = i; saveSettings();
    const s = peekSlot(i);
    if (s) switchToSave(s); else freshHero();
    titleSlots = false; begin();
  } else if (id && id.startsWith('mDel')) { eraseSlot = +id.slice(4); $('#confirmNew').hidden = false; $('#confirmNew span').textContent = `Erase slot ${eraseSlot + 1}? That hero is gone for good.`; $('#btnWipe').focus(); }
  else if (id === 'btnWipe') {
    try { localStorage.removeItem(SLOT_KEYS[eraseSlot]); } catch (err) { /* ignore */ }
    if (eraseSlot === SET.slot) { started = false; freshHero(); $('#hud').hidden = true; $('#touch').hidden = true; }
    eraseSlot = -1; titleSlots = !started ? false : titleSlots; showTitle();
  }
  else if (id === 'btnKeep') $('#confirmNew').hidden = true;
  else if (id === 'mSound') { toggleMute(); showTitle(); }
  const o = ev.target.closest('[data-opt]');
  if (o) {
    if (o.dataset.opt === 'cam') setCamMode(o.dataset.v);
    else if (o.dataset.opt === 'q') setQuality(o.dataset.v);
    else if (o.dataset.opt === 'music' || o.dataset.opt === 'shake') { SET[o.dataset.opt] = o.dataset.v === 'true'; saveSettings(); if (musBus) musBus.gain.value = SET.music === false ? 0 : 0.5; }
    else { SET.sens = +o.dataset.v; saveSettings(); }
    showTitle();
  }
});
function toggleMute() { muted = !muted; $('#btnMute').textContent = muted ? 'Sound off' : 'Sound on'; if (!muted) { audio(); sfx('coin'); } }
$('#btnMute').addEventListener('click', toggleMute);
$('#btnMenu').addEventListener('click', showTitle);
$('#btnView').addEventListener('click', cycleCam);
$('#btnRevive').addEventListener('click', () => { $('#death').hidden = true; P.dead = false; returnToTown(true); });
$('#keyList').innerHTML = [
  ['WASD', 'Move'], ['Mouse', 'Aim or look'], ['Left click', 'Attack (hold)'], ['Space', 'Roll'], ['1 2 3', 'Skills'], ['Tab', 'Lock on / next'], ['X', 'Release lock'], ['E', 'Use, open, talk'], ['V', 'Switch view'], ['Wheel', 'Zoom'], ['Q / R', 'Draught / Greater'], ['T', 'Portal scroll'], ['I', 'Bag and character'], ['K', 'Talents'], ['C', 'Codex'], ['Esc', 'Menu'], ['`', 'Performance readout'],
].map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('') + '<div><kbd>Touch</kbd><span>Stick moves; drag the screen to look in close views</span></div>';

// ================= performance readout & adaptive resolution =================
const perf = { on: false, acc: 0, cpu: 0, n: 0, slow: 0, fast: 0, ratio: Math.min(window.devicePixelRatio || 1, Q.ratioCap), cap: Math.min(window.devicePixelRatio || 1, Q.ratioCap), ms: 0, cpuMs: 0 };
renderer.setPixelRatio(perf.ratio);
function perfTick(dt, cpuMs) {
  perf.acc += dt; perf.cpu += cpuMs; perf.n++;
  if (perf.n < 60) return;
  perf.ms = (perf.acc / perf.n) * 1000; perf.cpuMs = perf.cpu / perf.n;
  perf.acc = perf.cpu = 0; perf.n = 0;
  // adaptive pixel ratio: fill rate scales with ratio squared, so trade sharpness for frames when the device struggles
  if (perf.ms > 24) { perf.slow++; perf.fast = 0; } else if (perf.ms < 17.5) { perf.fast++; perf.slow = 0; } else { perf.slow = perf.fast = 0; }
  if (perf.slow >= 2 && perf.ratio > 1) { perf.ratio = Math.max(1, perf.ratio - 0.25); renderer.setPixelRatio(perf.ratio); perf.slow = 0; }
  if (perf.slow >= 3 && perf.ratio <= 1 && SET.q !== 'low' && !perf.dropped) { perf.dropped = true; setQuality(SET.q === 'high' ? 'medium' : 'low'); toast(`Graphics lowered to ${SET.q} to keep the game smooth. Change it in the menu.`, 'var(--muted)'); perf.slow = 0; }
  if (perf.fast >= 6 && perf.ratio < perf.cap) { perf.ratio = Math.min(perf.cap, perf.ratio + 0.25); renderer.setPixelRatio(perf.ratio); perf.fast = 0; }
  if (perf.on) {
    const i = renderer.info;
    $('#perf').textContent = `${perf.ms.toFixed(1)} ms/frame · ${perf.cpuMs.toFixed(1)} ms CPU\n${i.render.calls} draw calls · ${fmt(i.render.triangles)} tris\n${i.memory.geometries} geometries · ${i.programs.length} programs\npixel ratio ${perf.ratio.toFixed(2)} · ${SET.q} · ${enemies.length} foes`;
  }
}

// ================= main loop =================
const timer = new THREE.Timer();
timer.connect(document);
let hudT = 0, miniT = 0, saveT = 0, achT = 0;
function frame(ts) {
  timer.update(ts);
  const dt = Math.min(0.05, timer.getDelta());
  elapsed += dt; U_TIME.value = elapsed;
  renderer.info.reset();
  const t0 = performance.now();
  if (!levelReady) { perfTick(dt, 0); return; }
  let gdt = dt;
  if (hitStop > 0) { hitStop -= dt; gdt = dt * 0.06; }
  if (!isPaused()) {
    updPlayer(gdt);
    if (LV.type === 'dungeon') {
      flowT -= gdt;
      const ti = tidx(P.x, P.z);
      if (flowT <= 0 || ti !== flowTile) { flowT = 0.35; flowTile = ti; computeFlow(); }
      for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.dead) updEnemy(e, gdt); }
      separate();
      for (const e of enemies) if (!e.dead) collide(e);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
      // anything past the fog is invisible anyway: skip drawing it (and its shadow passes)
      // and only foes close to the lantern throw shadows: the six-sided shadow pass costs per caster
      const vr = SET.cam === 'top' ? 34 : SET.cam === 'third' ? 25 : 22;
      for (const e of enemies) {
        const d = Math.hypot(e.x - P.x, e.z - P.z), v = e.boss || d < vr;
        if (e.mesh.visible !== v) { e.mesh.visible = v; if (e.bar) e.bar.visible = v; if (e.auraRing) e.auraRing.visible = v; }
        const cs = d < 10 || e.boss;
        if (e.cs !== cs) { e.cs = cs; for (const c of e.mesh.children) if (c.userData.cs) c.castShadow = cs; }
      }
      updTeles(gdt); updDrops(gdt); updTraps(gdt); updAmbush(gdt);
      revealT -= dt; if (revealT <= 0) { revealT = 0.2; reveal(); }
    }
    updProjs(gdt);
    updCorpses(gdt); updPet(gdt);
    if (LV.type === 'town') { updVillagers(gdt); updTimeOfDay(gdt); }
    S.time = (S.time || 0) + dt;
    updInteract();
    saveT += dt; if (saveT > 20) { saveT = 0; save(); }
  }
  for (const s of spinners) s.rotation.y += dt * (s.userData.spin || 1);
  updParts(gdt); updSwings(dt); updRings(dt); updTorchLights(dt); updBlobs(); updLock();
  if (P.mesh) updCamera(dt);
  updTrail(gdt); updFacers();
  musicTick();
  // shader time, point-size scale and the things that follow the camera
  const ps = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  burstSys.pts.material.uniforms.uScale.value = ps; ambientSys.m.uniforms.uScale.value = ps;
  ambientSys.m.uniforms.uTime.value = elapsed; ambientSys.m.uniforms.uCenter.value.set(P.x, 0, P.z);
  for (const fm of FLAME_MATS) { fm.uniforms.uTime.value = elapsed; fm.uniforms.uScale.value = ps; }
  sky.position.copy(camera.position);
  if (LV.type === 'town' && sun.castShadow) { // keep the sun's shadow box centred on the player, snapped to texels to avoid shimmer
    const step = 44 / sun.shadow.mapSize.x, sx = Math.round(P.x / step) * step, sz = Math.round(P.z / step) * step;
    sun.position.set(sx + sunOff.x, sunOff.y, sz + sunOff.z); sun.target.position.set(sx, 0, sz);
  }
  Post.render();
  updOverlays(dt); updLockMark();
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; hud(); achT -= 1; if (achT <= 0) { achT = 10; checkAch(); } }
  miniT -= dt; if (miniT <= 0 && LV) { miniT = 0.1; drawMini(); }
  perfTick(dt, performance.now() - t0);
}

// ================= boot =================
function boot(data) {
  applyQuality();
  renderer.setPixelRatio(perf.ratio);
  resize();
  $('#btnView').textContent = window.innerWidth < 640 ? 'View' : 'View: ' + CAM_NAMES[SET.cam]; $('#crosshair').hidden = SET.cam === 'top';
  const saved = (data && data.S) || loadSave();
  if (saved) { S = normalizeSave(saved); fixUid(); setClassSkills(); buildActionBar(); ST = calcStats(); loadTown(); }
  else freshHero();
  if (data && data.started) { begin(); } else showTitle();
  renderer.setAnimationLoop(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S, started }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
return { get S() { return S; }, get P() { return P; }, get LV() { return LV; }, enemies, renderer, startDelve, begin, freshHero, openPanel, closePanel, loadDungeon, get ready() { return levelReady; }, perf, debug: { genItem, makeSetItem, scene, sun, hemi, sky, walkable, spawnEnemy, bossPattern, get LVL() { return LV; }, applyTimeOfDay, get pet() { return pet; }, villagers, zones, chooseClass, checkAch, playerAttack, CAM, setCamMode, useSkill, cycleLock, get lockT() { return lockT; }, corpses, skillCd, questEvent, makeQuestOffers, claimQuest, get trail() { return trail; } } };
