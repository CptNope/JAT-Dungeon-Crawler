// ================= seeded randomness (weekly rift) =================
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function withSeed(seed, fn) { const orig = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = orig; } }
const seededLevel = (fn) => (RUN && RUN.rift && RUN.rift.seed ? withSeed(RUN.rift.seed + RUN.rift.floor * 7919, fn) : fn());

// ================= rift trials =================
const RIFT_MODS = {
  swift: { n: 'Swift', d: 'Foes move 30% faster' },
  brutal: { n: 'Brutal', d: 'Foes hit 40% harder' },
  horde: { n: 'Horde', d: '40% more foes' },
  elite: { n: 'Elite', d: 'Three times as many champions' },
  glass: { n: 'Glass', d: 'You and your foes deal double damage' },
  dark: { n: 'Lightless', d: 'Your lantern reaches half as far' },
  volatile: { n: 'Volatile', d: 'Slain foes burst a moment later' },
  drain: { n: 'Draining', d: 'No health regeneration; draughts heal half' },
  frenzy: { n: 'Frenzied', d: 'Wounded foes enrage, moving and hitting harder' },
};
const RIFT_FLOORS = 3;
const riftDepth = (t) => 2 + 3 * t;
const riftPar = (t) => 210 + 8 * t;
const riftMod = (k) => !!(RUN && RUN.rift && RUN.rift.mods.includes(k));
const riftMax = () => Math.max(1, (S.rift && S.rift.max) || 1);
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function weekKey() { const d = new Date(), j = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const w = Math.ceil(((d - j) / 864e5 + j.getUTCDay() + 1) / 7); return `${d.getUTCFullYear()}-W${w}`; }
function weeklyDef() {
  const k = weekKey(); let h = 2166136261; for (const c of k) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const seed = h >>> 0;
  return withSeed(seed, () => { const keys = Object.keys(RIFT_MODS), mods = []; while (mods.length < 3) { const m = pick(keys); if (!mods.includes(m)) mods.push(m); } return { key: k, seed, tier: 6, mods }; });
}
function startRift(t, weekly, coded) {
  let mods, seed = 0;
  if (coded) { t = coded.tier; mods = coded.mods; seed = coded.seed; }
  else if (weekly) { const W = weeklyDef(); t = W.tier; mods = W.mods; seed = W.seed; }
  else { const n = t >= 10 ? 3 : t >= 4 ? 2 : 1, keys = Object.keys(RIFT_MODS); mods = []; while (mods.length < n) { const m = pick(keys); if (!mods.includes(m)) mods.push(m); } }
  startDelve(riftDepth(t), [], { mode: 'rift', rift: { tier: t, mods, floor: 1, t0: performance.now(), par: riftPar(t), weekly: !!weekly, seed, code: coded ? coded.code : null } });
  hint('rift');
  banner(weekly ? 'Weekly Rift' : coded ? 'Seeded rift' : `Rift tier ${t}`, mods.map((m) => RIFT_MODS[m].n).join(' · '));
}
const riftTime = () => (RUN && RUN.rift ? ((RUN.rift.end || performance.now()) - RUN.rift.t0) / 1000 : 0);
function riftStairs(x, z) { // the last floor's exit is a sealed rift until its guardian falls
  const g = new THREE.Group();
  g.add(mesh(G.fullTorus, mat(0xb07aff, 3.6), 1.1, 1.4, 1.1, 0, 1.5, 0));
  const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(1.05, 1.35, 1); disc.position.y = 1.5; g.add(disc);
  g.position.set(x, 0, z); world.add(g); facers.push(g);
  addInteract({ x, z, r: 1.8, kind: 'portal', label: 'Rift seal', ly: 3.2, cls: '', verb: 'Close the rift', act: () => {
    if (!RUN.rift.done) { toast('The Rift Guardian still stands.', 'var(--bad)'); return; }
    returnToTown(false);
  } });
}
function riftGuardian(r) {
  const [x, z] = [r.x + r.w / 2 + 1.5, r.y + r.h / 2];
  const e = spawnEnemy(pick(['brute', 'warden', 'caster']), x, z, { leader: true });
  e.name = 'Rift Guardian'; e.riftGuard = 1; e.hp = e.maxHp = e.maxHp * 2.2; e.dmg *= 1.15; e.scale *= 1.15; e.mesh.scale.setScalar(e.scale);
  if (e.label) e.label.el.textContent = e.name;
  e.u.uRim.value.setRGB(0.5, 0.25, 0.9);
}
function riftComplete(e) {
  const R = RUN.rift; if (R.done) return;
  R.done = true; R.end = performance.now();
  const secs = riftTime(), fast = secs <= R.par, t = R.tier;
  const shards = (2 + t * 2) * (fast ? 2 : 1);
  S.shards = (S.shards || 0) + shards;
  S.rift = S.rift || { max: 1, best: {} };
  if (fast && !R.weekly && !R.code) S.rift.max = Math.max(S.rift.max || 1, t + 1);
  S.rift.cleared = Math.max(S.rift.cleared || 0, t);
  if (!S.rift.best[t] || secs < S.rift.best[t]) S.rift.best[t] = secs;
  if (R.code) { S.seedBest = S.seedBest || {}; if (!S.seedBest[R.code] || secs < S.seedBest[R.code]) S.seedBest[R.code] = secs; }
  if (R.weekly) { const k = weeklyDef().key; if (!S.weekly || S.weekly.key !== k) S.weekly = { key: k, best: null, tries: 0 }; if (!S.weekly.best || secs < S.weekly.best) S.weekly.best = secs; }
  stat('rifts');
  gainXP(80 * t + 40);
  addChest(e.x, e.z, true);
  slowT = 1; shake(0.6); sfx('quest');
  banner(fast ? 'Rift sealed in time' : 'Rift sealed', `${fmtClock(secs)} · +${shards} rift shards${fast && !R.weekly ? ` · tier ${t + 1} unlocked` : ''}`);
}

