// ================= first-time hints =================
// Each fires once per hero. Touch and gamepad players get their own wording for controls.
const HINTS = {
  move: { k: 'Getting around', d: 'WASD to move, mouse to aim. Walk to the glowing gate at the south of town to begin a descent.', t: 'Left stick to move. Walk to the glowing gate at the south of town to begin a descent.', p: 'Left stick to move, right stick to aim. Walk to the glowing gate at the south of town.' },
  fight: { k: 'Fight', d: 'Click (or hold) to attack. Space rolls through danger, and you cannot be hit mid-roll.', t: 'Hold Strike to attack; it aims for you. Roll through danger.', p: 'A to attack, B to roll. You cannot be hit mid-roll.' },
  loot: { k: 'Loot', d: 'Walk over drops to pick them up. Press I to open your bag and compare gear.', t: 'Walk over drops to pick them up. The bag button shows and compares your gear.', p: 'Walk over drops to pick them up. Back opens your bag.' },
  potion: { k: 'Low health', d: 'Press Q to drink a Healing Draught (R for a Greater one).', t: 'Tap the red flask to drink a Healing Draught.', p: 'Y drinks a Healing Draught.' },
  level: { k: 'Level up', d: 'Every level gives a talent point. Press K to spend it.', t: 'Every level gives a talent point. Open the bag and choose Talents.', p: 'Every level gives a talent point. Back opens your bag; Talents is the last tab.' },
  skill: { k: 'New skill', d: 'A new skill is ready on the action bar. Press its number key.', t: 'A new skill button has lit up by your thumb.', p: 'Skills are on LB, RB and LT.' },
  stairs: { k: 'Going deeper', d: 'Stairs lead down; each depth is harder and richer. Read a Portal Scroll (T) to go home with your loot.', t: 'Stairs lead down. The scroll button opens a way home.', p: 'Stairs lead down. D-pad down reads a Portal Scroll.' },
  boss: { k: 'Boss', d: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.', t: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.', p: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.' },
  home: { k: 'Back home', d: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.', t: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.', p: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.' },
  gem: { k: 'Gems', d: 'Gems go into sockets at your Home, on the Workshop tab.', t: 'Gems go into sockets at your Home, on the Workshop tab.', p: 'Gems go into sockets at your Home, on the Workshop tab.' },
  set: { k: 'Set item', d: 'Set pieces (green) grant bonuses when you wear two or three of the same set.', t: 'Set pieces (green) grant bonuses when you wear two or three of the same set.', p: 'Set pieces (green) grant bonuses when you wear two or three of the same set.' },
  rift: { k: 'Rifts', d: 'Rifts are three-floor trials with modifiers. Beat the clock for shards to spend at the caravan.', t: 'Rifts are three-floor trials with modifiers. Beat the clock for shards.', p: 'Rifts are three-floor trials with modifiers. Beat the clock for shards.' },
};
let hintQ = [], hintT = 0;
function hint(id) {
  if (!S || !S.hints || S.hints[id] || SET.hints === false || !HINTS[id]) return;
  S.hints[id] = 1;
  if (!hintQ.includes(id)) hintQ.push(id);
}
function updHints(dt) {
  const el = $('#hint'); if (!el) return;
  el.classList.toggle('hold', isPaused()); // menus and panels take the stage
  if (LV && LV.type === 'dungeon' && RUN && RUN.kills >= 12) hint('stairs');
  if (hintT > 0) { if (performance.now() > hintT) { hintT = 0; el.classList.remove('on'); } return; }
  if (!hintQ.length || isPaused()) return;
  const h = HINTS[hintQ.shift()], txt = pad.on ? h.p : touchMode ? h.t : h.d;
  el.innerHTML = `<b>${esc(h.k)}</b><span>${esc(txt)}</span><button type="button" class="btn ghost sm" id="hintOk">Got it</button>`;
  el.classList.add('on'); hintT = performance.now() + 7500;
}
function dismissHint() { hintT = 1; }

// ================= level up =================
let slowT = 0; // boss-kill slow motion
function levelUpFx(from, to) {
  const unlocked = SKILLS.filter((k) => k.lvl > from && k.lvl <= to);
  const pillar = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd890).multiplyScalar(2.2), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  pillar.scale.set(1.4, 14, 1.4); pillar.position.set(P.x, 7, P.z); world.add(pillar); levelDisp.push(pillar.material);
  fxLife.push({ m: pillar, t: 1.3, T: 1.3, kind: 'pillar' });
  ringFx(P.x, P.z, 0.4, 4.5, 0.5, 0xffd890, 3); ringFx(P.x, P.z, 0.2, 2.8, 0.4, 0xfff2c8, 2.4);
  for (let k = 0; k < 3; k++) burst(P.x, 0.4 + k * 0.8, P.z, 0xf2c56b, 14, 5, 0.16);
  const gains = [`+${(to - from) * 14} health`, `${to - from} talent point${to - from > 1 ? 's' : ''}`];
  if (unlocked.length) gains.push(`new skill: ${unlocked.map((k) => k.n).join(', ')}`);
  banner(`Level ${to}`, gains.join(' · '));
  hint('level'); if (unlocked.length) hint('skill');
}
const fxLife = [];
function updFxLife(dt) {
  for (let i = fxLife.length - 1; i >= 0; i--) {
    const f = fxLife[i]; f.t -= dt;
    const k = clamp(f.t / f.T, 0, 1);
    if (f.kind === 'pillar') { f.m.material.opacity = 0.55 * k; f.m.scale.x = f.m.scale.z = 1.4 * (0.4 + 0.6 * k); if (f.follow) f.m.position.set(P.x, 7, P.z); }
    if (f.t <= 0) { world.remove(f.m); fxLife.splice(i, 1); }
  }
}

// ================= stat deltas for gear comparison =================
const dpsOf = (s) => s.dmg * (1 + (Math.min(75, s.crit) / 100) * (s.critd / 100)) * (1 + s.aspd / 100) / WEAPONS[s.wk].cd;
function gearDelta(it) {
  const sl = it.slot, prev = S.equip[sl];
  const a = calcStats(); S.equip[sl] = it; const b = calcStats(); S.equip[sl] = prev;
  const rows = [
    ['Damage per second', dpsOf(a), dpsOf(b), 0], ['Max health', a.maxHp, b.maxHp, 0], ['Armor', a.armor, b.armor, 0],
    ['Critical chance', a.crit, b.crit, 1, '%'], ['Critical damage', a.critd, b.critd, 0, '%'], ['Attack speed', a.aspd, b.aspd, 0, '%'],
    ['Move speed', a.move, b.move, 0, '%'], ['Life steal', a.ls, b.ls, 1, '%'], ['Health per second', a.regen, b.regen, 1],
    ['Magic find', a.mf, b.mf, 0, '%'], ['Gold found', a.gold, b.gold, 0, '%'],
  ];
  const out = rows.filter((r) => Math.abs(r[2] - r[1]) > (r[3] ? 0.05 : 0.5)).map(([n, x, y, dp, u]) => {
    const d = y - x, up = d > 0;
    return `<li class="${up ? 'up' : 'dn'}"><span>${n}</span><b>${up ? '▲' : '▼'} ${up ? '+' : '−'}${dp ? Math.abs(d).toFixed(1) : fmt(Math.abs(d))}${u || ''}</b></li>`;
  });
  return out.length ? `<div class="delta"><div class="hint">If you equip this</div><ul>${out.join('')}</ul></div>` : '<div class="delta"><div class="hint">If you equip this: no change to your stats.</div></div>';
}

// ================= boss dressing =================
// Every biome's boss gets its own silhouette on top of its base body: crowns, horns, halos, gears, tentacles.
function bossDress(g, id, h) {
  const add = (geo, m, sx, sy, sz, x, y, z, rot) => { const q = mesh(geo, m, sx, sy, sz, x, y, z); if (rot) q.rotation.set(rot[0], rot[1], rot[2]); g.add(q); return q; };
  const orbit = (n, r, y, make, spin) => { const o = new THREE.Group(); o.position.y = y; o.userData.spin = spin || 0.8; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, p = make(k); p.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); o.add(p); } g.add(o); spinners.push(o); return o; };
  const glow = (c, i) => mat(c, i || 2.6);
  switch (id) {
    case 'crypt': {
      const bone = mat(0xe8e0c8), dark = mat(0x1a1420);
      add(G.box, mat(0x3a2448), 0.9, 1.1, 0.06, 0, h * 0.62, -0.32, [0.12, 0, 0]);
      for (let k = 0; k < 5; k++) add(G.cone4, glow(0xf2d07a, 2.2), 0.08, 0.3, 0.08, (k - 2) * 0.11, h + 0.2, 0.02);
      orbit(3, 0.95, h * 0.75, () => { const s = new THREE.Group(); s.add(mesh(G.sph, bone, 0.2, 0.2, 0.2, 0, 0, 0), mesh(G.box, dark, 0.05, 0.05, 0.03, -0.05, 0.02, 0.09), mesh(G.box, dark, 0.05, 0.05, 0.03, 0.05, 0.02, 0.09)); return s; }, 0.9);
      break;
    }
    case 'fungal': {
      add(G.sph, mat(0xc0402e), 1.15, 0.5, 1.15, 0, h + 0.18, 0);
      for (let k = 0; k < 7; k++) { const a = k * 0.9; add(G.sph, mat(0xf4ecd8), 0.13, 0.08, 0.13, Math.sin(a) * 0.38, h + 0.36, Math.cos(a) * 0.38); }
      for (const s of [-1, 1]) add(G.sph, glow(0x9aff6a, 2.4), 0.26, 0.26, 0.26, s * 0.42, h * 0.72, -0.05);
      break;
    }
    case 'magma': {
      const horn = mat(0x2a1a14);
      for (const s of [-1, 1]) { add(G.cone4, horn, 0.12, 0.55, 0.12, s * 0.22, h + 0.12, 0.02, [0.3, 0, -s * 0.7]); add(G.cone4, horn, 0.08, 0.3, 0.08, s * 0.42, h + 0.38, 0.1, [0.9, 0, -s * 0.2]); }
      for (let k = 0; k < 4; k++) add(G.box, glow(0xff7a2a, 3.2), 0.05, 0.3, 0.02, (k - 1.5) * 0.14, h * 0.55, 0.3, [0, 0, (k - 1.5) * 0.4]);
      orbit(4, 1.0, h * 0.5, () => mesh(G.ico, glow(0xff8a3a, 2.8), 0.14, 0.14, 0.14, 0, 0, 0), 1.4);
      break;
    }
    case 'frost': {
      const ice = glow(0x9fd8ff, 1.8);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; add(G.oct, ice, 0.09, 0.42 + (k % 2) * 0.2, 0.09, Math.sin(a) * 0.22, h + 0.24, Math.cos(a) * 0.22); }
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(G.oct, ice, 0.1, 0.32, 0.1, s * (0.42 + k * 0.06), h * 0.82 + k * 0.08, -0.02 + (k - 1) * 0.1, [0, 0, -s * 0.5]);
      break;
    }
    case 'void': {
      const halo = orbit(1, 0, h + 0.35, () => { const t = mesh(G.fullTorus, glow(0xc08cff, 3), 0.55, 0.55, 0.55, 0, 0, 0); t.rotation.x = Math.PI / 2; return t; }, 0.5);
      halo.rotation.x = 0.25;
      add(G.sph, glow(0xffe0ff, 3.4), 0.3, 0.3, 0.16, 0, h * 0.62, 0.3);
      orbit(5, 1.1, h * 0.4, () => mesh(G.oct, glow(0x8a5aff, 2.6), 0.1, 0.22, 0.1, 0, 0, 0), -0.7);
      break;
    }
    case 'drowned': {
      const flesh = mat(0x3a8a8a);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(G.cone4, flesh, 0.14, 0.7, 0.14, Math.sin(a) * 0.4, 0.22, Math.cos(a) * 0.4, [Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1]); }
      for (let k = 0; k < 5; k++) add(G.cyl, mat(0xff8a8a), 0.06, 0.32 + (k % 2) * 0.16, 0.06, (k - 2) * 0.12, h + 0.18, 0, [0, 0, (k - 2) * 0.25]);
      orbit(6, 1.05, 0.5, () => mesh(G.sph, glow(0x9affe8, 2.2), 0.08, 0.08, 0.08, 0, 0, 0), 0.6);
      break;
    }
    case 'clock': {
      const brass = metal(0xd0a050, 0.35);
      // a gear spins about its own axle: the holder turns the axle to point backwards, the gear turns about it
      for (const [x, y, r, sp] of [[-0.25, h * 0.75, 0.32, 1.2], [0.28, h * 0.62, 0.22, -1.7]]) {
        const p = new THREE.Group(); p.position.set(x, y, -0.36); p.rotation.x = Math.PI / 2; g.add(p);
        const gg = new THREE.Group(); gg.userData.spin = sp; p.add(gg); spinners.push(gg);
        gg.add(mesh(G.cyl, brass, r * 2, 0.08, r * 2, 0, 0, 0));
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const t = mesh(G.box, brass, 0.1, 0.08, 0.12, Math.sin(a) * r, 0, Math.cos(a) * r); t.rotation.y = a; gg.add(t); }
      }
      for (const s of [-1, 1]) add(G.cyl, metal(0x5a4a3a, 0.4), 0.12, 0.5, 0.12, s * 0.2, h + 0.15, -0.18);
      add(G.sph, glow(0x7af0ff, 3), 0.24, 0.24, 0.24, 0, h * 0.6, 0.3);
      break;
    }
    case 'blood': {
      const bark = mat(0x8a6248);
      for (const s of [-1, 1]) { add(G.box, bark, 0.12, 1.0, 0.12, s * 0.3, h + 0.4, 0, [0, 0, -s * 0.45]); add(G.box, bark, 0.09, 0.55, 0.09, s * 0.7, h + 0.75, 0.05, [0.4, 0, -s * 1.1]); add(G.box, bark, 0.09, 0.5, 0.09, s * 0.52, h + 1.0, -0.05, [-0.3, 0, -s * 0.1]); add(G.box, bark, 0.07, 0.4, 0.07, s * 0.2, h + 0.95, 0.05, [0, 0, s * 0.5]); }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; add(G.cone4, mat(0x2a1a14), 0.05, 0.22, 0.05, Math.sin(a) * 0.24, h + 0.08, Math.cos(a) * 0.24, [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6]); }
      add(G.sph, glow(0xff3a5a, 3.2), 0.26, 0.3, 0.2, 0, h * 0.62, 0.28);
      break;
    }
    default: for (let k = 0; k < 7; k++) add(G.cone4, mat(0xf2c56b, 2.5), 0.1, 0.36, 0.1, Math.sin(k * 0.9) * 0.24, h + 0.16, Math.cos(k * 0.9) * 0.24);
  }
}
