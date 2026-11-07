// ================= skills =================
// each class brings its own three skills (see CLASSES); this array is refilled when the class is set
const SKILLS = [];
function setClassSkills() {
  SKILLS.length = 0;
  clsOf().skills.forEach((id, i) => SKILLS.push(Object.assign({ id, key: String(i + 1), lvl: SKILL_LVL[i] }, SKILL_DEFS[id])));
}
const skillCdOf = (s) => s.cd * (1 - (ST ? ST.cdr : 0) / 100);
const skillCd = [0, 0, 0];
Object.assign(P, { spinT: 0, dashT: 0, dashDir: 0, dashHit: new Set(), spinTicks: 0 });
function useSkill(i) {
  const s = SKILLS[i];
  if (!s || P.dead || isPaused() || !LV) return;
  if (S.level < s.lvl) { toast(`${s.n} unlocks at level ${s.lvl}.`, 'var(--muted)'); return; }
  if (skillCd[i] > 0 || P.dodgeT > 0 || P.dashT > 0 || P.spinT > 0 || P.leapT > 0) return;
  if (classSkill(s) === false) return; // nothing to aim at, or no room to land
  skillCd[i] = Math.random() * 100 < 10 * tal('overflow') ? 0.4 : skillCdOf(s);
  if (skillCd[i] < 1) floatNum(P.x, 2.2, P.z, 'Overflow', 'xp');
  stat('skills');
  P.atkT = Math.max(P.atkT, 0.15); P.pend = null;
  if (s.id === 'whirl') {
    P.spinT = 0.46; P.spinTicks = 0; P.iframes = Math.max(P.iframes, 0.12);
    sfx('whirl');
  } else if (s.id === 'dash') {
    const mv = Math.hypot(P.mx || 0, P.mz || 0) > 0.2;
    P.dashDir = mv ? Math.atan2(P.mx, P.mz) : P.face; P.face = P.dashDir;
    P.dashT = 0.2; P.iframes = Math.max(P.iframes, 0.34); P.dashHit.clear();
    burst(P.x, 0.6, P.z, 0x9a7aff, 14, 3, 0.16); sfx('dash');
  } else if (s.id === 'nova') {
    ringFx(P.x, P.z, 0.5, 5.0, 0.38, 0xff7a2a, 3.2); ringFx(P.x, P.z, 0.3, 3.6, 0.3, 0xffd06a, 2.4);
    for (let k = 0; k < 3; k++) burst(P.x, 0.4, P.z, k ? 0xff7a2a : 0xffd06a, 18, 9, 0.22, 2.2);
    const n = hitAround(5.0, 2.5 * ST.skillM, 7, (e) => { e.burnT = 3; e.burnD = ST.dmg * 0.4 * ST.burnM; });
    shake(0.55); addHitStop(n ? 0.09 : 0.03); sfx('nova');
  }
}
function hitAround(radius, mult, kb, extra) {
  let n = 0;
  if (!LV || LV.type !== 'dungeon') return 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > radius + e.r) continue;
    const r = rollDmg(e); damageEnemy(e, r.d * mult, r.crit, kb, dx / (d || 1), dz / (d || 1), true);
    if (extra && !e.dead) extra(e);
    n++;
  }
  return n;
}
function dashHits() {
  if (!LV || LV.type !== 'dungeon') return;
  burst(P.x, 0.9, P.z, 0x7a5aff, 3, 1, 0.18, 1.8);
  for (const e of enemies) {
    if (e.dead || P.dashHit.has(e.id)) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > e.r + 1.1) continue;
    P.dashHit.add(e.id);
    const side = Math.sin(P.dashDir) * dz - Math.cos(P.dashDir) * dx > 0 ? 1 : -1; // knock foes aside, out of the lane
    const r = rollDmg(e); damageEnemy(e, r.d * 2 * ST.skillM, r.crit, 5, Math.cos(P.dashDir) * side, -Math.sin(P.dashDir) * side, true);
    addHitStop(0.03); shake(0.15);
  }
}
function updSkills(dt) {
  for (let i = 0; i < 3; i++) skillCd[i] = Math.max(0, skillCd[i] - dt);
  updClassSkills(dt);
  if (P.spinT > 0) {
    P.spinT -= dt;
    const due = P.spinT < 0.38 && P.spinTicks === 0 ? 1 : P.spinT < 0.12 && P.spinTicks === 1 ? 2 : 0;
    if (due) { P.spinTicks = due; ringFx(P.x, P.z, 0.6, 3.0, 0.22, 0xfff2c8, 2); const n = hitAround(2.9, 0.85 * ST.skillM, 3.5); if (n) { addHitStop(0.04); shake(0.2); } }
  }
}

