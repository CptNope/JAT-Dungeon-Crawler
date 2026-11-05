// Built from src/ by build.sh — edit src/, not this file.
window.startHearthdeep = function (THREE) {
'use strict';
// ================= utilities =================
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function wpick(entries) {
  let t = 0; for (const e of entries) t += e[1];
  let r = Math.random() * t;
  for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n).toString());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const roman = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);
let uid = 1;

// ================= materials =================
const MATS = {
  iron: { n: 'Iron Ore', c: '#a7a9b4', where: 'Ore veins and most foes' },
  herb: { n: 'Bitterleaf', c: '#7fbf6a', where: 'Herb clumps, your garden' },
  essence: { n: 'Arcane Essence', c: '#b98cf0', where: 'Salvaged gear, rare drops' },
  bone: { n: 'Old Bone', c: '#d9d0b8', where: 'Sunken Crypt, depths 1 to 5' },
  dust: { n: 'Grave Dust', c: '#8e8a99', where: 'Sunken Crypt, depths 1 to 5' },
  spore: { n: 'Spore Sac', c: '#c9a35a', where: 'Fungal Hollows, depths 6 to 10' },
  chitin: { n: 'Chitin Plate', c: '#7a9a6a', where: 'Fungal Hollows, depths 6 to 10' },
  ember: { n: 'Ember Core', c: '#f08a3a', where: 'Magma Forge, depths 11 to 15' },
  obsidian: { n: 'Obsidian', c: '#7b6a8e', where: 'Magma Forge, depths 11 to 15' },
  shard: { n: 'Frost Shard', c: '#9fd4f0', where: 'Rime Halls, depths 16 to 20' },
  pelt: { n: 'Rime Pelt', c: '#d6e2ea', where: 'Rime Halls, depths 16 to 20' },
  voiddust: { n: 'Void Dust', c: '#8d7cf0', where: 'The Hollow Rift, depths 21 to 25' },
  starglass: { n: 'Star Glass', c: '#f0e08a', where: 'The Hollow Rift, depths 21 to 25' },
  sigil: { n: 'Boss Sigil', c: '#f19a33', where: 'Every fifth depth, from its boss' },
};

// ================= biomes & enemies =================
const BIOMES = [
  { id: 'crypt', name: 'Sunken Crypt', floor: 0x3d3a47, floor2: 0x34323e, wall: 0x5c5768, torch: 0xffb46a, fog: 0x0c0b12, amb: 0x77709a, bolt: 0xb48cff, eye: 0xffe08a, mats: ['bone', 'dust'], deco: 'bones',
    enemies: { grunt: ['Risen Skeleton', 0xd8d2c0], brute: ['Grave Ghoul', 0x7d8b6a], archer: ['Bone Archer', 0xcfc6ae], caster: ['Crypt Acolyte', 0x7e5fb5], skitter: ['Carrion Bat', 0x5b4b5a], bomber: ['Corpse Bloat', 0x8a9a5b], summoner: ['Necromancer', 0x5a3d7a], warden: ['Tomb Warden', 0x8f8c96] },
    boss: { name: 'The Bone Regent', shape: 'summoner', color: 0xe8dfc4, patterns: ['ring', 'summon', 'slam', 'fan'] } },
  { id: 'fungal', name: 'Fungal Hollows', floor: 0x2f3a2c, floor2: 0x293326, wall: 0x4b5a3e, torch: 0xc6ff7a, fog: 0x0a110b, amb: 0x6a9a6a, bolt: 0xc6e85a, eye: 0xd6ff6a, mats: ['spore', 'chitin'], deco: 'shrooms',
    enemies: { grunt: ['Sporeling', 0xb59a6a], brute: ['Mycelid Brute', 0x8a6a8a], archer: ['Spore Spitter', 0xa8b85a], caster: ['Shroom Shaman', 0xc46a5a], skitter: ['Cave Mite', 0x6a7a4a], bomber: ['Puffball', 0xd6c48a], summoner: ['Spore Mother', 0x9a5a8a], warden: ['Chitin Guard', 0x5a7a5a] },
    boss: { name: 'Mother Mycelia', shape: 'bomber', color: 0xc46a8a, patterns: ['spiral', 'summon', 'meteor', 'ring'] } },
  { id: 'magma', name: 'Magma Forge', floor: 0x3a2622, floor2: 0x2f201d, wall: 0x5a332b, torch: 0xff7a2a, fog: 0x140806, amb: 0x9a5a44, bolt: 0xff8a3a, eye: 0xffd24a, mats: ['ember', 'obsidian'], deco: 'cracks',
    enemies: { grunt: ['Cinder Imp', 0xd0603a], brute: ['Molten Golem', 0x6a3a2a], archer: ['Flame Slinger', 0xc07a4a], caster: ['Pyromancer', 0xa03a3a], skitter: ['Ember Wisp', 0xffa04a], bomber: ['Magma Bomb', 0x3a2a2a], summoner: ['Furnace Priest', 0x7a2a2a], warden: ['Obsidian Sentinel', 0x3a3448] },
    boss: { name: 'Ashmaw the Forge-Wyrm', shape: 'brute', color: 0x8a3a24, patterns: ['charge', 'fan', 'meteor', 'ring'] } },
  { id: 'frost', name: 'Rime Halls', floor: 0x5a6878, floor2: 0x52606f, wall: 0x8297ac, torch: 0x9fd4ff, fog: 0x0b1218, amb: 0x8aaad0, bolt: 0x9fe0ff, eye: 0x9ff0ff, mats: ['shard', 'pelt'], deco: 'ice',
    enemies: { grunt: ['Frostbitten Raider', 0x9aa8b8], brute: ['Rime Troll', 0xc8d8e8], archer: ['Ice Huntress', 0x7a9ab8], caster: ['Frost Witch', 0x5a7ab8], skitter: ['Rime Mite', 0xe8f4ff], bomber: ['Cryo Bloat', 0x8ac8e8], summoner: ['Winter Caller', 0x3a5a8a], warden: ['Glacier Knight', 0x6a8aa8] },
    boss: { name: 'The Rime Sovereign', shape: 'warden', color: 0xb8d8f0, patterns: ['fan', 'ring', 'slam', 'charge'] } },
  { id: 'void', name: 'The Hollow Rift', floor: 0x241e34, floor2: 0x1e192c, wall: 0x3c3158, torch: 0xb08cff, fog: 0x07050d, amb: 0x6a5aaa, bolt: 0xd06cff, eye: 0xff6cf0, mats: ['voiddust', 'starglass'], deco: 'shards',
    enemies: { grunt: ['Hollow Thrall', 0x5a4a7a], brute: ['Null Brute', 0x3a2a5a], archer: ['Rift Archer', 0x7a5aaa], caster: ['Void Seer', 0x9a4ad0], skitter: ['Glimmer Wisp', 0xd0b0ff], bomber: ['Unstable Rift', 0x6a2aa0], summoner: ['Star Weaver', 0x2a2a6a], warden: ['Abyssal Warden', 0x2a2040] },
    boss: { name: 'The Hollow Star', shape: 'caster', color: 0x9a6aff, patterns: ['teleport', 'spiral', 'ring', 'summon'] } },
];
const biomeOf = (d) => BIOMES[Math.floor((d - 1) / 5) % 5];
const cycleOf = (d) => Math.floor((d - 1) / 25);

const ARCH = {
  grunt: { hp: 40, dmg: 9, spd: 3.4, r: 0.42, xp: 8, ai: 'melee', range: 1.25, cd: 1.1, w: 30, from: 1 },
  skitter: { hp: 14, dmg: 5, spd: 5.4, r: 0.32, xp: 3, ai: 'melee', range: 0.95, cd: 0.8, w: 18, from: 1 },
  archer: { hp: 30, dmg: 8, spd: 3.0, r: 0.4, xp: 10, ai: 'ranged', range: 8, cd: 1.8, w: 15, from: 1 },
  brute: { hp: 110, dmg: 17, spd: 2.5, r: 0.68, xp: 22, ai: 'charger', range: 1.6, cd: 2.0, w: 9, from: 2 },
  caster: { hp: 34, dmg: 10, spd: 2.7, r: 0.42, xp: 13, ai: 'caster', range: 8, cd: 2.7, w: 10, from: 2 },
  bomber: { hp: 26, dmg: 24, spd: 3.6, r: 0.48, xp: 9, ai: 'bomber', range: 1.7, cd: 0, w: 8, from: 3 },
  summoner: { hp: 46, dmg: 6, spd: 2.6, r: 0.42, xp: 18, ai: 'summoner', range: 9, cd: 5.5, w: 4, from: 4 },
  warden: { hp: 150, dmg: 14, spd: 2.2, r: 0.6, xp: 24, ai: 'melee', range: 1.5, cd: 1.6, w: 6, from: 5, armor: 0.35 },
};

const EAFF = {
  swift: { n: 'Swift', col: 0x7fe0ff, ap(e) { e.spd *= 1.45; } },
  armored: { n: 'Armored', col: 0xb0b8c8, ap(e) { e.arm = Math.min(0.7, e.arm + 0.35); } },
  vampiric: { n: 'Vampiric', col: 0xd0304a, ap(e) { e.vamp = 1; } },
  molten: { n: 'Molten', col: 0xff7a2a, ap(e) { e.burn = 1; } },
  frozen: { n: 'Frozen', col: 0x9fd4ff, ap(e) { e.chill = 1; } },
  splitting: { n: 'Splitting', col: 0x9adf6a, ap(e) { e.split = 1; } },
  regenerating: { n: 'Regenerating', col: 0x6ae08a, ap(e) { e.regen = 0.025; } },
  explosive: { n: 'Explosive', col: 0xffb02a, ap(e) { e.explode = 1; } },
  mighty: { n: 'Mighty', col: 0xff5a3a, ap(e) { e.dmg *= 1.5; } },
  hulking: { n: 'Hulking', col: 0xc9a36a, ap(e) { e.hp *= 1.8; e.scale *= 1.15; e.r *= 1.15; } },
};
const AURAS = {
  frenzy: { n: 'Frenzy aura', col: 0xff4a3a, d: 'Nearby allies move and strike 35% faster' },
  ward: { n: 'Ward aura', col: 0x4a8aff, d: 'Nearby allies take 40% less damage' },
  rally: { n: 'Rally aura', col: 0x4aff8a, d: 'Nearby allies regenerate' },
};
const LEAD_FIRST = ['Vorrak', 'Grisla', 'Mortane', 'Skarn', 'Uldra', 'Fenwick', 'Hask', 'Brannoc', 'Ysolde', 'Kethra', 'Dunmar', 'Orvo', 'Thessaly', 'Grukk', 'Malvane', 'Sorrow', 'Ibben', 'Corvane'];
const LEAD_TITLE = ['the Unbroken', 'Ironjaw', 'the Hungering', 'Bonecaller', 'the Grim', 'Blackmantle', 'the Pale', 'Skullsplitter', 'the Patient', 'Ashborn', 'of the Deep', 'Gravewarden', 'the Twice-Dead', 'Oathless'];

// ================= items =================
const WEAPONS = {
  fists: { n: 'Fists', dmg: 1, range: 1.45, arc: 1.7, cd: 0.42, kb: 2.5 },
  sword: { n: 'Sword', dmg: 1, range: 1.95, arc: 1.95, cd: 0.46, kb: 3 },
  axe: { n: 'Axe', dmg: 1.5, range: 2.05, arc: 2.5, cd: 0.72, kb: 4.5 },
  dagger: { n: 'Dagger', dmg: 0.6, range: 1.55, arc: 1.4, cd: 0.28, kb: 1.5, crit: 10 },
  spear: { n: 'Spear', dmg: 1.12, range: 3.0, arc: 0.75, cd: 0.56, kb: 3.5 },
  hammer: { n: 'Warhammer', dmg: 1.95, range: 2.25, arc: 3.3, cd: 0.98, kb: 7.5 },
  bow: { n: 'Longbow', dmg: 0.92, cd: 0.5, ranged: 1, pspd: 20, pierce: 0, size: 0.11, col: 0xf0dcb0 },
  staff: { n: 'Staff', dmg: 1.08, cd: 0.66, ranged: 1, pspd: 13, pierce: 2, size: 0.24, col: 0xa98cff },
};
const ARMOR_BASE = { helm: 4, chest: 8, boots: 3 };
const SLOTS = ['weapon', 'helm', 'chest', 'boots', 'ring', 'amulet'];
const SLOT_N = { weapon: 'Weapon', helm: 'Head', chest: 'Body', boots: 'Feet', ring: 'Ring', amulet: 'Neck' };
const RAR = [
  { n: 'Common', m: 1, aff: 0, salv: 1 },
  { n: 'Uncommon', m: 1.1, aff: 1, salv: 2 },
  { n: 'Rare', m: 1.22, aff: 2, salv: 4 },
  { n: 'Epic', m: 1.36, aff: 3, salv: 8 },
  { n: 'Legendary', m: 1.5, aff: 3, salv: 16 },
];
const AFF = {
  dmg: { l: (v) => `+${fmt(v)} damage`, roll: (il) => randi(2, 5) * Math.pow(1.105, il - 1), suf: 'of Ruin' },
  hp: { l: (v) => `+${fmt(v)} max health`, roll: (il) => randi(10, 24) * Math.pow(1.1, il - 1), suf: 'of the Bear' },
  armor: { l: (v) => `+${fmt(v)} armor`, roll: (il) => randi(3, 8) * Math.pow(1.1, il - 1), suf: 'of Bastions' },
  crit: { l: (v) => `+${v.toFixed(1)}% critical chance`, roll: () => rand(2, 7), suf: 'of Precision' },
  critd: { l: (v) => `+${Math.round(v)}% critical damage`, roll: () => rand(10, 35), suf: 'of Butchery' },
  aspd: { l: (v) => `+${Math.round(v)}% attack speed`, roll: () => rand(4, 12), suf: 'of Haste' },
  move: { l: (v) => `+${Math.round(v)}% move speed`, roll: () => rand(3, 9), suf: 'of the Fox' },
  ls: { l: (v) => `${v.toFixed(1)}% life steal`, roll: () => rand(1, 3.5), suf: 'of the Leech' },
  burn: { l: (v) => `${Math.round(v)}% chance to burn`, roll: () => rand(8, 20), suf: 'of Embers' },
  chill: { l: (v) => `${Math.round(v)}% chance to chill`, roll: () => rand(8, 20), suf: 'of Winter' },
  gold: { l: (v) => `+${Math.round(v)}% gold found`, roll: () => rand(10, 35), suf: 'of Greed' },
  mf: { l: (v) => `+${Math.round(v)}% magic find`, roll: () => rand(8, 25), suf: 'of Fortune' },
  regen: { l: (v) => `+${v.toFixed(1)} health per second`, roll: (il) => rand(0.8, 2.4) * Math.pow(1.09, il - 1), suf: 'of Renewal' },
};
const SLOT_AFF = {
  weapon: ['dmg', 'crit', 'critd', 'aspd', 'ls', 'burn', 'chill', 'mf'],
  helm: ['hp', 'armor', 'crit', 'mf', 'regen', 'gold'],
  chest: ['hp', 'armor', 'regen', 'ls', 'move'],
  boots: ['move', 'armor', 'hp', 'gold', 'aspd'],
  ring: ['dmg', 'crit', 'critd', 'aspd', 'ls', 'gold', 'mf', 'burn', 'chill'],
  amulet: ['dmg', 'hp', 'crit', 'critd', 'regen', 'mf', 'gold', 'aspd'],
};
const LEGENDS = [
  { name: 'Stormcaller', power: 'chain', desc: 'Hits have a 30% chance to arc lightning to three nearby foes.' },
  { name: 'Pyre of the Last King', power: 'nova', desc: 'Slain foes burst into flame, scorching everything nearby.' },
  { name: 'Twinfang', power: 'split', desc: 'Every attack also looses two spectral blades.' },
  { name: 'Bloodwake', power: 'vamp', desc: 'Each kill restores 3% of your health.' },
  { name: 'Heart of the Whirlwind', power: 'frenzy', desc: 'Hits grant 4% attack speed, stacking to 40%, fading after 2 seconds.' },
  { name: 'Phoenix Plume', power: 'phoenix', desc: 'Once per floor, a killing blow leaves you standing at 30% health.' },
  { name: 'Midas Knuckle', power: 'midas', desc: 'Foes drop 60% more gold.' },
  { name: 'Gravewind Treads', power: 'ghost', desc: 'Rolling leaves a trail of grave-cold that chills and harms foes.' },
];
const TIERS = ['Rusted', 'Iron', 'Tempered', 'Steel', 'Mithril', 'Runic', 'Starforged', 'Voidwrought', 'Eternal'];
const BASEN = { helm: ['Cap', 'Helm', 'Visage'], chest: ['Jerkin', 'Hauberk', 'Cuirass'], boots: ['Boots', 'Greaves', 'Treads'], ring: ['Band', 'Ring', 'Seal'], amulet: ['Pendant', 'Amulet', 'Talisman'] };
const EPICP = ['Grim', 'Hallowed', 'Dread', 'Sovereign', 'Wailing', 'Gilded', 'Bitter', 'Ashen', 'Moonlit', 'Thundering', 'Hollow', 'Bloodsworn'];

