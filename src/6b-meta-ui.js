// ================= class choice =================
function classHtml() {
  return `<p class="hint" style="margin:0 0 14px">${S.runs || S.kills ? 'The village has learned new ways while you were away. Pick the one that suits you; you keep your gear, and every level you have earned becomes a talent point.' : 'Every delver walks one of three paths. Each brings its own three skills and its own talents.'}</p>
    <div class="classes">${Object.entries(CLASSES).map(([k, C]) => `<button class="clsb" type="button" data-act="pickClass" data-k="${k}" style="--cc:#${C.col.toString(16).padStart(6, '0')}">
      <b>${C.n}</b><span class="d">${esc(C.d)}</span><span class="perk">${esc(C.perk)}</span>
      <span class="sk">${C.skills.map((s, i) => `<span>${svg(s)}<em>${SKILL_DEFS[s].n}<small>level ${SKILL_LVL[i]}</small></em></span>`).join('')}</span>
      <span class="wpn">Starts with: ${WEAPONS[C.weapon].n}</span></button>`).join('')}</div>`;
}
function rebuildHero() {
  if (P.mesh) { scene.remove(P.mesh); P.mesh.traverse((o) => { if (o.material && o.material.dispose) o.material.dispose(); }); }
  P.mesh = null; P.wkind = null; placePlayerMesh();
}
function chooseClassThen() { if (LV && LV.type === 'town') storyOnTown(); announcePendingRift(); }
function chooseClass(k) {
  const fresh = !S.runs && !S.kills;
  S.cls = k; S.tal = {};
  if (fresh) { S.equip.weapon = genItem(1, { slot: 'weapon', kind: CLASSES[k].weapon, rarity: 0 }); }
  setClassSkills(); buildActionBar();
  ST = calcStats(); P.hp = ST.maxHp; rebuildHero();
  closePanel(); save();
  toast(`You walk the ${CLASSES[k].n}'s path.`, 'var(--brass-2)', true); sfx('level');
  if (fresh) hint('move');
  setTimeout(chooseClassThen, 400);
}

// ================= talents =================
function talentsHtml() {
  const list = TALENTS[S.cls] || [], pts = talPoints();
  const tiers = [0, 1, 2].map((t) => {
    const open = talSpent(t) >= TIER_REQ[t];
    return `<section class="tier${open ? '' : ' shut'}"><h3>${['Novice', 'Adept', 'Master'][t]}<small>${open ? 'open' : `needs ${TIER_REQ[t]} points in the tiers above`}</small></h3><div class="tals">${list.filter((q) => q.t === t).map((q) => {
      const r = tal(q.id), can = open && pts > 0 && r < TAL_MAX;
      return `<button class="talb${r ? ' has' : ''}" type="button" data-act="tal" data-id="${q.id}"${can ? '' : ' disabled'}><b>${q.n}<i>${'◆'.repeat(r)}${'◇'.repeat(TAL_MAX - r)}</i></b><span>${esc(q.d(Math.max(1, r)))}${r < TAL_MAX && r ? ` <em>next: ${esc(q.d(r + 1))}</em>` : ''}</span></button>`;
    }).join('')}</div></section>`;
  }).join('');
  const rc = respecCost();
  return `<div class="purse-row"><span><b>${pts}</b> point${pts === 1 ? '' : 's'} to spend</span><span>${talSpent()} spent</span><span>${clsOf().n}, level ${S.level}</span><span>One point every level</span></div>${tiers}
    <div class="row" style="margin-top:12px"><div><div class="t">Unlearn talents<small>${LV.type === 'town' ? 'in town' : 'only in town'}</small></div><div class="d">Elder Maren can help you forget, for a fee. Every point comes back.</div>${costChips({ gold: rc })}</div><button class="btn ghost" type="button" data-act="respec"${LV.type === 'town' && S.gold >= rc && talSpent() ? '' : ' disabled'}>Unlearn</button></div>`;
}

