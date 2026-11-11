// ================= creatures =================
// Templates are built once per kind from tagged parts (limb 1-2 legs, 3-4 arms, 5 cape), merged per
// material role, and shared; each creature gets its own two materials so it can flash, tint and walk.
const ROLE_BODY = new THREE.MeshStandardMaterial(), ROLE_DARK = new THREE.MeshStandardMaterial(), ROLE_EYE = new THREE.MeshBasicMaterial(), ROLE_GLOW = new THREE.MeshBasicMaterial();
const BONE = new THREE.MeshStandardMaterial({ color: 0xe6dcc2, roughness: 0.55 }), SOCKET = new THREE.MeshBasicMaterial({ color: 0x050407 });
const creatureCache = new Map();
function makeCreature(kind, color, eyeCol, opts = {}) {
  if (!creatureCache.has(kind)) {
    const t = buildCreatureTemplate(kind);
    const live = t.g.children.filter((c) => c.userData.float || c.userData.spin);
    for (const c of live) c.userData.live = 1;
    const parts = bakeByMaterial(t.g);
    creatureCache.set(kind, { parts, live: live.map((c) => ({ geo: c.geometry, pos: c.position.clone(), scale: c.scale.clone(), rot: c.rotation.clone(), ud: { ...c.userData } })), h: t.h });
  }
  const T = creatureCache.get(kind);
  const g = new THREE.Group();
  const u = limbU(); u.uWalk.value = rand(0, 6);
  // body takes a light grain map (brightened to compensate) and both take a bump map, so surfaces read as hide, cloth and iron
  const body = limbMat(new THREE.Color(color).multiplyScalar(1.22).getHex(), { rough: opts.rough ?? 0.7, metal: opts.metal ?? 0.05, map: TEX.plaster.map, nmap: TEX.plaster.normal, ns: 0.9 }, u);
  const dark = limbMat(new THREE.Color(color).multiplyScalar(0.45).getHex(), { rough: 0.5, metal: 0.4, nmap: TEX.brick.normal, ns: 0.35 }, u);
  const eye = mat(eyeCol || 0xffe08a, 3);
  const map = new Map([[ROLE_BODY, body], [ROLE_DARK, dark], [ROLE_EYE, eye], [ROLE_GLOW, mat(eyeCol || 0xb48cff, 3)]]);
  for (const p of T.parts) { const m = new THREE.Mesh(p.geometry, map.get(p.material) || p.material); m.castShadow = m.userData.cs = p.material === ROLE_BODY || p.material === ROLE_DARK; g.add(m); } // only the bulk casts shadows
  for (const l of T.live) { const o = new THREE.Mesh(l.geo, map.get(ROLE_GLOW)); o.position.copy(l.pos); o.scale.copy(l.scale); o.rotation.copy(l.rot); o.userData = { ...l.ud }; delete o.userData.live; g.add(o); }
  return { g, mats: [body, dark], h: T.h, u };
}
function buildCreatureTemplate(kind) {
  const g = new THREE.Group();
  const B = ROLE_BODY, D = ROLE_DARK, E = ROLE_EYE, W = BONE, K = ROLE_DARK; // sockets share the dark material: one less draw call per creature
  const P = (geo, m, sx, sy, sz, x, y, z, limb, pv, rot) => {
    const o = mesh(geo, m, sx, sy, sz, x, y, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    if (limb) { o.userData.limb = limb; o.userData.pivot = new THREE.Vector3(pv[0], pv[1], pv[2]); }
    g.add(o); return o;
  };
  const legs = (w, h, d, x, top, m) => { for (const s of [-1, 1]) { const L = s < 0 ? 1 : 2; P(G.box, m || D, w, h, d, s * x, top - h / 2, 0, L, [s * x, top, 0]); P(G.box, m || D, w * 1.1, 0.08, d * 1.35, s * x, 0.04, 0.04, L, [s * x, top, 0]); } };
  const arms = (w, h, x, top, m, hand) => { for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.box, m || B, w, h, w * 1.05, s * x, top - h / 2, 0, L, [s * x, top, 0]); if (hand) P(G.sph, hand, w * 1.1, w * 1.1, w * 1.1, s * x, top - h - 0.02, 0.02, L, [s * x, top, 0]); } };
  let h = 1.5, ey = 1.3, ez = 0.2, es = 0.08, ex = 0.09;
  switch (kind) {
    case 'villager':
      legs(0.16, 0.5, 0.18, 0.13, 0.54);
      P(G.taper, B, 0.6, 0.62, 0.42, 0, 0.86, 0);
      P(G.box, D, 0.46, 0.5, 0.06, 0, 0.72, 0.2);
      P(G.sph, B, 0.4, 0.42, 0.4, 0, 1.38, 0);
      P(G.sph, D, 0.44, 0.24, 0.44, 0, 1.52, -0.04);
      arms(0.13, 0.46, 0.35, 1.1, B, D);
      h = 1.75; ey = 1.4; ez = 0.18; es = 0.05; ex = 0.08;
      break;
    case 'grunt':
      legs(0.17, 0.52, 0.19, 0.14, 0.56);
      P(G.box, D, 0.48, 0.14, 0.32, 0, 0.6, 0);
      P(G.box, B, 0.52, 0.5, 0.32, 0, 0.92, 0);
      P(G.box, D, 0.56, 0.18, 0.36, 0, 1.08, 0);
      P(G.sph, B, 0.42, 0.44, 0.42, 0, 1.38, 0);
      P(G.box, D, 0.26, 0.1, 0.2, 0, 1.22, 0.07);
      for (let k = 0; k < 3; k++) P(G.box, D, 0.44, 0.035, 0.03, 0, 0.8 + k * 0.1, 0.165);
      P(G.box, W, 0.22, 0.08, 0.12, 0, 1.2, 0.17);
      P(G.box, K, 0.1, 0.07, 0.02, -0.09, 1.4, 0.205); P(G.box, K, 0.1, 0.07, 0.02, 0.09, 1.4, 0.205);
      P(G.sph, D, 0.3, 0.2, 0.34, -0.36, 1.18, 0); P(G.box, W, 0.1, 0.08, 0.04, 0, 0.6, 0.17);
      arms(0.14, 0.46, 0.37, 1.1, B, D);
      P(G.box, D, 0.06, 0.06, 0.8, 0.37, 0.62, 0.42, 4, [0.37, 1.1, 0]);
      P(G.box, D, 0.24, 0.05, 0.06, 0.37, 0.62, 0.06, 4, [0.37, 1.1, 0]);
      h = 1.65; ey = 1.4; ez = 0.21; es = 0.06;
      break;
    case 'brute':
      legs(0.3, 0.52, 0.32, 0.24, 0.55);
      P(G.box, B, 1.0, 0.72, 0.64, 0, 0.98, 0);
      P(G.sph, B, 0.86, 0.6, 0.7, 0, 0.72, 0.05);
      P(G.sph, D, 0.5, 0.5, 0.5, -0.58, 1.26, 0); P(G.sph, D, 0.5, 0.5, 0.5, 0.58, 1.26, 0);
      P(G.sph, B, 0.42, 0.4, 0.42, 0, 1.36, 0.24);
      P(G.cone4, D, 0.1, 0.26, 0.1, -0.16, 1.58, 0.22, 0, 0, [0, 0, 0.5]); P(G.cone4, D, 0.1, 0.26, 0.1, 0.16, 1.58, 0.22, 0, 0, [0, 0, -0.5]);
      P(G.cone, W, 0.07, 0.2, 0.07, -0.1, 1.28, 0.42, 0, 0, [0.3, 0, 0]); P(G.cone, W, 0.07, 0.2, 0.07, 0.1, 1.28, 0.42, 0, 0, [0.3, 0, 0]);
      P(G.box, D, 1.04, 0.14, 0.7, 0, 0.66, 0.02); P(G.box, W, 0.16, 0.16, 0.06, 0, 0.66, 0.38);
      for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.box, B, 0.26, 0.78, 0.28, s * 0.7, 0.84, 0.06, L, [s * 0.7, 1.22, 0.06]); P(G.sph, D, 0.34, 0.32, 0.34, s * 0.7, 0.4, 0.1, L, [s * 0.7, 1.22, 0.06]); for (let k = -1; k <= 1; k++) P(G.cone4, D, 0.06, 0.14, 0.06, s * 0.7 + k * 0.09, 0.42, 0.28, L, [s * 0.7, 1.22, 0.06], [1.5, 0, 0]); }
      h = 1.75; ey = 1.4; ez = 0.42; es = 0.09; ex = 0.1;
      break;
    case 'archer':
      legs(0.13, 0.55, 0.15, 0.11, 0.58);
      P(G.box, B, 0.4, 0.52, 0.26, 0, 0.88, 0);
      P(G.sph, B, 0.34, 0.36, 0.34, 0, 1.3, 0);
      P(G.cone, D, 0.48, 0.5, 0.48, 0, 1.48, -0.03);
      P(G.box, D, 0.5, 0.36, 0.08, 0, 0.98, -0.16);
      P(G.cyl, D, 0.1, 0.55, 0.1, -0.1, 1.0, -0.22, 0, 0, [0, 0, 0.3]);
      for (let k = 0; k < 3; k++) P(G.box, W, 0.03, 0.12, 0.06, -0.18 + k * 0.04, 1.32, -0.24, 0, 0, [0, 0, 0.3]);
      P(G.sph, K, 0.28, 0.22, 0.06, 0, 1.3, 0.15);
      P(G.box, D, 0.38, 0.06, 0.28, 0, 0.66, 0); P(G.box, W, 0.07, 0.07, 0.04, 0, 0.66, 0.14);
      arms(0.11, 0.44, 0.29, 1.08, B, D);
      { const b = P(G.torus, D, 0.75, 0.75, 0.75, -0.29, 0.62, 0.16, 3, [-0.29, 1.08, 0]); b.rotation.set(0, Math.PI / 2, Math.PI / 2); }
      h = 1.65; ey = 1.31; ez = 0.15; es = 0.06; ex = 0.07;
      break;
    case 'caster': {
      P(G.cone, B, 0.82, 1.12, 0.82, 0, 0.56, 0);
      P(G.box, D, 0.5, 0.08, 0.42, 0, 0.82, 0);
      P(G.sph, B, 0.34, 0.36, 0.34, 0, 1.27, 0);
      P(G.cone, D, 0.48, 0.62, 0.48, 0, 1.6, -0.02, 0, 0, [-0.15, 0, 0]);
      P(G.sph, K, 0.26, 0.24, 0.08, 0, 1.28, 0.13);
      P(G.cyl, D, 0.84, 0.06, 0.84, 0, 0.06, 0); P(G.cyl, D, 0.5, 0.1, 0.5, 0, 1.08, 0);
      for (let k = 0; k < 3; k++) P(G.box, D, 0.05, 0.05, 0.02, 0, 0.5 + k * 0.14, 0.27 - k * 0.04);
      for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.taper, B, 0.17, 0.44, 0.17, s * 0.3, 0.92, 0, L, [s * 0.3, 1.13, 0]); P(G.cyl, D, 0.2, 0.06, 0.2, s * 0.3, 0.72, 0, L, [s * 0.3, 1.13, 0]); P(G.sph, D, 0.11, 0.11, 0.11, s * 0.3, 0.66, 0.02, L, [s * 0.3, 1.13, 0]); }
      const orb = P(G.sph, ROLE_GLOW, 0.24, 0.24, 0.24, 0.42, 1.05, 0.34); orb.userData.float = 1;
      h = 1.8; ey = 1.29; ez = 0.17; es = 0.05; ex = 0.07;
      break;
    }
    case 'skitter':
      P(G.sph, B, 0.72, 0.42, 0.86, 0, 0.42, 0);
      P(G.sph, B, 0.38, 0.34, 0.36, 0, 0.5, 0.44);
      P(G.cone4, D, 0.06, 0.18, 0.06, -0.08, 0.38, 0.62, 0, 0, [1.4, 0, 0]); P(G.cone4, D, 0.06, 0.18, 0.06, 0.08, 0.38, 0.62, 0, 0, [1.4, 0, 0]);
      for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, z = ((k % 3) - 1) * 0.24, L = (k + (k < 3 ? 0 : 1)) % 2 ? 1 : 2; P(G.box, D, 0.48, 0.05, 0.05, s * 0.4, 0.26, z, L, [s * 0.2, 0.34, z], [0, 0, s * 0.5]); }
      for (const s of [-1, 1]) P(G.box, D, 0.5, 0.03, 0.42, s * 0.5, 0.62, -0.05, s < 0 ? 3 : 4, [s * 0.25, 0.6, -0.05], [0, 0, s * -0.35]);
      P(G.cone4, W, 0.04, 0.1, 0.04, -0.05, 0.38, 0.6, 0, 0, [3.0, 0, 0]); P(G.cone4, W, 0.04, 0.1, 0.04, 0.05, 0.38, 0.6, 0, 0, [3.0, 0, 0]);
      h = 0.85; ey = 0.56; ez = 0.58; es = 0.07; ex = 0.09;
      break;
    case 'bomber':
      P(G.sph, B, 1.08, 0.98, 1.08, 0, 0.66, 0);
      P(G.sph, D, 0.38, 0.32, 0.38, 0, 1.16, 0.18);
      for (let k = 0; k < 6; k++) P(G.sph, mat(0xffc24a, 3.5), 0.13, 0.13, 0.13, Math.sin(k * 1.7) * 0.5, 0.45 + (k % 3) * 0.2, Math.cos(k * 1.7) * 0.5);
      P(G.cyl, D, 1.1, 0.08, 1.1, 0, 0.66, 0); for (let k = 0; k < 8; k++) P(G.box, W, 0.03, 0.14, 0.03, Math.sin(k * 0.785) * 0.55, 0.66, Math.cos(k * 0.785) * 0.55);
      P(G.cyl, D, 0.08, 0.3, 0.08, 0, 1.3, 0); P(G.sph, mat(0xffd06a, 4), 0.1, 0.1, 0.1, 0, 1.47, 0);
      for (const s of [-1, 1]) { P(G.box, D, 0.2, 0.3, 0.22, s * 0.26, 0.15, 0, s < 0 ? 1 : 2, [s * 0.26, 0.3, 0]); P(G.box, D, 0.12, 0.3, 0.12, s * 0.52, 0.72, 0.05, s < 0 ? 3 : 4, [s * 0.52, 0.86, 0.05]); }
      h = 1.35; ey = 1.18; ez = 0.34;
      break;
    case 'summoner': {
      P(G.cone, B, 0.96, 1.48, 0.96, 0, 0.74, 0);
      P(G.sph, D, 0.32, 0.32, 0.32, -0.3, 1.32, 0); P(G.sph, D, 0.32, 0.32, 0.32, 0.3, 1.32, 0);
      P(G.sph, B, 0.38, 0.4, 0.38, 0, 1.57, 0);
      P(G.cone, D, 0.52, 0.66, 0.52, 0, 1.86, -0.04, 0, 0, [-0.12, 0, 0]);
      P(G.sph, K, 0.28, 0.26, 0.08, 0, 1.56, 0.15);
      for (let k = 0; k < 5; k++) P(G.cone4, W, 0.06, 0.26, 0.06, Math.sin(-0.9 + k * 0.45) * 0.36, 1.46, Math.cos(-0.9 + k * 0.45) * 0.36 - 0.12, 0, 0, [-0.5, 0, 0]);
      P(G.cyl, D, 0.66, 0.08, 0.66, 0, 0.98, 0); for (let k = 0; k < 4; k++) P(G.box, ROLE_GLOW, 0.06, 0.06, 0.02, -0.18 + k * 0.12, 0.98, 0.33);
      for (const s of [-1, 1]) P(G.taper, B, 0.16, 0.5, 0.16, s * 0.4, 1.1, 0.02, s < 0 ? 3 : 4, [s * 0.4, 1.34, 0.02]);
      P(G.cyl, D, 0.06, 2.0, 0.06, 0.46, 1.0, 0.16, 4, [0.4, 1.34, 0.02]);
      const gem = P(G.oct, ROLE_GLOW, 0.26, 0.36, 0.26, 0.46, 2.08, 0.16); gem.userData.spin = 1;
      h = 2.05; ey = 1.59; ez = 0.17; es = 0.06; ex = 0.07;
      break;
    }
    case 'warden':
      legs(0.22, 0.55, 0.24, 0.17, 0.58);
      P(G.box, B, 0.78, 0.64, 0.5, 0, 0.96, 0);
      P(G.box, D, 0.34, 0.2, 0.44, -0.5, 1.26, 0); P(G.box, D, 0.34, 0.2, 0.44, 0.5, 1.26, 0);
      P(G.box, B, 0.42, 0.46, 0.42, 0, 1.5, 0);
      P(G.box, D, 0.44, 0.06, 0.1, 0, 1.52, 0.2);
      P(G.cone4, D, 0.12, 0.36, 0.3, 0, 1.86, -0.02);
      for (let k = 0; k < 5; k++) P(G.box, ROLE_GLOW, 0.06, 0.08, 0.1, 0, 1.78 + k * 0.03, -0.1 - k * 0.07);
      P(G.oct, W, 0.18, 0.24, 0.06, 0, 1.0, 0.26);
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) P(G.sph, W, 0.05, 0.05, 0.05, s * 0.3, 0.8 + k * 0.28, 0.255);
      P(G.box, B, 0.18, 0.48, 0.2, -0.5, 0.94, 0, 3, [-0.5, 1.18, 0]);
      P(G.box, D, 0.08, 0.84, 0.64, -0.64, 0.88, 0.22, 3, [-0.5, 1.18, 0]);
      P(G.box, B, 0.18, 0.48, 0.2, 0.5, 0.94, 0, 4, [0.5, 1.18, 0]);
      P(G.cyl, D, 0.05, 0.62, 0.05, 0.5, 0.62, 0.3, 4, [0.5, 1.18, 0], [1.2, 0, 0]);
      P(G.dodec, D, 0.28, 0.28, 0.28, 0.5, 0.68, 0.58, 4, [0.5, 1.18, 0]);
      h = 1.9; ey = 1.52; ez = 0.26; es = 0.05; ex = 0.1;
      break;
    case 'hound': // four legs: diagonal pairs share a limb tag, so the walk cycle reads as a trot
      P(G.box, B, 0.46, 0.4, 0.92, 0, 0.62, -0.02);
      P(G.sph, B, 0.5, 0.46, 0.5, 0, 0.66, 0.36);
      P(G.box, D, 0.48, 0.12, 0.7, 0, 0.84, -0.08);
      P(G.sph, B, 0.36, 0.34, 0.4, 0, 0.92, 0.6);
      P(G.box, B, 0.2, 0.16, 0.26, 0, 0.86, 0.84); P(G.box, K, 0.08, 0.06, 0.04, 0, 0.9, 0.97);
      P(G.cone4, D, 0.1, 0.2, 0.06, -0.12, 1.12, 0.56, 0, 0, [0, 0, 0.3]); P(G.cone4, D, 0.1, 0.2, 0.06, 0.12, 1.12, 0.56, 0, 0, [0, 0, -0.3]);
      P(G.box, D, 0.36, 0.08, 0.1, 0, 0.74, 0.52); // collar
      P(G.box, B, 0.09, 0.09, 0.44, 0, 0.82, -0.62, 5, [0, 0.78, -0.46], [-0.6, 0, 0]); // tail
      for (const [x, z, L] of [[-0.15, 0.3, 1], [0.15, 0.3, 2], [-0.15, -0.32, 2], [0.15, -0.32, 1]]) { P(G.box, D, 0.12, 0.44, 0.13, x, 0.22, z, L, [x, 0.46, z]); P(G.box, D, 0.14, 0.06, 0.18, x, 0.03, z + 0.03, L, [x, 0.46, z]); }
      h = 1.15; ey = 0.98; ez = 0.76; es = 0.05; ex = 0.09;
      break;
    case 'leaper': // crouched, coiled back legs; leaps on its prey
      P(G.sph, B, 0.74, 0.5, 0.8, 0, 0.5, 0);
      P(G.sph, B, 0.48, 0.38, 0.44, 0, 0.66, 0.38);
      P(G.box, D, 0.5, 0.08, 0.5, 0, 0.74, -0.06);
      for (let k = 0; k < 4; k++) P(G.cone4, D, 0.08, 0.22, 0.08, 0, 0.78 - k * 0.02, 0.1 - k * 0.16, 0, 0, [-0.4, 0, 0]);
      P(G.box, K, 0.32, 0.06, 0.04, 0, 0.56, 0.6); P(G.cone4, W, 0.04, 0.1, 0.04, -0.08, 0.5, 0.6, 0, 0, [3.0, 0, 0]); P(G.cone4, W, 0.04, 0.1, 0.04, 0.08, 0.5, 0.6, 0, 0, [3.0, 0, 0]);
      for (const s of [-1, 1]) {
        const L = s < 0 ? 1 : 2;
        P(G.sph, D, 0.26, 0.44, 0.4, s * 0.34, 0.36, -0.22, L, [s * 0.34, 0.5, -0.2]);
        P(G.box, D, 0.16, 0.06, 0.36, s * 0.38, 0.04, -0.06, L, [s * 0.34, 0.5, -0.2]);
        P(G.box, B, 0.1, 0.34, 0.1, s * 0.24, 0.2, 0.32, s < 0 ? 3 : 4, [s * 0.24, 0.4, 0.32]);
      }
      h = 0.95; ey = 0.74; ez = 0.54; es = 0.07; ex = 0.12;
      break;
    case 'totem': { // a carved pillar that hums; does not move
      P(G.cyl, D, 0.9, 0.2, 0.9, 0, 0.1, 0);
      P(G.box, B, 0.6, 0.62, 0.6, 0, 0.5, 0);
      P(G.box, D, 0.7, 0.1, 0.7, 0, 0.84, 0);
      P(G.box, B, 0.52, 0.56, 0.52, 0, 1.16, 0);
      P(G.box, D, 0.62, 0.1, 0.62, 0, 1.48, 0);
      P(G.box, B, 0.46, 0.46, 0.46, 0, 1.76, 0);
      for (const y of [0.5, 1.16]) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P(G.box, ROLE_GLOW, 0.14, 0.18, 0.03, Math.sin(a) * 0.31, y, Math.cos(a) * 0.31, 0, 0, [0, a, 0]); }
      P(G.cone4, D, 0.42, 0.3, 0.42, 0, 2.14, 0);
      for (const s of [-1, 1]) P(G.cone4, W, 0.08, 0.32, 0.08, s * 0.32, 1.86, 0, 0, 0, [0, 0, -s * 0.9]);
      const crys = P(G.oct, ROLE_GLOW, 0.2, 0.32, 0.2, 0, 2.5, 0); crys.userData.spin = 1;
      h = 2.4; ey = 1.8; ez = 0.24; es = 0.07; ex = 0.11;
      break;
    }
  }
  P(G.sph, E, es, es, es, -ex, ey, ez); P(G.sph, E, es, es, es, ex, ey, ez);
  return { g, h };
}

