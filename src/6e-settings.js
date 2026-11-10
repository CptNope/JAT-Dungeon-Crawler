// ================= settings, accessibility, key bindings =================
const KB_DEFAULT = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'KeyJ', roll: 'Space', use: 'KeyE', potion: 'KeyQ', gpotion: 'KeyR', scroll: 'KeyT', skill1: 'Digit1', skill2: 'Digit2', skill3: 'Digit3', lock: 'Tab', unlock: 'KeyX', view: 'KeyV', bag: 'KeyI', talents: 'KeyK', codex: 'KeyC', photo: 'KeyP' };
const KB_NAMES = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Attack (hold)', roll: 'Roll', use: 'Use, open, talk', potion: 'Healing Draught', gpotion: 'Greater Draught', scroll: 'Portal Scroll', skill1: 'Skill 1', skill2: 'Skill 2', skill3: 'Skill 3', lock: 'Lock on / next', unlock: 'Release lock', view: 'Switch view', bag: 'Bag', talents: 'Talents', codex: 'Codex', photo: 'Photo mode' };
// keys that always work alongside the bindings (arrows move, shift rolls, F uses)
const KB_EXTRA = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ShiftLeft: 'roll', ShiftRight: 'roll', KeyF: 'use', KeyB: 'bag', KeyN: 'talents' };
const KB = Object.assign({}, KB_DEFAULT, SET.keys || {});
const keyAction = (code) => Object.keys(KB).find((a) => KB[a] === code) || KB_EXTRA[code] || null;
const held = (a) => !!keys[KB[a]] || Object.entries(KB_EXTRA).some(([c, x]) => x === a && keys[c]);
const keyLabel = (code) => (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Space', 'Space').replace('Arrow', '').replace('Left', ' left').replace('Right', ' right') || '—';
let rebinding = null;

// colour palettes: rarities and the enemy warning colour, readable for common kinds of colour blindness
const PALETTES = {
  default: { n: 'Default', r: ['#bdb7a7', '#74c269', '#5c8ff2', '#b56ff2', '#f19a33'], set: '#5fd38a', tele: 0xff3b2f },
  redgreen: { n: 'Red-green safe', r: ['#c8c4b8', '#56b4e9', '#f0e442', '#cc79a7', '#e69f00'], set: '#00c4a0', tele: 0xffd400 },
  blueyellow: { n: 'Blue-yellow safe', r: ['#c8c4b8', '#3fbf6f', '#ff6f91', '#b56ff2', '#ff8c1a'], set: '#2bd4c0', tele: 0xff2a6a },
};
let TELE_COL = 0xff3b2f;
function applyA11y() {
  const pal = PALETTES[SET.cb] || PALETTES.default, root = document.documentElement.style;
  pal.r.forEach((c, i) => { root.setProperty('--r' + i, c); RCOL[i] = new THREE.Color(c).getHex(); });
  root.setProperty('--set', pal.set); TELE_COL = pal.tele;
  document.body.classList.toggle('cb', SET.cb && SET.cb !== 'default');
  root.setProperty('--ui', String(SET.ui || 1));
  document.body.classList.toggle('calm', !!SET.motion);
}
const calm = () => !!SET.motion; // reduced motion: no shake, hit-stop, slow motion, lens kicks or flashes
function haptic(p) { if (SET.haptics !== false && touchMode && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(p); } catch (err) { /* unsupported */ } } }

// difficulty is per hero
const DIFF = {
  story: { n: 'Story', hp: 0.6, dmg: 0.55, xp: 1, mf: 0, d: 'Foes are much softer and you lose no gold when you fall. For the tale and the sights.' },
  normal: { n: 'Normal', hp: 1, dmg: 1, xp: 1, mf: 0, d: 'The deep as it was meant.' },
  hard: { n: 'Hard', hp: 1.4, dmg: 1.35, xp: 1.3, mf: 40, d: 'Tougher, harder-hitting foes; 30% more experience and 40% more magic find.' },
};
const diff = () => DIFF[(S && S.diff) || 'normal'];

