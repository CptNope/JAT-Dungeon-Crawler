// ================= sharing: frame capture, run card, photo mode =================
function captureFrame() { Post.render(); try { return renderer.domElement.toDataURL('image/png'); } catch (err) { return null; } }
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t; }
  if (line) ctx.fillText(line, x, y); return y + lh;
}
// a portrait: the camera steps round in front of the hero for one frame, then goes back where it was
function heroPortrait() {
  const pos = camera.position.clone(), q = camera.quaternion.clone(), fov = camera.fov, vis = P.mesh.visible;
  const a = P.face + 0.5;
  camera.position.set(P.x + Math.sin(a) * 3.3, 1.75, P.z + Math.cos(a) * 3.3); camera.lookAt(P.x, 1.0, P.z);
  camera.fov = 38; camera.updateProjectionMatrix(); P.mesh.visible = true; if (viewmodel.g) viewmodel.g.visible = false;
  const url = captureFrame();
  camera.position.copy(pos); camera.quaternion.copy(q); camera.fov = fov; camera.updateProjectionMatrix(); P.mesh.visible = vis;
  return url;
}
async function makeRunCard() {
  const shot = await loadImg(heroPortrait());
  const C = clsOf(), W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), col = '#' + C.col.toString(16).padStart(6, '0');
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#15131c'); bg.addColorStop(1, '#0c0b10'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  if (shot) { // square crop from the middle of the current view
    const s = Math.min(shot.width, shot.height); x.drawImage(shot, (shot.width - s) / 2, (shot.height - s) / 2, s, s, 0, 0, H, H);
    const fade = x.createLinearGradient(H - 160, 0, H, 0); fade.addColorStop(0, 'rgba(12,11,16,0)'); fade.addColorStop(1, 'rgba(12,11,16,1)'); x.fillStyle = fade; x.fillRect(H - 160, 0, 160, H);
  }
  x.fillStyle = col; x.fillRect(H, 0, 6, H);
  const L = H + 48;
  x.fillStyle = '#f2c56b'; x.font = '28px Georgia, serif'; x.fillText('HEARTHDEEP', L, 70);
  x.fillStyle = '#efe8da'; x.font = '64px Georgia, serif'; x.fillText(`${C.n}, level ${S.level}`, L, 150);
  x.fillStyle = '#a49f96'; x.font = '22px system-ui, sans-serif';
  const St = S.story || {}; x.fillText(St.final ? 'Freed the Hollow King' : `Story chapter ${St.ch || 0} of 8`, L, 188);
  const stats = [['Deepest depth', S.best || 0], ['Bosses slain', S.bossKills], ['Foes slain', fmt(S.kills)], ['Best rift', (S.rift && S.rift.cleared) || 0], ['Best Pit wave', S.arenaBest || 0], ['Achievements', `${Object.keys(S.ach || {}).length}/${ACH.length}`]];
  stats.forEach(([k, v], i) => {
    const cx = L + (i % 2) * 250, cy = 250 + Math.floor(i / 2) * 92;
    x.fillStyle = '#7d786e'; x.font = '16px system-ui, sans-serif'; x.fillText(k.toUpperCase(), cx, cy);
    x.fillStyle = '#efe8da'; x.font = '600 40px system-ui, sans-serif'; x.fillText(String(v), cx, cy + 44);
  });
  const w = S.equip.weapon; x.font = '20px system-ui, sans-serif'; x.fillStyle = w && w.set ? '#5fd38a' : w ? ['#bdb7a7', '#74c269', '#5c8ff2', '#b56ff2', '#f19a33'][w.rarity] : '#a49f96';
  wrapText(x, w ? `Wielding ${w.name}` : 'Fighting bare-handed', L, 548, W - L - 40, 26);
  x.fillStyle = '#5a564e'; x.font = '15px system-ui, sans-serif'; x.fillText(`${fmtTime(S.time || 0)} played`, L, 596);
  return cv.toDataURL('image/png');
}
function runSummary() {
  return `Hearthdeep: ${clsOf().n} level ${S.level}, deepest depth ${S.best || 0}, ${S.bossKills} bosses, ${fmt(S.kills)} foes, best rift ${(S.rift && S.rift.cleared) || 0}, best Pit wave ${S.arenaBest || 0}.`;
}
function showShare(url, title, note) {
  const el = $('#share');
  el.innerHTML = `<div class="share-in"><header><b>${esc(title)}</b><button class="x" type="button" id="shareX">Close</button></header>
    <img src="${url}" alt="${esc(title)}"><p class="hint">${esc(note || 'If your browser blocks saving, right-click or long-press the image to save it.')}</p>
    <div class="acts"><button class="btn" type="button" id="shareCopy">Copy image</button><a class="btn ghost" id="shareSave" download="hearthdeep.png" href="${url}">Save image</a><button class="btn ghost" type="button" id="shareText">Copy summary</button></div></div>`;
  el.hidden = false; el.dataset.url = url;
}
async function copyImage(url) {
  try { const b = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('Image copied.', 'var(--ok)'); }
  catch (err) { toast('Copying images is blocked here. Save it instead.', 'var(--muted)'); }
}
document.addEventListener('click', async (ev) => {
  const id = ev.target && ev.target.id;
  if (id === 'shareX') $('#share').hidden = true;
  else if (id === 'shareCopy') copyImage($('#share').dataset.url);
  else if (id === 'shareText') { try { await navigator.clipboard.writeText(runSummary()); toast('Summary copied.', 'var(--ok)'); } catch (err) { toast(runSummary(), 'var(--muted)', true); } }
  else if (id === 'runCard') { const u = await makeRunCard(); showShare(u, 'Run card'); }
  else if (id === 'mPhoto') { resume(); setTimeout(enterPhoto, 50); }
});