function typeName(it) { return it.slot === 'weapon' ? WEAPONS[it.kind].n : BASEN[it.slot][Math.min(2, Math.floor(it.il / 8))]; }
function nameItem(it) {
  if (it.rarity === 4) { it.name = it.lname; return; }
  const t = TIERS[Math.min(TIERS.length - 1, Math.floor((it.il - 1) / 5))];
  const tn = typeName(it);
  let n = it.slot === 'ring' || it.slot === 'amulet' ? tn : `${t} ${tn}`;
  if (it.rarity === 3) n = `${pick(EPICP)} ${n}`;
  if (it.aff.length && it.rarity >= 1) n += ' ' + AFF[it.aff[0].k].suf;
  it.name = n;
}
function rollRarity(mf, min) {
  const m = 1 + (mf || 0) / 100;
  const w = [[0, 600], [1, 260 * m], [2, 100 * m], [3, 28 * m], [4, 6 * m]].filter((x) => x[0] >= (min || 0));
  return wpick(w);
}
function rollAffixes(it) {
  const pool = [...SLOT_AFF[it.slot]];
  const n = RAR[it.rarity].aff + (it.slot === 'ring' || it.slot === 'amulet' ? 1 : 0);
  it.aff = [];
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice(randi(0, pool.length - 1), 1)[0];
    it.aff.push({ k, v: AFF[k].roll(it.il) * (1 + 0.08 * it.rarity) });
  }
}
function genItem(il, o = {}) {
  il = Math.max(1, Math.round(il));
  const slot = o.slot || wpick([['weapon', 3], ['helm', 1.3], ['chest', 1.3], ['boots', 1.3], ['ring', 1], ['amulet', 1]]);
  const r = o.rarity !== undefined ? o.rarity : rollRarity(o.mf, o.min);
  const it = { id: uid++, slot, rarity: r, il, up: 0, aff: [] };
  if (slot === 'weapon') {
    it.kind = o.kind || pick(['sword', 'axe', 'dagger', 'spear', 'hammer', 'bow', 'staff']);
    it.base = 10 * Math.pow(1.12, il - 1) * WEAPONS[it.kind].dmg * RAR[r].m * rand(0.92, 1.08);
  } else if (ARMOR_BASE[slot]) {
    it.base = ARMOR_BASE[slot] * Math.pow(1.11, il - 1) * RAR[r].m * rand(0.9, 1.1);
  }
  rollAffixes(it);
  if (r === 4) { const L = pick(LEGENDS); it.power = L.power; it.lname = L.name; }
  nameItem(it);
  it.value = Math.round(5 * Math.pow(1.1, il) * [1, 2, 4, 9, 20][r]);
  return it;
}
const legendOf = (it) => LEGENDS.find((l) => l.power === it.power);

// ================= crafting, home, shops =================
const RECIPES = [
  { id: 'potion', n: 'Healing Draught', bench: 0, cost: { herb: 2 }, d: 'Restores 40% of your health.', make() { S.potions++; return 'Healing Draught'; } },
  { id: 'scroll', n: 'Portal Scroll', bench: 0, cost: { iron: 1, dust: 1 }, d: 'Opens a way home from any depth.', make() { S.scrolls++; return 'Portal Scroll'; } },
  { id: 'gpotion', n: 'Greater Draught', bench: 1, cost: { herb: 3, essence: 1 }, d: 'Restores 75% of your health.', make() { S.gpotions++; return 'Greater Draught'; } },
  { id: 'might', n: 'Elixir of Might', bench: 1, cost: { spore: 3, essence: 2 }, d: 'Drink at the Delve: +25% damage for one descent.', make() { S.elixirs.might++; return 'Elixir of Might'; } },
  { id: 'stone', n: 'Elixir of Stoneskin', bench: 1, cost: { chitin: 3, bone: 3 }, d: 'Drink at the Delve: +40% armor for one descent.', make() { S.elixirs.stone++; return 'Elixir of Stoneskin'; } },
  { id: 'swift', n: 'Elixir of the Gale', bench: 2, cost: { pelt: 2, shard: 2 }, d: 'Drink at the Delve: +15% move and attack speed for one descent.', make() { S.elixirs.swift++; return 'Elixir of the Gale'; } },
  { id: 'distill', n: 'Distil Essence', bench: 2, cost: { voiddust: 2, ember: 1 }, d: 'Boil rare residue down into 4 Arcane Essence.', make() { addMat('essence', 4); return '4 Arcane Essence'; } },
  { id: 'forgeR', n: 'Forge Rare Gear', bench: 1, cost: { iron: 8, essence: 4, bone: 3 }, d: 'Choose a slot. Item level matches your deepest depth.', forge: 2 },
  { id: 'forgeE', n: 'Forge Epic Gear', bench: 2, cost: { iron: 12, essence: 10, obsidian: 4, sigil: 1 }, d: 'Choose a slot. Three affixes, guaranteed.', forge: 3 },
  { id: 'forgeL', n: 'Forge Legendary Gear', bench: 3, cost: { essence: 25, starglass: 4, voiddust: 6, sigil: 3 }, d: 'Choose a slot. Comes with a legendary power.', forge: 4 },
];
const HOME = {
  house: { n: 'House', levels: [
    { n: 'Leaky Shack' },
    { n: 'Timber Cottage', cost: { gold: 250, iron: 6 } },
    { n: 'Farmhouse', cost: { gold: 1000, iron: 12, bone: 8 } },
    { n: 'Stone Manor', cost: { gold: 3500, iron: 20, chitin: 10, obsidian: 6 } },
    { n: 'Hearth Keep', cost: { gold: 10000, obsidian: 12, pelt: 8, sigil: 3 } },
  ], fx: (l) => `Stash holds ${12 + 12 * l} items. Resting grants +${6 + 4 * l}% max health for your next descent.` },
  bench: { n: 'Workbench', levels: [
    { n: 'Crude Bench' },
    { n: "Joiner's Bench", cost: { gold: 200, iron: 8 } },
    { n: "Artificer's Table", cost: { gold: 1400, iron: 16, spore: 8 } },
    { n: 'Runeforge', cost: { gold: 6000, ember: 10, shard: 8, sigil: 2 } },
  ], fx: (l) => `Unlocks recipes up to tier ${l + 1}. Upgrades gear to +${[3, 6, 8, 10][l]}.` },
  garden: { n: 'Garden', levels: [
    { n: 'Bare Plot' },
    { n: 'Herb Patch', cost: { gold: 150 } },
    { n: 'Walled Garden', cost: { gold: 800, bone: 6 } },
    { n: 'Glasshouse', cost: { gold: 3000, spore: 10, shard: 4 } },
  ], fx: (l) => (l === 0 ? 'Grows nothing yet.' : `Each time you come home: ${[0, 2, 4, 7][l]} Bitterleaf${l >= 2 ? `, ${l - 1} Arcane Essence` : ''}${l >= 3 ? ', 2 Spore Sacs' : ''}.`) },
  trophy: { n: 'Trophy Hall', levels: [
    { n: 'Empty Wall' },
    { n: 'Trophy Hall', cost: { gold: 600, bone: 12 } },
    { n: 'Hall of Legends', cost: { gold: 5000, sigil: 2, obsidian: 8 } },
  ], fx: (l) => (l === 0 ? 'Boss trophies gather dust.' : `Every boss you have slain grants +${l === 1 ? 3 : 5}% damage and max health.`) },
};
const benchCap = () => [3, 6, 8, 10][S.home.bench];
const stashCap = () => 12 + 12 * S.home.house;
const BAG_CAP = 36;

// ================= save state =================
function newSave() {
  const s = {
    v: 1, gold: 40, level: 1, xp: 0, potions: 3, gpotions: 0, scrolls: 2,
    inv: [], equip: { weapon: null, helm: null, chest: null, boots: null, ring: null, amulet: null }, stash: [],
    mats: { herb: 2, iron: 2 }, home: { house: 0, bench: 0, garden: 0, trophy: 0 },
    bossKills: 0, slain: [], best: 0, kills: 0, deaths: 0, waypoints: [1], shop: null,
    elixirs: { might: 0, stone: 0, swift: 0 }, rested: false, runs: 0,
  };
  return s;
}
let S = null;
let RUN = null; // per-descent state
const addMat = (k, n) => { S.mats[k] = (S.mats[k] || 0) + n; };
const hasCost = (c) => Object.entries(c).every(([k, v]) => (k === 'gold' ? S.gold : S.mats[k] || 0) >= v);
const payCost = (c) => { for (const [k, v] of Object.entries(c)) { if (k === 'gold') S.gold -= v; else S.mats[k] -= v; } };
const xpNeed = (l) => Math.floor(45 * Math.pow(l, 1.55));

// ================= derived stats =================
function calcStats() {
  const s = { maxHp: 100 + (S.level - 1) * 14, dmg: 4 + (S.level - 1) * 1.3, armor: 0, crit: 5, critd: 60, aspd: 0, move: 0, ls: 0, burn: 0, chill: 0, gold: 0, mf: 0, regen: 0.6, powers: {} };
  const w = S.equip.weapon;
  s.wk = w ? w.kind : 'fists';
  for (const sl of SLOTS) {
    const it = S.equip[sl]; if (!it) continue;
    const um = 1 + 0.1 * it.up, am = 1 + 0.05 * it.up;
    if (sl === 'weapon') s.dmg += it.base * um; else if (it.base) s.armor += it.base * um;
    for (const a of it.aff) s[a.k] += a.v * am;
    if (it.power) s.powers[it.power] = 1;
  }
  if (s.wk === 'fists') s.dmg += 5;
  if (WEAPONS[s.wk].crit) s.crit += WEAPONS[s.wk].crit;
  if (S.home.trophy > 0) { const b = (S.home.trophy === 1 ? 0.03 : 0.05) * S.bossKills; s.dmg *= 1 + b; s.maxHp *= 1 + b; }
  if (RUN && LV && LV.type === 'dungeon') {
    if (RUN.buffs.might) s.dmg *= 1.25;
    if (RUN.buffs.stone) s.armor = s.armor * 1.4 + 10;
    if (RUN.buffs.swift) { s.move += 15; s.aspd += 15; }
    if (RUN.rested) s.maxHp *= 1 + (6 + 4 * S.home.house) / 100;
  }
  s.maxHp = Math.round(s.maxHp);
  s.crit = Math.min(75, s.crit);
  return s;
}
let ST = null;
// ================= three.js setup =================
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 160);
const CAM_OFF = new THREE.Vector3(0, 19.5, 10.8);
let camZoom = 1;
const hemi = new THREE.HemisphereLight(0xffffff, 0x303040, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 0.8); sun.position.set(-10, 24, 8); scene.add(sun);
const torch = new THREE.PointLight(0xffc27a, 0, 18, 1.4); scene.add(torch);
let world = new THREE.Group(); scene.add(world);
const fxGroup = new THREE.Group(); scene.add(fxGroup);
let levelDisp = [];

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 60 : 45;
  camZoom = w < h ? 1.05 : 1;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(0.5, 14, 10),
  lsph: new THREE.SphereGeometry(0.5, 8, 6),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  oct: new THREE.OctahedronGeometry(0.5, 0),
  torus: new THREE.TorusGeometry(0.5, 0.06, 6, 18, Math.PI),
  ring: new THREE.RingGeometry(0.88, 1, 48),
  disc: new THREE.CircleGeometry(1, 48),
  plane: new THREE.PlaneGeometry(1, 1),
  fullTorus: new THREE.TorusGeometry(1, 0.1, 8, 32),
};
G.tile = new THREE.PlaneGeometry(1, 1); G.tile.rotateX(-Math.PI / 2);
G.ring.rotateX(-Math.PI / 2);
G.disc.rotateX(-Math.PI / 2);
const _mc = new Map();
function mat(c, glow) {
  const k = c + '|' + (glow || 0);
  if (!_mc.has(k)) {
    const m = glow ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshLambertMaterial({ color: c });
    _mc.set(k, m);
  }
  return _mc.get(k);
}
function lam(c) { return new THREE.MeshLambertMaterial({ color: c }); }
function mesh(geo, m, sx, sy, sz, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.scale.set(sx, sy, sz); o.position.set(x || 0, y || 0, z || 0);
  return o;
}

// ================= draw-call reduction =================
// Each Mesh is one draw call. Static parts that share a material are baked into one geometry
// (threejs-performance: "Merge static geometry"), and a creature's parts are merged once per kind
// and the merged geometry is shared by every creature of that kind.
function mergeGeos(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io++] = a[i] + vo; }
    else for (let i = 0; i < c; i++) idx[io++] = i + vo;
    vo += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
// Bake every plain mesh under root (relative to root) into one merged geometry per material.
// Returns [{ material, geometry }]. Objects flagged userData.live are left alone.
function bakeByMaterial(root, skip) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || (skip && skip(o))) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.live) return;
    if (o.material.transparent) return;
    const g = o.geometry.clone();
    m.multiplyMatrices(inv, o.matrixWorld); g.applyMatrix4(m);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = [];
  for (const [material, geos] of buckets) { out.push({ material, geometry: mergeGeos(geos) }); for (const g of geos) g.dispose(); }
  return out;
}
// Replace a static subtree with merged meshes (one per material). Matrices are composed once.
function bakeStatic(root, skip) {
  const baked = bakeByMaterial(root, skip);
  const keep = [];
  root.traverse((o) => { if (o !== root && (o.isInstancedMesh || o.userData.live || (o.isMesh && (o.material.transparent || (skip && skip(o)))))) keep.push(o); });
  const keepTop = keep.filter((o) => !keep.some((k) => k !== o && isAncestor(k, o)));
  for (const k of keepTop) { const wm = k.matrixWorld.clone(); k.parent.remove(k); k.matrix.copy(wm); k.matrix.decompose(k.position, k.quaternion, k.scale); }
  while (root.children.length) root.remove(root.children[0]);
  for (const b of baked) {
    const me = new THREE.Mesh(b.geometry, b.material);
    me.matrixAutoUpdate = false; me.updateMatrix();
    root.add(me); levelDisp.push(b.geometry);
  }
  for (const k of keepTop) root.add(k);
  return baked.length;
}
function isAncestor(a, b) { for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; }

// ================= creature builders =================
const ROLE_BODY = new THREE.MeshLambertMaterial(), ROLE_DARK = new THREE.MeshLambertMaterial(), ROLE_EYE = new THREE.MeshBasicMaterial(), ROLE_GLOW = new THREE.MeshBasicMaterial();
const creatureCache = new Map();
function makeCreature(kind, color, eyeCol) {
  // merged once per kind; each creature gets its own body/dark materials (for hit flashes and tints)
  if (!creatureCache.has(kind)) {
    const t = buildCreatureTemplate(kind);
    const live = t.g.children.filter((c) => c.userData.float || c.userData.spin);
    for (const c of live) c.userData.live = 1;
    const parts = bakeByMaterial(t.g);
    creatureCache.set(kind, { parts, live: live.map((c) => ({ geo: c.geometry, pos: c.position.clone(), scale: c.scale.clone(), rot: c.rotation.clone(), ud: { ...c.userData } })), h: t.h });
  }
  const T = creatureCache.get(kind);
  const g = new THREE.Group();
  const body = lam(color);
  const dark = lam(new THREE.Color(color).multiplyScalar(0.55));
  const eye = mat(eyeCol || 0xffe08a, 1);
  const map = new Map([[ROLE_BODY, body], [ROLE_DARK, dark], [ROLE_EYE, eye], [ROLE_GLOW, mat(eyeCol || 0xb48cff, 1)]]);
  for (const p of T.parts) g.add(new THREE.Mesh(p.geometry, map.get(p.material) || p.material));
  for (const l of T.live) { const o = new THREE.Mesh(l.geo, map.get(ROLE_GLOW)); o.position.copy(l.pos); o.scale.copy(l.scale); o.rotation.copy(l.rot); o.userData = { ...l.ud }; delete o.userData.live; g.add(o); }
  return { g, mats: [body, dark], h: T.h };
}
function buildCreatureTemplate(kind) {
  const eyeCol = 0;
  const g = new THREE.Group();
  const body = ROLE_BODY, dark = ROLE_DARK, eye = ROLE_EYE;
  let h = 1.4, ey = 1.15, ez = 0.2, es = 0.09;
  switch (kind) {
    case 'grunt':
      g.add(mesh(G.box, body, 0.6, 0.7, 0.4, 0, 0.55, 0), mesh(G.sph, body, 0.48, 0.48, 0.48, 0, 1.12, 0));
      g.add(mesh(G.box, dark, 0.18, 0.55, 0.18, -0.4, 0.55, 0), mesh(G.box, dark, 0.18, 0.55, 0.18, 0.4, 0.55, 0));
      g.add(mesh(G.box, dark, 0.07, 0.07, 0.75, 0.42, 0.45, 0.35));
      break;
    case 'brute':
      g.add(mesh(G.box, body, 0.95, 0.85, 0.62, 0, 0.7, 0));
      g.add(mesh(G.sph, dark, 0.48, 0.48, 0.48, -0.56, 1.08, 0), mesh(G.sph, dark, 0.48, 0.48, 0.48, 0.56, 1.08, 0));
      g.add(mesh(G.sph, body, 0.42, 0.42, 0.42, 0, 1.25, 0.14));
      g.add(mesh(G.box, dark, 0.28, 0.75, 0.28, -0.64, 0.5, 0.05), mesh(G.box, dark, 0.28, 0.75, 0.28, 0.64, 0.5, 0.05));
      h = 1.6; ey = 1.28; ez = 0.32; es = 0.1;
      break;
    case 'archer':
      g.add(mesh(G.box, body, 0.45, 0.65, 0.3, 0, 0.55, 0), mesh(G.sph, body, 0.4, 0.4, 0.4, 0, 1.06, 0));
      { const b = mesh(G.torus, dark, 0.7, 0.7, 0.7, 0.36, 0.72, 0.18); b.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(b); }
      g.add(mesh(G.cone, dark, 0.42, 0.3, 0.42, 0, 1.33, 0));
      h = 1.35; ey = 1.08; ez = 0.17; es = 0.07;
      break;
    case 'caster': {
      g.add(mesh(G.cone, body, 0.85, 1.15, 0.85, 0, 0.58, 0), mesh(G.sph, body, 0.38, 0.38, 0.38, 0, 1.27, 0));
      g.add(mesh(G.cone, dark, 0.46, 0.55, 0.46, 0, 1.62, 0));
      const orb = mesh(G.sph, ROLE_GLOW, 0.24, 0.24, 0.24, 0.38, 1.0, 0.3); orb.userData.float = 1; g.add(orb);
      h = 1.75; ey = 1.29; ez = 0.16; es = 0.07;
      break;
    }
    case 'skitter':
      g.add(mesh(G.sph, body, 0.72, 0.4, 0.82, 0, 0.32, 0));
      for (let i = 0; i < 4; i++) { const l = mesh(G.box, dark, 0.06, 0.06, 0.6, (i < 2 ? -1 : 1) * 0.32, 0.18, i % 2 ? 0.15 : -0.15); l.rotation.y = (i < 2 ? 1 : -1) * 0.9 * (i % 2 ? 1 : -1); g.add(l); }
      h = 0.7; ey = 0.4; ez = 0.34; es = 0.08;
      break;
    case 'bomber':
      g.add(mesh(G.sph, body, 1.05, 0.95, 1.05, 0, 0.6, 0), mesh(G.sph, dark, 0.38, 0.32, 0.38, 0, 1.1, 0.12));
      for (let i = 0; i < 4; i++) g.add(mesh(G.sph, mat(0xffd24a, 1), 0.12, 0.12, 0.12, Math.sin(i * 1.7) * 0.48, 0.5 + (i % 2) * 0.25, Math.cos(i * 1.7) * 0.48));
      h = 1.25; ey = 0.82; ez = 0.47; es = 0.08;
      break;
    case 'summoner': {
      g.add(mesh(G.cone, body, 0.9, 1.45, 0.9, 0, 0.72, 0), mesh(G.sph, body, 0.4, 0.4, 0.4, 0, 1.55, 0));
      g.add(mesh(G.cone, dark, 0.52, 0.6, 0.52, 0, 1.84, -0.04));
      g.add(mesh(G.cyl, dark, 0.07, 1.9, 0.07, 0.45, 0.95, 0.12));
      const gem = mesh(G.oct, ROLE_GLOW, 0.26, 0.34, 0.26, 0.45, 2.0, 0.12); gem.userData.spin = 1; g.add(gem);
      h = 2.0; ey = 1.57; ez = 0.17; es = 0.07;
      break;
    }
    case 'warden':
      g.add(mesh(G.box, body, 0.82, 0.95, 0.56, 0, 0.65, 0), mesh(G.box, body, 0.48, 0.48, 0.48, 0, 1.36, 0));
      g.add(mesh(G.box, dark, 0.62, 0.86, 0.1, -0.24, 0.66, 0.38));
      g.add(mesh(G.box, dark, 0.07, 0.07, 0.9, 0.48, 0.6, 0.3));
      h = 1.75; ey = 1.38; ez = 0.25; es = 0.07;
      break;
  }
  g.add(mesh(G.sph, eye, es, es, es, -0.1, ey, ez), mesh(G.sph, eye, es, es, es, 0.1, ey, ez));
  return { g, h };
}

