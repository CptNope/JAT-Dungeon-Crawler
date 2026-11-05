// ================= level loading =================
let spinners = [];
function placePlayerMesh() {
  if (!P.mesh) { const h = makeHero(); P.mesh = h.g; P.hand = h.hand; scene.add(P.mesh); }
  if (P.wkind !== ST.wk) {
    if (P.weapon) P.hand.remove(P.weapon);
    P.weapon = weaponMesh(ST.wk); P.hand.add(P.weapon); P.wkind = ST.wk;
  }
  P.mesh.position.set(P.x, 0, P.z);
}
function setTownLights() {
  scene.background = new THREE.Color(0x8fb0c8); scene.fog = new THREE.Fog(0x8fb0c8, 34, 80);
  hemi.intensity = 2.4; hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0x4a5a3a);
  sun.intensity = 2.6; torch.intensity = 0;
}
function loadTown() {
  clearWorld(); spinners = [];
  LV = genTown(); bossRef = null; $('#bossBar').hidden = true;
  setTownLights();
  buildTownVisuals();
  world.traverse((o) => { if (o.userData && o.userData.spin) spinners.push(o); });
  addInteract({ x: 8.5, z: 11.6, r: 1.7, label: 'Your Home', ly: 5.4, verb: 'Go inside', act: () => openPanel('home') });
  addInteract({ x: 20.5, z: 10.6, r: 1.7, label: "Orla's Anvil", ly: 4.6, verb: 'Browse the forge', act: () => openPanel('smith') });
  addInteract({ x: 32.5, z: 10.6, r: 1.7, label: 'Bramble & Vial', ly: 4.6, verb: 'Browse the apothecary', act: () => openPanel('alch') });
  addInteract({ x: 34.5, z: 20.4, r: 1.7, label: 'Copper Lantern', ly: 4.6, verb: 'Trade goods', act: () => openPanel('trader') });
  addInteract({ x: 22, z: 31.4, r: 2.2, label: 'The Delve', ly: 5.2, verb: 'Descend', act: () => openPanel('delve') });
  P.x = LV.start.x; P.z = LV.start.z; P.dead = false; P.kx = P.kz = 0;
  ST = calcStats(); P.hp = ST.maxHp;
  placePlayerMesh(); resetMini(); snapCamera();
  warmLevel();
}
// threejs-performance, "Shader compile stalls": build every program the new level needs
// in parallel before its first frame instead of stalling mid-fight when a material first appears.
let levelReady = false, warmId = 0;
const warmGroup = new THREE.Group();
function warmLevel() {
  levelReady = false;
  const id = ++warmId;
  if (!warmGroup.children.length) {
    // one of each effect material that otherwise appears only mid-fight
    for (const c of [0xff3b2f, 0xff7a2a]) for (const m of teleMats(c)) warmGroup.add(new THREE.Mesh(G.disc, m));
    for (const c of [0xf0dcb0, 0xa98cff, 0xb48cff]) warmGroup.add(new THREE.Mesh(G.lsph, projMat(c)));
    warmGroup.add(new THREE.Mesh(G.plane, barBgMat), new THREE.Mesh(G.plane, barFgMat), swings[0].o.clone(), parts[0].m.clone());
    warmGroup.children.forEach((o) => { o.visible = true; o.position.set(P.x, -50, P.z); });
  }
  scene.add(warmGroup);
  const done = () => { if (id !== warmId) return; scene.remove(warmGroup); levelReady = true; };
  try { renderer.compileAsync(scene, camera).then(done, done); } catch (err) { done(); }
  setTimeout(done, 2500);
}
function populate() {
  const L = LV, d = L.depth, B = biomeOf(d);
  const pool = Object.entries(ARCH).filter(([, a]) => d >= a.from).map(([k, a]) => [k, a.w]);
  const spot = (r, pad) => {
    pad = pad || 1;
    for (let t = 0; t < 40; t++) {
      const x = rand(r.x + pad, r.x + r.w - pad), z = rand(r.y + pad, r.y + r.h - pad);
      if (walkable(x, z) && walkable(x + 0.5, z) && walkable(x - 0.5, z) && walkable(x, z + 0.5) && walkable(x, z - 0.5)) return [x, z];
    }
    return [r.x + r.w / 2, r.y + r.h / 2];
  };
  if (L.boss) {
    const a = L.arena;
    spawnEnemy('grunt', a.x + a.w / 2, a.y + 6, { boss: true });
    const ante = L.rooms[1];
    for (let k = 0; k < 3 + Math.floor(d / 10); k++) { const [x, z] = spot(ante); spawnEnemy(wpick(pool), x, z, { champ: k === 0 }); }
    addChest(...spot(ante, 1.5));
  } else {
    const vault = L.rooms.length > 4 ? L.rooms[randi(1, L.rooms.length - 1)] : null;
    for (const r of L.rooms.slice(1)) {
      const area = r.w * r.h;
      let n = Math.min(10, randi(2, 4) + Math.floor(d / 5) + (area > 60 ? 2 : 0));
      let lead = null;
      if (d >= 2 && chance(Math.min(0.38, 0.14 + d * 0.012))) {
        const [x, z] = spot(r, 2);
        lead = spawnEnemy(pick(['grunt', 'brute', 'caster', 'warden'].filter((k) => d >= ARCH[k].from)), x, z, { leader: true });
        n += 2;
      }
      for (let k = 0; k < n; k++) { const [x, z] = spot(r); const e = spawnEnemy(wpick(pool), x, z, { champ: chance(0.05 + d * 0.004) }); if (lead) e.lead = lead; }
      if (chance(0.22) || r === vault) addChest(...spot(r, 1.5));
      if (r === vault) addChest(...spot(r, 1.5));
      const nn = randi(0, 2);
      for (let k = 0; k < nn; k++) addNode(...spot(r, 1), pick(['iron', 'iron', 'herb', B.mats[0], B.mats[1]]));
    }
    const er = L.exitRoom;
    addStairs(er.x + er.w / 2, er.y + er.h / 2);
  }
  if (d % 5 === 1) addPortalHome(L.start.x + 2.2, L.start.z);
  // starting room gets a herb or ore sometimes
  if (chance(0.5)) addNode(L.start.x - 2, L.start.z + 1.5, 'herb');
}
function loadDungeon(depth) {
  clearWorld(); spinners = [];
  bossRef = null; $('#bossBar').hidden = true;
  LV = genDungeon(depth); RUN.depth = depth; RUN.phoenixUsed = false;
  S.best = Math.max(S.best, depth);
  const B = biomeOf(depth);
  scene.background = new THREE.Color(B.fog); scene.fog = new THREE.Fog(B.fog, 17, 36);
  hemi.intensity = 2.1; hemi.color.setHex(B.amb); hemi.groundColor.setHex(0x14141c);
  sun.intensity = 0.6; torch.color.setHex(B.torch); torch.intensity = 40;
  buildDungeonVisuals();
  P.x = LV.start.x; P.z = LV.start.z; P.kx = P.kz = 0;
  populate();
  const before = ST ? ST.maxHp : 0;
  ST = calcStats();
  if (RUN.fresh) { P.hp = ST.maxHp; RUN.fresh = false; } else P.hp = Math.min(ST.maxHp, P.hp + (ST.maxHp - before > 0 ? ST.maxHp - before : 0));
  placePlayerMesh(); resetMini(); snapCamera();
  flow = null; flowTile = -1; computeFlow();
  warmLevel();
  banner(`Depth ${depth}`, B.name + (cycleOf(depth) ? ` · Cycle ${cycleOf(depth) + 1}` : ''));
  save();
}
function addChest(x, z) {
  const g = new THREE.Group();
  g.add(mesh(G.box, mat(0x6a4426), 0.9, 0.5, 0.6, 0, 0.25, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3);
  lid.add(mesh(G.box, mat(0x7a5230), 0.92, 0.22, 0.62, 0, 0.11, 0.3), mesh(G.box, mat(0xd6a24a), 0.94, 0.06, 0.1, 0, 0.12, 0.6));
  g.add(lid, mesh(G.box, mat(0xd6a24a), 0.96, 0.08, 0.64, 0, 0.3, 0));
  g.position.set(x, 0, z); g.rotation.y = rand(-0.4, 0.4); world.add(g);
  addInteract({ x, z, r: 1.4, kind: 'chest', verb: 'Open chest', act(o) {
    lid.rotation.x = -1.9; o.dead = true; sfx('chest');
    const d = RUN.depth, mf = ST.mf;
    spawnDrop(x, z, { gold: Math.round(randi(8, 18) * Math.pow(1.09, d) * (1 + ST.gold / 100)) });
    const n = randi(1, 2);
    for (let k = 0; k < n; k++) spawnDrop(x, z, { item: genItem(d, { mf: mf + 30, min: chance(0.35) ? 1 : 0 }) });
    spawnDrop(x, z, { mat: pick(biomeOf(d).mats), n: randi(1, 3) });
    if (chance(0.4)) spawnDrop(x, z, { mat: pick(['iron', 'herb', 'essence']), n: randi(1, 2) });
    if (chance(0.3)) spawnDrop(x, z, { potion: 1 });
    burst(x, 0.8, z, 0xf2c56b, 16, 4, 0.12);
  } });
}
function addNode(x, z, kind) {
  const g = new THREE.Group();
  const c = new THREE.Color(MATS[kind].c).getHex();
  if (kind === 'herb') for (let k = 0; k < 4; k++) g.add(mesh(G.cone, mat(c), 0.22, rand(0.4, 0.7), 0.22, rand(-0.3, 0.3), 0.25, rand(-0.3, 0.3)));
  else {
    g.add(mesh(G.box, mat(0x3a3a40), 0.9, 0.3, 0.8, 0, 0.15, 0));
    for (let k = 0; k < 3; k++) { const o = mesh(G.oct, mat(c, kind === 'iron' ? 0 : 1), 0.3, 0.5, 0.3, rand(-0.3, 0.3), 0.4, rand(-0.25, 0.25)); o.rotation.z = rand(-0.4, 0.4); g.add(o); }
  }
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.3, kind: 'node', mat: kind, verb: `Gather ${MATS[kind].n}`, act(o) {
    o.dead = true; world.remove(g); sfx('coin');
    spawnDrop(x, z, { mat: kind, n: kind === 'iron' ? randi(2, 4) : kind === 'herb' ? randi(2, 3) : randi(1, 2) });
    burst(x, 0.5, z, c, 12, 3, 0.1);
  } });
}
function addStairs(x, z) {
  const g = new THREE.Group();
  g.add(mesh(G.box, mat(0x050507, 1), 2.2, 0.04, 2.2, 0, 0.02, 0));
  for (let k = 0; k < 3; k++) g.add(mesh(G.box, mat(0x2a2a30), 1.6 - k * 0.4, 0.05, 0.4, 0, 0.05, -0.6 + k * 0.45));
  const ring = mesh(G.ring, mat(0x7fbf6a, 1), 1.5, 1, 1.5, 0, 0.06, 0); g.add(ring);
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.6, kind: 'stairs', label: 'Stairs down', ly: 2.2, cls: '', verb: `Descend to depth ${RUN.depth + 1}`, act: () => nextFloor() });
}
function addPortalHome(x, z) {
  if (!walkable(x, z)) { x = LV.start.x; z = LV.start.z + 1.5; }
  const g = new THREE.Group();
  const t = mesh(G.fullTorus, mat(0x6ab0ff, 1), 0.9, 1.2, 0.9, 0, 1.3, 0); g.add(t);
  const disc = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: 0x3a6aff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  disc.scale.set(1.7, 2.3, 1); disc.position.y = 1.3; g.add(disc); levelDisp.push(disc.material);
  g.position.set(x, 0, z); g.userData.spin = 2; world.add(g); spinners.push(g);
  addInteract({ x, z, r: 1.6, kind: 'portal', label: 'Way home', ly: 3, cls: '', verb: 'Return to Hearthdeep', act: () => returnToTown(false) });
}
function nextFloor() {
  const d = RUN.depth + 1;
  RUN.floors++;
  loadDungeon(d);
}
function bossDefeated(e) {
  S.bossKills++; S.slain.push({ n: e.name, c: e.color });
  const wp = RUN.depth + 1;
  if (!S.waypoints.includes(wp)) S.waypoints.push(wp);
  S.waypoints.sort((a, b) => a - b);
  bossRef = null; $('#bossBar').hidden = true;
  banner(`${e.name} falls`, `Waypoint opened at depth ${wp}`);
  sfx('level');
  const a = LV.arena;
  addStairs(a.x + a.w / 2 + 2.5, a.y + a.h / 2);
  addPortalHome(a.x + a.w / 2 - 2.5, a.y + a.h / 2);
  for (const q of enemies) if (q.owner === e && !q.dead) killEnemy(q, true);
  ST = calcStats();
  save();
}
function startDelve(depth, elix) {
  RUN = { depth, start: depth, buffs: {}, rested: S.rested, phoenixUsed: false, gold: 0, items: 0, floors: 1, fresh: true };
  for (const k of elix) if (S.elixirs[k] > 0) { S.elixirs[k]--; RUN.buffs[k] = 1; }
  S.rested = false; S.runs++;
  closePanel();
  loadDungeon(depth);
  if (RUN.rested) toast('Well rested: bonus health this descent.', 'var(--ok)');
}
function returnToTown(died) {
  const summary = RUN ? `Back home from depth ${RUN.depth} with ${RUN.gold} gold and ${RUN.items} item${RUN.items === 1 ? '' : 's'}.` : '';
  const gl = S.home.garden;
  let grew = '';
  if (gl) { addMat('herb', [0, 2, 4, 7][gl]); if (gl >= 2) addMat('essence', gl - 1); if (gl >= 3) addMat('spore', 2); grew = 'Your garden yielded fresh Bitterleaf.'; }
  S.shop = null;
  RUN = null;
  loadTown();
  if (!died && summary) toast(summary, 'var(--brass-2)', true);
  if (grew) toast(grew, 'var(--ok)');
  save();
}
function die() {
  P.dead = true; P.hp = 0;
  const lost = Math.floor(S.gold * 0.25);
  S.gold -= lost; S.deaths++;
  P.mesh.rotation.z = Math.PI / 2; P.mesh.position.y = 0.3;
  $('#deathText').textContent = `${biomeOf(RUN.depth).name}, depth ${RUN.depth}. You dropped ${fmt(lost)} gold in the dark, but your gear and materials came home with you.`;
  setTimeout(() => { $('#death').hidden = false; $('#btnRevive').focus(); }, 900);
  sfx('die');
  save();
}

