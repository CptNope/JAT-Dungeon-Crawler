// ================= gamepad =================
// Standard mapping. In play: left stick moves, right stick aims (overhead) or looks (close views),
// A attack, B roll, X use, Y draught, LB/RB/LT skills, RT attack, R3 lock on, d-pad: up greater draught,
// down portal scroll, left cycle lock, right change view; Start menu, Back bag.
// In panels and menus: d-pad or left stick moves focus, A presses, B closes, LB/RB switch tabs.
// Button names follow the controller in hand (Xbox, PlayStation or Nintendo), on the action bar, the interact prompt
// and the first-time hints. The controller rumbles on hits where the browser supports it.
const pad = { on: false, atk: false, aim: null, prev: [], navT: 0, idx: -1, kind: 'xbox', g: null, shown: '' };
const DEAD = 0.2;
// radial dead zone: the stick's direction is kept exactly, so diagonals do not snap to the axes
function dzStick(x, y) { const m = Math.hypot(x, y); if (m < DEAD) return [0, 0]; const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; return [x * k, y * k]; }
// names by standard-mapping button index; Nintendo pads report the same positions under different letters
const PAD_GLYPHS = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
  ps: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
  nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', 'Minus', 'Plus', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
};
const PAD_SHORT = { Cross: '✕', Circle: '○', Square: '□', Triangle: '△', 'D-pad up': '▲', 'D-pad down': '▼', 'D-pad left': '◀', 'D-pad right': '▶', Minus: '−', Plus: '+', View: 'View', Menu: 'Menu', Create: 'Create', Options: 'Opt' };
const padKindOf = (id) => (/054c|dualsense|dualshock|playstation|ps[345]/i.test(id) ? 'ps' : /057e|nintendo|switch|joy-?con/i.test(id) ? 'nintendo' : 'xbox');
const padGlyph = (i) => PAD_GLYPHS[pad.kind][i];
const padKey = (i) => PAD_SHORT[padGlyph(i)] || padGlyph(i); // the short form for key caps
const PAD_TOKENS = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, Back: 8, Start: 9 };
const padText = (str) => str.replace(/\{(\w+)\}/g, (m, k) => (k in PAD_TOKENS ? padGlyph(PAD_TOKENS[k]) : m)); // "{A} to attack" in the layout in hand
const PAD_SLOT = { atk: 0, dodge: 1, sk0: 4, sk1: 5, sk2: 6, pot: 3, gpot: 12, scroll: 13, bag: 8 };
function padLabels() { // key caps on the action bar and the interact prompt follow whichever input was used last
  const want = pad.on ? pad.kind : '';
  if (pad.shown === want && (!want || ($('#actionBar .slot') && $('#actionBar .slot').dataset.pad === want))) return;
  pad.shown = want; document.body.classList.toggle('pad', pad.on); nearI = undefined;
  if (hintT > 0 && hintCur && $('#hint')) hintDraw($('#hint'), hintCur);
  if (!want) { buildActionBar(); return; }
  document.querySelectorAll('#actionBar .slot').forEach((el) => { el.dataset.pad = want; const k = el.querySelector('.k'), i = PAD_SLOT[el.dataset.slot]; if (k && i !== undefined) k.textContent = padKey(i); });
}
function padRumble(p) { // p: milliseconds, or a [buzz, gap, buzz] pattern as navigator.vibrate takes
  const g = pad.g, act = g && g.vibrationActuator; if (!act || !act.playEffect) return;
  const ms = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p, peak = Array.isArray(p) ? Math.max(...p) : p;
  const strong = peak >= 100 ? 1 : peak >= 50 ? 0.7 : peak >= 30 ? 0.35 : 0, weak = peak >= 100 ? 0.8 : peak >= 50 ? 0.6 : 0.4;
  try { const r = act.playEffect('dual-rumble', { startDelay: 0, duration: Math.max(40, Math.min(400, ms * 1.6)), strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(() => {}); } catch (err) { /* unsupported */ }
}
function padRoot() { return OSK.el ? OSK.el : !$('#dlg').hidden ? $('#dlg') : !$('#share').hidden ? $('#share') : !$('#ending').hidden ? $('#ending') : !$('#panel').hidden ? $('#panel') : !$('#title').hidden ? $('#title') : !$('#death').hidden ? $('#death') : PHOTO.on ? $('#photo') : null; }
function padFocusables() {
  const root = padRoot();
  if (!root) return [];
  return [...root.querySelectorAll('button:not([disabled]), [data-act]:not([disabled]), input, textarea')].filter((b) => b.offsetParent !== null);
}
function padMove(dx, dy) { // spatial navigation: the nearest control in the pushed direction
  const list = padFocusables(); if (!list.length) return;
  const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { list[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const b of list) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2, vx = bx - ax, vy = by - ay;
    const along = vx * dx + vy * dy; if (along <= 4) continue;
    const across = Math.abs(vx * dy - vy * dx), score = along + across * 2.2;
    if (score < bs) { bs = score; best = b; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
}
function padTab(dir) {
  const tabs = [...document.querySelectorAll('#pTabs [data-tab]')]; if (!tabs.length) return;
  const i = tabs.findIndex((t) => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true');
  tabs[(i + dir + tabs.length) % tabs.length].click();
}
// ---- on-screen keyboard: A on a text field opens it, so codes and names can be typed without a keyboard ----
const OSK = { el: null, target: null, shift: false };
const OSK_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL-', "ZXCVBNM'.,"];
function oskOpen(input) {
  if (OSK.el) oskClose(false);
  OSK.target = input; OSK.shift = !input.value || /code/i.test(input.id + ' ' + input.className); // names start with a capital; codes are read in either case
  const el = document.createElement('div'); el.id = 'osk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'On-screen keyboard');
  document.body.appendChild(el); OSK.el = el; oskDraw();
  const first = el.querySelector('[data-osk="Q"], [data-osk="q"]'); if (first) first.focus();
}
function oskDraw(keep) {
  const t = OSK.target, v = t.value, c = (ch) => (OSK.shift ? ch : ch.toLowerCase());
  OSK.el.innerHTML = `<div class="osk-in"><div class="osk-v" aria-live="polite">${esc(v) || `<i>${esc(t.getAttribute('placeholder') || t.getAttribute('aria-label') || 'Type here')}</i>`}<b></b></div>
    ${OSK_ROWS.map((r) => `<div class="osk-r">${[...r].map((ch) => `<button type="button" data-osk="${esc(c(ch))}">${esc(c(ch))}</button>`).join('')}</div>`).join('')}
    <div class="osk-r"><button type="button" data-osk="shift" class="${OSK.shift ? 'on' : ''}">Shift <kbd>${esc(padKey(10))}</kbd></button><button type="button" data-osk="space" class="wide">Space <kbd>${esc(padKey(3))}</kbd></button><button type="button" data-osk="back">Delete <kbd>${esc(padKey(2))}</kbd></button><button type="button" data-osk="done" class="btn">Done <kbd>${esc(padKey(9))}</kbd></button></div></div>`;
  if (keep) { const b = OSK.el.querySelector(`[data-osk="${CSS.escape(keep)}"]`) || OSK.el.querySelector(`[data-osk="${CSS.escape(keep.toUpperCase())}"]`) || OSK.el.querySelector(`[data-osk="${CSS.escape(keep.toLowerCase())}"]`); if (b) b.focus(); }
}
function oskKey(k) {
  const t = OSK.target; if (!t) return;
  const max = t.maxLength > 0 ? t.maxLength : 4000;
  if (k === 'done') { oskClose(true); return; }
  if (k === 'shift') OSK.shift = !OSK.shift;
  else if (k === 'back') t.value = t.value.slice(0, -1);
  else if (t.value.length < max) { t.value += k === 'space' ? ' ' : k; if (OSK.shift && t.value.length === 1 && !/code/i.test(t.id + ' ' + t.className)) OSK.shift = false; } // names drop to lower case after the first letter; code boxes stay in capitals
  if (k !== 'shift') t.dispatchEvent(new Event('input', { bubbles: true }));
  sfx('page'); oskDraw(k);
}
function oskClose(commit) {
  const t = OSK.target, el = OSK.el; OSK.el = null; OSK.target = null; if (el) el.remove();
  if (t && document.contains(t)) { if (commit) t.dispatchEvent(new Event('change', { bubbles: true })); if (document.contains(t)) t.focus(); }
}
document.addEventListener('click', (ev) => { const b = ev.target && ev.target.closest && ev.target.closest('[data-osk]'); if (b && OSK.el) oskKey(b.dataset.osk); });
// ---- photo mode: fly, orbit, zoom, lens and filters without a mouse ----
function padPhoto(g, b, hit, lx, ly, rx, ry, dt) {
  const k = 5 * dt;
  PHOTO.tx += (Math.cos(PHOTO.yaw) * lx + Math.sin(PHOTO.yaw) * ly) * k; PHOTO.tz += (-Math.sin(PHOTO.yaw) * lx + Math.cos(PHOTO.yaw) * ly) * k;
  PHOTO.yaw -= rx * dt * 2.2 * SET.sens; PHOTO.pitch = clamp(PHOTO.pitch + (SET.padInvY ? -ry : ry) * dt * 1.5 * SET.sens, -0.3, 1.45);
  const lt = g.buttons[6] ? g.buttons[6].value : 0, rt = g.buttons[7] ? g.buttons[7].value : 0;
  PHOTO.ty = clamp(PHOTO.ty + (rt - lt) * k * 0.6, 0.2, 8);
  if (b[4]) PHOTO.dist = clamp(PHOTO.dist * (1 + dt * 1.4), 1.2, 30); if (b[5]) PHOTO.dist = clamp(PHOTO.dist * (1 - dt * 1.4), 1.2, 30);
  const fov = (b[12] ? -1 : 0) + (b[13] ? 1 : 0); if (fov) { PHOTO.fov = clamp(PHOTO.fov + fov * dt * 30, 20, 90); const r = $('#phFov'); if (r) r.value = PHOTO.fov; }
  if (hit(14) || hit(15)) { const ks = Object.keys(FILTERS), i = ks.indexOf(PHOTO.filter); applyFilter(ks[(i + (hit(15) ? 1 : ks.length - 1)) % ks.length]); renderPhotoBar(); }
  if (hit(0)) { const u = captureFrame(); if (u) { sfx('page'); showShare(u, 'Photo'); } }
  if (hit(1) || hit(9)) exitPhoto();
}
const padPhotoHelp = () => `Sticks move and orbit · ${padGlyph(4)} / ${padGlyph(5)} zoom · ${padGlyph(6)} / ${padGlyph(7)} lower and raise · D-pad: lens and filter · ${padGlyph(0)} capture · ${padGlyph(1)} done`;
// the element a stick should scroll: the nearest scrolling box around the focused control, else the panel body
function padScroller(root) {
  for (let n = document.activeElement; n && n !== document.body && root.contains(n); n = n.parentElement) if (n.scrollHeight > n.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
  return [root.querySelector('#pBody'), root.querySelector('.share-in'), root.querySelector('.over-in'), root].find((n) => n && n.scrollHeight > n.clientHeight + 4) || null;
}
const ZOOMS = [1, 0.72, 1.3]; // overhead: default, close, far
function pollPad(dt) {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  // with several controllers plugged in, the one touched most recently plays
  let g = null; for (const q of gps) if (q && q.connected && (!g || (q.mapping === 'standard' && g.mapping !== 'standard') || (q.mapping === g.mapping && q.timestamp > g.timestamp))) g = q;
  if (!g) { if (pad.on) { pad.on = false; pad.atk = false; pad.aim = null; pad.g = null; stick.x = stick.y = 0; padLabels(); } return; }
  const b = g.buttons.map((x) => x.pressed || x.value > 0.5), was = pad.prev, hit = (i) => b[i] && !was[i];
  const [lx, ly] = dzStick(g.axes[0] || 0, g.axes[1] || 0), [rx, ry] = dzStick(g.axes[2] || 0, g.axes[3] || 0);
  const any = b.some(Boolean) || lx || ly || rx || ry;
  if (any && !pad.on) { pad.on = true; if (touchMode) setTouchMode(false); }
  if (!pad.on) { pad.prev = b; return; }
  pad.g = g; pad.kind = padKindOf(g.id || ''); padLabels();
  const ui = !$('#panel').hidden || !$('#title').hidden || !$('#death').hidden || !$('#dlg').hidden || !$('#share').hidden || !$('#ending').hidden || PHOTO.on;
  if (PHOTO.on && $('#share').hidden && !OSK.el) { pad.atk = false; stick.x = stick.y = 0; padPhoto(g, b, hit, lx, ly, rx, ry, dt); pad.prev = b; return; }
  if (ui) {
    pad.atk = false; stick.x = stick.y = 0;
    if (OSK.el) { // typing: X deletes, Y is space, L3 shifts, Start finishes, B cancels
      if (hit(2)) oskKey('back'); if (hit(3)) oskKey('space'); if (hit(10)) oskKey('shift'); if (hit(9)) oskKey('done');
      if (hit(1)) { oskClose(false); pad.prev = b; return; }
    }
    if (ry) { const sc = padScroller(padRoot() || document.body); if (sc) sc.scrollTop += ry * dt * 900; }
    const root = padRoot(); if (root && !root.contains(document.activeElement)) { const l = padFocusables(); if (l[0]) l[0].focus({ preventScroll: true }); }
    pad.navT -= dt;
    let mx = (b[15] ? 1 : 0) - (b[14] ? 1 : 0), my = (b[13] ? 1 : 0) - (b[12] ? 1 : 0);
    if (!mx && !my && (Math.abs(lx) > 0.5 || Math.abs(ly) > 0.5)) { if (Math.abs(lx) > Math.abs(ly)) mx = Math.sign(lx); else my = Math.sign(ly); }
    if ((mx || my) && pad.navT <= 0) { padMove(mx, my); pad.navT = was.some(Boolean) && pad.navT > -0.05 ? 0.12 : 0.28; }
    if (!mx && !my) pad.navT = 0;
    if (hit(0)) { const f = document.activeElement; if (f && !OSK.el && ((f.tagName === 'INPUT' && (!f.type || f.type === 'text' || f.type === 'search')) || (f.tagName === 'TEXTAREA' && !f.readOnly))) oskOpen(f); else if (f && f !== document.body && f.click) f.click(); else { const l = padFocusables(); if (l[0]) l[0].focus(); } }
    if (hit(1) && OSK.el) { /* handled above */ } else if (hit(1)) { if (!$('#dlg').hidden) dlgNext(); else if (!$('#share').hidden) $('#share').hidden = true; else if (PHOTO.on) exitPhoto(); else if (!$('#panel').hidden) closePanel(); else if (!$('#title').hidden && started) resume(); }
    if (!OSK.el) { if (hit(4)) padTab(-1); if (hit(5)) padTab(1); }
    if (hit(9) && !OSK.el && !$('#title').hidden && started) resume();
    pad.prev = b; return;
  }
  // in play
  stick.x = lx; stick.y = ly;
  pad.atk = b[0] || b[7];
  if (SET.cam === 'top') pad.aim = rx || ry ? Math.atan2(rx, ry) : null;
  else if (rx || ry) { CAM.yaw -= rx * dt * 2.6 * SET.sens; CAM.pitch = clamp(CAM.pitch + (SET.padInvY ? -ry : ry) * dt * 1.6 * SET.sens, -0.5, 1.1); }
  if (hit(1)) tryDodge();
  if (hit(2)) interact();
  if (hit(3)) usePotion(false);
  if (hit(12)) usePotion(true);
  if (hit(13)) useScroll();
  if (hit(4)) useSkill(0); if (hit(5)) useSkill(1); if (hit(6)) useSkill(2);
  if (hit(11)) cycleLock();
  if (hit(14)) { if (lockT) releaseLock(); else cycleLock(); } // d-pad left: lock on, or let go
  if (hit(10)) { // L3: answer an on-screen offer if there is one, otherwise step the camera in and out
    const offer = document.querySelector('#toasts .toast.dare button');
    if (offer) offer.click();
    else if (SET.cam === 'top') { camZoom = ZOOMS[(ZOOMS.findIndex((z) => Math.abs(z - camZoom) < 0.06) + 1) % ZOOMS.length]; toast(camZoom < 1 ? 'Camera: close' : camZoom > 1 ? 'Camera: far' : 'Camera: default', 'var(--muted)'); }
    else if (SET.cam === 'third') { CAM.dist = CAM.dist < 4 ? 5.5 : CAM.dist < 7 ? 8.5 : 3; }
  }
  if (hit(15)) cycleCam();
  if (hit(9)) showTitle();
  if (hit(8)) openPanel('bag');
  pad.prev = b;
}
window.addEventListener('gamepadconnected', (ev) => { const k = padKindOf((ev.gamepad && ev.gamepad.id) || ''); toast(`Controller connected (${k === 'ps' ? 'PlayStation' : k === 'nintendo' ? 'Nintendo' : 'Xbox'} layout)`, 'var(--ok)'); });
// a controller that drops out mid-fight (flat battery, lost signal) pauses the game instead of leaving the hero standing
window.addEventListener('gamepaddisconnected', () => { if (OSK.el) oskClose(false); if (!pad.on) return; pad.on = false; pad.atk = false; pad.aim = null; pad.g = null; stick.x = stick.y = 0; padLabels(); toast('Controller disconnected', 'var(--bad)'); if (started && !isPaused()) showTitle(); });
// picking the keyboard or mouse back up returns the key caps and hints to keys
const padYield = () => { if (pad.on) { pad.on = false; pad.atk = false; pad.aim = null; padLabels(); } };
window.addEventListener('keydown', (ev) => { if (ev.isTrusted !== false) padYield(); }, true);
window.addEventListener('mousedown', padYield, true);
document.addEventListener('click', (ev) => { if (ev.target && ev.target.id === 'hintOk') dismissHint(); });
