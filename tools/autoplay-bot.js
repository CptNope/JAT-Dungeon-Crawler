// Autoplay bot for Hearthdeep. Injected into the page; plays a class through delve, rift and Pit phases and logs problems.
window.startBot = (cls, plan) => {
  const H = hearthdeep, D = H.debug;
  const log = { cls, events: [], errors: [], deaths: 0, floors: 0, maxDepth: 0, rifts: 0, waves: 0, stuck: 0, softlocks: 0, frames: [], phases: [], kills0: 0 };
  window.addEventListener('error', (e) => log.errors.push(`${e.message} @${e.lineno}:${e.colno}`));
  window.addEventListener('unhandledrejection', (e) => log.errors.push('promise: ' + (e.reason && e.reason.message)));
  let lastF = performance.now();
  const rf = () => { const n = performance.now(); log.frames.push(n - lastF); lastF = n; if (!log.done) requestAnimationFrame(rf); };
  requestAnimationFrame(rf);
  if (!H.S.cls) { const b = document.querySelector(`[data-k=${cls}]`); if (b) b.click(); }
  D.setTouchMode(true); D.DBG.turbo = 8;
  log.kills0 = H.S.kills;
  const ignore = new Set(); let tgt = { e: null, t: 0, hp: 0 }; let phase = -1, phaseT = 0, lastProg = performance.now(), lastPos = { x: 0, z: 0 }, lastMoveT = performance.now(), path = null, pathT = 0, lastDepth = 0, lastKills = 0;
  const nextPhase = () => {
    phase++; phaseT = performance.now();
    if (phase >= plan.length) { log.done = true; D.DBG.turbo = 0; D.stick.x = D.stick.y = 0; return; }
    const [kind, arg] = plan[phase];
    log.phases.push(kind);
    if (H.LV.type !== 'town') D.returnToTown(false);
    // equip the best gear found so far (by rarity, then item level)
    const S = H.S; for (const it of [...S.inv]) { const cur = S.equip[it.slot]; const sc = (q) => (q ? q.rarity * 100 + q.il : -1); if (sc(it) > sc(cur)) { S.inv.splice(S.inv.indexOf(it), 1); S.equip[it.slot] = it; if (cur) S.inv.push(cur); } }
    while (S.inv.length > 20) S.inv.shift();
    S.potions = Math.max(S.potions, 6);
    if (plan[phase][3]) { S.level = Math.max(S.level, plan[phase][3]); S.best = Math.max(S.best, plan[phase][1] || 1); }
    D.afterGear();
    if (kind === 'delve') H.startDelve(arg, []); else if (kind === 'seed') D.startRift(0, false, D.parseRiftCode(arg)); else if (kind === 'rift') D.startRift(arg, false); else if (kind === 'weekly') D.startRift(0, true); else if (kind === 'pit') D.startArena();
    lastProg = performance.now(); path = null;
  };
  const bfs = (tx, tz) => {
    const L = H.LV, W = L.w, N = W * L.h, s = Math.floor(H.P.z) * W + Math.floor(H.P.x), t = Math.floor(tz) * W + Math.floor(tx);
    const prev = new Int32Array(N).fill(-1), q = [s]; prev[s] = s;
    for (let h = 0; h < q.length; h++) { const c = q[h]; if (c === t) break; for (const d of [1, -1, W, -W]) { const n = c + d; if (n < 0 || n >= N || prev[n] >= 0) continue; if (L.g[n] !== 1 && n !== t) continue; prev[n] = c; q.push(n); } }
    if (prev[t] < 0) return null;
    const out = []; for (let c = t; c !== s; c = prev[c]) out.push(c); out.reverse(); return out.map((c) => ({ x: (c % W) + 0.5, z: Math.floor(c / W) + 0.5 }));
  };
  const moveTo = (tx, tz) => {
    const now = performance.now();
    if (!path || now - pathT > 1500 || !path.length) { path = bfs(tx, tz); pathT = now; }
    if (!path || !path.length) { D.stick.x = D.stick.y = 0; return; }
    while (path.length > 1 && Math.hypot(path[0].x - H.P.x, path[0].z - H.P.z) < 0.6) path.shift();
    const p = path[0], dx = p.x - H.P.x, dz = p.z - H.P.z, l = Math.hypot(dx, dz) || 1;
    D.stick.x = dx / l; D.stick.y = dz / l;
  };
  // explore: head for the nearest floor tile the minimap has not revealed
  const exploreGoal = () => { const L = H.LV; let best = null, bd = 1e9; for (let k = 0; k < L.g.length; k += 3) { if (L.g[k] !== 1 || L.explored[k]) continue; const x = (k % L.w) + 0.5, z = Math.floor(k / L.w) + 0.5, d = Math.hypot(x - H.P.x, z - H.P.z); if (d < bd) { bd = d; best = { x, z }; } } return best; };
  const tick = () => {
    if (log.done) return;
    try {
      const now = performance.now(), P = H.P, R = H.RUN;
      if (!document.querySelector('#death').hidden) { log.deaths++; document.querySelector('#btnRevive').click(); setTimeout(nextPhase, 300); return; }
      if (!document.querySelector('#dlg').hidden) { const b = document.querySelector('#dlgNext'); if (b) b.click(); log.dialogues = (log.dialogues || 0) + 1; return; }
      if (!document.querySelector('#ending').hidden) { log.ending = true; document.querySelector('#ending').hidden = true; return; }
      if (!document.querySelector('#panel').hidden) { if (H.S.cls) H.closePanel(); return; }
      if (!document.querySelector('#title').hidden) return;
      if (phase < 0 || now - phaseT > plan[phase][2] * 1000 || (R && R.rift && R.rift.done && H.LV.type === 'dungeon' && now - phaseT > 4000 && !H.enemies.some((e) => !e.dead && e.awake))) { if (R && R.rift && R.rift.done) log.rifts++; nextPhase(); return; }
      if (H.LV.type !== 'dungeon') return;
      if (R.depth !== lastDepth) { lastDepth = R.depth; log.floors++; log.maxDepth = Math.max(log.maxDepth, R.depth); lastProg = now; path = null; }
      if (H.S.kills !== lastKills) { lastKills = H.S.kills; lastProg = now; }
      if (R.arena) log.waves = Math.max(log.waves, R.arena.wave);
      if (now - lastProg > 45000) { log.softlocks++; log.events.push(`softlock d${R.depth} at ${P.x.toFixed(1)},${P.z.toFixed(1)}`); lastProg = now; nextPhase(); return; }
      if (P.hp < D.calcStats().maxHp * 0.45) D.usePotion();
      const foes = H.enemies.filter((e) => !e.dead && !ignore.has(e) && (e.awake || Math.hypot(e.x - P.x, e.z - P.z) < 9)).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
      const f = foes[0], fd = f ? Math.hypot(f.x - P.x, f.z - P.z) : 99;
      if (f !== tgt.e) tgt = { e: f, t: now, hp: f ? f.hp : 0 }; else if (f && f.hp < tgt.hp) { tgt.hp = f.hp; tgt.t = now; } else if (f && now - tgt.t > 15000) { ignore.add(f); log.events.push('ignored unreachable ' + f.name); }
      const ranged = ['bow', 'staff'].includes(H.S.equip.weapon && H.S.equip.weapon.kind);
      if (f && fd < 16) {
        for (let i = 0; i < 3; i++) if (D.skillCd[i] <= 0 && fd < 7 && H.S.level >= [1, 4, 8][i]) D.useSkill(i);
        if (fd > (ranged ? 6.5 : 1.6 + f.r)) moveTo(f.x, f.z); else { D.stick.x = D.stick.y = 0; }
        if (fd < (ranged ? 9 : 2.4 + f.r)) D.playerAttack();
        return;
      }
      // no foe close: go to the exit (stairs, an open rift seal, the Pit's way out) or explore
      const I = D.interacts;
      let goal = I.find((o) => o.kind === 'stairs') || (R.rift && R.rift.done && I.find((o) => o.label === 'Rift seal')) || null;
      if (R.arena) goal = null;
      const seen = goal && H.LV.explored[Math.floor(goal.z) * H.LV.w + Math.floor(goal.x)];
      const gt = (seen && goal) || exploreGoal() || (R.rift && I.find((o) => o.label === 'Rift seal'));
      if (gt) { moveTo(gt.x, gt.z); if (goal && Math.hypot(goal.x - P.x, goal.z - P.z) < 1.5) { D.interact(); path = null; } }
      else D.stick.x = D.stick.y = 0;
      if (Math.hypot(P.x - lastPos.x, P.z - lastPos.z) > 0.6) { lastPos = { x: P.x, z: P.z }; lastMoveT = now; }
      else if (now - lastMoveT > 8000 && !R.arena) { log.stuck++; lastMoveT = now; path = null; D.stick.x = Math.random() - 0.5; D.stick.y = Math.random() - 0.5; }
    } catch (err) { log.errors.push('bot: ' + err.message); }
  };
  setInterval(tick, 60);
  window.BOTLOG = log;
  return 'started';
};
window.botReport = () => {
  const L = window.BOTLOG, fr = L.frames.slice(5).sort((a, b) => a - b);
  const pct = (p) => (fr.length ? fr[Math.floor(fr.length * p)].toFixed(0) : '-');
  return JSON.stringify({ cls: L.cls, done: !!L.done, phases: L.phases, errors: [...new Set(L.errors)].slice(0, 12), deaths: L.deaths, floors: L.floors, maxDepth: L.maxDepth, rifts: L.rifts, waves: L.waves, stuck: L.stuck, softlocks: L.softlocks, events: (L.events || []).slice(0, 6), kills: hearthdeep.S.kills - L.kills0, dialogues: L.dialogues || 0, ending: !!L.ending, story: hearthdeep.S.story, combos: hearthdeep.S.stats.combos || 0, perfects: hearthdeep.S.stats.perfects || 0, parries: hearthdeep.S.stats.parries || 0, level: hearthdeep.S.level, frameMs: { p50: pct(0.5), p95: pct(0.95), max: pct(0.999) } });
};