// ================= the pit (endless arena) =================
const arenaDepthBase = () => Math.max(1, (S.best || 1) - 2);
function startArena() {
  startDelve(arenaDepthBase(), [], { mode: 'arena', arena: { wave: 0, rest: 3.5, base: arenaDepthBase(), exit: null } });
  banner('The Pit', 'Survive the waves. Leave between them to keep what you earned.');
}
function genArena(depth) {
  const W = 40, H = 40, g = new Uint8Array(W * H);
  const room = { x: 7, y: 7, w: 26, h: 26 };
  for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) {
    const dx = i + 0.5 - 20, dz = j + 0.5 - 20; if (dx * dx + dz * dz < 13.2 * 13.2) g[j * W + i] = 1; // round floor
  }
  for (const [px, py] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) g[(20 + py) * W + 20 + px] = 0;
  return { type: 'dungeon', depth, boss: false, pit: true, w: W, h: H, g, rooms: [room], arena: room, exitRoom: room, start: { x: 20.5, z: 26.5 }, explored: new Uint8Array(W * H).fill(1) };
}
function arenaSpot() {
  for (let t = 0; t < 60; t++) {
    const a = rand(0, 6.28), r = rand(7, 12), x = 20 + Math.sin(a) * r, z = 20 + Math.cos(a) * r;
    if (walkable(x, z) && walkable(x + 0.5, z) && walkable(x - 0.5, z) && Math.hypot(x - P.x, z - P.z) > 6) return [x, z];
  }
  return [20, 13];
}
function arenaWave() {
  const A = RUN.arena; A.wave++;
  RUN.depth = A.base + Math.floor((A.wave - 1) / 2);
  const d = RUN.depth, pool = Object.entries(ARCH).filter(([, a]) => d >= a.from && a.ai !== 'totem').map(([k, a]) => [k, a.w]);
  const n = Math.min(22, 4 + Math.round(A.wave * 1.6));
  for (let k = 0; k < n; k++) { const [x, z] = arenaSpot(); const e = spawnEnemy(wpick(pool), x, z, { champ: A.wave >= 4 && chance(0.06 + A.wave * 0.01) }); e.awake = true; }
  if (A.wave % 5 === 0) { const [x, z] = arenaSpot(); const L = spawnEnemy(pick(['brute', 'warden']), x, z, { leader: true }); L.awake = true; if (A.wave % 10 === 0) { L.name = 'Pit Champion'; L.hp = L.maxHp = L.maxHp * 2.5; L.scale *= 1.2; L.mesh.scale.setScalar(L.scale); if (L.label) L.label.el.textContent = L.name; } }
  if (A.exit) { A.exit.i.dead = true; world.remove(A.exit.g); A.exit = null; } // the interact loop drops it and its label
  banner(`Wave ${A.wave}`, `${n + (A.wave % 5 === 0 ? 1 : 0)} foes · depth ${d}`); sfx('ambush'); ringFx(20, 20, 2, 14, 0.6, 0xff6a3a, 2.6);
}
function arenaCleared() {
  const A = RUN.arena, w = A.wave;
  const gold = Math.round(12 * w * Math.pow(1.08, RUN.depth)); S.gold += gold; RUN.gold += gold;
  gainXP(20 * w * (1 + 0.15 * RUN.depth));
  if (w % 5 === 0) { addChest(20, 20, w % 10 === 0); S.shards = (S.shards || 0) + Math.floor(w / 5); toast(`+${Math.floor(w / 5)} rift shards`, '#b07aff'); }
  S.arenaBest = Math.max(S.arenaBest || 0, w);
  A.rest = 7; toast(`Wave ${w} cleared · +${fmt(gold)} gold`, 'var(--brass-2)', true); sfx('quest');
  // a way out between waves
  const g = new THREE.Group(); g.add(mesh(G.fullTorus, mat(0x6ab0ff, 3.4), 0.92, 1.25, 0.92, 0, 1.32, 0)); const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(0.88, 1.2, 1); disc.position.y = 1.32; g.add(disc);
  g.position.set(20.5, 0, 31); world.add(g); facers.push(g);
  A.exit = { g, i: addInteract({ x: 20.5, z: 31, r: 1.6, kind: 'portal', label: 'Leave the Pit', ly: 3, cls: '', verb: `Leave with wave ${w} won`, act: () => returnToTown(false) }) };
}
function updArena(dt) {
  if (!RUN || !RUN.arena || P.dead) return;
  const A = RUN.arena, alive = enemies.some((e) => !e.dead);
  if (A.wave > 0 && !alive && A.rest <= 0) arenaCleared();
  if (!alive) { A.rest -= dt; if (A.rest <= 0 && (A.wave === 0 || A.exit)) arenaWave(); }
}

