// ================= three.js setup =================
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 160);
const CAM_OFF = new THREE.Vector3(0, 19.5, 10.8);
let camZoom = 1;
const hemi = new THREE.HemisphereLight(0xffffff, 0x303040, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 0.8); sun.position.set(-10, 24, 8); scene.add(sun);
const torch = new THREE.PointLight(0xffc27a, 0, 18, 1.4); scene.add(torch);
let world = new THREE.Group(); scene.add(world);
const fxGroup = new THREE.Group(); scene.add(fxGroup);
let levelDisp = [];

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 60 : 45;
  camZoom = w < h ? 1.05 : 1;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 14, 10),
  lsph: new THREE.SphereGeometry(0.5, 8, 6),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.06, 6, 18, Math.PI),
  ring: new THREE.RingGeometry(0.88, 1, 48),
  disc: new THREE.CircleGeometry(1, 48),
  plane: new THREE.PlaneGeometry(1, 1),
  fullTorus: new THREE.TorusGeometry(1, 0.1, 8, 32),
};
G.tile = new THREE.PlaneGeometry(1, 1); G.tile.rotateX(-Math.PI / 2);
G.ring.rotateX(-Math.PI / 2);
G.disc.rotateX(-Math.PI / 2);
const _mc = new Map();
function mat(c, glow) {
  const k = c + '|' + (glow || 0);
  if (!_mc.has(k)) {
    const m = glow ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c });
    _mc.set(k, m);
  }
  return _mc.get(k);
}
function lam(c) { return new THREE.MeshLambertMaterial({ color: c }); }
function mesh(geo, m, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.scale.set(sx, sy, sz); o.position.set(x || 0, y || 0, z || 0);
  return o;
}

// ================= draw-call reduction =================
// Each Mesh is one draw call. Static parts that share a material are baked into one geometry
// (threejs-performance: "Merge static geometry"), and a creature's parts are merged once per kind
// and the merged geometry is shared by every creature of that kind.
function mergeGeos(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io++] = a[i] + vo; }
    else for (let i = 0; i < c; i++) idx[io++] = i + vo;
    vo += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
// Bake every plain mesh under root (relative to root) into one merged geometry per material.
// Returns [{ material, geometry }]. Objects flagged userData.live are left alone.
function bakeByMaterial(root, skip) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || (skip && skip(o))) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.live) return;
    if (o.material.transparent) return;
    const g = o.geometry.clone();
    m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = [];
  for (const [material, geos] of buckets) { out.push({ material, geometry: mergeGeos(geos) }); for (const g of geos) g.dispose(); }
  return out;
}
// Replace a static subtree with merged meshes (one per material). Matrices are composed once.
function bakeStatic(root, skip) {
  const baked = bakeByMaterial(root, skip);
  const keep = [];
  root.traverse((o) => { if (o !== root && (o.isInstancedMesh || o.userData.live || (o.isMesh && (o.material.transparent || (skip && skip(o)))))) keep.push(o); });
  const keepTop = keep.filter((o) => !keep.some((k) => k !== o && isAncestor(k, o)));
  for (const k of keepTop) { const wm = k.matrixWorld.clone(); k.parent.remove(k); k.matrix.copy(wm); k.matrix.decompose(k.position, k.quaternion, k.scale); }
  while (root.children.length) root.remove(root.children[0]);
  for (const b of baked) {
    const me = new THREE.Mesh(b.geometry, b.material);
    me.matrixAutoUpdate = false; me.updateMatrix();
    root.add(me); levelDisp.push(b.geometry);
  }
  for (const k of keepTop) root.add(k);
  return baked.length;
}
function isAncestor(a, b) { for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; }