function weaponMesh(kind) {
  const g = new THREE.Group();
  const metal = mat(0xcfd6df), wood = mat(0x7a5532), gold = mat(0xd6a24a), dark = mat(0x3a3a44);
  switch (kind) {
    case 'sword': g.add(mesh(G.box, metal, 0.09, 0.05, 0.95, 0, 0, 0.62), mesh(G.box, gold, 0.34, 0.07, 0.07, 0, 0, 0.14), mesh(G.box, dark, 0.06, 0.06, 0.22, 0, 0, 0)); break;
    case 'axe': g.add(mesh(G.box, wood, 0.07, 0.07, 1.0, 0, 0, 0.42), mesh(G.box, metal, 0.42, 0.06, 0.3, 0.16, 0, 0.82)); break;
    case 'dagger': g.add(mesh(G.box, metal, 0.07, 0.04, 0.48, 0, 0, 0.36), mesh(G.box, gold, 0.2, 0.05, 0.05, 0, 0, 0.1)); break;
    case 'spear': g.add(mesh(G.box, wood, 0.06, 0.06, 1.8, 0, 0, 0.6), mesh(G.cone4, metal, 0.16, 0.36, 0.16, 0, 0, 1.6)); g.children[1].rotation.x = Math.PI / 2; break;
    case 'hammer': g.add(mesh(G.box, wood, 0.08, 0.08, 1.05, 0, 0, 0.45), mesh(G.box, metal, 0.5, 0.28, 0.28, 0, 0, 0.92)); break;
    case 'bow': { const b = mesh(G.torus, wood, 0.9, 0.9, 0.9, 0, 0, 0.2); b.rotation.set(0, 0, Math.PI / 2); b.rotation.y = Math.PI / 2; g.add(b); g.add(mesh(G.box, mat(0xeeeeee), 0.01, 0.9, 0.01, 0, 0, 0.2)); break; }
    case 'staff': g.add(mesh(G.cyl, wood, 0.07, 1.6, 0.07, 0, 0, 0.3), mesh(G.sph, mat(0xa98cff, 1), 0.22, 0.22, 0.22, 0, 0, 1.14)); g.children[0].rotation.x = Math.PI / 2; break;
    default: g.add(mesh(G.sph, mat(0xe0b896), 0.2, 0.2, 0.2, 0, 0, 0.1));
  }
  return g;
}

function makeHero() {
  const g = new THREE.Group();
  const cloak = mat(0x2f6f73), steel = mat(0x9aa3b0), skin = mat(0xe0b896), leather = mat(0x6a4a32), hair = mat(0x3a2a1e);
  g.add(mesh(G.box, steel, 0.56, 0.62, 0.38, 0, 0.62, 0));
  g.add(mesh(G.box, leather, 0.6, 0.1, 0.42, 0, 0.42, 0));
  g.add(mesh(G.box, cloak, 0.62, 0.78, 0.08, 0, 0.62, -0.24));
  g.add(mesh(G.box, leather, 0.18, 0.36, 0.2, -0.15, 0.16, 0), mesh(G.box, leather, 0.18, 0.36, 0.2, 0.15, 0.16, 0));
  g.add(mesh(G.sph, skin, 0.42, 0.42, 0.42, 0, 1.14, 0));
  g.add(mesh(G.sph, hair, 0.46, 0.3, 0.46, 0, 1.28, -0.05));
  g.add(mesh(G.sph, mat(0x1a1a1a), 0.07, 0.07, 0.07, -0.09, 1.15, 0.19), mesh(G.sph, mat(0x1a1a1a), 0.07, 0.07, 0.07, 0.09, 1.15, 0.19));
  const hand = new THREE.Group(); hand.position.set(0.36, 0.62, 0.1); g.add(hand);
  const off = mesh(G.box, steel, 0.16, 0.42, 0.16, -0.38, 0.62, 0.02); g.add(off);
  const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xd6a24a, transparent: true, opacity: 0.5, depthWrite: false }));
  ring.scale.setScalar(0.55); ring.position.y = 0.03; g.add(ring);
  hand.userData.live = 1;
  const parts = bakeByMaterial(g);
  const out = new THREE.Group();
  for (const p of parts) out.add(new THREE.Mesh(p.geometry, p.material));
  out.add(hand, ring);
  return { g: out, hand };
}

// ================= level generation =================
let LV = null;
function tidx(x, z) { return Math.floor(z) * LV.w + Math.floor(x); }
function solid(i, j) { return i < 0 || j < 0 || i >= LV.w || j >= LV.h || LV.g[j * LV.w + i] !== 1; }
function walkable(x, z) { return !solid(Math.floor(x), Math.floor(z)); }

function genDungeon(depth) {
  const boss = depth % 5 === 0;
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

// ================= level visuals =================
function clearWorld() {
  for (const e of enemies) disposeEnemy(e);
  enemies.length = 0;
  for (const p of projs) world.remove(p.mesh); projs.length = 0;
  for (const t of teles) disposeTele(t); teles.length = 0;
  drops.length = 0; interacts.length = 0;
  clearLabels();
  scene.remove(world);
  world.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
  for (const d of levelDisp) d.dispose();
  levelDisp = [];
  world = new THREE.Group(); scene.add(world);
  for (const p of parts) { p.life = 0; p.m.visible = false; }
}
function instanced(geo, material, list) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  list.forEach((t, i) => {
    e.set(0, t.ry || 0, 0); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, new THREE.Vector3(t.sx, t.sy, t.sz));
    im.setMatrixAt(i, m4);
    if (t.c !== undefined) im.setColorAt(i, c.set(t.c));
  });
  im.count = list.length;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  im.matrixAutoUpdate = false; im.updateMatrix();
  levelDisp.push(material);
  world.add(im);
  return im;
}
function tint(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }

function buildDungeonVisuals() {
  const L = LV, B = biomeOf(L.depth);
  const floors = [], walls = [], tops = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    const v = L.g[j * L.w + i];
    if (v === 1) floors.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: tint((i + j) % 2 ? B.floor : B.floor2, rand(0.88, 1.08)) });
    else {
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < L.w && jj < L.h && L.g[jj * L.w + ii] === 1) { near = true; break; } }
      if (near) {
        const hgt = rand(1.15, 1.45);
        walls.push({ x: i + 0.5, y: hgt / 2, z: j + 0.5, sx: 1, sy: hgt, sz: 1, c: tint(B.wall, rand(0.8, 1.1)) });
        tops.push({ x: i + 0.5, y: hgt + 0.02, z: j + 0.5, sx: 1.02, sy: 0.04, sz: 1.02, c: tint(B.wall, 0.45) });
      }
    }
  }
  instanced(G.tile, new THREE.MeshLambertMaterial({ color: 0xffffff }), floors);
  instanced(G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), walls);
  instanced(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), tops);
  // torches on walls touching rooms
  const torches = [], flames = [];
  for (const r of L.rooms) {
    const n = randi(1, 3);
    for (let k = 0; k < n; k++) {
      const side = randi(0, 3);
      let i, j;
      if (side === 0) { i = randi(r.x, r.x + r.w - 1); j = r.y - 1; }
      else if (side === 1) { i = randi(r.x, r.x + r.w - 1); j = r.y + r.h; }
      else if (side === 2) { i = r.x - 1; j = randi(r.y, r.y + r.h - 1); }
      else { i = r.x + r.w; j = randi(r.y, r.y + r.h - 1); }
      if (!solid(i, j)) continue;
      const ox = side === 2 ? 0.55 : side === 3 ? -0.55 : 0, oz = side === 0 ? 0.55 : side === 1 ? -0.55 : 0;
      torches.push({ x: i + 0.5 + ox, y: 0.95, z: j + 0.5 + oz, sx: 0.1, sy: 0.35, sz: 0.1, c: 0x4a3524 });
      flames.push({ x: i + 0.5 + ox, y: 1.2, z: j + 0.5 + oz, sx: 0.2, sy: 0.3, sz: 0.2, c: B.torch });
    }
  }
  instanced(G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), torches);
  instanced(G.sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), flames);
  // biome decoration
  const deco = [], deco2 = [];
  const st = L.rooms[0];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1 || !chance(0.045)) continue;
    if (i >= st.x && i < st.x + st.w && j >= st.y && j < st.y + st.h) continue;
    const x = i + rand(0.2, 0.8), z = j + rand(0.2, 0.8);
    switch (B.deco) {
      case 'bones': deco.push({ x, y: 0.05, z, sx: rand(0.3, 0.6), sy: 0.08, sz: 0.08, ry: rand(0, 3), c: 0xd8d0b8 }); deco.push({ x: x + 0.1, y: 0.07, z: z + 0.1, sx: 0.14, sy: 0.12, sz: 0.14, ry: 0, c: 0xe8e0c8 }); break;
      case 'shrooms': { const s = rand(0.5, 1.2); deco.push({ x, y: 0.2 * s, z, sx: 0.1 * s, sy: 0.4 * s, sz: 0.1 * s, c: 0xd8d0b8 }); deco2.push({ x, y: 0.42 * s, z, sx: 0.42 * s, sy: 0.2 * s, sz: 0.42 * s, c: pick([0x8aff6a, 0x6affd0, 0xd0ff4a]) }); break; }
      case 'cracks': deco2.push({ x, y: 0.01, z, sx: rand(0.5, 0.9), sy: 0.02, sz: 0.08, ry: rand(0, 3), c: 0xff6a1a }); break;
      case 'ice': deco.push({ x, y: 0.2, z, sx: rand(0.15, 0.3), sy: rand(0.4, 0.9), sz: rand(0.15, 0.3), ry: rand(0, 3), c: 0xcfe8ff }); break;
      case 'shards': deco2.push({ x, y: rand(0.6, 1.4), z, sx: 0.18, sy: 0.32, sz: 0.18, ry: rand(0, 3), c: pick([0xd06cff, 0x8a6cff, 0xff6cf0]) }); break;
    }
  }
  if (deco.length) instanced(B.deco === 'ice' ? G.oct : G.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), deco);
  if (deco2.length) instanced(B.deco === 'shrooms' ? G.sph : B.deco === 'shards' ? G.oct : G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }), deco2);
}

function addBuilding(b, wallC, roofC, opt = {}) {
  const grp = new THREE.Group();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const hh = opt.h || 2.4;
  const w = b.w - (opt.inset || 0.4), d = b.h - (opt.inset || 0.4);
  grp.add(mesh(G.box, mat(wallC), w, hh, d, cx, hh / 2, cz));
  const roof = mesh(G.cone4, mat(roofC), Math.max(w, d) * 0.78, opt.roofH || 2, Math.max(w, d) * 0.78, cx, hh + (opt.roofH || 2) / 2, cz);
  roof.rotation.y = Math.PI / 4; roof.scale.set(w * 0.74, opt.roofH || 2, d * 0.74); grp.add(roof);
  // door and windows on south (+z) or north face
  const fz = opt.north ? b.y + 0.18 : b.y + b.h - 0.18;
  grp.add(mesh(G.box, mat(0x3a2618), 1, 1.5, 0.1, b.door[0] + 0.5, 0.75, fz));
  for (const ox of [-2, 2]) grp.add(mesh(G.box, mat(0xffd68a, 1), 0.7, 0.55, 0.06, b.door[0] + 0.5 + ox, 1.45, fz + (opt.north ? -0.02 : 0.02)));
  world.add(grp);
  return grp;
}
function buildHome() {
  const b = TOWN.home, lvl = S.home.house, cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  const grp = new THREE.Group();
  const door = (z) => grp.add(mesh(G.box, mat(0x3a2618), 1, 1.5, 0.1, b.door[0] + 0.5, 0.75, z));
  const win = (x, y, z) => grp.add(mesh(G.box, mat(0xffd68a, 1), 0.6, 0.5, 0.06, x, y, z));
  if (lvl === 0) {
    const m = mesh(G.box, mat(0x6a4a30), 4.2, 2, 3.6, cx, 1, cz + 1.4); m.rotation.y = 0.04; grp.add(m);
    const r = mesh(G.cone4, mat(0x5a4030), 4.2, 1.3, 3.4, cx, 2.65, cz + 1.4); r.rotation.y = Math.PI / 4 + 0.08; grp.add(r);
    door(cz + 3.25); grp.add(mesh(G.box, mat(0x4a3526), 0.6, 0.6, 0.6, cx + 2.6, 0.3, cz + 2.8));
  } else if (lvl <= 2) {
    const w = lvl === 1 ? 6 : 7.2, d = lvl === 1 ? 5 : 6.2;
    grp.add(mesh(G.box, mat(lvl === 1 ? 0xb58a5a : 0xd8c8a8), w, 2.5, d, cx, 1.25, cz + 0.6));
    const r = mesh(G.cone4, mat(lvl === 1 ? 0x9a3a2a : 0x6a3a2a), 1, 2.1, 1, cx, 3.55, cz + 0.6); r.rotation.y = Math.PI / 4; r.scale.set(w * 0.76, 2.1, d * 0.76); grp.add(r);
    door(cz + 0.6 + d / 2 + 0.03); win(cx - 2, 1.5, cz + 0.6 + d / 2 + 0.03); win(cx + 2, 1.5, cz + 0.6 + d / 2 + 0.03);
    if (lvl === 2) { grp.add(mesh(G.box, mat(0x8a7a6a), 0.7, 2.2, 0.7, cx + 2, 4, cz)); grp.add(mesh(G.box, mat(0x6a4a30), 3, 0.15, 1.2, cx, 2.0, cz + 4.2)); }
  } else {
    const stone = lvl === 3 ? 0x9a9aa2 : 0x8a8a96;
    grp.add(mesh(G.box, mat(stone), 7.4, 4, 6.8, cx, 2, cz + 0.4));
    const r = mesh(G.cone4, mat(0x3a4058), 1, 2.4, 1, cx, 5.2, cz + 0.4); r.rotation.y = Math.PI / 4; r.scale.set(7.4 * 0.76, 2.4, 6.8 * 0.76); grp.add(r);
    door(cz + 3.83);
    for (const y of [1.5, 3.1]) { win(cx - 2.2, y, cz + 3.83); win(cx + 2.2, y, cz + 3.83); }
    grp.add(mesh(G.box, mat(0x7a7a84), 0.8, 2.6, 0.8, cx - 2.4, 6, cz - 0.6));
    if (lvl === 4) {
      for (const ox of [-3.9, 3.9]) {
        grp.add(mesh(G.cyl, mat(0x7a7a86), 1.8, 6, 1.8, cx + ox, 3, cz + 3.4));
        grp.add(mesh(G.cone, mat(0x5a2a3a), 2.2, 2, 2.2, cx + ox, 7, cz + 3.4));
      }
      grp.add(mesh(G.box, mat(0xd6a24a), 0.06, 1.6, 1, cx, 6.6, cz + 0.4), mesh(G.cyl, mat(0x4a4a50), 0.06, 3, 0.06, cx, 7, cz + 0.4));
    }
  }
  world.add(grp);
  // garden east of the house
  if (S.home.garden > 0) {
    const rows = S.home.garden * 2;
    for (let k = 0; k < rows; k++) {
      grp.add(mesh(G.box, mat(0x4a3424), 2.4, 0.18, 0.5, 14.2, 0.09, 4.6 + k * 0.9));
      for (let p = 0; p < 4; p++) grp.add(mesh(G.cone, mat(pick([0x5aa04a, 0x6ab85a, 0x8ac05a])), 0.26, 0.38, 0.26, 13.3 + p * 0.6, 0.35, 4.6 + k * 0.9));
    }
    if (S.home.garden === 3) { const gh = new THREE.Mesh(G.box, new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28 })); gh.scale.set(3, 2, rows * 0.9 + 0.6); gh.position.set(14.2, 1, 4.6 + (rows - 1) * 0.45); levelDisp.push(gh.material); grp.add(gh); }
  }
  // trophies along the path in front of the house
  if (S.home.trophy > 0) {
    const shown = S.slain.slice(-8);
    for (let k = 0; k < 8; k++) {
      const x = 3.6 + k * 1.05, z = 14.6;
      grp.add(mesh(G.box, mat(0x6a6a74), 0.5, 0.9, 0.5, x, 0.45, z));
      if (shown[k]) grp.add(mesh(G.oct, mat(shown[k].c, 1), 0.38, 0.5, 0.38, x, 1.2, z));
    }
  }
}

