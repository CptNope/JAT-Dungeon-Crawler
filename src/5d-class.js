// ================= class skills =================
Object.assign(P, { leapT: 0, cryT: 0, leapY: 0 });
const zones = []; // friendly ground effects: rain of arrows, falling meteors
// where a targeted skill lands: the locked foe, the mouse (overhead), the nearest foe ahead, or straight ahead
function skillTarget(maxD) {
  let tx, tz;
  if (lockT && !lockT.dead) { tx = lockT.x; tz = lockT.z; }
  else if (SET.cam === 'top' && !touchMode) { const a = aimPoint(); if (a) { tx = a.x; tz = a.z; } }
  if (tx === undefined) {
    let best = null, bd = maxD + 2;
    for (const e of enemies) {
      if (e.dead || (!e.awake && !e.los)) continue;
      const d = Math.hypot(e.x - P.x, e.z - P.z);
      if (d < bd && Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), P.face)) < 0.9) { bd = d; best = e; }
    }
    if (best) { tx = best.x; tz = best.z; } else { tx = P.x + Math.sin(P.face) * maxD * 0.75; tz = P.z + Math.cos(P.face) * maxD * 0.75; }
  }
  const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
  if (d > maxD) { tx = P.x + dx / d * maxD; tz = P.z + dz / d * maxD; }
  return { x: tx, z: tz };
}
// the farthest clear point on the straight line towards (tx, tz)
function reachTo(tx, tz) {
  const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.2);
  let x = P.x, z = P.z;
  const clear = (a, b) => walkable(a, b) && walkable(a + 0.3, b) && walkable(a - 0.3, b) && walkable(a, b + 0.3) && walkable(a, b - 0.3);
  for (let i = 1; i <= n; i++) { const t = i / n, a = P.x + dx * t, b = P.z + dz * t; if (!clear(a, b)) break; x = a; z = b; }
  return { x, z, d: Math.hypot(x - P.x, z - P.z) };
}
function zoneRing(x, z, r, col) {
  const m = new THREE.Mesh(G.ring, teleMats(col)[2]); m.scale.setScalar(r); m.position.set(x, 0.05, z); world.add(m); return m;
}
// returns false to cancel (the cooldown is not spent)
function classSkill(s) {
  if (!LV) return false;
  switch (s.id) {
    case 'leap': {
      const t = skillTarget(7), r = reachTo(t.x, t.z);
      if (r.d < 0.8 && Math.hypot(t.x - P.x, t.z - P.z) > 1.2) { floatNum(P.x, 2.2, P.z, 'No room', 'xp'); return false; }
      P.face = Math.atan2(r.x - P.x, r.z - P.z);
      P.leapT = P.leapDur = 0.44; P.leapFrom = { x: P.x, z: P.z }; P.leapTo = { x: r.x, z: r.z }; P.iframes = Math.max(P.iframes, 0.5);
      burst(P.x, 0.2, P.z, 0xc8c0a8, 10, 3, 0.12); sfx('dash');
      return;
    }
    case 'cry': {
      P.cryT = 8; ST = calcStats(); healPlayer(ST.maxHp * 0.1);
      ringFx(P.x, P.z, 0.4, 4.4, 0.35, 0xffc24a, 3); ringFx(P.x, P.z, 0.2, 3.0, 0.25, 0xff7a3a, 2.4);
      if (LV.type === 'dungeon') hitAround(4.2, 0.5 * ST.skillM, 9);
      shake(0.4); sfx('cry'); toast('War Cry: +30% damage and armor', 'var(--brass-2)');
      return;
    }
    case 'volley': {
      const t = skillTarget(10); P.face = Math.atan2(t.x - P.x, t.z - P.z);
      for (let k = -4; k <= 4; k++) spawnProj({ x: P.x + Math.sin(P.face) * 0.5, z: P.z + Math.cos(P.face) * 0.5, a: P.face + k * 0.1, spd: 22, owner: 'p', size: 0.11, col: 0xf0dcb0, pierce: ST.pierce, mult: 0.7 * ST.skillM, life: LV.type === 'town' ? 0.6 : 1.2 });
      P.atkT = Math.max(P.atkT, 0.25); P.swingT = P.swingDur = 0.2; sfx('shoot'); shake(0.12);
      return;
    }
    case 'rain': {
      if (LV.type !== 'dungeon') { floatNum(P.x, 2.2, P.z, 'Not here', 'xp'); return false; }
      const t = skillTarget(10);
      zones.push({ kind: 'rain', x: t.x, z: t.z, r: 3, t: 2, tick: 0, ring: zoneRing(t.x, t.z, 3, 0xd8e0a0) });
      sfx('shoot');
      return;
    }
    case 'blink': {
      const mv = Math.hypot(P.mx || 0, P.mz || 0) > 0.2;
      const t = mv ? { x: P.x + P.mx * 7, z: P.z + P.mz * 7 } : skillTarget(7), r = reachTo(t.x, t.z);
      if (r.d < 1) { floatNum(P.x, 2.2, P.z, 'No room', 'xp'); return false; }
      const ox = P.x, oz = P.z;
      burst(ox, 1, oz, 0x9fd4ff, 18, 5, 0.16); ringFx(ox, oz, 0.4, 3.2, 0.3, 0x9fd4ff, 2.6);
      if (LV.type === 'dungeon') for (const e of enemies) {
        if (e.dead) continue; const dx = e.x - ox, dz = e.z - oz, d = Math.hypot(dx, dz);
        if (d > 3.2 + e.r) continue;
        const q = rollDmg(e); damageEnemy(e, q.d * 1.2 * ST.skillM, q.crit, 3, dx / (d || 1), dz / (d || 1), true); if (!e.dead) e.chillT = 3.5;
      }
      P.x = r.x; P.z = r.z; P.iframes = Math.max(P.iframes, 0.3); P.face = Math.atan2(r.x - ox, r.z - oz);
      burst(P.x, 1, P.z, 0xb08cff, 18, 5, 0.16); sfx('blink');
      if (SET.cam !== 'top') { CAM.fx = P.x; CAM.fz = P.z; }
      return;
    }
    case 'meteor': {
      if (LV.type !== 'dungeon') { floatNum(P.x, 2.2, P.z, 'Not here', 'xp'); return false; }
      const t = skillTarget(10);
      telegraph(t.x, t.z, 3.2, 0.75, 0, { visualOnly: true, col: 0xff8a2a });
      const rock = mesh(G.sph, mat(0xff8a3a, 5), 0.9, 0.9, 0.9, t.x - 3, 12, t.z + 2); world.add(rock);
      zones.push({ kind: 'meteor', x: t.x, z: t.z, r: 3.2, t: 0.75, T: 0.75, rock });
      sfx('nova');
      return;
    }
  }
}
function updClassSkills(dt) {
  if (P.cryT > 0) { P.cryT -= dt; if (P.cryT <= 0) { P.cryT = 0; ST = calcStats(); P.hp = Math.min(P.hp, ST.maxHp); } }
  if (P.leapT > 0) {
    P.leapT -= dt;
    const k = clamp(1 - P.leapT / P.leapDur, 0, 1), e = k * k * (3 - 2 * k);
    P.x = lerp(P.leapFrom.x, P.leapTo.x, e); P.z = lerp(P.leapFrom.z, P.leapTo.z, e);
    P.leapY = Math.sin(k * Math.PI) * 1.6;
    if (P.leapT <= 0) {
      P.leapY = 0;
      ringFx(P.x, P.z, 0.5, 3.6, 0.3, 0xffd9a0, 2.6); burst(P.x, 0.2, P.z, 0xc8b89a, 22, 7, 0.18);
      const n = hitAround(3.4, 2.2 * ST.skillM, 7);
      shake(0.5); addHitStop(n ? 0.08 : 0.03); sfx('heavy');
    }
  }
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i];
    z.t -= dt;
    if (z.kind === 'rain') {
      z.tick -= dt;
      if (z.tick <= 0 && z.t > 0) {
        z.tick = 0.2;
        for (let k = 0; k < 4; k++) { const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * z.r; burst(z.x + Math.sin(a) * r, 0.15, z.z + Math.cos(a) * r, 0xf0e6c0, 2, 2, 0.08); }
        for (const e of enemies) {
          if (e.dead || Math.hypot(e.x - z.x, e.z - z.z) > z.r + e.r) continue;
          const q = rollDmg(e); damageEnemy(e, q.d * 0.45 * ST.skillM, q.crit, 0.5, 0, 0, false);
        }
        sfx('hit');
      }
    } else if (z.kind === 'meteor') {
      const k = clamp(1 - z.t / z.T, 0, 1);
      z.rock.position.set(lerp(z.x - 3, z.x, k), lerp(12, 0.3, k * k), lerp(z.z + 2, z.z, k));
      if (z.t <= 0) {
        world.remove(z.rock);
        ringFx(z.x, z.z, 0.5, 4.2, 0.4, 0xff7a2a, 3.4); ringFx(z.x, z.z, 0.3, 3.0, 0.3, 0xffe08a, 2.6);
        for (let n = 0; n < 3; n++) burst(z.x, 0.4, z.z, n ? 0xff7a2a : 0xffe08a, 22, 10, 0.24, 2.4);
        let hit = 0;
        for (const e of enemies) {
          if (e.dead) continue; const dx = e.x - z.x, dz = e.z - z.z, d = Math.hypot(dx, dz);
          if (d > z.r + e.r) continue;
          const q = rollDmg(e); damageEnemy(e, q.d * 3.8 * ST.skillM, q.crit, 8, dx / (d || 1), dz / (d || 1), true); hit++;
          if (!e.dead) { e.burnT = 4; e.burnD = ST.dmg * 0.5 * ST.burnM; }
        }
        shake(0.6); addHitStop(hit ? 0.1 : 0.04); sfx('boom');
      }
    }
    if (z.t <= 0) { if (z.ring) world.remove(z.ring); zones.splice(i, 1); }
  }
}
function clearZones() { for (const z of zones) { if (z.ring) world.remove(z.ring); if (z.rock) world.remove(z.rock); } zones.length = 0; P.leapT = 0; P.leapY = 0; }