// ================= creature builders =================
const ROLE_BODY = new THREE.MeshLambertMaterial(), ROLE_DARK = new THREE.MeshLambertMaterial(), ROLE_EYE = new THREE.MeshBasicMaterial(), ROLE_GLOW = new THREE.MeshBasicMaterial();
const creatureCache = new Map();
function makeCreature(kind, color, eyeCol) {
  // merged once per kind; each creature gets its own body/dark materials (for hit flashes and tints)
  if (!creatureCache.has(kind)) {
    const t = buildCreatureTemplate(kind);
    const live = t.g.children.filter((c) => c.userData.float || c.userData.spin);
    for (const c of live) c.userData.live = 1;
    const parts = bakeByMaterial(t.g);
    creatureCache.set(kind, { parts, live: live.map((c) => ({ geo: c.geometry, pos: c.position.clone(), scale: c.scale.clone(), rot: c.rotation.clone(), ud: { ...c.userData } })), h: t.h });
  }
  const T = creatureCache.get(kind);
  const g = new THREE.Group();
  const body = lam(color);
  const dark = lam(new THREE.Color(color).multiplyScalar(0.55));
  const eye = mat(eyeCol || 0xffe08a, 1);
  const map = new Map([[ROLE_BODY, body], [ROLE_DARK, dark], [ROLE_EYE, eye], [ROLE_GLOW, mat(eyeCol || 0xb48cff, 1)]]);
  for (const p of T.parts) g.add(new THREE.Mesh(p.geometry, map.get(p.material) || p.material));
  for (const l of T.live) { const o = new THREE.Mesh(l.geo, map.get(ROLE_GLOW)); o.position.copy(l.pos); o.scale.copy(l.scale); o.rotation.copy(l.rot); o.userData = { ...l.ud }; delete o.userData.live; g.add(o); }
  return { g, mats: [body, dark], h: T.h };
}
function buildCreatureTemplate(kind) {
  const eyeCol = 0;
  const g = new THREE.Group();
  const body = ROLE_BODY, dark = ROLE_DARK, eye = ROLE_EYE;
  let h = 1.4, ey = 1.15, ez = 0.2, es = 0.09;
  switch (kind) {
    case 'grunt':
      g.add(mesh(G.box, body, 0.6, 0.7, 0.4, 0, 0.55, 0), mesh(G.sph, body, 0.48, 0.48, 0.48, 0, 1.12, 0));
      g.add(mesh(G.box, dark, 0.18, 0.55, 0.18, -0.4, 0.55, 0), mesh(G.box, dark, 0.18, 0.55, 0.18, 0.4, 0.55, 0));
      g.add(mesh(G.box, dark, 0.07, 0.07, 0.75, 0.42, 0.45, 0.35));
      break;
    case 'brute':
      g.add(mesh(G.box, body, 0.95, 0.85, 0.62, 0, 0.7, 0));
      g.add(mesh(G.sph, dark, 0.48, 0.48, 0.48, -0.56, 1.08, 0), mesh(G.sph, dark, 0.48, 0.48, 0.48, 0.56, 1.08, 0));
      g.add(mesh(G.sph, body, 0.42, 0.42, 0.42, 0, 1.25, 0.14));
      g.add(mesh(G.box, dark, 0.28, 0.75, 0.28, -0.64, 0.5, 0.05), mesh(G.box, dark, 0.28, 0.75, 0.28, 0.64, 0.5, 0.05));
      h = 1.6; ey = 1.28; ez = 0.32; es = 0.1;
      break;
    case 'archer':
      g.add(mesh(G.box, body, 0.45, 0.65, 0.3, 0, 0.55, 0), mesh(G.sph, body, 0.4, 0.4, 0.4, 0, 1.06, 0));
      { const b = mesh(G.torus, dark, 0.7, 0.7, 0.7, 0.36, 0.72, 0.18); b.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(b); }
      g.add(mesh(G.cone, dark, 0.42, 0.3, 0.42, 0, 1.33, 0));
      h = 1.35; ey = 1.08; ez = 0.17; es = 0.07;
      break;
    case 'caster': {
      g.add(mesh(G.cone, body, 0.85, 1.15, 0.85, 0, 0.58, 0), mesh(G.sph, body, 0.38, 0.38, 0.38, 0, 1.27, 0));
      g.add(mesh(G.cone, dark, 0.46, 0.55, 0.46, 0, 1.62, 0));
      const orb = mesh(G.sph, ROLE_GLOW, 0.24, 0.24, 0.24, 0.38, 1.0, 0.3); orb.userData.float = 1; g.add(orb);
      h = 1.75; ey = 1.29; ez = 0.16; es = 0.07;
      break;
    }
    case 'skitter':
      g.add(mesh(G.sph, body, 0.72, 0.4, 0.82, 0, 0.32, 0));
      for (let i = 0; i < 4; i++) { const l = mesh(G.box, dark, 0.06, 0.06, 0.6, (i < 2 ? -1 : 1) * 0.32, 0.18, i % 2 ? 0.15 : -0.15); l.rotation.y = (i < 2 ? 1 : -1) * 0.9 * (i % 2 ? 1 : -1); g.add(l); }
      h = 0.7; ey = 0.4; ez = 0.34; es = 0.08;
      break;
    case 'bomber':
      g.add(mesh(G.sph, body, 1.05, 0.95, 1.05, 0, 0.6, 0), mesh(G.sph, dark, 0.38, 0.32, 0.38, 0, 1.1, 0.12));
      for (let i = 0; i < 4; i++) g.add(mesh(G.sph, mat(0xffd24a, 1), 0.12, 0.12, 0.12, Math.sin(i * 1.7) * 0.48, 0.5 + (i % 2) * 0.25, Math.cos(i * 1.7) * 0.48));
      h = 1.25; ey = 0.82; ez = 0.47; es = 0.08;
      break;
    case 'summoner': {
      g.add(mesh(G.cone, body, 0.9, 1.45, 0.9, 0, 0.72, 0), mesh(G.sph, body, 0.4, 0.4, 0.4, 0, 1.55, 0));
      g.add(mesh(G.cone, dark, 0.52, 0.6, 0.52, 0, 1.84, -0.04));
      g.add(mesh(G.cyl, dark, 0.07, 1.9, 0.07, 0.45, 0.95, 0.12));
      const gem = mesh(G.oct, ROLE_GLOW, 0.26, 0.34, 0.26, 0.45, 2.0, 0.12); gem.userData.spin = 1; g.add(gem);
      h = 2.0; ey = 1.57; ez = 0.17; es = 0.07;
      break;
    }
    case 'warden':
      g.add(mesh(G.box, body, 0.82, 0.95, 0.56, 0, 0.65, 0), mesh(G.box, body, 0.48, 0.48, 0.48, 0, 1.36, 0));
      g.add(mesh(G.box, dark, 0.62, 0.86, 0.1, -0.24, 0.66, 0.38));
      g.add(mesh(G.box, dark, 0.07, 0.07, 0.9, 0.48, 0.6, 0.3));
      h = 1.75; ey = 1.38; ez = 0.25; es = 0.07;
      break;
  }
  g.add(mesh(G.sph, eye, es, es, es, -0.1, ey, ez), mesh(G.sph, eye, es, es, es, 0.1, ey, ez));
  return { g, h };
}