function buildTownVisuals() {
  const L = LV; const tiles = [], trees = [], crowns = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    const p = L.path[j * L.w + i];
    const c = p ? tint(0xa8916a, rand(0.94, 1.03)) : tint(0x5f8f44, rand(0.95, 1.04));
    tiles.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c });
    if ((i < 2 || j < 2 || i >= L.w - 2 || j >= L.h - 2) && chance(0.55)) {
      const s = rand(0.8, 1.4);
      trees.push({ x: i + rand(0.3, 0.7), y: 0.5 * s, z: j + rand(0.3, 0.7), sx: 0.3 * s, sy: 1 * s, sz: 0.3 * s, c: 0x6a4a32 });
      crowns.push({ x: trees[trees.length - 1].x, y: 1.6 * s, z: trees[trees.length - 1].z, sx: 1.5 * s, sy: 2 * s, sz: 1.5 * s, c: pick([0x2f6a3a, 0x3a7a42, 0x2a5a34, 0x45804a]) });
    }
  }
  instanced(G.tile, new THREE.MeshLambertMaterial({ color: 0xffffff }), tiles);
  instanced(G.cyl, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees);
  instanced(G.cone, new THREE.MeshLambertMaterial({ color: 0xffffff }), crowns);
  buildHome();
  addBuilding(TOWN.smith, 0x5a5560, 0x3a3440);
  world.add(mesh(G.box, mat(0x7a7a84), 0.8, 2.5, 0.8, 22.4, 4.7, 5.2));
  world.add(mesh(G.sph, mat(0xff8a3a, 1), 0.35, 0.35, 0.35, 22.4, 6.1, 5.2));
  world.add(mesh(G.box, mat(0x3a3a44), 0.9, 0.5, 0.45, 18.4, 0.6, 11.2), mesh(G.box, mat(0x4a3424), 0.5, 0.35, 0.4, 18.4, 0.18, 11.2));
  addBuilding(TOWN.alch, 0x6a5a7a, 0x3a6a4a);
  world.add(mesh(G.cyl, mat(0x2a2a30), 0.9, 0.6, 0.9, 30.4, 0.3, 11.2), mesh(G.disc, mat(0x7aff6a, 1), 0.38, 1, 0.38, 30.4, 0.62, 11.2));
  addBuilding(TOWN.trader, 0x9a7a52, 0x8a5a3a, { north: true });
  for (let k = 0; k < 5; k++) world.add(mesh(G.box, mat(k % 2 ? 0xd8c8a8 : 0xb04a3a), 1.1, 0.08, 1.2, 32 + k * 1.1, 2.0, 20.6));
  // well
  world.add(mesh(G.cyl, mat(0x8a8a90), 2, 0.8, 2, 22, 0.4, 17), mesh(G.disc, mat(0x2a4a6a), 0.8, 1, 0.8, 22, 0.7, 17));
  world.add(mesh(G.box, mat(0x6a4a32), 0.12, 1.8, 0.12, 21.1, 1.2, 17), mesh(G.box, mat(0x6a4a32), 0.12, 1.8, 0.12, 22.9, 1.2, 17), mesh(G.box, mat(0x6a4a32), 2.1, 0.12, 0.12, 22, 2.1, 17));
  // lamp posts
  for (const [x, z] of [[6, 14], [16, 14], [27, 14], [38, 14], [19, 24], [25, 24], [19, 30], [25, 30]]) {
    world.add(mesh(G.cyl, mat(0x3a3a44), 0.12, 2.4, 0.12, x, 1.2, z), mesh(G.box, mat(0xffd68a, 1), 0.3, 0.35, 0.3, x, 2.5, z));
  }
  // the delve gate
  world.add(mesh(G.box, mat(0x6a6a74), 2, 3.6, 2, 19, 1.8, 33), mesh(G.box, mat(0x6a6a74), 2, 3.6, 2, 25, 1.8, 33));
  world.add(mesh(G.box, mat(0x5a5a64), 8.4, 1, 2, 22, 4.1, 33));
  world.add(mesh(G.box, mat(0x050508), 4, 0.05, 2, 22, 0.02, 33));
  const vortex = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0x8a5aff, transparent: true, opacity: 0.35, depthWrite: false }));
  vortex.scale.set(1.8, 1, 0.9); vortex.position.set(22, 0.05, 33); vortex.userData.spin = 1; world.add(vortex); levelDisp.push(vortex.material);
  // townsfolk
  const npc = (x, z, c, a) => { const cr = makeCreature('grunt', c, 0x1a1a1a); cr.g.position.set(x, 0, z); cr.g.rotation.y = a; cr.mats.forEach((m) => levelDisp.push(m)); world.add(cr.g); };
  npc(19.2, 11.6, 0x8a6a5a, 0.3); npc(31.4, 11.6, 0x6a5a8a, -0.3); npc(33.2, 19.4, 0xa07a4a, Math.PI);
  vortex.userData.live = 1;
  bakeStatic(world);
}

// ================= interactables =================
const interacts = [];
function addInteract(o) { interacts.push(o); if (o.label) addLabel(o.label, o.x, o.ly || 3.2, o.z, o.cls || 'npc', o); return o; }
// ================= runtime collections =================
const enemies = [], projs = [], teles = [], drops = [], parts = [], lines = [];
const P = { x: 0, z: 0, r: 0.38, face: 0, hp: 100, atkT: 0, swingT: 0, swingDur: 0.15, dodgeT: 0, dodgeCd: 0, dodgeDir: 0, iframes: 0, hurtT: 0, frenzy: 0, frenzyT: 0, burnT: 0, burnD: 0, chillT: 0, dead: false, mesh: null, hand: null, weapon: null, wkind: '', walk: 0, ghostT: 0 };
let flow = null, flowT = 0, flowTile = -1;
let bossRef = null;

// ================= particles & line fx =================
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.visible = false; fxGroup.add(m);
  parts.push({ m, life: 0, vx: 0, vy: 0, vz: 0, max: 1 });
}
let partIdx = 0;
function burst(x, y, z, color, n, spd, size) {
  for (let i = 0; i < n; i++) {
    const p = parts[partIdx = (partIdx + 1) % parts.length];
    p.m.visible = true; p.m.material.color.setHex(color);
    p.m.position.set(x, y, z);
    const s = (size || 0.12) * rand(0.6, 1.3); p.m.scale.setScalar(s);
    const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * (spd || 4);
    p.vx = Math.sin(a) * v; p.vz = Math.cos(a) * v; p.vy = rand(1, 4);
    p.life = p.max = rand(0.35, 0.7);
  }
}
function updParts(dt) {
  for (const p of parts) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.m.visible = false; continue; }
    p.vy -= 12 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    p.m.scale.multiplyScalar(1 - dt * 1.5);
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i]; l.t -= dt;
    l.o.material.opacity = Math.max(0, l.t / l.max);
    if (l.t <= 0) { fxGroup.remove(l.o); l.o.geometry.dispose(); l.o.material.dispose(); lines.splice(i, 1); }
  }
}
function zap(ax, az, bx, bz, color) {
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(lerp(ax, bx, t) + (i % n ? rand(-0.3, 0.3) : 0), 1 + (i % n ? rand(-0.2, 0.3) : 0), lerp(az, bz, t) + (i % n ? rand(-0.3, 0.3) : 0)));
  }
  const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true }));
  fxGroup.add(o); lines.push({ o, t: 0.22, max: 0.22 });
}
const _arcGeo = new Map();
const swings = [];
for (let i = 0; i < 4; i++) {
  // single-sided: the arc lies flat and is only ever seen from above, so no second back-face pass
  const o = new THREE.Mesh(G.tile, new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0, depthWrite: false }));
  o.visible = false; fxGroup.add(o); swings.push({ o, t: 0 });
}
let swingIdx = 0;
function swingFx(a, w) {
  const key = w.range.toFixed(2) + w.arc.toFixed(2);
  if (!_arcGeo.has(key)) { const g = new THREE.RingGeometry(0.35, w.range, 24, 1, -w.arc / 2, w.arc); g.rotateX(-Math.PI / 2); _arcGeo.set(key, g); }
  const s = swings[swingIdx = (swingIdx + 1) % swings.length];
  s.o.geometry = _arcGeo.get(key); s.o.visible = true; s.t = 0.14;
  s.o.position.set(P.x, 0.08, P.z); s.o.rotation.y = a - Math.PI / 2;
}
function updSwings(dt) {
  for (const s of swings) {
    if (s.t <= 0) continue;
    s.t -= dt; s.o.material.opacity = Math.max(0, s.t / 0.14) * 0.4;
    if (s.t <= 0) s.o.visible = false;
  }
}

// ================= labels & floating numbers =================
const labelEls = [];
function addLabel(text, x, y, z, cls, ref) {
  const el = document.createElement('div');
  el.className = 'lbl ' + (cls || '');
  el.textContent = text;
  $('#labels').appendChild(el);
  const L = { el, x, y, z, ref };
  labelEls.push(L);
  return L;
}
function removeLabel(L) { if (!L) return; L.el.remove(); const i = labelEls.indexOf(L); if (i >= 0) labelEls.splice(i, 1); }
function clearLabels() { for (const L of labelEls) L.el.remove(); labelEls.length = 0; }
const floaters = [];
const _v = new THREE.Vector3();
function floatNum(x, y, z, text, cls) {
  let f = floaters.find((q) => q.t <= 0);
  if (!f) {
    if (floaters.length > 50) return;
    const el = document.createElement('div'); el.className = 'fl'; $('#floaters').appendChild(el);
    f = { el, t: 0 }; floaters.push(f);
  }
  f.el.className = 'fl ' + (cls || ''); f.el.textContent = text; f.el.style.display = '';
  f.x = x + rand(-0.3, 0.3); f.y = y; f.z = z; f.t = f.max = cls === 'crit' ? 1 : 0.8;
}
function project(x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight, ok: _v.z < 1 && _v.z > -1 };
}
function updOverlays(dt) {
  for (const f of floaters) {
    if (f.t <= 0) continue;
    f.t -= dt; f.y += dt * 1.6;
    if (f.t <= 0) { f.el.style.display = 'none'; continue; }
    const p = project(f.x, f.y, f.z);
    f.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
    f.el.style.opacity = Math.min(1, f.t / f.max * 2);
  }
  for (const L of labelEls) {
    if (L.ref && L.ref.mesh) { L.x = L.ref.x; L.z = L.ref.z; L.y = L.ref.h * L.ref.scale + 0.55; }
    const far = Math.hypot(L.x - P.x, L.z - P.z) > (L.ref && L.ref.mesh ? 14 : 30);
    const p = project(L.x, L.y, L.z);
    const show = p.ok && !far && !(L.ref && L.ref.hideLabel);
    L.el.style.display = show ? '' : 'none';
    if (show) L.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }
}

