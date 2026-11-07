// ================= level loading =================
let spinners = [];
function placePlayerMesh() {
  if (!P.mesh) { const h = makeHero(); P.mesh = h.g; P.hand = h.hand; P.shoulder = h.shoulder; P.u = h.u; scene.add(P.mesh); }
  if (P.wkind !== ST.wk) {
    if (P.weapon) P.hand.remove(P.weapon);
    P.weapon = weaponMesh(ST.wk); P.hand.add(P.weapon); P.wkind = ST.wk;
  }
  P.mesh.position.set(P.x, 0, P.z);
}
function setTownLights() {
  // golden hour: a low warm sun throws long shadows; the sky dome and a gradient environment fill the rest
  scene.background = new THREE.Color(0xe2c8a0); scene.fog = new THREE.Fog(0xe2c8a0, SET.cam === 'top' ? 40 : 30, SET.cam === 'top' ? 95 : 150);
  if (!sky.parent) scene.add(sky);
  hemi.intensity = 1.1; hemi.color.setHex(0xb8d0f0); hemi.groundColor.setHex(0x6a5a3a);
  sun.intensity = 3.4; sun.color.setHex(0xffd2a0); torch.intensity = 0;
  for (const l of torchPool) l.intensity = 0;
  setAmbient('town');
  sun.castShadow = Q.sunShadow > 0; torch.castShadow = false; // shadow passes only where that light matters
  Post.grade([0.9, 0.96, 1.1], [1.06, 1.0, 0.9], 1.12, 0.3, 0.75, 1.15);
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
  elderLabel = addInteract({ x: 24.5, z: 18.2, r: 1.8, label: 'Elder Maren', ly: 2.4, verb: 'Talk to Elder Maren', act: () => openPanel('elder') });
  P.x = LV.start.x; P.z = LV.start.z; P.dead = false; P.kx = P.kz = 0;
  ST = calcStats(); P.hp = ST.maxHp;
  placePlayerMesh(); resetMini(); snapCamera();
  releaseLock(); setMusic('town');
  P.u.uRim.value.setRGB(0.05, 0.06, 0.08);
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
    warmGroup.add(new THREE.Mesh(G.plane, barBgMat), new THREE.Mesh(G.plane, barFgMat), swings[0].o.clone());
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
    placeSpecialRooms(vault);
    placeTraps();
  }
  if (d % 5 === 1) addPortalHome(L.start.x + 2.2, L.start.z);
  // starting room gets a herb or ore sometimes
  if (chance(0.5)) addNode(L.start.x - 2, L.start.z + 1.5, 'herb');
}
function loadDungeon(depth) {
  clearWorld(); spinners = [];
  bossRef = null; $('#bossBar').hidden = true;
  LV = genDungeon(depth); RUN.depth = depth; RUN.phoenixUsed = false; RUN.shrine = null; RUN.ambush = null;
  releaseLock();
  S.best = Math.max(S.best, depth);
  const B = biomeOf(depth);
  scene.background = new THREE.Color(B.fog); scene.fog = new THREE.Fog(B.fog, 17, 36);
  hemi.intensity = 2.1; hemi.color.setHex(B.amb); hemi.groundColor.setHex(0x14141c);
  torch.color.setHex(B.torch); torch.intensity = 30; torch.distance = 22;
  if (sky.parent) scene.remove(sky);
  sun.castShadow = false; torch.castShadow = Q.torchShadow && SET.cam !== 'top';
  hemi.intensity = 2.4; sun.intensity = 0.7; sun.color.setHex(B.amb);
  setAmbient(B.id);
  Post.grade([0.88, 0.94, 1.12], [1.08, 1.0, 0.9], 1.06, 0.5, 1.0, 0.9);
  buildDungeonVisuals();
  P.x = LV.start.x; P.z = LV.start.z; P.kx = P.kz = 0;
  populate();
  lightForView(); setMusic('dng:' + B.id); questEvent('depth', depth);
  P.u.uRim.value.set(B.torch).multiplyScalar(0.12);
  const before = ST ? ST.maxHp : 0;
  ST = calcStats();
  if (RUN.fresh) { P.hp = ST.maxHp; RUN.fresh = false; } else P.hp = Math.min(ST.maxHp, P.hp + (ST.maxHp - before > 0 ? ST.maxHp - before : 0));
  placePlayerMesh(); resetMini(); snapCamera();
  flow = null; flowTile = -1; computeFlow();
  warmLevel();
  banner(`Depth ${depth}`, B.name + (cycleOf(depth) ? ` · Cycle ${cycleOf(depth) + 1}` : ''));
  save();
}
function addChest(x, z, rich) {
  const g = new THREE.Group();
  const W = worldMats();
  g.add(mesh(G.box, W.door, 0.95, 0.5, 0.62, 0, 0.25, 0));
  for (const s of [-1, 1]) g.add(mesh(G.box, W.gold, 0.08, 0.52, 0.66, s * 0.3, 0.26, 0));
  g.add(mesh(G.box, mat(0xffc24a, 3), 0.86, 0.04, 0.5, 0, 0.5, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.31);
  { const top = mesh(G.cyl, W.door, 0.3, 0.95, 0.31, 0, 0.02, 0.31); top.rotation.z = Math.PI / 2; top.scale.set(0.62, 0.95, 0.62); lid.add(top); }
  for (const s of [-1, 1]) { const b = mesh(G.cyl, W.gold, 0.66, 0.08, 0.66, s * 0.3, 0.02, 0.31); b.rotation.z = Math.PI / 2; b.scale.set(0.64, 0.08, 0.64); lid.add(b); }
  lid.add(mesh(G.box, W.gold, 0.16, 0.18, 0.06, 0, -0.05, 0.63));
  g.add(lid);
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(x, 0, z); g.rotation.y = rand(-0.4, 0.4); world.add(g);
  if (rich) { g.scale.setScalar(1.25); g.add(makeFlames([{ x: -0.55, y: 0.6, z: 0.3 }, { x: 0.55, y: 0.6, z: 0.3 }])); }
  addInteract({ x, z, r: 1.4, kind: 'chest', verb: rich ? 'Open the altar hoard' : 'Open chest', act(o) {
    lid.rotation.x = -1.9; o.dead = true; sfx('chest');
    const d = RUN.depth, mf = ST.mf;
    spawnDrop(x, z, { gold: Math.round(randi(8, 18) * Math.pow(1.09, d) * (1 + ST.gold / 100)) });
    const n = randi(1, 2);
    for (let k = 0; k < n + (rich ? 1 : 0); k++) spawnDrop(x, z, { item: genItem(d + (rich ? 1 : 0), { mf: mf + (rich ? 120 : 30), min: rich ? 2 : chance(0.35) ? 1 : 0 }) });
    if (rich) { spawnDrop(x, z, { gold: Math.round(randi(30, 50) * Math.pow(1.09, d)) }); spawnDrop(x, z, { mat: 'essence', n: randi(2, 4) }); }
    spawnDrop(x, z, { mat: pick(biomeOf(d).mats), n: randi(1, 3) });
    if (chance(0.4)) spawnDrop(x, z, { mat: pick(['iron', 'herb', 'essence']), n: randi(1, 2) });
    if (chance(0.3)) spawnDrop(x, z, { potion: 1 });
    burst(x, 0.8, z, 0xf2c56b, 16, 4, 0.12);
  } });
}
function addNode(x, z, kind) {
  const g = new THREE.Group();
  const c = new THREE.Color(MATS[kind].c).getHex();
  if (kind === 'herb') for (let k = 0; k < 7; k++) { const l = mesh(G.cone, mat(c), 0.16, rand(0.45, 0.8), 0.06, rand(-0.25, 0.25), 0.25, rand(-0.25, 0.25)); l.rotation.set(rand(-0.4, 0.4), rand(0, 6), rand(-0.4, 0.4)); g.add(l); }
  else {
    g.add(mesh(G.dodec, mat(0x55525c), 1.0, 0.55, 0.85, 0, 0.18, 0));
    for (let k = 0; k < 4; k++) { const o = mesh(G.oct, kind === 'iron' ? metal(0x9aa0aa, 0.35) : mat(c, 2.6), 0.24, rand(0.4, 0.62), 0.24, rand(-0.3, 0.3), 0.42, rand(-0.25, 0.25)); o.rotation.set(rand(-0.4, 0.4), rand(0, 6), rand(-0.5, 0.5)); g.add(o); }
  }
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.3, kind: 'node', mat: kind, verb: `Gather ${MATS[kind].n}`, act(o) {
    o.dead = true; world.remove(g); sfx('coin');
    spawnDrop(x, z, { mat: kind, n: kind === 'iron' ? randi(2, 4) : kind === 'herb' ? randi(2, 3) : randi(1, 2) });
    burst(x, 0.5, z, c, 12, 3, 0.1);
  } });
}
function addStairs(x, z) {
  const g = new THREE.Group();
  const W = worldMats();
  g.add(mesh(G.box, mat(0x020203, 1), 2.0, 0.03, 2.0, 0, 0.015, 0));
  for (let k = 0; k < 4; k++) g.add(mesh(G.box, W.stone, 1.7, 0.06, 0.34, 0, 0.03 - k * 0.001, -0.7 + k * 0.42));
  for (const [sx, sz, w, d] of [[0, -1.08, 2.4, 0.18], [0, 1.08, 2.4, 0.18], [-1.08, 0, 0.18, 2.4], [1.08, 0, 0.18, 2.4]]) g.add(mesh(G.box, W.stone, w, 0.22, d, sx, 0.11, sz));
  const ring = mesh(G.ring, mat(0x7fdf6a, 3), 1.45, 1, 1.45, 0, 0.24, 0); g.add(ring);
  g.add(makeFlames([{ x: -1.08, y: 0.25, z: -1.08 }, { x: 1.08, y: 0.25, z: -1.08 }, { x: -1.08, y: 0.25, z: 1.08 }, { x: 1.08, y: 0.25, z: 1.08 }]));
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.6, kind: 'stairs', label: 'Stairs down', ly: 2.2, cls: '', verb: `Descend to depth ${RUN.depth + 1}`, act: () => nextFloor() });
}
function addPortalHome(x, z) {
  if (!walkable(x, z)) { x = LV.start.x; z = LV.start.z + 1.5; }
  const g = new THREE.Group(), W = worldMats();
  g.add(mesh(G.fullTorus, mat(0x6ab0ff, 3.4), 0.92, 1.25, 0.92, 0, 1.32, 0));
  const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(0.88, 1.2, 1); disc.position.y = 1.32; g.add(disc);
  for (const s of [-1, 1]) g.add(mesh(G.box, W.stone, 0.34, 0.5, 0.34, s * 0.95, 0.25, 0));
  g.add(makeFlames([{ x: -0.95, y: 0.55, z: 0 }, { x: 0.95, y: 0.55, z: 0 }], portalFlameMat()));
  g.position.set(x, 0, z); world.add(g); facers.push(g);
  addInteract({ x, z, r: 1.6, kind: 'portal', label: 'Way home', ly: 3, cls: '', verb: 'Return to Hearthdeep', act: () => returnToTown(false) });
}
function nextFloor() {
  const d = RUN.depth + 1;
  RUN.floors++;
  loadDungeon(d);
}
function bossDefeated(e) {
  setMusic('dng:' + biomeOf(RUN.depth).id); questEvent('boss', RUN.depth);
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
  S.shop = null; S.questOffers = null;
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
  P.mesh.rotation.z = Math.PI / 2; P.mesh.position.y = 0.3; P.mesh.visible = true; viewmodel.g.visible = false;
  releaseLock(); setMusic(null); shake(0.6);
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
// ================= camera modes =================
// top: angled overhead, mouse aims on the ground. third: over-the-shoulder chase camera with wall collision.
// first: eye-level with a held weapon. In third and first, mouse (pointer lock) or a touch drag turns the view.
const CAM = { yaw: Math.PI, pitch: 0.28, dist: 4.6, curDist: 4.6, bob: 0, tight: 0 };
const CAM_NAMES = { top: 'Overhead', third: 'Third person', first: 'First person' };
function setCamMode(m) {
  if (!CAM_NAMES[m]) m = 'top';
  const prev = SET.cam; SET.cam = m; saveSettings();
  if (prev === 'top' && m !== 'top') { CAM.yaw = Math.PI; CAM.pitch = m === 'first' ? 0.05 : 0.28; }
  if (m === 'top' && document.pointerLockElement) document.exitPointerLock();
  updateFov();
  $('#crosshair').hidden = m === 'top';
  $('#btnView').textContent = window.innerWidth < 640 ? 'View' : 'View: ' + CAM_NAMES[m];
  if (LV && LV.type === 'dungeon') { layoutWalls(); lightForView(); }
  if (LV && LV.type === 'town') scene.fog = new THREE.Fog(0xe2c8a0, m === 'top' ? 40 : 30, m === 'top' ? 95 : 150);
  snapCamera();
}
function cycleCam() { setCamMode(SET.cam === 'top' ? 'third' : SET.cam === 'third' ? 'first' : 'top'); toast('View: ' + CAM_NAMES[SET.cam], 'var(--brass-2)'); }
function lookBy(dx, dy) {
  const s = 0.0026 * (SET.sens || 1);
  CAM.yaw -= dx * s;
  CAM.pitch = clamp(CAM.pitch + dy * s, SET.cam === 'first' ? -1.2 : -0.35, SET.cam === 'first' ? 1.2 : 1.1);
}
const _cv = new THREE.Vector3(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(0, 0, 0, 'YXZ');
function camBlocked(x, y, z) {
  if (y > (LV.type === 'dungeon' ? wallHeight() : 7)) return false;
  return !walkable(x, z);
}
const camProbe = { x: 0, z: 0, r: 0.3 };
function placeCamera(dt, snap) {
  const mode = SET.cam;
  camera.position.sub(shakeOff); shakeOff.set(0, 0, 0);
  if (mode === 'top') {
    const k = snap ? 1 : 1 - Math.exp(-dt * 7);
    camera.position.x = lerp(camera.position.x, P.x + CAM_OFF.x * camZoom, k);
    camera.position.y = lerp(camera.position.y, CAM_OFF.y * camZoom, k);
    camera.position.z = lerp(camera.position.z, P.z + CAM_OFF.z * camZoom, k);
    camera.lookAt(camera.position.x - CAM_OFF.x * camZoom, 0.6, camera.position.z - CAM_OFF.z * camZoom);
    return;
  }
  if (lockT && lockT.mesh) { // lock-on swings the view onto the target and keeps it framed
    const k = snap ? 1 : 1 - Math.exp(-dt * 8), dist = Math.hypot(lockT.x - P.x, lockT.z - P.z);
    CAM.yaw += angDiff(Math.atan2(lockT.x - P.x, lockT.z - P.z), CAM.yaw) * k;
    const tp = mode === 'first' ? Math.atan2(1.58 - lockT.h * lockT.scale * 0.6, Math.max(0.5, dist)) : clamp(0.42 - dist * 0.02, 0.18, 0.42);
    CAM.pitch = lerp(CAM.pitch, tp, k * 0.6);
  }
  _ce.set(-CAM.pitch, CAM.yaw + Math.PI, 0); camera.quaternion.setFromEuler(_ce);
  if (mode === 'first') {
    CAM.bob += dt * (Math.hypot(P.mx || 0, P.mz || 0) > 0.1 ? 11 : 0);
    camera.position.set(P.x, 1.58 + Math.sin(CAM.bob) * 0.035, P.z);
    return;
  }
  // third person: follow a little behind the delver, pull in when a wall sits between shoulder and camera
  const fk = snap ? 1 : 1 - Math.exp(-dt * 14);
  CAM.fx = snap || CAM.fx === undefined ? P.x : lerp(CAM.fx, P.x, fk); CAM.fz = snap || CAM.fz === undefined ? P.z : lerp(CAM.fz, P.z, fk);
  const hx = CAM.fx, hy = 1.65, hz = CAM.fz;
  _cv.set(0.55, 0.15, 1).applyQuaternion(camera.quaternion);
  let d = CAM.dist;
  for (let t = 0.3; t <= CAM.dist; t += 0.2) { if (camBlocked(hx + _cv.x * t, hy + _cv.y * t, hz + _cv.z * t)) { d = Math.max(0.6, t - 0.35); break; } }
  CAM.curDist = snap ? d : (d < CAM.curDist ? d : lerp(CAM.curDist, d, 1 - Math.exp(-dt * 4)));
  // when a wall shoves the lens in, rise up over the shoulder so the delver doesn't fill the frame
  const tight = clamp(1 - (CAM.curDist - 0.6) / 2.2, 0, 1);
  camera.position.set(hx + _cv.x * CAM.curDist, Math.max(0.4, hy + _cv.y * CAM.curDist + tight * 0.75), hz + _cv.z * CAM.curDist);
  CAM.tight = tight;
  if (camera.position.y < (LV.type === 'dungeon' ? wallHeight() : 7)) { // keep the lens out of the stonework
    camProbe.x = camera.position.x; camProbe.z = camera.position.z; collide(camProbe);
    camera.position.x = camProbe.x; camera.position.z = camProbe.z;
  }
}
function snapCamera() { placeCamera(0, true); }
function updCamera(dt) {
  placeCamera(dt, false);
  const want = SET.cam !== 'top' && (P.dodgeT > 0 || P.dashT > 0) ? 8 : 0;
  const nk = lerp(fovKick, want, 1 - Math.exp(-dt * (want ? 18 : 6)));
  if (Math.abs(nk - fovKick) > 0.01 || (fovKick && !want && nk < 0.02)) { fovKick = nk < 0.02 && !want ? 0 : nk; camera.fov = camBaseFov + fovKick; camera.updateProjectionMatrix(); }
  applyShake(dt);
}
// lighting follows the view: overhead needs a high, wide lantern; close views a low, near one
function lightForView() {
  if (!LV || LV.type !== 'dungeon') return;
  const top = SET.cam === 'top';
  torch.intensity = top ? 85 : 30; torch.distance = top ? 32 : 22;
  hemi.intensity = top ? 3.0 : 2.4;
  // overhead, the lantern is high and its shadows barely show, while its six-sided shadow pass is the costliest
  // thing in the frame; contact shadows carry the overhead look instead. Toggling it rebuilds shaders, so warm them.
  const cast = Q.torchShadow && !top;
  if (torch.castShadow !== cast) { torch.castShadow = cast; warmLevel(); }
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
  if (SET.cam !== 'top') { // camera-relative: up on the stick or W walks where the camera looks
    const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw), rx = -Math.cos(CAM.yaw), rz = Math.sin(CAM.yaw);
    const nx = fx * -iz + rx * ix, nz = fz * -iz + rz * ix; ix = nx; iz = nz;
    // on touch, the chase camera drifts round behind you as you run (unless you are steering it or locked on)
    if (touchMode && SET.cam === 'third' && !lockT && lookTouch === null && il > 0.25 && stick.y < 0.35) CAM.yaw += angDiff(Math.atan2(ix, iz), CAM.yaw) * Math.min(1, dt * 1.4);
  }
  P.mx = ix; P.mz = iz;
  P.atkT -= dt; P.swingT -= dt; P.dodgeCd -= dt; P.iframes -= dt; potCd -= dt;
  if (P.frenzyT > 0) { P.frenzyT -= dt; if (P.frenzyT <= 0) P.frenzy = 0; }
  if (P.chillT > 0) P.chillT -= dt;
  if (P.burnT > 0) { P.burnT -= dt; P.hp -= P.burnD * dt; if (P.hp <= 0 && LV.type === 'dungeon') { P.hp = 0.01; hurtPlayer(9999, null); } }
  const spd = 5.3 * (1 + ST.move / 100) * (P.chillT > 0 ? 0.6 : 1);
  let vx = ix * spd, vz = iz * spd;
  if (P.dashT > 0) { P.dashT -= dt; vx = Math.sin(P.dashDir) * 30; vz = Math.cos(P.dashDir) * 30; dashHits(); }
  else if (P.dodgeT > 0) {
    P.dodgeT -= dt; vx = Math.sin(P.dodgeDir) * 15; vz = Math.cos(P.dodgeDir) * 15;
    if (ST.powers.ghost && LV.type === 'dungeon') { P.ghostT -= dt; if (P.ghostT <= 0) { P.ghostT = 0.07; telegraph(P.x, P.z, 1.3, 0.35, ST.dmg * 0.45, { player: true, col: 0x9fd4ff }); } }
  }
  P.kx = (P.kx || 0) * Math.pow(0.002, dt); P.kz = (P.kz || 0) * Math.pow(0.002, dt);
  P.x += (vx + P.kx) * dt; P.z += (vz + P.kz) * dt;
  collide(P);
  if (P.pend) { P.pend.t -= dt; if (P.pend.t <= 0) { const f = P.pend.fin; P.pend = null; resolveMelee(f); } }
  updSkills(dt);
  // aim
  const wantsAtk = mouseDown || touchAtk || keys.KeyJ;
  const moving = il > 0.1 || P.dodgeT > 0 || P.dashT > 0;
  const la = lockAngle();
  if (la !== null && P.spinT <= 0) P.face = SET.cam === 'top' ? la : P.face + angDiff(la, P.face) * Math.min(1, dt * 16);
  else if (P.spinT > 0) { /* spinning */ }
  else if (SET.cam === 'top') {
    if (touchMode) {
      let best = null, bd = 9;
      if (LV.type === 'dungeon') for (const e of enemies) { if (e.dead || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
      if (best && (wantsAtk || il < 0.1)) P.face = Math.atan2(best.x - P.x, best.z - P.z);
      else if (il > 0.1) P.face = Math.atan2(ix, iz);
    } else { const ap = aimPoint(); if (ap) P.face = Math.atan2(ap.x - P.x, ap.z - P.z); }
  } else {
    let want = CAM.yaw;
    if (SET.cam === 'third' && !wantsAtk && P.atkT <= 0 && moving) want = Math.atan2(ix, iz);
    if (touchMode && wantsAtk) { // gentle aim assist toward the foe nearest the view centre
      let best = null, bs = 0.45;
      for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > 9) continue; const a = Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), CAM.yaw)); if (a < bs) { bs = a; best = e; } }
      if (best) want = Math.atan2(best.x - P.x, best.z - P.z);
    }
    P.face = SET.cam === 'first' || wantsAtk || P.atkT > 0 ? want : P.face + angDiff(want, P.face) * Math.min(1, dt * 12);
  }
  if (wantsAtk) playerAttack();
  if (LV.type === 'dungeon') P.hp = Math.min(ST.maxHp, P.hp + ST.regen * dt);
  else P.hp = ST.maxHp;
  animateHero(dt, moving);
  // the lantern sits above and behind the delver so it lights the way ahead without glaring off their own armour
  const bk = SET.cam === 'first' ? 0.9 : 0.5, ta = SET.cam === 'top' ? Math.PI : P.face;
  torch.position.set(P.x - Math.sin(ta) * bk, SET.cam === 'top' ? 5.2 : SET.cam === 'third' ? 3.0 : 2.6, P.z - Math.cos(ta) * bk);
  if (LV.type === 'dungeon') { sun.position.set(P.x - 6, 20, P.z + 8); sun.target.position.set(P.x, 0, P.z); }
}
function animateHero(dt, moving) {
  const w = curWeapon(), u = P.u;
  u.uWalk.value += dt * (moving ? (P.dodgeT > 0 ? 18 : 10.5) : 0);
  u.uAmp.value = lerp(u.uAmp.value, moving ? 0.7 : 0, Math.min(1, dt * 10));
  let armR = null, armL = 0, armY = 0, handX = 0.5, twist = 0;
  if (P.spinT > 0) { armR = -1.5; armY = 1.45; handX = 1.4; }
  else if (P.dashT > 0) { armR = -1.35; armY = -0.9; handX = 1.4; }
  else if (P.swingT > 0 && !w.ranged) {
    const t = 1 - P.swingT / P.swingDur, e = 1 - Math.pow(1 - t, 3), dir = P.combo % 2 ? -1 : 1;
    if (ST.wk === 'hammer' || (P.fin && ST.wk !== 'spear')) { armR = lerp(-3.0, -0.55, e); handX = 1.15; } // overhead smash
    else if (ST.wk === 'spear') { armR = lerp(-1.15, -1.55, e); handX = 1.45; } // thrust
    else { const half = Math.min(1.5, w.arc / 2 + 0.3); armR = -1.45; armY = dir * lerp(half, -half, e); handX = 1.38; twist = armY * 0.3; }
  } else if (w.ranged && (P.atkT > -0.25)) { armR = -1.5; if (ST.wk === 'bow') armL = -1.45; }
  // between attacks the arm eases back to rest instead of snapping
  const k = Math.min(1, dt * 16);
  P.aR = armR !== null ? armR : lerp(P.aR || 0, 0, k); P.aY = armR !== null ? armY : lerp(P.aY || 0, 0, k); P.hX = armR !== null ? handX : lerp(P.hX || 0.5, 0.5, k);
  u.uArmR.value = Math.abs(P.aR) < 0.01 ? 0 : P.aR; u.uArmL.value = armL; u.uArmRY.value = P.aY;
  P.shoulder.rotation.x = armAngle(u, true); P.shoulder.rotation.y = P.aY; P.hand.rotation.x = P.hX;
  P.mesh.position.set(P.x, moving ? Math.abs(Math.sin(u.uWalk.value)) * 0.05 : 0, P.z);
  if (P.spinT > 0) P.spinRot = (P.spinRot || 0) + dt * 17; else P.spinRot = 0;
  P.mesh.rotation.y = P.face + twist + P.spinRot; P.mesh.rotation.z = 0;
  const blink = P.iframes > 0 && P.dodgeT <= 0 && Math.floor(P.iframes * 20) % 2 === 0;
  P.mesh.visible = SET.cam !== 'first' && !blink && !(SET.cam === 'third' && CAM.tight > 0.85);
  // first-person weapon
  const vm = viewmodel;
  vm.g.visible = SET.cam === 'first' && !P.dead;
  if (vm.g.visible) {
    if (vm.kind !== ST.wk) { while (vm.holder.children.length) vm.holder.remove(vm.holder.children[0]); const wm = weaponMesh(ST.wk); wm.traverse((o) => { o.castShadow = false; }); vm.holder.add(wm); vm.kind = ST.wk; }
    const sway = Math.sin(u.uWalk.value) * u.uAmp.value;
    let rx = w.ranged ? 0.12 : 0.95, ry = Math.PI, rz = w.ranged ? 0 : -0.25, py = 0, px = 0;
    if ((P.swingT > 0 && !w.ranged) || P.spinT > 0) {
      const t = P.spinT > 0 ? (elapsed * 3) % 1 : 1 - P.swingT / P.swingDur, e = 1 - Math.pow(1 - t, 3), dir = P.combo % 2 ? -1 : 1;
      if (ST.wk === 'hammer' || P.fin) { rx = lerp(1.9, -0.4, e); rz = 0; } // overhead
      else if (ST.wk === 'spear') { rx = 0.1; px = 0; py = -0.08 * Math.sin(e * Math.PI); }
      else { rx = 0.28; ry = Math.PI + dir * lerp(-1.0, 1.0, e); rz = dir * 0.5; px = dir * lerp(0.1, -0.5, e); } // sweep across the view
    } else if (w.ranged && P.atkT > 0) { py = 0.05 * (P.atkT / w.cd); }
    vm.g.position.set(0.34 + px + sway * 0.02, -0.36 + Math.abs(sway) * 0.02 - py, -0.6);
    vm.g.rotation.set(0, 0, 0);
    vm.holder.rotation.set(rx, ry, rz);
    vm.g.children[0].rotation.set(rx * 0.25 - 0.25, 0, 0);
  }
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
