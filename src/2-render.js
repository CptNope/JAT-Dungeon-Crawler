// ================= settings =================
const SET_KEY = 'hearthdeep.settings.v1';
const SET = (() => { const d = { cam: 'top', q: 'high', sens: 1, music: true, shake: true }; try { return Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (err) { return d; } })();
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (err) { /* storage unavailable */ } }

// ================= renderer, scene, camera =================
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false; // several render() calls per frame (scene + post); reset once per frame in the loop
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 260);
camera.rotation.order = 'YXZ';
scene.add(camera); // camera carries the first-person viewmodel
const CAM_OFF = new THREE.Vector3(0, 19.5, 10.8);
let camZoom = 1;
const hemi = new THREE.HemisphereLight(0xffffff, 0x303040, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd6a0, 3);
sun.shadow.camera.left = -22; sun.shadow.camera.right = 22; sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
sun.shadow.normalBias = 0.03; sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
const torch = new THREE.PointLight(0xffc27a, 0, 16, 2); // the delver's lantern
torch.shadow.normalBias = 0.04; torch.shadow.bias = -0.002; torch.shadow.camera.near = 0.2;
scene.add(torch);
const torchPool = []; // a few wall torches near the player get real lights, reassigned as you move
for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa04a, 0, 9, 2); scene.add(l); torchPool.push(l); }
let world = new THREE.Group(); scene.add(world);
const fxGroup = new THREE.Group(); scene.add(fxGroup);
let levelDisp = [];
let elapsed = 0; // seconds, drives shader time