// ================= the companion =================
let pet = null;
const PET_NAMES = ['Biscuit', 'Ash', 'Bramble', 'Pip', 'Moss', 'Cinder', 'Juniper', 'Scout', 'Tansy', 'Rook'];
function spawnPet() {
  pet = null;
  const lvl = S.home.kennel; if (!lvl) return;
  if (!S.pet) S.pet = pick(PET_NAMES);
  const wolf = lvl >= 3;
  const cr = makeCreature('hound', wolf ? 0x6e6e78 : lvl === 2 ? 0x8a5a32 : 0xa8784a, wolf ? 0x9ff0ff : 0xffe8a0);
  cr.mats.forEach((m) => levelDisp.push(m));
  const a = P.face + Math.PI * 0.75;
  pet = { x: P.x + Math.sin(a) * 1.4, z: P.z + Math.cos(a) * 1.4, r: 0.32, face: P.face, mesh: cr.g, u: cr.u, mats: cr.mats, h: cr.h, scale: wolf ? 1.3 : 1, biteT: 0, tgt: null, scanT: 0, kills: 0, pct: [0, 0.3, 0.45, 0.65][lvl], lunge: 0 };
  pet.mesh.scale.setScalar(pet.scale); pet.mesh.position.set(pet.x, 0, pet.z);
  pet.u.uRim.value.setRGB(0.06, 0.05, 0.03);
  world.add(pet.mesh);
  if (LV.type === 'town') pet.label = addLabel(S.pet, pet.x, 1.6, pet.z, 'npc', pet);
}
function updPet(dt) {
  if (!pet || P.dead) return;
  const fight = LV.type === 'dungeon';
  pet.biteT -= dt; pet.scanT -= dt; pet.lunge = Math.max(0, pet.lunge - dt);
  if (fight && pet.scanT <= 0) {
    pet.scanT = 0.3; pet.tgt = null; let bd = 9;
    for (const e of enemies) { if (e.dead || !e.awake) continue; const dp = Math.hypot(e.x - P.x, e.z - P.z); if (dp > 8) continue; const d = Math.hypot(e.x - pet.x, e.z - pet.z); if (d < bd) { bd = d; pet.tgt = e; } }
  }
  if (pet.tgt && pet.tgt.dead) pet.tgt = null;
  let tx, tz, spd = 0;
  if (pet.tgt) {
    const e = pet.tgt, d = Math.hypot(e.x - pet.x, e.z - pet.z);
    tx = e.x; tz = e.z; spd = d > e.r + pet.r + 0.3 ? 7.5 : 0;
    if (d < e.r + pet.r + 0.6 && pet.biteT <= 0) {
      pet.biteT = 0.75; pet.lunge = 0.18;
      const q = rollDmg(e); damageEnemy(e, q.d * pet.pct, q.crit, 1.2, (e.x - pet.x) / (d || 1), (e.z - pet.z) / (d || 1), false);
      sfx('bite');
    }
  } else {
    const a = P.face + Math.PI * 0.78, fx = P.x + Math.sin(a) * 1.5, fz = P.z + Math.cos(a) * 1.5, d = Math.hypot(fx - pet.x, fz - pet.z);
    tx = fx; tz = fz; spd = d > 0.5 ? clamp(d * 2.4, 2, 9) : 0;
  }
  const dx = tx - pet.x, dz = tz - pet.z, d = Math.hypot(dx, dz);
  if (Math.hypot(P.x - pet.x, P.z - pet.z) > 14) { pet.x = P.x - Math.sin(P.face) * 1.2; pet.z = P.z - Math.cos(P.face) * 1.2; }
  else if (spd && d > 0.05) { const st = Math.min(spd * dt, d); pet.x += dx / d * st; pet.z += dz / d * st; collide(pet); }
  if (d > 0.05 && (spd || pet.tgt)) pet.face = Math.atan2(dx, dz);
  else if (!pet.tgt) pet.face += angDiff(P.face, pet.face) * Math.min(1, dt * 2);
  const cur = pet.mesh.rotation.y; pet.mesh.rotation.y = cur + angDiff(pet.face, cur) * Math.min(1, dt * 10);
  pet.mesh.position.set(pet.x + Math.sin(pet.face) * pet.lunge * 1.5, Math.abs(Math.sin(pet.u.uWalk.value)) * 0.05 * (spd ? 1 : 0), pet.z + Math.cos(pet.face) * pet.lunge * 1.5);
  pet.u.uWalk.value += dt * (3 + spd * 1.6) * (spd ? 1 : 0);
  pet.u.uAmp.value = lerp(pet.u.uAmp.value, spd ? 0.7 : 0, Math.min(1, dt * 8));
}