function weaponMesh(kind) {
  const g = new THREE.Group();
  const metal = mat(0xcfd6df), wood = mat(0x7a5532), gold = mat(0xd6a24a), dark = mat(0x3a3a44);
  switch (kind) {
    case 'sword': g.add(mesh(G.box, metal, 0.09, 0.05, 0.95, 0, 0, 0.62), mesh(G.box, gold, 0.34, 0.07, 0.07, 0, 0, 0.14), mesh(G.box, dark, 0.06, 0.06, 0.22, 0, 0, 0)); break;
    case 'axe': g.add(mesh(G.box, wood, 0.07, 0.07, 1.0, 0, 0, 0.42), mesh(G.box, metal, 0.42, 0.06, 0.3, 0.16, 0, 0.82)); break;
    case 'dagger': g.add(mesh(G.box, metal, 0.07, 0.04, 0.48, 0, 0, 0.36), mesh(G.box, gold, 0.2, 0.05, 0.05, 0, 0, 0.1)); break;
    case 'spear': g.add(mesh(G.box, wood, 0.06, 0.06, 1.8, 0, 0, 0.6), mesh(G.cone4, metal, 0.16, 0.36, 0.16, 0, 0, 1.6)); g.children[1].rotation.x = Math.PI / 2; break;
    case 'hammer': g.add(mesh(G.box, wood, 0.08, 0.08, 1.05, 0, 0, 0.45), mesh(G.box, metal, 0.5, 0.28, 0.28, 0, 0, 0.92)); break;
    case 'bow': { const b = mesh(G.torus, wood, 0.9, 0.9, 0.9, 0, 0, 0.2); b.rotation.set(0, 0, Math.PI / 2); b.rotation.y = Math.PI / 2; g.add(b); g.add(mesh(G.box, mat(0xeeeeee), 0.01, 0.9, 0.01, 0, 0, 0.2)); break; }
    case 'staff': g.add(mesh(G.cyl, wood, 0.07, 1.6, 0.07, 0, 0, 0.3), mesh(G.sph, mat(0xa98cff, 1), 0.22, 0.22, 0.22, 0, 0, 1.14)); g.children[0].rotation.x = Math.PI / 2; break;
    default: g.add(mesh(G.sph, mat(0xe0b896), 0.2, 0.2, 0.2, 0, 0, 0.1));
  }
  return g;
}

