// ================= icons =================
const IC = {
  sword: '<path d="M18.5 4.5 20 4l-.5 1.5L9 16l-1-1z"/><path d="M6 13l5 5"/><path d="M7.5 16.5 4 20"/>',
  axe: '<path d="M6 20 16 6"/><path d="M13 4c4-1 8 2 7 6-2-1-4-1-5-3z"/>',
  dagger: '<path d="M16 5l2 1-7 8-1-1z"/><path d="M8 11l5 5"/><path d="M9.5 14.5 6 18"/>',
  spear: '<path d="M4 20 17 7"/><path d="M15 5l5-1-1 5z"/>',
  hammer: '<path d="M6 20l8-10"/><path d="M11 5l8 8-3 3-8-8z"/>',
  bow: '<path d="M7 4c10 3 10 13 0 16"/><path d="M7 4v16"/><path d="M4 12h15m-3-2 3 2-3 2"/>',
  staff: '<path d="M7 20l8-12"/><circle cx="17" cy="6" r="3"/>',
  fists: '<path d="M7 11h10v6a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3zM7 11V8m3 3V7m3 4V7m3 4V8"/>',
  helm: '<path d="M5 15c0-8 14-8 14 0v3h-5v-4h-4v4H5z"/>',
  chest: '<path d="M8 4 4 7l2 5 1-1v9h10v-9l1 1 2-5-4-3c-1 2-7 2-8 0z"/>',
  boots: '<path d="M8 4h5v10l6 2v4H8z"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M9 6l3-3 3 3-3 2z"/>',
  amulet: '<path d="M5 4c1 6 4 9 7 10 3-1 6-4 7-10"/><path d="M12 14l3 3-3 4-3-4z"/>',
  potion: '<path d="M10 3h4v5l4 7a4 4 0 0 1-4 6h-4a4 4 0 0 1-4-6l4-7z"/><path d="M7 15h10"/>',
  gpotion: '<path d="M10 3h4v5l4 7a4 4 0 0 1-4 6h-4a4 4 0 0 1-4-6l4-7z"/><path d="M7 15h10M12 11v8M8 17h8"/>',
  scroll: '<path d="M7 4h10a2 2 0 0 1 2 2v12H9a2 2 0 0 1-2-2zM7 4a2 2 0 0 0-2 2v2h2m10 12a2 2 0 0 0 2-2v-2"/><path d="M10 9h6M10 12h6"/>',
  dodge: '<path d="M4 12h12m-4-5 5 5-5 5"/><path d="M4 7h4M4 17h4"/>',
  bag: '<path d="M5 9h14l-1 11H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${IC[k] || ''}</svg>`;
const itemIcon = (it) => svg(it.slot === 'weapon' ? it.kind : it.slot);

// ================= HUD =================
function toast(text, color, big) {
  const box = $('#toasts');
  const el = document.createElement('div'); el.className = 'toast' + (big ? ' big' : '');
  el.style.borderLeftColor = color || 'var(--brass)';
  if (color && !big) el.style.color = color;
  el.textContent = text; box.prepend(el);
  while (box.children.length > 6) box.lastChild.remove();
  setTimeout(() => el.remove(), big ? 4200 : 3200);
}
let bannerT = 0;
function banner(t, sub) { const b = $('#banner'); b.innerHTML = `${esc(t)}<small>${esc(sub || '')}</small>`; b.classList.add('on'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), 2600); }
const SLOTS_BAR = [
  { id: 'atk', key: 'LMB', icon: () => (ST ? ST.wk : 'sword'), act: () => {}, title: 'Attack: hold the left mouse button or J' },
  { id: 'dodge', key: 'Space', icon: () => 'dodge', act: () => tryDodge(), title: 'Roll: Space, Shift or right mouse' },
  { id: 'pot', key: 'Q', icon: () => 'potion', act: () => usePotion(false), title: 'Healing Draught' },
  { id: 'gpot', key: 'R', icon: () => 'gpotion', act: () => usePotion(true), title: 'Greater Draught' },
  { id: 'scroll', key: 'T', icon: () => 'scroll', act: () => useScroll(), title: 'Portal Scroll' },
  { id: 'bag', key: 'I', icon: () => 'bag', act: () => openPanel('bag'), title: 'Bag and character' },
];
function buildActionBar() {
  const bar = $('#actionBar');
  bar.innerHTML = SLOTS_BAR.map((s) => `<button class="slot" type="button" data-slot="${s.id}" title="${esc(s.title)}"><span class="k">${s.key}</span><span class="ic">${svg(s.icon())}</span><span class="n"></span><span class="cd"></span></button>`).join('');
  bar.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => { const s = SLOTS_BAR.find((q) => q.id === b.dataset.slot); s.act(); }));
}
let lastWk = '';
function hud() {
  if (!S || !ST || !LV) return;
  $('#hLvl').textContent = 'Lv ' + S.level;
  const f = clamp(P.hp / ST.maxHp, 0, 1);
  $('#hpFill').style.width = f * 100 + '%';
  $('#hpText').textContent = `${Math.ceil(Math.max(0, P.hp))} / ${ST.maxHp}`;
  $('#xpFill').style.width = clamp(S.xp / xpNeed(S.level), 0, 1) * 100 + '%';
  $('#hGold').textContent = fmt(S.gold) + ' gold';
  $('#hMisc').textContent = `Bag ${S.inv.length}/${BAG_CAP}`;
  const buffs = [];
  if (RUN) { if (RUN.buffs.might) buffs.push('Might'); if (RUN.buffs.stone) buffs.push('Stoneskin'); if (RUN.buffs.swift) buffs.push('Gale'); if (RUN.rested) buffs.push('Rested'); }
  if (P.frenzy) buffs.push('Frenzy ×' + P.frenzy);
  if (P.chillT > 0) buffs.push('Chilled'); if (P.burnT > 0) buffs.push('Burning');
  $('#hBuffs').innerHTML = buffs.map((b) => `<span class="buff">${b}</span>`).join('');
  if (LV.type === 'town') { $('#hLoc').textContent = 'Hearthdeep'; $('#hObj').textContent = 'Shops restock each time you return. The Delve waits at the south gate.'; }
  else {
    const B = biomeOf(LV.depth);
    $('#hLoc').textContent = `Depth ${LV.depth} · ${B.name}`;
    let o;
    if (LV.boss) o = bossRef ? `Slay ${bossRef.name}` : enemies.some((e) => e.boss && !e.dead) ? 'Something vast waits beyond the antechamber' : 'Take the stairs down or the way home';
    else o = 'Find the stairs down';
    if (LV.depth % 5 === 1) o += ' · A way home stands in the first room';
    $('#hObj').textContent = o;
  }
  if (bossRef) $('#bossFill').style.width = clamp(bossRef.hp / bossRef.maxHp, 0, 1) * 100 + '%';
  // action bar
  const set = (id, n, cd) => { const b = document.querySelector(`[data-slot="${id}"]`); if (!b) return; b.querySelector('.n').textContent = n === null ? '' : n; b.querySelector('.cd').style.height = cd ? clamp(cd, 0, 1) * 100 + '%' : '0'; };
  if (ST.wk !== lastWk) { lastWk = ST.wk; const b = document.querySelector('[data-slot="atk"] .ic'); if (b) b.innerHTML = svg(ST.wk); }
  set('atk', null, P.atkT > 0 ? P.atkT / (curWeapon().cd) : 0);
  set('dodge', null, P.dodgeCd > 0 ? P.dodgeCd / 0.85 : 0);
  set('pot', S.potions, 0); set('gpot', S.gpotions, 0); set('scroll', S.scrolls, 0); set('bag', null, 0);
  $('#tPot').innerHTML = svg('potion') + `<b>${S.potions + S.gpotions}</b>`;
  $('#tScroll').innerHTML = svg('scroll') + `<b>${S.scrolls}</b>`;
  $('#tBag').innerHTML = svg('bag');
}

