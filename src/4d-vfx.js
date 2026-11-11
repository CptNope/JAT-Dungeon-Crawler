// ================= spell effects, water and lava, spell light, gear on the hero =================
// Built on three.js shader patterns: ShaderMaterials end with the tone-mapping and colour-space chunks so
// colours match built-in materials, and water/lava extend MeshStandardMaterial with onBeforeCompile so they
// keep scene lighting and fog.

const FX_NOISE = `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
`;

// --- novas: a flat disc that draws an expanding front in one of four styles ---
const NOVA_KIND = { fire: 0, frost: 1, shock: 2, bone: 3, arcane: 4 };
function novaMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: new THREE.Color() }, uF: { value: 0 }, uKind: { value: 0 }, uSeed: { value: 0 }, uTime: U_TIME },
    vertexShader: 'varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCol; uniform float uF, uKind, uSeed, uTime; varying vec2 vP;
      ${FX_NOISE}
      void main() {
        float r = length(vP), a = atan(vP.y, vP.x), f = uF;
        float front = 0.25 + 0.75 * (1.0 - pow(1.0 - f, 2.4));
        float n = fbm(vec2(a * 3.0 + uSeed, r * 4.0 - uTime * 3.0));
        float w = 0.05 + 0.09 * (1.0 - f);
        float band = 0.0, core = 0.0;
        if (uKind < 0.5) { // fire: ragged flame tongues behind the front
          float edge = front + (n - 0.5) * 0.18;
          band = smoothstep(edge - w * 1.8, edge, r) * (1.0 - smoothstep(edge, edge + 0.03, r));
          band *= 0.4 + 0.9 * n; core = band * smoothstep(0.62, 0.9, n);
        } else if (uKind < 1.5) { // frost: a hard crystalline ring with star spikes
          float spikes = pow(abs(cos(a * 6.0 + uSeed)), 18.0) * 0.16;
          float edge = front + spikes;
          band = smoothstep(edge - w, edge, r) * (1.0 - smoothstep(edge, edge + 0.015, r));
          band += (1.0 - smoothstep(0.0, front, r)) * 0.18 * step(0.6, vn(vP * 9.0 + uSeed));
          core = band * 0.6;
        } else if (uKind < 2.5) { // shock: crackling arcs on the front
          float arcs = smoothstep(0.92, 1.0, vn(vec2(a * 9.0 + uSeed, uTime * 14.0)));
          band = (1.0 - smoothstep(0.0, 0.035 + arcs * 0.05, abs(r - front))) * (0.5 + arcs * 1.5);
          core = band * arcs;
        } else { // bone and arcane: a soft ring with drifting motes
          band = (1.0 - smoothstep(0.0, w, abs(r - front))) * (0.7 + 0.6 * n);
          core = band * 0.5 + step(0.97, h21(floor(vP * 18.0) + uSeed)) * (1.0 - smoothstep(0.0, front, r)) * 0.8;
        }
        float fade = 1.0 - smoothstep(0.45, 1.0, f);
        vec3 col = uCol * band + mix(uCol, vec3(1.0), 0.4) * core;
        gl_FragColor = vec4(col * fade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
const novas = [];
for (let i = 0; i < 6; i++) { const o = new THREE.Mesh(G.disc, novaMat()); o.visible = false; o.renderOrder = 5; o.frustumCulled = false; fxGroup.add(o); novas.push({ o, t: 0, T: 0.5, r: 3 }); }
let novaIdx = 0;
function novaFx(x, z, r, T, kind, color) {
  if (calm() && T < 0.3) return;
  if (!Q.post) { ringFx(x, z, r * 0.2, r, T * 0.8, color, 2.4); return; } // Low quality keeps the cheap flat ring
  const N = novas[novaIdx = (novaIdx + 1) % novas.length], u = N.o.material.uniforms;
  u.uCol.value.set(color).multiplyScalar(1.3); u.uKind.value = NOVA_KIND[kind] || 0; u.uSeed.value = rand(0, 100); u.uF.value = 0;
  N.o.position.set(x, 0.14, z); N.o.scale.setScalar(r); N.o.visible = true; Object.assign(N, { t: 0, T, r });
}

// --- lightning: a jagged double ribbon with forks, rebuilt as it flickers ---
const bolts = [];
const boltMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function boltGeo(ax, ay, az, bx, by, bz, jag, width) {
  const pts = [], n = Math.max(4, Math.round(Math.hypot(bx - ax, bz - az, by - ay) * 2.2));
  for (let i = 0; i <= n; i++) { const t = i / n, j = i && i < n ? jag : 0; pts.push([lerp(ax, bx, t) + rand(-j, j), lerp(ay, by, t) + rand(-j, j) * 0.6, lerp(az, bz, t) + rand(-j, j)]); }
  const pos = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0, z0] = pts[i], [x1, y1, z1] = pts[i + 1], w0 = width * (1 - i / n * 0.5), w1 = width * (1 - (i + 1) / n * 0.5);
    pos.push(x0 - w0, y0, z0, x1 - w1, y1, z1, x1 + w1, y1, z1, x0 - w0, y0, z0, x1 + w1, y1, z1, x0 + w0, y0, z0); // flat ribbon
    pos.push(x0, y0 - w0, z0, x1, y1 - w1, z1, x1, y1 + w1, z1, x0, y0 - w0, z0, x1, y1 + w1, z1, x0, y0 + w0, z0); // upright ribbon
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return { g, pts };
}
function boltFx(ax, ay, az, bx, by, bz, color, life) {
  const m = boltMat(color), core = boltMat(0xffffff), grp = new THREE.Group();
  const B = { grp, m, core, t: life || 0.24, T: life || 0.24, a: [ax, ay, az], b: [bx, by, bz], flick: 0 };
  rebuildBolt(B); fxGroup.add(grp); bolts.push(B);
  spellLight(bx, by + 0.5, bz, color, 5, 0.18);
}
function rebuildBolt(B) {
  for (const c of [...B.grp.children]) { c.geometry.dispose(); B.grp.remove(c); }
  const [ax, ay, az] = B.a, [bx, by, bz] = B.b, L = Math.hypot(bx - ax, bz - az);
  const main = boltGeo(ax, ay, az, bx, by, bz, Math.min(0.5, 0.12 + L * 0.04), 0.09);
  B.grp.add(new THREE.Mesh(main.g, B.m), new THREE.Mesh(boltGeo(ax, ay, az, bx, by, bz, 0.04, 0.025).g, B.core));
  for (let k = 0; k < 2; k++) { // forks
    const p = main.pts[randi(1, Math.max(1, main.pts.length - 2))];
    B.grp.add(new THREE.Mesh(boltGeo(p[0], p[1], p[2], p[0] + rand(-1.4, 1.4), p[1] - rand(0.2, 0.8), p[2] + rand(-1.4, 1.4), 0.15, 0.04).g, B.m));
  }
}
function updBolts(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const B = bolts[i]; B.t -= dt; B.flick -= dt;
    if (B.t <= 0) { for (const c of B.grp.children) c.geometry.dispose(); B.m.dispose(); B.core.dispose(); fxGroup.remove(B.grp); bolts.splice(i, 1); continue; }
    if (B.flick <= 0) { B.flick = 0.06; rebuildBolt(B); }
    const k = B.t / B.T; B.m.opacity = k; B.core.opacity = k;
  }
}