function makeHero() {
  const g = new THREE.Group();
  const cloak = mat(0x2f6f73), steel = mat(0x9aa3b0), skin = mat(0xe0b896), leather = mat(0x6a4a32), hair = mat(0x3a2a1e);
  g.add(mesh(G.box, steel, 0.56, 0.62, 0.38, 0, 0.62, 0));
  g.add(mesh(G.box, leather, 0.6, 0.1, 0.42, 0, 0.42, 0));
  g.add(mesh(G.box, cloak, 0.62, 0.78, 0.08, 0, 0.62, -0.24));
  g.add(mesh(G.box, leather, 0.18, 0.36, 0.2, -0.15, 0.16, 0), mesh(G.box, leather, 0.18, 0.36, 0.2, 0.15, 0.16, 0));
  g.add(mesh(G.sph, skin, 0.42, 0.42, 0.42, 0, 1.14, 0));
  g.add(mesh(G.sph, hair, 0.46, 0.3, 0.46, 0, 1.28, -0.05));
  g.add(mesh(G.sph, mat(0x1a1a1a), 0.07, 0.07, 0.07, -0.09, 1.15, 0.19), mesh(G.sph, mat(0x1a1a1a), 0.07, 0.07, 0.07, 0.09, 1.15, 0.19));
  const hand = new THREE.Group(); hand.position.set(0.36, 0.62, 0.1); g.add(hand);
  const off = mesh(G.box, steel, 0.16, 0.42, 0.16, -0.38, 0.62, 0.02); g.add(off);
  const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xd6a24a, transparent: true, opacity: 0.5, depthWrite: false }));
  ring.scale.setScalar(0.55); ring.position.y = 0.03; g.add(ring);
  hand.userData.live = 1;
  const parts = bakeByMaterial(g);
  const out = new THREE.Group();
  for (const p of parts) out.add(new THREE.Mesh(p.geometry, p.material));
  out.add(hand, ring);
  return { g: out, hand };
}

// ================= level generation =================
let LV = null;
function tidx(x, z) { return Math.floor(z) * LV.w + Math.floor(x); }
function solid(i, j) { return i < 0 || j < 0 || i >= LV.w || j >= LV.h || LV.g[j * LV.w + i] !== 1; }
function walkable(x, z) { return !solid(Math.floor(x), Math.floor(z)); }

function genDungeon(depth) {
  const boss = depth % 5 === 0;
  const W = boss ? 46 : 60, H = boss ? 50 : 60;
  const g = new Uint8Array(W * H);
  const rooms = [];
  const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i > 0 && j > 0 && i < W - 1 && j < H - 1) g[j * W + i] = 1; };
  const cx = (r) => Math.floor(r.x + r.w / 2), cy = (r) => Math.floor(r.y + r.h / 2);
  const corridor = (a, b) => {
    const x1 = cx(a), y1 = cy(a), x2 = cx(b), y2 = cy(b);
    if (chance(0.5)) { carve(Math.min(x1, x2), y1, Math.abs(x2 - x1) + 2, 2); carve(x2, Math.min(y1, y2), 2, Math.abs(y2 - y1) + 2); }
    else { carve(x1, Math.min(y1, y2), 2, Math.abs(y2 - y1) + 2); carve(Math.min(x1, x2), y2, Math.abs(x2 - x1) + 2, 2); }
  };
  let arena = null;
  if (boss) {
    rooms.push({ x: Math.floor(W / 2) - 4, y: H - 11, w: 8, h: 7 });
    rooms.push({ x: Math.floor(W / 2) - 5, y: H - 23, w: 10, h: 7 });
    arena = { x: Math.floor(W / 2) - 11, y: 4, w: 22, h: 20 };
    rooms.push(arena);
    rooms.forEach((r) => carve(r.x, r.y, r.w, r.h));
    carve(Math.floor(W / 2) - 1, H - 17, 3, 7);
    carve(Math.floor(W / 2) - 1, 23, 3, H - 23 - 22);
    // a few pillars in the arena
    for (const [px, py] of [[-6, -5], [5, -5], [-6, 4], [5, 4]]) { const ix = Math.floor(W / 2) + px, iy = 14 + py; g[iy * W + ix] = 0; }
  } else {
    let tries = 0; const target = randi(10, 14);
    while (rooms.length < target && tries++ < 500) {
      const w = randi(5, 11), h = randi(5, 10), x = randi(2, W - w - 3), y = randi(2, H - h - 3);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h });
    }
    rooms.forEach((r) => carve(r.x, r.y, r.w, r.h));
    const inT = [0], edges = [];
    while (inT.length < rooms.length) {
      let best = null, bd = 1e9;
      for (const a of inT) for (let b = 0; b < rooms.length; b++) {
        if (inT.includes(b)) continue;
        const d = Math.hypot(cx(rooms[a]) - cx(rooms[b]), cy(rooms[a]) - cy(rooms[b]));
        if (d < bd) { bd = d; best = [a, b]; }
      }
      edges.push(best); inT.push(best[1]);
    }
    for (let k = 0; k < 3; k++) { const a = randi(0, rooms.length - 1), b = randi(0, rooms.length - 1); if (a !== b) edges.push([a, b]); }
    for (const [a, b] of edges) corridor(rooms[a], rooms[b]);
    // pillars in big rooms
    for (const r of rooms.slice(1)) if (r.w >= 9 && r.h >= 8 && chance(0.5)) {
      for (const [px, py] of [[2, 2], [r.w - 3, 2], [2, r.h - 3], [r.w - 3, r.h - 3]]) g[(r.y + py) * W + r.x + px] = 0;
    }
  }
  // BFS distances from start for exit placement
  const s = rooms[0]; const sIdx = cy(s) * W + cx(s);
  const dist = new Int32Array(W * H).fill(-1); const q = [sIdx]; dist[sIdx] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = (y + dy) * W + x + dx; if (g[n] === 1 && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } }
  }
  let exitRoom = rooms[rooms.length - 1], bestD = -1;
  if (!boss) for (const r of rooms.slice(1)) { const d = dist[cy(r) * W + cx(r)]; if (d > bestD) { bestD = d; exitRoom = r; } }
  return { type: 'dungeon', depth, boss, w: W, h: H, g, rooms, arena, exitRoom, start: { x: cx(s) + 0.5, z: cy(s) + 0.5 }, explored: new Uint8Array(W * H) };
}