// ================= sets, gems and sockets =================
function setInfoHtml(it) {
  const Sd = SETS[it.set], have = setCounts()[it.set] || 0;
  const pcs = Object.entries(Sd.pieces).map(([sl, n]) => { const w = S.equip[sl] && S.equip[sl].set === it.set; return `<span class="${w ? 'on' : ''}">${esc(n)}</span>`; }).join('');
  return `<div class="setinfo"><b>${esc(Sd.n)}</b> <small>${have}/3 worn</small><div class="pcs">${pcs}</div><div class="${have >= 2 ? 'on' : ''}">(2) ${esc(Sd.b2)}</div><div class="${have >= 3 ? 'on' : ''}">(3) ${esc(Sd.b3)}</div></div>`;
}
const drillCost = (it) => ({ essence: 10 + 8 * (it.sock || 0), gold: Math.round(150 + it.value * 0.8) });
function socketHtml(it) {
  const owned = Object.entries(S.gems).filter(([, n]) => n > 0).sort((a, b) => b[0].slice(-1) - a[0].slice(-1));
  let h = '';
  if (it.sock) {
    const free = it.gems.indexOf(null);
    h += `<div class="row"><div><div class="t">Sockets<small>${it.gems.filter(Boolean).length}/${it.sock} filled</small></div><div class="d">${free < 0 ? 'Every socket is filled. Setting a new gem crushes the one in the first socket.' : 'Set a gem from your pouch. Gems cannot be taken back out.'}</div>
      <div class="gemp">${owned.length ? owned.map(([k, n]) => `<button type="button" class="gemb" data-act="socket" data-k="${k}" style="--gc:${GEMS[gemSplit(k)[0]].c}"><i></i>${esc(gemName(k))} ×${n}<small>${esc(gemLine(k))}</small></button>`).join('') : '<span class="hint">No gems. Foes and chests drop them.</span>'}</div></div></div>`;
  }
  if ((it.sock || 0) < MAX_SOCK && it.rarity >= 1) {
    const c = drillCost(it), ok = S.home.bench >= 1;
    h += `<div class="row"><div><div class="t">Drill a socket</div><div class="d">${ok ? `Up to ${MAX_SOCK} per item.` : "Needs a Joiner's Bench."}</div>${ok ? costChips(c) : ''}</div><button class="btn ghost" type="button" data-act="drill"${ok && hasCost(c) ? '' : ' disabled'}>Drill</button></div>`;
  }
  return h;
}
// ================= legendary powers: extract one to learn it, imprint it onto rare or epic gear =================
const imprintCost = (it) => ({ essence: 18 + it.rarity * 6, sigil: it.rarity === 3 ? 2 : 1, gold: Math.round(400 + it.value) });
function powerHtml(it) {
  const learned = S.learned || [], ok = S.home.bench >= 2;
  const aw = it.rarity === 4 && !it.anc ? (() => { const c = awakenCost(), okA = S.home.bench >= 3; return `<div class="row"><div><div class="t">Awaken<small>legendary or set</small></div><div class="d">${okA ? 'Make this item Ancient: its damage or armor and every affix grow by 30%.' : 'Needs a Runeforge.'}</div>${okA ? costChips(c) : ''}</div><button class="btn" type="button" data-act="awaken"${okA && hasCost(c) ? '' : ' disabled'}>Awaken</button></div>`; })() : '';
  if (it.rarity === 4 && it.set) return aw;
  if (it.rarity === 4 && it.power) {
    const known = learned.includes(it.power);
    return aw + `<div class="row"><div><div class="t">Extract the power<small>${known ? 'already learned' : 'destroys the item'}</small></div><div class="d">${ok ? `Learn ${esc(legendOf(it).name)}'s power for good, so you can imprint it onto rare or epic gear.` : "Needs an Artificer's Table."}</div></div><button class="btn ghost" type="button" data-act="extract"${ok && !known && !SLOTS.some((s) => S.equip[s] === it) ? '' : ' disabled'}>Extract</button></div>`;
  }
  if ((it.rarity === 2 || it.rarity === 3) && !it.set) {
    const c = imprintCost(it);
    if (!learned.length) return `<div class="row"><div><div class="t">Imprint a power</div><div class="d">Extract a legendary here first; its power can then be imprinted onto rare and epic gear.</div></div></div>`;
    return `<div class="row"><div><div class="t">Imprint a power${it.power ? `<small>replaces ${esc(legendOf(it).name)}</small>` : ''}</div><div class="d">${ok ? 'Give this item one legendary power you have learned.' : "Needs an Artificer's Table."}</div>${ok ? costChips(c) : ''}
      <div class="gemp">${learned.map((k) => { const L = LEGENDS.find((l) => l.power === k); return L ? `<button type="button" class="gemb" data-act="imprint" data-k="${k}" style="--gc:var(--r4)"${ok && hasCost(c) && it.power !== k ? '' : ' disabled'}><i></i>${esc(L.name)}<small>${esc(L.desc)}</small></button>` : ''; }).join('')}</div></div></div>`;
  }
  return '';
}
function gemsHtml() {
  const rows = Object.entries(GEMS).map(([g, G0]) => `<div class="row"><div><div class="t" style="color:${G0.c}">${G0.n}<small>${esc(G0.l('X').replace('X', G0.v.join(' / ')))}</small></div>
    <div class="gemrow">${[1, 2, 3].map((t) => { const k = gemKey(g, t), n = S.gems[k] || 0; return `<span class="gemc${n ? '' : ' none'}" style="--gc:${G0.c}"><i class="t${t}"></i>${GEM_TIER[t - 1]} <b>${n}</b>${t < 3 ? `<button class="btn ghost sm" type="button" data-act="fuse" data-k="${k}"${n >= 3 && S.gold >= 60 * t ? '' : ' disabled'}>Fuse 3 → 1 (${60 * t}g)</button>` : ''}</span>`; }).join('')}</div></div></div>`).join('');
  return purseRow() + `<p class="hint" style="margin:0 0 12px">Gems drop from foes and chests. Set them into socketed gear at the Workshop; fuse three of a kind into the next cut here.</p><div class="rows">${rows}</div>`;
}

