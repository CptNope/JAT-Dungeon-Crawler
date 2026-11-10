// ================= gamepad =================
// Standard mapping. In play: left stick moves, right stick aims (overhead) or looks (close views),
// A attack, B roll, X use, Y draught, LB/RB/LT skills, RT attack, R3 lock on, d-pad: up greater draught,
// down portal scroll, left cycle lock, right change view; Start menu, Back bag.
// In panels and menus: d-pad or left stick moves focus, A presses, B closes, LB/RB switch tabs.
const pad = { on: false, atk: false, aim: null, prev: [], navT: 0, idx: -1 };
const DEAD = 0.22;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
function padFocusables() {
  const root = !$('#dlg').hidden ? $('#dlg') : !$('#share').hidden ? $('#share') : !$('#ending').hidden ? $('#ending') : !$('#panel').hidden ? $('#panel') : !$('#title').hidden ? $('#title') : !$('#death').hidden ? $('#death') : PHOTO.on ? $('#photo') : null;
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
  let g = null; for (const q of gps) if (q && q.connected) { g = q; break; }
  if (!g) { if (pad.on) { pad.on = false; pad.atk = false; pad.aim = null; stick.x = stick.y = 0; } return; }
  const b = g.buttons.map((x) => x.pressed || x.value > 0.5), was = pad.prev, hit = (i) => b[i] && !was[i];
  const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
  const any = b.some(Boolean) || lx || ly || rx || ry;
  if (any && !pad.on) { pad.on = true; if (touchMode) setTouchMode(false); }
  if (!pad.on) { pad.prev = b; return; }
  const ui = !$('#panel').hidden || !$('#title').hidden || !$('#death').hidden || !$('#dlg').hidden || !$('#share').hidden || !$('#ending').hidden || PHOTO.on;
  if (ui) {
    pad.atk = false; stick.x = stick.y = 0;
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
  else if (rx || ry) { CAM.yaw -= rx * dt * 2.6 * SET.sens; CAM.pitch = clamp(CAM.pitch + ry * dt * 1.6 * SET.sens, -0.5, 1.1); }
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
window.addEventListener('gamepadconnected', () => toast('Controller connected', 'var(--ok)'));
document.addEventListener('click', (ev) => { if (ev.target && ev.target.id === 'hintOk') dismissHint(); });