const TOWN = {
  w: 44, h: 36,
  home: { x: 4, y: 3, w: 8, h: 8, door: [8, 11] },
  smith: { x: 17, y: 4, w: 7, h: 6, door: [20, 10] },
  alch: { x: 29, y: 4, w: 7, h: 6, door: [32, 10] },
  trader: { x: 31, y: 21, w: 7, h: 6, door: [34, 20] },
};
function genTown() {
  const W = TOWN.w, H = TOWN.h; const g = new Uint8Array(W * H).fill(1);
  const block = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j * W + i] = 0; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (i < 2 || j < 2 || i >= W - 2 || j >= H - 2) g[j * W + i] = 0;
  for (const k of ['home', 'smith', 'alch', 'trader']) { const b = TOWN[k]; block(b.x, b.y, b.w, b.h); }
  block(21, 16, 2, 2); // well
  block(18, 32, 2, 2); block(24, 32, 2, 2); // gate pillars
  const path = new Uint8Array(W * H);
  const mark = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) path[j * W + i] = 1; };
  mark(4, 12, 36, 2); mark(20, 12, 4, 21); mark(8, 11, 1, 1); mark(20, 10, 2, 2); mark(32, 10, 2, 2); mark(34, 14, 2, 7);
  mark(19, 15, 6, 4);
  return { type: 'town', depth: 0, w: W, h: H, g, path, start: { x: 22, z: 25 }, explored: new Uint8Array(W * H).fill(1) };
}

// ================= level visuals =================
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
  for (const p of parts) { p.life = 0; p.m.visible = false; }
}
function instanced(geo, material, list) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  list.forEach((t, i) => {
    e.set(0, t.ry || 0, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sx, t.sy, t.sz));
    im.setMatrixAt(i, m4);
    if (t.c !== undefined) im.setColorAt(i, c.set(t.c));
  });
  im.count = list.length;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  im.matrixAutoUpdate = false; im.updateMatrix();
  levelDisp.push(material);
  world.add(im);
  return im;
}
function tint(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }

function buildDungeonVisuals() {
  const L = LV, B = biomeOf(L.depth);
  const floors = [], walls = [], tops = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    const v = L.g[j * L.w + i];
    if (v === 1) floors.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: tint((i + j) % 2 ? B.floor : B.floor2, rand(0.88, 1.08)) });
    else {
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < L.w && jj < L.h && L.g[jj * L.w + ii] === 1) { near = true; break; } }
      if (near) {
        const hgt = rand(1.15, 1.45);
        walls.push({ x: i + 0.5, y: hgt / 2, z: j + 0.5, sx: 1, sy: hgt, sz: 1, c: tint(B.wall, rand(0.8, 1.1)) });
        tops.push({ x: i + 0.5, y: hgt + 0.02, z: j + 0.5, sx: 1.02, sy: 0.04, sz: 1.02, c: tint(B.wall, 0.45) });
      }
    }
  }
  instanced(G.tile, new THREE.MeshLambertMaterial({ color: 0xffffff }), floors);
  instanced(G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), walls);
  instanced(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), tops);
  // torches on walls touching rooms
  const torches = [], flames = [];
  for (const r of L.rooms) {
    const n = randi(1, 3);
    for (let k = 0; k < n; k++) {
      const side = randi(0, 3);
      let i, j;
      if (side === 0) { i = randi(r.x, r.x + r.w - 1); j = r.y - 1; }
      else if (side === 1) { i = randi(r.x, r.x + r.w - 1); j = r.y + r.h; }
      else if (side === 2) { i = r.x - 1; j = randi(r.y, r.y + r.h - 1); }
      else { i = r.x + r.w; j = randi(r.y, r.y + r.h - 1); }
      if (!solid(i, j)) continue;
      const ox = side === 2 ? 0.55 : side === 3 ? -0.55 : 0, oz = side === 0 ? 0.55 : side === 1 ? -0.55 : 0;
      torches.push({ x: i + 0.5 + ox, y: 0.95, z: j + 0.5 + oz, sx: 0.1, sy: 0.35, sz: 0.1, c: 0x4a3524 });
      flames.push({ x: i + 0.5 + ox, y: 1.2, z: j + 0.5 + oz, sx: 0.2, sy: 0.3, sz: 0.2, c: B.torch });
    }
  }
  instanced(G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), torches);
  instanced(G.sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), flames);
  // biome decoration
  const deco = [], deco2 = [];
  const st = L.rooms[0];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1 || !chance(0.045)) continue;
    if (i >= st.x && i < st.x + st.w && j >= st.y && j < st.y + st.h) continue;
    const x = i + rand(0.2, 0.8), z = j + rand(0.2, 0.8);
    switch (B.deco) {
      case 'bones': deco.push({ x, y: 0.05, z, sx: rand(0.3, 0.6), sy: 0.08, sz: 0.08, ry: rand(0, 3), c: 0xd8d0b8 }); deco.push({ x: x + 0.1, y: 0.07, z: z + 0.1, sx: 0.14, sy: 0.12, sz: 0.14, ry: 0, c: 0xe8e0c8 }); break;
      case 'shrooms': { const s = rand(0.5, 1.2); deco.push({ x, y: 0.2 * s, z, sx: 0.1 * s, sy: 0.4 * s, sz: 0.1 * s, c: 0xd8d0b8 }); deco2.push({ x, y: 0.42 * s, z, sx: 0.42 * s, sy: 0.2 * s, sz: 0.42 * s, c: pick([0x8aff6a, 0x6affd0, 0xd0ff4a]) }); break; }
      case 'cracks': deco2.push({ x, y: 0.01, z, sx: rand(0.5, 0.9), sy: 0.02, sz: 0.08, ry: rand(0, 3), c: 0xff6a1a }); break;
      case 'ice': deco.push({ x, y: 0.2, z, sx: rand(0.15, 0.3), sy: rand(0.4, 0.9), sz: rand(0.15, 0.3), ry: rand(0, 3), c: 0xcfe8ff }); break;
      case 'shards': deco2.push({ x, y: rand(0.6, 1.4), z, sx: 0.18, sy: 0.32, sz: 0.18, ry: rand(0, 3), c: pick([0xd06cff, 0x8a6cff, 0xff6cf0]) }); break;
    }
  }
  if (deco.length) instanced(B.deco === 'ice' ? G.oct : G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), deco);
  if (deco2.length) instanced(B.deco === 'shrooms' ? G.sph : B.deco === 'shards' ? G.oct : G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), deco2);
}