// ================= enemies =================
function disposeEnemy(e) {
  world.remove(e.mesh);
  for (const m of e.mats) m.dispose();
  if (e.bar) { world.remove(e.bar); }
  if (e.auraRing) { world.remove(e.auraRing); e.auraRing.material.dispose(); }
  if (e.label) removeLabel(e.label);
  e.mesh = null;
}
const barBgMat = new THREE.MeshBasicMaterial({ color: 0x14141c, depthTest: false });
const barFgMat = new THREE.MeshBasicMaterial({ color: 0xd8473b, depthTest: false });
const barChMat = new THREE.MeshBasicMaterial({ color: 0x5c8ff2, depthTest: false });
function ensureBar(e) {
  if (e.bar || e.boss) return;
  const g = new THREE.Group();
  const bg = new THREE.Mesh(G.plane, barBgMat); bg.scale.set(1, 0.12, 1); bg.renderOrder = 10;
  const fg = new THREE.Mesh(G.plane, e.champ || e.leader ? barChMat : barFgMat); fg.scale.set(0.96, 0.08, 1); fg.position.z = 0.001; fg.renderOrder = 11;
  g.add(bg, fg); g.userData.fg = fg;
  world.add(g); e.bar = g;
}
function spawnEnemy(arch, x, z, o = {}) {
  const A = ARCH[arch], d = RUN.depth, B = biomeOf(d), cyc = cycleOf(d);
  const [name, color] = B.enemies[arch];
  const cr = makeCreature(arch, color, B.eye);
  const hpm = Math.pow(1.15, d - 1) * (1 + cyc * 1.5), dm = Math.pow(1.105, d - 1) * (1 + cyc * 0.8);
  const e = {
    id: uid++, arch, ai: A.ai, A, name, x, z, r: A.r, spd: A.spd * rand(0.92, 1.08), hp: A.hp * hpm, dmg: A.dmg * dm, xp: A.xp * (1 + 0.18 * (d - 1)),
    cd: rand(0.4, 1.4), wind: 0, mesh: cr.g, mats: cr.mats, h: cr.h, scale: 1, arm: A.armor || 0, kx: 0, kz: 0, burnT: 0, burnD: 0, chillT: 0, flashT: 0,
    awake: false, face: rand(0, 6.28), aff: [], bob: rand(0, 6), losT: 0, los: false, color, minions: 0,
  };
  if (o.champ) {
    const ks = Object.keys(EAFF); const n = d > 8 ? 2 : 1;
    for (let i = 0; i < n; i++) { const k = pick(ks.filter((q) => !e.aff.includes(q))); e.aff.push(k); }
    e.champ = 1; e.hp *= 2.6; e.dmg *= 1.3; e.xp *= 3; e.scale = 1.15; e.r *= 1.15;
    e.aff.forEach((k) => EAFF[k].ap(e));
    e.name = e.aff.map((k) => EAFF[k].n).join(' ') + ' ' + name;
    e.mats[0].emissive.setHex(EAFF[e.aff[0]].col).multiplyScalar(0.35);
  }
  if (o.leader) {
    const ks = Object.keys(EAFF);
    for (let i = 0; i < 2; i++) { const k = pick(ks.filter((q) => !e.aff.includes(q) && q !== 'splitting')); e.aff.push(k); }
    e.leader = 1; e.hp *= 5.5; e.dmg *= 1.6; e.xp *= 6; e.scale = 1.4; e.r *= 1.4;
    e.aff.forEach((k) => EAFF[k].ap(e));
    e.aura = pick(Object.keys(AURAS));
    e.name = `${pick(LEAD_FIRST)} ${pick(LEAD_TITLE)}`;
    e.mats[0].emissive.setHex(AURAS[e.aura].col).multiplyScalar(0.25);
    const crown = new THREE.Group();
    for (let k = 0; k < 5; k++) { const sp = mesh(G.cone4, mat(0xf2c56b), 0.12, 0.28, 0.12, Math.sin(k * 1.256) * 0.2, cr.h + 0.12, Math.cos(k * 1.256) * 0.2); crown.add(sp); }
    crown.add(mesh(G.cyl, mat(0xd6a24a), 0.5, 0.08, 0.5, 0, cr.h, 0));
    cr.g.add(crown);
    const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: AURAS[e.aura].col, transparent: true, opacity: 0.2, depthWrite: false }));
    ring.scale.setScalar(7); ring.position.set(x, 0.04, z); world.add(ring); e.auraRing = ring;
  }
  if (o.boss) {
    world.remove(cr.g); cr.mats.forEach((m) => m.dispose());
    const bc = makeCreature(B.boss.shape, B.boss.color, 0xffffff);
    e.mesh = bc.g; e.mats = bc.mats; e.h = bc.h;
    e.boss = 1; e.name = B.boss.name + (cyc ? ' ' + roman(cyc + 1) : '');
    e.hp = 950 * hpm; e.dmg = 15 * dm; e.xp = 400 * (1 + 0.2 * d); e.scale = 2.4; e.r = 1.25; e.spd = 2.6; e.arm = 0.1;
    e.patterns = B.boss.patterns; e.patT = 2; e.color = B.boss.color;
    e.mats[0].emissive.setHex(B.boss.color).multiplyScalar(0.25);
    const crown = new THREE.Group();
    for (let k = 0; k < 7; k++) crown.add(mesh(G.cone4, mat(0xf2c56b, 1), 0.1, 0.36, 0.1, Math.sin(k * 0.9) * 0.24, bc.h + 0.16, Math.cos(k * 0.9) * 0.24));
    bc.g.add(crown);
  }
  e.maxHp = e.hp;
  e.mesh.scale.setScalar(e.scale);
  e.mesh.position.set(x, 0, z);
  world.add(e.mesh);
  if (e.leader) e.label = addLabel(e.name, x, 3, z, 'lead', e);
  else if (e.champ) e.label = addLabel(e.name, x, 3, z, 'champ', e);
  enemies.push(e);
  return e;
}
function wake(e) {
  if (e.awake) return;
  e.awake = true;
  if (e.boss && !bossRef) { bossRef = e; $('#bossBar').hidden = false; $('#bossName').textContent = e.name; banner(e.name, biomeOf(RUN.depth).name); sfx('boss'); }
  // wake the rest of the pack
  for (const o of enemies) if (!o.awake && !o.boss && Math.hypot(o.x - e.x, o.z - e.z) < 7) { o.awake = true; }
}
function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) { const t = i / n; if (!walkable(lerp(ax, bx, t), lerp(az, bz, t))) return false; }
  return true;
}
function collide(o) {
  const minX = Math.floor(o.x - o.r), maxX = Math.floor(o.x + o.r), minZ = Math.floor(o.z - o.r), maxZ = Math.floor(o.z + o.r);
  let hit = false;
  for (let j = minZ; j <= maxZ; j++) for (let i = minX; i <= maxX; i++) {
    if (!solid(i, j)) continue;
    const px = clamp(o.x, i, i + 1), pz = clamp(o.z, j, j + 1);
    const dx = o.x - px, dz = o.z - pz, d2 = dx * dx + dz * dz;
    if (d2 < o.r * o.r) {
      hit = true;
      if (d2 > 1e-7) { const d = Math.sqrt(d2); o.x += (dx / d) * (o.r - d); o.z += (dz / d) * (o.r - d); }
      else { const cx = i + 0.5, cz = j + 0.5; const ax = o.x - cx, az = o.z - cz; if (Math.abs(ax) > Math.abs(az)) o.x = ax > 0 ? i + 1 + o.r : i - o.r; else o.z = az > 0 ? j + 1 + o.r : j - o.r; }
    }
  }
  return hit;
}
function computeFlow() {
  const W = LV.w, H = LV.h;
  if (!flow || flow.length !== W * H) flow = new Int16Array(W * H);
  flow.fill(-1);
  const s = tidx(P.x, P.z); if (LV.g[s] !== 1) return;
  const q = new Int32Array(W * H); let h = 0, t = 0;
  flow[s] = 0; q[t++] = s;
  while (h < t) {
    const c = q[h++], cd = flow[c]; if (cd > 45) continue;
    const x = c % W;
    if (x > 0 && LV.g[c - 1] === 1 && flow[c - 1] < 0) { flow[c - 1] = cd + 1; q[t++] = c - 1; }
    if (x < W - 1 && LV.g[c + 1] === 1 && flow[c + 1] < 0) { flow[c + 1] = cd + 1; q[t++] = c + 1; }
    if (c >= W && LV.g[c - W] === 1 && flow[c - W] < 0) { flow[c - W] = cd + 1; q[t++] = c - W; }
    if (c < W * (H - 1) && LV.g[c + W] === 1 && flow[c + W] < 0) { flow[c + W] = cd + 1; q[t++] = c + W; }
  }
}
const _dir = [0, 0];
const dirOut = (x, z) => { _dir[0] = x; _dir[1] = z; return _dir; };
function steer(e, dist) {
  // returns unit direction toward the player, around walls when needed (shared array: read it right away)
  const dx = P.x - e.x, dz = P.z - e.z;
  if (e.los && dist < 12) return dirOut(dx / (dist || 1), dz / (dist || 1));
  if (!flow) return dirOut(dx / (dist || 1), dz / (dist || 1));
  const W = LV.w, i = Math.floor(e.x), j = Math.floor(e.z);
  let best = flow[j * W + i], bx = 0, bz = 0;
  if (best < 0) best = 1e4;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if (!di && !dj) continue;
    if (di && dj && (solid(i + di, j) || solid(i, j + dj))) continue;
    const ii = i + di, jj = j + dj; if (solid(ii, jj)) continue;
    const f = flow[jj * W + ii];
    if (f >= 0 && f < best) { best = f; bx = ii + 0.5 - e.x; bz = jj + 0.5 - e.z; }
  }
  const l = Math.hypot(bx, bz);
  if (l < 1e-3) return dirOut(dx / (dist || 1), dz / (dist || 1));
  return dirOut(bx / l, bz / l);
}
function enemyFire(e, a, o = {}) {
  const B = biomeOf(RUN.depth);
  spawnProj({ x: e.x + Math.sin(a) * (e.r + 0.2), z: e.z + Math.cos(a) * (e.r + 0.2), a, spd: o.spd || 9, dmg: o.dmg || e.dmg, owner: 'e', size: o.size || 0.2, col: o.col || B.bolt, src: e, life: o.life || 3 });
}
function updEnemy(e, dt) {
  const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz);
  e.losT -= dt;
  if (e.losT <= 0) { e.losT = 0.25 + Math.random() * 0.15; e.los = dist < 16 && los(e.x, e.z, P.x, P.z); }
  if (!e.awake) {
    if (e.boss) { if (dist < 12 && e.los) wake(e); }
    else if (dist < 10 && e.los) wake(e);
    e.bob += dt;
    e.mesh.position.y = Math.sin(e.bob * 2) * 0.02;
    return;
  }
  if (dist > 34 && !e.boss) return;
  // statuses
  let spdM = 1, atkM = 1;
  if (e.chillT > 0) { e.chillT -= dt; spdM *= 0.5; atkM *= 0.7; }
  if (e.burnT > 0) { e.burnT -= dt; e.hpTick = (e.hpTick || 0) + dt; if (e.hpTick > 0.5) { e.hpTick = 0; damageEnemy(e, e.burnD * 0.5, false, 0, 0, 0, false, 'burn'); if (e.dead) return; } }
  if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
  e.auraOn = null;
  if (e.lead && !e.lead.dead && Math.hypot(e.lead.x - e.x, e.lead.z - e.z) < 7) {
    e.auraOn = e.lead.aura;
    if (e.auraOn === 'frenzy') { spdM *= 1.35; atkM *= 1.35; }
    if (e.auraOn === 'rally') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04 * dt);
  }
  if (e.auraRing) e.auraRing.position.set(e.x, 0.04, e.z);
  e.cd -= dt * atkM;
  const spd = e.spd * spdM;
  let mx = 0, mz = 0;
  const faceP = () => { e.face = Math.atan2(dx, dz); };
  if (e.charging > 0) {
    e.charging -= dt;
    mx = Math.sin(e.cdir) * (e.boss ? 15 : 13); mz = Math.cos(e.cdir) * (e.boss ? 15 : 13);
    if (dist < e.r + P.r + 0.2 && !e.chargeHit) { e.chargeHit = 1; hurtPlayer(e.dmg * 1.4, e); P.kx = Math.sin(e.cdir) * 9; P.kz = Math.cos(e.cdir) * 9; }
  } else if (e.boss) { updBoss(e, dt, dist, dx, dz, spd); }
  else if (e.wind > 0) {
    e.wind -= dt * atkM; faceP();
    if (e.wind <= 0) {
      if (e.ai === 'melee' || e.ai === 'charger') { if (dist < e.A.range * e.scale + P.r + 0.35) hurtPlayer(e.dmg, e); swipeFx(e); }
      else if (e.ai === 'ranged') { enemyFire(e, e.face, { spd: 11, size: 0.16 }); }
      else if (e.ai === 'caster') {
        if (e.castAlt = !e.castAlt) { for (let k = -1; k <= 1; k++) enemyFire(e, e.face + k * 0.22, { spd: 8 }); }
        else { for (let k = 0; k < 8; k++) enemyFire(e, e.face + k * Math.PI / 4, { spd: 6.5, size: 0.24 }); }
      } else if (e.ai === 'summoner') {
        for (let k = 0; k < 2; k++) {
          if (e.minions >= 4) break;
          const a = rand(0, 6.28), sx = e.x + Math.sin(a) * 1.2, sz = e.z + Math.cos(a) * 1.2;
          if (!walkable(sx, sz)) continue;
          const m = spawnEnemy('skitter', sx, sz); m.awake = true; m.owner = e; e.minions++; m.xp *= 0.3;
          burst(sx, 0.5, sz, biomeOf(RUN.depth).bolt, 8, 3);
        }
      }
    }
  } else if (e.fuse > 0) {
    e.fuse -= dt;
    e.mats[0].emissive.setHex(Math.sin(e.fuse * 30) > 0 ? 0xff3a1a : 0x000000);
    if (e.fuse <= 0) { explodeEnemy(e); return; }
  } else {
    switch (e.ai) {
      case 'melee': {
        faceP();
        if (dist < e.A.range * e.scale + P.r && e.cd <= 0) { e.wind = 0.38; e.cd = e.A.cd; }
        else if (dist > e.A.range * e.scale * 0.8 + P.r) { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        break;
      }
      case 'charger': {
        faceP();
        if (dist < e.A.range * e.scale + P.r && e.cd <= 0) { e.wind = 0.55; e.cd = e.A.cd; }
        else if (dist > 3 && dist < 8 && e.los && (e.chargeCd || 0) <= 0) { e.chargeCd = 4.5; e.windCharge = 0.6; }
        else { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        e.chargeCd = (e.chargeCd || 0) - dt;
        break;
      }
      case 'ranged': case 'caster': case 'summoner': {
        faceP();
        const keep = e.ai === 'summoner' ? 7 : e.ai === 'caster' ? 6.5 : 6;
        if (dist < keep - 1.5) { mx = -dx / dist * spd; mz = -dz / dist * spd; }
        else if (dist > e.A.range || !e.los) { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        else { const s = Math.sin(e.bob * 0.7) > 0 ? 1 : -1; mx = dz / dist * spd * 0.4 * s; mz = -dx / dist * spd * 0.4 * s; }
        if (e.los && dist < e.A.range + 1 && e.cd <= 0) { e.wind = e.ai === 'ranged' ? 0.35 : 0.6; e.cd = e.A.cd * rand(0.85, 1.2); }
        break;
      }
      case 'bomber': {
        faceP();
        if (dist < e.A.range + P.r) { e.fuse = 0.85; e.tele = telegraph(e.x, e.z, 2.4, 0.85, 0, { visualOnly: true }); }
        else { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        break;
      }
    }
  }
  if (e.windCharge > 0) { e.windCharge -= dt; mx = mz = 0; faceP(); e.flashT = 0.05; if (e.windCharge <= 0) { e.charging = 0.55; e.cdir = Math.atan2(dx, dz); e.chargeHit = 0; } }
  // move
  e.kx *= Math.pow(0.0015, dt); e.kz *= Math.pow(0.0015, dt);
  e.x += (mx + e.kx) * dt; e.z += (mz + e.kz) * dt;
  if (collide(e) && e.charging > 0) { e.charging = 0; }
  // visuals
  e.bob += dt * (Math.abs(mx) + Math.abs(mz) > 0.1 ? 9 : 2);
  e.mesh.position.set(e.x, Math.abs(Math.sin(e.bob)) * 0.08, e.z);
  const cur = e.mesh.rotation.y; e.mesh.rotation.y = cur + angDiff(e.face, cur) * Math.min(1, dt * 12);
  const windGlow = e.wind > 0 || e.windCharge > 0;
  if (e.flashT > 0 || windGlow) { e.flashT -= dt; e.mats[0].emissive.setHex(windGlow && !(e.flashT > 0) ? 0x663322 : 0xffffff).multiplyScalar(windGlow ? 0.5 : 0.8); }
  else if (!(e.fuse > 0)) e.mats[0].emissive.setHex(e.leader ? AURAS[e.aura].col : e.champ ? EAFF[e.aff[0]].col : e.boss ? e.color : 0x000000).multiplyScalar(e.leader ? 0.25 : e.champ ? 0.35 : e.boss ? 0.25 : 0);
  if (e.wind > 0 && e.ai !== 'ranged') e.mesh.scale.setScalar(e.scale * (1 + 0.08 * Math.sin(e.wind * 30)));
  else e.mesh.scale.setScalar(e.scale);
  for (const c of e.mesh.children) { if (c.userData.float) c.position.y = 1.0 + Math.sin(e.bob) * 0.1; if (c.userData.spin) c.rotation.y += dt * 2; }
  if (e.bar) {
    e.bar.position.set(e.x, e.h * e.scale + 0.3, e.z); e.bar.quaternion.copy(camera.quaternion);
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.userData.fg.scale.x = 0.96 * f; e.bar.userData.fg.position.x = -0.48 * (1 - f);
  }
}
function swipeFx(e) { burst(e.x + Math.sin(e.face) * e.r * 1.4, 0.8, e.z + Math.cos(e.face) * e.r * 1.4, 0xffffff, 4, 2, 0.08); }
function explodeEnemy(e) {
  if (e.tele) { disposeTele(e.tele); teles.splice(teles.indexOf(e.tele), 1); e.tele = null; }
  burst(e.x, 0.6, e.z, 0xff9a3a, 22, 7, 0.2); sfx('boom');
  if (Math.hypot(P.x - e.x, P.z - e.z) < 2.4 + P.r) hurtPlayer(e.dmg, e);
  e.hp = 0; killEnemy(e, true);
}
function separate() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead || !a.awake) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead || !b.awake) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, nz = dz / d;
        const wa = a.boss ? 0 : 1, wb = b.boss ? 0 : 1;
        a.x -= nx * push * wa; a.z -= nz * push * wa; b.x += nx * push * wb; b.z += nz * push * wb;
      }
    }
    // keep off the player
    const dx = a.x - P.x, dz = a.z - P.z, rr = a.r + P.r, d2 = dx * dx + dz * dz;
    if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); a.x += dx / d * (rr - d); a.z += dz / d * (rr - d); }
  }
}

// ================= bosses =================
function updBoss(e, dt, dist, dx, dz, spd) {
  const p2 = e.hp < e.maxHp * 0.5;
  if (p2 && !e.p2) { e.p2 = 1; banner('Enraged', e.name); burst(e.x, 1.5, e.z, e.color, 30, 8, 0.25); }
  if (e.charging > 0) return; // handled by generic movement
  if (e.windCharge > 0) return;
  if (e.casting) { e.casting.t -= dt; e.casting.tick(dt); e.face = Math.atan2(dx, dz); if (e.casting.t <= 0) e.casting = null; return; }
  e.face = Math.atan2(dx, dz);
  e.patT -= dt;
  if (dist > 3.5) { const [sx, sz] = steer(e, dist); e.x += sx * spd * 0.75 * dt; e.z += sz * spd * 0.75 * dt; }
  else if (e.cd <= 0) { e.wind = 0; e.cd = 1.6; telegraph(e.x + Math.sin(e.face) * 1.8, e.z + Math.cos(e.face) * 1.8, 2.2, 0.6, e.dmg * 1.3, {}); }
  if (e.patT <= 0) { e.patT = p2 ? 1.7 : 2.6; bossPattern(e, pick(e.patterns), p2); }
}
function bossPattern(e, p, p2) {
  const B = biomeOf(RUN.depth);
  const ring = (n, spd, off) => { for (let k = 0; k < n; k++) enemyFire(e, (off || 0) + (k / n) * Math.PI * 2, { spd, size: 0.3, dmg: e.dmg * 0.8 }); };
  switch (p) {
    case 'ring': {
      ring(p2 ? 22 : 15, 7);
      if (p2) { let fired = false; e.casting = { t: 0.5, tick: () => { if (!fired && e.casting.t < 0.1) { fired = true; ring(22, 6, 0.14); } } }; }
      break;
    }
    case 'spiral': {
      let acc = 0, a = rand(0, 6.28);
      e.casting = { t: p2 ? 2.8 : 2.0, tick: (dt) => { acc += dt; while (acc > 0.075) { acc -= 0.075; a += 0.32; enemyFire(e, a, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); enemyFire(e, a + Math.PI, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); if (p2) enemyFire(e, a + Math.PI / 2, { spd: 7, size: 0.26, dmg: e.dmg * 0.7 }); } } };
      break;
    }
    case 'fan': {
      let shots = 0, acc = 0.36;
      e.casting = { t: 1.2, tick: (dt) => { acc += dt; if (acc > 0.36 && shots < (p2 ? 4 : 3)) { acc = 0; shots++; const a0 = Math.atan2(P.x - e.x, P.z - e.z); for (let k = -3; k <= 3; k++) enemyFire(e, a0 + k * 0.15, { spd: 10, size: 0.28, dmg: e.dmg * 0.8 }); } } };
      break;
    }
    case 'slam': {
      let n = 0, acc = 0.5;
      e.casting = { t: p2 ? 2 : 1.6, tick: (dt) => { acc += dt; if (acc > 0.5 && n < (p2 ? 4 : 3)) { acc = 0; n++; telegraph(P.x, P.z, 2.4, 0.85, e.dmg * 1.6, {}); } } };
      break;
    }
    case 'meteor': {
      const n = p2 ? 9 : 6;
      for (let k = 0; k < n; k++) { const a = rand(0, 6.28), r = k === 0 ? 0 : rand(1.5, 5); const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (walkable(x, z)) telegraph(x, z, 1.8, 1.1 + k * 0.08, e.dmg * 1.5, { col: 0xff7a2a }); }
      break;
    }
    case 'charge': {
      e.windCharge = 0.7;
      if (p2) e.patT = 1.1;
      break;
    }
    case 'summon': {
      let alive = enemies.filter((q) => !q.dead && q.owner === e).length;
      for (let k = 0; k < 3 && alive < 7; k++) {
        const a = rand(0, 6.28), sx = e.x + Math.sin(a) * 2.6, sz = e.z + Math.cos(a) * 2.6;
        if (!walkable(sx, sz)) continue;
        const m = spawnEnemy(pick(['skitter', 'grunt', 'skitter', 'bomber']), sx, sz); m.awake = true; m.owner = e; m.xp *= 0.3; alive++;
        burst(sx, 0.5, sz, B.bolt, 10, 3);
      }
      break;
    }
    case 'teleport': {
      for (let k = 0; k < 20; k++) {
        const a = rand(0, 6.28), r = rand(5, 7), x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r;
        if (walkable(x, z) && walkable(x + 1, z) && walkable(x - 1, z) && walkable(x, z + 1) && walkable(x, z - 1)) {
          burst(e.x, 1.5, e.z, e.color, 20, 6, 0.2); e.x = x; e.z = z; burst(x, 1.5, z, e.color, 20, 6, 0.2); break;
        }
      }
      let fired = false;
      e.casting = { t: 0.45, tick: () => { if (!fired && e.casting.t < 0.1) { fired = true; ring(p2 ? 18 : 12, 7.5); } } };
      break;
    }
  }
}

