// ================= combat feel =================
// Hit-stop freezes the action for a few frames when a blow lands. Trauma-based shake: hits add trauma,
// trauma decays, and the camera moves by trauma squared so small hits barely register and big ones land.
let hitStop = 0, trauma = 0;
const shakeOff = new THREE.Vector3();
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function addHitStop(t) { if (calm()) return; hitStop = Math.max(hitStop, t); }
function shake(a) { if (SET.shake === false || calm()) return; trauma = Math.min(1, trauma + a); }
function applyShake(dt) {
  trauma = Math.max(0, trauma - dt * 1.8);
  const k = trauma * trauma * (REDUCED_MOTION ? 0.35 : 1);
  shakeOff.set(0, 0, 0);
  if (k <= 0.0001) return;
  const t = elapsed * 36;
  const n = (s) => Math.sin(t * (1 + s * 0.37) + s * 12.9) * 0.6 + Math.sin(t * (2.1 + s * 0.21) + s * 4.7) * 0.4;
  if (SET.cam === 'first') { camera.rotateZ(n(3) * 0.04 * k); camera.rotateX(n(4) * 0.03 * k); return; }
  const amp = SET.cam === 'top' ? 0.6 : 0.24;
  shakeOff.set(n(1) * amp * k, n(2) * amp * 0.6 * k, n(5) * amp * k);
  camera.position.add(shakeOff);
}

// ================= bodies that fall =================
// A slain foe flashes, topples away from the blow, lies still a moment, then sinks into the floor.
const corpses = [];
function addCorpse(e) {
  if (e.bar) { world.remove(e.bar); e.bar = null; }
  if (e.auraRing) { world.remove(e.auraRing); e.auraRing.material.dispose(); e.auraRing = null; }
  if (e.label) { removeLabel(e.label); e.label = null; }
  e.u.uAmp.value = 0; e.u.uArmR.value = -0.7; e.u.uArmL.value = -0.5; e.u.uArmRY.value = 0;
  e.mesh.scale.setScalar(e.scale);
  e.mats[0].emissive.setRGB(1.4, 1.2, 1.0);
  const ang = Math.atan2(e.lastNx || (e.x - P.x), e.lastNz || (e.z - P.z));
  corpses.push({ e, t: 0, ang, side: chance(0.5) ? -1 : 1, life: e.boss ? 6 : 2.6, x0: e.x, z0: e.z, dusted: false });
  while (corpses.length > 36) disposeCorpse(corpses.shift());
}
function disposeCorpse(c) { disposeEnemy(c.e); }
function clearCorpses() { for (const c of corpses) disposeCorpse(c); corpses.length = 0; }
function updCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i], e = c.e, m = e.mesh;
    c.t += dt;
    const f = clamp(c.t / (e.boss ? 0.9 : 0.42), 0, 1), fall = f * f;
    m.rotation.order = 'YXZ';
    m.rotation.y = e.face; m.rotation.x = -fall * 1.45; m.rotation.z = c.side * fall * 0.25;
    const slide = (1 - Math.pow(1 - f, 2)) * (e.boss ? 0.6 : 0.45);
    const sink = Math.max(0, c.t - (c.life - 0.9)) / 0.9;
    m.position.set(c.x0 + Math.sin(c.ang) * slide, fall * 0.12 * e.scale - sink * 1.1 * e.scale, c.z0 + Math.cos(c.ang) * slide);
    const fl = Math.max(0, 1 - c.t / 0.3); e.mats[0].emissive.setRGB(1.4 * fl, 1.2 * fl, 1.0 * fl);
    if (f >= 1 && !c.dusted) { c.dusted = true; burst(m.position.x, 0.15, m.position.z, 0x8a8070, e.boss ? 24 : 9, e.boss ? 5 : 2.5, e.boss ? 0.3 : 0.14, 0.7); }
    if (c.t >= c.life) { disposeCorpse(c); corpses.splice(i, 1); }
  }
}