function addBuilding(b, wallC, roofC, opt = {}) {
  const grp = new THREE.Group();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const hh = opt.h || 2.4;
  const w = b.w - (opt.inset || 0.4), d = b.h - (opt.inset || 0.4);
  grp.add(mesh(G.box, mat(wallC), w, hh, d, cx, hh / 2, cz));
  const roof = mesh(G.cone4, mat(roofC), Math.max(w, d) * 0.78, opt.roofH || 2, Math.max(w, d) * 0.78, cx, hh + (opt.roofH || 2) / 2, cz);
  roof.rotation.y = Math.PI / 4; roof.scale.set(w * 0.74, opt.roofH || 2, d * 0.74); grp.add(roof);
  // door and windows on south (+z) or north face
  const fz = opt.north ? b.y + 0.18 : b.y + b.h - 0.18;
  grp.add(mesh(G.box, mat(0x3a2618), 1, 1.5, 0.1, b.door[0] + 0.5, 0.75, fz));
  for (const ox of [-2, 2]) grp.add(mesh(G.box, mat(0xffd68a, 1), 0.7, 0.55, 0.06, b.door[0] + 0.5 + ox, 1.45, fz + (opt.north ? -0.02 : 0.02)));
  world.add(grp);
  return grp;
}
function buildHome() {
  const b = TOWN.home, lvl = S.home.house, cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const grp = new THREE.Group();
  const door = (z) => grp.add(mesh(G.box, mat(0x3a2618), 1, 1.5, 0.1, b.door[0] + 0.5, 0.75, z));
  const win = (x, y, z) => grp.add(mesh(G.box, mat(0xffd68a, 1), 0.6, 0.5, 0.06, x, y, z));
  if (lvl === 0) {
    const m = mesh(G.box, mat(0x6a4a30), 4.2, 2, 3.6, cx, 1, cz + 1.4); m.rotation.y = 0.04; grp.add(m);
    const r = mesh(G.cone4, mat(0x5a4030), 4.2, 1.3, 3.4, cx, 2.65, cz + 1.4); r.rotation.y = Math.PI / 4 + 0.08; grp.add(r);
    door(cz + 3.25); grp.add(mesh(G.box, mat(0x4a3526), 0.6, 0.6, 0.6, cx + 2.6, 0.3, cz + 2.8));
  } else if (lvl <= 2) {
    const w = lvl === 1 ? 6 : 7.2, d = lvl === 1 ? 5 : 6.2;
    grp.add(mesh(G.box, mat(lvl === 1 ? 0xb58a5a : 0xd8c8a8), w, 2.5, d, cx, 1.25, cz + 0.6));
    const r = mesh(G.cone4, mat(lvl === 1 ? 0x9a3a2a : 0x6a3a2a), 1, 2.1, 1, cx, 3.55, cz + 0.6); r.rotation.y = Math.PI / 4; r.scale.set(w * 0.76, 2.1, d * 0.76); grp.add(r);
    door(cz + 0.6 + d / 2 + 0.03); win(cx - 2, 1.5, cz + 0.6 + d / 2 + 0.03); win(cx + 2, 1.5, cz + 0.6 + d / 2 + 0.03);
    if (lvl === 2) { grp.add(mesh(G.box, mat(0x8a7a6a), 0.7, 2.2, 0.7, cx + 2, 4, cz)); grp.add(mesh(G.box, mat(0x6a4a30), 3, 0.15, 1.2, cx, 2.0, cz + 4.2)); }
  } else {
    const stone = lvl === 3 ? 0x9a9aa2 : 0x8a8a96;
    grp.add(mesh(G.box, mat(stone), 7.4, 4, 6.8, cx, 2, cz + 0.4));
    const r = mesh(G.cone4, mat(0x3a4058), 1, 2.4, 1, cx, 5.2, cz + 0.4); r.rotation.y = Math.PI / 4; r.scale.set(7.4 * 0.76, 2.4, 6.8 * 0.76); grp.add(r);
    door(cz + 3.83);
    for (const y of [1.5, 3.1]) { win(cx - 2.2, y, cz + 3.83); win(cx + 2.2, y, cz + 3.83); }
    grp.add(mesh(G.box, mat(0x7a7a84), 0.8, 2.6, 0.8, cx - 2.4, 6, cz - 0.6));
    if (lvl === 4) {
      for (const ox of [-3.9, 3.9]) {
        grp.add(mesh(G.cyl, mat(0x7a7a86), 1.8, 6, 1.8, cx + ox, 3, cz + 3.4));
        grp.add(mesh(G.cone, mat(0x5a2a3a), 2.2, 2, 2.2, cx + ox, 7, cz + 3.4));
      }
      grp.add(mesh(G.box, mat(0xd6a24a), 0.06, 1.6, 1, cx, 6.6, cz + 0.4), mesh(G.cyl, mat(0x4a4a50), 0.06, 3, 0.06, cx, 7, cz + 0.4));
    }
  }
  world.add(grp);
  // garden east of the house
  if (S.home.garden > 0) {
    const rows = S.home.garden * 2;
    for (let k = 0; k < rows; k++) {
      grp.add(mesh(G.box, mat(0x4a3424), 2.4, 0.18, 0.5, 14.2, 0.09, 4.6 + k * 0.9));
      for (let p = 0; p < 4; p++) grp.add(mesh(G.cone, mat(pick([0x5aa04a, 0x6ab85a, 0x8ac05a])), 0.26, 0.38, 0.26, 13.3 + p * 0.6, 0.35, 4.6 + k * 0.9));
    }
    if (S.home.garden === 3) { const gh = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28 })); gh.scale.set(3, 2, rows * 0.9 + 0.6); gh.position.set(14.2, 1, 4.6 + (rows - 1) * 0.45); levelDisp.push(gh.material); grp.add(gh); }
  }
  // trophies along the path in front of the house
  if (S.home.trophy > 0) {
    const shown = S.slain.slice(-8);
    for (let k = 0; k < 8; k++) {
      const x = 3.6 + k * 1.05, z = 14.6;
      grp.add(mesh(G.box, mat(0x6a6a74), 0.5, 0.9, 0.5, x, 0.45, z));
      if (shown[k]) grp.add(mesh(G.oct, mat(shown[k].c, 1), 0.38, 0.5, 0.38, x, 1.2, z));
    }
  }
}

