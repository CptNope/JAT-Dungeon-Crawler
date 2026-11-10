// ================= time of day =================
// The village keeps its own clock: a full day passes in six minutes, and each trip below moves it on.
const DAY_LEN = 360;
const sunOff = new THREE.Vector3(-26, 30, 22);
const TOD_KEYS = [ // t: 0 dawn, 0.2 day, 0.42 golden hour, 0.52 dusk, 0.62-0.88 night
  { t: 0.0, top: 0x5a78a8, hor: 0xf0b090, low: 0x5a6a52, sun: 0xffb080, si: 2.2, el: 0.3, hemi: 0.95, bg: 0xd8b8a0, night: 0.2 },
  { t: 0.2, top: 0x4a80c4, hor: 0xd2e2f0, low: 0x6b7a5a, sun: 0xfff0d8, si: 3.6, el: 1.0, hemi: 1.25, bg: 0xcfdcea, night: 0 },
  { t: 0.42, top: 0x4a78b0, hor: 0xf3c48a, low: 0x6b7a5a, sun: 0xffd2a0, si: 3.4, el: 0.72, hemi: 1.1, bg: 0xe2c8a0, night: 0 },
  { t: 0.52, top: 0x2a3a6a, hor: 0xe0866a, low: 0x3a3a3a, sun: 0xff8a5a, si: 1.5, el: 0.18, hemi: 0.75, bg: 0x8a6a78, night: 0.35 },
  { t: 0.62, top: 0x070b1c, hor: 0x1e2846, low: 0x10141c, sun: 0x8aa8ff, si: 0.5, el: 0.7, hemi: 0.32, bg: 0x161c34, night: 1 },
  { t: 0.88, top: 0x070b1c, hor: 0x1e2846, low: 0x10141c, sun: 0x8aa8ff, si: 0.5, el: 0.7, hemi: 0.32, bg: 0x161c34, night: 1 },
  { t: 1.0, top: 0x5a78a8, hor: 0xf0b090, low: 0x5a6a52, sun: 0xffb080, si: 2.2, el: 0.3, hemi: 0.95, bg: 0xd8b8a0, night: 0.2 },
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
const mixHex = (a, b, k, out) => out.set(_ca.setHex(a).lerp(_cb.setHex(b), k));
let nightK = 0, todT = 0;
const LAMPS = [[6, 14.2], [16, 14.2], [27, 14.2], [38, 14.2], [19, 24], [25, 24], [19.2, 29.6], [24.8, 29.6]];
function todPhase() { const t = ((S.tod || 0.42) % 1 + 1) % 1; return t; }
function weatherName() { return S.weather && WEATHER[S.weather] ? WEATHER[S.weather].n : ''; }
function todName() { const t = todPhase(); return t < 0.08 ? 'Dawn' : t < 0.36 ? 'Day' : t < 0.48 ? 'Golden hour' : t < 0.58 ? 'Dusk' : t < 0.94 ? 'Night' : 'Dawn'; }
function applyTimeOfDay(force) {
  if (!LV || LV.type !== 'town') return;
  const t = todPhase();
  let i = 0; while (i < TOD_KEYS.length - 2 && TOD_KEYS[i + 1].t <= t) i++;
  const A = TOD_KEYS[i], B = TOD_KEYS[i + 1], k = clamp((t - A.t) / (B.t - A.t || 1), 0, 1);
  const u = sky.material.uniforms;
  mixHex(A.top, B.top, k, u.uTop.value); mixHex(A.hor, B.hor, k, u.uHor.value); mixHex(A.low, B.low, k, u.uLow.value); mixHex(A.sun, B.sun, k, u.uSunCol.value);
  nightK = lerp(A.night, B.night, k);
  u.uNight.value = nightK;
  const el = lerp(A.el, B.el, k), az = 2.44 + (t - 0.42) * 2.6; // golden hour matches the old fixed sun (from the south-west)
  sunOff.set(Math.cos(az) * Math.cos(el) * 44, Math.sin(el) * 44 + 6, Math.sin(az) * Math.cos(el) * 44);
  u.uSun.value.copy(sunOff).normalize();
  if (nightK > 0.5) u.uSunCol.value.multiplyScalar(0.35); // a moon, not a sun
  mixHex(A.sun, B.sun, k, sun.color); sun.intensity = lerp(A.si, B.si, k);
  hemi.intensity = lerp(A.hemi, B.hemi, k);
  hemi.color.setHex(0xb8d0f0).lerp(_cb.setHex(0x4a5a9a), nightK);
  mixHex(A.bg, B.bg, k, scene.background);
  if (scene.fog) scene.fog.color.copy(scene.background);
  scene.environmentIntensity = lerp(0.55, 0.18, nightK);
  setAmbient(nightK > 0.55 ? 'night' : 'town');
  applyWeather();
  Post.grade([lerp(0.9, 0.78, nightK), lerp(0.96, 0.88, nightK), lerp(1.1, 1.3, nightK)], [lerp(1.06, 1.0, nightK), 1.0, lerp(0.9, 1.06, nightK)], lerp(1.12, 0.92, nightK), lerp(0.3, 0.5, nightK), 0.75, lerp(1.15, 1.0, nightK));
  if (force) todT = 0;
}
function updTimeOfDay(dt) {
  if (!LV || LV.type !== 'town') return;
  S.tod = ((S.tod || 0.42) + dt / DAY_LEN) % 1;
  todT -= dt; if (todT <= 0) { todT = 0.25; applyTimeOfDay(); }
  // after dark the lamp posts (and your lantern posts) get real lights, nearest first
  const lit = nightK > 0.25;
  if (lit) {
    const spots = LAMPS.concat(S.decor && S.decor.lanterns ? [[3.1, 5.2], [3.1, 9.6]] : []);
    const near = spots.map((s) => [s, (s[0] - P.x) ** 2 + (s[1] - P.z) ** 2]).sort((a, b) => a[1] - b[1]);
    torchPool.forEach((l, i) => {
      const s = i < Q.pool && near[i]; if (!s) { l.intensity = 0; return; }
      l.position.set(s[0][0], 2.4, s[0][1]); l.color.setHex(0xffb86a); l.distance = 11;
      l.intensity = 9 * clamp((nightK - 0.25) / 0.4, 0, 1) * (0.92 + 0.08 * Math.sin(elapsed * 9 + i));
    });
  } else for (const l of torchPool) l.intensity = 0;
}

// ================= villagers =================
const villagers = [];
const VNODES = [[5, 12.8], [12, 12.8], [20, 12.8], [24, 12.8], [32, 12.8], [38.5, 12.8], [19.4, 16.6], [24.6, 16.6], [21.5, 20.5], [21.5, 27.5], [35, 15.2], [35, 19.2], [20.5, 11.2], [32.5, 11.2], [8.5, 11.6]];
const VEDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [3, 7], [6, 8], [7, 8], [8, 9], [4, 10], [10, 11], [2, 12], [4, 13], [1, 14]];
const VFOLK = [
  ['Tomas the Miller', 0x8a6a4a], ['Hedda', 0xa04a5a], ['Old Fenn', 0x6a6a5a], ['Lisbet', 0x4a7a9a], ['Corwin', 0x5a8a4a], ['Mira', 0x9a6aaa],
];
function villagerLine() {
  const C = clsOf().n.toLowerCase();
  const lines = [
    'Mind the third stair down. It bites.', 'Orla has been hammering since before dawn.', 'Wick says the green draughts taste of feet. He is not wrong.',
    'They say the hole hums at night. I try not to listen.', 'My cousin went down to depth twelve. Came back with a hat.', 'Desh will buy anything. He bought my old boots twice.',
    `A ${C}! We have not had one of those in years.`, 'Elder Maren has work, if you have the stomach.', 'Do not drink from the well after dark.',
  ];
  if (S.best >= 5) lines.push(`Depth ${S.best}! Nobody has been that deep since the old days.`);
  if (S.bossKills) lines.push(`You felled ${S.slain.length ? S.slain[S.slain.length - 1].n : 'a horror'}? The whole village is talking.`);
  if (pet) lines.push(`Is that ${S.pet}? Who is a good ${S.home.kennel >= 3 ? 'wolf' : 'hound'}?`);
  if (S.home.house >= 3) lines.push('Your house is the finest in the valley now.');
  if (nightK > 0.5) lines.push('Late to be out. The deep is louder at night.', 'Look at the stars. You do not get those down there.');
  else lines.push('Lovely day for it. Whatever "it" is.');
  return pick(lines);
}
function spawnVillagers() {
  villagers.length = 0;
  VFOLK.forEach(([name, col], i) => {
    const cr = makeCreature('villager', col, 0x1a1a1a); cr.mats.forEach((m) => levelDisp.push(m));
    const n = (i * 5) % VNODES.length, [x, z] = VNODES[n];
    const v = { name, x, z, r: 0.35, face: rand(0, 6.28), mesh: cr.g, u: cr.u, h: cr.h, scale: 1, node: n, to: n, wait: rand(0, 4), talkT: 0, hideLabel: true, homebody: i % 2 === 1 };
    cr.g.position.set(x, 0, z); cr.u.uRim.value.setRGB(0.04, 0.04, 0.05);
    world.add(cr.g);
    v.label = addLabel('', x, 2, z, 'say', v);
    villagers.push(v);
  });
}
function updVillagers(dt) {
  if (!villagers.length) return;
  let talker = null, td = 2.6; // only the nearest villager speaks up
  for (const v of villagers) { const d = Math.hypot(P.x - v.x, P.z - v.z); if (v.mesh.visible && d < td) { td = d; talker = v; } }
  for (const v of villagers) {
    const gone = v.homebody && nightK > 0.6; // half the village goes in after dark
    v.mesh.visible = !gone;
    if (gone) { v.hideLabel = true; continue; }
    const pd = Math.hypot(P.x - v.x, P.z - v.z);
    let spd = 0;
    if (v === talker) { // stop for a word with you
      v.face += angDiff(Math.atan2(P.x - v.x, P.z - v.z), v.face) * Math.min(1, dt * 6);
      if (v.talkT <= 0) { v.label.el.textContent = `${v.name}: ${villagerLine()}`; v.talkT = 7; }
      v.hideLabel = false;
    } else {
      v.hideLabel = true;
      if (v.wait > 0) v.wait -= dt;
      else {
        const [tx, tz] = VNODES[v.to], dx = tx - v.x, dz = tz - v.z, d = Math.hypot(dx, dz);
        if (d < 0.15) {
          v.node = v.to;
          const opts = VEDGES.filter((e) => e[0] === v.node || e[1] === v.node).map((e) => (e[0] === v.node ? e[1] : e[0]));
          v.to = pick(opts); if (chance(0.45)) v.wait = rand(2, 7);
        } else { spd = 1.35; const st = Math.min(spd * dt, d); v.x += dx / d * st; v.z += dz / d * st; v.face += angDiff(Math.atan2(dx, dz), v.face) * Math.min(1, dt * 8); }
      }
    }
    v.talkT -= dt; if (pd > 4) v.talkT = Math.min(v.talkT, 0);
    v.mesh.position.set(v.x, spd ? Math.abs(Math.sin(v.u.uWalk.value)) * 0.04 : 0, v.z); v.mesh.rotation.y = v.face;
    v.u.uWalk.value += dt * 5.5 * (spd ? 1 : 0); v.u.uAmp.value = lerp(v.u.uAmp.value, spd ? 0.45 : 0, Math.min(1, dt * 6));
  }
}