// ================= quality tiers =================
// threejs-performance: shadows and post passes are the costly parts; keep light counts stable and only change them here.
const QUAL = {
  high: { post: true, msaa: 4, bloom: 5, sunShadow: 2048, torchShadow: true, pool: 4, ratioCap: 2 },
  medium: { post: true, msaa: 2, bloom: 4, sunShadow: 1024, torchShadow: false, pool: 2, ratioCap: 1.5 },
  low: { post: false, msaa: 0, bloom: 0, sunShadow: 0, torchShadow: false, pool: 0, ratioCap: 1 },
};
let Q = QUAL[SET.q] || QUAL.high;
function applyQuality() {
  Q = QUAL[SET.q] || QUAL.high;
  sun.castShadow = Q.sunShadow > 0 && !!LV && LV.type === 'town';
  if (Q.sunShadow) { sun.shadow.mapSize.set(Q.sunShadow, Q.sunShadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  torch.castShadow = Q.torchShadow && !!LV && LV.type === 'dungeon';
  torch.shadow.mapSize.set(512, 512);
  torchPool.forEach((l, i) => { l.visible = i < Q.pool; });
  Post.setup();
}

// ================= post-processing: HDR, bloom, grade =================
// Scene renders linear HDR into a multisampled half-float target; a soft-threshold bright pass feeds a
// mip chain of separable blurs; one composite pass adds bloom, grades, vignettes, then tone maps to sRGB.
const Post = (() => {
  const fsGeo = new THREE.BufferGeometry();
  fsGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  fsGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(fsGeo); quad.frustumCulled = false;
  const fsScene = new THREE.Scene(); fsScene.add(quad);
  const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const opt = { depthTest: false, depthWrite: false };
  const bright = new THREE.ShaderMaterial({ ...opt, uniforms: { tDiffuse: { value: null }, uThreshold: { value: 1.0 }, uKnee: { value: 0.5 } }, vertexShader: vs, fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = max(c.r, max(c.g, c.b));
      float s = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
      float w = max(s, l - uThreshold) / max(l, 1e-4); gl_FragColor = vec4(min(c * w, vec3(30.0)), 1.0); }` });
  const blur = new THREE.ShaderMaterial({ ...opt, uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: vs, fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270270;
      c += texture2D(tDiffuse, vUv + uDir * 1.3846153).rgb * 0.3162162; c += texture2D(tDiffuse, vUv - uDir * 1.3846153).rgb * 0.3162162;
      c += texture2D(tDiffuse, vUv + uDir * 3.2307692).rgb * 0.0702702; c += texture2D(tDiffuse, vUv - uDir * 3.2307692).rgb * 0.0702702;
      gl_FragColor = vec4(c, 1.0); }` });
  const comp = new THREE.ShaderMaterial({ ...opt, uniforms: {
      tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, tB4: { value: null },
      uStrength: { value: 0.9 }, uVig: { value: 0.35 }, uTime: { value: 0 }, uShadow: { value: new THREE.Vector3(0.92, 0.97, 1.08) }, uHigh: { value: new THREE.Vector3(1.05, 1.0, 0.93) }, uSat: { value: 1.08 }, uLevels: { value: 5 },
    }, vertexShader: vs, fragmentShader: `
    uniform sampler2D tScene, tB0, tB1, tB2, tB3, tB4; uniform float uStrength, uVig, uTime, uSat, uLevels; uniform vec3 uShadow, uHigh; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb;
      vec3 b = texture2D(tB0, vUv).rgb * 0.30 + texture2D(tB1, vUv).rgb * 0.26;
      if (uLevels > 2.5) b += texture2D(tB2, vUv).rgb * 0.20;
      if (uLevels > 3.5) b += texture2D(tB3, vUv).rgb * 0.14;
      if (uLevels > 4.5) b += texture2D(tB4, vUv).rgb * 0.10;
      c += b * uStrength;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c *= mix(uShadow, uHigh, smoothstep(0.02, 0.5, l));
      vec2 d = vUv - 0.5; c *= 1.0 - uVig * smoothstep(0.25, 0.85, length(d * vec2(1.25, 1.0)));
      c += (hash(vUv * 913.0 + uTime) - 0.5) * 0.012;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
  let rt = null, mips = [], W = 0, H = 0, on = false;
  const mk = (w, h, samples) => new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type: THREE.HalfFloatType, samples: samples || 0, depthBuffer: !!samples || samples === 0 && false });
  function dispose() { if (rt) rt.dispose(); for (const m of mips) { m.a.dispose(); m.b.dispose(); } rt = null; mips = []; }
  function setup() {
    dispose();
    on = Q.post;
    if (!on) return;
    const pr = renderer.getPixelRatio(); W = Math.floor(window.innerWidth * pr); H = Math.floor(window.innerHeight * pr);
    rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: Q.msaa, depthBuffer: true });
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < Q.bloom; i++) { mips.push({ a: mk(w, h), b: mk(w, h), w, h }); w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
    comp.uniforms.uLevels.value = Q.bloom;
  }
  function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
  function render() {
    if (!on || !rt) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    bright.uniforms.tDiffuse.value = rt.texture; pass(bright, mips[0].a);
    for (let i = 0; i < mips.length; i++) {
      const m = mips[i];
      blur.uniforms.tDiffuse.value = i === 0 ? m.a.texture : mips[i - 1].a.texture;
      blur.uniforms.uDir.value.set(1 / m.w, 0); pass(blur, m.b);
      blur.uniforms.tDiffuse.value = m.b.texture; blur.uniforms.uDir.value.set(0, 1 / m.h); pass(blur, m.a);
    }
    comp.uniforms.tScene.value = rt.texture;
    for (let i = 0; i < 5; i++) comp.uniforms['tB' + i].value = (mips[Math.min(i, mips.length - 1)]).a.texture;
    comp.uniforms.uTime.value = elapsed % 100;
    pass(comp, null);
  }
  function grade(shadow, high, sat, vig, strength, threshold) {
    comp.uniforms.uShadow.value.set(...shadow); comp.uniforms.uHigh.value.set(...high);
    comp.uniforms.uSat.value = sat; comp.uniforms.uVig.value = vig; comp.uniforms.uStrength.value = strength;
    bright.uniforms.uThreshold.value = threshold;
  }
  return { setup, render, grade, get on() { return on; } };
})();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camZoom = w < h ? 1.05 : 1;
  updateFov();
  Post.setup();
}
let camBaseFov = 45, fovKick = 0;
function updateFov() {
  const portrait = window.innerWidth < window.innerHeight;
  camBaseFov = SET.cam === 'first' ? (portrait ? 80 : 72) : SET.cam === 'third' ? (portrait ? 72 : 62) : (portrait ? 60 : 45);
  camera.fov = camBaseFov + fovKick;
  camera.near = SET.cam === 'first' ? 0.05 : 0.1;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ================= geometry & helpers =================
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 16, 12),
  lsph: new THREE.SphereGeometry(0.5, 8, 6),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  taper: new THREE.CylinderGeometry(0.32, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  ico1: new THREE.IcosahedronGeometry(0.5, 1),
  dodec: new THREE.DodecahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.05, 6, 20, Math.PI),
  ring: new THREE.RingGeometry(0.88, 1, 48),
  disc: new THREE.CircleGeometry(1, 48),
  plane: new THREE.PlaneGeometry(1, 1),
  fullTorus: new THREE.TorusGeometry(1, 0.09, 10, 40),
};
G.tile = new THREE.PlaneGeometry(1, 1); G.tile.rotateX(-Math.PI / 2);
G.ring.rotateX(-Math.PI / 2);
G.disc.rotateX(-Math.PI / 2);
G.tuft = (() => { // three crossed blades, bottom at y=0
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const p = new THREE.PlaneGeometry(0.08, 0.42, 1, 2); p.translate(0, 0.21, 0);
    const pos = p.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.4) pos.setX(i, pos.getX(i) * 0.1);
    p.rotateY(k * Math.PI / 3); p.rotateZ((k - 1) * 0.18); parts.push(p);
  }
  return mergeGeos(parts);
})();
function gableRoof(w, d, h) { // ridge along z, centered, base at y=0
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return g.toNonIndexed ? g : g;
}
const _mc = new Map();
function mat(c, glow) { // shared materials; glow > 0 makes an unlit HDR emitter that blooms
  const k = c + '|' + (glow || 0);
  if (!_mc.has(k)) {
    let m;
    if (glow) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(glow) }); }
    else m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0 });
    _mc.set(k, m);
  }
  return _mc.get(k);
}
const _metal = new Map();
function metal(c, rough) { const k = c + '|' + rough; if (!_metal.has(k)) _metal.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough ?? 0.35, metalness: 0.9 })); return _metal.get(k); }
function mesh(geo, m, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.scale.set(sx, sy, sz); o.position.set(x || 0, y || 0, z || 0);
  return o;
}

// ================= geometry merging (draw-call reduction) =================
// Each Mesh is one draw call: static parts sharing a material are baked into one geometry. Limb tags
// (aLimb, aPivot) ride along so merged creatures can still swing arms and legs in the vertex shader.
function mergeGeos(list) {
  let nv = 0, ni = 0; let limbs = false;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; if (g.attributes.aLimb) limbs = true; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const lb = limbs ? new Float32Array(nv) : null, pv = limbs ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (limbs && g.attributes.aLimb) { lb.set(g.attributes.aLimb.array, vo); pv.set(g.attributes.aPivot.array, vo * 3); }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io++] = a[i] + vo; }
    else for (let i = 0; i < c; i++) idx[io++] = i + vo;
    vo += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (limbs) { out.setAttribute('aLimb', new THREE.BufferAttribute(lb, 1)); out.setAttribute('aPivot', new THREE.BufferAttribute(pv, 3)); }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
function bakeByMaterial(root, skip) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), m = new THREE.Matrix4(), pv = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || (skip && skip(o))) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.live) return;
    if (o.material.transparent) return;
    const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m);
    if (o.userData.limb) {
      const n = g.attributes.position.count;
      g.setAttribute('aLimb', new THREE.BufferAttribute(new Float32Array(n).fill(o.userData.limb), 1));
      const a = new Float32Array(n * 3); pv.copy(o.userData.pivot);
      for (let i = 0; i < n; i++) { a[i * 3] = pv.x; a[i * 3 + 1] = pv.y; a[i * 3 + 2] = pv.z; }
      g.setAttribute('aPivot', new THREE.BufferAttribute(a, 3));
    }
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = [];
  for (const [material, geos] of buckets) {
    if (geos.some((g) => g.attributes.aLimb)) for (const g of geos) if (!g.attributes.aLimb) { const n = g.attributes.position.count; g.setAttribute('aLimb', new THREE.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aPivot', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); }
    out.push({ material, geometry: mergeGeos(geos) }); for (const g of geos) g.dispose();
  }
  return out;
}
function bakeStatic(root, skip, opts = {}) {
  const baked = bakeByMaterial(root, skip);
  const keep = [];
  root.traverse((o) => { if (o !== root && (o.isInstancedMesh || o.isPoints || o.userData.live || (o.isMesh && (o.material.transparent || (skip && skip(o)))))) keep.push(o); });
  const keepTop = keep.filter((o) => !keep.some((k) => k !== o && isAncestor(k, o)));
  for (const k of keepTop) { const wm = k.matrixWorld.clone(); k.parent.remove(k); k.matrix.copy(wm); k.matrix.decompose(k.position, k.quaternion, k.scale); }
  while (root.children.length) root.remove(root.children[0]);
  for (const b of baked) {
    const me = new THREE.Mesh(b.geometry, b.material);
    me.matrixAutoUpdate = false; me.updateMatrix();
    me.castShadow = opts.cast !== false && !(b.material.isMeshBasicMaterial); me.receiveShadow = true;
    root.add(me); levelDisp.push(b.geometry);
  }
  for (const k of keepTop) root.add(k);
  return baked.length;
}
function isAncestor(a, b) { for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; }

// ================= procedural textures =================
// Generated once at boot into DataTextures: tileable value noise, flagstones, bricks, cobbles, grass,
// planks, shingles and plaster, each with a normal map derived from its height field.
const TEX = (() => {
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967295; };
  function vnoise(x, y, p, s) { // tileable with period p
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = (a) => ((a % p) + p) % p;
    const a = hash(m(xi), m(yi), s), b = hash(m(xi + 1), m(yi), s), c = hash(m(xi), m(yi + 1), s), d = hash(m(xi + 1), m(yi + 1), s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, p, s, oct) { let t = 0, amp = 0.5, f = 1; for (let o = 0; o < oct; o++) { t += vnoise(x * f, y * f, p * f, s + o) * amp; amp *= 0.5; f *= 2; } return t; }
  function build(size, fn, normalStrength) {
    const col = new Uint8Array(size * size * 4), hgt = new Float32Array(size * size);
    const out = [0, 0, 0, 0];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      fn(x / size, y / size, out);
      const i = y * size + x;
      col[i * 4] = clamp(out[0] * 255, 0, 255); col[i * 4 + 1] = clamp(out[1] * 255, 0, 255); col[i * 4 + 2] = clamp(out[2] * 255, 0, 255); col[i * 4 + 3] = 255;
      hgt[i] = out[3];
    }
    const nrm = new Uint8Array(size * size * 4);
    const H = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * normalStrength, dy = (H(x, y + 1) - H(x, y - 1)) * normalStrength;
      const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      nrm[i] = (-dx / l * 0.5 + 0.5) * 255; nrm[i + 1] = (dy / l * 0.5 + 0.5) * 255; nrm[i + 2] = (1 / l * 0.5 + 0.5) * 255; nrm[i + 3] = 255;
    }
    const mk = (data, srgb) => { const t = new THREE.DataTexture(data, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
    return { map: mk(col, true), normal: mk(nrm, false) };
  }
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // running-bond blocks: rows, blocks per row, mortar width, bevel
  function blocks(u, v, rows, per, mortar, bevel, seed, jitter) {
    const r = Math.floor(v * rows), off = (r % 2) * 0.5 + (jitter ? hash(r, 7, seed) * 0.3 : 0);
    const uu = u * per + off, c = Math.floor(uu), fx = uu - c, fy = v * rows - r;
    const e = Math.min(fx, 1 - fx) / per * rows, ey = Math.min(fy, 1 - fy); // edge distance in row units
    const d = Math.min(e, ey);
    return { id: hash(((c % per) + per) % per, r, seed), h: sm(mortar, mortar + bevel, d), d };
  }
  const T = {};
  T.flag = build(512, (u, v, o) => {
    const b = blocks(u, v, 4, 3, 0.03, 0.08, 11, true);
    const n = fbm(u * 8, v * 8, 8, 3, 4), g = fbm(u * 32, v * 32, 32, 5, 2);
    const base = 0.5 + b.id * 0.22 + (n - 0.5) * 0.35 + (g - 0.5) * 0.12;
    const mortar = 0.18 + n * 0.1;
    const t = b.h; const c = mortar + (base - mortar) * t;
    o[0] = c * 1.02; o[1] = c * 0.98; o[2] = c * 0.94; o[3] = t * 0.8 + n * 0.25 + g * 0.06;
  }, 3.2);
  T.brick = build(512, (u, v, o) => {
    const b = blocks(u, v, 8, 4, 0.06, 0.1, 23, false);
    const n = fbm(u * 16, v * 16, 16, 7, 3), g = fbm(u * 64, v * 64, 64, 9, 2);
    const base = 0.48 + b.id * 0.2 + (n - 0.5) * 0.3 + (g - 0.5) * 0.12;
    const t = b.h, c = 0.22 + (base - 0.22) * t;
    o[0] = c * 1.03; o[1] = c * 0.97; o[2] = c * 0.92; o[3] = t * 0.9 + n * 0.2 + g * 0.08;
  }, 3.5);
  // voronoi cobbles
  const pts = []; { const n = 7; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pts.push([(i + 0.15 + hash(i, j, 3) * 0.7) / n, (j + 0.15 + hash(i, j, 4) * 0.7) / n, hash(i, j, 5)]); }
  T.cobble = build(512, (u, v, o) => {
    let f1 = 9, f2 = 9, id = 0;
    for (const p of pts) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const dx = u - (p[0] + ox), dy = v - (p[1] + oy), d = dx * dx + dy * dy;
      if (d < f1) { f2 = f1; f1 = d; id = p[2]; } else if (d < f2) f2 = d;
    }
    const e = Math.sqrt(f2) - Math.sqrt(f1);
    const t = sm(0.004, 0.05, e), n = fbm(u * 16, v * 16, 16, 13, 3);
    const c = 0.25 + (0.5 + id * 0.25 + (n - 0.5) * 0.25 - 0.25) * t;
    o[0] = c * 1.05; o[1] = c; o[2] = c * 0.9; o[3] = t * (0.6 + 0.4 * sm(0, 0.12, e)) + n * 0.15;
  }, 3.0);
  T.grass = build(256, (u, v, o) => {
    const n = fbm(u * 6, v * 6, 6, 31, 4), g = fbm(u * 48, v * 48, 48, 33, 2), s = vnoise(u * 96, v * 24, 96, 35);
    const c = 0.45 + (n - 0.5) * 0.4 + (g - 0.5) * 0.25 + (s - 0.5) * 0.15;
    o[0] = c * 0.62; o[1] = c * 1.0; o[2] = c * 0.42; o[3] = g * 0.6 + s * 0.4;
  }, 1.5);
  T.wood = build(256, (u, v, o) => {
    const p = Math.floor(u * 4), fx = u * 4 - p, edge = sm(0.0, 0.06, Math.min(fx, 1 - fx));
    const gr = vnoise(u * 40 + p * 13, v * 3, 40, 41 + p) * 0.6 + vnoise(u * 90, v * 6, 90, 43) * 0.4;
    const c = (0.45 + hash(p, 1, 47) * 0.15 + (gr - 0.5) * 0.3) * (0.55 + 0.45 * edge);
    o[0] = c * 1.15; o[1] = c * 0.9; o[2] = c * 0.65; o[3] = edge * 0.7 + gr * 0.3;
  }, 2.2);
  T.shingle = build(256, (u, v, o) => {
    const b = blocks(u, v, 8, 6, 0.02, 0.02, 51, true);
    const fy = v * 8 - Math.floor(v * 8), n = fbm(u * 16, v * 16, 16, 53, 3);
    const t = b.h * (0.55 + 0.45 * fy);
    const c = (0.4 + b.id * 0.25 + (n - 0.5) * 0.2) * (0.5 + 0.5 * t);
    o[0] = c; o[1] = c; o[2] = c; o[3] = t + n * 0.1;
  }, 2.5);
  T.plaster = build(256, (u, v, o) => {
    const n = fbm(u * 8, v * 8, 8, 61, 5), g = vnoise(u * 64, v * 64, 64, 63);
    const c = 0.78 + (n - 0.5) * 0.22 + (g - 0.5) * 0.06;
    o[0] = c; o[1] = c * 0.97; o[2] = c * 0.92; o[3] = n * 0.7 + g * 0.3;
  }, 1.2);
  // soft round sprite for particles, blob shadows and glows
  T.soft = (() => { const s = 64, d = new Uint8Array(s * s * 4); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const r = Math.hypot(x - s / 2 + 0.5, y - s / 2 + 0.5) / (s / 2); const a = Math.pow(clamp(1 - r, 0, 1), 1.6); const i = (y * s + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255; } const t = new THREE.DataTexture(d, s, s); t.needsUpdate = true; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; return t; })();
  return T;
})();

// ================= materials =================
// World surfaces take UVs from world position, so bricks and flagstones run seamlessly across tiles and
// stay the same size however tall the walls are. Walls darken toward their base as cheap occlusion.
function worldMat(tex, color, kind, scale, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), roughness: o.rough ?? 0.88, metalness: 0 });
  const ao = kind === 'wall' ? (o.ao ?? 0.45) : 1;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying float vHdY;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      vec4 hdW = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        hdW = instanceMatrix * hdW;
      #endif
      hdW = modelMatrix * hdW;
      vec3 hdN = abs(objectNormal);
      vec2 hdUV = ${kind === 'floor' ? 'hdW.xz' : '(hdN.y > 0.6 ? hdW.xz : (hdN.x > hdN.z ? vec2(hdW.z, hdW.y) : hdW.xy))'} * ${scale.toFixed(3)};
      #ifdef USE_MAP
        vMapUv = hdUV;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = hdUV;
      #endif
      vHdY = hdW.y;`);
    sh.fragmentShader = 'varying float vHdY;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= mix(${ao.toFixed(2)}, 1.0, smoothstep(0.0, 1.2, vHdY));`);
  };
  m.customProgramCacheKey = () => `wuv-${kind}-${scale}-${ao}`;
  return m;
}
// Creature and hero materials: arms, legs and capes swing in the vertex shader, driven by per-entity
// uniforms, so a whole creature stays one merged geometry per material (two or three draw calls).
function limbU() { return { uWalk: { value: 0 }, uAmp: { value: 0 }, uArmR: { value: 0 }, uArmL: { value: 0 }, uArmRY: { value: 0 }, uRim: { value: new THREE.Color(0, 0, 0) } }; }
function limbMat(color, o = {}, u) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.72, metalness: o.metal ?? 0.05 });
  if (o.map) { m.map = o.map; }
  if (o.nmap) { m.normalMap = o.nmap; m.normalScale.set(o.ns ?? 0.7, o.ns ?? 0.7); }
  u = u || limbU();
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    // rim light: a fresnel glow on silhouettes keeps characters readable against dark rooms
    sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float hdF = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      totalEmissiveRadiance += uRim * hdF * hdF * hdF * 2.2;`);
    sh.vertexShader = 'attribute float aLimb;\nattribute vec3 aPivot;\nuniform float uWalk, uAmp, uArmR, uArmL, uArmRY;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float hdA = 0.0; float hdS0 = sin(uWalk);
        if (aLimb > 0.5) {
          if (aLimb < 1.5) hdA = hdS0 * uAmp;
          else if (aLimb < 2.5) hdA = -hdS0 * uAmp;
          else if (aLimb < 3.5) hdA = abs(uArmL) > 0.001 ? uArmL : -hdS0 * uAmp * 0.7;
          else if (aLimb < 4.5) hdA = abs(uArmR) > 0.001 ? uArmR : hdS0 * uAmp * 0.7;
          else hdA = 0.12 + uAmp * 0.55 + sin(uWalk * 0.5) * 0.06;
        }
        float hdC = cos(hdA), hdSn = sin(hdA);
        // the weapon arm can also swing sideways (yaw after pitch, matching an Euler 'YXZ' on the CPU)
        float hdY = (aLimb > 3.5 && aLimb < 4.5) ? uArmRY : 0.0; float hdYC = cos(hdY), hdYS = sin(hdY);
        objectNormal = vec3(objectNormal.x, objectNormal.y * hdC - objectNormal.z * hdSn, objectNormal.y * hdSn + objectNormal.z * hdC);
        objectNormal = vec3(objectNormal.x * hdYC + objectNormal.z * hdYS, objectNormal.y, -objectNormal.x * hdYS + objectNormal.z * hdYC);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aLimb > 0.5) { vec3 hdP = transformed - aPivot; hdP = vec3(hdP.x, hdP.y * hdC - hdP.z * hdSn, hdP.y * hdSn + hdP.z * hdC);
          transformed = aPivot + vec3(hdP.x * hdYC + hdP.z * hdYS, hdP.y, -hdP.x * hdYS + hdP.z * hdYC); }`);
  };
  m.customProgramCacheKey = () => 'hd-limb' + (o.map ? '-m' : '') + (o.nmap ? '-n' : '');
  return m;
}
// the same arm angle on the CPU, for weapons held in an animated hand
function armAngle(u, right) { const s = Math.sin(u.uWalk.value); const a = right ? u.uArmR.value : u.uArmL.value; return Math.abs(a) > 0.001 ? a : (right ? s : -s) * u.uAmp.value * 0.7; }