// ================= weapon trail =================
// A ribbon between the blade's middle and tip, sampled every frame while a swing is live, fading by age.
const TRAIL_N = 24;
const WLEN = { sword: 1.15, axe: 0.98, dagger: 0.62, spear: 1.85, hammer: 1.02, staff: 1.2, bow: 0, fists: 0.25 };
const trail = (() => {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(TRAIL_N * 2 * 3), a = new Float32Array(TRAIL_N * 2);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aA', new THREE.BufferAttribute(a, 1).setUsage(THREE.DynamicDrawUsage));
  const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  g.setIndex(idx);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: { uCol: { value: new THREE.Color(2.2, 2.0, 1.6) } },
    vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol * vA, vA);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 5;
  const samples = []; for (let i = 0; i < TRAIL_N; i++) samples.push({ b: new THREE.Vector3(), t: new THREE.Vector3(), age: 99 });
  return { g, pos, a, m, mesh, samples, head: 0, count: 0 };
})();
fxGroup.add(trail.mesh);
const TRAIL_LIFE = 0.13;
function trailActive() { return (P.swingT > 0 && !curWeapon().ranged) || P.spinT > 0 || P.dashT > 0; }
function updTrail(dt) {
  const T = trail;
  for (const s of T.samples) s.age += dt;
  if (trailActive() && !P.dead) {
    const first = SET.cam === 'first', obj = first ? viewmodel.holder.children[0] : P.weapon, len = WLEN[ST.wk] ?? 1;
    if (obj && len > 0) {
      obj.updateWorldMatrix(true, false);
      const s = T.samples[T.head = (T.head + 1) % TRAIL_N];
      obj.localToWorld(s.b.set(0, 0, len * (first ? 0.3 : 0.38))); obj.localToWorld(s.t.set(0, 0, len * 1.02)); s.age = 0;
      const w = S.equip.weapon, rc = new THREE.Color(RCOL[w ? w.rarity : 0]);
      T.m.uniforms.uCol.value.setRGB(1, 0.94, 0.82).lerp(rc, 0.45).multiplyScalar(P.fin ? 3.2 : 2.3);
    }
  }
  // newest first; unused slots collapse onto the last live sample with zero alpha
  let n = 0, last = null;
  for (let k = 0; k < TRAIL_N; k++) {
    const s = T.samples[(T.head - k + TRAIL_N) % TRAIL_N];
    const live = s.age < TRAIL_LIFE;
    const src = live ? s : last; if (!src) continue;
    const al = live ? Math.pow(1 - s.age / TRAIL_LIFE, 1.5) : 0;
    T.pos.set([src.b.x, src.b.y, src.b.z, src.t.x, src.t.y, src.t.z], n * 6);
    T.a[n * 2] = al * 0.08; T.a[n * 2 + 1] = al * 0.9;
    if (live) last = s;
    n++;
  }
  T.mesh.visible = !!last;
  if (!last) return;
  for (let k = n; k < TRAIL_N; k++) { T.pos.copyWithin(k * 6, (n - 1) * 6, n * 6); T.a[k * 2] = T.a[k * 2 + 1] = 0; }
  T.g.attributes.position.needsUpdate = true; T.g.attributes.aA.needsUpdate = true;
}

// ================= shockwave rings =================
const rings = [];
for (let i = 0; i < 6; i++) {
  const o = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  o.visible = false; o.renderOrder = 4; fxGroup.add(o); rings.push({ o, t: 0, T: 0.3, r0: 0.4, r1: 3 });
}
let ringIdx = 0;
function ringFx(x, z, r0, r1, T, color, k) {
  const R = rings[ringIdx = (ringIdx + 1) % rings.length];
  R.o.material.color.set(color).multiplyScalar(k || 2.5); R.o.visible = true; R.o.position.set(x, 0.12, z);
  Object.assign(R, { t: 0, T, r0, r1 });
}
function updRings(dt) {
  for (const R of rings) {
    if (!R.o.visible) continue;
    R.t += dt; const f = R.t / R.T;
    if (f >= 1) { R.o.visible = false; continue; }
    R.o.scale.setScalar(lerp(R.r0, R.r1, 1 - Math.pow(1 - f, 2.2)));
    R.o.material.opacity = (1 - f) * 0.95;
  }
}

