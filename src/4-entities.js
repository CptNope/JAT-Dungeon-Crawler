// ================= runtime collections =================
const enemies = [], projs = [], teles = [], drops = [], parts = [], lines = [];
const P = { x: 0, z: 0, r: 0.38, face: 0, hp: 100, atkT: 0, swingT: 0, swingDur: 0.15, dodgeT: 0, dodgeCd: 0, dodgeDir: 0, iframes: 0, hurtT: 0, frenzy: 0, frenzyT: 0, burnT: 0, burnD: 0, chillT: 0, dead: false, mesh: null, hand: null, weapon: null, wkind: '', walk: 0, ghostT: 0 };
let flow = null, flowT = 0, flowTile = -1;
let bossRef = null;

// ================= line fx (bursts live in the render core) =================
function zap(ax, az, bx, bz, color) {
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(lerp(ax, bx, t) + (i % n ? rand(-0.3, 0.3) : 0), 1 + (i % n ? rand(-0.2, 0.3) : 0), lerp(az, bz, t) + (i % n ? rand(-0.3, 0.3) : 0)));
  }
  const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true }));
  fxGroup.add(o); lines.push({ o, t: 0.22, max: 0.22 });
}
const _arcGeo = new Map();
const swings = [];
for (let i = 0; i < 4; i++) {
  // single-sided: the arc lies flat and is only ever seen from above, so no second back-face pass
  const o = new THREE.Mesh(G.tile, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c8).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  o.visible = false; fxGroup.add(o); swings.push({ o, t: 0 });
}
let swingIdx = 0;
function swingFx(a, w) {
  const key = w.range.toFixed(2) + w.arc.toFixed(2);
  if (!_arcGeo.has(key)) { const g = new THREE.RingGeometry(0.35, w.range, 24, 1, -w.arc / 2, w.arc); g.rotateX(-Math.PI / 2); _arcGeo.set(key, g); }
  const s = swings[swingIdx = (swingIdx + 1) % swings.length];
  s.o.geometry = _arcGeo.get(key); s.o.visible = true; s.t = 0.14;
  s.o.position.set(P.x, 0.08, P.z); s.o.rotation.y = a - Math.PI / 2;
}
function updSwings(dt) {
  for (const s of swings) {
    if (s.t <= 0) continue;
    s.t -= dt; s.o.material.opacity = Math.max(0, s.t / 0.14) * 0.4;
    if (s.t <= 0) s.o.visible = false;
  }
}