// ================= panels =================
const Panel = { kind: null, tab: null, sel: null, forge: {}, elix: {} };
function isPaused() { return !started || Panel.kind !== null || !$('#title').hidden || !$('#death').hidden; }
function openPanel(kind, tab) {
  Panel.kind = kind; Panel.sel = null;
  Panel.tab = tab || { bag: 'gear', home: 'home', smith: 'buy', trader: 'buy', alch: 'buy', delve: 'delve' }[kind];
  if ((kind === 'smith') && !S.shop) restock();
  $('#panel').hidden = false; mouseDown = false; touchAtk = false;
  renderPanel();
  $('#pClose').focus({ preventScroll: true });
}
function closePanel() { Panel.kind = null; $('#panel').hidden = true; hud(); }
function restock() {
  const il = Math.max(1, S.best);
  S.shop = { items: [] };
  for (let k = 0; k < 6; k++) S.shop.items.push(genItem(il + randi(0, 1), { mf: 60, min: k < 2 ? 2 : 1, slot: k === 0 ? 'weapon' : undefined }));
}
const buyPrice = (it) => Math.round(it.value * 4);
const goodsPrice = (base) => Math.round(base * (1 + S.best * 0.06));
function findItem(src, id) {
  if (src === 'equip') return S.equip[id];
  const list = src === 'inv' ? S.inv : src === 'stash' ? S.stash : src === 'stock' ? (S.shop ? S.shop.items : []) : [];
  return list.find((it) => String(it.id) === String(id));
}
function selected() { return Panel.sel ? findItem(Panel.sel.src, Panel.sel.id) : null; }
function itemCard(it, cmp) {
  const W = it.slot === 'weapon' ? WEAPONS[it.kind] : null;
  const um = 1 + 0.1 * it.up, am = 1 + 0.05 * it.up;
  let base = '';
  const main = it.base ? it.base * um : 0;
  let diff = '';
  if (cmp && cmp !== it && (cmp.base || it.base)) {
    const cm = (cmp.base || 0) * (1 + 0.1 * cmp.up);
    const dd = main - cm;
    if (Math.abs(dd) >= 0.5) diff = ` <span class="${dd > 0 ? 'up' : 'dn'}">${dd > 0 ? '▲' : '▼'} ${fmt(Math.abs(dd))}</span>`;
  }
  if (W) base = `<div class="base"><b>${fmt(main)}</b> damage${diff} <span class="sub">· ${W.cd.toFixed(2)}s · ${W.ranged ? 'ranged' : 'reach ' + W.range.toFixed(1)}</span></div>`;
  else if (it.base) base = `<div class="base"><b>${fmt(main)}</b> armor${diff}</div>`;
  const affs = it.aff.map((a) => `<li>${esc(AFF[a.k].l(a.v * am)).replace(/^\+ ?/, '')}</li>`).join('');
  const leg = it.power ? `<div class="leg">${esc(legendOf(it).desc)}</div>` : '';
  return `<div class="icard"><div class="nm r${it.rarity}">${esc(it.name)}${it.up ? ` <span class="r0">+${it.up}</span>` : ''}</div>
    <div class="sub">${RAR[it.rarity].n} ${esc(typeName(it))} · ${SLOT_N[it.slot]}</div>${base}${affs ? `<ul>${affs}</ul>` : ''}${leg}
    <div class="meta"><span>Item level ${it.il}</span><span>Sells for ${fmt(it.value)}g</span>${cmp && cmp !== it ? `<span>vs ${esc(cmp.name)}</span>` : ''}</div></div>`;
}
const cellsHtml = (list, src, cap, priceFn) => {
  let h = list.map((it) => `<button class="cell r${it.rarity}${Panel.sel && Panel.sel.src === src && String(Panel.sel.id) === String(it.id) ? ' on' : ''}" type="button" data-act="sel" data-src="${src}" data-id="${it.id}" title="${esc(it.name)}">${itemIcon(it)}${it.up ? `<b>+${it.up}</b>` : ''}${priceFn ? `<i>${fmt(priceFn(it))}</i>` : ''}</button>`).join('');
  if (cap) for (let k = list.length; k < Math.min(cap, list.length + 6); k++) h += '<div class="cell empty"></div>';
  return `<div class="cells">${h}</div>`;
};
function eqHtml() {
  return `<div class="eq-grid">${SLOTS.map((sl) => { const it = S.equip[sl]; const on = Panel.sel && Panel.sel.src === 'equip' && Panel.sel.id === sl;
    return `<button class="eqs ${it ? 'r' + it.rarity : ''}${on ? ' on' : ''}" type="button" data-act="sel" data-src="equip" data-id="${sl}"${it ? '' : ' disabled'}>${it ? itemIcon(it) : svg(sl === 'weapon' ? 'fists' : sl)}<div style="min-width:0"><span>${SLOT_N[sl]}</span><em class="${it ? 'r' + it.rarity : ''}">${it ? esc(it.name) : 'Empty'}</em></div></button>`; }).join('')}</div>`;
}
function costChips(c) {
  return `<div class="costs">${Object.entries(c).map(([k, v]) => { const have = k === 'gold' ? S.gold : S.mats[k] || 0; return `<span class="cost${have >= v ? '' : ' no'}">${k === 'gold' ? fmt(v) + ' gold' : `${v} ${MATS[k].n}`} <span style="opacity:.6">(${fmt(have)})</span></span>`; }).join('')}</div>`;
}
const purseRow = () => `<div class="purse-row"><span><b>${fmt(S.gold)}</b> gold</span><span>Bag ${S.inv.length}/${BAG_CAP}</span><span>Draughts ${S.potions} · Greater ${S.gpotions} · Scrolls ${S.scrolls}</span><span>Essence ${S.mats.essence || 0}</span></div>`;