// ================= player =================
const keys = {};
const stick = { x: 0, y: 0 };
let mouseDown = false, touchAtk = false, touchMode = false;
const mouse = new THREE.Vector2(0, 0);
let potCd = 0;
function tryDodge() {
  if (P.dodgeCd > 0 || P.dead || isPaused()) return;
  const mv = Math.hypot(P.mx || 0, P.mz || 0) > 0.1;
  P.dodgeDir = mv ? Math.atan2(P.mx, P.mz) : P.face;
  P.dodgeT = 0.2; P.dodgeCd = 0.85; P.iframes = Math.max(P.iframes, 0.32); P.ghostT = 0;
  sfx('dodge'); burst(P.x, 0.2, P.z, 0xc8c0a8, 6, 2, 0.1);
}
function usePotion(greater) {
  if (P.dead || potCd > 0) return;
  if (P.hp >= ST.maxHp - 0.5) { toast('Already at full health.', 'var(--muted)'); return; }
  if (greater === undefined) greater = S.potions <= 0 && S.gpotions > 0;
  const k = greater ? 'gpotions' : 'potions';
  if (S[k] <= 0) { toast(greater ? 'No Greater Draughts left.' : 'No Healing Draughts left.', 'var(--bad)'); return; }
  S[k]--; potCd = 0.8;
  healPlayer(ST.maxHp * (greater ? 0.75 : 0.4));
  sfx('drink'); burst(P.x, 1, P.z, 0xe0473b, 10, 2, 0.1);
}
function useScroll() {
  if (P.dead) return;
  if (!LV || LV.type !== 'dungeon') { toast('Portal scrolls only work below ground.', 'var(--muted)'); return; }
  if (S.scrolls <= 0) { toast('No Portal Scrolls. Craft them at home or buy them from Bramble & Vial.', 'var(--bad)'); return; }
  if (interacts.some((o) => o.kind === 'portal' && !o.dead && Math.hypot(o.x - P.x, o.z - P.z) < 6)) { toast('A way home is already open nearby.', 'var(--muted)'); return; }
  S.scrolls--;
  const a = P.face; let x = P.x + Math.sin(a) * 1.6, z = P.z + Math.cos(a) * 1.6;
  if (!walkable(x, z)) { x = P.x; z = P.z; }
  addPortalHome(x, z);
  sfx('portal');
}
let nearI = null;
function interact() { if (nearI && !P.dead && !isPaused()) nearI.act(nearI); }
const _ray = new THREE.Raycaster();
function aimPoint() {
  _ray.setFromCamera(mouse, camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  if (Math.abs(d.y) < 1e-4) return null;
  const t = (0.6 - o.y) / d.y;
  return { x: o.x + d.x * t, z: o.z + d.z * t };
}
function updPlayer(dt) {
  if (P.dead) return;
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  ix += stick.x; iz += stick.y;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  P.mx = ix; P.mz = iz;
  P.atkT -= dt; P.swingT -= dt; P.dodgeCd -= dt; P.iframes -= dt; potCd -= dt;
  if (P.frenzyT > 0) { P.frenzyT -= dt; if (P.frenzyT <= 0) P.frenzy = 0; }
  if (P.chillT > 0) P.chillT -= dt;
  if (P.burnT > 0) { P.burnT -= dt; P.hp -= P.burnD * dt; if (P.hp <= 0 && LV.type === 'dungeon') { P.hp = 0.01; hurtPlayer(9999, null); } }
  const spd = 5.3 * (1 + ST.move / 100) * (P.chillT > 0 ? 0.6 : 1);
  let vx = ix * spd, vz = iz * spd;
  if (P.dodgeT > 0) {
    P.dodgeT -= dt; vx = Math.sin(P.dodgeDir) * 15; vz = Math.cos(P.dodgeDir) * 15;
    if (ST.powers.ghost && LV.type === 'dungeon') { P.ghostT -= dt; if (P.ghostT <= 0) { P.ghostT = 0.07; telegraph(P.x, P.z, 1.3, 0.35, ST.dmg * 0.45, { player: true, col: 0x9fd4ff }); } }
  }
  P.kx = (P.kx || 0) * Math.pow(0.002, dt); P.kz = (P.kz || 0) * Math.pow(0.002, dt);
  P.x += (vx + P.kx) * dt; P.z += (vz + P.kz) * dt;
  collide(P);
  // aim
  const wantsAtk = mouseDown || touchAtk || keys.KeyJ;
  if (touchMode) {
    let best = null, bd = 9;
    if (LV.type === 'dungeon') for (const e of enemies) { if (e.dead || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
    if (best && (wantsAtk || il < 0.1)) P.face = Math.atan2(best.x - P.x, best.z - P.z);
    else if (il > 0.1) P.face = Math.atan2(ix, iz);
  } else {
    const ap = aimPoint();
    if (ap) P.face = Math.atan2(ap.x - P.x, ap.z - P.z);
  }
  if (wantsAtk) playerAttack();
  if (LV.type === 'dungeon') P.hp = Math.min(ST.maxHp, P.hp + ST.regen * dt);
  else P.hp = ST.maxHp;
  // visuals
  const moving = il > 0.1 || P.dodgeT > 0;
  P.walk += dt * (moving ? 12 : 0);
  P.mesh.position.set(P.x, moving ? Math.abs(Math.sin(P.walk)) * 0.09 : 0, P.z);
  P.mesh.rotation.y = P.face;
  P.mesh.rotation.z = 0;
  const w = curWeapon();
  if (P.swingT > 0 && !w.ranged) { const t = 1 - P.swingT / P.swingDur; P.hand.rotation.y = lerp(w.arc / 2, -w.arc / 2, t); P.hand.rotation.x = 0; }
  else if (P.swingT > 0) { P.hand.rotation.y = 0; P.hand.position.z = 0.1 - 0.15 * (P.swingT / P.swingDur); }
  else { P.hand.rotation.y = lerp(P.hand.rotation.y, 0.3, Math.min(1, dt * 10)); P.hand.position.z = 0.1; }
  P.mesh.visible = !(P.iframes > 0 && P.dodgeT <= 0 && Math.floor(P.iframes * 20) % 2 === 0);
  torch.position.set(P.x, 2.6, P.z + 0.4);
}
function snapCamera() {
  camera.position.set(P.x + CAM_OFF.x * camZoom, CAM_OFF.y * camZoom, P.z + CAM_OFF.z * camZoom);
  camera.lookAt(P.x, 0.6, P.z);
}
function updCamera(dt) {
  const k = 1 - Math.exp(-dt * 7);
  camera.position.x = lerp(camera.position.x, P.x + CAM_OFF.x * camZoom, k);
  camera.position.y = lerp(camera.position.y, CAM_OFF.y * camZoom, k);
  camera.position.z = lerp(camera.position.z, P.z + CAM_OFF.z * camZoom, k);
  camera.lookAt(camera.position.x - CAM_OFF.x * camZoom, 0.6, camera.position.z - CAM_OFF.z * camZoom);
}
function updInteract() {
  let best = null, bd = 1e9;
  for (const o of interacts) {
    if (o.dead) { if (o.lbl) { removeLabel(o.lbl); o.lbl = null; } continue; }
    const d = Math.hypot(o.x - P.x, o.z - P.z);
    if (d < o.r && d < bd) { bd = d; best = o; }
  }
  for (let i = interacts.length - 1; i >= 0; i--) if (interacts[i].dead) { const o = interacts[i]; for (const L of labelEls.filter((q) => q.ref === o)) removeLabel(L); interacts.splice(i, 1); }
  if (best !== nearI) {
    nearI = best;
    const el = $('#prompt');
    if (best) { el.innerHTML = `${touchMode ? '' : '<kbd>E</kbd>'}<span>${esc(best.verb)}</span>`; el.hidden = false; }
    else el.hidden = true;
    $('#tUse').classList.toggle('ready', !!best);
  }
}

// ================= minimap =================
const mini = $('#mini'), mctx = mini.getContext('2d');
let miniBase = null, mbctx = null, revealT = 0;
const MS = 4;
function resetMini() {
  miniBase = document.createElement('canvas'); miniBase.width = LV.w * MS; miniBase.height = LV.h * MS;
  mbctx = miniBase.getContext('2d');
  if (LV.type === 'town') {
    for (let j = 0; j < LV.h; j++) for (let i = 0; i < LV.w; i++) {
      const g = LV.g[j * LV.w + i], p = LV.path[j * LV.w + i];
      mbctx.fillStyle = g ? (p ? '#8a7a5a' : '#3f6a34') : (i < 2 || j < 2 || i >= LV.w - 2 || j >= LV.h - 2 ? '#1e3a22' : '#7a6a5a');
      mbctx.fillRect(i * MS, j * MS, MS, MS);
    }
  }
}
function reveal() {
  const r = 7, ci = Math.floor(P.x), cj = Math.floor(P.z), B = biomeOf(LV.depth);
  const fc = '#' + new THREE.Color(B.floor).multiplyScalar(1.8).getHexString(), wc = '#' + new THREE.Color(B.wall).multiplyScalar(1.4).getHexString();
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) continue;
    if ((i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
    const k = j * LV.w + i; if (LV.explored[k]) continue;
    LV.explored[k] = 1;
    mbctx.fillStyle = LV.g[k] === 1 ? fc : wc;
    mbctx.fillRect(i * MS, j * MS, MS, MS);
  }
}
function drawMini() {
  const W = mini.width, H = mini.height;
  mctx.fillStyle = '#07070b'; mctx.fillRect(0, 0, W, H);
  let sc, ox, oz;
  if (LV.type === 'town') { sc = Math.min(W / LV.w, H / LV.h); ox = (W - LV.w * sc) / 2; oz = (H - LV.h * sc) / 2; }
  else { sc = 3.4; ox = W / 2 - P.x * sc; oz = H / 2 - P.z * sc; }
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniBase, ox, oz, LV.w * sc, LV.h * sc);
  const dot = (x, z, c, s) => { mctx.fillStyle = c; mctx.fillRect(ox + x * sc - s / 2, oz + z * sc - s / 2, s, s); };
  for (const o of interacts) {
    if (o.dead || !LV.explored[tidx(o.x, o.z)]) continue;
    const c = o.kind === 'stairs' ? '#7fbf6a' : o.kind === 'portal' ? '#6ab0ff' : o.kind === 'chest' ? '#f2c56b' : o.kind === 'node' ? MATS[o.mat].c : '#f2c56b';
    dot(o.x, o.z, c, o.kind === 'stairs' || o.kind === 'portal' || !o.kind ? 7 : 4);
  }
  if (LV.type === 'dungeon') for (const e of enemies) {
    if (e.dead || !LV.explored[tidx(e.x, e.z)]) continue;
    if (!e.awake && !e.leader && !e.boss && Math.hypot(e.x - P.x, e.z - P.z) > 9) continue;
    dot(e.x, e.z, e.boss ? '#f19a33' : e.leader ? '#f19a33' : e.champ ? '#5c8ff2' : '#e0675b', e.boss ? 8 : e.leader ? 6 : 3.5);
  }
  mctx.save(); mctx.translate(ox + P.x * sc, oz + P.z * sc); mctx.rotate(-P.face + Math.PI);
  mctx.fillStyle = '#f2c56b'; mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(4, 4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill(); mctx.restore();
}

// ================= audio =================
let AC = null, muted = true, lastHit = 0;
function sfx(t) {
  if (muted) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const now = AC.currentTime;
    const tone = (f1, f2, dur, type, vol, delay) => {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'square';
      const t0 = now + (delay || 0);
      o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
      g.gain.setValueAtTime(vol || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    };
    const noise = (dur, vol, f) => {
      const b = AC.createBuffer(1, Math.floor(AC.sampleRate * dur), AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f || 1800;
      const g = AC.createGain(); g.gain.value = vol || 0.08; s.connect(fl).connect(g).connect(AC.destination); s.start();
    };
    switch (t) {
      case 'hit': if (now - lastHit < 0.04) return; lastHit = now; noise(0.07, 0.09, 1400); tone(180, 90, 0.06, 'square', 0.03); break;
      case 'swing': noise(0.09, 0.05, 3200); break;
      case 'shoot': tone(700, 300, 0.08, 'triangle', 0.04); break;
      case 'hurt': tone(220, 80, 0.18, 'sawtooth', 0.06); break;
      case 'coin': tone(1200, 1800, 0.07, 'square', 0.025); break;
      case 'rare': tone(660, 660, 0.12, 'triangle', 0.05); tone(990, 990, 0.2, 'triangle', 0.05, 0.1); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.05, i * 0.08)); break;
      case 'dodge': noise(0.12, 0.05, 900); break;
      case 'drink': tone(300, 600, 0.2, 'sine', 0.06); break;
      case 'boom': noise(0.35, 0.18, 600); tone(90, 40, 0.3, 'sawtooth', 0.06); break;
      case 'boss': tone(110, 55, 0.9, 'sawtooth', 0.07); tone(165, 82, 0.9, 'sawtooth', 0.04); break;
      case 'chest': tone(400, 800, 0.15, 'triangle', 0.05); break;
      case 'portal': tone(300, 900, 0.4, 'sine', 0.05); break;
      case 'die': tone(300, 50, 1.2, 'sawtooth', 0.07); break;
      case 'buy': tone(900, 1300, 0.09, 'square', 0.03); tone(1300, 1300, 0.09, 'square', 0.03, 0.08); break;
      case 'craft': noise(0.1, 0.08, 2400); tone(500, 500, 0.1, 'square', 0.03, 0.06); break;
    }
  } catch (err) { /* audio unavailable */ }
}

// ================= persistence =================
const SAVE_KEY = 'hearthdeep.save.v1';
function save() { try { if (S && started) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (err) { /* storage unavailable */ } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (err) { return null; } }
function fixUid() {
  let m = 0; const all = [...S.inv, ...S.stash, ...Object.values(S.equip).filter(Boolean), ...((S.shop && S.shop.items) || [])];
  for (const it of all) m = Math.max(m, it.id || 0);
  uid = m + 1;
}
function normalizeSave(s) {
  const d = newSave();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.home = Object.assign(d.home, s.home); s.elixirs = Object.assign(d.elixirs, s.elixirs); s.equip = Object.assign(d.equip, s.equip);
  return s;
}