// ================= telegraphs =================
function telegraph(x, z, r, T, dmg, o) {
  const col = o.col || 0xff3b2f;
  const tm = teleMats(col);
  const disc = new THREE.Mesh(G.disc, tm[0]), fill = new THREE.Mesh(G.disc, tm[1]), ring = new THREE.Mesh(G.ring, tm[2]);
  disc.position.set(x, 0.03, z); fill.position.set(x, 0.035, z); ring.position.set(x, 0.04, z);
  disc.scale.setScalar(r); ring.scale.setScalar(r); fill.scale.setScalar(0.01);
  world.add(disc, fill, ring);
  const t = { x, z, r, t: 0, T, dmg, disc, fill, ring, o, col };
  teles.push(t);
  return t;
}
const _teleMats = new Map();
function teleMats(col) {
  if (!_teleMats.has(col)) _teleMats.set(col, [0.12, 0.3, 0.8].map((op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })));
  return _teleMats.get(col);
}
function disposeTele(t) { world.remove(t.disc, t.fill, t.ring); }
function updTeles(dt) {
  for (let i = teles.length - 1; i >= 0; i--) {
    const t = teles[i]; t.t += dt;
    t.fill.scale.setScalar(Math.max(0.01, t.r * Math.min(1, t.t / t.T)));
    if (t.t >= t.T) {
      teles.splice(i, 1); disposeTele(t);
      if (t.o.visualOnly) continue;
      burst(t.x, 0.4, t.z, t.col, 12, 5, 0.16);
      if (t.o.player) {
        for (const e of enemies) if (!e.dead && Math.hypot(e.x - t.x, e.z - t.z) < t.r + e.r) damageEnemy(e, t.dmg, false, 3, (e.x - t.x), (e.z - t.z), false);
      } else if (Math.hypot(P.x - t.x, P.z - t.z) < t.r + P.r * 0.5) hurtPlayer(t.dmg, null);
    }
  }
}

// ================= projectiles =================
const _projMat = new Map();
function projMat(c) { if (!_projMat.has(c)) _projMat.set(c, new THREE.MeshBasicMaterial({ color: c })); return _projMat.get(c); }
function spawnProj(o) {
  const m = new THREE.Mesh(G.lsph, projMat(o.col));
  m.scale.set(o.size * 2, o.size * 2, o.size * (o.owner === 'p' && o.size < 0.15 ? 9 : 3));
  m.rotation.y = o.a; m.position.set(o.x, 0.85, o.z);
  world.add(m);
  projs.push(Object.assign({ vx: Math.sin(o.a) * o.spd, vz: Math.cos(o.a) * o.spd, mesh: m, hit: new Set(), life: o.life || 1.6, pierce: o.pierce || 0 }, o));
}
function updProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt;
    let dead = p.life <= 0 || !walkable(p.x, p.z);
    if (!dead && p.owner === 'p') {
      for (const e of enemies) {
        if (e.dead || p.hit.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.r + p.size + 0.15) {
          p.hit.add(e.id);
          const { d, crit } = rollDmg(); damageEnemy(e, d * (p.mult || 1), crit, 2, p.vx / p.spd, p.vz / p.spd, true);
          if (p.pierce-- <= 0) { dead = true; break; }
        }
      }
    } else if (!dead && p.owner === 'e') {
      if (Math.hypot(P.x - p.x, P.z - p.z) < P.r + p.size) { hurtPlayer(p.dmg, p.src); dead = true; }
    }
    if (dead) { burst(p.x, 0.85, p.z, p.col, 3, 2, 0.08); world.remove(p.mesh); projs.splice(i, 1); }
    else p.mesh.position.set(p.x, 0.85, p.z);
  }
}

// ================= combat =================
function rollDmg() {
  let d = ST.dmg * rand(0.9, 1.1);
  const crit = Math.random() * 100 < ST.crit;
  if (crit) d *= 1.5 + ST.critd / 100;
  return { d, crit };
}
function curWeapon() { return WEAPONS[ST.wk]; }
function playerAttack() {
  if (P.atkT > 0 || P.dodgeT > 0 || P.dead) return;
  const w = curWeapon();
  const fr = 1 + (ST.aspd + P.frenzy * 4) / 100;
  P.atkT = w.cd / fr; P.swingDur = P.swingT = Math.min(0.2, P.atkT * 0.85);
  sfx(w.ranged ? 'shoot' : 'swing');
  const a = P.face;
  if (LV.type === 'town') { if (!w.ranged) swingFx(a, w); else spawnProj({ x: P.x, z: P.z, a, spd: w.pspd, owner: 'p', size: w.size, col: w.col, pierce: w.pierce, life: 0.8 }); return; }
  if (w.ranged) {
    const n = ST.powers.split ? 3 : 1;
    for (let k = 0; k < n; k++) spawnProj({ x: P.x + Math.sin(a) * 0.5, z: P.z + Math.cos(a) * 0.5, a: a + (k - (n - 1) / 2) * 0.18, spd: w.pspd, owner: 'p', size: w.size, col: w.col, pierce: w.pierce, mult: k === 0 ? 1 : 0.6 });
  } else {
    swingFx(a, w);
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
      if (d > w.range + e.r) continue;
      if (Math.abs(angDiff(Math.atan2(dx, dz), a)) > w.arc / 2 + 0.15 && d > e.r + 0.4) continue;
      const { d: dmg, crit } = rollDmg();
      damageEnemy(e, dmg, crit, w.kb, dx / (d || 1), dz / (d || 1), true);
    }
    if (ST.powers.split) for (const k of [-1, 1]) spawnProj({ x: P.x, z: P.z, a: a + k * 0.3, spd: 14, owner: 'p', size: 0.2, col: 0x9fe8ff, pierce: 1, mult: 0.5, life: 0.7 });
  }
}
function damageEnemy(e, d, crit, kb, nx, nz, proc, kind) {
  if (e.dead) return;
  wake(e);
  let m = 1 - e.arm;
  if (e.auraOn === 'ward') m *= 0.6;
  d *= m;
  e.hp -= d; e.flashT = 0.1;
  floatNum(e.x, e.h * e.scale + 0.2, e.z, fmt(Math.max(1, d)), crit ? 'crit' : kind === 'burn' ? 'xp' : '');
  if (kb && !e.boss) { const k = kb * (e.arch === 'brute' || e.arch === 'warden' ? 0.4 : 1) * (e.leader ? 0.5 : 1); e.kx += nx * k * 2.2; e.kz += nz * k * 2.2; }
  ensureBar(e);
  if (proc) {
    burst(e.x, 0.9, e.z, e.color, 4, 3, 0.1);
    sfx('hit');
    if (ST.ls > 0) healPlayer(d * ST.ls / 100, true);
    if (Math.random() * 100 < ST.burn) { e.burnT = 3; e.burnD = ST.dmg * 0.3; }
    if (Math.random() * 100 < ST.chill) e.chillT = 2.5;
    if (ST.powers.chain && chance(0.3)) chainLightning(e, d * 0.6);
    if (ST.powers.frenzy) { P.frenzy = Math.min(10, P.frenzy + 1); P.frenzyT = 2; }
  }
  if (e.hp <= 0) killEnemy(e);
}
function chainLightning(src, d) {
  const near = enemies.filter((q) => !q.dead && q !== src && Math.hypot(q.x - src.x, q.z - src.z) < 6).sort((a, b) => Math.hypot(a.x - src.x, a.z - src.z) - Math.hypot(b.x - src.x, b.z - src.z)).slice(0, 3);
  let prev = src;
  for (const t of near) { zap(prev.x, prev.z, t.x, t.z, 0x9fd8ff); damageEnemy(t, d, false, 0, 0, 0, false); prev = t; }
}
function killEnemy(e, noLoot) {
  if (e.dead) return;
  e.dead = true;
  burst(e.x, 0.8, e.z, e.color, e.boss ? 40 : 12, e.boss ? 9 : 5, e.boss ? 0.28 : 0.15);
  if (e.owner) e.owner.minions = Math.max(0, (e.owner.minions || 1) - 1);
  disposeEnemy(e);
  gainXP(e.xp);
  S.kills++;
  if (!noLoot || e.explode) dropLoot(e);
  if (e.split) for (let k = 0; k < 2; k++) { const s = spawnEnemy('skitter', e.x + rand(-0.6, 0.6), e.z + rand(-0.6, 0.6)); s.awake = true; s.xp *= 0.3; }
  if (e.explode && !e.ai.startsWith('bomb')) { telegraph(e.x, e.z, 2.2, 0.6, e.dmg * 0.9, { col: 0xffb02a }); }
  if (ST.powers.nova) { telegraph(e.x, e.z, 3, 0.25, ST.dmg * 0.7, { player: true, col: 0xff8a2a }); }
  if (ST.powers.vamp) healPlayer(ST.maxHp * 0.03);
  if (e.leader) { toast(`Leader slain: ${e.name}`, 'var(--r4)'); for (const o of enemies) if (o.lead === e) o.lead = null; }
  if (e.boss) bossDefeated(e);
}
function hurtPlayer(d, src) {
  if (P.iframes > 0 || P.dead || LV.type !== 'dungeon') return;
  const red = ST.armor / (ST.armor + 40 + 9 * RUN.depth);
  d *= 1 - red;
  P.hp -= d; P.hurtT = 0.2;
  floatNum(P.x, 2, P.z, '-' + fmt(d), 'hurt');
  const v = $('#vignette'); v.classList.add('hit'); setTimeout(() => v.classList.remove('hit'), 90);
  sfx('hurt');
  if (src) {
    if (src.vamp) src.hp = Math.min(src.maxHp, src.hp + d * 2);
    if (src.burn) { P.burnT = 2.5; P.burnD = d * 0.2; }
    if (src.chill) P.chillT = 1.6;
  }
  if (P.hp <= 0) {
    if (ST.powers.phoenix && !RUN.phoenixUsed) { RUN.phoenixUsed = true; P.hp = ST.maxHp * 0.3; P.iframes = 1.5; burst(P.x, 1, P.z, 0xff9a3a, 30, 7, 0.22); toast('Phoenix Plume flares. You stand again.', 'var(--r4)'); }
    else die();
  }
}
function healPlayer(n, quiet) {
  if (P.dead) return;
  const before = P.hp; P.hp = Math.min(ST.maxHp, P.hp + n);
  if (!quiet && P.hp - before >= 1) floatNum(P.x, 2, P.z, '+' + fmt(P.hp - before), 'heal');
}
function gainXP(x) {
  S.xp += x;
  let up = false;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; up = true; }
  if (up) { ST = calcStats(); P.hp = ST.maxHp; toast(`Level ${S.level}. Health and damage rise.`, 'var(--xpc)', true); sfx('level'); burst(P.x, 1, P.z, 0xf2c56b, 26, 6, 0.18); }
}