function detailFor(it, ctx) {
  if (!it) return `<div class="icard"><div class="hint">${ctx === 'shopbuy' ? 'Select an item to inspect it and compare it with what you wear.' : 'Select an item to inspect it. Items in your bag compare against what you have equipped.'}</div></div>`;
  const src = Panel.sel.src;
  const eq = S.equip[it.slot];
  let acts = '';
  if (src === 'inv') {
    acts += `<button class="btn" type="button" data-act="equip">Equip</button>`;
    if (ctx === 'sell') acts += `<button class="btn ghost" type="button" data-act="sell">Sell for ${fmt(it.value)}g</button>`;
    if (ctx === 'stash') acts += `<button class="btn ghost" type="button" data-act="stashPut"${S.stash.length >= stashCap() ? ' disabled' : ''}>Move to stash</button>`;
    acts += `<button class="btn ghost" type="button" data-act="salvage">Salvage for ${RAR[it.rarity].salv + it.up} essence</button>`;
  } else if (src === 'equip') {
    acts += `<button class="btn ghost" type="button" data-act="unequip"${S.inv.length >= BAG_CAP ? ' disabled' : ''}>Unequip</button>`;
  } else if (src === 'stash') {
    acts += `<button class="btn" type="button" data-act="stashTake"${S.inv.length >= BAG_CAP ? ' disabled' : ''}>Move to bag</button>`;
  } else if (src === 'stock') {
    const p = buyPrice(it);
    acts += `<button class="btn" type="button" data-act="buy"${S.gold < p || S.inv.length >= BAG_CAP ? ' disabled' : ''}>Buy for ${fmt(p)}g</button>`;
  }
  return `${itemCard(it, src === 'equip' ? null : eq)}<div class="acts">${acts}</div>${src !== 'equip' && eq ? `<div class="hint">Currently worn:</div>${itemCard(eq)}` : ''}`;
}
function renderPanel() {
  const p = Panel; if (!p.kind) return;
  let title = '', sub = '', tabs = [], body = '';
  const it = selected();
  switch (p.kind) {
    case 'bag': {
      title = 'Bag'; sub = `Level ${S.level} delver`;
      tabs = [['gear', 'Gear'], ['mats', 'Materials'], ['char', 'Character']];
      if (p.tab === 'gear') body = purseRow() + `<div class="inv"><section><h3>Equipped</h3>${eqHtml()}</section><section><h3>Bag<small>${S.inv.length}/${BAG_CAP}</small></h3>${S.inv.length ? cellsHtml(S.inv, 'inv', BAG_CAP) : '<p class="hint">Empty. Loot drops from foes, chests and bosses; walk over an item to pick it up.</p>'}<div class="acts" style="margin-top:10px"><button class="btn ghost" type="button" data-act="salvageJunk"${S.inv.some((q) => q.rarity <= 1) ? '' : ' disabled'}>Salvage all Common and Uncommon</button></div></section><section class="detail">${detailFor(it, 'bag')}</section></div>`;
      else if (p.tab === 'mats') body = matsHtml();
      else body = charHtml();
      break;
    }
    case 'smith': {
      title = "Orla's Anvil"; sub = 'Weapons and armour, restocked every time you come home';
      tabs = [['buy', 'Buy'], ['sell', 'Sell']];
      if (p.tab === 'buy') body = purseRow() + `<div class="inv"><section><h3>Equipped</h3>${eqHtml()}</section><section><h3>On the rack<small>item level ${Math.max(1, S.best)}+</small></h3>${S.shop.items.length ? cellsHtml(S.shop.items, 'stock', 0, buyPrice) : '<p class="hint">Sold out until your next descent.</p>'}</section><section class="detail">${detailFor(it, 'shopbuy')}</section></div>`;
      else body = sellHtml(it);
      break;
    }
    case 'trader': {
      title = 'Copper Lantern'; sub = 'Desh buys anything and sells the basics';
      tabs = [['buy', 'Supplies'], ['sell', 'Sell gear']];
      if (p.tab === 'buy') {
        const goods = [['iron', 16, 'For forging, upgrades and portal scrolls'], ['herb', 10, 'For draughts'], ['essence', 45, 'For upgrades, rerolls and forging'], ['bone', 22, 'For home upgrades and rare forging'], ['dust', 18, 'For portal scrolls']];
        body = purseRow() + `<div class="goods">${goods.map(([k, b, d]) => { const pr = goodsPrice(b); return `<div class="row"><div><div class="t">${MATS[k].n}<small>have ${S.mats[k] || 0}</small></div><div class="d">${d}</div></div><div class="acts"><button class="btn" type="button" data-act="buyMat" data-k="${k}" data-n="1" data-p="${pr}"${S.gold < pr ? ' disabled' : ''}>${fmt(pr)}g</button><button class="btn ghost" type="button" data-act="buyMat" data-k="${k}" data-n="5" data-p="${pr * 5}"${S.gold < pr * 5 ? ' disabled' : ''}>×5</button></div></div>`; }).join('')}</div>`;
      } else body = sellHtml(it);
      break;
    }
    case 'alch': {
      title = 'Bramble & Vial'; sub = 'Wick brews what you are too busy to make';
      tabs = [['buy', 'Shelves']];
      const goods = [['potions', 'Healing Draught', 30, 'Restores 40% health. Q to drink.'], ['gpotions', 'Greater Draught', 95, 'Restores 75% health. R to drink.'], ['scrolls', 'Portal Scroll', 45, 'Opens a way home from any depth. T to read.'], ['might', 'Elixir of Might', 280, '+25% damage for one descent.'], ['stone', 'Elixir of Stoneskin', 280, '+40% armor for one descent.'], ['swift', 'Elixir of the Gale', 360, '+15% move and attack speed for one descent.']];
      body = purseRow() + `<div class="goods">${goods.map(([k, n, b, d]) => { const pr = goodsPrice(b); const have = S[k] !== undefined ? S[k] : S.elixirs[k]; return `<div class="row"><div><div class="t">${n}<small>have ${have}</small></div><div class="d">${d}</div></div><button class="btn" type="button" data-act="buyGood" data-k="${k}" data-p="${pr}"${S.gold < pr ? ' disabled' : ''}>${fmt(pr)}g</button></div>`; }).join('')}</div>`;
      break;
    }
    case 'home': {
      title = 'Home'; sub = HOME.house.levels[S.home.house].n;
      tabs = [['home', 'Upgrades'], ['craft', 'Workbench'], ['work', 'Workshop'], ['stash', 'Stash']];
      if (p.tab === 'home') body = homeHtml();
      else if (p.tab === 'craft') body = craftHtml();
      else if (p.tab === 'work') body = workHtml(it);
      else body = purseRow() + `<div class="inv"><section><h3>Bag<small>${S.inv.length}/${BAG_CAP}</small></h3>${cellsHtml(S.inv, 'inv', BAG_CAP)}</section><section><h3>Stash<small>${S.stash.length}/${stashCap()}</small></h3>${cellsHtml(S.stash, 'stash', stashCap())}<p class="hint">A bigger house holds more.</p></section><section class="detail">${detailFor(it, 'stash')}</section></div>`;
      break;
    }
    case 'delve': {
      title = 'The Delve'; sub = `Deepest reached: ${S.best || 'none yet'} · Bosses slain: ${S.bossKills}`;
      tabs = [['delve', 'Descend']];
      body = delveHtml();
      break;
    }
  }
  $('#pTitle').innerHTML = `${esc(title)}<small>${esc(sub)}</small>`;
  $('#pTabs').innerHTML = tabs.length > 1 ? tabs.map(([k, n]) => `<button class="tab${p.tab === k ? ' on' : ''}" type="button" data-act="tab" data-tab="${k}">${n}</button>`).join('') : '';
  $('#pBody').innerHTML = body;
}
function sellHtml(it) {
  const junk = S.inv.filter((q) => q.rarity <= 1);
  return purseRow() + `<div class="inv"><section><h3>Equipped</h3>${eqHtml()}</section><section><h3>Your bag<small>${S.inv.length}/${BAG_CAP}</small></h3>${S.inv.length ? cellsHtml(S.inv, 'inv', 0, (q) => q.value) : '<p class="hint">Nothing to sell.</p>'}<div class="acts" style="margin-top:10px"><button class="btn ghost" type="button" data-act="sellJunk"${junk.length ? '' : ' disabled'}>Sell all Common and Uncommon (${fmt(junk.reduce((a, q) => a + q.value, 0))}g)</button></div></section><section class="detail">${detailFor(it, 'sell')}</section></div>`;
}
function matsHtml() {
  const keys = Object.keys(MATS);
  return `${purseRow()}<div class="mats">${keys.map((k) => `<div class="mat"><i style="background:${MATS[k].c}"></i><span>${MATS[k].n}<small>${MATS[k].where}</small></span><b>${S.mats[k] || 0}</b></div>`).join('')}</div>
    <h3 style="margin-top:18px">Elixirs<small>drink them at the Delve gate</small></h3><div class="mats">${[['might', 'Elixir of Might'], ['stone', 'Elixir of Stoneskin'], ['swift', 'Elixir of the Gale']].map(([k, n]) => `<div class="mat"><i style="background:var(--brass)"></i><span>${n}</span><b>${S.elixirs[k]}</b></div>`).join('')}</div>`;
}
function charHtml() {
  const s = ST, w = WEAPONS[s.wk];
  const red = (s.armor / (s.armor + 40 + 9 * Math.max(1, S.best)) * 100).toFixed(0);
  const rows = [
    ['Damage per hit', fmt(s.dmg)], ['Weapon', `${w.n} · ${(w.cd / (1 + s.aspd / 100)).toFixed(2)}s`], ['Critical chance', s.crit.toFixed(1) + '%'], ['Critical damage', '+' + Math.round(50 + s.critd) + '%'],
    ['Max health', fmt(s.maxHp)], ['Armor', `${fmt(s.armor)} (${red}% at depth ${Math.max(1, S.best)})`], ['Health per second', s.regen.toFixed(1)], ['Life steal', s.ls.toFixed(1) + '%'],
    ['Move speed', '+' + Math.round(s.move) + '%'], ['Attack speed', '+' + Math.round(s.aspd) + '%'], ['Burn chance', Math.round(s.burn) + '%'], ['Chill chance', Math.round(s.chill) + '%'],
    ['Gold found', '+' + Math.round(s.gold) + '%'], ['Magic find', '+' + Math.round(s.mf) + '%'],
    ['Experience', `${fmt(S.xp)} / ${fmt(xpNeed(S.level))}`], ['Deepest depth', S.best], ['Foes slain', fmt(S.kills)], ['Bosses slain', S.bossKills], ['Descents', S.runs], ['Times fallen', S.deaths],
  ];
  const pw = Object.keys(s.powers).map((k) => LEGENDS.find((l) => l.power === k));
  return `<div class="stats">${rows.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>${pw.length ? `<h3 style="margin-top:16px">Legendary powers</h3>${pw.map((l) => `<p class="hint" style="color:var(--r4)">${esc(l.name)}: ${esc(l.desc)}</p>`).join('')}` : ''}`;
}
function homeHtml() {
  const restBtn = S.rested ? '<span class="hint">You are rested for your next descent.</span>' : '<button class="btn" type="button" data-act="rest">Sleep until morning</button>';
  return purseRow() + `<div class="rows"><div class="row"><div><div class="t">Your bed</div><div class="d">Sleep to wake rested: +${6 + 4 * S.home.house}% max health for your next descent.</div></div>${restBtn}</div>
    ${Object.entries(HOME).map(([k, h]) => { const lvl = S.home[k], next = h.levels[lvl + 1];
      return `<div class="row"><div><div class="t">${h.levels[lvl].n}<small>${h.n} · ${lvl + 1}/${h.levels.length}</small></div><div class="d">${h.fx(lvl)}</div>${next ? `<div class="d" style="margin-top:6px;color:var(--fg)">Next: ${next.n}. ${h.fx(lvl + 1)}</div>${costChips(next.cost)}` : '<div class="d" style="color:var(--brass-2)">Fully built.</div>'}</div>${next ? `<button class="btn" type="button" data-act="homeUp" data-k="${k}"${hasCost(next.cost) ? '' : ' disabled'}>Build</button>` : ''}</div>`; }).join('')}</div>`;
}
function craftHtml() {
  return purseRow() + `<p class="hint" style="margin:0 0 12px">${esc(HOME.bench.levels[S.home.bench].n)}. Better benches unlock more recipes; upgrade it from the Upgrades tab.</p><div class="rows">${RECIPES.map((r) => {
    const locked = r.bench > S.home.bench;
    const can = !locked && hasCost(r.cost) && (!r.forge || S.inv.length < BAG_CAP);
    const fs = Panel.forge[r.id] || 'weapon';
    return `<div class="row${locked ? ' locked' : ''}"><div><div class="t">${r.n}${locked ? `<small>needs ${esc(HOME.bench.levels[r.bench].n)}</small>` : ''}</div><div class="d">${r.d}</div>${r.forge && !locked ? `<div class="slotpick">${SLOTS.map((sl) => `<button type="button" class="${fs === sl ? 'on' : ''}" data-act="forgeSlot" data-r="${r.id}" data-s="${sl}">${SLOT_N[sl]}</button>`).join('')}</div>` : ''}${costChips(r.cost)}</div><button class="btn" type="button" data-act="craft" data-r="${r.id}"${can ? '' : ' disabled'}>Craft</button></div>`;
  }).join('')}</div>`;
}
function upCost(it) { return { essence: 3 + it.up * 3, iron: 2 + it.up * 2, gold: Math.round(it.value * (it.up + 1) * 0.6) }; }
function rerollCost(it) { return { essence: 6 + it.rarity * 2, gold: Math.round(it.value * 0.5) }; }
function workHtml(it) {
  const all = [...SLOTS.map((s) => S.equip[s]).filter(Boolean), ...S.inv];
  let act = '<div class="icard"><div class="hint">Pick a piece of gear to upgrade it (+10% to its base stat and +5% to its affixes per level) or reroll its affixes.</div></div>';
  if (it) {
    const cap = benchCap();
    const uc = upCost(it), rc = rerollCost(it);
    act = itemCard(it) + `<div class="row"><div><div class="t">Upgrade to +${it.up + 1}</div>${it.up >= cap ? `<div class="d">${it.up >= 10 ? 'Maximum level reached.' : 'A better workbench can push this further.'}</div>` : costChips(uc)}</div><button class="btn" type="button" data-act="upItem"${it.up < cap && hasCost(uc) ? '' : ' disabled'}>Upgrade</button></div>
      <div class="row"><div><div class="t">Reroll affixes</div><div class="d">${it.rarity === 0 ? 'Common gear has no affixes to reroll.' : 'Keeps rarity, level and upgrades.'}</div>${it.rarity ? costChips(rc) : ''}</div><button class="btn" type="button" data-act="reroll"${it.rarity && hasCost(rc) ? '' : ' disabled'}>Reroll</button></div>`;
  }
  const sel = (q) => Panel.sel && String(Panel.sel.id) === String(q.id);
  const src = (q) => (SLOTS.some((s) => S.equip[s] === q) ? 'equip' : 'inv');
  const cell = (q) => `<button class="cell r${q.rarity}${sel(q) || (Panel.sel && Panel.sel.src === 'equip' && S.equip[Panel.sel.id] === q) ? ' on' : ''}" type="button" data-act="sel" data-src="${src(q)}" data-id="${src(q) === 'equip' ? q.slot : q.id}" title="${esc(q.name)}">${itemIcon(q)}${q.up ? `<b>+${q.up}</b>` : ''}</button>`;
  return purseRow() + `<div class="two"><section><h3>Your gear<small>worn first</small></h3><div class="cells">${all.map(cell).join('')}</div></section><section class="detail">${act}</section></div>`;
}
function delveHtml() {
  const B = (d) => biomeOf(d).name;
  const wps = S.waypoints.map((d) => `<button class="wpb" type="button" data-act="delve" data-d="${d}"><b>Depth ${d}</b><span>${B(d)}${cycleOf(d) ? ` · Cycle ${cycleOf(d) + 1}` : ''}</span><span>${d === 1 ? 'From the top' : 'Waypoint from a slain boss'}</span></button>`).join('');
  const el = [['might', 'Elixir of Might', '+25% damage'], ['stone', 'Elixir of Stoneskin', '+40% armor'], ['swift', 'Elixir of the Gale', '+15% speed']];
  const tog = el.map(([k, n, d]) => `<button class="tog${Panel.elix[k] ? ' on' : ''}" type="button" data-act="elix" data-k="${k}"${S.elixirs[k] ? '' : ' disabled'}>${Panel.elix[k] ? '✓' : '○'} ${n} <span class="hint">${d} · have ${S.elixirs[k]}</span></button>`).join('');
  return purseRow() + `<p class="hint" style="margin:0 0 12px">Every floor below is new. Every fifth depth holds a boss; slay it to open a waypoint. Floors 1, 6, 11 and so on keep a way home in the first room. Portal scrolls open one anywhere.${S.rested ? ' <b style="color:var(--ok)">You are rested.</b>' : ''}</p>
    <div class="wp">${wps}</div><h3 style="margin-top:18px">Drink before descending</h3><div class="wp">${tog}</div>
    ${S.inv.length > BAG_CAP - 6 ? `<p class="hint" style="color:var(--bad)">Your bag is nearly full (${S.inv.length}/${BAG_CAP}). Sell, stash or salvage first.</p>` : ''}`;
}