function buildTownVisuals() {
  const L = LV; const tiles = [], trees = [], crowns = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    const p = L.path[j * L.w + i];
    const c = p ? tint(0xa8916a, rand(0.94, 1.03)) : tint(0x5f8f44, rand(0.95, 1.04));
    tiles.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c });
    if ((i < 2 || j < 2 || i >= L.w - 2 || j >= L.h - 2) && chance(0.55)) {
      const s = rand(0.8, 1.4);
      trees.push({ x: i + rand(0.3, 0.7), y: 0.5 * s, z: j + rand(0.3, 0.7), sx: 0.3 * s, sy: 1 * s, sz: 0.3 * s, c: 0x6a4a32 });
      crowns.push({ x: trees[trees.length - 1].x, y: 1.6 * s, z: trees[trees.length - 1].z, sx: 1.5 * s, sy: 2 * s, sz: 1.5 * s, c: pick([0x2f6a3a, 0x3a7a42, 0x2a5a34, 0x45804a]) });
    }
  }
  instanced(G.tile, new THREE.MeshLambertMaterial({ color: 0xffffff }), tiles);
  instanced(G.cyl, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees);
  instanced(G.cone, new THREE.MeshLambertMaterial({ color: 0xffffff }), crowns);
  buildHome();
  addBuilding(TOWN.smith, 0x5a5560, 0x3a3440);
  world.add(mesh(G.box, mat(0x7a7a84), 0.8, 2.5, 0.8, 22.4, 4.7, 5.2));
  world.add(mesh(G.sph, mat(0xff8a3a, 1), 0.35, 0.35, 0.35, 22.4, 6.1, 5.2));
  world.add(mesh(G.box, mat(0x3a3a44), 0.9, 0.5, 0.45, 18.4, 0.6, 11.2), mesh(G.box, mat(0x4a3424), 0.5, 0.35, 0.4, 18.4, 0.18, 11.2));
  addBuilding(TOWN.alch, 0x6a5a7a, 0x3a6a4a);
  world.add(mesh(G.cyl, mat(0x2a2a30), 0.9, 0.6, 0.9, 30.4, 0.3, 11.2), mesh(G.disc, mat(0x7aff6a, 1), 0.38, 1, 0.38, 30.4, 0.62, 11.2));
  addBuilding(TOWN.trader, 0x9a7a52, 0x8a5a3a, { north: true });
  for (let k = 0; k < 5; k++) world.add(mesh(G.box, mat(k % 2 ? 0xd8c8a8 : 0xb04a3a), 1.1, 0.08, 1.2, 32 + k * 1.1, 2.0, 20.6));
  // well
  world.add(mesh(G.cyl, mat(0x8a8a90), 2, 0.8, 2, 22, 0.4, 17), mesh(G.disc, mat(0x2a4a6a), 0.8, 1, 0.8, 22, 0.7, 17));
  world.add(mesh(G.box, mat(0x6a4a32), 0.12, 1.8, 0.12, 21.1, 1.2, 17), mesh(G.box, mat(0x6a4a32), 0.12, 1.8, 0.12, 22.9, 1.2, 17), mesh(G.box, mat(0x6a4a32), 2.1, 0.12, 0.12, 22, 2.1, 17));
  // lamp posts
  for (const [x, z] of [[6, 14], [16, 14], [27, 14], [38, 14], [19, 24], [25, 24], [19, 30], [25, 30]]) {
    world.add(mesh(G.cyl, mat(0x3a3a44), 0.12, 2.4, 0.12, x, 1.2, z), mesh(G.box, mat(0xffd68a, 1), 0.3, 0.35, 0.3, x, 2.5, z));
  }
  // the delve gate
  world.add(mesh(G.box, mat(0x6a6a74), 2, 3.6, 2, 19, 1.8, 33), mesh(G.box, mat(0x6a6a74), 2, 3.6, 2, 25, 1.8, 33));
  world.add(mesh(G.box, mat(0x5a5a64), 8.4, 1, 2, 22, 4.1, 33));
  world.add(mesh(G.box, mat(0x050508), 4, 0.05, 2, 22, 0.02, 33));
  const vortex = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0x8a5aff, transparent: true, opacity: 0.35, depthWrite: false }));
  vortex.scale.set(1.8, 1, 0.9); vortex.position.set(22, 0.05, 33); vortex.userData.spin = 1; world.add(vortex); levelDisp.push(vortex.material);
  // townsfolk
  const npc = (x, z, c, a) => { const cr = makeCreature('grunt', c, 0x1a1a1a); cr.g.position.set(x, 0, z); cr.g.rotation.y = a; cr.mats.forEach((m) => levelDisp.push(m)); world.add(cr.g); };
  npc(19.2, 11.6, 0x8a6a5a, 0.3); npc(31.4, 11.6, 0x6a5a8a, -0.3); npc(33.2, 19.4, 0xa07a4a, Math.PI);
  vortex.userData.live = 1;
  bakeStatic(world);
}

// ================= interactables =================
const interacts = [];
function addInteract(o) { interacts.push(o); if (o.label) addLabel(o.label, o.x, o.ly || 3.2, o.z, o.cls || 'npc', o); return o; }