// ================= the caravan =================
const CARAVAN_SPOT = { x: 39.5, z: 16.5 };
function rollCaravan() {
  const il = Math.max(1, S.best || 1), st = [];
  for (let k = 0; k < 2; k++) st.push({ item: makeSetItem(il), price: { shards: 12 + Math.floor(il / 3) } });
  const L = genItem(il, { rarity: 4 }); st.push({ item: L, price: { gold: Math.round(L.value * 9) } });
  st.push({ item: genItem(il + 2, { rarity: 3, sock: 2 }), price: { shards: 6 } });
  for (const g of ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'].sort(() => Math.random() - 0.5).slice(0, 3)) st.push({ gem: gemKey(g, il >= 20 ? 3 : 2), price: { gold: il >= 20 ? 2400 : 700 } });
  st.push({ cache: 1, price: { shards: 4 } });
  return { stock: st, until: S.runs + 2 };
}
function caravanHere() {
  if (S.caravan && S.caravan.until >= S.runs) return true;
  if (S.runs >= 2 && (chance(0.35) || ((S.shards || 0) >= 8 && !S.caravanSeen))) { S.caravan = rollCaravan(); S.caravanSeen = 1; return true; }
  S.caravan = null; return false;
}
function buildCaravan(grp) {
  const { x, z } = CARAVAN_SPOT, W = worldMats();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7a3a6a, roughness: 0.9, side: THREE.DoubleSide });
  grp.add(mesh(G.box, W.timber, 3.0, 0.5, 1.6, x, 0.85, z));
  const cover = mesh(G.cyl, cloth, 1.7, 2.9, 1.7, x, 1.1, z); cover.rotation.z = Math.PI / 2; cover.scale.set(1.6, 2.9, 1.7); grp.add(cover);
  for (const [dx, dz] of [[-1, -0.85], [1, -0.85], [-1, 0.85], [1, 0.85]]) { const w = mesh(G.cyl, W.timber, 0.9, 0.12, 0.9, x + dx, 0.45, z + dz); w.rotation.x = Math.PI / 2; grp.add(w); }
  grp.add(mesh(G.box, W.timber, 1.6, 0.08, 0.08, x - 2.2, 0.6, z));
  for (const k of [-0.6, 0, 0.6]) grp.add(mesh(G.box, mat(pick([0xe0aa50, 0xb07aff, 0x5fd38a])), 0.4, 0.4, 0.4, x + k, 1.3, z + 1.0));
  grp.add(mesh(G.cyl, W.iron, 0.06, 2.6, 0.06, x + 1.6, 1.3, z - 0.9), mesh(G.box, mat(0xffc878, 3.4), 0.2, 0.26, 0.2, x + 1.6, 2.6, z - 0.9));
  for (let i = -2; i <= 1; i++) for (let j = -1; j <= 0; j++) markSolid(x + i + 0.5, z + j + 0.5);
}
function spawnCaravan() {
  if (!S.caravan) return;
  const cr = makeCreature('villager', 0x7a3a6a, 0x1a1a1a); cr.mats.forEach((m) => levelDisp.push(m));
  cr.g.position.set(37.4, 0, 18.4); cr.g.rotation.y = -0.6; world.add(cr.g);
  addInteract({ x: 37.4, z: 18.4, r: 1.8, kind: 'npc', label: 'Sabine · Caravan', ly: 2.4, cls: 'npc', verb: 'Browse the caravan', act: () => openPanel('caravan') });
}
function caravanHtml() {
  const C = S.caravan; if (!C) return '<p class="hint">The caravan has moved on.</p>';
  const price = (p) => (p.shards ? `${p.shards} rift shards` : `${fmt(p.gold)} gold`);
  const can = (p) => (p.shards ? (S.shards || 0) >= p.shards : S.gold >= p.gold);
  const rows = C.stock.map((s, i) => {
    if (s.sold) return '';
    const what = s.item ? `<div class="t ${s.item.set ? 'set' : 'r' + s.item.rarity}">${esc(s.item.name)}<small>${s.item.set ? 'Set' : RAR[s.item.rarity].n} ${esc(typeName(s.item))}, item level ${s.item.il}</small></div>${s.item.set ? `<div class="d">${esc(SETS[s.item.set].n)}</div>` : s.item.power ? `<div class="d">${esc(legendOf(s.item).desc)}</div>` : `<div class="d">${s.item.sock} sockets</div>`}`
      : s.gem ? `<div class="t" style="color:${GEMS[gemSplit(s.gem)[0]].c}">${esc(gemName(s.gem))}</div><div class="d">${esc(gemLine(s.gem))}</div>`
      : '<div class="t">Sealed cache<small>a gamble</small></div><div class="d">A Rare, Epic or (rarely) Legendary item from somewhere far away.</div>';
    return `<div class="row"><div>${what}<div class="costs"><span class="cost${can(s.price) ? '' : ' no'}">${price(s.price)}</span></div></div><div class="acts">${s.item ? `<button class="btn ghost sm" type="button" data-act="cvLook" data-i="${i}">Inspect</button>` : ''}<button class="btn" type="button" data-act="cvBuy" data-i="${i}"${can(s.price) && (!s.item && !s.cache || S.inv.length < BAG_CAP) ? '' : ' disabled'}>Buy</button></div></div>`;
  }).join('');
  const look = Panel.cvLook !== undefined && C.stock[Panel.cvLook] && C.stock[Panel.cvLook].item && !C.stock[Panel.cvLook].sold ? itemCard(C.stock[Panel.cvLook].item, S.equip[C.stock[Panel.cvLook].item.slot]) + gearDelta(C.stock[Panel.cvLook].item) : '';
  return `<div class="purse-row"><span><b>${fmt(S.gold)}</b> gold</span><span><b style="color:#b07aff">${S.shards || 0}</b> rift shards</span><span>Here for ${Math.max(0, C.until - S.runs + 1)} more descent${C.until - S.runs ? 's' : ''}</span></div>
    <p class="hint" style="margin:0 0 12px">"Things from the far roads. Shards from the rifts spend as well as gold, better even."</p><div class="two"><div class="rows">${rows || '<p class="hint">Sold out.</p>'}</div><div>${look}</div></div>`;
}
function caravanBuy(i) {
  const s = S.caravan && S.caravan.stock[i]; if (!s || s.sold) return;
  const p = s.price;
  if (p.shards) { if ((S.shards || 0) < p.shards) return; S.shards -= p.shards; } else { if (S.gold < p.gold) return; S.gold -= p.gold; }
  if (s.item) { S.inv.push(s.item); toast(`Bought ${s.item.name}`, s.item.set ? 'var(--set)' : `var(--r${s.item.rarity})`); if (s.item.set) stat('sets'); }
  else if (s.gem) { S.gems[s.gem] = (S.gems[s.gem] || 0) + 1; toast(`Bought ${gemName(s.gem)}`, GEMS[gemSplit(s.gem)[0]].c); }
  else { const it = lootItem(Math.max(1, S.best || 1) + 1, { min: 2, mf: 150 }); S.inv.push(it); toast(`The cache held ${it.name}`, it.set ? 'var(--set)' : `var(--r${it.rarity})`, true); }
  s.sold = true; Panel.cvLook = undefined; sfx('buy');
}

