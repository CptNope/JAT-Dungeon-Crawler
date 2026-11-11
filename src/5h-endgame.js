// ================= endgame: Paragon, Ancient and Primal gear, Rift Guardians, seasons =================
const LVL_CAP = 60;
const paraNeed = (p) => Math.floor(xpNeed(LVL_CAP) * (0.6 + 0.015 * p));
const PARA = {
  might: { n: 'Might', d: (r) => `+${r}% damage`, max: 200 },
  vigor: { n: 'Vigor', d: (r) => `+${r}% max health and +${(r * 0.5).toFixed(1)}% armor`, max: 200 },
  swift: { n: 'Swiftness', d: (r) => `+${(r * 0.4).toFixed(1)}% attack speed and +${(r * 0.2).toFixed(1)}% move speed`, max: 50 },
  fortune: { n: 'Fortune', d: (r) => `+${r * 2}% magic find and +${r * 2}% gold`, max: 100 },
};
const paraSpent = () => Object.values(S.parap || {}).reduce((a, b) => a + b, 0);
const paraFree = () => (S.para || 0) - paraSpent();
function gainParagon(x) {
  S.pxp = (S.pxp || 0) + x; S.para = S.para || 0;
  let n = 0;
  while (S.pxp >= paraNeed(S.para)) { S.pxp -= paraNeed(S.para); S.para++; n++; }
  if (n) { banner(`Paragon ${S.para}`, `${paraFree()} point${paraFree() === 1 ? '' : 's'} to spend · Bag, Paragon`); sfx('level'); haptic([30, 40, 60]); ringFx(P.x, P.z, 0.4, 3.2, 0.6, 0x9fd8ff, 2.6); burst(P.x, 1.4, P.z, 0x9fd8ff, 26, 6, 0.2); }
}
function applyParagon(s) {
  const q = S.parap || {};
  return { dmg: (q.might || 0) / 100, hp: (q.vigor || 0) / 100, arm: (q.vigor || 0) * 0.005, aspd: (q.swift || 0) * 0.4, move: (q.swift || 0) * 0.2, mf: (q.fortune || 0) * 2, gold: (q.fortune || 0) * 2 };
}
function paragonHtml() {
  if (S.level < LVL_CAP) return `<p class="hint">Paragon opens at level ${LVL_CAP}. Past it, experience earns Paragon levels instead, each worth a point here, with no end.</p>`;
  const free = paraFree(), need = paraNeed(S.para || 0);
  const rows = Object.entries(PARA).map(([k, d]) => {
    const r = (S.parap || {})[k] || 0;
    return `<div class="row"><div><div class="t">${d.n}<small>${r}${d.max ? ' / ' + d.max : ''}</small></div><div class="d">${esc(d.d(r))}</div></div><div class="acts"><button class="btn ghost sm" type="button" data-act="para" data-k="${k}" data-v="-1"${r ? '' : ' disabled'} aria-label="Take a point from ${d.n}">−</button><button class="btn sm" type="button" data-act="para" data-k="${k}" data-v="1"${free && r < d.max ? '' : ' disabled'} aria-label="Add a point to ${d.n}">+</button><button class="btn ghost sm" type="button" data-act="para" data-k="${k}" data-v="10"${free && r < d.max ? '' : ' disabled'}>+10</button></div></div>`;
  }).join('');
  return `<div class="purse-row"><span>Paragon <b>${S.para || 0}</b></span><span><b>${free}</b> to spend</span><span>${fmt(S.pxp || 0)} / ${fmt(need)} to the next</span></div>
    <p class="hint" style="margin:0 0 12px">Points can be moved freely. Swiftness and Fortune stop at their caps; Might and Vigor go far.</p><div class="rows">${rows}</div>`;
}
function paraAct(k, v) {
  S.parap = S.parap || {}; const cur = S.parap[k] || 0, max = PARA[k].max || 1e9;
  const nv = v < 0 ? Math.max(0, cur + v) : Math.min(max, cur + Math.min(v, paraFree()));
  S.parap[k] = nv; afterGear();
}