// ================= home decorations =================
const DECOR = {
  lanterns: { n: 'Lantern Posts', cost: { gold: 300, iron: 4 }, d: 'Iron lanterns by the house. They light the yard after dark.' },
  flowers: { n: 'Flower Beds', cost: { gold: 220, herb: 6 }, d: 'Beds of colour along the front. The garden yields 2 more Bitterleaf each return.' },
  banners: { n: 'House Banners', cost: { gold: 450, chitin: 4 }, d: 'Banners in your colours either side of the door. +5% magic find.' },
  dummy: { n: 'Training Dummy', cost: { gold: 600, iron: 8 }, d: 'A straw opponent for idle afternoons. +5% experience.' },
  fountain: { n: 'Stone Fountain', cost: { gold: 1800, shard: 6 }, d: 'A fountain in the green below the house. +10% gold found.' },
  statue: { n: 'Hero Statue', cost: { gold: 4000, obsidian: 6, sigil: 1 }, d: 'You, in stone, looking braver than you felt. +3% damage.', need: () => S.bossKills >= 3, needT: 'Slay 3 bosses first' },
};
function buildDecor(grp) {
  const D = S.decor || {}, W = worldMats(), C = clsOf();
  if (D.lanterns) for (const [x, z] of [[3.1, 5.2], [3.1, 9.6]]) grp.add(mesh(G.cyl, W.iron, 0.1, 2.2, 0.1, x, 1.1, z), mesh(G.box, mat(0xffc878, 3.4), 0.22, 0.28, 0.22, x, 2.25, z), mesh(G.cone4, W.iron, 0.36, 0.18, 0.36, x, 2.5, z));
  if (D.flowers) for (const x0 of [4.6, 9.4]) {
    grp.add(mesh(G.box, W.soil, 2.2, 0.22, 0.6, x0 + 1.1, 0.11, 11.55));
    for (let k = 0; k < 7; k++) grp.add(mesh(G.ico, mat(pick([0xff7aa0, 0xffd24a, 0xffffff, 0xa07aff, 0xff9a4a]), 1.2), 0.18, 0.18, 0.18, x0 + 0.2 + k * 0.3, 0.32, 11.55 + rand(-0.15, 0.15)));
  }
  if (D.banners) for (const x of [6.7, 9.3]) {
    grp.add(mesh(G.cyl, W.iron, 0.06, 3, 0.06, x, 1.5, 11.5), mesh(G.box, W.iron, 0.8, 0.05, 0.05, x, 2.95, 11.5));
    grp.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: C.col, roughness: 0.9 }), 0.7, 1.3, 0.04, x, 2.25, 11.52), mesh(G.oct, mat(C.trim, 1.4), 0.22, 0.28, 0.05, x, 2.3, 11.56));
  }
  if (D.dummy) {
    const x = 14.6, z = 17.2;
    grp.add(mesh(G.cyl, W.timber, 0.12, 1.6, 0.12, x, 0.8, z), mesh(G.box, W.timber, 1.0, 0.1, 0.1, x, 1.25, z), mesh(G.sph, mat(0xd8c07a), 0.5, 0.62, 0.42, x, 1.2, z), mesh(G.sph, mat(0xd8c07a), 0.32, 0.34, 0.32, x, 1.72, z));
    markSolid(x, z);
  }
  if (D.fountain) {
    const x = 7, z = 18.6;
    grp.add(mesh(G.cyl, W.stone, 2.6, 0.5, 2.6, x, 0.25, z), mesh(G.disc, W.water, 1.1, 1, 1.1, x, 0.47, z), mesh(G.cyl, W.stone, 0.4, 1.4, 0.4, x, 0.9, z), mesh(G.cyl, W.stone, 1.0, 0.16, 1.0, x, 1.6, z), mesh(G.disc, W.water, 0.42, 1, 0.42, x, 1.69, z));
    for (const [i, j] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) markSolid(x + i + 0.5, z + j + 0.5);
  }
  if (D.statue) {
    const x = 11.6, z = 18.6, st = new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.8 });
    grp.add(mesh(G.box, W.stone, 1.5, 0.9, 1.5, x, 0.45, z), mesh(G.box, W.stone, 1.7, 0.12, 1.7, x, 0.96, z));
    grp.add(mesh(G.box, st, 0.26, 0.6, 0.3, x - 0.14, 1.32, z), mesh(G.box, st, 0.26, 0.6, 0.3, x + 0.14, 1.32, z), mesh(G.taper, st, 0.62, 0.6, 0.4, x, 1.92, z), mesh(G.sph, st, 0.38, 0.42, 0.38, x, 2.42, z));
    const arm = mesh(G.box, st, 0.14, 0.7, 0.16, x + 0.38, 2.22, z); arm.rotation.z = -2.6; grp.add(arm);
    const wp = mesh(G.box, st, 0.1, 1.2, 0.05, x + 0.62, 2.9, z); wp.rotation.z = -0.4; grp.add(wp);
    markSolid(x, z);
  }
}

