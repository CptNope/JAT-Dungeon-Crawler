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
function padRoot() { return !$('#dlg').hidden ? $('#dlg') : !$('#share').hidden ? $('#share') : !$('#ending').hidden ? $('#ending') : !$('#panel').hidden ? $('#panel') : !$('#title').hidden ? $('#title') : !$('#death').hidden ? $('#death') : PHOTO.on ? $('#photo') : null; }
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
  if (ui) {
    pad.atk = false; stick.x = stick.y = 0;
    const root = padRoot(); if (root && !root.contains(document.activeElement)) { const l = padFocusables(); if (l[0]) l[0].focus({ preventScroll: true }); }
    pad.navT -= dt;
    let mx = (b[15] ? 1 : 0) - (b[14] ? 1 : 0), my = (b[13] ? 1 : 0) - (b[12] ? 1 : 0);
    if (!mx && !my && (Math.abs(lx) > 0.5 || Math.abs(ly) > 0.5)) { if (Math.abs(lx) > Math.abs(ly)) mx = Math.sign(lx); else my = Math.sign(ly); }
    if ((mx || my) && pad.navT <= 0) { padMove(mx, my); pad.navT = was.some(Boolean) && pad.navT > -0.05 ? 0.12 : 0.28; }
    if (!mx && !my) pad.navT = 0;
    if (hit(0)) { const f = document.activeElement; if (f && f !== document.body && f.click) f.click(); else { const l = padFocusables(); if (l[0]) l[0].focus(); } }
    if (hit(1)) { if (!$('#dlg').hidden) dlgNext(); else if (!$('#share').hidden) $('#share').hidden = true; else if (PHOTO.on) exitPhoto(); else if (!$('#panel').hidden) closePanel(); else if (!$('#title').hidden && started) resume(); }
    if (hit(4)) padTab(-1); if (hit(5)) padTab(1);
    if (hit(9) && !$('#title').hidden && started) resume();
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
  if (hit(11) || hit(14)) cycleLock();
  if (hit(15)) cycleCam();
  if (hit(9)) showTitle();
  if (hit(8)) openPanel('bag');
  pad.prev = b;
}
window.addEventListener('gamepadconnected', (ev) => { const k = padKindOf((ev.gamepad && ev.gamepad.id) || ''); toast(`Controller connected (${k === 'ps' ? 'PlayStation' : k === 'nintendo' ? 'Nintendo' : 'Xbox'} layout)`, 'var(--ok)'); });
// a controller that drops out mid-fight (flat battery, lost signal) pauses the game instead of leaving the hero standing
window.addEventListener('gamepaddisconnected', () => { if (!pad.on) return; pad.on = false; pad.atk = false; pad.aim = null; pad.g = null; stick.x = stick.y = 0; padLabels(); toast('Controller disconnected', 'var(--bad)'); if (started && !isPaused()) showTitle(); });
// picking the keyboard or mouse back up returns the key caps and hints to keys
const padYield = () => { if (pad.on) { pad.on = false; pad.atk = false; pad.aim = null; padLabels(); } };
window.addEventListener('keydown', (ev) => { if (ev.isTrusted !== false) padYield(); }, true);
window.addEventListener('mousedown', padYield, true);
document.addEventListener('click', (ev) => { if (ev.target && ev.target.id === 'hintOk') dismissHint(); });