// ================= photo mode =================
const PHOTO = { on: false, yaw: 0, pitch: 0.3, dist: 6, tx: 0, ty: 1.2, tz: 0, fov: 50, filter: 'natural', drag: null };
const FILTERS = {
  natural: null,
  warm: [[1.0, 0.9, 0.8], [1.12, 1.0, 0.82], 1.15, 0.35, 0.9, 1.0],
  cold: [[0.8, 0.92, 1.15], [0.92, 1.0, 1.12], 0.9, 0.4, 0.9, 1.0],
  noir: [[0.9, 0.9, 0.9], [1.05, 1.05, 1.05], 0.0, 0.6, 1.0, 0.95],
  vivid: [[0.92, 0.96, 1.05], [1.05, 1.0, 0.95], 1.45, 0.25, 0.8, 1.05],
};
function enterPhoto() {
  if (!started || P.dead || PHOTO.on) return;
  PHOTO.on = true; PHOTO.tx = P.x; PHOTO.tz = P.z; PHOTO.ty = 1.1;
  PHOTO.yaw = Math.atan2(camera.position.x - P.x, camera.position.z - P.z); PHOTO.dist = clamp(Math.hypot(camera.position.x - P.x, camera.position.z - P.z), 3, 14);
  PHOTO.pitch = 0.6; PHOTO.dist = 6; PHOTO.fov = 50; PHOTO.filter = 'natural';
  document.body.classList.add('photo'); mouseDown = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderPhotoBar(); $('#photo').hidden = false;
}
function exitPhoto() {
  if (!PHOTO.on) return;
  PHOTO.on = false; document.body.classList.remove('photo'); $('#photo').hidden = true;
  applyFilter('natural'); updateFov(); snapCamera();
}
function applyFilter(k) {
  PHOTO.filter = k;
  if (FILTERS[k]) Post.grade(...FILTERS[k]);
  else if (LV && LV.type === 'town') applyTimeOfDay(true);
  else Post.grade([0.88, 0.94, 1.12], [1.08, 1.0, 0.9], 1.06, 0.5, 1.0, 0.9);
  renderPhotoBar();
}
function renderPhotoBar() {
  $('#photo').innerHTML = `<div class="ph-in"><span class="ph-t">Photo mode</span><div class="ph-f">${Object.keys(FILTERS).map((k) => `<button type="button" class="tog${PHOTO.filter === k ? ' on' : ''}" data-ph="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
    <label class="ph-fov">Lens <input type="range" min="20" max="90" value="${PHOTO.fov}" id="phFov"></label>
    <div class="ph-a"><button class="btn" type="button" id="phShot">Capture</button><button class="btn ghost" type="button" id="phExit">Done</button></div>
    <span class="hint">Drag to orbit · wheel to zoom · WASD to move</span></div>`;
}
function updPhoto(dt) {
  const k = 4 * dt;
  if (keys.KeyW) { PHOTO.tx -= Math.sin(PHOTO.yaw) * k; PHOTO.tz -= Math.cos(PHOTO.yaw) * k; }
  if (keys.KeyS) { PHOTO.tx += Math.sin(PHOTO.yaw) * k; PHOTO.tz += Math.cos(PHOTO.yaw) * k; }
  if (keys.KeyA) { PHOTO.tx -= Math.cos(PHOTO.yaw) * k; PHOTO.tz += Math.sin(PHOTO.yaw) * k; }
  if (keys.KeyD) { PHOTO.tx += Math.cos(PHOTO.yaw) * k; PHOTO.tz -= Math.sin(PHOTO.yaw) * k; }
  if (keys.KeyQ) PHOTO.ty = Math.max(0.2, PHOTO.ty - k * 0.5); if (keys.KeyE) PHOTO.ty = Math.min(8, PHOTO.ty + k * 0.5);
  const cp = Math.cos(PHOTO.pitch);
  camera.position.set(PHOTO.tx + Math.sin(PHOTO.yaw) * cp * PHOTO.dist, PHOTO.ty + Math.sin(PHOTO.pitch) * PHOTO.dist, PHOTO.tz + Math.cos(PHOTO.yaw) * cp * PHOTO.dist);
  camera.lookAt(PHOTO.tx, PHOTO.ty, PHOTO.tz);
  if (camera.fov !== PHOTO.fov) { camera.fov = PHOTO.fov; camera.updateProjectionMatrix(); }
}
document.addEventListener('click', async (ev) => {
  const t = ev.target; if (!t) return;
  if (t.dataset && t.dataset.ph) applyFilter(t.dataset.ph);
  else if (t.id === 'phExit') exitPhoto();
  else if (t.id === 'phShot') { const u = captureFrame(); if (u) { sfx('page'); showShare(u, 'Photo'); } }
});
document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'phFov') PHOTO.fov = +ev.target.value; });
window.addEventListener('pointerdown', (ev) => { if (PHOTO.on && ev.target === renderer.domElement) PHOTO.drag = { x: ev.clientX, y: ev.clientY }; });
window.addEventListener('pointermove', (ev) => {
  if (!PHOTO.on || !PHOTO.drag) return;
  PHOTO.yaw -= (ev.clientX - PHOTO.drag.x) * 0.006; PHOTO.pitch = clamp(PHOTO.pitch + (ev.clientY - PHOTO.drag.y) * 0.005, -0.3, 1.45);
  PHOTO.drag = { x: ev.clientX, y: ev.clientY };
});
window.addEventListener('pointerup', () => { PHOTO.drag = null; });
window.addEventListener('wheel', (ev) => { if (PHOTO.on) PHOTO.dist = clamp(PHOTO.dist * (ev.deltaY > 0 ? 1.1 : 0.9), 1.2, 30); }, { passive: true });

// ================= seed codes (daily and shared rifts) =================
const MOD_L = { swift: 'S', brutal: 'B', horde: 'H', elite: 'E', glass: 'G', dark: 'L', volatile: 'V', drain: 'D', frenzy: 'F' };
const riftCode = (tier, mods, seed) => `HD-${tier}-${mods.map((m) => MOD_L[m]).join('')}-${(seed >>> 0).toString(36).toUpperCase()}`;
function parseRiftCode(code) {
  const m = String(code || '').trim().toUpperCase().match(/^HD-(\d{1,2})-([SBHEGLVDF]{1,3})-([0-9A-Z]{1,8})$/);
  if (!m) return null;
  const inv = Object.fromEntries(Object.entries(MOD_L).map(([k, v]) => [v, k]));
  const mods = [...new Set(m[2].split('').map((c) => inv[c]))];
  const tier = clamp(+m[1], 1, 30), seed = parseInt(m[3], 36) >>> 0;
  return seed ? { tier, mods, seed, code: riftCode(tier, mods, seed) } : null;
}
function dailyCode() {
  const d = new Date(), key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  let h = 2166136261; for (const c of key + 'daily') h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const seed = h >>> 0;
  return withSeed(seed, () => { const keys = Object.keys(RIFT_MODS), mods = []; while (mods.length < 2) { const q = pick(keys); if (!mods.includes(q)) mods.push(q); } return riftCode(4, mods, seed); });
}