// ================= spike traps =================
// Iron plates that rattle, glow, then fire spikes. They hurt anything standing on them, foes included.
const G_SPIKES = (() => { const parts = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = new THREE.ConeGeometry(0.07, 0.5, 6); c.translate(i * 0.27, 0.25, j * 0.27); parts.push(c); } return mergeGeos(parts); })();
let trapClock = 0;
function placeTraps() {
  const L = LV, d = L.depth, st = L.rooms[0], er = L.exitRoom;
  const n = Math.min(14, 3 + Math.floor(d / 2));
  const inRoom = (i, j, r, pad) => i >= r.x - pad && i < r.x + r.w + pad && j >= r.y - pad && j < r.y + r.h + pad;
  const cands = [];
  for (let j = 1; j < L.h - 1; j++) for (let i = 1; i < L.w - 1; i++) {
    if (L.g[j * L.w + i] !== 1 || inRoom(i, j, st, 2) || inRoom(i, j, er, 0)) continue;
    if (interacts.some((o) => Math.abs(o.x - (i + 0.5)) < 1.5 && Math.abs(o.z - (j + 0.5)) < 1.5)) continue;
    const corridor = !L.rooms.some((r) => inRoom(i, j, r, 0));
    cands.push({ i, j, w: corridor ? 3 : 1 });
  }
  const traps = [];
  for (let k = 0; k < n && cands.length; k++) {
    const c = wpick(cands.map((q) => [q, q.w]));
    cands.splice(cands.indexOf(c), 1);
    if (traps.some((t) => Math.abs(t.x - c.i - 0.5) + Math.abs(t.z - c.j - 0.5) < 3)) continue;
    traps.push({ x: c.i + 0.5, z: c.j + 0.5, ph: rand(0, 3.2), was: 0 });
  }
  L.traps = traps;
  if (!traps.length) return;
  const W = worldMats();
  L.trapPlates = instanced(G.box, W.iron, traps.map((t) => ({ x: t.x, y: 0.02, z: t.z, sx: 0.92, sy: 0.04, sz: 0.92 })), { keep: true });
  L.trapSpikes = instanced(G_SPIKES, metal(0xb8c0c8, 0.3), traps.map((t) => ({ x: t.x, y: -0.6, z: t.z, sx: 1, sy: 1, sz: 1 })), { keep: true, cast: true });
  L.trapSpikes.frustumCulled = false; // instances move, so skip the stale all-instance bound
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3a2a).multiplyScalar(2.4), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  L.trapGlow = instanced(G.tile, glow, traps.map((t) => ({ x: t.x, y: 0.05, z: t.z, sx: 0.001, sy: 1, sz: 0.001 })));
  L.trapGlow.frustumCulled = false;
}
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3();
function updTraps(dt) {
  const L = LV; if (!L.traps || !L.traps.length) return;
  trapClock += dt;
  const d = L.depth, dmg = 9 * Math.pow(1.105, d - 1) * (1 + cycleOf(d) * 0.8);
  let dirty = false;
  L.traps.forEach((t, i) => {
    const near = Math.abs(t.x - P.x) < 24 && Math.abs(t.z - P.z) < 24;
    const c = (trapClock + t.ph) % 3.2, state = c < 2.0 ? 0 : c < 2.55 ? 1 : 2;
    if (state === 2 && t.was !== 2) { // spikes fire
      if (Math.abs(P.x - t.x) < 0.62 && Math.abs(P.z - t.z) < 0.62 && !P.dead) { hurtPlayer(dmg, null); burst(P.x, 0.4, P.z, 0xd04030, 8, 3, 0.12); }
      for (const e of enemies) if (!e.dead && Math.abs(e.x - t.x) < 0.6 + e.r * 0.4 && Math.abs(e.z - t.z) < 0.6 + e.r * 0.4) damageEnemy(e, dmg * 1.6, false, 0, 0, 0, false);
      if (near && Math.hypot(t.x - P.x, t.z - P.z) < 9) sfx('trap');
    }
    t.was = state;
    if (!near) return;
    const y = state === 2 ? -0.5 + Math.min(1, (c - 2.55) / 0.05) * 0.5 : state === 1 ? -0.5 + Math.abs(Math.sin(c * 60)) * 0.04 : -0.6;
    _tm.compose(_tp.set(t.x, y, t.z), _tq, _ts.set(1, 1, 1)); L.trapSpikes.setMatrixAt(i, _tm);
    const gs = state === 1 ? 0.8 + Math.sin(c * 30) * 0.12 : 0.001;
    _tm.compose(_tp.set(t.x, 0.05, t.z), _tq, _ts.set(gs, 1, gs)); L.trapGlow.setMatrixAt(i, _tm);
    dirty = true;
  });
  if (dirty) { L.trapSpikes.instanceMatrix.needsUpdate = true; L.trapGlow.instanceMatrix.needsUpdate = true; }
}