// ================= sky & environment lighting =================
const sky = (() => {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color(0x4a78b0) }, uHor: { value: new THREE.Color(0xf3c48a) }, uLow: { value: new THREE.Color(0x6b7a5a) }, uSun: { value: new THREE.Vector3(-0.6, 0.35, 0.7).normalize() }, uSunCol: { value: new THREE.Color(0xffd8a0) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uHor, uLow, uSun, uSunCol; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(uHor, uTop, pow(smoothstep(0.0, 0.6, h), 0.7)) : mix(uHor, uLow, smoothstep(0.0, 0.15, -h));
        float s = max(dot(d, uSun), 0.0); c += uSunCol * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.35);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const o = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), m); o.frustumCulled = false; o.renderOrder = -10;
  return o;
})();
const pmrem = new THREE.PMREMGenerator(renderer);
let envTex = null;
function makeEnv(top, hor, low, glow) { // a blurred gradient room: soft image-based light for metals and armour
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 24, 12);
  const cols = []; const pos = geo.attributes.position; const a = new THREE.Color(top), b = new THREE.Color(hor), c = new THREE.Color(low), t = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; t.copy(y > 0 ? b : b).lerp(y > 0 ? a : c, Math.min(1, Math.abs(y) * 1.6)); cols.push(t.r, t.g, t.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  if (glow) { const g = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(4) })); g.position.set(-6, 5, 5); s.add(g); }
  if (envTex) envTex.dispose();
  envTex = pmrem.fromScene(s, 0.04).texture;
  s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  scene.environment = envTex;
}