// ================= weapons =================
const WMAT = {};
function wmats() {
  if (WMAT.steel) return WMAT;
  WMAT.steel = new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.95, roughness: 0.22 });
  WMAT.dark = new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.7, roughness: 0.45 });
  WMAT.gold = new THREE.MeshStandardMaterial({ color: 0xe0aa50, metalness: 1, roughness: 0.45 });
  WMAT.wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, metalness: 0, roughness: 0.7 });
  WMAT.leather = new THREE.MeshStandardMaterial({ color: 0x4a3020, metalness: 0, roughness: 0.8 });
  WMAT.string = new THREE.MeshStandardMaterial({ color: 0xeee6d0, roughness: 0.9 });
  return WMAT;
}
function weaponMesh(kind) { // points along +z from the grip at the origin
  const W = wmats(), g = new THREE.Group();
  const add = (geo, m, sx, sy, sz, x, y, z, rx) => { const o = mesh(geo, m, sx, sy, sz, x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  switch (kind) {
    case 'sword': add(G.box, W.steel, 0.09, 0.025, 0.92, 0, 0, 0.62); add(G.cone4, W.steel, 0.09, 0.14, 0.03, 0, 0, 1.13, Math.PI / 2); add(G.box, W.gold, 0.32, 0.06, 0.07, 0, 0, 0.15); add(G.cyl, W.leather, 0.05, 0.22, 0.05, 0, 0, 0.02, Math.PI / 2); add(G.sph, W.gold, 0.08, 0.08, 0.08, 0, 0, -0.1); break;
    case 'axe': add(G.cyl, W.wood, 0.06, 1.05, 0.06, 0, 0, 0.42, Math.PI / 2); add(G.box, W.steel, 0.04, 0.42, 0.3, 0, 0.16, 0.84); add(G.box, W.dark, 0.08, 0.1, 0.12, 0, 0, 0.84); break;
    case 'dagger': add(G.box, W.steel, 0.07, 0.022, 0.46, 0, 0, 0.34); add(G.cone4, W.steel, 0.07, 0.1, 0.022, 0, 0, 0.62, Math.PI / 2); add(G.box, W.gold, 0.2, 0.05, 0.05, 0, 0, 0.1); add(G.cyl, W.leather, 0.04, 0.16, 0.04, 0, 0, 0, Math.PI / 2); break;
    case 'spear': add(G.cyl, W.wood, 0.05, 1.9, 0.05, 0, 0, 0.62, Math.PI / 2); add(G.cone4, W.steel, 0.14, 0.38, 0.05, 0, 0, 1.73, Math.PI / 2); add(G.cyl, W.gold, 0.07, 0.08, 0.07, 0, 0, 1.52, Math.PI / 2); break;
    case 'hammer': add(G.cyl, W.wood, 0.07, 1.05, 0.07, 0, 0, 0.45, Math.PI / 2); add(G.box, W.dark, 0.44, 0.28, 0.28, 0, 0, 0.92); add(G.box, W.steel, 0.5, 0.18, 0.18, 0, 0, 0.92); break;
    case 'bow': { const b = add(G.torus, W.wood, 0.9, 0.9, 1.4, 0, 0, 0.15); b.rotation.set(0, Math.PI / 2, Math.PI / 2); add(G.box, W.string, 0.01, 0.88, 0.01, 0, 0, 0.15); add(G.cyl, W.leather, 0.06, 0.18, 0.06, 0, 0, 0.6); break; }
    case 'staff': add(G.cyl, W.wood, 0.06, 1.7, 0.06, 0, 0, 0.3, Math.PI / 2); add(G.torus, W.gold, 0.32, 0.32, 0.32, 0, 0, 1.15); const orb = add(G.sph, mat(0xa98cff, 4), 0.22, 0.22, 0.22, 0, 0, 1.2); orb.castShadow = false; break;
    default: break;
  }
  return g;
}

// ================= the delver =================
function makeHero() {
  const u = limbU(), C = clsOf(), ck = (S && S.cls) || 'warrior';
  const steel = limbMat(ck === 'warrior' ? 0x9aa4b2 : ck === 'ranger' ? 0x7a5a3e : ck === 'necro' ? 0x3a3c36 : 0x5a4a7a, { metal: ck === 'warrior' ? 0.75 : 0.1, rough: 0.55, nmap: TEX.plaster.normal, ns: 0.4 }, u), cloth = limbMat(C.col, { rough: 0.9, map: TEX.plaster.map, nmap: TEX.wood.normal, ns: 0.5 }, u), skin = limbMat(0xe2b48f, { rough: 0.6 }, u);
  const leather = limbMat(0x6a4630, { rough: 0.75, map: TEX.plaster.map, nmap: TEX.plaster.normal, ns: 0.8 }, u), hair = limbMat(0x2e2018, { rough: 0.9, nmap: TEX.wood.normal, ns: 0.8 }, u), gold = limbMat(0xe0aa50, { metal: 1, rough: 0.35 }, u);
  const g = new THREE.Group();
  const P = (geo, m, sx, sy, sz, x, y, z, limb, pv) => { const o = mesh(geo, m, sx, sy, sz, x, y, z); if (limb) { o.userData.limb = limb; o.userData.pivot = new THREE.Vector3(...pv); } g.add(o); return o; };
  for (const s of [-1, 1]) { const L = s < 0 ? 1 : 2, pv = [s * 0.13, 0.56, 0]; P(G.box, cloth, 0.17, 0.32, 0.19, s * 0.13, 0.4, 0, L, pv); P(G.box, leather, 0.19, 0.26, 0.21, s * 0.13, 0.13, 0.01, L, pv); P(G.box, leather, 0.2, 0.06, 0.28, s * 0.13, 0.03, 0.05, L, pv); }
  P(G.box, leather, 0.5, 0.12, 0.32, 0, 0.6, 0); P(G.box, gold, 0.1, 0.08, 0.04, 0, 0.6, 0.17);
  P(G.taper, steel, 0.56, 0.5, 0.36, 0, 0.9, 0);
  P(G.box, cloth, 0.36, 0.42, 0.04, 0, 0.62, 0.17);
  P(G.sph, steel, 0.3, 0.2, 0.34, -0.33, 1.12, 0); P(G.sph, steel, 0.3, 0.2, 0.34, 0.33, 1.12, 0);
  P(G.box, cloth, 0.5, 0.8, 0.04, 0, 0.7, -0.22, 5, [0, 1.12, -0.2]);
  P(G.cyl, skin, 0.16, 0.1, 0.16, 0, 1.2, 0);
  P(G.sph, skin, 0.38, 0.42, 0.38, 0, 1.42, 0.01);
  P(G.sph, hair, 0.42, 0.28, 0.42, 0, 1.55, -0.03);
  P(G.box, hair, 0.36, 0.22, 0.12, 0, 1.44, -0.16);
  P(G.box, mat(0x1a1410), 0.06, 0.05, 0.02, -0.08, 1.44, 0.19); P(G.box, mat(0x1a1410), 0.06, 0.05, 0.02, 0.08, 1.44, 0.19);
  for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4, pv = [s * 0.36, 1.1, 0]; P(G.box, cloth, 0.13, 0.28, 0.14, s * 0.36, 0.96, 0, L, pv); P(G.box, steel, 0.15, 0.22, 0.16, s * 0.36, 0.72, 0.01, L, pv); P(G.sph, leather, 0.13, 0.13, 0.13, s * 0.36, 0.6, 0.02, L, pv); }
  if (ck === 'mage') { P(G.cyl, cloth, 0.62, 0.05, 0.62, 0, 1.6, 0); P(G.cone, cloth, 0.4, 0.62, 0.4, 0, 1.92, -0.06); P(G.cyl, gold, 0.42, 0.06, 0.42, 0, 1.64, 0); P(G.box, cloth, 0.62, 0.7, 0.04, 0, 0.42, 0.1); }
  else if (ck === 'necro') {
    const bone = limbMat(0xd8d2bc, { rough: 0.7 }, u), glow = limbMat(0x7cff9a, { emissive: 2.2 }, u);
    P(G.sph, cloth, 0.48, 0.46, 0.48, 0, 1.48, -0.05); P(G.cone, cloth, 0.34, 0.36, 0.34, 0, 1.66, -0.2); // hood
    P(G.box, cloth, 0.6, 0.72, 0.05, 0, 0.42, 0.12); // long robe front
    for (const s of [-1, 1]) { P(G.sph, bone, 0.26, 0.2, 0.26, s * 0.36, 1.2, 0); for (let k = 0; k < 3; k++) P(G.cone, bone, 0.05, 0.16, 0.05, s * (0.3 + k * 0.06), 1.32, -0.02); } // bone pauldrons
    P(G.sph, bone, 0.13, 0.13, 0.13, 0.16, 0.6, 0.19); P(G.box, glow, 0.03, 0.02, 0.01, 0.13, 0.61, 0.255); P(G.box, glow, 0.03, 0.02, 0.01, 0.19, 0.61, 0.255); // skull at the belt
    P(G.box, glow, 0.07, 0.03, 0.02, -0.08, 1.44, 0.2); P(G.box, glow, 0.07, 0.03, 0.02, 0.08, 1.44, 0.2); // eyes glow under the hood
  }
  else if (ck === 'ranger') { P(G.sph, cloth, 0.46, 0.4, 0.46, 0, 1.5, -0.04); P(G.cone, cloth, 0.3, 0.3, 0.3, 0, 1.58, -0.24); P(G.cyl, leather, 0.14, 0.62, 0.14, 0.18, 1.0, -0.26); for (let k = 0; k < 3; k++) P(G.box, mat(0xeee6d0), 0.03, 0.14, 0.06, 0.14 + k * 0.04, 1.36, -0.26); }
  else { P(G.box, steel, 0.42, 0.14, 0.42, 0, 1.6, 0); P(G.box, cloth, 0.06, 0.24, 0.32, 0, 1.76, -0.02); }
  if (S) addGearLook(P, u, ck);
  const parts = bakeByMaterial(g);
  const out = new THREE.Group();
  for (const p of parts) { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = true; out.add(m); }
  const shoulder = new THREE.Group(); shoulder.rotation.order = 'YXZ'; shoulder.position.set(0.36, 1.1, 0); out.add(shoulder);
  const hand = new THREE.Group(); hand.position.set(0, -0.5, 0.03); hand.rotation.x = 0.5; shoulder.add(hand);
  return { g: out, hand, shoulder, u };
}
// first-person viewmodel: gauntlet and weapon held in front of the camera
const viewmodel = (() => {
  const g = new THREE.Group();
  const W = wmats();
  const arm = new THREE.Group();
  arm.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xb8c2cf, metalness: 0.85, roughness: 0.32 }), 0.12, 0.12, 0.4, 0, -0.03, 0.22));
  arm.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: 0x2f6f73, roughness: 0.85 }), 0.13, 0.13, 0.2, 0, -0.05, 0.48));
  arm.add(mesh(G.sph, W.leather, 0.12, 0.12, 0.12, 0, 0, 0.02));
  g.add(arm);
  const holder = new THREE.Group(); holder.scale.setScalar(0.72); g.add(holder);
  g.visible = false;
  camera.add(g);
  return { g, holder, kind: '' };
})();