function settingsHtml(tab) {
  const seg = (key, items, per) => `<div class="seg">${items.map(([v, n]) => `<button type="button" class="${String(per ? S[key] || 'normal' : SET[key]) === String(v) ? 'on' : ''}" data-act="${per ? 'sset' : 'gset'}" data-k="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const row = (t, d, c) => `<div class="row"><div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${c}</div>`;
  if (tab === 'access') {
    return `<div class="rows">${row('Colour palette', 'Rarity colours and the warning colour of enemy attacks. The non-default palettes also letter each item by rarity.', seg('cb', Object.entries(PALETTES).map(([k, p]) => [k, p.n])))}
      ${row('Interface size', 'Scales the HUD, menus and dialogue.', seg('ui', [[0.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger']]))}
      ${row('Reduce motion', 'Turns off screen shake, hit-stop, slow motion, lens kicks and lightning flashes.', seg('motion', [[false, 'Off'], [true, 'On']]))}
      ${row('Screen shake', '', seg('shake', [[true, 'On'], [false, 'Off']]))}
      ${row('Hints', 'First-time tips for new players.', seg('hints', [[true, 'On'], [false, 'Off']]))}
      ${row('Difficulty', `${esc(diff().d)} You can change this any time.`, seg('diff', Object.entries(DIFF).map(([k, q]) => [k, q.n]), true))}</div>`;
  }
  if (tab === 'keys') {
    return `<p class="hint" style="margin:0 0 10px">Choose an action, then press the key you want for it. Arrow keys, Shift and F keep working as well.</p><div class="keys">${Object.keys(KB_DEFAULT).map((a) => `<button type="button" class="keyb${rebinding === a ? ' on' : ''}" data-act="rebind" data-k="${a}"><span>${KB_NAMES[a]}</span><kbd>${rebinding === a ? 'Press a key…' : esc(keyLabel(KB[a]))}</kbd></button>`).join('')}</div>
      <div class="acts" style="margin-top:12px"><button class="btn ghost" type="button" data-act="kbReset">Reset to defaults</button></div>`;
  }
  return `<div class="rows">${row('View', '', seg('cam', [['top', 'Overhead'], ['third', 'Third person'], ['first', 'First person']]))}
    ${row('Graphics', '', seg('q', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]))}
    ${row('Battery saver', 'Caps the frame rate at 30 and keeps resolution low. Good for phones and long sessions.', seg('battery', [[false, 'Off'], [true, 'On']]))}
    ${row('Look speed', '', seg('sens', [[0.6, 'Slow'], [1, 'Normal'], [1.6, 'Fast']]))}
    ${row('Music', '', seg('music', [[true, 'On'], [false, 'Off']]))}
    ${row('Vibration', 'Short buzzes on hits, level-ups and big moments (phones that support it).', seg('haptics', [[true, 'On'], [false, 'Off']]))}
    ${row('Loot filter', 'Turns low items into Arcane Essence the moment you pick them up. Set and legendary items are always kept.', seg('filter', [['none', 'Keep all'], ['common', 'Salvage common'], ['uncommon', 'Salvage common and uncommon']], true))}</div>`;
}
function settingsAct(d) {
  switch (d.act) {
    case 'gset': {
      const k = d.k, v = d.v === 'true' ? true : d.v === 'false' ? false : isNaN(+d.v) ? d.v : +d.v;
      if (k === 'cam') { setCamMode(v); break; }
      if (k === 'q') { setQuality(v); break; }
      SET[k] = v; saveSettings();
      if (k === 'music' && musBus) musBus.gain.value = SET.music === false ? 0 : 0.5;
      if (k === 'battery') { if (v) setQuality('low'); perf.cap = v ? 1 : Math.min(window.devicePixelRatio || 1, Q.ratioCap); perf.ratio = Math.min(perf.ratio, perf.cap); renderer.setPixelRatio(perf.ratio); Post.setup(); }
      applyA11y(); break;
    }
    case 'sset': S[d.k] = d.v; if (d.k === 'diff') toast(`Difficulty: ${DIFF[d.v].n}`, 'var(--brass-2)'); save(); break;
    case 'rebind': rebinding = d.k; break;
    case 'kbReset': Object.assign(KB, KB_DEFAULT); SET.keys = {}; saveSettings(); rebinding = null; buildActionBar(); refreshKeyList(); break;
    default: return false;
  }
  return true;
}
// a key press while rebinding is captured here first
function captureRebind(ev) {
  if (!rebinding) return false;
  ev.preventDefault();
  if (ev.code !== 'Escape') {
    for (const a of Object.keys(KB)) if (KB[a] === ev.code && a !== rebinding) KB[a] = KB[rebinding]; // swap with whatever had it
    KB[rebinding] = ev.code; SET.keys = Object.assign({}, KB); saveSettings(); buildActionBar(); refreshKeyList();
  }
  rebinding = null; renderPanel(); return true;
}
function creditsHtml() {
  return `<div class="credits"><h3>Hearthdeep</h3><p>A JAT Dungeon Crawler by Jeremy Anderson (Jeremy Anderson Tech).</p>
    <h3>Built with</h3><p>three.js r186 · © 2010–2026 three.js authors · MIT licence</p><p>Fonts: IM Fell English SC, Alegreya Sans, Spline Sans Mono (SIL Open Font License), via Google Fonts</p><p>Every texture, model, sound and note of music is generated by the game's own code.</p>
    <h3>Thanks</h3><p>To everyone who answered the bell.</p></div>`;
}