// --- ice spikes erupting from the ground, lit at the edges, melting away ---
const iceMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uCol: { value: new THREE.Color(0x9fdcff) } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalMatrix * mat3(instanceMatrix) * normal; gl_Position = projectionMatrix * mv; }',
  fragmentShader: `uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
    void main() { float fr = pow(1.0 - max(dot(normalize(vV), normalize(vN)), 0.0), 2.5);
      gl_FragColor = vec4(mix(uCol * 0.5, vec3(1.6, 1.9, 2.2), fr), 0.45 + fr * 0.5);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const ICE_N = 48, ice = new THREE.InstancedMesh(G.cone4, iceMat, ICE_N); ice.count = 0; ice.frustumCulled = false; ice.renderOrder = 3; fxGroup.add(ice);
const spikes = []; const _im = new THREE.Matrix4(), _iq = new THREE.Quaternion(), _ie = new THREE.Euler(), _is = new THREE.Vector3(), _ip = new THREE.Vector3();
function iceFx(x, z, r, n) {
  for (let k = 0; k < n; k++) {
    if (spikes.length >= ICE_N) spikes.shift();
    const a = rand(0, 6.28), d = Math.sqrt(Math.random()) * r;
    spikes.push({ x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, h: rand(0.5, 1.3) * (1 - d / (r + 0.5) * 0.5), w: rand(0.16, 0.3), rx: rand(-0.45, 0.45), rz: rand(-0.45, 0.45), ry: rand(0, 6), t: 0, T: rand(0.7, 1.0) });
  }
}
function updIce(dt) {
  for (let i = spikes.length - 1; i >= 0; i--) { spikes[i].t += dt; if (spikes[i].t >= spikes[i].T) spikes.splice(i, 1); }
  ice.count = spikes.length;
  spikes.forEach((s, i) => {
    const up = Math.min(1, s.t / 0.08), melt = Math.max(0, (s.t - s.T * 0.55) / (s.T * 0.45)), h = s.h * up * (1 - melt * 0.8);
    _ie.set(s.rx, s.ry, s.rz); _iq.setFromEuler(_ie); _is.set(s.w * (1 - melt * 0.5), Math.max(0.01, h), s.w * (1 - melt * 0.5)); _ip.set(s.x, h / 2 - melt * 0.2, s.z);
    _im.compose(_ip, _iq, _is); ice.setMatrixAt(i, _im);
  });
  ice.instanceMatrix.needsUpdate = true;
}

// --- spell light: two pooled point lights that flash where spells land (never added or removed, so no shader rebuilds) ---
const spellLights = spellPool.map((l) => ({ l, t: 0, T: 0.2, I: 0 }));
let slIdx = 0;
function spellLight(x, y, z, color, intensity, T) {
  if (!LV || LV.type !== 'dungeon' || Q.pool < 4) return;
  const S2 = spellLights[slIdx = (slIdx + 1) % spellLights.length];
  S2.l.color.set(color); S2.l.position.set(x, y, z); S2.l.distance = 9; Object.assign(S2, { t: T, T, I: intensity * (calm() ? 0.5 : 1) });
}
function updSpellLights(dt) { for (const S2 of spellLights) { if (S2.t <= 0) { S2.l.intensity = 0; continue; } S2.t -= dt; S2.l.intensity = S2.I * Math.max(0, S2.t / S2.T); } }

function updVfx(dt) {
  for (const N of novas) {
    if (!N.o.visible) continue;
    N.t += dt; const f = N.t / N.T;
    if (f >= 1) { N.o.visible = false; continue; }
    N.o.material.uniforms.uF.value = f;
  }
  updBolts(dt); updIce(dt); updSpellLights(dt);
}

// --- water and lava: standard materials with moving surfaces ---
function liquidMat(kind, B) {
  const lava = kind === 'lava';
  const m = new THREE.MeshStandardMaterial(lava
    ? { color: 0x2a1410, roughness: 0.8, metalness: 0, emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 1 }
    : { color: 0x3a8aa0, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.5, depthWrite: false, emissive: new THREE.Color(B ? B.torch : 0x5ab0c0).lerp(new THREE.Color(0x1a5a6a), 0.7).multiplyScalar(0.25) });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U_TIME;
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime; varying vec3 vWP;\n' + FX_NOISE + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec2 p = vWP.xz; float t = uTime;
          float dx = cos(p.x * 2.1 + t * 1.3) * 0.5 + cos((p.x + p.y) * 3.3 + t * 2.0) * 0.3;
          float dz = cos(p.y * 1.7 - t * 1.1) * 0.5 + cos((p.x + p.y) * 3.3 + t * 2.0) * 0.3;
          normal = normalize(normal + (viewMatrix * vec4(dx, 0.0, dz, 0.0)).xyz * ${lava ? '0.15' : '0.35'}); }`)
      .replace('#include <emissivemap_fragment>', lava
        ? `#include <emissivemap_fragment>
          { vec2 p = vWP.xz * 0.8; float n = fbm(p + vec2(uTime * 0.15, uTime * 0.08)); float c = fbm(p * 2.3 - uTime * 0.1);
            float crust = smoothstep(0.38, 0.52, c); float hot = (1.0 - crust) * (0.35 + 1.1 * n);
            totalEmissiveRadiance *= hot * 1.1; totalEmissiveRadiance += vec3(1.0, 0.8, 0.35) * pow(max(0.0, n - 0.6) * 2.2, 3.0) * (1.0 - crust) * 1.2;
            diffuseColor.rgb *= 0.4 + crust; }`
        : `#include <emissivemap_fragment>
          { vec2 p = vWP.xz * 1.6; float c = abs(sin(p.x * 1.7 + sin(p.y * 1.3 + uTime) * 1.4 + uTime * 0.7) * sin(p.y * 1.9 + sin(p.x * 1.1 - uTime * 0.8) * 1.4));
            totalEmissiveRadiance += vec3(0.35, 0.8, 0.85) * pow(c, 10.0) * 0.6;
            float fr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0); totalEmissiveRadiance += vec3(0.15, 0.3, 0.35) * fr; }`);
  };
  m.customProgramCacheKey = () => 'liquid-' + kind;
  return m;
}