// ================= level generation =================
let LV = null;
function tidx(x, z) { return Math.floor(z) * LV.w + Math.floor(x); }
// Themed rooms. Tile values: 0 rock, 1 floor, 3 furniture (solid, floor beneath), 5 chasm (no floor at all).
// Every theme keeps a walkable band along the room's edges, so corridors into the room stay connected.
const ROOM_THEMES = ['library', 'flooded', 'chasm', 'hall', 'tomb', 'vault', 'grove'];
function themeRooms(rooms, g, W, exitRoom) {
  const cands = rooms.slice(1).filter((r) => r !== exitRoom && r.w >= 7 && r.h >= 6);
  const n = Math.min(cands.length, randi(1, 3));
  for (let k = 0; k < n; k++) {
    const r = cands.splice(randi(0, cands.length - 1), 1)[0];
    const opts = ROOM_THEMES.filter((t) => (t !== 'chasm' && t !== 'hall') || (r.w >= 9 && r.h >= 8));
    r.theme = pick(opts);
    const at = (i, j) => g[j * W + i], set = (i, j, v) => { if (at(i, j) === 1) g[j * W + i] = v; };
    const x0 = r.x, y0 = r.y, x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
    if (r.theme === 'library') { // shelves against solid stretches of wall only, never across a doorway
      r.shelves = [];
      const wallAt = (i, j) => at(i, j) === 0;
      for (let i = x0 + 1; i < x1; i += 1) {
        if (i % 3 === 0) continue;
        if (wallAt(i, y0 - 1) && wallAt(i - 1, y0 - 1) && wallAt(i + 1, y0 - 1)) { set(i, y0, 3); r.shelves.push([i, y0, 0]); }
        if (wallAt(i, y1 + 1) && wallAt(i - 1, y1 + 1) && wallAt(i + 1, y1 + 1)) { set(i, y1, 3); r.shelves.push([i, y1, 2]); }
      }
      if (r.w >= 9) for (let j = y0 + 2; j < y1 - 1; j++) if (j % 2) { set(x0 + Math.floor(r.w / 2), j, 3); r.shelves.push([x0 + Math.floor(r.w / 2), j, 1]); }
    } else if (r.theme === 'chasm') { // a pit with a two-tile ledge round it and a cross of bridges
      const mx = x0 + Math.floor(r.w / 2) - 1, my = y0 + Math.floor(r.h / 2) - 1;
      for (let j = y0 + 2; j <= y1 - 2; j++) for (let i = x0 + 2; i <= x1 - 2; i++) if (i !== mx && i !== mx + 1 && j !== my && j !== my + 1) set(i, j, 5);
    } else if (r.theme === 'hall') { // rows of columns
      for (let j = y0 + 2; j <= y1 - 2; j += 3) for (let i = x0 + 2; i <= x1 - 2; i += 3) if (Math.abs(i + 0.5 - (x0 + r.w / 2)) > 1.2) set(i, j, 0);
    } else if (r.theme === 'vault') { // a treasury: three chests in a row, and one of them is hungry
      const cz = y0 + Math.floor(r.h / 2) + 0.5, cx = x0 + r.w / 2;
      r.chests = [-2.2, 0, 2.2].map((o) => [cx + o, cz]);
    } else if (r.theme === 'grove') { // a spring in a ring of stones, overgrown
      r.spring = [x0 + r.w / 2, y0 + r.h / 2];
    } else if (r.theme === 'tomb') { // stone coffins in the middle of the floor
      r.coffins = [];
      for (let j = y0 + 2; j <= y1 - 2; j += 3) for (let i = x0 + 2; i <= x1 - 3; i += 4) { set(i, j, 3); set(i + 1, j, 3); r.coffins.push([i + 1, j + 0.5]); }
    }
  }
}
function solid(i, j) { return i < 0 || j < 0 || i >= LV.w || j >= LV.h || LV.g[j * LV.w + i] !== 1; }
// rock, clutter and furniture stop a shot; an open chasm does not
function blocksShot(x, z) { const i = Math.floor(x), j = Math.floor(z); if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) return true; const v = LV.g[j * LV.w + i]; return v !== 1 && v !== 5; }
function walkable(x, z) { return !solid(Math.floor(x), Math.floor(z)); }

function genDungeon(depth) {
  const boss = depth % 5 === 0 && !(RUN && RUN.mode); // rifts and the Pit have no boss floors
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
  if (!boss) themeRooms(rooms, g, W, exitRoom);
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