// ================= the yard =================
function decorHtml() {
  const D = S.decor;
  return purseRow() + `<p class="hint" style="margin:0 0 12px">Dress up the yard. Every piece shows in the village, and most of them help a little.</p><div class="rows">${Object.entries(DECOR).map(([k, q]) => {
    const has = D[k], locked = q.need && !q.need();
    return `<div class="row${locked ? ' locked' : ''}"><div><div class="t">${q.n}${has ? '<small>built</small>' : locked ? `<small>${esc(q.needT)}</small>` : ''}</div><div class="d">${esc(q.d)}</div>${has ? '' : costChips(q.cost)}</div>${has ? '' : `<button class="btn" type="button" data-act="decor" data-k="${k}"${!locked && hasCost(q.cost) ? '' : ' disabled'}>Build</button>`}</div>`;
  }).join('')}</div>`;
}

// ================= codex =================
const fmtTime = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const fmtDate = (t) => { try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (err) { return ''; } };
function codexHtml(tab) {
  if (tab === 'beasts') {
    const seen = (n) => S.bestiary[n] || 0;
    return `<p class="hint" style="margin:0 0 12px">Every kind of foe you have slain, by the depths they haunt. ${Object.keys(S.bestiary).length} entries.</p>${BIOMES.map((B, bi) => {
      const kinds = Object.keys(ARCH).map((a) => B.enemies[a]).filter(Boolean);
      const known = kinds.filter((e) => seen(e[0])).length + (seen(B.boss.name) ? 1 : 0);
      return `<section class="beasts"><h3>${B.name}<small>depths ${bi * 5 + 1} to ${bi * 5 + 5} · ${known}/${kinds.length + 1}</small></h3><div class="bgrid">${kinds.map(([n, c]) => `<div class="beast${seen(n) ? '' : ' unk'}"><i style="background:#${c.toString(16).padStart(6, '0')}"></i><span>${seen(n) ? esc(n) : '???'}</span><b>${seen(n) || ''}</b></div>`).join('')}<div class="beast boss${seen(B.boss.name) ? '' : ' unk'}"><i style="background:#${B.boss.color.toString(16).padStart(6, '0')}"></i><span>${seen(B.boss.name) ? esc(B.boss.name) : 'A boss, unseen'}</span><b>${seen(B.boss.name) || ''}</b></div></div></section>`;
    }).join('')}`;
  }
  if (tab === 'story') return storyHtml();
  if (tab === 'records') {
    const R = S.records || [];
    return `<div class="stats" style="margin-bottom:14px">${[['Deepest depth', S.best], ['Foes slain', fmt(S.kills)], ['Bosses slain', S.bossKills], ['Leaders slain', S.stats.leaders || 0], ['Champions slain', S.stats.champs || 0], ['Descents', S.runs], ['Most floors in one trip', S.stats.longest || 0], ['Times fallen', S.deaths], ['Skills used', fmt(S.stats.skills || 0)], ['Things crafted', S.stats.crafts || 0], ['Tasks done', S.questsDone || 0], ['Highest rift sealed', (S.rift && S.rift.cleared) || 0], ['Best Pit wave', S.arenaBest || 0], ['Rift shards', S.shards || 0], ['Time played', fmtTime(S.time || 0)]].map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>
      <div class="acts" style="margin-bottom:12px"><button class="btn" type="button" id="runCard">Make a run card</button><span class="hint">An image of your hero and records to share.</span></div>
      <h3>Best descents</h3>${R.length ? `<div class="recs"><div class="rec hd"><span>#</span><span>Reached</span><span>Floors</span><span>Gold</span><span>Hero</span><span>Ended</span></div>${R.map((r, i) => `<div class="rec"><span>${i + 1}</span><span>Depth ${r.deep}${r.from > 1 ? ` <small>from ${r.from}</small>` : ''}</span><span>${r.floors}</span><span>${fmt(r.gold)}</span><span>${r.cls ? CLASSES[r.cls].n : 'Delver'} ${r.lvl}</span><span>${r.died ? 'Fell' : 'Home'} · ${fmtDate(r.at)}</span></div>`).join('')}</div>` : '<p class="hint">No descents yet. Every trip below is recorded here.</p>'}`;
  }
  if (tab === 'save') {
    return `<p class="hint" style="margin:0 0 12px">Your hero lives in this browser (slot ${SET.slot + 1} of 3). Copy the code below to keep a backup or move your hero to another device, then paste it into Import there.</p>
      <div class="rows"><div class="row" style="grid-template-columns:1fr"><div class="t">Export</div><textarea id="exportBox" class="code" readonly rows="4">${esc(exportCode())}</textarea><div class="acts"><button class="btn" type="button" data-act="copyExport">Copy code</button></div></div>
      <div class="row" style="grid-template-columns:1fr"><div class="t">Import<small>replaces the hero in this slot</small></div><textarea id="importBox" class="code" rows="4" placeholder="Paste a Hearthdeep save code here"></textarea><div class="acts"><button class="btn ghost" type="button" data-act="importSave">Import</button></div><div class="hint" id="importMsg"></div></div></div>`;
  }
  const got = ACH.filter((a) => S.ach[a.id]).length;
  return `<div class="achbar"><i style="width:${(got / ACH.length) * 100}%"></i><span>${got} of ${ACH.length}</span></div><div class="achs">${ACH.map((a) => `<div class="ach${S.ach[a.id] ? ' got' : ''}">${svg('star')}<div><b>${esc(a.n)}</b><span>${esc(a.d)}</span>${S.ach[a.id] ? `<small>${fmtDate(S.ach[a.id])}</small>` : ''}</div></div>`).join('')}</div>`;
}