// ================= loot =================
const RCOL = [0xbdb7a7, 0x74c269, 0x5c8ff2, 0xb56ff2, 0xf19a33];
function spawnDrop(x, z, data) {
  const a = rand(0, 6.28), r = rand(0.2, 1.3);
  const tx = x + Math.sin(a) * r, tz = z + Math.cos(a) * r;
  const fx = walkable(tx, tz) ? tx : x, fz = walkable(tx, tz) ? tz : z;
  const g = new THREE.Group();
  if (data.gold) { for (let k = 0; k < 3; k++) g.add(mesh(G.cyl, mat(0xf2c56b, 1), 0.22, 0.05, 0.22, rand(-0.1, 0.1), k * 0.06, rand(-0.1, 0.1))); }
  else if (data.mat) { g.add(mesh(G.oct, mat(new THREE.Color(MATS[data.mat].c).getHex(), 1), 0.26, 0.34, 0.26, 0, 0.1, 0)); }
  else if (data.potion) { g.add(mesh(G.sph, mat(0xe0473b, 1), 0.28, 0.28, 0.28, 0, 0.1, 0), mesh(G.box, mat(0x8a6a4a), 0.08, 0.12, 0.08, 0, 0.3, 0)); }
  else if (data.item) {
    const c = RCOL[data.item.rarity];
    g.add(mesh(G.box, mat(c, 1), 0.34, 0.34, 0.34, 0, 0.2, 0));
    if (data.item.rarity >= 2) { const beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false })); beam.scale.set(0.35, 6, 0.35); beam.position.y = 3; g.add(beam); levelDisp.push(beam.material); }
    if (data.item.rarity >= 3) sfx('rare');
  }
  g.position.set(fx, 0.3, fz);
  world.add(g);
  drops.push({ x: fx, z: fz, g, data, t: 0, vy: 4 });
}
function dropLoot(e) {
  const d = RUN.depth, B = biomeOf(d), mf = ST.mf;
  const gm = 1 + ST.gold / 100 + (ST.powers.midas ? 0.6 : 0);
  const mult = e.boss ? 6 : e.leader ? 3 : e.champ ? 2 : 1;
  if (chance(0.5) || e.leader || e.boss) spawnDrop(e.x, e.z, { gold: Math.max(1, Math.round(randi(2, 6) * Math.pow(1.09, d) * mult * gm)) });
  if (chance(0.22 * mult)) spawnDrop(e.x, e.z, { mat: pick(B.mats), n: e.boss ? randi(4, 7) : randi(1, 2) });
  if (chance(0.1 * mult)) spawnDrop(e.x, e.z, { mat: 'iron', n: randi(1, 2) });
  if (chance(0.06 * mult)) spawnDrop(e.x, e.z, { mat: 'herb', n: 1 });
  if (chance(0.03 * mult)) spawnDrop(e.x, e.z, { mat: 'essence', n: 1 });
  if (chance(0.02)) spawnDrop(e.x, e.z, { potion: 1 });
  let n = e.boss ? 3 : e.leader ? 1 : 0;
  if (chance(e.champ ? 0.4 : 0.065 + 0.002 * d)) n++;
  for (let k = 0; k < n; k++) spawnDrop(e.x, e.z, { item: genItem(d + (e.boss ? 1 : 0), { mf, min: e.boss ? (k === 0 ? 3 : 2) : e.leader ? 2 : 0 }) });
  if (e.boss) { spawnDrop(e.x, e.z, { mat: 'sigil', n: 1 + cycleOf(d) }); spawnDrop(e.x, e.z, { mat: 'essence', n: randi(3, 6) }); }
}
function updDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const D = drops[i];
    D.t += dt;
    if (D.vy > -10) { D.vy -= 18 * dt; D.g.position.y = Math.max(0.3, D.g.position.y + D.vy * dt); }
    D.g.rotation.y += dt * 1.8;
    const dist = Math.hypot(P.x - D.x, P.z - D.z);
    const auto = !D.data.item;
    if (auto && dist < 3.2 && D.t > 0.4) { const s = Math.min(1, dt * 9); D.x = lerp(D.x, P.x, s); D.z = lerp(D.z, P.z, s); }
    D.g.position.x = D.x; D.g.position.z = D.z;
    if (D.t > 0.35 && dist < 0.8) {
      if (D.data.item && S.inv.length >= BAG_CAP) { if (!D.warned) { D.warned = 1; toast('Your bag is full. Salvage or sell something.', 'var(--bad)'); } continue; }
      pickup(D.data);
      world.remove(D.g); drops.splice(i, 1);
    }
  }
}
function pickup(dt) {
  if (dt.gold) { S.gold += dt.gold; RUN && (RUN.gold += dt.gold); floatNum(P.x, 1.8, P.z, '+' + dt.gold + 'g', 'crit'); sfx('coin'); }
  else if (dt.mat) { addMat(dt.mat, dt.n); toast(`+${dt.n} ${MATS[dt.mat].n}`, MATS[dt.mat].c); sfx('coin'); }
  else if (dt.potion) { S.potions++; toast('+1 Healing Draught', 'var(--blood-2)'); sfx('coin'); }
  else if (dt.item) { S.inv.push(dt.item); toast(dt.item.name, `var(--r${dt.item.rarity})`); sfx('coin'); if (RUN) RUN.items++; }
}
// ================= level loading =================
let spinners = [];
function placePlayerMesh() {
  if (!P.mesh) { const h = makeHero(); P.mesh = h.g; P.hand = h.hand; scene.add(P.mesh); }
  if (P.wkind !== ST.wk) {
    if (P.weapon) P.hand.remove(P.weapon);
    P.weapon = weaponMesh(ST.wk); P.hand.add(P.weapon); P.wkind = ST.wk;
  }
  P.mesh.position.set(P.x, 0, P.z);
}
function setTownLights() {
  scene.background = new THREE.Color(0x8fb0c8); scene.fog = new THREE.Fog(0x8fb0c8, 34, 80);
  hemi.intensity = 2.4; hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0x4a5a3a);
  sun.intensity = 2.6; torch.intensity = 0;
}
function loadTown() {
  clearWorld(); spinners = [];
  LV = genTown(); bossRef = null; $('#bossBar').hidden = true;
  setTownLights();
  buildTownVisuals();
  world.traverse((o) => { if (o.userData && o.userData.spin) spinners.push(o); });
  addInteract({ x: 8.5, z: 11.6, r: 1.7, label: 'Your Home', ly: 5.4, verb: 'Go inside', act: () => openPanel('home') });
  addInteract({ x: 20.5, z: 10.6, r: 1.7, label: "Orla's Anvil", ly: 4.6, verb: 'Browse the forge', act: () => openPanel('smith') });
  addInteract({ x: 32.5, z: 10.6, r: 1.7, label: 'Bramble & Vial', ly: 4.6, verb: 'Browse the apothecary', act: () => openPanel('alch') });
  addInteract({ x: 34.5, z: 20.4, r: 1.7, label: 'Copper Lantern', ly: 4.6, verb: 'Trade goods', act: () => openPanel('trader') });
  addInteract({ x: 22, z: 31.4, r: 2.2, label: 'The Delve', ly: 5.2, verb: 'Descend', act: () => openPanel('delve') });
  P.x = LV.start.x; P.z = LV.start.z; P.dead = false; P.kx = P.kz = 0;
  ST = calcStats(); P.hp = ST.maxHp;
  placePlayerMesh(); resetMini(); snapCamera();
  warmLevel();
}
// threejs-performance, "Shader compile stalls": build every program the new level needs
// in parallel before its first frame instead of stalling mid-fight when a material first appears.
let levelReady = false, warmId = 0;
const warmGroup = new THREE.Group();
function warmLevel() {
  levelReady = false;
  const id = ++warmId;
  if (!warmGroup.children.length) {
    // one of each effect material that otherwise appears only mid-fight
    for (const c of [0xff3b2f, 0xff7a2a]) for (const m of teleMats(c)) warmGroup.add(new THREE.Mesh(G.disc, m));
    for (const c of [0xf0dcb0, 0xa98cff, 0xb48cff]) warmGroup.add(new THREE.Mesh(G.lsph, projMat(c)));
    warmGroup.add(new THREE.Mesh(G.plane, barBgMat), new THREE.Mesh(G.plane, barFgMat), swings[0].o.clone(), parts[0].m.clone());
    warmGroup.children.forEach((o) => { o.visible = true; o.position.set(P.x, -50, P.z); });
  }
  scene.add(warmGroup);
  const done = () => { if (id !== warmId) return; scene.remove(warmGroup); levelReady = true; };
  try { renderer.compileAsync(scene, camera).then(done, done); } catch (err) { done(); }
  setTimeout(done, 2500);
}
function populate() {
  const L = LV, d = L.depth, B = biomeOf(d);
  const pool = Object.entries(ARCH).filter(([, a]) => d >= a.from).map(([k, a]) => [k, a.w]);
  const spot = (r, pad) => {
    pad = pad || 1;
    for (let t = 0; t < 40; t++) {
      const x = rand(r.x + pad, r.x + r.w - pad), z = rand(r.y + pad, r.y + r.h - pad);
      if (walkable(x, z) && walkable(x + 0.5, z) && walkable(x - 0.5, z) && walkable(x, z + 0.5) && walkable(x, z - 0.5)) return [x, z];
    }
    return [r.x + r.w / 2, r.y + r.h / 2];
  };
  if (L.boss) {
    const a = L.arena;
    spawnEnemy('grunt', a.x + a.w / 2, a.y + 6, { boss: true });
    const ante = L.rooms[1];
    for (let k = 0; k < 3 + Math.floor(d / 10); k++) { const [x, z] = spot(ante); spawnEnemy(wpick(pool), x, z, { champ: k === 0 }); }
    addChest(...spot(ante, 1.5));
  } else {
    const vault = L.rooms.length > 4 ? L.rooms[randi(1, L.rooms.length - 1)] : null;
    for (const r of L.rooms.slice(1)) {
      const area = r.w * r.h;
      let n = Math.min(10, randi(2, 4) + Math.floor(d / 5) + (area > 60 ? 2 : 0));
      let lead = null;
      if (d >= 2 && chance(Math.min(0.38, 0.14 + d * 0.012))) {
        const [x, z] = spot(r, 2);
        lead = spawnEnemy(pick(['grunt', 'brute', 'caster', 'warden'].filter((k) => d >= ARCH[k].from)), x, z, { leader: true });
        n += 2;
      }
      for (let k = 0; k < n; k++) { const [x, z] = spot(r); const e = spawnEnemy(wpick(pool), x, z, { champ: chance(0.05 + d * 0.004) }); if (lead) e.lead = lead; }
      if (chance(0.22) || r === vault) addChest(...spot(r, 1.5));
      if (r === vault) addChest(...spot(r, 1.5));
      const nn = randi(0, 2);
      for (let k = 0; k < nn; k++) addNode(...spot(r, 1), pick(['iron', 'iron', 'herb', B.mats[0], B.mats[1]]));
    }
    const er = L.exitRoom;
    addStairs(er.x + er.w / 2, er.y + er.h / 2);
  }
  if (d % 5 === 1) addPortalHome(L.start.x + 2.2, L.start.z);
  // starting room gets a herb or ore sometimes
  if (chance(0.5)) addNode(L.start.x - 2, L.start.z + 1.5, 'herb');
}
function loadDungeon(depth) {
  clearWorld(); spinners = [];
  bossRef = null; $('#bossBar').hidden = true;
  LV = genDungeon(depth); RUN.depth = depth; RUN.phoenixUsed = false;
  S.best = Math.max(S.best, depth);
  const B = biomeOf(depth);
  scene.background = new THREE.Color(B.fog); scene.fog = new THREE.Fog(B.fog, 17, 36);
  hemi.intensity = 2.1; hemi.color.setHex(B.amb); hemi.groundColor.setHex(0x14141c);
  sun.intensity = 0.6; torch.color.setHex(B.torch); torch.intensity = 40;
  buildDungeonVisuals();
  P.x = LV.start.x; P.z = LV.start.z; P.kx = P.kz = 0;
  populate();
  const before = ST ? ST.maxHp : 0;
  ST = calcStats();
  if (RUN.fresh) { P.hp = ST.maxHp; RUN.fresh = false; } else P.hp = Math.min(ST.maxHp, P.hp + (ST.maxHp - before > 0 ? ST.maxHp - before : 0));
  placePlayerMesh(); resetMini(); snapCamera();
  flow = null; flowTile = -1; computeFlow();
  warmLevel();
  banner(`Depth ${depth}`, B.name + (cycleOf(depth) ? ` · Cycle ${cycleOf(depth) + 1}` : ''));
  save();
}
function addChest(x, z) {
  const g = new THREE.Group();
  g.add(mesh(G.box, mat(0x6a4426), 0.9, 0.5, 0.6, 0, 0.25, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3);
  lid.add(mesh(G.box, mat(0x7a5230), 0.92, 0.22, 0.62, 0, 0.11, 0.3), mesh(G.box, mat(0xd6a24a), 0.94, 0.06, 0.1, 0, 0.12, 0.6));
  g.add(lid, mesh(G.box, mat(0xd6a24a), 0.96, 0.08, 0.64, 0, 0.3, 0));
  g.position.set(x, 0, z); g.rotation.y = rand(-0.4, 0.4); world.add(g);
  addInteract({ x, z, r: 1.4, kind: 'chest', verb: 'Open chest', act(o) {
    lid.rotation.x = -1.9; o.dead = true; sfx('chest');
    const d = RUN.depth, mf = ST.mf;
    spawnDrop(x, z, { gold: Math.round(randi(8, 18) * Math.pow(1.09, d) * (1 + ST.gold / 100)) });
    const n = randi(1, 2);
    for (let k = 0; k < n; k++) spawnDrop(x, z, { item: genItem(d, { mf: mf + 30, min: chance(0.35) ? 1 : 0 }) });
    spawnDrop(x, z, { mat: pick(biomeOf(d).mats), n: randi(1, 3) });
    if (chance(0.4)) spawnDrop(x, z, { mat: pick(['iron', 'herb', 'essence']), n: randi(1, 2) });
    if (chance(0.3)) spawnDrop(x, z, { potion: 1 });
    burst(x, 0.8, z, 0xf2c56b, 16, 4, 0.12);
  } });
}
function addNode(x, z, kind) {
  const g = new THREE.Group();
  const c = new THREE.Color(MATS[kind].c).getHex();
  if (kind === 'herb') for (let k = 0; k < 4; k++) g.add(mesh(G.cone, mat(c), 0.22, rand(0.4, 0.7), 0.22, rand(-0.3, 0.3), 0.25, rand(-0.3, 0.3)));
  else {
    g.add(mesh(G.box, mat(0x3a3a40), 0.9, 0.3, 0.8, 0, 0.15, 0));
    for (let k = 0; k < 3; k++) { const o = mesh(G.oct, mat(c, kind === 'iron' ? 0 : 1), 0.3, 0.5, 0.3, rand(-0.3, 0.3), 0.4, rand(-0.25, 0.25)); o.rotation.z = rand(-0.4, 0.4); g.add(o); }
  }
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.3, kind: 'node', mat: kind, verb: `Gather ${MATS[kind].n}`, act(o) {
    o.dead = true; world.remove(g); sfx('coin');
    spawnDrop(x, z, { mat: kind, n: kind === 'iron' ? randi(2, 4) : kind === 'herb' ? randi(2, 3) : randi(1, 2) });
    burst(x, 0.5, z, c, 12, 3, 0.1);
  } });
}
function addStairs(x, z) {
  const g = new THREE.Group();
  g.add(mesh(G.box, mat(0x050507, 1), 2.2, 0.04, 2.2, 0, 0.02, 0));
  for (let k = 0; k < 3; k++) g.add(mesh(G.box, mat(0x2a2a30), 1.6 - k * 0.4, 0.05, 0.4, 0, 0.05, -0.6 + k * 0.45));
  const ring = mesh(G.ring, mat(0x7fbf6a, 1), 1.5, 1, 1.5, 0, 0.06, 0); g.add(ring);
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.6, kind: 'stairs', label: 'Stairs down', ly: 2.2, cls: '', verb: `Descend to depth ${RUN.depth + 1}`, act: () => nextFloor() });
}
function addPortalHome(x, z) {
  if (!walkable(x, z)) { x = LV.start.x; z = LV.start.z + 1.5; }
  const g = new THREE.Group();
  const t = mesh(G.fullTorus, mat(0x6ab0ff, 1), 0.9, 1.2, 0.9, 0, 1.3, 0); g.add(t);
  const disc = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: 0x3a6aff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  disc.scale.set(1.7, 2.3, 1); disc.position.y = 1.3; g.add(disc); levelDisp.push(disc.material);
  g.position.set(x, 0, z); g.userData.spin = 2; world.add(g); spinners.push(g);
  addInteract({ x, z, r: 1.6, kind: 'portal', label: 'Way home', ly: 3, cls: '', verb: 'Return to Hearthdeep', act: () => returnToTown(false) });
}
function nextFloor() {
  const d = RUN.depth + 1;
  RUN.floors++;
  loadDungeon(d);
}
function bossDefeated(e) {
  S.bossKills++; S.slain.push({ n: e.name, c: e.color });
  const wp = RUN.depth + 1;
  if (!S.waypoints.includes(wp)) S.waypoints.push(wp);
  S.waypoints.sort((a, b) => a - b);
  bossRef = null; $('#bossBar').hidden = true;
  banner(`${e.name} falls`, `Waypoint opened at depth ${wp}`);
  sfx('level');
  const a = LV.arena;
  addStairs(a.x + a.w / 2 + 2.5, a.y + a.h / 2);
  addPortalHome(a.x + a.w / 2 - 2.5, a.y + a.h / 2);
  for (const q of enemies) if (q.owner === e && !q.dead) killEnemy(q, true);
  ST = calcStats();
  save();
}
function startDelve(depth, elix) {
  RUN = { depth, start: depth, buffs: {}, rested: S.rested, phoenixUsed: false, gold: 0, items: 0, floors: 1, fresh: true };
  for (const k of elix) if (S.elixirs[k] > 0) { S.elixirs[k]--; RUN.buffs[k] = 1; }
  S.rested = false; S.runs++;
  closePanel();
  loadDungeon(depth);
  if (RUN.rested) toast('Well rested: bonus health this descent.', 'var(--ok)');
}
function returnToTown(died) {
  const summary = RUN ? `Back home from depth ${RUN.depth} with ${RUN.gold} gold and ${RUN.items} item${RUN.items === 1 ? '' : 's'}.` : '';
  const gl = S.home.garden;
  let grew = '';
  if (gl) { addMat('herb', [0, 2, 4, 7][gl]); if (gl >= 2) addMat('essence', gl - 1); if (gl >= 3) addMat('spore', 2); grew = 'Your garden yielded fresh Bitterleaf.'; }
  S.shop = null;
  RUN = null;
  loadTown();
  if (!died && summary) toast(summary, 'var(--brass-2)', true);
  if (grew) toast(grew, 'var(--ok)');
  save();
}
function die() {
  P.dead = true; P.hp = 0;
  const lost = Math.floor(S.gold * 0.25);
  S.gold -= lost; S.deaths++;
  P.mesh.rotation.z = Math.PI / 2; P.mesh.position.y = 0.3;
  $('#deathText').textContent = `${biomeOf(RUN.depth).name}, depth ${RUN.depth}. You dropped ${fmt(lost)} gold in the dark, but your gear and materials came home with you.`;
  setTimeout(() => { $('#death').hidden = false; $('#btnRevive').focus(); }, 900);
  sfx('die');
  save();
}