// Ancient (×1.3) and Primal (×1.5, the deep's best rolls) legendary and set gear
const ANC = [null, { n: 'Ancient', m: 1.3 }, { n: 'Primal', m: 1.5 }];
function ascend(it, tier) {
  if (!it || it.rarity !== 4 || (it.anc || 0) >= tier) return it;
  const m = ANC[tier].m / (it.anc ? ANC[it.anc].m : 1);
  if (it.base) it.base *= m;
  for (const a of it.aff) a.v *= m;
  if (tier === 2) { const pool = SLOT_AFF[it.slot].filter((k) => !it.aff.some((a) => a.k === k)); if (pool.length) { const k = pick(pool); it.aff.push({ k, v: AFF[k].roll(it.il) * 1.32 * m }); } }
  it.anc = tier; it.value = Math.round(it.value * (tier === 2 ? 4 : 2.5));
  it.name = `${ANC[tier].n} ${it.lname || it.name.replace(/^(Ancient|Primal) /, '')}`;
  return it;
}
function maybeAscend(it, il, bonus) {
  if (!it || it.rarity !== 4) return it;
  if (il >= 45 && chance(0.012 + (bonus || 0) / 4)) return ascend(it, 2);
  if (il >= 32 && chance(0.1 + (bonus || 0))) return ascend(it, 1);
  return it;
}
const awakenCost = () => ({ goldleaf: 3, relic: 2, moonpearl: 2, essence: 30, gold: 25000 });

// Rift Guardians: each with its own name, look and attacks
const GUARDIANS = [
  { n: 'Warden of Hours', arch: 'warden', rim: [0.9, 0.7, 0.2], pats: ['beam', 'chase', 'cross'] },
  { n: 'Maw of the Rift', arch: 'brute', rim: [0.8, 0.2, 0.6], pats: ['charge', 'whirlpool', 'meteor'] },
  { n: 'The Many-Eyed', arch: 'caster', rim: [0.3, 0.8, 0.9], pats: ['spiral', 'ripple', 'fan'] },
  { n: 'Riftwyrm Matriarch', arch: 'summoner', rim: [0.6, 0.3, 1.0], pats: ['summon', 'roots', 'ring'] },
  { n: 'The Unmade Knight', arch: 'warden', rim: [0.9, 0.9, 1.0], pats: ['slam', 'wave', 'cross'] },
];