// ================= weather =================
// Rolled each time you come home. Rain darkens the sky and wets the ground, fog closes in, snow drifts.
const WEATHER = { clear: { n: '', w: 55 }, rain: { n: 'Rain', w: 25 }, fog: { n: 'Fog', w: 12 }, snow: { n: 'Snow', w: 8 } };
function rollWeather() { S.weather = wpick(Object.entries(WEATHER).map(([k, q]) => [k, q.w])); }
const RAIN_N = 900;
let rainSys = null, rainSnd = null, thunderT = 8;
function ensureRain() {
  if (rainSys) return rainSys;
  const pos = new Float32Array(RAIN_N * 6), seed = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { seed[i * 3] = rand(-22, 22); seed[i * 3 + 1] = rand(0, 18); seed[i * 3 + 2] = rand(-22, 22); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xa8c4e0, transparent: true, opacity: 0.38, depthWrite: false }));
  m.frustumCulled = false; m.userData.seed = seed;
  rainSys = m; return m;
}
function updWeather(dt) {
  const on = LV && LV.type === 'town' && S.weather === 'rain';
  if (!on) { if (rainSys && rainSys.parent) rainSys.parent.remove(rainSys); stopRainSound(); return; }
  const m = ensureRain(); if (!m.parent) scene.add(m);
  const p = m.geometry.attributes.position.array, s = m.userData.seed, cx = camera.position.x, cz = camera.position.z;
  for (let i = 0; i < RAIN_N; i++) {
    s[i * 3 + 1] -= dt * 22; if (s[i * 3 + 1] < 0) { s[i * 3 + 1] += 18; s[i * 3] = rand(-22, 22); s[i * 3 + 2] = rand(-22, 22); }
    const x = cx + s[i * 3] - 2, y = s[i * 3 + 1], z = cz + s[i * 3 + 2] - 8;
    p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + 0.06; p[i * 6 + 4] = y + 0.75; p[i * 6 + 5] = z;
  }
  m.geometry.attributes.position.needsUpdate = true;
  startRainSound();
  thunderT -= dt;
  if (thunderT <= 0) { thunderT = rand(14, 32); flashT = 0.35; if (AC && !muted) { noise(2.4, 0.28, AC.currentTime + 0.4, 'lowpass', 180, 60, 0.7); tone(55, 38, 2, 'sine', 0.12, AC.currentTime + 0.4); } }
}
let flashT = 0;
function startRainSound() {
  if (rainSnd || !AC || muted || !noiseBuf) return;
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.4;
  const gn = AC.createGain(); gn.gain.value = 0.0; gn.gain.linearRampToValueAtTime(0.05, AC.currentTime + 1.5);
  src.connect(f); f.connect(gn); gn.connect(sfxBus); src.start();
  rainSnd = { src, gn };
}
function stopRainSound() { if (!rainSnd) return; try { rainSnd.gn.gain.linearRampToValueAtTime(0, AC.currentTime + 0.6); rainSnd.src.stop(AC.currentTime + 0.7); } catch (err) { /* already stopped */ } rainSnd = null; }
// applied on top of the time of day
function applyWeather() {
  const w = S.weather || 'clear', W = worldMats(), u = sky.material.uniforms;
  if (W.path.userData.r0 === undefined) W.path.userData.r0 = W.path.roughness;
  W.grass.roughness = w === 'rain' ? 0.45 : 0.95; W.path.roughness = w === 'rain' ? 0.22 : W.path.userData.r0;
  W.grass.color.setHex(w === 'snow' ? 0xc4cdd6 : 0x7aa65a); // a dusting of snow on the green
  if (w === 'clear') return;
  const grey = new THREE.Color(w === 'snow' ? 0xc8d0dc : 0x8a929c).multiplyScalar(lerp(1, 0.25, nightK));
  const k = w === 'fog' ? 0.75 : w === 'rain' ? 0.65 : 0.55;
  u.uTop.value.lerp(grey, k); u.uHor.value.lerp(grey, k); u.uSunCol.value.multiplyScalar(0.25);
  sun.intensity *= w === 'rain' ? 0.35 : w === 'fog' ? 0.5 : 0.6; hemi.intensity *= w === 'rain' ? 0.8 : 1.05;
  scene.background.lerp(grey, k);
  if (scene.fog) { scene.fog.color.copy(scene.background); if (w === 'fog') { scene.fog.near = 6; scene.fog.far = SET.cam === 'top' ? 52 : 34; } else if (w === 'rain') scene.fog.far = Math.min(scene.fog.far, SET.cam === 'top' ? 80 : 90); }
  if (w === 'snow') setAmbient('frost');
  if (flashT > 0) { hemi.intensity += 6 * flashT; flashT -= 0.25; }
}