// ================= delve panel tabs for the modes =================
function riftHtml() {
  const mx = riftMax(), t = Math.min(Panel.riftT || mx, mx), W = weeklyDef(), wk = S.weekly && S.weekly.key === W.key ? S.weekly : null;
  const best = (S.rift && S.rift.best) || {};
  return `<div class="purse-row"><span><b style="color:#b07aff">${S.shards || 0}</b> rift shards</span><span>Highest tier unlocked: ${mx}</span><span>Three floors · beat the par time to unlock the next tier and double the shards</span></div>
    <div class="rows">
    <div class="row"><div><div class="t">Rift Trial<small>tier ${t} · depth ${riftDepth(t)} · par ${fmtClock(riftPar(t))}${best[t] ? ` · best ${fmtClock(best[t])}` : ''}</small></div>
      <div class="d">Random modifiers each attempt (${t >= 10 ? 3 : t >= 4 ? 2 : 1} at this tier). The third floor's seal opens when its guardian falls. No way home but a scroll.</div>
      <div class="tierpick">${Array.from({ length: mx }, (_, i) => i + 1).slice(-12).map((k) => `<button class="tog${k === t ? ' on' : ''}" type="button" data-act="riftT" data-t="${k}">${k}</button>`).join('')}</div></div>
      <button class="btn" type="button" data-act="rift">Open tier ${t}</button></div>
    <div class="row"><div><div class="t">Weekly Rift<small>${W.key} · same floors for everyone this week · tier ${W.tier}</small></div>
      <div class="d">${W.mods.map((m) => `<b>${RIFT_MODS[m].n}</b>: ${RIFT_MODS[m].d}`).join('<br>')}</div>${wk && wk.best ? `<div class="d" style="color:var(--ok)">Your best this week: ${fmtClock(wk.best)}</div>` : ''}</div>
      <button class="btn" type="button" data-act="weekly">Enter</button></div>
    <div class="row"><div><div class="t">Daily seed<small>today's floors, the same for anyone with the code</small></div>${(() => { const c = dailyCode(), p = parseRiftCode(c), b = S.seedBest && S.seedBest[c]; return `<div class="d"><code>${c}</code> · tier ${p.tier} · ${p.mods.map((m) => RIFT_MODS[m].n).join(', ')}${b ? ` · <span style="color:var(--ok)">your best ${fmtClock(b)}</span>` : ''}</div><div class="acts"><button class="btn ghost sm" type="button" data-act="copyCode" data-code="${c}">Copy code</button></div>`; })()}</div>
      <button class="btn" type="button" data-act="daily">Enter</button></div>
    <div class="row"><div><div class="t">Play a code<small>a friend's rift, floor for floor</small></div><input id="seedIn" class="code-in" type="text" placeholder="HD-4-SB-1A2B3C" autocomplete="off" spellcheck="false"><div class="hint" id="seedMsg"></div></div>
      <button class="btn ghost" type="button" data-act="seedGo">Play</button></div>
    </div>`;
}
function pitHtml() {
  return `<div class="purse-row"><span>Best wave: <b>${S.arenaBest || 0}</b></span><span>Starts at depth ${arenaDepthBase()}</span><span>No gold is lost if you fall in the Pit</span></div>
    <div class="rows"><div class="row"><div><div class="t">The Pit<small>endless waves</small></div><div class="d">Waves grow larger and deeper; a pack leader every fifth wave and a Pit Champion every tenth. Gold and experience after each wave, a chest and rift shards every fifth. A way out opens between waves.</div></div><button class="btn" type="button" data-act="pit">Enter the Pit</button></div></div>`;
}