// seasons: one event a month, active from the first to the last day
const SEASONS = {
  10: { id: 'harvest', n: 'Harvest Moon', token: 'Harvest Token', tc: '#e8892a', lamp: 0xff8a2a, d: 'Gourd lanterns line the village, foes drop Harvest Tokens, and every kill gives 10% more experience.' },
  11: { id: 'frostfall', n: 'Frostfall', token: 'Frost Sigil', tc: '#9fd8ff', lamp: 0x9fd8ff, d: 'Snow and blue lanterns; foes drop Frost Sigils.' },
  9: { id: 'hallows', n: "Hallows' Eve", token: 'Grave Candle', tc: '#b07aff', lamp: 0xb07aff, d: 'Violet lanterns; foes drop Grave Candles.' },
};
const season = () => (DBG && DBG.season !== undefined ? SEASONS[DBG.season] : SEASONS[new Date().getMonth()]) || null;
const seasonXP = () => (season() ? 1.1 : 1);
function seasonDrop(e) {
  const s = season(); if (!s || !RUN || RUN.arena) return;
  if (chance(e.boss ? 1 : e.leader || e.champ ? 0.35 : 0.06)) spawnDrop(e.x, e.z, { token: e.boss ? randi(4, 6) : 1 });
}
const SEASON_STOCK = [
  { id: 'cache', n: 'Harvest Cache', d: 'A rare-or-better item at your deepest depth, with a fair chance of legendary.', cost: 12 },
  { id: 'plenty', n: 'Elixir of Plenty', d: 'Drink at the Delve: +50% gold and experience for one descent.', cost: 8 },
  { id: 'lantern', n: 'Gourd Lantern', d: 'A carved lantern for your yard that glows all year. +3% gold.', cost: 20, once: true },
  { id: 'essence', n: 'Bundle of Essence', d: '15 Arcane Essence.', cost: 5 },
];
function seasonHtml() {
  const s = season(); if (!s) return '<p class="hint">The stall is shut until the next festival.</p>';
  const have = S.tokens || 0;
  return `<div class="purse-row"><span><b style="color:${s.tc}">${have}</b> ${esc(s.token)}s</span><span>${esc(s.n)}</span></div><p class="hint" style="margin:0 0 12px">${esc(s.d)}</p>
    <div class="rows">${SEASON_STOCK.map((o) => { const owned = o.once && S.decor && S.decor.gourd; return `<div class="row"><div><div class="t">${esc(o.n)}</div><div class="d">${esc(o.d)}</div><div class="costs"><span class="cost${have >= o.cost ? '' : ' no'}">${o.cost} ${esc(s.token)}s</span></div></div><button class="btn" type="button" data-act="seasonBuy" data-k="${o.id}"${have >= o.cost && !owned && (o.id !== 'cache' || S.inv.length < BAG_CAP) ? '' : ' disabled'}>${owned ? 'Owned' : 'Trade'}</button></div>`; }).join('')}</div>`;
}
function seasonBuy(k) {
  const o = SEASON_STOCK.find((q) => q.id === k), s = season(); if (!o || !s || (S.tokens || 0) < o.cost) return;
  if (k === 'cache') { if (S.inv.length >= BAG_CAP) return; const it = maybeAscend(lootItem(Math.max(1, S.best || 1), { mf: 250, min: 2 }), S.best || 1, 0.05); S.inv.push(it); toast(`${it.name}`, it.set ? 'var(--set)' : `var(--r${it.rarity})`, true); }
  else if (k === 'plenty') { S.elixirs.plenty = (S.elixirs.plenty || 0) + 1; toast('Elixir of Plenty', s.tc); }
  else if (k === 'lantern') { S.decor = S.decor || {}; if (S.decor.gourd) return; S.decor.gourd = 1; toast('Gourd Lantern placed in your yard', s.tc, true); if (LV.type === 'town') placeSeasonDecor(true); }
  else if (k === 'essence') { addMat('essence', 15); toast('+15 Arcane Essence', 'var(--r3)'); }
  S.tokens -= o.cost; sfx('buy'); save();
}
// lanterns about the village for the season, plus the stall itself
function placeSeasonDecor(onlyYard) {
  const s = season(), W = worldMats();
  const lantern = (x, z, sc, col) => {
    const g = new THREE.Group();
    g.add(mesh(G.sph, new THREE.MeshStandardMaterial({ color: 0xd06a1a, roughness: 0.7, emissive: new THREE.Color(col), emissiveIntensity: 0.35 }), 0.62 * sc, 0.48 * sc, 0.62 * sc, 0, 0.24 * sc, 0));
    for (let k = 0; k < 3; k++) g.add(mesh(G.box, mat(col, 3.2), 0.07 * sc, 0.09 * sc, 0.02, (k - 1) * 0.13 * sc, 0.28 * sc, 0.3 * sc));
    g.add(mesh(G.cyl, mat(0x3a5a2a), 0.06 * sc, 0.16 * sc, 0.06 * sc, 0, 0.52 * sc, 0));
    g.position.set(x, 0, z); g.rotation.y = rand(-0.6, 0.6); g.traverse((o) => { if (o.material) levelDisp.push(o.material); }); world.add(g);
  };
  if (S.decor && S.decor.gourd) lantern(11.8, 13.3, 1.3, 0xffa040);
  if (onlyYard || !s) return;
  for (const [x, z] of [[6, 15.3], [16, 15.3], [27, 15.3], [38, 15.3], [18, 24.9], [26, 24.9], [18.2, 28.6], [25.8, 28.6], [13, 13.2], [30, 13.2]]) if (walkableTown(x, z)) lantern(x + rand(-0.4, 0.4), z + rand(-0.4, 0.4), rand(0.8, 1.1), s.lamp);
  // the festival stall beside the well
  const sx = 17.4, sz = 20.4;
  const st = new THREE.Group();
  st.add(mesh(G.box, W.timber || mat(0x6a4a2a), 2.2, 0.9, 0.9, 0, 0.45, 0));
  for (const s2 of [-1, 1]) st.add(mesh(G.box, W.timber || mat(0x6a4a2a), 0.12, 2.2, 0.12, s2 * 1.0, 1.1, -0.3));
  st.add(mesh(G.box, mat(new THREE.Color(s.tc).getHex(), 0.4), 2.5, 0.08, 1.3, 0, 2.2, -0.1));
  for (let k = 0; k < 4; k++) st.add(mesh(G.sph, mat(s.lamp, 2.6), 0.18, 0.15, 0.18, -0.75 + k * 0.5, 1.02, 0.1));
  st.position.set(sx, 0, sz); st.rotation.y = 0.35; st.traverse((o) => { o.castShadow = true; }); world.add(st);
  addInteract({ x: sx, z: sz + 0.9, r: 1.9, kind: 'npc', label: `${s.n} Stall`, ly: 2.8, cls: 'npc', verb: 'Trade tokens', act: () => openPanel('season') });
}
const walkableTown = (x, z) => { try { return walkable(x, z); } catch (err) { return true; } };