// ================= labels & floating numbers =================
const labelEls = [];
function addLabel(text, x, y, z, cls, ref) {
  const el = document.createElement('div');
  el.className = 'lbl ' + (cls || '');
  el.textContent = text;
  $('#labels').appendChild(el);
  const L = { el, x, y, z, ref };
  labelEls.push(L);
  return L;
}
function removeLabel(L) { if (!L) return; L.el.remove(); const i = labelEls.indexOf(L); if (i >= 0) labelEls.splice(i, 1); }
function clearLabels() { for (const L of labelEls) L.el.remove(); labelEls.length = 0; }
const floaters = [];
const _v = new THREE.Vector3();
function floatNum(x, y, z, text, cls) {
  let f = floaters.find((q) => q.t <= 0);
  if (!f) {
    if (floaters.length > 50) return;
    const el = document.createElement('div'); el.className = 'fl'; $('#floaters').appendChild(el);
    f = { el, t: 0 }; floaters.push(f);
  }
  f.el.className = 'fl ' + (cls || ''); f.el.textContent = text; f.el.style.display = '';
  f.x = x + rand(-0.3, 0.3); f.y = y; f.z = z; f.t = f.max = cls === 'crit' ? 1 : 0.8; f.big = cls === 'crit';
}
function project(x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight, ok: _v.z < 1 && _v.z > -1 };
}
function updOverlays(dt) {
  for (const f of floaters) {
    if (f.t <= 0) continue;
    f.t -= dt; f.y += dt * 1.6;
    if (f.t <= 0) { f.el.style.display = 'none'; continue; }
    const p = project(f.x, f.y, f.z), age = f.max - f.t, pop = 1 + Math.max(0, 1 - age / 0.12) * (f.big ? 0.9 : 0.55);
    f.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${pop.toFixed(3)})`;
    f.el.style.opacity = Math.min(1, f.t / f.max * 2);
  }
  for (const L of labelEls) {
    if (L.ref && L.ref.mesh) { L.x = L.ref.x; L.z = L.ref.z; L.y = L.ref.h * L.ref.scale + 0.55; }
    const far = Math.hypot(L.x - P.x, L.z - P.z) > (L.ref && L.ref.mesh ? 14 : 30);
    const p = project(L.x, L.y, L.z);
    const show = p.ok && !far && !(L.ref && L.ref.hideLabel) && p.y > 110 && p.x > 30 && p.x < window.innerWidth - 30;
    L.el.style.display = show ? '' : 'none';
    if (show) L.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }
}

// ================= enemies =================
function disposeEnemy(e) {
  world.remove(e.mesh);
  for (const m of e.mats) m.dispose();
  if (e.bar) { world.remove(e.bar); }
  if (e.auraRing) { world.remove(e.auraRing); e.auraRing.material.dispose(); }
  if (e.label) removeLabel(e.label);
  e.mesh = null;
}
const barBgMat = new THREE.MeshBasicMaterial({ color: 0x14141c, depthTest: false });
const barFgMat = new THREE.MeshBasicMaterial({ color: 0xd8473b, depthTest: false });
const barChMat = new THREE.MeshBasicMaterial({ color: 0x5c8ff2, depthTest: false });
function ensureBar(e) {
  if (e.bar || e.boss) return;
  const g = new THREE.Group();
  const bg = new THREE.Mesh(G.plane, barBgMat); bg.scale.set(1, 0.12, 1); bg.renderOrder = 10;
  const fg = new THREE.Mesh(G.plane, e.champ || e.leader ? barChMat : barFgMat); fg.scale.set(0.96, 0.08, 1); fg.position.z = 0.001; fg.renderOrder = 11;
  g.add(bg, fg); g.userData.fg = fg;
  world.add(g); e.bar = g;
}
function spawnEnemy(arch, x, z, o = {}) {
  const A = ARCH[arch], d = RUN.depth, B = biomeOf(d), cyc = cycleOf(d);
  const [name, color] = B.enemies[arch];
  const cr = makeCreature(arch, color, B.eye);
  const hpm = Math.pow(1.15, d - 1) * (1 + cyc * 1.5), dm = Math.pow(1.105, d - 1) * (1 + cyc * 0.8);
  const e = {
    id: uid++, arch, ai: A.ai, A, name, x, z, r: A.r, spd: A.spd * rand(0.92, 1.08), hp: A.hp * hpm, dmg: A.dmg * dm, xp: A.xp * (1 + 0.18 * (d - 1)),
    cd: rand(0.4, 1.4), wind: 0, mesh: cr.g, mats: cr.mats, u: cr.u, h: cr.h, strikeT: 0, scale: 1, arm: A.armor || 0, kx: 0, kz: 0, burnT: 0, burnD: 0, chillT: 0, flashT: 0,
    awake: false, face: rand(0, 6.28), aff: [], bob: rand(0, 6), losT: 0, los: false, color, minions: 0,
  };
  if (o.champ) {
    const ks = Object.keys(EAFF); const n = d > 8 ? 2 : 1;
    for (let i = 0; i < n; i++) { const k = pick(ks.filter((q) => !e.aff.includes(q))); e.aff.push(k); }
    e.champ = 1; e.hp *= 2.6; e.dmg *= 1.3; e.xp *= 3; e.scale = 1.15; e.r *= 1.15;
    e.aff.forEach((k) => EAFF[k].ap(e));
    e.name = e.aff.map((k) => EAFF[k].n).join(' ') + ' ' + name;
    e.mats[0].emissive.setHex(EAFF[e.aff[0]].col).multiplyScalar(0.35);
  }
  if (o.leader) {
    const ks = Object.keys(EAFF);
    for (let i = 0; i < 2; i++) { const k = pick(ks.filter((q) => !e.aff.includes(q) && q !== 'splitting')); e.aff.push(k); }
    e.leader = 1; e.hp *= 5.5; e.dmg *= 1.6; e.xp *= 6; e.scale = 1.4; e.r *= 1.4;
    e.aff.forEach((k) => EAFF[k].ap(e));
    e.aura = pick(Object.keys(AURAS));
    e.name = `${pick(LEAD_FIRST)} ${pick(LEAD_TITLE)}`;
    e.mats[0].emissive.setHex(AURAS[e.aura].col).multiplyScalar(0.25);
    const crown = new THREE.Group();
    for (let k = 0; k < 5; k++) { const sp = mesh(G.cone4, WMAT.gold || metal(0xe0aa50, 0.3), 0.12, 0.28, 0.12, Math.sin(k * 1.256) * 0.2, cr.h + 0.12, Math.cos(k * 1.256) * 0.2); crown.add(sp); }
    crown.add(mesh(G.cyl, metal(0xe0aa50, 0.3), 0.5, 0.08, 0.5, 0, cr.h, 0));
    cr.g.add(crown);
    const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: new THREE.Color(AURAS[e.aura].col).multiplyScalar(2), transparent: true, opacity: 0.5, depthWrite: false }));
    ring.scale.setScalar(2.4); ring.position.set(x, 0.04, z); world.add(ring); e.auraRing = ring;
  }
  if (o.boss) {
    world.remove(cr.g); cr.mats.forEach((m) => m.dispose());
    const bc = makeCreature(B.boss.shape, B.boss.color, 0xffffff);
    e.mesh = bc.g; e.mats = bc.mats; e.h = bc.h; e.u = bc.u;
    e.boss = 1; e.name = B.boss.name + (cyc ? ' ' + roman(cyc + 1) : '');
    e.hp = 950 * hpm; e.dmg = 15 * dm; e.xp = 400 * (1 + 0.2 * d); e.scale = 2.4; e.r = 1.25; e.spd = 2.6; e.arm = 0.1;
    e.patterns = B.boss.patterns; e.patT = 2; e.color = B.boss.color;
    e.mats[0].emissive.setHex(B.boss.color).multiplyScalar(0.25);
    const crown = new THREE.Group();
    for (let k = 0; k < 7; k++) crown.add(mesh(G.cone4, mat(0xf2c56b, 2.5), 0.1, 0.36, 0.1, Math.sin(k * 0.9) * 0.24, bc.h + 0.16, Math.cos(k * 0.9) * 0.24));
    bc.g.add(crown);
  }
  e.maxHp = e.hp;
  e.mesh.scale.setScalar(e.scale);
  e.mesh.rotation.order = 'YXZ'; // flinch and topple tilt around the creature's own axis
  e.u.uRim.value.set(e.boss ? e.color : e.leader ? AURAS[e.aura].col : e.champ ? EAFF[e.aff[0]].col : B.torch).multiplyScalar(e.boss ? 0.5 : e.leader ? 0.5 : e.champ ? 0.42 : 0.2);
  e.mesh.position.set(x, 0, z);
  world.add(e.mesh);
  if (e.leader) e.label = addLabel(e.name, x, 3, z, 'lead', e);
  else if (e.champ) e.label = addLabel(e.name, x, 3, z, 'champ', e);
  enemies.push(e);
  return e;
}
function wake(e) {
  if (e.awake) return;
  e.awake = true;
  if (e.boss && !bossRef) { bossRef = e; $('#bossBar').hidden = false; $('#bossName').textContent = e.name; banner(e.name, biomeOf(RUN.depth).name); sfx('boss'); setMusic('boss'); shake(0.35); }
  // wake the rest of the pack
  for (const o of enemies) if (!o.awake && !o.boss && Math.hypot(o.x - e.x, o.z - e.z) < 7) { o.awake = true; }
}
function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) { const t = i / n; if (!walkable(lerp(ax, bx, t), lerp(az, bz, t))) return false; }
  return true;
}
function collide(o) {
  const minX = Math.floor(o.x - o.r), maxX = Math.floor(o.x + o.r), minZ = Math.floor(o.z - o.r), maxZ = Math.floor(o.z + o.r);
  let hit = false;
  for (let j = minZ; j <= maxZ; j++) for (let i = minX; i <= maxX; i++) {
    if (!solid(i, j)) continue;
    const px = clamp(o.x, i, i + 1), pz = clamp(o.z, j, j + 1);
    const dx = o.x - px, dz = o.z - pz, d2 = dx * dx + dz * dz;
    if (d2 < o.r * o.r) {
      hit = true;
      if (d2 > 1e-7) { const d = Math.sqrt(d2); o.x += (dx / d) * (o.r - d); o.z += (dz / d) * (o.r - d); }
      else { const cx = i + 0.5, cz = j + 0.5; const ax = o.x - cx, az = o.z - cz; if (Math.abs(ax) > Math.abs(az)) o.x = ax > 0 ? i + 1 + o.r : i - o.r; else o.z = az > 0 ? j + 1 + o.r : j - o.r; }
    }
  }
  return hit;
}
function computeFlow() {
  const W = LV.w, H = LV.h;
  if (!flow || flow.length !== W * H) flow = new Int16Array(W * H);
  flow.fill(-1);
  const s = tidx(P.x, P.z); if (LV.g[s] !== 1) return;
  const q = new Int32Array(W * H); let h = 0, t = 0;
  flow[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cd = flow[c]; if (cd > 45) continue;
    const x = c % W;
    if (x > 0 && LV.g[c - 1] === 1 && flow[c - 1] < 0) { flow[c - 1] = cd + 1; q[t++] = c - 1; }
    if (x < W - 1 && LV.g[c + 1] === 1 && flow[c + 1] < 0) { flow[c + 1] = cd + 1; q[t++] = c + 1; }
    if (c >= W && LV.g[c - W] === 1 && flow[c - W] < 0) { flow[c - W] = cd + 1; q[t++] = c - W; }
    if (c < W * (H - 1) && LV.g[c + W] === 1 && flow[c + W] < 0) { flow[c + W] = cd + 1; q[t++] = c + W; }
  }
}
const _dir = [0, 0];
const dirOut = (x, z) => { _dir[0] = x; _dir[1] = z; return _dir; };
function steer(e, dist) {
  // returns unit direction toward the player, around walls when needed (shared array: read it right away)
  const dx = P.x - e.x, dz = P.z - e.z;
  if (e.los && dist < 12) return dirOut(dx / (dist || 1), dz / (dist || 1));
  if (!flow) return dirOut(dx / (dist || 1), dz / (dist || 1));
  const W = LV.w, i = Math.floor(e.x), j = Math.floor(e.z);
  let best = flow[j * W + i], bx = 0, bz = 0;
  if (best < 0) best = 1e4;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if (!di && !dj) continue;
    if (di && dj && (solid(i + di, j) || solid(i, j + dj))) continue;
    const ii = i + di, jj = j + dj; if (solid(ii, jj)) continue;
    const f = flow[jj * W + ii];
    if (f >= 0 && f < best) { best = f; bx = ii + 0.5 - e.x; bz = jj + 0.5 - e.z; }
  }
  const l = Math.hypot(bx, bz);
  if (l < 1e-3) return dirOut(dx / (dist || 1), dz / (dist || 1));
  return dirOut(bx / l, bz / l);
}
function enemyFire(e, a, o = {}) {
  const B = biomeOf(RUN.depth);
  spawnProj({ x: e.x + Math.sin(a) * (e.r + 0.2), z: e.z + Math.cos(a) * (e.r + 0.2), a, spd: o.spd || 9, dmg: o.dmg || e.dmg, owner: 'e', size: o.size || 0.2, col: o.col || B.bolt, src: e, life: o.life || 3 });
}
function updEnemy(e, dt) {
  const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz);
  e.losT -= dt;
  if (e.losT <= 0) { e.losT = 0.25 + Math.random() * 0.15; e.los = dist < 16 && los(e.x, e.z, P.x, P.z); }
  if (!e.awake) {
    if (e.boss) { if (dist < 12 && e.los) wake(e); }
    else if (dist < 10 && e.los) wake(e);
    e.bob += dt;
    e.mesh.position.y = Math.sin(e.bob * 2) * 0.02;
    return;
  }
  if (dist > 34 && !e.boss) return;
  // statuses
  let spdM = 1, atkM = 1;
  if (e.chillT > 0) { e.chillT -= dt; spdM *= 0.5; atkM *= 0.7; }
  if (e.burnT > 0) { e.burnT -= dt; e.hpTick = (e.hpTick || 0) + dt; if (e.hpTick > 0.5) { e.hpTick = 0; damageEnemy(e, e.burnD * 0.5, false, 0, 0, 0, false, 'burn'); if (e.dead) return; } }
  if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
  e.auraOn = null;
  if (e.lead && !e.lead.dead && Math.hypot(e.lead.x - e.x, e.lead.z - e.z) < 7) {
    e.auraOn = e.lead.aura;
    if (e.auraOn === 'frenzy') { spdM *= 1.35; atkM *= 1.35; }
    if (e.auraOn === 'rally') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt);
  }
  if (e.auraRing) e.auraRing.position.set(e.x, 0.04, e.z);
  e.cd -= dt * atkM;
  const spd = e.spd * spdM;
  let mx = 0, mz = 0;
  const faceP = () => { e.face = Math.atan2(dx, dz); };
  if (e.charging > 0) {
    e.charging -= dt;
    mx = Math.sin(e.cdir) * (e.boss ? 15 : 13); mz = Math.cos(e.cdir) * (e.boss ? 15 : 13);
    if (dist < e.r + P.r + 0.2 && !e.chargeHit) { e.chargeHit = 1; hurtPlayer(e.dmg * 1.4, e); P.kx = Math.sin(e.cdir) * 9; P.kz = Math.cos(e.cdir) * 9; }
  } else if (e.boss) { updBoss(e, dt, dist, dx, dz, spd); }
  else if (e.wind > 0) {
    e.wind -= dt * atkM; faceP();
    if (e.wind <= 0) {
      e.strikeT = 0.2;
      if (e.ai === 'melee' || e.ai === 'charger') { if (dist < e.A.range * e.scale + P.r + 0.35) hurtPlayer(e.dmg, e); swipeFx(e); }
      else if (e.ai === 'ranged') { enemyFire(e, e.face, { spd: 11, size: 0.16 }); }
      else if (e.ai === 'caster') {
        if (e.castAlt = !e.castAlt) { for (let k = -1; k <= 1; k++) enemyFire(e, e.face + k * 0.22, { spd: 8 }); }
        else { for (let k = 0; k < 8; k++) enemyFire(e, e.face + k * Math.PI / 4, { spd: 6.5, size: 0.24 }); }
      } else if (e.ai === 'summoner') {
        for (let k = 0; k < 2; k++) {
          if (e.minions >= 4) break;
          const a = rand(0, 6.28), sx = e.x + Math.sin(a) * 1.2, sz = e.z + Math.cos(a) * 1.2;
          if (!walkable(sx, sz)) continue;
          const m = spawnEnemy('skitter', sx, sz); m.awake = true; m.owner = e; e.minions++; m.xp *= 0.3;
          burst(sx, 0.5, sz, biomeOf(RUN.depth).bolt, 8, 3);
        }
      }
    }
  } else if (e.fuse > 0) {
    e.fuse -= dt;
    e.mats[0].emissive.setHex(Math.sin(e.fuse * 30) > 0 ? 0xff3a1a : 0x000000);
    if (e.fuse <= 0) { explodeEnemy(e); return; }
  } else {
    switch (e.ai) {
      case 'melee': {
        faceP();
        if (dist < e.A.range * e.scale + P.r && e.cd <= 0) { e.wind = 0.38; e.cd = e.A.cd; }
        else if (dist > e.A.range * e.scale * 0.8 + P.r) { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        break;
      }
      case 'charger': {
        faceP();
        if (dist < e.A.range * e.scale + P.r && e.cd <= 0) { e.wind = 0.55; e.cd = e.A.cd; }
        else if (dist > 3 && dist < 8 && e.los && (e.chargeCd || 0) <= 0) { e.chargeCd = 4.5; e.windCharge = 0.6; }
        else { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        e.chargeCd = (e.chargeCd || 0) - dt;
        break;
      }
      case 'ranged': case 'caster': case 'summoner': {
        faceP();
        const keep = e.ai === 'summoner' ? 7 : e.ai === 'caster' ? 6.5 : 6;
        if (dist < keep - 1.5) { mx = -dx / dist * spd; mz = -dz / dist * spd; }
        else if (dist > e.A.range || !e.los) { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        else { const s = Math.sin(e.bob * 0.7) > 0 ? 1 : -1; mx = dz / dist * spd * 0.4 * s; mz = -dx / dist * spd * 0.4 * s; }
        if (e.los && dist < e.A.range + 1 && e.cd <= 0) { e.wind = e.ai === 'ranged' ? 0.35 : 0.6; e.cd = e.A.cd * rand(0.85, 1.2); }
        break;
      }
      case 'bomber': {
        faceP();
        if (dist < e.A.range + P.r) { e.fuse = 0.85; e.tele = telegraph(e.x, e.z, 2.4, 0.85, 0, { visualOnly: true }); }
        else { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        break;
      }
    }
  }
  if (e.windCharge > 0) { e.windCharge -= dt; mx = mz = 0; faceP(); e.flashT = 0.05; if (e.windCharge <= 0) { e.charging = 0.55; e.cdir = Math.atan2(dx, dz); e.chargeHit = 0; } }
  // move
  e.kx *= Math.pow(0.0015, dt); e.kz *= Math.pow(0.0015, dt);
  e.x += (mx + e.kx) * dt; e.z += (mz + e.kz) * dt;
  if (collide(e) && e.charging > 0) { e.charging = 0; }
  // visuals
  e.bob += dt * (Math.abs(mx) + Math.abs(mz) > 0.1 ? 9 : 2);
  e.mesh.position.set(e.x, Math.abs(Math.sin(e.bob)) * 0.08, e.z);
  const cur = e.mesh.rotation.y; e.mesh.rotation.y = cur + angDiff(e.face, cur) * Math.min(1, dt * 12);
  const windGlow = e.wind > 0 || e.windCharge > 0;
  if (e.flashT > 0 || windGlow) { e.flashT -= dt; e.mats[0].emissive.setHex(windGlow && !(e.flashT > 0) ? 0x663322 : 0xffffff).multiplyScalar(windGlow ? 0.5 : 0.8); }
  else if (!(e.fuse > 0)) e.mats[0].emissive.setHex(e.leader ? AURAS[e.aura].col : e.champ ? EAFF[e.aff[0]].col : e.boss ? e.color : 0x000000).multiplyScalar(e.leader ? 0.25 : e.champ ? 0.35 : e.boss ? 0.25 : 0);
  // flinch: lean back and squash for a moment after a hit
  e.hitT = Math.max(0, (e.hitT || 0) - dt);
  const fk = e.hitT / 0.16;
  e.mesh.rotation.x = -0.38 * fk * (e.boss ? 0.3 : 1);
  if (e.wind > 0 && e.ai !== 'ranged') e.mesh.scale.setScalar(e.scale * (1 + 0.08 * Math.sin(e.wind * 30)));
  else e.mesh.scale.set(e.scale * (1 + 0.1 * fk), e.scale * (1 - 0.13 * fk), e.scale * (1 + 0.1 * fk));
  for (const c of e.mesh.children) { if (c.userData.float) c.position.y = 1.0 + Math.sin(e.bob) * 0.1; if (c.userData.spin) c.rotation.y += dt * 2; }
  // limbs: walk cycle from ground speed, arm raised during a wind-up and brought down on the strike
  const gs = Math.hypot(mx, mz), u = e.u;
  u.uWalk.value += dt * (2.2 + gs * 2.4) * (gs > 0.1 ? 1 : 0);
  u.uAmp.value = lerp(u.uAmp.value, gs > 0.1 ? Math.min(0.75, 0.25 + gs * 0.12) : 0, Math.min(1, dt * 8));
  e.strikeT -= dt;
  const ranged = e.ai === 'ranged';
  const tgt = (e.wind > 0 || e.windCharge > 0 || e.fuse > 0 || (e.boss && e.casting)) ? (ranged ? -1.5 : -2.4) : e.strikeT > 0 ? -0.15 : 0;
  u.uArmR.value = tgt === 0 && Math.abs(u.uArmR.value) < 0.05 ? 0 : lerp(u.uArmR.value, tgt, Math.min(1, dt * (tgt === -0.15 ? 22 : 9)));
  u.uArmL.value = ranged && (e.wind > 0 || e.strikeT > 0) ? -1.5 : e.arch === 'warden' && e.awake ? -0.9 : 0;
  if (e.bar) {
    e.bar.position.set(e.x, e.h * e.scale + 0.3, e.z); e.bar.quaternion.copy(camera.quaternion);
    if (SET.cam !== 'top') e.bar.scale.setScalar(clamp(e.bar.position.distanceTo(camera.position) / 9, 0.3, 1)); else if (e.bar.scale.x !== 1) e.bar.scale.setScalar(1);
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.userData.fg.scale.x = 0.96 * f; e.bar.userData.fg.position.x = -0.48 * (1 - f);
  }
}
function swipeFx(e) { burst(e.x + Math.sin(e.face) * e.r * 1.4, 0.8, e.z + Math.cos(e.face) * e.r * 1.4, 0xffffff, 4, 2, 0.08); }
function explodeEnemy(e) {
  if (e.tele) { disposeTele(e.tele); teles.splice(teles.indexOf(e.tele), 1); e.tele = null; }
  burst(e.x, 0.6, e.z, 0xff9a3a, 22, 7, 0.2); sfx('boom');
  if (Math.hypot(P.x - e.x, P.z - e.z) < 2.4 + P.r) hurtPlayer(e.dmg, e);
  e.hp = 0; e.exploded = true; killEnemy(e, true);
  shake(0.3);
}
function separate() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead || !a.awake) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead || !b.awake) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, nz = dz / d;
        const wa = a.boss ? 0 : 1, wb = b.boss ? 0 : 1;
        a.x -= nx * push * wa; a.z -= nz * push * wa; b.x += nx * push * wb; b.z += nz * push * wb;
      }
    }
    // keep off the player
    const dx = a.x - P.x, dz = a.z - P.z, rr = a.r + P.r, d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); a.x += dx / d * (rr - d); a.z += dz / d * (rr - d); }
  }
}

// ================= bosses =================
function updBoss(e, dt, dist, dx, dz, spd) {
  const p2 = e.hp < e.maxHp * 0.5;
  if (p2 && !e.p2) { e.p2 = 1; banner('Enraged', e.name); burst(e.x, 1.5, e.z, e.color, 30, 8, 0.25); }
  if (e.charging > 0) return; // handled by generic movement
  if (e.windCharge > 0) return;
  if (e.casting) { e.casting.t -= dt; e.casting.tick(dt); e.face = Math.atan2(dx, dz); if (e.casting.t <= 0) e.casting = null; return; }
  e.face = Math.atan2(dx, dz);
  e.patT -= dt;
  if (dist > 3.5) { const [sx, sz] = steer(e, dist); e.x += sx * spd * 0.75 * dt; e.z += sz * spd * 0.75 * dt; }
  else if (e.cd <= 0) { e.wind = 0; e.cd = 1.6; telegraph(e.x + Math.sin(e.face) * 1.8, e.z + Math.cos(e.face) * 1.8, 2.2, 0.6, e.dmg * 1.3, {}); }
  if (e.patT <= 0) { e.patT = p2 ? 1.7 : 2.6; bossPattern(e, pick(e.patterns), p2); }
}
function bossPattern(e, p, p2) {
  const B = biomeOf(RUN.depth);
  const ring = (n, spd, off) => { for (let k = 0; k < n; k++) enemyFire(e, (off || 0) + (k / n) * Math.PI * 2, { spd, size: 0.3, dmg: e.dmg * 0.8 }); };
  switch (p) {
    case 'ring': {
      ring(p2 ? 22 : 15, 7);
      if (p2) { let fired = false; e.casting = { t: 0.5, tick: () => { if (!fired && e.casting.t < 0.1) { fired = true; ring(22, 6, 0.14); } } }; }
      break;
    }
    case 'spiral': {
      let acc = 0, a = rand(0, 6.28);
      e.casting = { t: p2 ? 2.8 : 2.0, tick: (dt) => { acc += dt; while (acc > 0.075) { acc -= 0.075; a += 0.32; enemyFire(e, a, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); enemyFire(e, a + Math.PI, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); if (p2) enemyFire(e, a + Math.PI / 2, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); } } };
      break;
    }
    case 'fan': {
      let shots = 0, acc = 0.36;
      e.casting = { t: 1.2, tick: (dt) => { acc += dt; if (acc > 0.36 && shots < (p2 ? 4 : 3)) { acc = 0; shots++; const a0 = Math.atan2(P.x - e.x, P.z - e.z); for (let k = -3; k <= 3; k++) enemyFire(e, a0 + k * 0.15, { spd: 10, size: 0.28, dmg: e.dmg * 0.8 }); } } };
      break;
    }
    case 'slam': {
      let n = 0, acc = 0.5;
      e.casting = { t: p2 ? 2 : 1.6, tick: (dt) => { acc += dt; if (acc > 0.5 && n < (p2 ? 4 : 3)) { acc = 0; n++; telegraph(P.x, P.z, 2.4, 0.85, e.dmg * 1.6, {}); } } };
      break;
    }
    case 'meteor': {
      const n = p2 ? 9 : 6;
      for (let k = 0; k < n; k++) { const a = rand(0, 6.28), r = k === 0 ? 0 : rand(1.5, 5); const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (walkable(x, z)) telegraph(x, z, 1.8, 1.1 + k * 0.08, e.dmg * 1.5, { col: 0xff7a2a }); }
      break;
    }
    case 'charge': {
      e.windCharge = 0.7;
      if (p2) e.patT = 1.1;
      break;
    }
    case 'summon': {
      let alive = enemies.filter((q) => !q.dead && q.owner === e).length;
      for (let k = 0; k < 3 && alive < 7; k++) {
        const a = rand(0, 6.28), sx = e.x + Math.sin(a) * 2.6, sz = e.z + Math.cos(a) * 2.6;
        if (!walkable(sx, sz)) continue;
        const m = spawnEnemy(pick(['skitter', 'grunt', 'skitter', 'bomber']), sx, sz); m.awake = true; m.owner = e; m.xp *= 0.3; alive++;
        burst(sx, 0.5, sz, B.bolt, 10, 3);
      }
      break;
    }
    case 'teleport': {
      for (let k = 0; k < 20; k++) {
        const a = rand(0, 6.28), r = rand(5, 7), x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
        if (walkable(x, z) && walkable(x + 1, z) && walkable(x - 1, z) && walkable(x, z + 1) && walkable(x, z - 1)) {
          burst(e.x, 1.5, e.z, e.color, 20, 6, 0.2); e.x = x; e.z = z; burst(x, 1.5, z, e.color, 20, 6, 0.2); break;
        }
      }
      let fired = false;
      e.casting = { t: 0.45, tick: () => { if (!fired && e.casting.t < 0.1) { fired = true; ring(p2 ? 18 : 12, 7.5); } } };
      break;
    }
  }
}

// ================= telegraphs =================
function telegraph(x, z, r, T, dmg, o) {
  const col = o.col || 0xff3b2f;
  const tm = teleMats(col);
  const disc = new THREE.Mesh(G.disc, tm[0]), fill = new THREE.Mesh(G.disc, tm[1]), ring = new THREE.Mesh(G.ring, tm[2]);
  disc.position.set(x, 0.03, z); fill.position.set(x, 0.035, z); ring.position.set(x, 0.04, z);
  disc.scale.setScalar(r); ring.scale.setScalar(r); fill.scale.setScalar(0.01);
  world.add(disc, fill, ring);
  const t = { x, z, r, t: 0, T, dmg, disc, fill, ring, o, col };
  teles.push(t);
  return t;
}
const _teleMats = new Map();
function teleMats(col) {
  if (!_teleMats.has(col)) _teleMats.set(col, [[0.14, 1], [0.32, 1.4], [0.85, 2.6]].map(([op, k]) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: op, depthWrite: false })));
  return _teleMats.get(col);
}
function disposeTele(t) { world.remove(t.disc, t.fill, t.ring); }
function updTeles(dt) {
  for (let i = teles.length - 1; i >= 0; i--) {
    const t = teles[i]; t.t += dt;
    t.fill.scale.setScalar(Math.max(0.01, t.r * Math.min(1, t.t / t.T)));
    if (t.t >= t.T) {
      teles.splice(i, 1); disposeTele(t);
      if (t.o.visualOnly) continue;
      burst(t.x, 0.4, t.z, t.col, 12, 5, 0.16);
      if (t.o.player) {
        for (const e of enemies) if (!e.dead && Math.hypot(e.x - t.x, e.z - t.z) < t.r + e.r) damageEnemy(e, t.dmg, false, 3, (e.x - t.x), (e.z - t.z), false);
      } else if (Math.hypot(P.x - t.x, P.z - t.z) < t.r + P.r * 0.5) hurtPlayer(t.dmg, null);
    }
  }
}

// ================= projectiles =================
const _projMat = new Map();
function projMat(c) { if (!_projMat.has(c)) _projMat.set(c, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3.2) })); return _projMat.get(c); }
function spawnProj(o) {
  const m = new THREE.Mesh(G.lsph, projMat(o.col));
  m.scale.set(o.size * 2, o.size * 2, o.size * (o.owner === 'p' && o.size < 0.15 ? 9 : 3));
  m.rotation.y = o.a; m.position.set(o.x, 0.85, o.z);
  world.add(m);
  projs.push(Object.assign({ vx: Math.sin(o.a) * o.spd, vz: Math.cos(o.a) * o.spd, mesh: m, hit: new Set(), life: o.life || 1.6, pierce: o.pierce || 0 }, o));
}
function updProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt;
    let dead = p.life <= 0 || !walkable(p.x, p.z);
    if (!dead && p.owner === 'p') {
      for (const e of enemies) {
        if (e.dead || p.hit.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.r + p.size + 0.15) {
          p.hit.add(e.id);
          const { d, crit } = rollDmg(); damageEnemy(e, d * (p.mult || 1), crit, 2, p.vx / p.spd, p.vz / p.spd, true);
          if (p.pierce-- <= 0) { dead = true; break; }
        }
      }
    } else if (!dead && p.owner === 'e') {
      if (Math.hypot(P.x - p.x, P.z - p.z) < P.r + p.size) { hurtPlayer(p.dmg, p.src); dead = true; }
    }
    if (dead) { burst(p.x, 0.85, p.z, p.col, 3, 2, 0.08); world.remove(p.mesh); projs.splice(i, 1); }
    else p.mesh.position.set(p.x, 0.85, p.z);
  }
}

// ================= combat =================
function rollDmg() {
  let d = ST.dmg * rand(0.9, 1.1);
  const crit = Math.random() * 100 < ST.crit;
  if (crit) d *= 1.5 + ST.critd / 100;
  return { d, crit };
}
function curWeapon() { return WEAPONS[ST.wk]; }
function playerAttack() {
  if (P.atkT > 0 || P.dodgeT > 0 || P.dashT > 0 || P.spinT > 0 || P.dead) return;
  const w = curWeapon();
  const fr = 1 + (ST.aspd + P.frenzy * 4) / 100;
  // three-hit string: swings alternate direction, the third is a heavier finisher
  P.combo = elapsed - (P.lastAtk || -9) < w.cd / fr + 0.45 ? ((P.combo || 0) + 1) % 3 : 0;
  P.lastAtk = elapsed; P.fin = !w.ranged && P.combo === 2;
  P.atkT = w.cd / fr * (P.fin ? 1.25 : 1); P.swingDur = P.swingT = Math.min(P.fin ? 0.26 : 0.2, P.atkT * 0.85);
  sfx(w.ranged ? 'shoot' : P.fin || ST.wk === 'hammer' || ST.wk === 'axe' ? 'heavy' : 'swing');
  const a = P.face;
  if (w.ranged) {
    const n = ST.powers.split ? 3 : 1;
    for (let k = 0; k < n; k++) spawnProj({ x: P.x + Math.sin(a) * 0.5, z: P.z + Math.cos(a) * 0.5, a: a + (k - (n - 1) / 2) * 0.18, spd: w.pspd, owner: 'p', size: w.size, col: w.col, pierce: w.pierce, mult: k === 0 ? 1 : 0.6, life: LV.type === 'town' ? 0.8 : undefined });
  } else {
    if (SET.cam === 'top') swingFx(a, w);
    P.pend = { t: P.swingDur * 0.42, fin: P.fin }; // the blow lands mid-swing, not on the button press
  }
}
function resolveMelee(fin) {
  const w = curWeapon(), a = P.face;
  let hits = 0, crits = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > w.range * (fin ? 1.12 : 1) + e.r) continue;
    if (Math.abs(angDiff(Math.atan2(dx, dz), a)) > w.arc / 2 + 0.15 + (fin ? 0.25 : 0) && d > e.r + 0.4) continue;
    const r = rollDmg();
    damageEnemy(e, r.d * (fin ? 1.35 : 1), r.crit, w.kb * (fin ? 1.6 : 1), dx / (d || 1), dz / (d || 1), true);
    hits++; if (r.crit) crits++;
  }
  if (hits) {
    addHitStop(crits ? 0.075 : fin ? 0.07 : ST.wk === 'hammer' ? 0.065 : 0.045);
    shake((fin ? 0.32 : 0.18) + Math.min(0.2, hits * 0.04) + (crits ? 0.08 : 0));
    if (crits) sfx('crit');
  }
  if (ST.powers.split) for (const k of [-1, 1]) spawnProj({ x: P.x, z: P.z, a: a + k * 0.3, spd: 14, owner: 'p', size: 0.2, col: 0x9fe8ff, pierce: 1, mult: 0.5, life: 0.7 });
}
function damageEnemy(e, d, crit, kb, nx, nz, proc, kind) {
  if (e.dead) return;
  wake(e);
  let m = 1 - e.arm;
  if (e.auraOn === 'ward') m *= 0.6;
  d *= m;
  e.hp -= d; e.flashT = 0.1; e.hitT = 0.16;
  if (nx || nz) { e.lastNx = nx; e.lastNz = nz; }
  // heavy blows and crits stagger ordinary foes out of a wind-up
  if (proc && e.wind > 0 && !e.boss && !e.leader && (crit || kb >= 4.5)) { e.wind = 0; e.cd = Math.max(e.cd, 0.6); floatNum(e.x, e.h * e.scale + 0.6, e.z, 'Staggered', 'xp'); }
  floatNum(e.x, e.h * e.scale + 0.2, e.z, fmt(Math.max(1, d)), crit ? 'crit' : kind === 'burn' ? 'xp' : '');
  if (kb && !e.boss) { const k = kb * (e.arch === 'brute' || e.arch === 'warden' ? 0.4 : 1) * (e.leader ? 0.5 : 1); e.kx += nx * k * 2.2; e.kz += nz * k * 2.2; }
  ensureBar(e);
  if (proc) {
    burst(e.x, 0.9, e.z, e.color, 4, 3, 0.1);
    sfx('hit');
    if (ST.ls > 0) healPlayer(d * ST.ls / 100, true);
    if (Math.random() * 100 < ST.burn) { e.burnT = 3; e.burnD = ST.dmg * 0.3; }
    if (Math.random() * 100 < ST.chill) e.chillT = 2.5;
    if (ST.powers.chain && chance(0.3)) chainLightning(e, d * 0.6);
    if (ST.powers.frenzy) { P.frenzy = Math.min(10, P.frenzy + 1); P.frenzyT = 2; }
  }
  if (e.hp <= 0) killEnemy(e);
}
function chainLightning(src, d) {
  const near = enemies.filter((q) => !q.dead && q !== src && Math.hypot(q.x - src.x, q.z - src.z) < 6).sort((a, b) => Math.hypot(a.x - src.x, a.z - src.z) - Math.hypot(b.x - src.x, b.z - src.z)).slice(0, 3);
  let prev = src;
  for (const t of near) { zap(prev.x, prev.z, t.x, t.z, 0x9fd8ff); damageEnemy(t, d, false, 0, 0, 0, false); prev = t; }
}
function killEnemy(e, noLoot) {
  if (e.dead) return;
  e.dead = true;
  burst(e.x, 0.8, e.z, e.color, e.boss ? 40 : 12, e.boss ? 9 : 5, e.boss ? 0.28 : 0.15);
  if (e.owner) e.owner.minions = Math.max(0, (e.owner.minions || 1) - 1);
  if (e.exploded) disposeEnemy(e); else addCorpse(e);
  if (e === lockT) updLock();
  addHitStop(e.boss ? 0.4 : e.leader ? 0.12 : 0.05); shake(e.boss ? 0.9 : e.leader ? 0.35 : 0.08);
  sfx(e.boss || e.leader ? 'bigkill' : 'kill');
  questEvent('kill', e);
  gainXP(e.xp);
  S.kills++;
  if (!noLoot || e.explode) dropLoot(e);
  if (e.split) for (let k = 0; k < 2; k++) { const s = spawnEnemy('skitter', e.x + rand(-0.6, 0.6), e.z + rand(-0.6, 0.6)); s.awake = true; s.xp *= 0.3; }
  if (e.explode && !e.ai.startsWith('bomb')) { telegraph(e.x, e.z, 2.2, 0.6, e.dmg * 0.9, { col: 0xffb02a }); }
  if (ST.powers.nova) { telegraph(e.x, e.z, 3, 0.25, ST.dmg * 0.7, { player: true, col: 0xff8a2a }); }
  if (ST.powers.vamp) healPlayer(ST.maxHp * 0.03);
  if (e.leader) { toast(`Leader slain: ${e.name}`, 'var(--r4)'); for (const o of enemies) if (o.lead === e) o.lead = null; }
  if (e.boss) bossDefeated(e);
}
function hurtPlayer(d, src) {
  if (P.iframes > 0 || P.dead || LV.type !== 'dungeon') return;
  const red = ST.armor / (ST.armor + 40 + 9 * RUN.depth);
  d *= 1 - red;
  P.hp -= d; P.hurtT = 0.2;
  shake(clamp(d / ST.maxHp * 2.2, 0.18, 0.55)); addHitStop(0.04);
  floatNum(P.x, 2, P.z, '-' + fmt(d), 'hurt');
  const v = $('#vignette'); v.classList.add('hit'); setTimeout(() => v.classList.remove('hit'), 90);
  sfx('hurt');
  if (src) {
    if (src.vamp) src.hp = Math.min(src.maxHp, src.hp + d * 2);
    if (src.burn) { P.burnT = 2.5; P.burnD = d * 0.2; }
    if (src.chill) P.chillT = 1.6;
  }
  if (P.hp <= 0) {
    if (ST.powers.phoenix && !RUN.phoenixUsed) { RUN.phoenixUsed = true; P.hp = ST.maxHp * 0.3; P.iframes = 1.5; burst(P.x, 1, P.z, 0xff9a3a, 30, 7, 0.22); toast('Phoenix Plume flares. You stand again.', 'var(--r4)'); }
    else die();
  }
}
function healPlayer(n, quiet) {
  if (P.dead) return;
  const before = P.hp; P.hp = Math.min(ST.maxHp, P.hp + n);
  if (!quiet && P.hp - before >= 1) floatNum(P.x, 2, P.z, '+' + fmt(P.hp - before), 'heal');
}
function gainXP(x) {
  S.xp += x;
  let up = false;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; up = true; }
  if (up) { ST = calcStats(); P.hp = ST.maxHp; toast(`Level ${S.level}. Health and damage rise.`, 'var(--xpc)', true); sfx('level'); burst(P.x, 1, P.z, 0xf2c56b, 26, 6, 0.18); }
}

// ================= loot =================
const RCOL = [0xbdb7a7, 0x74c269, 0x5c8ff2, 0xb56ff2, 0xf19a33];
function spawnDrop(x, z, data) {
  const a = rand(0, 6.28), r = rand(0.2, 1.3);
  const tx = x + Math.sin(a) * r, tz = z + Math.cos(a) * r;
  const fx = walkable(tx, tz) ? tx : x, fz = walkable(tx, tz) ? tz : z;
  const g = new THREE.Group();
  if (data.gold) { for (let k = 0; k < 3; k++) g.add(mesh(G.cyl, metal(0xe8b450, 0.25), 0.22, 0.05, 0.22, rand(-0.1, 0.1), k * 0.06, rand(-0.1, 0.1))); }
  else if (data.mat) { g.add(mesh(G.oct, mat(new THREE.Color(MATS[data.mat].c).getHex(), 1.8), 0.26, 0.34, 0.26, 0, 0.1, 0)); }
  else if (data.potion) { g.add(mesh(G.sph, mat(0xe0473b, 2), 0.28, 0.28, 0.28, 0, 0.1, 0), mesh(G.box, mat(0x8a6a4a), 0.08, 0.12, 0.08, 0, 0.3, 0)); }
  else if (data.item) {
    const c = RCOL[data.item.rarity];
    g.add(mesh(G.box, mat(c, 2.4), 0.3, 0.3, 0.3, 0, 0.2, 0)); g.children[0].rotation.set(0.6, 0, 0.6);
    if (data.item.rarity >= 2) { const beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); beam.scale.set(0.35, 6, 0.35); beam.position.y = 3; g.add(beam); levelDisp.push(beam.material); }
    if (data.item.rarity >= 3) sfx('rare');
  }
  g.position.set(fx, 0.3, fz);
  world.add(g);
  drops.push({ x: fx, z: fz, g, data, t: 0, vy: 4 });
}
function dropLoot(e) {
  const d = RUN.depth, B = biomeOf(d), mf = ST.mf;
  const gm = 1 + ST.gold / 100 + (ST.powers.midas ? 0.6 : 0);
  const mult = e.boss ? 6 : e.leader ? 3 : e.champ ? 2 : 1;
  if (chance(0.5) || e.leader || e.boss) spawnDrop(e.x, e.z, { gold: Math.max(1, Math.round(randi(2, 6) * Math.pow(1.09, d) * mult * gm)) });
  if (chance(0.22 * mult)) spawnDrop(e.x, e.z, { mat: pick(B.mats), n: e.boss ? randi(4, 7) : randi(1, 2) });
  if (chance(0.1 * mult)) spawnDrop(e.x, e.z, { mat: 'iron', n: randi(1, 2) });
  if (chance(0.06 * mult)) spawnDrop(e.x, e.z, { mat: 'herb', n: 1 });
  if (chance(0.03 * mult)) spawnDrop(e.x, e.z, { mat: 'essence', n: 1 });
  if (chance(0.02)) spawnDrop(e.x, e.z, { potion: 1 });
  let n = e.boss ? 3 : e.leader ? 1 : 0;
  if (chance(e.champ ? 0.4 : 0.065 + 0.002 * d)) n++;
  for (let k = 0; k < n; k++) spawnDrop(e.x, e.z, { item: genItem(d + (e.boss ? 1 : 0), { mf, min: e.boss ? (k === 0 ? 3 : 2) : e.leader ? 2 : 0 }) });
  if (e.boss) { spawnDrop(e.x, e.z, { mat: 'sigil', n: 1 + cycleOf(d) }); spawnDrop(e.x, e.z, { mat: 'essence', n: randi(3, 6) }); }
}
function updDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const D = drops[i];
    D.t += dt;
    if (D.vy > -10) { D.vy -= 18 * dt; D.g.position.y = Math.max(0.3, D.g.position.y + D.vy * dt); }
    D.g.rotation.y += dt * 1.8;
    const dist = Math.hypot(P.x - D.x, P.z - D.z);
    const auto = !D.data.item;
    if (auto && dist < 3.2 && D.t > 0.4) { const s = Math.min(1, dt * 9); D.x = lerp(D.x, P.x, s); D.z = lerp(D.z, P.z, s); }
    D.g.position.x = D.x; D.g.position.z = D.z;
    if (D.t > 0.35 && dist < 0.8) {
      if (D.data.item && S.inv.length >= BAG_CAP) { if (!D.warned) { D.warned = 1; toast('Your bag is full. Salvage or sell something.', 'var(--bad)'); } continue; }
      pickup(D.data);
      world.remove(D.g); drops.splice(i, 1);
    }
  }
}
function pickup(dt) {
  if (dt.gold) { S.gold += dt.gold; RUN && (RUN.gold += dt.gold); floatNum(P.x, 1.8, P.z, '+' + dt.gold + 'g', 'crit'); sfx('coin'); }
  else if (dt.mat) { addMat(dt.mat, dt.n); toast(`+${dt.n} ${MATS[dt.mat].n}`, MATS[dt.mat].c); sfx('coin'); questEvent('mat', dt.mat, dt.n); }
  else if (dt.potion) { S.potions++; toast('+1 Healing Draught', 'var(--blood-2)'); sfx('coin'); }
  else if (dt.item) { S.inv.push(dt.item); toast(dt.item.name, `var(--r${dt.item.rarity})`); sfx('coin'); if (RUN) RUN.items++; }
}