// ================= panel actions =================
function doAct(d) {
  const it = selected();
  switch (d.act) {
    case 'tab': Panel.tab = d.tab; Panel.sel = null; break;
    case 'sel': Panel.sel = { src: d.src, id: d.id }; break;
    case 'equip': {
      if (!it) break; const prev = S.equip[it.slot];
      S.inv.splice(S.inv.indexOf(it), 1); S.equip[it.slot] = it; if (prev) S.inv.push(prev);
      Panel.sel = { src: 'equip', id: it.slot }; afterGear(); sfx('craft'); break;
    }
    case 'unequip': if (it && S.inv.length < BAG_CAP) { S.equip[it.slot] = null; S.inv.push(it); Panel.sel = { src: 'inv', id: it.id }; afterGear(); } break;
    case 'salvage': if (it) { S.inv.splice(S.inv.indexOf(it), 1); const n = RAR[it.rarity].salv + it.up; addMat('essence', n); toast(`Salvaged into ${n} essence`, MATS.essence.c); Panel.sel = null; sfx('craft'); } break;
    case 'salvageJunk': { const j = S.inv.filter((q) => q.rarity <= 1); let n = 0; for (const q of j) { n += RAR[q.rarity].salv + q.up; S.inv.splice(S.inv.indexOf(q), 1); } addMat('essence', n); toast(`Salvaged ${j.length} items into ${n} essence`, MATS.essence.c); Panel.sel = null; sfx('craft'); break; }
    case 'sell': if (it) { S.inv.splice(S.inv.indexOf(it), 1); S.gold += it.value; Panel.sel = null; sfx('buy'); } break;
    case 'sellJunk': { const j = S.inv.filter((q) => q.rarity <= 1); let g = 0; for (const q of j) { g += q.value; S.inv.splice(S.inv.indexOf(q), 1); } S.gold += g; toast(`Sold ${j.length} items for ${fmt(g)} gold`, 'var(--brass-2)'); Panel.sel = null; sfx('buy'); break; }
    case 'buy': if (it) { const p = buyPrice(it); if (S.gold >= p && S.inv.length < BAG_CAP) { S.gold -= p; S.shop.items.splice(S.shop.items.indexOf(it), 1); S.inv.push(it); Panel.sel = { src: 'inv', id: it.id }; Panel.tab = 'buy'; toast(`Bought ${it.name}`, `var(--r${it.rarity})`); sfx('buy'); } } break;
    case 'buyMat': { const p = +d.p; if (S.gold >= p) { S.gold -= p; addMat(d.k, +d.n); sfx('buy'); } break; }
    case 'buyGood': { const p = +d.p; if (S.gold >= p) { S.gold -= p; if (S[d.k] !== undefined) S[d.k]++; else S.elixirs[d.k]++; sfx('buy'); } break; }
    case 'stashPut': if (it && S.stash.length < stashCap()) { S.inv.splice(S.inv.indexOf(it), 1); S.stash.push(it); Panel.sel = { src: 'stash', id: it.id }; } break;
    case 'stashTake': if (it && S.inv.length < BAG_CAP) { S.stash.splice(S.stash.indexOf(it), 1); S.inv.push(it); Panel.sel = { src: 'inv', id: it.id }; } break;
    case 'rest': S.rested = true; toast('You sleep soundly. Rested for your next descent.', 'var(--ok)'); break;
    case 'homeUp': {
      const h = HOME[d.k], next = h.levels[S.home[d.k] + 1];
      if (next && hasCost(next.cost)) { payCost(next.cost); S.home[d.k]++; toast(`Built: ${next.n}`, 'var(--brass-2)', true); sfx('level'); if (d.k !== 'bench') { const px = P.x, pz = P.z; loadTown(); P.x = px; P.z = pz; snapCamera(); } ST = calcStats(); }
      break;
    }
    case 'forgeSlot': Panel.forge[d.r] = d.s; break;
    case 'craft': {
      const r = RECIPES.find((q) => q.id === d.r);
      if (!r || r.bench > S.home.bench || !hasCost(r.cost)) break;
      if (r.forge) {
        if (S.inv.length >= BAG_CAP) break;
        payCost(r.cost);
        const ni = genItem(Math.max(1, S.best), { slot: Panel.forge[r.id] || 'weapon', rarity: r.forge, mf: 50 });
        S.inv.push(ni); toast(`Forged ${ni.name}`, `var(--r${ni.rarity})`, true);
      } else { payCost(r.cost); toast(`Crafted ${r.make()}`, 'var(--brass-2)'); }
      sfx('craft'); break;
    }
    case 'upItem': if (it) { const c = upCost(it); if (it.up < benchCap() && hasCost(c)) { payCost(c); it.up++; it.value = Math.round(it.value * 1.15); toast(`${it.name} is now +${it.up}`, `var(--r${it.rarity})`); afterGear(); sfx('craft'); } } break;
    case 'reroll': if (it && it.rarity) { const c = rerollCost(it); if (hasCost(c)) { payCost(c); rollAffixes(it); if (it.rarity < 4) nameItem(it); toast(`New affixes on ${it.name}`, `var(--r${it.rarity})`); afterGear(); sfx('craft'); } } break;
    case 'elix': Panel.elix[d.k] = !Panel.elix[d.k]; break;
    case 'delve': { const el = Object.keys(Panel.elix).filter((k) => Panel.elix[k]); Panel.elix = {}; startDelve(+d.d, el); return; }
  }
  renderPanel(); hud(); save();
}
function afterGear() {
  const before = ST.maxHp; ST = calcStats();
  if (LV.type === 'town') P.hp = ST.maxHp; else P.hp = Math.min(ST.maxHp, P.hp + Math.max(0, ST.maxHp - before));
  placePlayerMesh();
}
$('#panel').addEventListener('click', (ev) => {
  if (ev.target === $('#panel')) { closePanel(); return; }
  const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
  const keep = $('#pBody').scrollTop;
  doAct(Object.assign({}, b.dataset));
  if (Panel.kind) {
    $('#pBody').scrollTop = keep;
    if (b.dataset.act === 'sel' && window.innerWidth <= 860) { const det = $('#pBody .detail'); if (det) det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
});
$('#pClose').addEventListener('click', closePanel);