// --- the hero wears their gear: crests, glowing trims and soles by rarity ---
function gearLook() { return SLOTS.map((s) => { const it = S.equip[s]; return it ? `${it.rarity}${it.set ? 's' : ''}${it.anc || 0}` : '-'; }).join('|'); }
function addGearLook(P2, u, ck) {
  const E = S.equip, col = (it) => (it.set ? 0x5fd38a : RCOL[it.rarity]);
  const glowM = (c, k) => limbMat(c, { emissive: k || 1.8 }, u);
  if (E.helm && E.helm.rarity >= 2 && ck !== 'necro') {
    const c = col(E.helm), m = glowM(c, E.helm.anc ? 3 : 1.6);
    if (E.helm.rarity >= 3) for (let k = 0; k < 5; k++) P2(G.cone4, m, 0.06, 0.24 - Math.abs(k - 2) * 0.04, 0.06, 0, 1.74 + (2 - Math.abs(k - 2)) * 0.03, -0.12 + k * 0.06); // crest
    else P2(G.box, m, 0.44, 0.04, 0.04, 0, 1.47, 0.2); // brow band
  }
  if (E.chest && E.chest.rarity >= 2) { const m = glowM(col(E.chest), E.chest.anc ? 1.4 : 0.7); P2(G.box, m, 0.58, 0.035, 0.38, 0, 0.66, 0); if (E.chest.rarity >= 3) for (const s of [-1, 1]) P2(G.box, m, 0.05, 0.03, 0.34, s * 0.46, 1.16, 0); }
  if (E.boots && E.boots.rarity >= 3) { const m = glowM(col(E.boots), 2.2); for (const s of [-1, 1]) { const L = s < 0 ? 1 : 2; P2(G.box, m, 0.21, 0.03, 0.3, s * 0.13, 0.005, 0.05, L, [s * 0.13, 0.56, 0]); } }
  if (E.amulet && E.amulet.rarity >= 3) P2(G.oct, glowM(col(E.amulet), 2.6), 0.08, 0.11, 0.05, 0, 1.0, 0.2);
  const anc = SLOTS.filter((s) => E[s] && E[s].anc).length;
  if (anc >= 3) P2(G.fullTorus, glowM(0xf19a33, 1.6), 0.2, 0.2, 0.2, 0, 1.6, -0.3); // a halo for the well-geared
}