// ================= player =================
const keys = {};
const stick = { x: 0, y: 0 };
let mouseDown = false, touchAtk = false, touchMode = false;
const mouse = new THREE.Vector2(0, 0);
let potCd = 0;
function tryDodge() {
  if (P.dodgeCd > 0 || P.dead || isPaused()) return;
  const mv = Math.hypot(P.mx || 0, P.mz || 0) > 0.1;
  P.dodgeDir = mv ? Math.atan2(P.mx, P.mz) : P.face;
  P.dodgeT = 0.2; P.dodgeCd = 0.85; P.iframes = Math.max(P.iframes, 0.32); P.ghostT = 0;
  sfx('dodge'); burst(P.x, 0.2, P.z, 0xc8c0a8, 6, 2, 0.1);
}
function usePotion(greater) {
  if (P.dead || potCd > 0) return;
  if (P.hp >= ST.maxHp - 0.5) { toast('Already at full health.', 'var(--muted)'); return; }
  if (greater === undefined) greater = S.potions <= 0 && S.gpotions > 0;
  const k = greater ? 'gpotions' : 'potions';
  if (S[k] <= 0) { toast(greater ? 'No Greater Draughts left.' : 'No Healing Draughts left.', 'var(--bad)'); return; }
  S[k]--; potCd = 0.8;
  healPlayer(ST.maxHp * (greater ? 0.75 : 0.4));
  sfx('drink'); burst(P.x, 1, P.z, 0xe0473b, 10, 2, 0.1);
}
function useScroll() {
  if (P.dead) return;
  if (!LV || LV.type !== 'dungeon') { toast('Portal scrolls only work below ground.', 'var(--muted)'); return; }
  if (S.scrolls <= 0) { toast('No Portal Scrolls. Craft them at home or buy them from Bramble & Vial.', 'var(--bad)'); return; }
  if (interacts.some((o) => o.kind === 'portal' && !o.dead && Math.hypot(o.x - P.x, o.z - P.z) < 6)) { toast('A way home is already open nearby.', 'var(--muted)'); return; }
  S.scrolls--;
  const a = P.face; let x = P.x + Math.sin(a) * 1.6, z = P.z + Math.cos(a) * 1.6;
  if (!walkable(x, z)) { x = P.x; z = P.z; }
  addPortalHome(x, z);
  sfx('portal');
}
let nearI = null;
function interact() { if (nearI && !P.dead && !isPaused()) nearI.act(nearI); }
const _ray = new THREE.Raycaster();
function aimPoint() {
  _ray.setFromCamera(mouse, camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  if (Math.abs(d.y) < 1e-4) return null;
  const t = (0.6 - o.y) / d.y;
  return { x: o.x + d.x * t, z: o.z + d.z * t };
}
function updPlayer(dt) {
  if (P.dead) return;
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  ix += stick.x; iz += stick.y;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  P.mx = ix; P.mz = iz;
  P.atkT -= dt; P.swingT -= dt; P.dodgeCd -= dt; P.iframes -= dt; potCd -= dt;
  if (P.frenzyT > 0) { P.frenzyT -= dt; if (P.frenzyT <= 0) P.frenzy = 0; }
  if (P.chillT > 0) P.chillT -= dt;
  if (P.burnT > 0) { P.burnT -= dt; P.hp -= P.burnD * dt; if (P.hp <= 0 && LV.type === 'dungeon') { P.hp = 0.01; hurtPlayer(9999, null); } }
  const spd = 5.3 * (1 + ST.move / 100) * (P.chillT > 0 ? 0.6 : 1);
  let vx = ix * spd, vz = iz * spd;
  if (P.dodgeT > 0) {
    P.dodgeT -= dt; vx = Math.sin(P.dodgeDir) * 15; vz = Math.cos(P.dodgeDir) * 15;
    if (ST.powers.ghost && LV.type === 'dungeon') { P.ghostT -= dt; if (P.ghostT <= 0) { P.ghostT = 0.07; telegraph(P.x, P.z, 1.3, 0.35, ST.dmg * 0.45, { player: true, col: 0x9fd4ff }); } }
  }
  P.kx = (P.kx || 0) * Math.pow(0.002, dt); P.kz = (P.kz || 0) * Math.pow(0.002, dt);
  P.x += (vx + P.kx) * dt; P.z += (vz + P.kz) * dt;
  collide(P);
  // aim
  const wantsAtk = mouseDown || touchAtk || keys.KeyJ;
  if (touchMode) {
    let best = null, bd = 9;
    if (LV.type === 'dungeon') for (const e of enemies) { if (e.dead || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
    if (best && (wantsAtk || il < 0.1)) P.face = Math.atan2(best.x - P.x, best.z - P.z);
    else if (il > 0.1) P.face = Math.atan2(ix, iz);
  } else {
    const ap = aimPoint();
    if (ap) P.face = Math.atan2(ap.x - P.x, ap.z - P.z);
  }
  if (wantsAtk) playerAttack();
  if (LV.type === 'dungeon') P.hp = Math.min(ST.maxHp, P.hp + ST.regen * dt);
  else P.hp = ST.maxHp;
  // visuals
  const moving = il > 0.1 || P.dodgeT > 0;
  P.walk += dt * (moving ? 12 : 0);
  P.mesh.position.set(P.x, moving ? Math.abs(Math.sin(P.walk)) * 0.09 : 0, P.z);
  P.mesh.rotation.y = P.face;
  P.mesh.rotation.z = 0;
  const w = curWeapon();
  if (P.swingT > 0 && !w.ranged) { const t = 1 - P.swingT / P.swingDur; P.hand.rotation.y = lerp(w.arc / 2, -w.arc / 2, t); P.hand.rotation.x = 0; }
  else if (P.swingT > 0) { P.hand.rotation.y = 0; P.hand.position.z = 0.1 - 0.15 * (P.swingT / P.swingDur); }
  else { P.hand.rotation.y = lerp(P.hand.rotation.y, 0.3, Math.min(1, dt * 10)); P.hand.position.z = 0.1; }
  P.mesh.visible = !(P.iframes > 0 && P.dodgeT <= 0 && Math.floor(P.iframes * 20) % 2 === 0);
  torch.position.set(P.x, 2.6, P.z + 0.4);
}
function snapCamera() {
  camera.position.set(P.x + CAM_OFF.x * camZoom, CAM_OFF.y * camZoom, P.z + CAM_OFF.z * camZoom);
  camera.lookAt(P.x, 0.6, P.z);
}
function updCamera(dt) {
  const k = 1 - Math.exp(-dt * 7);
  camera.position.x = lerp(camera.position.x, P.x + CAM_OFF.x * camZoom, k);
  camera.position.y = lerp(camera.position.y, CAM_OFF.y * camZoom, k);
  camera.position.z = lerp(camera.position.z, P.z + CAM_OFF.z * camZoom, k);
  camera.lookAt(camera.position.x - CAM_OFF.x * camZoom, 0.6, camera.position.z - CAM_OFF.z * camZoom);
}
function updInteract() {
  let best = null, bd = 1e9;
  for (const o of interacts) {
    if (o.dead) { if (o.lbl) { removeLabel(o.lbl); o.lbl = null; } continue; }
    const d = Math.hypot(o.x - P.x, o.z - P.z);
    if (d < o.r && d < bd) { bd = d; best = o; }
  }
  for (let i = interacts.length - 1; i >= 0; i--) if (interacts[i].dead) { const o = interacts[i]; for (const L of labelEls.filter((q) => q.ref === o)) removeLabel(L); interacts.splice(i, 1); }
  if (best !== nearI) {
    nearI = best;
    const el = $('#prompt');
    if (best) { el.innerHTML = `${touchMode ? '' : '<kbd>E</kbd>'}<span>${esc(best.verb)}</span>`; el.hidden = false; }
    else el.hidden = true;
    $('#tUse').classList.toggle('ready', !!best);
  }
}

// ================= minimap =================
const mini = $('#mini'), mctx = mini.getContext('2d');
let miniBase = null, mbctx = null, revealT = 0;
const MS = 4;
function resetMini() {
  miniBase = document.createElement('canvas'); miniBase.width = LV.w * MS; miniBase.height = LV.h * MS;
  mbctx = miniBase.getContext('2d');
  if (LV.type === 'town') {
    for (let j = 0; j < LV.h; j++) for (let i = 0; i < LV.w; i++) {
      const g = LV.g[j * LV.w + i], p = LV.path[j * LV.w + i];
      mbctx.fillStyle = g ? (p ? '#8a7a5a' : '#3f6a34') : (i < 2 || j < 2 || i >= LV.w - 2 || j >= LV.h - 2 ? '#1e3a22' : '#7a6a5a');
      mbctx.fillRect(i * MS, j * MS, MS, MS);
    }
  }
}
function reveal() {
  const r = 7, ci = Math.floor(P.x), cj = Math.floor(P.z), B = biomeOf(LV.depth);
  const fc = '#' + new THREE.Color(B.floor).multiplyScalar(1.8).getHexString(), wc = '#' + new THREE.Color(B.wall).multiplyScalar(1.4).getHexString();
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) continue;
    if ((i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
    const k = j * LV.w + i; if (LV.explored[k]) continue;
    LV.explored[k] = 1;
    mbctx.fillStyle = LV.g[k] === 1 ? fc : wc;
    mbctx.fillRect(i * MS, j * MS, MS, MS);
  }
}
function drawMini() {
  const W = mini.width, H = mini.height;
  mctx.fillStyle = '#07070b'; mctx.fillRect(0, 0, W, H);
  let sc, ox, oz;
  if (LV.type === 'town') { sc = Math.min(W / LV.w, H / LV.h); ox = (W - LV.w * sc) / 2; oz = (H - LV.h * sc) / 2; }
  else { sc = 3.4; ox = W / 2 - P.x * sc; oz = H / 2 - P.z * sc; }
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniBase, ox, oz, LV.w * sc, LV.h * sc);
  const dot = (x, z, c, s) => { mctx.fillStyle = c; mctx.fillRect(ox + x * sc - s / 2, oz + z * sc - s / 2, s, s); };
  for (const o of interacts) {
    if (o.dead || !LV.explored[tidx(o.x, o.z)]) continue;
    const c = o.kind === 'stairs' ? '#7fbf6a' : o.kind === 'portal' ? '#6ab0ff' : o.kind === 'chest' ? '#f2c56b' : o.kind === 'node' ? MATS[o.mat].c : '#f2c56b';
    dot(o.x, o.z, c, o.kind === 'stairs' || o.kind === 'portal' || !o.kind ? 7 : 4);
  }
  if (LV.type === 'dungeon') for (const e of enemies) {
    if (e.dead || !LV.explored[tidx(e.x, e.z)]) continue;
    if (!e.awake && !e.leader && !e.boss && Math.hypot(e.x - P.x, e.z - P.z) > 9) continue;
    dot(e.x, e.z, e.boss ? '#f19a33' : e.leader ? '#f19a33' : e.champ ? '#5c8ff2' : '#e0675b', e.boss ? 8 : e.leader ? 6 : 3.5);
  }
  mctx.save(); mctx.translate(ox + P.x * sc, oz + P.z * sc); mctx.rotate(-P.face + Math.PI);
  mctx.fillStyle = '#f2c56b'; mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(4, 4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill(); mctx.restore();
}

// ================= audio =================
let AC = null, muted = true, lastHit = 0;
function sfx(t) {
  if (muted) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const now = AC.currentTime;
    const tone = (f1, f2, dur, type, vol, delay) => {
      const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'square';
      const t0 = now + (delay || 0);
      o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
      g.gain.setValueAtTime(vol || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    };
    const noise = (dur, vol, f) => {
      const b = AC.createBuffer(1, Math.floor(AC.sampleRate * dur), AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f || 1800;
      const g = AC.createGain(); g.gain.value = vol || 0.08; s.connect(fl).connect(g).connect(AC.destination); s.start();
    };
    switch (t) {
      case 'hit': if (now - lastHit < 0.04) return; lastHit = now; noise(0.07, 0.09, 1400); tone(180, 90, 0.06, 'square', 0.03); break;
      case 'swing': noise(0.09, 0.05, 3200); break;
      case 'shoot': tone(700, 300, 0.08, 'triangle', 0.04); break;
      case 'hurt': tone(220, 80, 0.18, 'sawtooth', 0.06); break;
      case 'coin': tone(1200, 1800, 0.07, 'square', 0.025); break;
      case 'rare': tone(660, 660, 0.12, 'triangle', 0.05); tone(990, 990, 0.2, 'triangle', 0.05, 0.1); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.05, i * 0.08)); break;
      case 'dodge': noise(0.12, 0.05, 900); break;
      case 'drink': tone(300, 600, 0.2, 'sine', 0.06); break;
      case 'boom': noise(0.35, 0.18, 600); tone(90, 40, 0.3, 'sawtooth', 0.06); break;
      case 'boss': tone(110, 55, 0.9, 'sawtooth', 0.07); tone(165, 82, 0.9, 'sawtooth', 0.04); break;
      case 'chest': tone(400, 800, 0.15, 'triangle', 0.05); break;
      case 'portal': tone(300, 900, 0.4, 'sine', 0.05); break;
      case 'die': tone(300, 50, 1.2, 'sawtooth', 0.07); break;
      case 'buy': tone(900, 1300, 0.09, 'square', 0.03); tone(1300, 1300, 0.09, 'square', 0.03, 0.08); break;
      case 'craft': noise(0.1, 0.08, 2400); tone(500, 500, 0.1, 'square', 0.03, 0.06); break;
    }
  } catch (err) { /* audio unavailable */ }
}

// ================= persistence =================
const SAVE_KEY = 'hearthdeep.save.v1';
function save() { try { if (S && started) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (err) { /* storage unavailable */ } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (err) { return null; } }
function fixUid() {
  let m = 0; const all = [...S.inv, ...S.stash, ...Object.values(S.equip).filter(Boolean), ...((S.shop && S.shop.items) || [])];
  for (const it of all) m = Math.max(m, it.id || 0);
  uid = m + 1;
}
function normalizeSave(s) {
  const d = newSave();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.home = Object.assign(d.home, s.home); s.elixirs = Object.assign(d.elixirs, s.elixirs); s.equip = Object.assign(d.equip, s.equip);
  return s;
}
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
// ================= input =================
const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  if (!$('#title').hidden) { if (ev.code === 'Escape' && started) resume(); return; }
  if (!$('#death').hidden) return;
  if (Panel.kind) {
    if (ev.code === 'Escape' || (ev.code === 'KeyI' && Panel.kind === 'bag') || (ev.code === 'Tab' && Panel.kind === 'bag')) { ev.preventDefault(); closePanel(); }
    return;
  }
  if (GAME_KEYS.has(ev.code)) ev.preventDefault();
  if (ev.code === 'Backquote' || ev.code === 'F3') { ev.preventDefault(); perf.on = !perf.on; $('#perf').hidden = !perf.on; return; }
  if (ev.repeat) return;
  keys[ev.code] = true;
  switch (ev.code) {
    case 'Space': case 'ShiftLeft': case 'ShiftRight': tryDodge(); break;
    case 'KeyE': case 'KeyF': interact(); break;
    case 'KeyQ': usePotion(false); break;
    case 'KeyR': usePotion(true); break;
    case 'KeyT': useScroll(); break;
    case 'KeyI': case 'Tab': case 'KeyB': openPanel('bag'); break;
    case 'Escape': showTitle(); break;
  }
});
window.addEventListener('keyup', (ev) => { keys[ev.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; touchAtk = false; });
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'touch') { setTouchMode(true); return; }
  if (isPaused()) return;
  if (ev.button === 0) mouseDown = true;
  if (ev.button === 2) tryDodge();
});
window.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'touch' && ev.button === 0) mouseDown = false; });
window.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'touch') return;
  if (touchMode && ev.pointerType === 'mouse') setTouchMode(false);
  mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on;
  $('#touch').hidden = !on || !started;
  $('#actionBar').hidden = on;
  nearI = undefined;
}
(function stickSetup() {
  const el = $('#stick'), knob = $('#knob');
  let id = null, cx = 0, cy = 0;
  const set = (x, y) => {
    let dx = x - cx, dy = y - cy; const l = Math.hypot(dx, dy), m = 46;
    if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    stick.x = dx / m; stick.y = dy / m;
  };
  el.addEventListener('pointerdown', (ev) => { id = ev.pointerId; el.setPointerCapture(id); const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(ev.clientX, ev.clientY); });
  el.addEventListener('pointermove', (ev) => { if (ev.pointerId === id) set(ev.clientX, ev.clientY); });
  const end = (ev) => { if (ev.pointerId !== id) return; id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  const atk = $('#tAtk');
  atk.addEventListener('pointerdown', (ev) => { atk.setPointerCapture(ev.pointerId); touchAtk = true; });
  for (const t of ['pointerup', 'pointercancel']) atk.addEventListener(t, () => { touchAtk = false; });
  const tap = (sel, fn) => $(sel).addEventListener('pointerdown', (ev) => { ev.preventDefault(); fn(); });
  tap('#tDodge', tryDodge); tap('#tUse', interact); tap('#tPot', () => usePotion()); tap('#tScroll', useScroll); tap('#tBag', () => openPanel('bag'));
})();

// ================= title, menu, death =================
let started = false;
function showTitle() {
  const has = !!loadSave() || started;
  $('#menuBtns').innerHTML = (started ? '<button class="btn" type="button" id="mResume">Resume</button>' : has ? `<button class="btn" type="button" id="mCont">Continue · Level ${S.level}, deepest ${S.best || 0}</button>` : '<button class="btn" type="button" id="mNew">Begin</button>')
    + (has ? '<button class="btn ghost" type="button" id="mNew2">New hero</button>' : '')
    + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  $('#title').hidden = false; $('#confirmNew').hidden = true; mouseDown = false;
  const b = $('#mResume') || $('#mCont') || $('#mNew'); if (b) b.focus();
}
function resume() { $('#title').hidden = true; }
function begin() {
  started = true;
  $('#title').hidden = true; $('#hud').hidden = false;
  setTouchMode(touchMode || window.matchMedia('(pointer: coarse)').matches);
  $('#touch').hidden = !touchMode;
  hud(); save();
  if (S.runs === 0 && S.kills === 0) setTimeout(() => toast('Walk to the glowing gate at the south of town to begin your first descent.', 'var(--brass-2)', true), 600);
}
function freshHero() {
  S = newSave(); uid = 1;
  S.equip.weapon = genItem(1, { slot: 'weapon', kind: 'sword', rarity: 0 });
  S.equip.chest = genItem(1, { slot: 'chest', rarity: 0 });
  ST = calcStats(); loadTown();
}
$('#title').addEventListener('click', (ev) => {
  const id = ev.target.closest('button') && ev.target.closest('button').id;
  if (id === 'mResume') resume();
  else if (id === 'mCont') begin();
  else if (id === 'mNew') { freshHero(); begin(); }
  else if (id === 'mNew2') { $('#confirmNew').hidden = false; $('#btnWipe').focus(); }
  else if (id === 'btnWipe') { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ } started = false; RUN = null; freshHero(); begin(); }
  else if (id === 'btnKeep') $('#confirmNew').hidden = true;
  else if (id === 'mSound') { toggleMute(); showTitle(); }
});
function toggleMute() { muted = !muted; $('#btnMute').textContent = muted ? 'Sound off' : 'Sound on'; if (!muted) sfx('coin'); }
$('#btnMute').addEventListener('click', toggleMute);
$('#btnMenu').addEventListener('click', showTitle);
$('#btnRevive').addEventListener('click', () => { $('#death').hidden = true; P.dead = false; returnToTown(true); });
$('#keyList').innerHTML = [
  ['WASD', 'Move'], ['Mouse', 'Aim'], ['Left click', 'Attack (hold)'], ['Space', 'Roll'], ['E', 'Use, open, talk'], ['Q / R', 'Draught / Greater'], ['T', 'Portal scroll'], ['I', 'Bag and character'], ['Esc', 'Menu'], ['`', 'Performance readout'],
].map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('') + '<div><kbd>Touch</kbd><span>Stick to move, Strike auto-aims</span></div>';

// ================= performance readout & adaptive resolution =================
const perf = { on: false, acc: 0, cpu: 0, n: 0, slow: 0, fast: 0, ratio: Math.min(window.devicePixelRatio || 1, 2), cap: Math.min(window.devicePixelRatio || 1, 2), ms: 0, cpuMs: 0 };
renderer.setPixelRatio(perf.ratio);
function perfTick(dt, cpuMs) {
  perf.acc += dt; perf.cpu += cpuMs; perf.n++;
  if (perf.n < 60) return;
  perf.ms = (perf.acc / perf.n) * 1000; perf.cpuMs = perf.cpu / perf.n;
  perf.acc = perf.cpu = 0; perf.n = 0;
  // adaptive pixel ratio: fill rate scales with ratio squared, so trade sharpness for frames when the device struggles
  if (perf.ms > 24) { perf.slow++; perf.fast = 0; } else if (perf.ms < 17.5) { perf.fast++; perf.slow = 0; } else { perf.slow = perf.fast = 0; }
  if (perf.slow >= 2 && perf.ratio > 1) { perf.ratio = Math.max(1, perf.ratio - 0.25); renderer.setPixelRatio(perf.ratio); perf.slow = 0; }
  if (perf.fast >= 6 && perf.ratio < perf.cap) { perf.ratio = Math.min(perf.cap, perf.ratio + 0.25); renderer.setPixelRatio(perf.ratio); perf.fast = 0; }
  if (perf.on) {
    const i = renderer.info;
    $('#perf').textContent = `${perf.ms.toFixed(1)} ms/frame · ${perf.cpuMs.toFixed(1)} ms CPU\n${i.render.calls} draw calls · ${fmt(i.render.triangles)} tris\n${i.memory.geometries} geometries · ${i.programs.length} programs\npixel ratio ${perf.ratio.toFixed(2)} · ${enemies.length} foes`;
  }
}

// ================= main loop =================
const timer = new THREE.Timer();
timer.connect(document);
let hudT = 0, miniT = 0, saveT = 0;
function frame(ts) {
  timer.update(ts);
  const dt = Math.min(0.05, timer.getDelta());
  const t0 = performance.now();
  if (!levelReady) { perfTick(dt, 0); return; }
  if (!isPaused()) {
    updPlayer(dt);
    if (LV.type === 'dungeon') {
      flowT -= dt;
      const ti = tidx(P.x, P.z);
      if (flowT <= 0 || ti !== flowTile) { flowT = 0.35; flowTile = ti; computeFlow(); }
      for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.dead) updEnemy(e, dt); }
      separate();
      for (const e of enemies) if (!e.dead) collide(e);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
      updTeles(dt); updDrops(dt);
      revealT -= dt; if (revealT <= 0) { revealT = 0.2; reveal(); }
    }
    updProjs(dt);
    updInteract();
    saveT += dt; if (saveT > 20) { saveT = 0; save(); }
  }
  for (const s of spinners) s.rotation.y += dt * (s.userData.spin || 1);
  updParts(dt); updSwings(dt);
  if (P.mesh) updCamera(dt);
  renderer.render(scene, camera);
  updOverlays(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; hud(); }
  miniT -= dt; if (miniT <= 0 && LV) { miniT = 0.1; drawMini(); }
  perfTick(dt, performance.now() - t0);
}

// ================= boot =================
function boot(data) {
  resize();
  buildActionBar();
  const saved = (data && data.S) || loadSave();
  if (saved) { S = normalizeSave(saved); fixUid(); ST = calcStats(); loadTown(); }
  else freshHero();
  if (data && data.started) { begin(); } else showTitle();
  renderer.setAnimationLoop(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S, started }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
return { get S() { return S; }, get P() { return P; }, get LV() { return LV; }, enemies, renderer, startDelve, begin, freshHero, openPanel, closePanel, loadDungeon, get ready() { return levelReady; }, perf };
};