// ================= GPU particles =================
// Bursts: one Points object, CPU-simulated, one draw call. Ambient motes and torch flames animate entirely
// in the vertex shader from a time uniform (no per-particle CPU work, no buffer uploads).
const PN = 420;
const burstSys = (() => {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(PN * 3), col = new Float32Array(PN * 3), size = new Float32Array(PN);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uScale: { value: 400 }, tSoft: { value: TEX.soft } },
    vertexShader: 'attribute float aSize; uniform float uScale; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D tSoft; varying vec3 vC; void main(){ float a = texture2D(tSoft, gl_PointCoord).a; gl_FragColor = vec4(vC * a, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false;
  return { pts, pos, col, size, g, vx: new Float32Array(PN), vy: new Float32Array(PN), vz: new Float32Array(PN), life: new Float32Array(PN), max: new Float32Array(PN), s0: new Float32Array(PN), grav: new Float32Array(PN) };
})();
fxGroup.add(burstSys.pts);
let burstIdx = 0;
const _bc = new THREE.Color();
function burst(x, y, z, color, n, spd, size, glow) {
  const B = burstSys; _bc.set(color).multiplyScalar(glow || 1.6);
  for (let k = 0; k < n; k++) {
    const i = burstIdx = (burstIdx + 1) % PN;
    B.pos[i * 3] = x; B.pos[i * 3 + 1] = y; B.pos[i * 3 + 2] = z;
    B.col[i * 3] = _bc.r; B.col[i * 3 + 1] = _bc.g; B.col[i * 3 + 2] = _bc.b;
    const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * (spd || 4);
    B.vx[i] = Math.sin(a) * v; B.vz[i] = Math.cos(a) * v; B.vy[i] = rand(1, 4.5);
    B.life[i] = B.max[i] = rand(0.35, 0.75); B.s0[i] = (size || 0.12) * rand(2.2, 3.6); B.grav[i] = 10;
  }
}
function updParts(dt) {
  const B = burstSys;
  for (let i = 0; i < PN; i++) {
    if (B.life[i] <= 0) { B.size[i] = 0; continue; }
    B.life[i] -= dt;
    B.vy[i] -= B.grav[i] * dt;
    B.pos[i * 3] += B.vx[i] * dt; B.pos[i * 3 + 1] = Math.max(0.05, B.pos[i * 3 + 1] + B.vy[i] * dt); B.pos[i * 3 + 2] += B.vz[i] * dt;
    B.vx[i] *= 1 - dt * 2; B.vz[i] *= 1 - dt * 2;
    B.size[i] = B.s0[i] * Math.max(0, B.life[i] / B.max[i]);
  }
  B.g.attributes.position.needsUpdate = true; B.g.attributes.color.needsUpdate = true; B.g.attributes.aSize.needsUpdate = true;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]; l.t -= dt;
    l.o.material.opacity = Math.max(0, l.t / l.max);
    if (l.t <= 0) { fxGroup.remove(l.o); l.o.geometry.dispose(); l.o.material.dispose(); lines.splice(i, 1); }
  }
}
// Ambient motes around the camera target: dust, spores, embers, snow, void sparks, pollen
const ambientSys = (() => {
  const N = 700, g = new THREE.BufferGeometry(), seed = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) seed[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(36, 7, 36) }, uVel: { value: new THREE.Vector3(0, 0.3, 0) }, uColor: { value: new THREE.Color(1, 1, 1) }, uSize: { value: 0.12 }, uScale: { value: 400 }, uWobble: { value: 0.4 }, tSoft: { value: TEX.soft } },
    vertexShader: `attribute vec3 aSeed; uniform float uTime, uSize, uScale, uWobble; uniform vec3 uCenter, uBox, uVel; varying float vA;
      void main(){
        vec3 p = aSeed * uBox + uVel * uTime * (0.6 + aSeed.y * 0.8);
        p.x += sin(uTime * 0.7 + aSeed.y * 31.0) * uWobble; p.z += cos(uTime * 0.6 + aSeed.x * 23.0) * uWobble;
        vec3 o = uCenter - uBox * 0.5; o.y = 0.0;
        p = o + mod(p - o, uBox);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = (0.45 + 0.55 * sin(uTime * 2.3 + aSeed.z * 40.0)) * smoothstep(0.0, 1.0, p.y) * smoothstep(uBox.y, uBox.y - 1.5, p.y);
        gl_PointSize = uSize * (0.6 + aSeed.z) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform sampler2D tSoft; uniform vec3 uColor; varying float vA; void main(){ float a = texture2D(tSoft, gl_PointCoord).a * vA; gl_FragColor = vec4(uColor * a, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false;
  return { pts, m };
})();
scene.add(ambientSys.pts);
const AMBIENT = {
  town: { col: 0xffe2a0, glow: 1.6, vel: [0.15, 0.08, 0.1], size: 0.09, wobble: 0.6, box: 7 },
  crypt: { col: 0xcfc6e8, glow: 0.9, vel: [0.05, -0.05, 0.02], size: 0.07, wobble: 0.3, box: 6 },
  fungal: { col: 0xc6ff7a, glow: 2.2, vel: [0.04, 0.12, 0.03], size: 0.11, wobble: 0.5, box: 6 },
  magma: { col: 0xff8a2a, glow: 4.5, vel: [0.1, 0.9, 0.05], size: 0.09, wobble: 0.35, box: 7 },
  frost: { col: 0xe8f4ff, glow: 1.2, vel: [0.25, -0.7, 0.1], size: 0.12, wobble: 0.5, box: 7 },
  void: { col: 0xd08cff, glow: 3.5, vel: [0.0, 0.18, 0.0], size: 0.1, wobble: 1.0, box: 6 },
};
function setAmbient(key) {
  const a = AMBIENT[key], u = ambientSys.m.uniforms;
  u.uColor.value.set(a.col).multiplyScalar(a.glow); u.uVel.value.set(...a.vel); u.uSize.value = a.size; u.uWobble.value = a.wobble; u.uBox.value.y = a.box;
}
// Torch flames: one Points object for every torch on the floor
const flameMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color(1, 0.6, 0.25) }, tSoft: { value: TEX.soft } },
  vertexShader: `attribute float aSeed; uniform float uTime, uScale; varying float vT;
    void main(){ float t = fract(uTime * (1.4 + aSeed * 0.8) + aSeed * 7.0); vT = t;
      vec3 p = position + vec3(sin(aSeed * 50.0 + uTime * 9.0) * 0.05 * (1.0 - t), t * 0.5, cos(aSeed * 70.0 + uTime * 7.0) * 0.05 * (1.0 - t));
      vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (0.34 * (1.0 - t * 0.85)) * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: 'uniform sampler2D tSoft; uniform vec3 uCol; varying float vT; void main(){ float a = texture2D(tSoft, gl_PointCoord).a * (1.0 - vT); vec3 c = mix(vec3(4.0, 3.2, 1.8), uCol * 2.5, smoothstep(0.0, 0.5, vT)); gl_FragColor = vec4(c * a, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
});
function makeFlames(list, fm) { // list of {x,y,z}; fm: a flame material other than the biome's torch flame
  fm = fm || flameMat; if (!FLAME_MATS.includes(fm)) FLAME_MATS.push(fm);
  const per = 7, g = new THREE.BufferGeometry(), pos = new Float32Array(list.length * per * 3), seed = new Float32Array(list.length * per);
  list.forEach((f, i) => { for (let k = 0; k < per; k++) { const j = i * per + k; pos[j * 3] = f.x; pos[j * 3 + 1] = f.y; pos[j * 3 + 2] = f.z; seed[j] = Math.random(); } });
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const p = new THREE.Points(g, fm); p.frustumCulled = false; levelDisp.push(g);
  return p;
}
// Contact shadows: one instanced quad under every character on screen
const blobs = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: TEX.soft, transparent: true, opacity: 0.55, depthWrite: false });
  const im = new THREE.InstancedMesh(G.tile, m, 140); im.count = 0; im.frustumCulled = false; im.renderOrder = 1;
  return im;
})();
fxGroup.add(blobs);
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bs = new THREE.Vector3(), _bp = new THREE.Vector3();
function updBlobs() {
  let n = 0;
  const put = (x, z, r) => { if (n >= 140) return; _bp.set(x, 0.025, z); _bs.set(r * 2.6, 1, r * 2.6); _bm.compose(_bp, _bq, _bs); blobs.setMatrixAt(n++, _bm); };
  if (P.mesh && P.mesh.visible && SET.cam !== 'first') put(P.x, P.z, 0.42);
  for (const e of enemies) if (!e.dead && e.mesh && Math.abs(e.x - P.x) < 24 && Math.abs(e.z - P.z) < 24) put(e.x, e.z, e.r * (e.boss ? 0.9 : 1.1));
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
}