// ================= lock-on =================
// Tab locks the foe nearest your view (or nearest you, overhead); Tab again moves to the next, X releases.
let lockT = null;
const lockRing = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a4a).multiplyScalar(2.6), transparent: true, opacity: 0.85, depthWrite: false }));
lockRing.visible = false; lockRing.renderOrder = 4; fxGroup.add(lockRing);
function lockScore(e) {
  const d = Math.hypot(e.x - P.x, e.z - P.z);
  if (SET.cam === 'top') return d;
  return Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), CAM.yaw)) * 4 + d * 0.15;
}
function cycleLock() {
  if (!LV || LV.type !== 'dungeon' || P.dead) return;
  const c = enemies.filter((e) => !e.dead && Math.hypot(e.x - P.x, e.z - P.z) < 16 && (e.awake || los(P.x, P.z, e.x, e.z)));
  if (!c.length) { releaseLock(); toast('No foe in sight to lock on to.', 'var(--muted)'); return; }
  c.sort((a, b) => lockScore(a) - lockScore(b));
  if (!lockT) lockT = c[0];
  else { const i = c.indexOf(lockT); lockT = i < 0 ? c[0] : c[i + 1] || null; }
  if (!lockT) { releaseLock(); return; }
  sfx('lock'); updLock(0);
}
function releaseLock() { lockT = null; lockRing.visible = false; const m = $('#lockMark'); if (m) m.hidden = true; }
function updLock() {
  if (!lockT) return;
  if (lockT.dead || !lockT.mesh || LV.type !== 'dungeon' || Math.hypot(lockT.x - P.x, lockT.z - P.z) > 20) {
    const prev = lockT; let best = null, bd = 9;
    if (prev.dead) for (const e of enemies) { if (e.dead || !e.awake || e === prev) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
    if (!best) { releaseLock(); return; }
    lockT = best;
  }
  lockRing.visible = true;
  lockRing.position.set(lockT.x, 0.06, lockT.z);
  lockRing.scale.setScalar(lockT.r * 1.5 + 0.35 + Math.sin(elapsed * 6) * 0.05);
}
function updLockMark() {
  const m = $('#lockMark'); if (!m) return;
  if (!lockT || !lockT.mesh) { m.hidden = true; return; }
  const p = project(lockT.x, lockT.h * lockT.scale + 0.35, lockT.z);
  m.hidden = !p.ok;
  m.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-140%) rotate(45deg)`;
}
const lockAngle = () => (lockT ? Math.atan2(lockT.x - P.x, lockT.z - P.z) : null);

// ================= billboards and portals =================
const facers = []; // groups that turn to face the camera around the vertical axis
function updFacers() { for (const f of facers) f.rotation.y = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z); }
const PORTAL_MAT = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true,
  uniforms: { uTime: U_TIME, uA: { value: new THREE.Color(0.25, 0.5, 1.8) }, uB: { value: new THREE.Color(1.6, 2.4, 4.0) } },
  vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTime; uniform vec3 uA, uB; varying vec2 vP;
    void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
      float sw = sin(a * 4.0 - r * 10.0 + uTime * 3.2) * 0.5 + 0.5; float core = smoothstep(0.55, 0.0, r);
      float m = smoothstep(1.0, 0.82, r) * (0.3 + 0.7 * sw) + core * 0.6;
      vec3 c = mix(uA, uB, sw * (1.0 - r) + core);
      gl_FragColor = vec4(c * m, m);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const G_PORTAL = new THREE.CircleGeometry(1, 48);
