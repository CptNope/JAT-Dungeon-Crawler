// ================= level visuals =================
const U_TIME = { value: 0 };
const FLAME_MATS = [flameMat];
function clearWorld() {
  for (const e of enemies) disposeEnemy(e);
  enemies.length = 0;
  for (const p of projs) world.remove(p.mesh); projs.length = 0;
  for (const t of teles) disposeTele(t); teles.length = 0;
  drops.length = 0; interacts.length = 0;
  clearLabels();
  scene.remove(world);
  world.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
  for (const d of levelDisp) d.dispose();
  levelDisp = [];
  world = new THREE.Group(); scene.add(world);
  burstSys.life.fill(0);
  clearCorpses(); clearMinions(); facers.length = 0; fxLife.length = 0; releaseLock(); clearZones(); villagers.length = 0;
  for (const R of rings) R.o.visible = false;
  for (const l of torchPool) { l.intensity = 0; l.distance = 9; }
  FLAME_MATS.length = 1;
}
function instanced(geo, material, list, o = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((t, i) => {
    e.set(t.rx || 0, t.ry || 0, t.rz || 0); q.setFromEuler(e);
    m4.compose(p.set(t.x, t.y, t.z), q, s.set(t.sx, t.sy, t.sz));
    im.setMatrixAt(i, m4);
    if (t.c !== undefined) im.setColorAt(i, typeof t.c === 'number' ? c.set(t.c) : t.c);
  });
  im.count = list.length;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  im.matrixAutoUpdate = false; im.updateMatrix();
  im.castShadow = !!o.cast; im.receiveShadow = o.receive !== false;
  if (!o.keep) levelDisp.push(material);
  (o.parent || world).add(im);
  return im;
}
function tint(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
function glowC(hex, k) { return new THREE.Color(hex).multiplyScalar(k); }
function grey(f) { return new THREE.Color(f, f, f).getHex(); }

// shared world materials, built once and recoloured per level (no shader recompiles between floors)
const WM = {};
function worldMats() {
  if (WM.floor) return WM;
  WM.floor = worldMat(TEX.flag, 0xffffff, 'floor', 0.5, { ns: 1.3 });
  WM.wall = worldMat(TEX.brick, 0xffffff, 'wall', 0.55, { ns: 1.4 });
  WM.cap = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 1 });
  WM.grass = worldMat(TEX.grass, 0x7aa65a, 'floor', 0.22, { ns: 0.8, rough: 0.95 });
  WM.path = worldMat(TEX.cobble, 0xc4b498, 'floor', 0.45, { ns: 1.5 });
  WM.plaster = worldMat(TEX.plaster, 0xeadfc8, 'wall', 0.4, { ao: 0.8 });
  WM.plasterP = worldMat(TEX.plaster, 0xb8a4c8, 'wall', 0.4, { ao: 0.8 });
  WM.stone = worldMat(TEX.brick, 0xa49f96, 'wall', 0.7, { ao: 0.65, ns: 1.5 });
  WM.timber = worldMat(TEX.wood, 0xb08458, 'wall', 0.7, { ao: 0.8 });
  WM.door = worldMat(TEX.wood, 0x6a4428, 'wall', 1.3, { ao: 1 });
  WM.roofR = worldMat(TEX.shingle, 0xa04838, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofB = worldMat(TEX.shingle, 0x4a5a7a, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofG = worldMat(TEX.shingle, 0x4a7050, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofS = worldMat(TEX.shingle, 0x5a5a66, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.beam = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
  WM.window = mat(0xffbe6a, 2.8);
  WM.iron = metal(0x4a4a52, 0.5);
  WM.gold = metal(0xe0aa50, 0.3);
  WM.rock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  WM.bark = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 });
  WM.leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  WM.tuft = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  WM.tuft.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U_TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 hdO = vec3(0.0);
      #ifdef USE_INSTANCING
        hdO = instanceMatrix[3].xyz;
      #endif
      float hdWind = sin(uTime * 1.6 + hdO.x * 0.55 + hdO.z * 0.35) * 0.6 + sin(uTime * 3.3 + hdO.x * 1.9) * 0.25;
      transformed.x += hdWind * 0.2 * position.y; transformed.z += hdWind * 0.08 * position.y;`);
  };
  WM.tuft.customProgramCacheKey = () => 'tuft';
  WM.soil = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 1 });
  WM.water = new THREE.MeshStandardMaterial({ color: 0x1e3a52, roughness: 0.08, metalness: 0.2 });
  WM.decoStd = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  WM.decoIce = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.1, emissive: 0x2a4a6a, emissiveIntensity: 0.6 });
  WM.glow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  WM.banner = new THREE.MeshStandardMaterial({ color: 0x8a3030, roughness: 0.95, map: TEX.wood.map, normalMap: TEX.plaster.normal });
  WM.torchCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(5) });
  return WM;
}

// ----- dungeon -----
function buildDungeonVisuals() {
  const L = LV, B = biomeOf(L.depth), W = worldMats();
  // biome colours tint the textures; lightness is normalised so every biome stays readable
  const hsl = {};
  W.floor.color.set(B.floor).getHSL(hsl); W.floor.color.setHSL(hsl.h, Math.min(0.32, hsl.s), 0.3);
  W.wall.color.set(B.wall).getHSL(hsl); W.wall.color.setHSL(hsl.h, Math.min(0.3, hsl.s), 0.34);
  W.torchCore.color.set(B.torch).multiplyScalar(5);
  const floors = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1 && L.g[j * L.w + i] !== 3) continue;
    let n4 = 0, nd = 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(i + a, j + b)) n4++;
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (solid(i + a, j + b)) nd++;
    const ao = clamp(1 - 0.14 * n4 - 0.06 * nd, 0.5, 1) * rand(0.86, 1.04);
    floors.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: grey(ao) });
  }
  instanced(G.tile, W.floor, floors, { keep: true });
  // walls are laid out by layoutWalls(), which runs again whenever the camera mode changes wall height
  L.wallTiles = []; L.torchSpots = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 0) continue; // rock only: furniture and chasms are dressed separately
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < L.w && jj < L.h && L.g[jj * L.w + ii] !== 0) { near = true; break; } }
    if (near) L.wallTiles.push({ i, j, v: rand(0.82, 1.1), hv: rand(-0.12, 0.12) });
  }
  for (const r of L.rooms) {
    const n = randi(1, 3);
    for (let k = 0; k < n; k++) {
      const side = randi(0, 3); let i, j;
      if (side === 0) { i = randi(r.x, r.x + r.w - 1); j = r.y - 1; } else if (side === 1) { i = randi(r.x, r.x + r.w - 1); j = r.y + r.h; }
      else if (side === 2) { i = r.x - 1; j = randi(r.y, r.y + r.h - 1); } else { i = r.x + r.w; j = randi(r.y, r.y + r.h - 1); }
      if (!solid(i, j)) continue;
      const ox = side === 2 ? 0.5 : side === 3 ? -0.5 : 0, oz = side === 0 ? 0.5 : side === 1 ? -0.5 : 0;
      L.torchSpots.push({ x: i + 0.5 + ox * 1.12, z: j + 0.5 + oz * 1.12, ox, oz });
    }
  }
  layoutWalls();
  dressThemedRooms();
  // rubble along walls and biome decoration in the rooms
  const rocks = [], deco = [], glow = [];
  const st = L.rooms[0];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1) continue;
    const edge = solid(i + 1, j) || solid(i - 1, j) || solid(i, j + 1) || solid(i, j - 1);
    if (edge && chance(0.14)) { const s = rand(0.08, 0.2); rocks.push({ x: i + rand(0.15, 0.85), y: s * 0.3, z: j + rand(0.15, 0.85), sx: s, sy: s * 0.7, sz: s, ry: rand(0, 6), rx: rand(0, 1), c: tint(B.wall, rand(1.4, 2.2)) }); }
    if (!chance(0.05)) continue;
    if (i >= st.x && i < st.x + st.w && j >= st.y && j < st.y + st.h) continue;
    const x = i + rand(0.2, 0.8), z = j + rand(0.2, 0.8);
    switch (B.deco) {
      case 'bones': deco.push({ x, y: 0.04, z, sx: rand(0.35, 0.6), sy: 0.07, sz: 0.07, ry: rand(0, 3), c: 0xe0d6bc }); deco.push({ x: x + 0.12, y: 0.08, z: z + 0.1, sx: 0.16, sy: 0.15, sz: 0.17, ry: rand(0, 3), c: 0xeee4ca }); break;
      case 'shrooms': { const s = rand(0.6, 1.4); deco.push({ x, y: 0.18 * s, z, sx: 0.1 * s, sy: 0.36 * s, sz: 0.1 * s, c: 0xd8d0b8 }); glow.push({ x, y: 0.4 * s, z, sx: 0.44 * s, sy: 0.18 * s, sz: 0.44 * s, c: glowC(pick([0x8aff6a, 0x6affd0, 0xd0ff4a]), 2.4) }); break; }
      case 'cracks': glow.push({ x, y: 0.012, z, sx: rand(0.5, 1.1), sy: 0.02, sz: rand(0.05, 0.1), ry: rand(0, 3), c: glowC(0xff6a1a, 3.5) }); break;
      case 'ice': deco.push({ x, y: 0.25, z, sx: rand(0.15, 0.3), sy: rand(0.5, 1.1), sz: rand(0.15, 0.3), ry: rand(0, 3), rz: rand(-0.3, 0.3), c: 0xcfe8ff }); break;
      case 'kelp': { const s = rand(0.7, 1.5); deco.push({ x, y: 0.55 * s, z, sx: 0.07, sy: 1.1 * s, sz: 0.07, rz: rand(-0.25, 0.25), rx: rand(-0.2, 0.2), c: pick([0x3a8a6a, 0x2a6a5a, 0x5a9a5a]) }); deco.push({ x: x + 0.12, y: 0.4 * s, z: z - 0.08, sx: 0.06, sy: 0.8 * s, sz: 0.06, rz: rand(-0.3, 0.3), c: 0x2a7a6a }); if (chance(0.4)) glow.push({ x: x + 0.2, y: 0.08, z, sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(0x9affe8, 2.6) }); break; }
      case 'gears': deco.push({ x, y: 0.04, z, sx: rand(0.5, 1.0), sy: 0.08, sz: 0, ry: rand(0, 3), c: pick([0xb08a4a, 0x8a7050, 0xc8a060]) }); if (chance(0.35)) glow.push({ x, y: 0.1, z, sx: 0.1, sy: 0.1, sz: 0.1, c: glowC(0xffc84a, 3) }); break;
      case 'roots': deco.push({ x, y: 0.06, z, sx: rand(0.9, 1.8), sy: 0.12, sz: 0.14, ry: rand(0, 3), c: pick([0x4a2a22, 0x5a3426, 0x3a221c]) }); if (chance(0.5)) glow.push({ x: x + rand(-0.3, 0.3), y: 0.12, z: z + rand(-0.3, 0.3), sx: 0.16, sy: 0.12, sz: 0.16, c: glowC(0xff3a5a, 2.8) }); break;
      case 'pools': { const s = rand(0.35, 0.8); glow.push({ x, y: 0.012, z, sx: s, sy: 0.01, sz: s * rand(0.6, 1), ry: rand(0, 3), c: glowC(pick([0x3a78c8, 0x4a98c0, 0x6a62c0]), 0.9) }); if (chance(0.5)) deco.push({ x: x + rand(-0.4, 0.4), y: 0.05, z: z + rand(-0.4, 0.4), sx: 0.12, sy: 0.08, sz: 0.16, ry: rand(0, 3), c: pick([0xe8dcd0, 0xd8c8e0, 0xc8d8e8]) }); break; }
      case 'urns': { const s = rand(0.7, 1.1); deco.push({ x, y: 0.28 * s, z, sx: 0.32 * s, sy: 0.56 * s, sz: 0.32 * s, c: pick([0xd8b050, 0xc89a40, 0xe8d8b0]) }); if (chance(0.5)) glow.push({ x: x + rand(-0.4, 0.4), y: 0.02, z: z + rand(-0.4, 0.4), sx: 0.1, sy: 0.02, sz: 0.1, ry: rand(0, 3), c: glowC(0xffd860, 2.2) }); break; }
      case 'shards': glow.push({ x, y: rand(0.7, 1.6), z, sx: 0.16, sy: 0.32, sz: 0.16, ry: rand(0, 3), c: glowC(pick([0xd06cff, 0x8a6cff, 0xff6cf0]), 3) }); break;
    }
  }
  if (rocks.length) instanced(G.dodec, W.rock, rocks, { keep: true, cast: true });
  // clutter in room corners; corner tiles only, and only where no corridor opens, so paths stay clear
  const barrels = [], hoops = [], crates = [];
  for (const r of L.rooms.slice(1)) for (const [ci, cj, oi, oj] of [[r.x, r.y, -1, -1], [r.x + r.w - 1, r.y, 1, -1], [r.x, r.y + r.h - 1, -1, 1], [r.x + r.w - 1, r.y + r.h - 1, 1, 1]]) {
    if (!chance(0.32) || L.g[cj * L.w + ci] !== 1) continue;
    if (!solid(ci + oi, cj) || !solid(ci, cj + oj) || !solid(ci + oi, cj + oj)) continue;
    const x = ci + 0.5, z = cj + 0.5;
    if (chance(0.55)) { barrels.push({ x, y: 0.42, z, sx: 0.62, sy: 0.84, sz: 0.62, ry: rand(0, 6), c: grey(rand(0.85, 1.1)) }); for (const y of [0.15, 0.7]) hoops.push({ x, y, z, sx: 0.66, sy: 0.06, sz: 0.66 }); }
    else { const s = rand(0.6, 0.78); crates.push({ x, y: s / 2, z, sx: s, sy: s, sz: s, ry: rand(-0.3, 0.3), c: grey(rand(0.85, 1.1)) }); if (chance(0.5)) crates.push({ x: x + rand(-0.1, 0.1), y: s + 0.2, z: z + rand(-0.1, 0.1), sx: 0.4, sy: 0.4, sz: 0.4, ry: rand(0, 6), c: grey(rand(0.85, 1.1)) }); }
    L.g[cj * L.w + ci] = 2;
  }
  if (barrels.length) { instanced(G.cyl, W.timber, barrels, { keep: true, cast: true }); instanced(G.cyl, W.iron, hoops, { keep: true }); }
  if (crates.length) instanced(G.box, W.door, crates, { keep: true, cast: true });
  for (const q of deco) if (q.sz === 0) q.sz = q.sx; // gears lie flat and round
  if (deco.length) instanced(B.deco === 'ice' ? G.oct : B.deco === 'gears' || B.deco === 'urns' ? G.cyl : B.deco === 'kelp' ? G.taper : B.deco === 'pools' ? G.sph : G.box, B.deco === 'ice' ? W.decoIce : W.decoStd, deco, { keep: true, cast: true });
  if (glow.length) instanced(B.deco === 'shrooms' || B.deco === 'kelp' || B.deco === 'roots' || B.deco === 'pools' ? G.sph : B.deco === 'urns' ? G.cyl : B.deco === 'shards' ? G.oct : G.box, W.glow, glow, { keep: true, receive: false });
  makeEnv(tint(B.amb, 0.6), tint(B.fog, 2.5), 0x050508, B.torch);
  scene.environmentIntensity = 0.5;
}
const _capTint = new THREE.Color();
function wallHeight() { return SET.cam === 'top' ? 1.35 : 3.4; }
function layoutWalls() {
  const L = LV; if (!L || L.type !== 'dungeon') return;
  if (L.wallObjs) for (const o of L.wallObjs) { world.remove(o); if (o.isInstancedMesh) o.dispose(); if (o.isPoints) o.geometry.dispose(); }
  const W = worldMats(), B = biomeOf(L.depth), H = wallHeight(), tall = H > 2;
  const walls = [], caps = [];
  for (const t of L.wallTiles) {
    const h = H + (tall ? 0 : t.hv);
    walls.push({ x: t.i + 0.5, y: h / 2, z: t.j + 0.5, sx: 1, sy: h, sz: 1, c: grey(t.v) });
    caps.push({ x: t.i + 0.5, y: h + 0.02, z: t.j + 0.5, sx: 1.02, sy: 0.04, sz: 1.02 });
  }
  // wall tops take a little of the biome's stone colour, so the mass of the walls reads apart from the unlit void beyond
  W.cap.color.setHex(0x15151c).lerp(_capTint.setHex(B.wall), 0.3);
  const objs = [];
  objs.push(instanced(G.box, W.wall, walls, { keep: true, cast: true }));
  objs.push(instanced(G.box, W.cap, caps, { keep: true, receive: false }));
  const th = tall ? 1.95 : 0.98;
  const brackets = [], cores = [], flames = [];
  for (const s of L.torchSpots) {
    brackets.push({ x: s.x - s.ox * 0.08, y: th - 0.12, z: s.z - s.oz * 0.08, sx: 0.08, sy: 0.4, sz: 0.08, rx: s.oz * 0.4, rz: -s.ox * 0.4 });
    brackets.push({ x: s.x, y: th + 0.04, z: s.z, sx: 0.16, sy: 0.12, sz: 0.16 });
    cores.push({ x: s.x, y: th + 0.14, z: s.z, sx: 0.12, sy: 0.16, sz: 0.12 });
    flames.push({ x: s.x, y: th + 0.12, z: s.z });
    s.y = th + 0.35;
  }
  if (brackets.length) { objs.push(instanced(G.box, W.iron, brackets, { keep: true })); objs.push(instanced(G.sph, W.torchCore, cores, { keep: true, receive: false })); const f = makeFlames(flames); world.add(f); objs.push(f); }
  // banners hang on the walls between torches, in the biome's colour with a brass rod
  if (!L.bannerSpots) L.bannerSpots = L.torchSpots.filter(() => chance(0.5)).map((s) => ({ ...s, off: chance(0.5) ? 1 : -1 }));
  const cloth = [], rods = [], bh = tall ? 1.6 : 0.75, by = tall ? 2.1 : 0.62;
  for (const s of L.bannerSpots) {
    const along = s.ox ? [0, s.off] : [s.off, 0]; // slide sideways along the wall, away from the torch
    const x = s.x + along[0] * 0.9 - s.ox * 0.06, z = s.z + along[1] * 0.9 - s.oz * 0.06;
    const ry = s.ox ? Math.PI / 2 : 0;
    const wx = Math.floor(x - Math.sign(s.ox) * 0.5), wz = Math.floor(z - Math.sign(s.oz) * 0.5);
    if (!solid(wx, wz) || solid(Math.floor(x + Math.sign(s.ox) * 0.5), Math.floor(z + Math.sign(s.oz) * 0.5))) continue; // wall behind, floor in front
    cloth.push({ x, y: by, z, sx: 0.62, sy: bh, sz: 0.03, ry });
    rods.push({ x, y: by + bh / 2 + 0.04, z, sx: 0.8, sy: 0.05, sz: 0.05, ry });
  }
  if (cloth.length) {
    WM.banner.color.set(B.torch).multiplyScalar(0.55).lerp(new THREE.Color(B.wall), 0.4);
    objs.push(instanced(G.box, WM.banner, cloth, { keep: true })); objs.push(instanced(G.box, W.gold, rods, { keep: true }));
  }
  flameMat.uniforms.uCol.value.set(B.torch);
  L.wallObjs = objs;
  scene.fog = new THREE.Fog(B.fog, ...(SET.cam === 'top' ? [17, 38] : SET.cam === 'third' ? [7, 26] : [5, 22]));
}
let torchT = 0;
function updTorchLights(dt) {
  if (!LV || LV.type !== 'dungeon' || !LV.torchSpots) return;
  torchT -= dt;
  if (torchT <= 0) {
    torchT = 0.3;
    const near = LV.torchSpots.map((s) => [s, (s.x - P.x) ** 2 + (s.z - P.z) ** 2]).filter((q) => q[1] < 220).sort((a, b) => a[1] - b[1]);
    torchPool.forEach((l, i) => { const s = near[i] && near[i][0]; l.userData.spot = i < Q.pool ? s : null; if (s) l.position.set(s.x - s.ox * 0.3, s.y, s.z - s.oz * 0.3); });
  }
  const col = biomeOf(LV.depth).torch;
  torchPool.forEach((l, i) => {
    if (!l.userData.spot) { l.intensity = 0; return; }
    l.color.setHex(col);
    l.intensity = 7 * (0.82 + 0.1 * Math.sin(elapsed * 13 + i * 2.1) + 0.08 * Math.sin(elapsed * 23.7 + i));
  });
}

// ----- town -----
function roofSlabs(grp, cx, cz, w, d, baseY, rh, m, ridgeX) {
  const oh = 0.45, a = Math.atan2(rh, w / 2), len = Math.hypot(w / 2 + oh, rh + oh * Math.tan(a)) + 0.05;
  for (const s of [-1, 1]) {
    const slab = mesh(G.box, m, len, 0.14, d + oh * 2, 0, 0, 0);
    const mx = (w / 2 + oh) / 2 - oh * 0.0, my = rh / 2 - oh * Math.tan(a) / 2;
    if (ridgeX) { slab.scale.set(d + oh * 2, 0.14, len); slab.rotation.x = -s * a; slab.position.set(cx, baseY + my + 0.07, cz - s * mx); }
    else { slab.rotation.z = -s * a; slab.position.set(cx + s * mx, baseY + my + 0.07, cz); }
    grp.add(slab);
  }
  const ridge = mesh(G.box, WM.beam, ridgeX ? d + oh * 2 : 0.18, 0.16, ridgeX ? 0.18 : d + oh * 2, cx, baseY + rh + 0.06, cz); grp.add(ridge);
  const gable = new THREE.Mesh(gableRoof(ridgeX ? d : w, ridgeX ? w : d, rh), WM.cur || WM.plaster);
  if (ridgeX) gable.rotation.y = Math.PI / 2;
  gable.position.set(cx, baseY, cz); grp.add(gable);
}
function building(grp, b, o) {
  const W = worldMats();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2, w = b.w - 0.6, d = b.h - 0.6, h = o.h || 2.6, base = 0.45;
  const front = o.north ? b.y + 0.3 : b.y + b.h - 0.3, fs = o.north ? -1 : 1;
  grp.add(mesh(G.box, W.stone, w + 0.25, base, d + 0.25, cx, base / 2, cz));
  grp.add(mesh(G.box, o.wall, w, h, d, cx, base + h / 2, cz));
  if (o.beams) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.18, h, 0.18, cx + sx * w / 2, base + h / 2, cz + sz * d / 2));
    for (const y of [base + 0.08, base + h * 0.52, base + h - 0.08]) { grp.add(mesh(G.box, W.beam, w + 0.06, 0.14, 0.1, cx, y, cz + d / 2)); grp.add(mesh(G.box, W.beam, w + 0.06, 0.14, 0.1, cx, y, cz - d / 2)); grp.add(mesh(G.box, W.beam, 0.1, 0.14, d + 0.06, cx + w / 2, y, cz)); grp.add(mesh(G.box, W.beam, 0.1, 0.14, d + 0.06, cx - w / 2, y, cz)); }
    for (const sx of [-1, 1]) { const br = mesh(G.box, W.beam, 0.1, h * 0.62, 0.1, cx + sx * w * 0.3, base + h * 0.76, front + fs * 0.03); br.rotation.z = sx * 0.6; grp.add(br); }
  }
  WM.cur = o.wall;
  roofSlabs(grp, cx, cz, w, d, base + h, o.rh || 1.7, o.roof, o.ridgeX);
  // door, frame and step
  const dx = b.door[0] + 0.5;
  grp.add(mesh(G.box, W.door, 1.0, 1.75, 0.12, dx, base + 0.875, front + fs * 0.02));
  grp.add(mesh(G.box, W.beam, 1.25, 0.14, 0.16, dx, base + 1.82, front + fs * 0.04));
  for (const s of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.12, 1.85, 0.16, dx + s * 0.58, base + 0.92, front + fs * 0.04));
  grp.add(mesh(G.sph, W.gold, 0.08, 0.08, 0.08, dx + 0.3, base + 0.9, front + fs * 0.1));
  grp.add(mesh(G.box, W.stone, 1.5, 0.2, 0.6, dx, 0.1, front + fs * 0.42));
  // windows with frames and shutters
  const rows = o.stories === 2 ? [base + 1.2, base + h * 0.75] : [base + h * 0.55];
  for (const y of rows) for (const wx of [dx - 2.1, dx + 2.1]) {
    if (Math.abs(wx - cx) > w / 2 - 0.5) continue;
    grp.add(mesh(G.box, W.window, 0.72, 0.62, 0.05, wx, y, front + fs * 0.02));
    grp.add(mesh(G.box, W.beam, 0.86, 0.09, 0.1, wx, y + 0.36, front + fs * 0.05), mesh(G.box, W.beam, 0.86, 0.09, 0.1, wx, y - 0.36, front + fs * 0.05));
    grp.add(mesh(G.box, W.beam, 0.06, 0.62, 0.08, wx, y, front + fs * 0.05), mesh(G.box, W.beam, 0.72, 0.05, 0.08, wx, y, front + fs * 0.05));
    for (const s of [-1, 1]) grp.add(mesh(G.box, W.door, 0.34, 0.66, 0.06, wx + s * 0.58, y, front + fs * 0.07));
  }
  // side windows
  for (const sx of [-1, 1]) grp.add(mesh(G.box, W.window, 0.05, 0.6, 0.66, cx + sx * (w / 2 + 0.02), base + h * 0.55, cz));
  if (o.chimney) { grp.add(mesh(G.box, W.stone, 0.7, (o.rh || 1.7) + 1.4, 0.7, cx + o.chimney * w * 0.28, base + h + ((o.rh || 1.7) + 1.4) / 2 - 0.4, cz - d * 0.15)); }
}
function buildHome(grp) {
  const b = TOWN.home, lvl = S.home.house, W = worldMats();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  if (lvl === 0) {
    const sb = { x: b.x + 1.5, y: b.y + 2.5, w: 5, h: 4.5, door: b.door };
    building(grp, sb, { wall: W.timber, roof: W.roofS, h: 2.1, rh: 1.1 });
    grp.add(mesh(G.box, W.timber, 0.6, 0.6, 0.6, cx + 2.8, 0.3, cz + 2.6), mesh(G.cyl, W.timber, 0.5, 0.7, 0.5, cx + 2.8, 0.35, cz + 1.7));
  } else if (lvl === 1) building(grp, { x: b.x + 1, y: b.y + 1.6, w: 6.4, h: 5.4, door: b.door }, { wall: W.plaster, roof: W.roofR, beams: true, chimney: 1 });
  else if (lvl === 2) {
    building(grp, { x: b.x + 0.4, y: b.y + 0.8, w: 7.4, h: 6.2, door: b.door }, { wall: W.plaster, roof: W.roofR, beams: true, chimney: -1, h: 2.8, rh: 2 });
    grp.add(mesh(G.box, W.timber, 3.4, 0.14, 1.3, b.door[0] + 0.5, 2.35, b.y + b.h + 0.2));
    for (const s of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.14, 2.3, 0.14, b.door[0] + 0.5 + s * 1.55, 1.15, b.y + b.h + 0.75));
  } else {
    building(grp, { x: b.x + 0.2, y: b.y + 0.3, w: 7.6, h: 7.1, door: b.door }, { wall: W.stone, roof: W.roofB, h: 4.4, rh: 2.2, stories: 2, chimney: 1, ridgeX: true });
    if (lvl === 4) {
      for (const s of [-1, 1]) {
        const tx = cx + s * 4.05, tz = b.y + b.h - 0.2;
        grp.add(mesh(G.cyl, W.stone, 1.9, 6.4, 1.9, tx, 3.2, tz), mesh(G.cone, W.roofB, 2.5, 2.4, 2.5, tx, 7.6, tz));
        grp.add(mesh(G.box, W.window, 0.3, 0.6, 0.05, tx, 4.6, tz + 0.96));
        grp.add(mesh(G.cyl, W.iron, 0.05, 1.6, 0.05, tx, 9.5, tz), mesh(G.box, mat(0x2f6f73), 0.04, 0.6, 0.9, tx, 9.9, tz + 0.45));
      }
    }
  }
  // garden beds east of the house
  if (S.home.garden > 0) {
    const rows = S.home.garden * 2;
    for (let k = 0; k < rows; k++) {
      grp.add(mesh(G.box, W.soil, 2.6, 0.2, 0.55, 14.2, 0.1, 4.6 + k * 0.9));
      for (let p = 0; p < 5; p++) grp.add(mesh(G.ico, mat(pick([0x5aa04a, 0x6ab85a, 0x8ac05a, 0x4a9040])), 0.32, rand(0.3, 0.45), 0.32, 13.2 + p * 0.5, 0.32, 4.6 + k * 0.9));
    }
    if (S.home.garden === 3) { const gh = new THREE.Mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 })); gh.scale.set(3.2, 2.2, rows * 0.9 + 0.6); gh.position.set(14.2, 1.1, 4.6 + (rows - 1) * 0.45); levelDisp.push(gh.material); grp.add(gh); }
  }
  buildDecor(grp);
  if (S.caravan) buildCaravan(grp);
  if (S.home.trophy > 0) {
    const shown = S.slain.slice(-8);
    for (let k = 0; k < 8; k++) {
      const x = 3.6 + k * 1.05, z = 14.6;
      grp.add(mesh(G.box, W.stone, 0.5, 0.9, 0.5, x, 0.45, z), mesh(G.box, W.stone, 0.62, 0.1, 0.62, x, 0.92, z));
      if (shown[k]) grp.add(mesh(G.oct, mat(shown[k].c, 2.2), 0.36, 0.5, 0.36, x, 1.3, z));
    }
  }
}
function buildTownVisuals() {
  const L = LV, W = worldMats();
  const grass = [], paths = [], tufts = [], flowers = [];
  const occupied = (i, j) => { for (const k of ['home', 'smith', 'alch', 'trader']) { const b = TOWN[k]; if (i >= b.x - 1 && i <= b.x + b.w && j >= b.y - 1 && j <= b.y + b.h) return true; } return false; };
  for (let j = -12; j < L.h + 12; j++) for (let i = -12; i < L.w + 12; i++) {
    const inside = i >= 0 && j >= 0 && i < L.w && j < L.h;
    const p = inside && L.path[j * L.w + i];
    (p ? paths : grass).push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: grey(rand(0.9, 1.06)) });
    if (!p && !(inside && occupied(i, j)) && !(i >= 18 && i <= 25 && j >= 31 && j <= 34)) {
      const n = inside ? randi(1, 3) : randi(0, 2);
      for (let k = 0; k < n; k++) tufts.push({ x: i + rand(0, 1), y: 0, z: j + rand(0, 1), sx: rand(0.7, 1.3), sy: rand(0.6, 1.4), sz: rand(0.7, 1.3), ry: rand(0, 6), c: tint(pick([0x6a9a40, 0x7aaa48, 0x5a8a3a, 0x8ab050]), rand(0.85, 1.1)) });
      if (inside && chance(0.04)) flowers.push({ x: i + rand(0, 1), y: 0.2, z: j + rand(0, 1), sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(pick([0xffd24a, 0xff7aa0, 0xffffff, 0xa07aff, 0xff9a4a]), 1.3) });
    }
  }
  instanced(G.tile, W.grass, grass, { keep: true });
  instanced(G.tile, W.path, paths, { keep: true });
  instanced(G.tuft, W.tuft, tufts, { keep: true, receive: true });
  instanced(G.ico, mat(0xffffff, 1), flowers, { keep: true, receive: false });
  // trees: deciduous and pines around the edge, a few inside
  const trunks = [], crowns = [], pines = [];
  const tree = (x, z, s, pine) => {
    trunks.push({ x, y: 0.9 * s, z, sx: 0.32 * s, sy: 1.8 * s, sz: 0.32 * s, c: 0x6a4a32 });
    if (pine) { for (let k = 0; k < 3; k++) pines.push({ x, y: (1.6 + k * 0.9) * s, z, sx: (2.2 - k * 0.55) * s, sy: 1.6 * s, sz: (2.2 - k * 0.55) * s, ry: rand(0, 6), c: tint(0x2f5a3a, rand(0.85, 1.15)) }); }
    else for (let k = 0; k < 3; k++) crowns.push({ x: x + rand(-0.5, 0.5) * s, y: (2.3 + rand(0, 0.8)) * s, z: z + rand(-0.5, 0.5) * s, sx: rand(1.6, 2.2) * s, sy: rand(1.4, 1.9) * s, sz: rand(1.6, 2.2) * s, ry: rand(0, 6), c: tint(pick([0x4a8a3a, 0x5a9a42, 0x3a7a36, 0x6a9a3a]), rand(0.85, 1.1)) });
  };
  for (let j = -10; j < L.h + 10; j++) for (let i = -10; i < L.w + 10; i++) {
    const inside = i >= 2 && j >= 2 && i < L.w - 2 && j < L.h - 2;
    if (inside) continue;
    if (j >= L.h - 3 && i >= 17 && i <= 26) continue;
    const ring = Math.min(Math.abs(i - 1), Math.abs(j - 1), Math.abs(i - (L.w - 2)), Math.abs(j - (L.h - 2)));
    if (chance(ring < 3 ? 0.42 : 0.16)) tree(i + rand(0.2, 0.8), j + rand(0.2, 0.8), rand(0.8, 1.35), chance(0.35));
  }
  for (const [x, z] of [[15.5, 13.6], [27, 13.6], [5, 27], [9, 22], [38, 28], [28, 30], [14, 30]]) tree(x, z, rand(0.9, 1.15), chance(0.3));
  instanced(G.taper, W.bark, trunks, { keep: true, cast: true });
  instanced(G.ico1, W.leaf, crowns, { keep: true, cast: true });
  instanced(G.cone, W.leaf, pines, { keep: true, cast: true });
  // fence along the inner edge, open at the south gate
  const posts = [], rails = [];
  const fenceLine = (x0, z0, x1, z1) => { const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.5); for (let k = 0; k <= n; k++) { const t = k / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); if (z > L.h - 3 && x > 17.5 && x < 26.5) continue; posts.push({ x, y: 0.45, z, sx: 0.14, sy: 0.9, sz: 0.14 }); if (k < n) { const nx = lerp(x0, x1, (k + 0.5) / n), nz = lerp(z0, z1, (k + 0.5) / n); if (nz > L.h - 3 && nx > 17.5 && nx < 26.5) continue; for (const y of [0.35, 0.7]) rails.push({ x: nx, y, z: nz, sx: x0 === x1 ? 0.07 : 1.5, sy: 0.08, sz: x0 === x1 ? 1.5 : 0.07 }); } } };
  fenceLine(1.9, 1.9, L.w - 1.9, 1.9); fenceLine(1.9, L.h - 1.9, L.w - 1.9, L.h - 1.9); fenceLine(1.9, 1.9, 1.9, L.h - 1.9); fenceLine(L.w - 1.9, 1.9, L.w - 1.9, L.h - 1.9);
  instanced(G.box, W.timber, posts, { keep: true, cast: true }); instanced(G.box, W.timber, rails, { keep: true, cast: true });
  // distant hills and mountains for the horizon
  const hills = [];
  for (let k = 0; k < 46; k++) { const a = (k / 46) * Math.PI * 2 + rand(-0.05, 0.05), r = rand(48, 70), s = rand(14, 26); hills.push({ x: 22 + Math.cos(a) * r, y: -s * 0.35, z: 18 + Math.sin(a) * r, sx: s, sy: s * rand(0.5, 0.8), sz: s, ry: rand(0, 6), c: tint(pick([0x5a7a42, 0x6a8a4a, 0x4a6a3a]), rand(0.8, 1.1)) }); }
  for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2 + rand(-0.1, 0.1), r = rand(105, 135), s = rand(30, 50); hills.push({ x: 22 + Math.cos(a) * r, y: s * 0.32, z: 18 + Math.sin(a) * r, sx: s, sy: s * rand(0.9, 1.4), sz: s, ry: rand(0, 6), c: tint(0x6a7a9a, rand(0.8, 1.1)) }); }
  instanced(G.dodec, W.rock, hills, { keep: true });
  // buildings and props, baked into a few merged meshes
  const props = new THREE.Group(); world.add(props);
  buildHome(props);
  building(props, TOWN.smith, { wall: W.stone, roof: W.roofS, chimney: 1, rh: 1.5 });
  building(props, TOWN.alch, { wall: W.plasterP, roof: W.roofG, beams: true, rh: 2.1 });
  building(props, TOWN.trader, { wall: W.timber, roof: W.roofR, north: true, beams: true, chimney: -1 });
  // smithy: anvil, forge, rack
  props.add(mesh(G.box, W.iron, 0.9, 0.3, 0.42, 18.4, 0.75, 11.4), mesh(G.box, W.iron, 0.42, 0.45, 0.32, 18.4, 0.32, 11.4), mesh(G.box, W.timber, 0.7, 0.2, 0.55, 18.4, 0.1, 11.4));
  props.add(mesh(G.box, W.stone, 1.3, 0.9, 1.0, 23, 0.45, 11.4), mesh(G.box, mat(0xff7a2a, 3), 0.9, 0.06, 0.6, 23, 0.92, 11.4));
  for (let k = 0; k < 3; k++) { const wpn = weaponMesh(['sword', 'axe', 'spear'][k]); wpn.position.set(16.2, 0.1, 10.6 + k * 0.5); wpn.rotation.x = -Math.PI / 2; props.add(wpn); }
  // apothecary: cauldron and herb pots
  props.add(mesh(G.sph, W.iron, 1.0, 0.75, 1.0, 30.4, 0.42, 11.4), mesh(G.disc, mat(0x7aff6a, 2.6), 0.4, 1, 0.4, 30.4, 0.76, 11.4));
  for (let k = 0; k < 3; k++) props.add(mesh(G.cyl, mat(0x9a5a3a), 0.4, 0.4, 0.4, 34.2 + k * 0.5, 0.2, 11.3), mesh(G.ico, mat(0x5aa04a), 0.42, 0.4, 0.42, 34.2 + k * 0.5, 0.55, 11.3));
  // market: awning, crates and barrels
  for (let k = 0; k < 6; k++) { const a = mesh(G.box, mat(k % 2 ? 0xe8dcc0 : 0xb04a3a), 1.0, 0.07, 1.5, 31.5 + k, 2.25, 20.35); a.rotation.x = -0.32; props.add(a); }
  for (const [x, z, s] of [[30.2, 19.6, 0.6], [30.9, 19.4, 0.5], [38.4, 19.8, 0.6]]) props.add(mesh(G.box, W.timber, s, s, s, x, s / 2, z));
  for (const [x, z] of [[37.4, 19.6], [37.9, 20.2]]) props.add(mesh(G.cyl, W.timber, 0.55, 0.8, 0.55, x, 0.4, z), mesh(G.cyl, W.iron, 0.58, 0.05, 0.58, x, 0.6, z));
  // well
  props.add(mesh(G.cyl, W.stone, 2.1, 0.85, 2.1, 22, 0.42, 17), mesh(G.disc, W.water, 0.82, 1, 0.82, 22, 0.72, 17));
  for (const s of [-1, 1]) props.add(mesh(G.box, W.beam, 0.14, 2.2, 0.14, 22 + s * 0.95, 1.1, 17));
  { const r = new THREE.Group(); roofSlabs(r, 22, 17, 2.2, 1.4, 2.2, 0.7, W.roofR, false); r.children.pop(); props.add(r); }
  // lamp posts
  for (const [x, z] of [[6, 14.2], [16, 14.2], [27, 14.2], [38, 14.2], [19, 24], [25, 24], [19.2, 29.6], [24.8, 29.6]]) {
    props.add(mesh(G.cyl, W.iron, 0.12, 2.6, 0.12, x, 1.3, z), mesh(G.box, W.iron, 0.36, 0.06, 0.36, x, 2.62, z), mesh(G.box, mat(0xffc878, 3.2), 0.24, 0.3, 0.24, x, 2.45, z), mesh(G.cone4, W.iron, 0.42, 0.2, 0.42, x, 2.75, z));
  }
  // rocks and benches
  for (let k = 0; k < 12; k++) { const r = mesh(G.dodec, mat(0x8a8680), rand(0.3, 0.6), rand(0.2, 0.4), rand(0.3, 0.6), rand(3, 41), 0.1, rand(15, 32)); if (walkable(r.position.x, r.position.z) && !LV.path[tidx(r.position.x, r.position.z)]) props.add(r); }
  // the Delve gate: stone arch, glowing rift and braziers
  for (const s of [-1, 1]) { props.add(mesh(G.box, W.stone, 1.8, 3.6, 1.8, 22 + s * 3, 1.8, 33), mesh(G.box, W.stone, 2.2, 0.35, 2.2, 22 + s * 3, 3.7, 33)); props.add(mesh(G.cyl, W.iron, 0.5, 0.9, 0.5, 22 + s * 4.6, 0.45, 31.2), mesh(G.cyl, W.iron, 0.8, 0.2, 0.8, 22 + s * 4.6, 0.95, 31.2)); }
  props.add(mesh(G.box, W.stone, 8.2, 0.6, 1.4, 22, 4.15, 33));
  for (let k = 0; k < 5; k++) props.add(mesh(G.box, mat(0xb08cff, 3), 0.22, 0.3, 0.05, 19.4 + k * 1.3, 4.15, 32.28));
  props.add(mesh(G.box, mat(0x05040a), 4, 0.06, 2, 22, 0.03, 33));
  const rift = new THREE.Mesh(G.disc, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U_TIME },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vP;
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float sw = sin(a * 5.0 + r * 9.0 - uTime * 2.5) * 0.5 + 0.5;
        float m = smoothstep(1.0, 0.3, r) * (0.35 + 0.65 * sw); vec3 c = mix(vec3(0.5, 0.3, 1.6), vec3(2.6, 1.6, 4.0), sw * (1.0 - r));
        gl_FragColor = vec4(c * m, m);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  rift.scale.set(1.9, 1, 0.95); rift.position.set(22, 0.07, 33); rift.userData.live = 1; levelDisp.push(rift.material); props.add(rift);
  const gateFlames = makeFlames([{ x: 17.4, y: 1.1, z: 31.2 }, { x: 26.6, y: 1.1, z: 31.2 }, { x: 23, y: 0.98, z: 11.4 }]);
  gateFlames.userData.live = 1; props.add(gateFlames);
  // townsfolk
  for (const [x, z, c, a] of [[19.2, 11.7, 0x8a6a5a, 0.3], [31.4, 11.7, 0x6a5a8a, -0.3], [33.2, 19.3, 0xa07a4a, Math.PI], [24.5, 18.2, 0x5a7a8a, -1.2]]) {
    const cr = makeCreature('villager', c, 0x1a1a1a); cr.g.position.set(x, 0, z); cr.g.rotation.y = a; cr.mats.forEach((m) => levelDisp.push(m)); props.add(cr.g);
  }
  bakeStatic(props);
  // light, sky and air
  makeEnv(0x6a96c8, 0xf3c48a, 0x5a6a42, 0xffd8a0);
  scene.environmentIntensity = 0.55;
}

// ================= interactables =================
const interacts = [];
function addInteract(o) { interacts.push(o); if (o.label) addLabel(o.label, o.x, o.ly || 3.2, o.z, o.cls || 'npc', o); return o; }

// ================= themed rooms =================
function dressThemedRooms() {
  const L = LV, W = worldMats(), B = biomeOf(L.depth);
  const wood = [], books = [], stone = [], glowL = [], cliffs = [], rims = [];
  L.floods = [];
  for (const r of L.rooms) {
    if (!r.theme) continue;
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.theme === 'library') {
      for (const [i, j, side] of r.shelves) {
        const x = i + 0.5, z = j + 0.5, dz = side === 0 ? -0.22 : side === 2 ? 0.22 : 0, d = side === 1 ? 0.7 : 0.45;
        wood.push({ x, y: 1.1, z: z + dz, sx: 0.96, sy: 2.2, sz: d, c: 0x5a3a24 });
        for (let s = 0; s < 3; s++) for (let b = 0; b < 6; b++) {
          const face = side === 1 ? [-1, 1] : [side === 0 ? 1 : -1];
          for (const f of face) books.push({ x: x - 0.38 + b * 0.15 + rand(-0.02, 0.02), y: 0.45 + s * 0.62, z: z + dz + f * (d / 2 - 0.06), sx: 0.11, sy: rand(0.32, 0.44), sz: 0.16, c: pick([0x7a2a2a, 0x2a4a7a, 0x3a6a3a, 0x8a6a2a, 0x5a3a6a, 0xc8b89a]) });
        }
      }
      for (let k = 0; k < 3; k++) glowL.push({ x: rand(r.x + 1.5, r.x + r.w - 1.5), y: 0.95, z: rand(r.y + 1.5, r.y + r.h - 1.5), sx: 0.08, sy: 0.12, sz: 0.08, c: glowC(0xffc070, 3.4) });
    } else if (r.theme === 'tomb') {
      for (const [x, z] of r.coffins) {
        stone.push({ x, y: 0.3, z, sx: 1.8, sy: 0.6, sz: 0.8, c: 0x4a463f });
        stone.push({ x, y: 0.66, z, sx: 1.95, sy: 0.12, sz: 0.92, c: 0x5e5950 });
        stone.push({ x: x + 0.3, y: 0.76, z, sx: 0.5, sy: 0.08, sz: 0.36, c: 0x3a3630 });
        glowL.push({ x: x - 1.05, y: 0.4, z, sx: 0.08, sy: 0.14, sz: 0.08, c: glowC(0xffc070, 3) });
      }
    } else if (r.theme === 'vault') {
      for (let k = 0; k < 14; k++) glowL.push({ x: rand(r.x + 1, r.x + r.w - 1), y: 0.02, z: rand(r.y + 1, r.y + r.h - 1), sx: rand(0.08, 0.16), sy: 0.03, sz: rand(0.08, 0.16), ry: rand(0, 3), c: glowC(0xffd24a, 2.4) });
      for (const [x, z] of r.chests) stone.push({ x, y: 0.06, z, sx: 1.4, sy: 0.12, sz: 1.0, c: 0x6a5a3a });
    } else if (r.theme === 'grove') {
      const [x, z] = r.spring;
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; stone.push({ x: x + Math.sin(a) * 1.25, y: 0.16, z: z + Math.cos(a) * 1.25, sx: 0.42, sy: 0.32, sz: 0.36, ry: a, c: 0x6a6a5a }); }
      for (let k = 0; k < 16; k++) { const gx = rand(r.x + 0.8, r.x + r.w - 0.8), gz = rand(r.y + 0.8, r.y + r.h - 0.8); if (Math.hypot(gx - x, gz - z) < 1.8) continue; wood.push({ x: gx, y: 0.25, z: gz, sx: 0.06, sy: 0.5, sz: 0.06, c: 0x3a6a3a }); glowL.push({ x: gx, y: 0.55, z: gz, sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(pick([0x9aff9a, 0xd8ff8a, 0x8affe8]), 2.6) }); }
      const wm = liquidMat('water', { torch: 0x3affc0 }); levelDisp.push(wm); L.waterMats = (L.waterMats || []).concat(wm);
      const pool = mesh(G.cyl, wm, 2.1, 0.04, 2.1, x, 0.08, z); pool.renderOrder = 2; world.add(pool);
    } else if (r.theme === 'hall') {
      const long = r.w >= r.h, carpet = mesh(G.tile, new THREE.MeshStandardMaterial({ color: 0x6a1a22, roughness: 0.95 }), long ? r.w - 2 : 1.6, 1, long ? 1.6 : r.h - 2, cx, 0.012, cz);
      levelDisp.push(carpet.material); world.add(carpet);
    } else if (r.theme === 'flooded') {
      const lava = B.id === 'magma'; if (lava) L.lava = true;
      const wm = liquidMat(lava ? 'lava' : 'water', B); levelDisp.push(wm);
      L.waterMats = (L.waterMats || []).concat(wm);
      const wtr = mesh(G.tile, wm, r.w, 1, r.h, cx, 0.12, cz); wtr.renderOrder = 2; world.add(wtr);
      L.floods.push(r);
    } else if (r.theme === 'chasm') {
      const abyss = mesh(G.tile, new THREE.MeshBasicMaterial({ color: new THREE.Color(B.torch).multiplyScalar(0.09) }), r.w - 4, 1, r.h - 4, cx, -6, cz);
      levelDisp.push(abyss.material); world.add(abyss);
      for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
        if (L.g[j * L.w + i] !== 5) continue;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (L.g[(j + b) * L.w + i + a] === 5) continue;
          cliffs.push({ x: i + 0.5 + a * 0.5, y: -3, z: j + 0.5 + b * 0.5, sx: a ? 0.06 : 1, sy: 6, sz: b ? 0.06 : 1, c: grey(rand(0.55, 0.75)) });
          rims.push({ x: i + 0.5 + a * 0.44, y: 0.05, z: j + 0.5 + b * 0.44, sx: a ? 0.14 : 1.02, sy: 0.1, sz: b ? 0.14 : 1.02, c: grey(rand(0.8, 1)) });
        }
        if (chance(0.12)) glowL.push({ x: i + rand(0.2, 0.8), y: -5.6, z: j + rand(0.2, 0.8), sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(B.torch, 3) });
      }
    }
  }
  if (wood.length) instanced(G.box, W.decoStd, wood, { keep: true, cast: true });
  if (books.length) instanced(G.box, W.decoStd, books, { keep: true });
  if (stone.length) instanced(G.box, W.decoStd, stone, { keep: true, cast: true });
  if (cliffs.length) instanced(G.box, W.wall, cliffs, { keep: true });
  if (rims.length) instanced(G.box, W.cap, rims, { keep: true });
  if (glowL.length) instanced(G.sph, W.glow, glowL, { keep: true, receive: false });
}
const inFlood = (x, z) => LV && LV.floods && LV.floods.some((r) => x >= r.x && x < r.x + r.w && z >= r.y && z < r.y + r.h);