// ================= shrines and cursed altars =================
const SHRINES = {
  fury: { n: 'Shrine of Fury', d: '+30% damage', col: 0xff5a3a },
  stone: { n: 'Shrine of Stone', d: '+50% armor', col: 0xa8b8d0 },
  fortune: { n: 'Shrine of Fortune', d: '+60% magic find and +50% gold', col: 0xf2c56b },
  haste: { n: 'Shrine of Haste', d: '+20% move and attack speed', col: 0x7fe0ff },
  life: { n: 'Shrine of Life', d: 'Full health, then 2% health per second', col: 0x6ae08a },
};
let _altarFlame = null, _portalFlame = null;
function altarFlameMat() { if (!_altarFlame) { _altarFlame = flameMat.clone(); _altarFlame.uniforms.tSoft.value = TEX.soft; _altarFlame.uniforms.uCol.value.set(0xb04aff); } return _altarFlame; }
function portalFlameMat() { if (!_portalFlame) { _portalFlame = flameMat.clone(); _portalFlame.uniforms.tSoft.value = TEX.soft; _portalFlame.uniforms.uCol.value.set(0x4a8aff); } return _portalFlame; }
function roomCenterSpot(r) {
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
  for (let t = 0; t < 30; t++) { const x = cx + rand(-1, 1) * Math.min(1.5, t * 0.1), z = cz + rand(-1, 1) * Math.min(1.5, t * 0.1); if (walkable(x + 0.8, z) && walkable(x - 0.8, z) && walkable(x, z + 0.8) && walkable(x, z - 0.8)) return [x, z]; }
  return [cx, cz];
}
function placeSpecialRooms(vault) {
  const L = LV, d = L.depth;
  if (d < 2) return;
  const free = L.rooms.slice(1).filter((r) => r !== L.exitRoom && r !== vault && r.w >= 5 && r.h >= 5);
  if (free.length && chance(0.55)) { const r = free.splice(randi(0, free.length - 1), 1)[0]; addShrine(...roomCenterSpot(r)); }
  if (free.length && d >= 3 && chance(0.4)) { const r = free.splice(randi(0, free.length - 1), 1)[0]; addAltar(...roomCenterSpot(r)); }
}
function addShrine(x, z) {
  const kind = pick(Object.keys(SHRINES)), sh = SHRINES[kind], W = worldMats();
  const g = new THREE.Group();
  g.add(mesh(G.cyl, W.stone, 1.5, 0.25, 1.5, 0, 0.12, 0), mesh(G.taper, W.stone, 0.6, 1.0, 0.6, 0, 0.75, 0), mesh(G.cyl, W.stone, 0.9, 0.12, 0.9, 0, 1.3, 0));
  const crystal = mesh(G.oct, mat(sh.col, 3.2), 0.36, 0.6, 0.36, 0, 1.85, 0); crystal.userData.spin = 1.2; g.add(crystal);
  g.add(makeFlames([[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([a, b]) => ({ x: a, y: 0.3, z: b }))));
  for (const [a, b] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) g.add(mesh(G.cyl, mat(0xe8dcc0), 0.1, 0.3, 0.1, a, 0.15, b));
  g.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
  g.position.set(x, 0, z); world.add(g); spinners.push(crystal);
  markSolid(x, z);
  addInteract({ x, z, r: 1.7, kind: 'shrine', label: sh.n, ly: 2.6, cls: '', verb: `Pray at the ${sh.n}`, act(o) {
    o.dead = true; RUN.shrine = kind;
    crystal.material = mat(0x3a3a44); crystal.userData.spin = 0.2;
    const before = ST.maxHp; ST = calcStats(); P.hp = Math.min(ST.maxHp, P.hp + Math.max(0, ST.maxHp - before));
    if (kind === 'life') P.hp = ST.maxHp;
    ringFx(x, z, 0.5, 4, 0.5, sh.col, 3); burst(x, 1.8, z, sh.col, 30, 5, 0.18, 2.4);
    banner(sh.n, sh.d + ' on this floor'); sfx('shrine');
  } });
}
function markSolid(x, z) { const i = Math.floor(x), j = Math.floor(z); if (LV.g[j * LV.w + i] === 1) LV.g[j * LV.w + i] = 3; }
function addAltar(x, z) {
  const W = worldMats(), g = new THREE.Group();
  g.add(mesh(G.box, mat(0x2a2430), 1.7, 0.7, 1.0, 0, 0.35, 0), mesh(G.box, mat(0x3a3040), 1.9, 0.12, 1.2, 0, 0.76, 0));
  g.add(mesh(G.sph, BONE, 0.4, 0.38, 0.42, 0, 1.0, 0), mesh(G.box, SOCKET, 0.1, 0.08, 0.04, -0.08, 1.02, 0.2), mesh(G.box, SOCKET, 0.1, 0.08, 0.04, 0.08, 1.02, 0.2));
  for (const s of [-1, 1]) g.add(mesh(G.cone4, mat(0x2a2430), 0.2, 1.4, 0.2, s * 1.1, 0.7, 0));
  g.add(makeFlames([{ x: -1.1, y: 1.45, z: 0 }, { x: 1.1, y: 1.45, z: 0 }, { x: 0, y: 1.25, z: 0 }], altarFlameMat()));
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; g.add(mesh(G.box, mat(0xb04aff, 2.6), 0.08, 0.02, 0.3, Math.cos(a) * 2.2, 0.02, Math.sin(a) * 2.2)); g.children[g.children.length - 1].rotation.y = -a; }
  g.position.set(x, 0, z); world.add(g);
  markSolid(x, z);
  addInteract({ x, z, r: 1.8, kind: 'altar', label: 'Cursed altar', ly: 2.4, cls: 'lead', verb: 'Disturb the cursed altar', act(o) {
    o.dead = true; RUN.ambush = { x, z, wave: 0, waves: 3, delay: 0.6 };
    banner('Ambush!', 'Survive three waves'); sfx('ambush'); setMusic('boss'); shake(0.4);
  } });
}
function spawnWave() {
  const A = RUN.ambush, d = RUN.depth, w = A.wave;
  const pool = Object.entries(ARCH).filter(([, a]) => d >= a.from).map(([k, a]) => [k, a.w]);
  const n = 3 + Math.floor(d / 4) + w;
  for (let k = 0; k < n; k++) {
    let x = A.x, z = A.z;
    for (let t = 0; t < 20; t++) { const a = rand(0, 6.28), r = rand(2.6, 5); x = A.x + Math.sin(a) * r; z = A.z + Math.cos(a) * r; if (walkable(x, z) && walkable(x + 0.4, z) && walkable(x, z + 0.4)) break; }
    if (!walkable(x, z)) continue;
    const e = spawnEnemy(wpick(pool), x, z, { champ: w === 2 && k === 0, leader: w === 2 && k === 1 && d >= 8 });
    e.awake = true; e.ambush = true; e.cd = rand(0.6, 1.4);
    burst(x, 0.5, z, 0xb04aff, 10, 3, 0.16, 2);
  }
  ringFx(A.x, A.z, 0.5, 5.5, 0.5, 0xb04aff, 3);
  toast(`Wave ${w + 1} of ${A.waves}`, 'var(--r3)');
}
function updAmbush(dt) {
  const A = RUN && RUN.ambush; if (!A) return;
  if (A.delay > 0) { A.delay -= dt; if (A.delay <= 0) spawnWave(); return; }
  if (enemies.some((e) => e.ambush && !e.dead)) return;
  A.wave++;
  if (A.wave < A.waves) { A.delay = 1.4; return; }
  RUN.ambush = null;
  addChest(A.x + 1.6, A.z, true);
  banner('The altar falls silent', 'A hoard lies open');
  setMusic('dng:' + biomeOf(RUN.depth).id); sfx('quest'); questEvent('altar'); stat('altars');
}