// ================= save slots, export and import =================
const SLOT_KEYS = ['hearthdeep.save.v1', 'hearthdeep.save.v1.s2', 'hearthdeep.save.v1.s3'];
function peekSlot(i) { try { const m = safeParse(localStorage.getItem(SLOT_KEYS[i])); return validSave(m) ? m : (validSave(safeParse(localStorage.getItem(SLOT_KEYS[i] + '.bak'))) ? safeParse(localStorage.getItem(SLOT_KEYS[i] + '.bak')) : null); } catch (err) { return null; } }
function exportCode() { try { return 'HD1.' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (err) { return ''; } }
function importCode(txt) {
  const t = String(txt || '').trim().replace(/\s+/g, '');
  if (!t.startsWith('HD1.')) throw new Error('That does not look like a Hearthdeep save code.');
  const s = JSON.parse(decodeURIComponent(escape(atob(t.slice(4)))));
  if (!validSave(s)) throw new Error('The code is damaged or incomplete.');
  return s;
}
function switchToSave(s) {
  S = normalizeSave(s); fixUid(); RUN = null; P.dead = false;
  setClassSkills(); buildActionBar();
  ST = calcStats(); rebuildHero(); loadTown();
}

// ================= panel actions for the systems above =================
function metaAct(d, it) {
  switch (d.act) {
    case 'pickClass': chooseClass(d.k); return 'stop';
    case 'tal': {
      const q = (TALENTS[S.cls] || []).find((x) => x.id === d.id);
      if (!q || talPoints() <= 0 || tal(q.id) >= TAL_MAX || talSpent(q.t) < TIER_REQ[q.t]) break;
      S.tal[q.id] = tal(q.id) + 1; afterGear(); sfx('page'); break;
    }
    case 'respec': { const c = respecCost(); if (LV.type === 'town' && S.gold >= c) { S.gold -= c; S.tal = {}; afterGear(); toast('Your talents are yours to spend again.', 'var(--brass-2)'); sfx('shrine'); } break; }
    case 'decor': {
      const q = DECOR[d.k]; if (!q || S.decor[d.k] || (q.need && !q.need()) || !hasCost(q.cost)) break;
      payCost(q.cost); S.decor[d.k] = 1; toast(`Built: ${q.n}`, 'var(--brass-2)', true); sfx('level');
      const px = P.x, pz = P.z; loadTown(); P.x = px; P.z = pz; snapCamera(); ST = calcStats(); break;
    }
    case 'socket': {
      if (!it || !it.sock || !(S.gems[d.k] > 0)) break;
      let i = it.gems.indexOf(null); if (i < 0) i = 0;
      it.gems[i] = d.k; S.gems[d.k]--; stat('socketed'); afterGear(); toast(`${gemName(d.k)} set in ${it.name}`, GEMS[gemSplit(d.k)[0]].c); sfx('gem'); break;
    }
    case 'drill': {
      if (!it || (it.sock || 0) >= MAX_SOCK || S.home.bench < 1) break;
      const c = drillCost(it); if (!hasCost(c)) break;
      payCost(c); it.sock = (it.sock || 0) + 1; it.gems = (it.gems || []).concat([null]); toast(`${it.name} now has ${it.sock} socket${it.sock > 1 ? 's' : ''}`, 'var(--brass-2)'); sfx('craft'); break;
    }
    case 'para': paraAct(d.k, +d.v); break;
    case 'seasonBuy': seasonBuy(d.k); break;
    case 'awaken': {
      const c = awakenCost(); if (!it || it.rarity !== 4 || it.anc || S.home.bench < 3 || !hasCost(c)) break;
      payCost(c); ascend(it, 1); afterGear(); toast(`${it.name} awakens.`, 'var(--r4)', true); sfx('shrine'); burst(P.x, 1.5, P.z, 0xf19a33, 24, 5, 0.2); break;
    }
    case 'extract': {
      if (!it || it.rarity !== 4 || !it.power || S.home.bench < 2 || SLOTS.some((s) => S.equip[s] === it)) break;
      S.learned = S.learned || []; if (S.learned.includes(it.power)) break;
      S.learned.push(it.power); S.inv.splice(S.inv.indexOf(it), 1); Panel.sel = null;
      toast(`Learned: ${legendOf(it).name}`, 'var(--r4)', true); sfx('shrine'); break;
    }
    case 'imprint': {
      if (!it || !(it.rarity === 2 || it.rarity === 3) || it.set || S.home.bench < 2 || !(S.learned || []).includes(d.k)) break;
      const c = imprintCost(it); if (!hasCost(c)) break;
      payCost(c); it.power = d.k; afterGear(); toast(`${it.name} now carries ${LEGENDS.find((l) => l.power === d.k).name}`, 'var(--r4)', true); sfx('gem'); break;
    }
    case 'loSave': {
      const i = +d.k; S.loadouts[i] = { name: S.loadouts[i] ? S.loadouts[i].name : `Loadout ${i + 1}`, eq: Object.fromEntries(SLOTS.map((s) => [s, S.equip[s] ? S.equip[s].id : null])), tal: Object.assign({}, S.tal), cls: S.cls };
      toast(`Saved ${S.loadouts[i].name}`, 'var(--brass-2)'); sfx('page'); break;
    }
    case 'loLoad': { applyLoadout(+d.k); break; }
    case 'loClear': S.loadouts[+d.k] = null; break;
    case 'fuse': {
      const [g, t] = gemSplit(d.k); if ((S.gems[d.k] || 0) < 3 || t >= 3 || S.gold < 60 * t) break;
      S.gems[d.k] -= 3; S.gold -= 60 * t; const nk = gemKey(g, t + 1); S.gems[nk] = (S.gems[nk] || 0) + 1;
      if (t + 1 === 3) stat('perfect'); toast(`Cut a ${gemName(nk)}`, GEMS[g].c); sfx('gem'); break;
    }
    case 'copyExport': {
      const box = $('#exportBox'); if (!box) break;
      const done = () => toast('Save code copied.', 'var(--ok)');
      try { navigator.clipboard.writeText(box.value).then(done, () => { box.select(); toast('Select the code and copy it.', 'var(--muted)'); }); } catch (err) { box.select(); }
      return 'stop';
    }
    case 'importSave': {
      const box = $('#importBox'), msg = $('#importMsg'); if (!box) break;
      try { const s = importCode(box.value); closePanel(); switchToSave(s); save(); toast('Hero imported.', 'var(--ok)', true); if (!S.cls) openPanel('class'); }
      catch (err) { if (msg) { msg.textContent = err.message || 'Could not read that code.'; msg.style.color = 'var(--bad)'; } }
      return 'stop';
    }
  }
}

// ================= loadouts: three saved sets of gear and talents =================
function findOwned(id) {
  for (const s of SLOTS) if (S.equip[s] && S.equip[s].id === id) return { where: 'equip', it: S.equip[s] };
  let it = S.inv.find((q) => q.id === id); if (it) return { where: 'inv', it };
  if (LV && LV.type === 'town') { it = S.stash.find((q) => q.id === id); if (it) return { where: 'stash', it }; }
  return null;
}
function applyLoadout(i) {
  const L = S.loadouts[i]; if (!L) return;
  let missing = 0;
  for (const s of SLOTS) {
    const id = L.eq[s]; if (!id) continue;
    if (S.equip[s] && S.equip[s].id === id) continue;
    const f = findOwned(id); if (!f || f.where === 'equip') { missing++; continue; }
    const list = f.where === 'inv' ? S.inv : S.stash, prev = S.equip[s];
    list.splice(list.indexOf(f.it), 1); S.equip[s] = f.it; if (prev) list.push(prev);
  }
  let note = '';
  if (L.cls === S.cls && JSON.stringify(L.tal) !== JSON.stringify(S.tal)) {
    if (LV.type === 'town') S.tal = Object.assign({}, L.tal); else note = ' Talents change only in town.';
  }
  Panel.sel = null; afterGear(); sfx('craft');
  toast(`${L.name} equipped.${missing ? ` ${missing} piece${missing > 1 ? 's' : ''} not found${LV.type === 'town' ? '' : ' (stash pieces load in town)'}.` : ''}${note}`, 'var(--brass-2)');
}
function loadoutsHtml() {
  const rows = [0, 1, 2].map((i) => {
    const L = S.loadouts[i];
    if (!L) return `<div class="row"><div><div class="t">Empty slot ${i + 1}</div><div class="d">Saves what you are wearing now and how your talents are spent.</div></div><button class="btn" type="button" data-act="loSave" data-k="${i}">Save current</button></div>`;
    const icons = SLOTS.map((s) => { const f = L.eq[s] ? findOwned(L.eq[s]) : null; return f ? `<span class="lo-i r${f.it.rarity}${f.it.set ? ' set' : ''}" title="${esc(f.it.name)}">${itemIcon(f.it)}</span>` : `<span class="lo-i none" title="${L.eq[s] ? 'Missing' : 'Empty'}">${svg(s === 'weapon' ? 'fists' : s)}</span>`; }).join('');
    const pts = Object.values(L.tal).reduce((a, b) => a + b, 0);
    return `<div class="row"><div style="min-width:0"><input id="loName${i}" class="lo-name" maxlength="24" value="${esc(L.name)}" aria-label="Loadout name" data-k="${i}"><div class="lo-icons">${icons}</div><div class="d">${pts} talent point${pts === 1 ? '' : 's'}${L.cls !== S.cls ? ' (another class)' : ''}</div></div>
      <div class="acts"><button class="btn" type="button" data-act="loLoad" data-k="${i}">Equip</button><button class="btn ghost" type="button" data-act="loSave" data-k="${i}">Overwrite</button><button class="btn ghost" type="button" data-act="loClear" data-k="${i}">Clear</button></div></div>`;
  }).join('');
  return `<p class="hint" style="margin:0 0 12px">Swap between builds in one press. Gear from your bag works anywhere; stash gear and talent changes apply in town.</p><div class="rows">${rows}</div>`;
}