// ================= quests =================
// Elder Maren offers three tasks each time you return; take one, see it through, come back for the reward.
let elderLabel = null;
const QARCH = { grunt: 'foot soldiers', skitter: 'swarmers', archer: 'archers', brute: 'brutes', caster: 'casters', bomber: 'bloaters', summoner: 'summoners', warden: 'wardens' };
const QCOUNT = { grunt: 15, skitter: 20, archer: 10, brute: 6, caster: 8, bomber: 8, summoner: 4, warden: 5 };
function questOffer(type) {
  const b = Math.max(1, S.best);
  let q;
  switch (type) {
    case 'slay': { const a = pick(Object.keys(ARCH).filter((k) => ARCH[k].from <= Math.max(2, b))); const n = QCOUNT[a] + Math.floor(b / 5) * 2; q = { arch: a, n, desc: `Slay ${n} ${QARCH[a]}`, diff: 1 }; break; }
    case 'leaders': { const n = 1 + (b >= 6) + (b >= 14); q = { n, desc: `Slay ${n} pack leader${n > 1 ? 's' : ''}`, diff: 1.4 }; break; }
    case 'champs': { const n = 3 + Math.floor(b / 6); q = { n, desc: `Slay ${n} champions`, diff: 1.2 }; break; }
    case 'depth': { const t = Math.max(3, b + randi(2, 3)); q = { n: 1, target: t, desc: `Reach depth ${t}`, diff: 1.3 }; break; }
    case 'gather': { const m = pick(biomeOf(b).mats), n = 6 + Math.floor(b / 3); q = { mat: m, n, desc: `Gather ${n} ${MATS[m].n}`, diff: 1 }; break; }
    case 'altar': { const n = b >= 10 ? 2 : 1; q = { n, desc: `Silence ${n === 1 ? 'a cursed altar' : n + ' cursed altars'}`, diff: 1.3 }; break; }
    case 'boss': { const t = Math.ceil((b + 1) / 5) * 5; q = { n: 1, target: t, desc: `Slay the boss of depth ${t}`, diff: 2 }; break; }
  }
  q.type = type; q.have = 0; q.done = false;
  q.gold = Math.round(70 * Math.pow(1.1, b) * q.diff); q.ess = Math.round((2 + b / 4) * q.diff); q.item = chance(0.45 + 0.25 * (q.diff - 1));
  return q;
}
function makeQuestOffers() {
  const types = ['slay', 'slay', 'leaders', 'champs', 'depth', 'gather', 'boss'];
  if (S.best >= 3) types.push('altar', 'altar');
  const out = [];
  while (out.length < 3) { const t = pick(types); if (!out.some((q) => q.type === t) || (t === 'slay' && out.filter((q) => q.type === 'slay').length < 1)) out.push(questOffer(t)); }
  return out;
}
function questEvent(kind, a, n) {
  const q = S && S.quest; if (!q || q.done) return;
  let add = 0;
  if (kind === 'kill') { const e = a; if ((q.type === 'slay' && e.arch === q.arch && !e.boss) || (q.type === 'leaders' && e.leader) || (q.type === 'champs' && e.champ)) add = 1; }
  else if (kind === 'mat' && q.type === 'gather' && a === q.mat) add = n;
  else if (kind === 'depth' && q.type === 'depth' && a >= q.target) add = 1;
  else if (kind === 'boss' && q.type === 'boss' && a >= q.target) add = 1;
  else if (kind === 'altar' && q.type === 'altar') add = 1;
  if (!add) return;
  q.have = Math.min(q.n, q.have + add);
  if (q.have >= q.n) { q.done = true; toast(`Task done: ${q.desc}. Return to Elder Maren.`, 'var(--ok)', true); sfx('quest'); }
}
function claimQuest() {
  const q = S.quest; if (!q || !q.done) return;
  S.gold += q.gold; addMat('essence', q.ess); gainXP(xpNeed(S.level) * 0.2 * q.diff);
  let got = `${fmt(q.gold)} gold and ${q.ess} Arcane Essence`;
  if (q.item) {
    const it = genItem(Math.max(1, S.best) + 1, { mf: 80, min: 2 });
    if (S.inv.length < BAG_CAP) { S.inv.push(it); got += `, plus ${it.name}`; }
    else if (S.stash.length < stashCap()) { S.stash.push(it); got += `, plus ${it.name} (sent to your stash)`; }
    else { S.gold += it.value * 2; got += `, plus ${fmt(it.value * 2)} gold in place of an item (no room)`; }
  }
  S.questsDone = (S.questsDone || 0) + 1; S.quest = null; S.questOffers = null;
  toast(`Reward: ${got}`, 'var(--brass-2)', true); sfx('quest');
}
function updElderLabel() {
  if (!elderLabel || !LV || LV.type !== 'town') return;
  const L = labelEls.find((q) => q.ref === elderLabel); if (!L) return;
  const mark = S.quest ? (S.quest.done ? ' ?' : '') : ' !';
  const txt = 'Elder Maren' + mark; if (L.el.textContent !== txt) L.el.textContent = txt;
}
