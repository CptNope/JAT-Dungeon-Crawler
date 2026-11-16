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
    boss: { name: 'The Bone Regent', shape: 'summoner', color: 0xe8dfc4, patterns: ['ring', 'summon', 'slam', 'fan', 'cross'] } },
  { id: 'fungal', name: 'Fungal Hollows', floor: 0x2f3a2c, floor2: 0x293326, wall: 0x4b5a3e, torch: 0xe2ecaa, fog: 0x0a110b, amb: 0x7a957c, bolt: 0xc6e85a, eye: 0xd6ff6a, mats: ['spore', 'chitin'], deco: 'shrooms',
    enemies: { grunt: ['Sporeling', 0xb59a6a], brute: ['Mycelid Brute', 0x8a6a8a], archer: ['Spore Spitter', 0xa8b85a], caster: ['Shroom Shaman', 0xc46a5a], skitter: ['Cave Mite', 0x6a7a4a], bomber: ['Puffball', 0xd6c48a], summoner: ['Spore Mother', 0x9a5a8a], warden: ['Chitin Guard', 0x5a7a5a] },
    boss: { name: 'Mother Mycelia', shape: 'bomber', color: 0xc46a8a, patterns: ['spiral', 'summon', 'meteor', 'ring'] } },
  { id: 'magma', name: 'Magma Forge', floor: 0x3a2622, floor2: 0x2f201d, wall: 0x5a332b, torch: 0xff7a2a, fog: 0x140806, amb: 0x9a5a44, bolt: 0xff8a3a, eye: 0xffd24a, mats: ['ember', 'obsidian'], deco: 'cracks',
    enemies: { grunt: ['Cinder Imp', 0xd0603a], brute: ['Molten Golem', 0x6a3a2a], archer: ['Flame Slinger', 0xc07a4a], caster: ['Pyromancer', 0xa03a3a], skitter: ['Ember Wisp', 0xffa04a], bomber: ['Magma Bomb', 0x3a2a2a], summoner: ['Furnace Priest', 0x7a2a2a], warden: ['Obsidian Sentinel', 0x3a3448] },
    boss: { name: 'Ashmaw the Forge-Wyrm', shape: 'brute', color: 0x8a3a24, patterns: ['charge', 'fan', 'meteor', 'ring', 'chase'] } },
  { id: 'frost', name: 'Rime Halls', floor: 0x5a6878, floor2: 0x52606f, wall: 0x8297ac, torch: 0x9fd4ff, fog: 0x0b1218, amb: 0x8aaad0, bolt: 0x9fe0ff, eye: 0x9ff0ff, mats: ['shard', 'pelt'], deco: 'ice',
    enemies: { grunt: ['Frostbitten Raider', 0x9aa8b8], brute: ['Rime Troll', 0xc8d8e8], archer: ['Ice Huntress', 0x7a9ab8], caster: ['Frost Witch', 0x5a7ab8], skitter: ['Rime Mite', 0xe8f4ff], bomber: ['Cryo Bloat', 0x8ac8e8], summoner: ['Winter Caller', 0x3a5a8a], warden: ['Glacier Knight', 0x6a8aa8] },
    boss: { name: 'The Rime Sovereign', shape: 'warden', color: 0xb8d8f0, patterns: ['fan', 'ring', 'slam', 'charge', 'ripple'] } },
  { id: 'void', name: 'The Hollow Rift', floor: 0x241e34, floor2: 0x1e192c, wall: 0x3c3158, torch: 0xb08cff, fog: 0x07050d, amb: 0x6a5aaa, bolt: 0xd06cff, eye: 0xff6cf0, mats: ['voiddust', 'starglass'], deco: 'shards',
    enemies: { grunt: ['Hollow Thrall', 0x5a4a7a], brute: ['Null Brute', 0x3a2a5a], archer: ['Rift Archer', 0x7a5aaa], caster: ['Void Seer', 0x9a4ad0], skitter: ['Glimmer Wisp', 0xd0b0ff], bomber: ['Unstable Rift', 0x6a2aa0], summoner: ['Star Weaver', 0x2a2a6a], warden: ['Abyssal Warden', 0x2a2040] },
    boss: { name: 'The Hollow Star', shape: 'caster', color: 0x9a6aff, patterns: ['teleport', 'spiral', 'ring', 'summon'] } },
];
const biomeOf = (d) => BIOMES[Math.floor((d - 1) / 5) % BIOMES.length]; // five depths per biome, ten biomes, then round again
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
  // skill-changing powers
  { name: 'Maelstrom Sash', power: 'vortex', desc: 'Using a skill drags foes within 7 paces toward you and slows them.', skill: 1 },
  { name: 'Earthshaker Greaves', power: 'quake', desc: 'Every roll ends in a shockwave that strikes and staggers foes around you.', skill: 1 },
  { name: 'Horn of the Old Guard', power: 'warhorn', desc: 'Using a skill grants 15% damage for 5 seconds, stacking three times.', skill: 1 },
  { name: 'Quiver of Ash', power: 'barrage', desc: 'Using a skill looses five seeking ember-bolts at nearby foes.', skill: 1 },
  { name: 'Tempest Crown', power: 'storm', desc: 'Using a skill calls lightning down on up to three foes.', skill: 1 },
  { name: 'Rimewalker Band', power: 'frostpath', desc: 'Using a skill chills every foe within 5 paces; chilled foes struck again freeze.', skill: 1 },
  { name: 'Ring of Embers', power: 'emberring', desc: 'A ring of fire circles you, burning foes it touches.', skill: 1 },
  { name: 'Twinstar Seal', power: 'twinstar', desc: 'Skills have a 30% chance to come straight back off cooldown.', skill: 1 },
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
function genItem(il, o = {}) { // (Ancient and Primal rolls happen in lootItem)
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
  if (r >= 2 && o.sock !== 0) { it.sock = o.sock !== undefined ? o.sock : randi(r >= 3 ? 1 : 0, Math.min(MAX_SOCK, r - 1)); if (it.sock) it.gems = Array(it.sock).fill(null); else delete it.sock; }
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
  kennel: { n: 'Kennel', levels: [
    { n: 'No Kennel' },
    { n: 'Doghouse', cost: { gold: 400, bone: 6 } },
    { n: 'Hound Kennel', cost: { gold: 2200, chitin: 8, iron: 12 } },
    { n: 'Wolf Den', cost: { gold: 7000, pelt: 8, ember: 6, sigil: 1 } },
  ], fx: (l) => (l === 0 ? 'No companion yet. Build a doghouse and a hound will follow you into the deep.' : `Your ${['', 'hound', 'hound', 'dire wolf'][l]} fights beside you, biting for ${[0, 30, 45, 65][l]}% of your damage.`) },
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
    mats: { herb: 2, iron: 2 }, home: { house: 0, bench: 0, garden: 0, kennel: 0, trophy: 0 },
    bossKills: 0, slain: [], best: 0, kills: 0, deaths: 0, waypoints: [1], shop: null,
    elixirs: { might: 0, stone: 0, swift: 0 }, rested: false, runs: 0,
    quest: null, questOffers: null, questsDone: 0,
    cls: null, diff: 'normal', filter: 'none', loadouts: [null, null, null], learned: [], tal: {}, hints: {}, shards: 0, rift: { max: 1, best: {} }, arenaBest: 0, caravan: null, gems: {}, stats: {}, ach: {}, bestiary: {}, records: [], decor: {}, time: 0, pet: null, created: Date.now(),
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
  applyMeta(s);
  { const q = applyParagon(s); s.dmg *= 1 + q.dmg; s.maxHp *= 1 + q.hp; s.armor *= 1 + q.arm; s.aspd += q.aspd; s.move += q.move; s.mf += q.mf; s.gold += q.gold; }
  if (S.decor && S.decor.gourd) s.gold += 3;
  if (RUN && LV && LV.type === 'dungeon') {
    if (RUN.buffs.plenty) s.gold += 50;
    if (RUN.buffs.might) s.dmg *= 1.25;
    if (RUN.buffs.stone) s.armor = s.armor * 1.4 + 10;
    if (RUN.buffs.swift) { s.move += 15; s.aspd += 15; }
    if (RUN.rested) s.maxHp *= 1 + (6 + 4 * S.home.house) / 100;
    const sh = RUN.shrine; // floor-long blessing from a shrine
    if (sh === 'fury') s.dmg *= 1.3;
    else if (sh === 'stone') s.armor = s.armor * 1.5 + 8;
    else if (sh === 'fortune') { s.mf += 60; s.gold += 50; }
    else if (sh === 'haste') { s.move += 20; s.aspd += 20; }
    else if (sh === 'life') s.regen += (100 + (S.level - 1) * 14) * 0.02;
  }
  s.maxHp = Math.round(s.maxHp);
  s.crit = Math.min(75, s.crit);
  if (P.cryT > 0) { s.dmg *= 1.3; s.armor *= 1.3; } // War Cry
  if (RUN && RUN.rift && LV && LV.type === 'dungeon') { if (RUN.rift.mods.includes('glass')) s.dmg *= 2; if (RUN.rift.mods.includes('drain')) s.regen = 0; }
  return s;
}
let ST = null;
// ================= classes =================
const CLASSES = {
  warrior: { n: 'Warrior', col: 0x8a3a32, trim: 0xb8c2cf, weapon: 'sword', aff: ['sword', 'axe', 'hammer', 'spear'], skills: ['whirl', 'leap', 'cry'],
    d: 'Plate, steel and nerve. Built to stand in the press of foes.', perk: '+20% max health, +6 armor, +10% damage with swords, axes, warhammers and spears.' },
  ranger: { n: 'Ranger', col: 0x3f6a3a, trim: 0x8a6a4a, weapon: 'bow', aff: ['bow', 'dagger', 'spear'], skills: ['volley', 'dash', 'rain'],
    d: 'Quick feet and a sharp eye. Kills from range and never stands still.', perk: '+5% critical chance, +8% move speed, +10% damage with bows, daggers and spears.' },
  mage: { n: 'Mage', col: 0x4a3a8a, trim: 0xe0aa50, weapon: 'staff', aff: ['staff'], skills: ['nova', 'blink', 'meteor'],
    d: 'Fire, frost and folded space. Fragile, and terrifying when the cooldowns line up.', perk: '+25% skill damage, +0.6 health per second, +15% damage with staves.' },
  necro: { n: 'Necromancer', col: 0x2c3a30, trim: 0xb9e8b0, weapon: 'dagger', aff: ['dagger', 'staff'], skills: ['raise', 'bonespear', 'corpse'],
    d: 'Bone, rot and borrowed soldiers. Never fights alone, and every fallen foe is another weapon.', perk: 'Heal 2% of max health per kill, +6% damage reduction, +12% damage with daggers and staves.' },
};
const clsOf = () => CLASSES[(S && S.cls) || 'warrior'];
const SKILL_DEFS = {
  whirl: { n: 'Whirlwind', cd: 6, d: 'Spin with your weapon out, striking every foe around you twice for 85% damage each.' },
  leap: { n: 'Leap Slam', cd: 8, d: 'Leap up to seven paces and crash down for 220% damage around where you land, flinging foes away.' },
  cry: { n: 'War Cry', cd: 16, d: 'Roar: foes nearby are thrown back and you gain +30% damage and +30% armor for 8 seconds. Heals 10%.' },
  volley: { n: 'Volley', cd: 5, d: 'Loose a fan of nine arrows, each dealing 70% damage. Works with any weapon.' },
  dash: { n: 'Shadow Dash', cd: 7, d: 'Dash six paces through foes, striking each for 200% damage. Nothing can hit you mid-dash.' },
  rain: { n: 'Rain of Arrows', cd: 12, d: 'Storm-tipped arrows fall on a target area for two seconds, hitting every foe inside ten times for 45% lightning damage. Lightning on a burning foe overloads.' },
  nova: { n: 'Ember Nova', cd: 9, d: 'A ring of fire bursts from you for 250% fire damage, hurling foes back and setting them alight. Fire on a chilled foe is a thermal shock.' },
  blink: { n: 'Blink', cd: 6, d: 'Fold space and step up to seven paces away. Frost bursts where you stood: 120% cold damage and a deep chill. Chilling a chilled foe freezes it.' },
  raise: { n: 'Raise Skeletons', cd: 8, d: 'Two skeletons claw out of the ground and fight beside you for 20 seconds, each hitting for 45% of your damage. Up to four at once.' },
  bonespear: { n: 'Bone Spear', cd: 4, d: 'Hurl a lance of bone that passes through every foe in a line for 260% damage.' },
  corpse: { n: 'Corpse Explosion', cd: 7, d: 'Every fallen foe within nine paces bursts, dealing 160% damage around itself. The fresher the dead, the more you have to work with.' },
  meteor: { n: 'Meteor', cd: 11, d: 'Call a falling star onto the target area: 380% fire damage and a burning crater. A critical hit shatters frozen foes.' },
};
const SKILL_LVL = [1, 4, 8];

// ================= talents =================
// Three tiers per class; a tier opens once enough points sit in the tiers above it.
const TIER_REQ = [0, 4, 8];
const TALENTS = {
  warrior: [
    { id: 'brawn', n: 'Brawn', t: 0, d: (r) => `+${6 * r}% damage` },
    { id: 'hide', n: 'Iron Hide', t: 0, d: (r) => `+${8 * r}% armor and +${4 * r}% max health` },
    { id: 'cleave', n: 'Cleave', t: 0, d: (r) => `Melee swings sweep ${12 * r}% wider and reach ${5 * r}% farther` },
    { id: 'bloodlust', n: 'Bloodlust', t: 1, d: (r) => `+${r}% life steal` },
    { id: 'shieldwall', n: 'Shield Wall', t: 1, d: (r) => `${6 * r}% chance to block a blow outright` },
    { id: 'warlord', n: 'Warlord', t: 1, d: (r) => `Skills recharge ${8 * r}% faster` },
    { id: 'juggernaut', n: 'Juggernaut', t: 2, d: (r) => `+${10 * r}% max health` },
    { id: 'executioner', n: 'Executioner', t: 2, d: (r) => `+${15 * r}% damage to foes below 30% health` },
    { id: 'rage', n: 'Rage', t: 2, d: (r) => `Every kill takes ${(0.3 * r).toFixed(1)}s off your skill cooldowns` },
  ],
  ranger: [
    { id: 'keen', n: 'Keen Eye', t: 0, d: (r) => `+${3 * r}% critical chance` },
    { id: 'fleet', n: 'Fleet', t: 0, d: (r) => `+${5 * r}% move speed` },
    { id: 'quickdraw', n: 'Quickdraw', t: 0, d: (r) => `+${6 * r}% attack speed` },
    { id: 'deadeye', n: 'Deadeye', t: 1, d: (r) => `+${15 * r}% critical damage` },
    { id: 'multishot', n: 'Multishot', t: 1, d: (r) => `${15 * r}% chance for a ranged attack to loose two extra shots` },
    { id: 'evasion', n: 'Evasion', t: 1, d: (r) => `${6 * r}% chance to sidestep a blow` },
    { id: 'huntersmark', n: "Hunter's Mark", t: 2, d: (r) => `+${10 * r}% damage to champions, leaders and bosses` },
    { id: 'ricochet', n: 'Ricochet', t: 2, d: (r) => `Arrows and bolts pass through ${r} more foe${r > 1 ? 's' : ''}` },
    { id: 'windstep', n: 'Wind Step', t: 2, d: (r) => `Your roll recharges ${15 * r}% faster` },
  ],
  mage: [
    { id: 'arcana', n: 'Arcana', t: 0, d: (r) => `+${12 * r}% skill damage` },
    { id: 'focus', n: 'Focus', t: 0, d: (r) => `Skills recharge ${7 * r}% faster` },
    { id: 'kindling', n: 'Kindling', t: 0, d: (r) => `+${6 * r}% chance to burn` },
    { id: 'frostbite', n: 'Frostbite', t: 1, d: (r) => `+${6 * r}% chance to chill` },
    { id: 'manashield', n: 'Mana Shield', t: 1, d: (r) => `Take ${5 * r}% less damage` },
    { id: 'volatile', n: 'Volatile', t: 1, d: (r) => `${10 * r}% chance a slain foe bursts for 60% damage around it` },
    { id: 'archmage', n: 'Archmage', t: 2, d: (r) => `+${8 * r}% damage` },
    { id: 'overflow', n: 'Overflow', t: 2, d: (r) => `${10 * r}% chance a skill costs no cooldown` },
    { id: 'glass', n: 'Glass Cannon', t: 2, d: (r) => `+${4 * r}% critical chance and +${12 * r}% critical damage` },
  ],
  necro: [
    { id: 'gravepact', n: 'Grave Pact', t: 0, d: (r) => `Skeletons deal +${20 * r}% damage` },
    { id: 'bonearmor', n: 'Bone Armor', t: 0, d: (r) => `+${8 * r}% armor and +${3 * r}% max health` },
    { id: 'siphon', n: 'Soul Siphon', t: 0, d: (r) => `+${r}% life steal` },
    { id: 'legion', n: 'Legion', t: 1, d: (r) => `Skeletons last ${5 * r} seconds longer, and Raise calls ${r >= 3 ? 'three' : 'two'}` },
    { id: 'marrow', n: 'Marrow', t: 1, d: (r) => `Bone Spear deals +${20 * r}% damage and recharges ${0.3 * r}s faster` },
    { id: 'plague', n: 'Plague', t: 1, d: (r) => `Corpse Explosion bursts ${15 * r}% wider and reaches ${r * 2} paces farther` },
    { id: 'lich', n: 'Lich Form', t: 2, d: (r) => `+${8 * r}% damage` },
    { id: 'undying', n: 'Undying', t: 2, d: (r) => `Skeletons burst for ${50 * r}% damage when they fall back to dust` },
    { id: 'reaper', n: 'Reaper', t: 2, d: (r) => `+${4 * r}% critical chance; every kill takes ${(0.2 * r).toFixed(1)}s off your skill cooldowns` },
  ],
};
const TAL_MAX = 3;
const tal = (id) => (S && S.tal && S.tal[id]) || 0;
const talSpent = (t) => Object.entries((S && S.tal) || {}).reduce((a, [id, r]) => a + (t === undefined || (TALENTS[S.cls] || []).find((q) => q.id === id && q.t < t) ? r : 0), 0);
const talPoints = () => Math.max(0, S.level - 1 - talSpent());
const respecCost = () => 40 * S.level;

// ================= set items =================
const SETS = {
  ember: { n: 'Regalia of the Ember King', pieces: { helm: 'Ember Crown', chest: 'Ember Mantle', amulet: 'Heart of Embers' },
    b2: '+25% burn chance; burning foes take double from the flames', b3: 'Skills deal +40% damage' },
  warden: { n: "Grave Warden's Plate", pieces: { helm: "Warden's Visor", chest: "Warden's Cuirass", boots: "Warden's Greaves" },
    b2: '+30% armor', b3: '+20% max health and 10% chance to block' },
  wind: { n: "Windrunner's Garb", pieces: { boots: 'Windrunner Treads', ring: 'Windrunner Band', amulet: 'Windrunner Charm' },
    b2: '+15% move and attack speed', b3: '+10% critical chance and +40% critical damage' },
};
function setCounts() { const c = {}; for (const sl of SLOTS) { const it = S.equip[sl]; if (it && it.set) c[it.set] = (c[it.set] || 0) + 1; } return c; }
function makeSetItem(il, setKey, slot) {
  const sk = setKey || pick(Object.keys(SETS)), Sd = SETS[sk];
  const sl = slot && Sd.pieces[slot] ? slot : pick(Object.keys(Sd.pieces));
  const it = genItem(il, { slot: sl, rarity: 4 });
  delete it.power; it.set = sk; it.lname = Sd.pieces[sl]; it.name = it.lname;
  return it;
}

// ================= gems =================
const GEMS = {
  ruby: { n: 'Ruby', c: '#e0475a', v: [4, 8, 14], l: (v) => `+${v}% damage` },
  sapphire: { n: 'Sapphire', c: '#4a7af0', v: [8, 16, 28], l: (v) => `+${v}% armor` },
  emerald: { n: 'Emerald', c: '#3ac07a', v: [2, 4, 7], l: (v) => `+${v}% critical chance` },
  topaz: { n: 'Topaz', c: '#f0b83a', v: [12, 24, 40], l: (v) => `+${v}% gold and magic find` },
  amethyst: { n: 'Amethyst', c: '#a65af0', v: [5, 10, 16], l: (v) => `+${v}% max health` },
};
const GEM_TIER = ['Chipped', 'Flawless', 'Perfect'];
const gemKey = (g, t) => g + t; // t is 1..3
const gemSplit = (k) => [k.slice(0, -1), +k.slice(-1)];
const gemName = (k) => { const [g, t] = gemSplit(k); return `${GEM_TIER[t - 1]} ${GEMS[g].n}`; };
const gemLine = (k) => { const [g, t] = gemSplit(k); return GEMS[g].l(GEMS[g].v[t - 1]); };
const MAX_SOCK = 2;

// ================= deeper biomes =================
BIOMES.push(
  { id: 'drowned', name: 'The Drowned Deep', floor: 0x2a3e44, floor2: 0x24363b, wall: 0x3e5a60, torch: 0x7af0d8, fog: 0x061214, amb: 0x5a9aa0, bolt: 0x5af0d0, eye: 0x9affe8, mats: ['pearl', 'brine'], deco: 'kelp',
    enemies: { grunt: ['Drowned Sailor', 0x6a8a8a], brute: ['Reef Hulk', 0x4a6a6a], archer: ['Harpooner', 0x8aa8a0], caster: ['Tide Witch', 0x3a8a9a], skitter: ['Lantern Eel', 0x7ad0c0], bomber: ['Bloat Jelly', 0x9ad0e8], summoner: ['Deep Choir', 0x2a5a6a], warden: ['Coral Knight', 0xc06a6a] },
    boss: { name: 'Leviathan Mother', shape: 'brute', color: 0x3a9aa0, patterns: ['whirlpool', 'wave', 'ring', 'summon'] } },
  { id: 'clock', name: 'The Clockwork Vault', floor: 0x3a3428, floor2: 0x332e24, wall: 0x5a4e38, torch: 0xffd27a, fog: 0x100c06, amb: 0x9a8a6a, bolt: 0xffc84a, eye: 0x7af0ff, mats: ['cog', 'brass'], deco: 'gears',
    enemies: { grunt: ['Brass Soldier', 0xb08a4a], brute: ['Siege Engine', 0x6a5a4a], archer: ['Bolt Turret', 0x9a8a6a], caster: ['Tinker Adept', 0x5a7a9a], skitter: ['Spring Mite', 0xc8a86a], bomber: ['Powder Keg', 0x8a5a3a], summoner: ['Foundry Mind', 0x4a5a6a], warden: ['Iron Sentry', 0x7a7a82] },
    boss: { name: 'The Grand Orrery', shape: 'warden', color: 0xd0a050, patterns: ['beam', 'spiral', 'slam', 'fan'] } },
  { id: 'blood', name: 'The Bloodroot Warren', floor: 0x362a2a, floor2: 0x2e2424, wall: 0x4e3434, torch: 0xffa27a, fog: 0x100608, amb: 0x8a5a5e, bolt: 0xff3a5a, eye: 0xffd06a, mats: ['sap', 'thorn'], deco: 'roots',
    enemies: { grunt: ['Thornling', 0x8a4a3a], brute: ['Root Colossus', 0x5a3a2a], archer: ['Seed Spitter', 0x9a6a4a], caster: ['Blood Druid', 0xa03a4a], skitter: ['Tick Swarm', 0x6a2a2a], bomber: ['Gore Pod', 0xc04a5a], summoner: ['Heartwood Crone', 0x6a3a4a], warden: ['Bark Warden', 0x5a4a3a] },
    boss: { name: 'The Heart of the Wood', shape: 'summoner', color: 0xd03a5a, patterns: ['roots', 'summon', 'meteor', 'whirlpool'] } },
  // past the Hollow King: depths 41 to 50
  { id: 'shore', name: 'The Starless Shore', floor: 0x24272e, floor2: 0x1f2228, wall: 0x343a46, torch: 0xa8c8ff, fog: 0x04060c, amb: 0x4f6c9e, bolt: 0x7ab8ff, eye: 0xc8e8ff, mats: ['moonpearl', 'driftwood'], deco: 'pools',
    enemies: { grunt: ['Shoal Wretch', 0x5a6a8a], brute: ['Tidewalker Giant', 0x3a4a6a], archer: ['Pearl Sniper', 0xb8c8e0], caster: ['Moon Oracle', 0x8a9ae8], skitter: ['Glass Shrimp', 0xa8e0ff], bomber: ['Ink Sac', 0x2a2a44], summoner: ['Shell Mother', 0xe0b8c8], warden: ['Barnacle Knight', 0x6a7a8a] },
    boss: { name: 'The Drowned Moon', shape: 'caster', color: 0xbfd8ff, patterns: ['ripple', 'wave', 'spiral', 'summon'] } },
  { id: 'gilded', name: 'The Gilded Necropolis', floor: 0x4a4438, floor2: 0x423c32, wall: 0x6e6450, torch: 0xffe6a0, fog: 0x0e0b06, amb: 0xb09a72, bolt: 0xffd860, eye: 0xfff2c0, mats: ['goldleaf', 'relic'], deco: 'urns',
    enemies: { grunt: ['Gilded Mummy', 0xc8b888], brute: ['Tomb Colossus', 0x8a7a5a], archer: ['Reliquary Archer', 0xd8c8a0], caster: ['Embalmer', 0x6a8a7a], skitter: ['Scarab Swarm', 0x3a6a5a], bomber: ['Canopic Jar', 0xb08a5a], summoner: ['High Priest', 0xe0c060], warden: ['Sarcophagus Guard', 0xd0a848] },
    boss: { name: 'The Gilded Sovereign', shape: 'warden', color: 0xf0c850, patterns: ['cross', 'chase', 'beam', 'summon'] } },
);
Object.assign(MATS, {
  pearl: { n: 'Black Pearl', c: '#5a8a9a', where: 'The Drowned Deep, depths 26 to 30' },
  brine: { n: 'Brine Salt', c: '#bfe8e0', where: 'The Drowned Deep, depths 26 to 30' },
  cog: { n: 'Spring Cog', c: '#c8a050', where: 'The Clockwork Vault, depths 31 to 35' },
  brass: { n: 'Brass Plate', c: '#e0b860', where: 'The Clockwork Vault, depths 31 to 35' },
  sap: { n: 'Bloodsap', c: '#d03a4a', where: 'The Bloodroot Warren, depths 36 to 40' },
  thorn: { n: 'Heartthorn', c: '#8a5a3a', where: 'The Bloodroot Warren, depths 36 to 40' },
  moonpearl: { n: 'Moon Pearl', c: '#a8d0ff', where: 'The Starless Shore, depths 41 to 45' },
  driftwood: { n: 'Pale Driftwood', c: '#c8c0b0', where: 'The Starless Shore, depths 41 to 45' },
  goldleaf: { n: 'Gold Leaf', c: '#f0c850', where: 'The Gilded Necropolis, depths 46 to 50' },
  relic: { n: 'Sealed Relic', c: '#d8b880', where: 'The Gilded Necropolis, depths 46 to 50' },
});
const MAT_ORDER = Object.keys(MATS);
// two new behaviours, named per biome
ARCH.leaper = { hp: 34, dmg: 13, spd: 3.8, r: 0.4, xp: 11, ai: 'leaper', range: 1.2, cd: 3.2, w: 9, from: 3 };
ARCH.totem = { hp: 70, dmg: 7, spd: 0, r: 0.5, xp: 16, ai: 'totem', range: 9, cd: 4.2, w: 4, from: 6, armor: 0.2 };
const NEW_FOES = {
  crypt: { leaper: ['Grave Hound', 0x8a8070], totem: ['Bone Obelisk', 0xcfc6ae] },
  fungal: { leaper: ['Hopping Toad', 0x6a8a4a], totem: ['Spore Stalk', 0xb59a6a] },
  magma: { leaper: ['Lava Hopper', 0xd06a3a], totem: ['Brimstone Idol', 0x5a3a2a] },
  frost: { leaper: ['Snow Stalker', 0xd8e4f0], totem: ['Rime Pylon', 0x8ab0d0] },
  void: { leaper: ['Rift Lurker', 0x6a4a9a], totem: ['Null Monolith', 0x2a2448] },
  drowned: { leaper: ['Reef Crab', 0xc0604a], totem: ['Tide Bell', 0x5a8a8a] },
  clock: { leaper: ['Pounce Engine', 0xa08048], totem: ['Tesla Coil', 0x7a8aa0] },
  blood: { leaper: ['Flayed Hound', 0xa04a4a], totem: ['Heart Shrine', 0x6a2a3a] },
  shore: { leaper: ['Riptide Hound', 0x4a6a9a], totem: ['Lighthouse Idol', 0x9ab8e0] },
  gilded: { leaper: ['Jackal Shade', 0x5a4a3a], totem: ['Sun Obelisk', 0xe0c060] },
};
for (const B of BIOMES) Object.assign(B.enemies, NEW_FOES[B.id]);

// ================= achievements =================
const ACH = [
  { id: 'blood', n: 'First Blood', d: 'Slay a foe', ok: () => S.kills >= 1 },
  { id: 'k100', n: 'Hundred-Slayer', d: 'Slay 100 foes', ok: () => S.kills >= 100 },
  { id: 'k1000', n: 'Thousand-Slayer', d: 'Slay 1,000 foes', ok: () => S.kills >= 1000 },
  { id: 'k5000', n: 'Bane of the Deep', d: 'Slay 5,000 foes', ok: () => S.kills >= 5000 },
  { id: 'd5', n: 'Into the Dark', d: 'Reach depth 5', ok: () => S.best >= 5 },
  { id: 'd10', n: 'Hollow-Walker', d: 'Reach depth 10', ok: () => S.best >= 10 },
  { id: 'd25', n: 'Riftborn', d: 'Reach depth 25', ok: () => S.best >= 25 },
  { id: 'd40', n: 'Below the Roots', d: 'Reach depth 40', ok: () => S.best >= 40 },
  { id: 'b1', n: 'Kingslayer', d: 'Slay a boss', ok: () => S.bossKills >= 1 },
  { id: 'b5', n: 'Trophy Hunter', d: 'Slay 5 bosses', ok: () => S.bossKills >= 5 },
  { id: 'b10', n: 'Legend of Hearthdeep', d: 'Slay 10 bosses', ok: () => S.bossKills >= 10 },
  { id: 'lead', n: 'Headhunter', d: 'Slay a pack leader', ok: () => (S.stats.leaders || 0) >= 1 },
  { id: 'champ', n: 'Champion of Champions', d: 'Slay 25 champions', ok: () => (S.stats.champs || 0) >= 25 },
  { id: 'leg', n: 'Touched by Legend', d: 'Find a legendary item', ok: () => (S.stats.legs || 0) >= 1 },
  { id: 'setp', n: 'Matched Pieces', d: 'Find a set item', ok: () => (S.stats.sets || 0) >= 1 },
  { id: 'fullset', n: 'Fully Arrayed', d: 'Wear every piece of a set', ok: () => Object.values(setCounts()).some((n) => n >= 3) },
  { id: 'gold', n: 'Dragon Hoard', d: 'Hold 10,000 gold', ok: () => S.gold >= 10000 },
  { id: 'build', n: 'Homesteader', d: 'Fully build any part of your home', ok: () => Object.entries(HOME).some(([k, h]) => S.home[k] >= h.levels.length - 1) },
  { id: 'keep', n: 'Lord of the Keep', d: 'Build the Hearth Keep', ok: () => S.home.house >= 4 },
  { id: 'craft', n: 'Artisan', d: 'Craft 25 things at your bench', ok: () => (S.stats.crafts || 0) >= 25 },
  { id: 'quest', n: 'Friend of the Village', d: 'Finish 10 of Elder Maren\'s tasks', ok: () => (S.questsDone || 0) >= 10 },
  { id: 'tal', n: 'Honed', d: 'Spend 10 talent points', ok: () => talSpent() >= 10 },
  { id: 'gem', n: 'Jeweller', d: 'Set a gem in a socket', ok: () => (S.stats.socketed || 0) >= 1 },
  { id: 'pgem', n: 'Flawless Victory', d: 'Cut a Perfect gem', ok: () => (S.stats.perfect || 0) >= 1 },
  { id: 'run10', n: 'Deep Breath', d: 'Descend 10 floors in a single trip', ok: () => (S.stats.longest || 0) >= 10 },
  { id: 'pet', n: 'Good Companion', d: 'Take a companion into the deep', ok: () => S.home.kennel >= 1 },
  { id: 'altar', n: 'Silence the Altars', d: 'Silence 5 cursed altars', ok: () => (S.stats.altars || 0) >= 5 },
  { id: 'decor', n: 'House Proud', d: 'Place 4 decorations at home', ok: () => Object.values(S.decor || {}).filter(Boolean).length >= 4 },
];
function checkAch() {
  if (!S || !started) return;
  for (const a of ACH) {
    if (S.ach[a.id] || !a.ok()) continue;
    S.ach[a.id] = Date.now();
    toast(`Achievement: ${a.n}`, 'var(--brass-2)', true); sfx('quest');
  }
}
const statInit = () => { if (S && !S.hints) S.hints = {}; };
const stat = (k, n) => { S.stats[k] = (S.stats[k] || 0) + (n === undefined ? 1 : n); };

// ================= derived stats from class, talents, sets and gems =================
function applyMeta(s) {
  const C = S.cls || 'warrior';
  s.skillM = 1; s.cdr = 0; s.block = 0; s.evade = 0; s.dr = 0; s.arcM = 1; s.reachM = 1; s.pierce = 0; s.rollM = 1; s.burnM = 1;
  let dmgM = 1, hpM = 1, armM = 1;
  const aff = CLASSES[C].aff.includes(s.wk);
  if (C === 'warrior') { hpM += 0.2; s.armor += 6; if (aff) dmgM += 0.1; }
  else if (C === 'ranger') { s.crit += 5; s.move += 8; if (aff) dmgM += 0.1; }
  else if (C === 'necro') { s.dr += 6; if (aff) dmgM += 0.12; }
  else { s.skillM += 0.25; s.regen += 0.6; if (aff) dmgM += 0.15; }
  // talents
  dmgM += 0.06 * tal('brawn') + 0.08 * tal('archmage') + 0.08 * tal('lich');
  armM += 0.08 * tal('hide') + 0.08 * tal('bonearmor'); hpM += 0.04 * tal('hide') + 0.1 * tal('juggernaut') + 0.03 * tal('bonearmor');
  s.ls += tal('siphon'); s.crit += 4 * tal('reaper');
  s.arcM += 0.12 * tal('cleave'); s.reachM += 0.05 * tal('cleave');
  s.ls += tal('bloodlust'); s.block += 6 * tal('shieldwall'); s.cdr += 8 * tal('warlord') + 7 * tal('focus');
  s.crit += 3 * tal('keen') + 4 * tal('glass'); s.move += 5 * tal('fleet'); s.aspd += 6 * tal('quickdraw');
  s.critd += 15 * tal('deadeye') + 12 * tal('glass'); s.evade += 6 * tal('evasion'); s.pierce += tal('ricochet'); s.rollM -= 0.15 * tal('windstep');
  s.skillM += 0.12 * tal('arcana'); s.burn += 6 * tal('kindling'); s.chill += 6 * tal('frostbite'); s.dr += 5 * tal('manashield');
  // gems
  for (const sl of SLOTS) {
    const it = S.equip[sl]; if (!it || !it.gems) continue;
    for (const k of it.gems) {
      if (!k) continue; const [g, t] = gemSplit(k), v = GEMS[g].v[t - 1];
      if (g === 'ruby') dmgM += v / 100; else if (g === 'sapphire') armM += v / 100; else if (g === 'emerald') s.crit += v; else if (g === 'topaz') { s.gold += v; s.mf += v; } else hpM += v / 100;
    }
  }
  // sets
  const sc = setCounts(); s.sets = sc;
  if (sc.ember >= 2) { s.burn += 25; s.burnM = 2; } if (sc.ember >= 3) s.skillM += 0.4;
  if (sc.warden >= 2) armM += 0.3; if (sc.warden >= 3) { hpM += 0.2; s.block += 10; }
  if (sc.wind >= 2) { s.move += 15; s.aspd += 15; } if (sc.wind >= 3) { s.crit += 10; s.critd += 40; }
  // home decorations
  const D = S.decor || {};
  if (D.statue) dmgM += 0.03;
  if (D.fountain) s.gold += 10;
  if (D.banners) s.mf += 5;
  s.dmg *= dmgM; s.maxHp *= hpM; s.armor *= armM;
  s.cdr = Math.min(60, s.cdr); s.block = Math.min(40, s.block); s.evade = Math.min(40, s.evade);
  return s;
}
// loot from foes and chests: a share of legendary rolls become set pieces
function lootItem(il, o) { const it = genItem(il, o); return maybeAscend(it.rarity === 4 && chance(0.4) ? makeSetItem(il) : it, il, (RUN && RUN.rift ? Math.min(0.08, (RUN.rift.tier || 0) * 0.003) : 0)); }
// ================= settings =================
const SET_KEY = 'hearthdeep.settings.v1';
const SET = (() => { const d = { cam: 'top', q: 'high', sens: 1, music: true, shake: true, hints: true, slot: 0, haptics: true, motion: false, battery: false, cb: 'default', ui: 1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (err) { return d; } })();
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
const spellPool = [new THREE.PointLight(0xffffff, 0, 10, 2)]; // one light that flashes where spells land (High quality only)
for (const l of spellPool) { l.position.set(0, -50, 0); scene.add(l); }
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
  for (const l of spellPool) l.visible = Q.pool >= 4;
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
  if (o.emissive) { m.emissive.set(color); m.emissiveIntensity = o.emissive; }
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
    uniforms: { uTop: { value: new THREE.Color(0x4a78b0) }, uHor: { value: new THREE.Color(0xf3c48a) }, uLow: { value: new THREE.Color(0x6b7a5a) }, uSun: { value: new THREE.Vector3(-0.6, 0.35, 0.7).normalize() }, uSunCol: { value: new THREE.Color(0xffd8a0) }, uNight: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop, uHor, uLow, uSun, uSunCol; uniform float uNight; varying vec3 vDir;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){ vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(uHor, uTop, pow(smoothstep(0.0, 0.6, h), 0.7)) : mix(uHor, uLow, smoothstep(0.0, 0.15, -h));
        float s = max(dot(d, uSun), 0.0); c += uSunCol * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.35);
        if (uNight > 0.01 && h > 0.0) { vec3 q = floor(d * 380.0); float st = step(0.9975, hash(q)); float tw = 0.6 + 0.4 * hash(q + 7.0); c += vec3(1.6, 1.7, 2.0) * st * tw * uNight * smoothstep(0.02, 0.25, h); }
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
  drowned: { col: 0x9affe8, glow: 1.6, vel: [0.02, 0.35, 0.02], size: 0.08, wobble: 0.8, box: 6 },
  clock: { col: 0xffd27a, glow: 3.0, vel: [0.3, -0.5, 0.1], size: 0.06, wobble: 0.2, box: 7 },
  blood: { col: 0xff6a7a, glow: 2.4, vel: [0.05, -0.12, 0.03], size: 0.1, wobble: 0.7, box: 6 },
  shore: { col: 0xbfe0ff, glow: 2.8, vel: [0.02, 0.06, 0.02], size: 0.07, wobble: 1.2, box: 7 },
  gilded: { col: 0xffe08a, glow: 2.6, vel: [0.04, -0.08, 0.04], size: 0.06, wobble: 0.5, box: 6 },
  night: { col: 0xd8ff7a, glow: 4.0, vel: [0.12, 0.05, 0.1], size: 0.08, wobble: 1.4, box: 8 },
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
  if (pet) put(pet.x, pet.z, 0.36 * pet.scale);
  for (const v of villagers) if (v.mesh.visible && Math.abs(v.x - P.x) < 24 && Math.abs(v.z - P.z) < 24) put(v.x, v.z, 0.4);
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
}
// ================= creatures =================
// Templates are built once per kind from tagged parts (limb 1-2 legs, 3-4 arms, 5 cape), merged per
// material role, and shared; each creature gets its own two materials so it can flash, tint and walk.
const ROLE_BODY = new THREE.MeshStandardMaterial(), ROLE_DARK = new THREE.MeshStandardMaterial(), ROLE_EYE = new THREE.MeshBasicMaterial(), ROLE_GLOW = new THREE.MeshBasicMaterial();
const BONE = new THREE.MeshStandardMaterial({ color: 0xe6dcc2, roughness: 0.55 }), SOCKET = new THREE.MeshBasicMaterial({ color: 0x050407 });
const creatureCache = new Map();
function makeCreature(kind, color, eyeCol, opts = {}) {
  if (!creatureCache.has(kind)) {
    const t = buildCreatureTemplate(kind);
    const live = t.g.children.filter((c) => c.userData.float || c.userData.spin);
    for (const c of live) c.userData.live = 1;
    const parts = bakeByMaterial(t.g);
    creatureCache.set(kind, { parts, live: live.map((c) => ({ geo: c.geometry, pos: c.position.clone(), scale: c.scale.clone(), rot: c.rotation.clone(), ud: { ...c.userData } })), h: t.h });
  }
  const T = creatureCache.get(kind);
  const g = new THREE.Group();
  const u = limbU(); u.uWalk.value = rand(0, 6);
  // body takes a light grain map (brightened to compensate) and both take a bump map, so surfaces read as hide, cloth and iron
  const body = limbMat(new THREE.Color(color).multiplyScalar(1.22).getHex(), { rough: opts.rough ?? 0.7, metal: opts.metal ?? 0.05, map: TEX.plaster.map, nmap: TEX.plaster.normal, ns: 0.9 }, u);
  const dark = limbMat(new THREE.Color(color).multiplyScalar(0.45).getHex(), { rough: 0.5, metal: 0.4, nmap: TEX.brick.normal, ns: 0.35 }, u);
  const eye = mat(eyeCol || 0xffe08a, 3);
  const map = new Map([[ROLE_BODY, body], [ROLE_DARK, dark], [ROLE_EYE, eye], [ROLE_GLOW, mat(eyeCol || 0xb48cff, 3)]]);
  for (const p of T.parts) { const m = new THREE.Mesh(p.geometry, map.get(p.material) || p.material); m.castShadow = m.userData.cs = p.material === ROLE_BODY || p.material === ROLE_DARK; g.add(m); } // only the bulk casts shadows
  for (const l of T.live) { const o = new THREE.Mesh(l.geo, map.get(ROLE_GLOW)); o.position.copy(l.pos); o.scale.copy(l.scale); o.rotation.copy(l.rot); o.userData = { ...l.ud }; delete o.userData.live; g.add(o); }
  return { g, mats: [body, dark], h: T.h, u };
}
function buildCreatureTemplate(kind) {
  const g = new THREE.Group();
  const B = ROLE_BODY, D = ROLE_DARK, E = ROLE_EYE, W = BONE, K = ROLE_DARK; // sockets share the dark material: one less draw call per creature
  const P = (geo, m, sx, sy, sz, x, y, z, limb, pv, rot) => {
    const o = mesh(geo, m, sx, sy, sz, x, y, z);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    if (limb) { o.userData.limb = limb; o.userData.pivot = new THREE.Vector3(pv[0], pv[1], pv[2]); }
    g.add(o); return o;
  };
  const legs = (w, h, d, x, top, m) => { for (const s of [-1, 1]) { const L = s < 0 ? 1 : 2; P(G.box, m || D, w, h, d, s * x, top - h / 2, 0, L, [s * x, top, 0]); P(G.box, m || D, w * 1.1, 0.08, d * 1.35, s * x, 0.04, 0.04, L, [s * x, top, 0]); } };
  const arms = (w, h, x, top, m, hand) => { for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.box, m || B, w, h, w * 1.05, s * x, top - h / 2, 0, L, [s * x, top, 0]); if (hand) P(G.sph, hand, w * 1.1, w * 1.1, w * 1.1, s * x, top - h - 0.02, 0.02, L, [s * x, top, 0]); } };
  let h = 1.5, ey = 1.3, ez = 0.2, es = 0.08, ex = 0.09;
  switch (kind) {
    case 'villager':
      legs(0.16, 0.5, 0.18, 0.13, 0.54);
      P(G.taper, B, 0.6, 0.62, 0.42, 0, 0.86, 0);
      P(G.box, D, 0.46, 0.5, 0.06, 0, 0.72, 0.2);
      P(G.sph, B, 0.4, 0.42, 0.4, 0, 1.38, 0);
      P(G.sph, D, 0.44, 0.24, 0.44, 0, 1.52, -0.04);
      arms(0.13, 0.46, 0.35, 1.1, B, D);
      h = 1.75; ey = 1.4; ez = 0.18; es = 0.05; ex = 0.08;
      break;
    case 'grunt':
      legs(0.17, 0.52, 0.19, 0.14, 0.56);
      P(G.box, D, 0.48, 0.14, 0.32, 0, 0.6, 0);
      P(G.box, B, 0.52, 0.5, 0.32, 0, 0.92, 0);
      P(G.box, D, 0.56, 0.18, 0.36, 0, 1.08, 0);
      P(G.sph, B, 0.42, 0.44, 0.42, 0, 1.38, 0);
      P(G.box, D, 0.26, 0.1, 0.2, 0, 1.22, 0.07);
      for (let k = 0; k < 3; k++) P(G.box, D, 0.44, 0.035, 0.03, 0, 0.8 + k * 0.1, 0.165);
      P(G.box, W, 0.22, 0.08, 0.12, 0, 1.2, 0.17);
      P(G.box, K, 0.1, 0.07, 0.02, -0.09, 1.4, 0.205); P(G.box, K, 0.1, 0.07, 0.02, 0.09, 1.4, 0.205);
      P(G.sph, D, 0.3, 0.2, 0.34, -0.36, 1.18, 0); P(G.box, W, 0.1, 0.08, 0.04, 0, 0.6, 0.17);
      arms(0.14, 0.46, 0.37, 1.1, B, D);
      P(G.box, D, 0.06, 0.06, 0.8, 0.37, 0.62, 0.42, 4, [0.37, 1.1, 0]);
      P(G.box, D, 0.24, 0.05, 0.06, 0.37, 0.62, 0.06, 4, [0.37, 1.1, 0]);
      h = 1.65; ey = 1.4; ez = 0.21; es = 0.06;
      break;
    case 'brute':
      legs(0.3, 0.52, 0.32, 0.24, 0.55);
      P(G.box, B, 1.0, 0.72, 0.64, 0, 0.98, 0);
      P(G.sph, B, 0.86, 0.6, 0.7, 0, 0.72, 0.05);
      P(G.sph, D, 0.5, 0.5, 0.5, -0.58, 1.26, 0); P(G.sph, D, 0.5, 0.5, 0.5, 0.58, 1.26, 0);
      P(G.sph, B, 0.42, 0.4, 0.42, 0, 1.36, 0.24);
      P(G.cone4, D, 0.1, 0.26, 0.1, -0.16, 1.58, 0.22, 0, 0, [0, 0, 0.5]); P(G.cone4, D, 0.1, 0.26, 0.1, 0.16, 1.58, 0.22, 0, 0, [0, 0, -0.5]);
      P(G.cone, W, 0.07, 0.2, 0.07, -0.1, 1.28, 0.42, 0, 0, [0.3, 0, 0]); P(G.cone, W, 0.07, 0.2, 0.07, 0.1, 1.28, 0.42, 0, 0, [0.3, 0, 0]);
      P(G.box, D, 1.04, 0.14, 0.7, 0, 0.66, 0.02); P(G.box, W, 0.16, 0.16, 0.06, 0, 0.66, 0.38);
      for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.box, B, 0.26, 0.78, 0.28, s * 0.7, 0.84, 0.06, L, [s * 0.7, 1.22, 0.06]); P(G.sph, D, 0.34, 0.32, 0.34, s * 0.7, 0.4, 0.1, L, [s * 0.7, 1.22, 0.06]); for (let k = -1; k <= 1; k++) P(G.cone4, D, 0.06, 0.14, 0.06, s * 0.7 + k * 0.09, 0.42, 0.28, L, [s * 0.7, 1.22, 0.06], [1.5, 0, 0]); }
      h = 1.75; ey = 1.4; ez = 0.42; es = 0.09; ex = 0.1;
      break;
    case 'archer':
      legs(0.13, 0.55, 0.15, 0.11, 0.58);
      P(G.box, B, 0.4, 0.52, 0.26, 0, 0.88, 0);
      P(G.sph, B, 0.34, 0.36, 0.34, 0, 1.3, 0);
      P(G.cone, D, 0.48, 0.5, 0.48, 0, 1.48, -0.03);
      P(G.box, D, 0.5, 0.36, 0.08, 0, 0.98, -0.16);
      P(G.cyl, D, 0.1, 0.55, 0.1, -0.1, 1.0, -0.22, 0, 0, [0, 0, 0.3]);
      for (let k = 0; k < 3; k++) P(G.box, W, 0.03, 0.12, 0.06, -0.18 + k * 0.04, 1.32, -0.24, 0, 0, [0, 0, 0.3]);
      P(G.sph, K, 0.28, 0.22, 0.06, 0, 1.3, 0.15);
      P(G.box, D, 0.38, 0.06, 0.28, 0, 0.66, 0); P(G.box, W, 0.07, 0.07, 0.04, 0, 0.66, 0.14);
      arms(0.11, 0.44, 0.29, 1.08, B, D);
      { const b = P(G.torus, D, 0.75, 0.75, 0.75, -0.29, 0.62, 0.16, 3, [-0.29, 1.08, 0]); b.rotation.set(0, Math.PI / 2, Math.PI / 2); }
      h = 1.65; ey = 1.31; ez = 0.15; es = 0.06; ex = 0.07;
      break;
    case 'caster': {
      P(G.cone, B, 0.82, 1.12, 0.82, 0, 0.56, 0);
      P(G.box, D, 0.5, 0.08, 0.42, 0, 0.82, 0);
      P(G.sph, B, 0.34, 0.36, 0.34, 0, 1.27, 0);
      P(G.cone, D, 0.48, 0.62, 0.48, 0, 1.6, -0.02, 0, 0, [-0.15, 0, 0]);
      P(G.sph, K, 0.26, 0.24, 0.08, 0, 1.28, 0.13);
      P(G.cyl, D, 0.84, 0.06, 0.84, 0, 0.06, 0); P(G.cyl, D, 0.5, 0.1, 0.5, 0, 1.08, 0);
      for (let k = 0; k < 3; k++) P(G.box, D, 0.05, 0.05, 0.02, 0, 0.5 + k * 0.14, 0.27 - k * 0.04);
      for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4; P(G.taper, B, 0.17, 0.44, 0.17, s * 0.3, 0.92, 0, L, [s * 0.3, 1.13, 0]); P(G.cyl, D, 0.2, 0.06, 0.2, s * 0.3, 0.72, 0, L, [s * 0.3, 1.13, 0]); P(G.sph, D, 0.11, 0.11, 0.11, s * 0.3, 0.66, 0.02, L, [s * 0.3, 1.13, 0]); }
      const orb = P(G.sph, ROLE_GLOW, 0.24, 0.24, 0.24, 0.42, 1.05, 0.34); orb.userData.float = 1;
      h = 1.8; ey = 1.29; ez = 0.17; es = 0.05; ex = 0.07;
      break;
    }
    case 'skitter':
      P(G.sph, B, 0.72, 0.42, 0.86, 0, 0.42, 0);
      P(G.sph, B, 0.38, 0.34, 0.36, 0, 0.5, 0.44);
      P(G.cone4, D, 0.06, 0.18, 0.06, -0.08, 0.38, 0.62, 0, 0, [1.4, 0, 0]); P(G.cone4, D, 0.06, 0.18, 0.06, 0.08, 0.38, 0.62, 0, 0, [1.4, 0, 0]);
      for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, z = ((k % 3) - 1) * 0.24, L = (k + (k < 3 ? 0 : 1)) % 2 ? 1 : 2; P(G.box, D, 0.48, 0.05, 0.05, s * 0.4, 0.26, z, L, [s * 0.2, 0.34, z], [0, 0, s * 0.5]); }
      for (const s of [-1, 1]) P(G.box, D, 0.5, 0.03, 0.42, s * 0.5, 0.62, -0.05, s < 0 ? 3 : 4, [s * 0.25, 0.6, -0.05], [0, 0, s * -0.35]);
      P(G.cone4, W, 0.04, 0.1, 0.04, -0.05, 0.38, 0.6, 0, 0, [3.0, 0, 0]); P(G.cone4, W, 0.04, 0.1, 0.04, 0.05, 0.38, 0.6, 0, 0, [3.0, 0, 0]);
      h = 0.85; ey = 0.56; ez = 0.58; es = 0.07; ex = 0.09;
      break;
    case 'bomber':
      P(G.sph, B, 1.08, 0.98, 1.08, 0, 0.66, 0);
      P(G.sph, D, 0.38, 0.32, 0.38, 0, 1.16, 0.18);
      for (let k = 0; k < 6; k++) P(G.sph, mat(0xffc24a, 3.5), 0.13, 0.13, 0.13, Math.sin(k * 1.7) * 0.5, 0.45 + (k % 3) * 0.2, Math.cos(k * 1.7) * 0.5);
      P(G.cyl, D, 1.1, 0.08, 1.1, 0, 0.66, 0); for (let k = 0; k < 8; k++) P(G.box, W, 0.03, 0.14, 0.03, Math.sin(k * 0.785) * 0.55, 0.66, Math.cos(k * 0.785) * 0.55);
      P(G.cyl, D, 0.08, 0.3, 0.08, 0, 1.3, 0); P(G.sph, mat(0xffd06a, 4), 0.1, 0.1, 0.1, 0, 1.47, 0);
      for (const s of [-1, 1]) { P(G.box, D, 0.2, 0.3, 0.22, s * 0.26, 0.15, 0, s < 0 ? 1 : 2, [s * 0.26, 0.3, 0]); P(G.box, D, 0.12, 0.3, 0.12, s * 0.52, 0.72, 0.05, s < 0 ? 3 : 4, [s * 0.52, 0.86, 0.05]); }
      h = 1.35; ey = 1.18; ez = 0.34;
      break;
    case 'summoner': {
      P(G.cone, B, 0.96, 1.48, 0.96, 0, 0.74, 0);
      P(G.sph, D, 0.32, 0.32, 0.32, -0.3, 1.32, 0); P(G.sph, D, 0.32, 0.32, 0.32, 0.3, 1.32, 0);
      P(G.sph, B, 0.38, 0.4, 0.38, 0, 1.57, 0);
      P(G.cone, D, 0.52, 0.66, 0.52, 0, 1.86, -0.04, 0, 0, [-0.12, 0, 0]);
      P(G.sph, K, 0.28, 0.26, 0.08, 0, 1.56, 0.15);
      for (let k = 0; k < 5; k++) P(G.cone4, W, 0.06, 0.26, 0.06, Math.sin(-0.9 + k * 0.45) * 0.36, 1.46, Math.cos(-0.9 + k * 0.45) * 0.36 - 0.12, 0, 0, [-0.5, 0, 0]);
      P(G.cyl, D, 0.66, 0.08, 0.66, 0, 0.98, 0); for (let k = 0; k < 4; k++) P(G.box, ROLE_GLOW, 0.06, 0.06, 0.02, -0.18 + k * 0.12, 0.98, 0.33);
      for (const s of [-1, 1]) P(G.taper, B, 0.16, 0.5, 0.16, s * 0.4, 1.1, 0.02, s < 0 ? 3 : 4, [s * 0.4, 1.34, 0.02]);
      P(G.cyl, D, 0.06, 2.0, 0.06, 0.46, 1.0, 0.16, 4, [0.4, 1.34, 0.02]);
      const gem = P(G.oct, ROLE_GLOW, 0.26, 0.36, 0.26, 0.46, 2.08, 0.16); gem.userData.spin = 1;
      h = 2.05; ey = 1.59; ez = 0.17; es = 0.06; ex = 0.07;
      break;
    }
    case 'warden':
      legs(0.22, 0.55, 0.24, 0.17, 0.58);
      P(G.box, B, 0.78, 0.64, 0.5, 0, 0.96, 0);
      P(G.box, D, 0.34, 0.2, 0.44, -0.5, 1.26, 0); P(G.box, D, 0.34, 0.2, 0.44, 0.5, 1.26, 0);
      P(G.box, B, 0.42, 0.46, 0.42, 0, 1.5, 0);
      P(G.box, D, 0.44, 0.06, 0.1, 0, 1.52, 0.2);
      P(G.cone4, D, 0.12, 0.36, 0.3, 0, 1.86, -0.02);
      for (let k = 0; k < 5; k++) P(G.box, ROLE_GLOW, 0.06, 0.08, 0.1, 0, 1.78 + k * 0.03, -0.1 - k * 0.07);
      P(G.oct, W, 0.18, 0.24, 0.06, 0, 1.0, 0.26);
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) P(G.sph, W, 0.05, 0.05, 0.05, s * 0.3, 0.8 + k * 0.28, 0.255);
      P(G.box, B, 0.18, 0.48, 0.2, -0.5, 0.94, 0, 3, [-0.5, 1.18, 0]);
      P(G.box, D, 0.08, 0.84, 0.64, -0.64, 0.88, 0.22, 3, [-0.5, 1.18, 0]);
      P(G.box, B, 0.18, 0.48, 0.2, 0.5, 0.94, 0, 4, [0.5, 1.18, 0]);
      P(G.cyl, D, 0.05, 0.62, 0.05, 0.5, 0.62, 0.3, 4, [0.5, 1.18, 0], [1.2, 0, 0]);
      P(G.dodec, D, 0.28, 0.28, 0.28, 0.5, 0.68, 0.58, 4, [0.5, 1.18, 0]);
      h = 1.9; ey = 1.52; ez = 0.26; es = 0.05; ex = 0.1;
      break;
    case 'hound': // four legs: diagonal pairs share a limb tag, so the walk cycle reads as a trot
      P(G.box, B, 0.46, 0.4, 0.92, 0, 0.62, -0.02);
      P(G.sph, B, 0.5, 0.46, 0.5, 0, 0.66, 0.36);
      P(G.box, D, 0.48, 0.12, 0.7, 0, 0.84, -0.08);
      P(G.sph, B, 0.36, 0.34, 0.4, 0, 0.92, 0.6);
      P(G.box, B, 0.2, 0.16, 0.26, 0, 0.86, 0.84); P(G.box, K, 0.08, 0.06, 0.04, 0, 0.9, 0.97);
      P(G.cone4, D, 0.1, 0.2, 0.06, -0.12, 1.12, 0.56, 0, 0, [0, 0, 0.3]); P(G.cone4, D, 0.1, 0.2, 0.06, 0.12, 1.12, 0.56, 0, 0, [0, 0, -0.3]);
      P(G.box, D, 0.36, 0.08, 0.1, 0, 0.74, 0.52); // collar
      P(G.box, B, 0.09, 0.09, 0.44, 0, 0.82, -0.62, 5, [0, 0.78, -0.46], [-0.6, 0, 0]); // tail
      for (const [x, z, L] of [[-0.15, 0.3, 1], [0.15, 0.3, 2], [-0.15, -0.32, 2], [0.15, -0.32, 1]]) { P(G.box, D, 0.12, 0.44, 0.13, x, 0.22, z, L, [x, 0.46, z]); P(G.box, D, 0.14, 0.06, 0.18, x, 0.03, z + 0.03, L, [x, 0.46, z]); }
      h = 1.15; ey = 0.98; ez = 0.76; es = 0.05; ex = 0.09;
      break;
    case 'leaper': // crouched, coiled back legs; leaps on its prey
      P(G.sph, B, 0.74, 0.5, 0.8, 0, 0.5, 0);
      P(G.sph, B, 0.48, 0.38, 0.44, 0, 0.66, 0.38);
      P(G.box, D, 0.5, 0.08, 0.5, 0, 0.74, -0.06);
      for (let k = 0; k < 4; k++) P(G.cone4, D, 0.08, 0.22, 0.08, 0, 0.78 - k * 0.02, 0.1 - k * 0.16, 0, 0, [-0.4, 0, 0]);
      P(G.box, K, 0.32, 0.06, 0.04, 0, 0.56, 0.6); P(G.cone4, W, 0.04, 0.1, 0.04, -0.08, 0.5, 0.6, 0, 0, [3.0, 0, 0]); P(G.cone4, W, 0.04, 0.1, 0.04, 0.08, 0.5, 0.6, 0, 0, [3.0, 0, 0]);
      for (const s of [-1, 1]) {
        const L = s < 0 ? 1 : 2;
        P(G.sph, D, 0.26, 0.44, 0.4, s * 0.34, 0.36, -0.22, L, [s * 0.34, 0.5, -0.2]);
        P(G.box, D, 0.16, 0.06, 0.36, s * 0.38, 0.04, -0.06, L, [s * 0.34, 0.5, -0.2]);
        P(G.box, B, 0.1, 0.34, 0.1, s * 0.24, 0.2, 0.32, s < 0 ? 3 : 4, [s * 0.24, 0.4, 0.32]);
      }
      h = 0.95; ey = 0.74; ez = 0.54; es = 0.07; ex = 0.12;
      break;
    case 'totem': { // a carved pillar that hums; does not move
      P(G.cyl, D, 0.9, 0.2, 0.9, 0, 0.1, 0);
      P(G.box, B, 0.6, 0.62, 0.6, 0, 0.5, 0);
      P(G.box, D, 0.7, 0.1, 0.7, 0, 0.84, 0);
      P(G.box, B, 0.52, 0.56, 0.52, 0, 1.16, 0);
      P(G.box, D, 0.62, 0.1, 0.62, 0, 1.48, 0);
      P(G.box, B, 0.46, 0.46, 0.46, 0, 1.76, 0);
      for (const y of [0.5, 1.16]) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P(G.box, ROLE_GLOW, 0.14, 0.18, 0.03, Math.sin(a) * 0.31, y, Math.cos(a) * 0.31, 0, 0, [0, a, 0]); }
      P(G.cone4, D, 0.42, 0.3, 0.42, 0, 2.14, 0);
      for (const s of [-1, 1]) P(G.cone4, W, 0.08, 0.32, 0.08, s * 0.32, 1.86, 0, 0, 0, [0, 0, -s * 0.9]);
      const crys = P(G.oct, ROLE_GLOW, 0.2, 0.32, 0.2, 0, 2.5, 0); crys.userData.spin = 1;
      h = 2.4; ey = 1.8; ez = 0.24; es = 0.07; ex = 0.11;
      break;
    }
  }
  P(G.sph, E, es, es, es, -ex, ey, ez); P(G.sph, E, es, es, es, ex, ey, ez);
  return { g, h };
}

// ================= weapons =================
const WMAT = {};
function wmats() {
  if (WMAT.steel) return WMAT;
  WMAT.steel = new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.95, roughness: 0.22 });
  WMAT.dark = new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.7, roughness: 0.45 });
  WMAT.gold = new THREE.MeshStandardMaterial({ color: 0xe0aa50, metalness: 1, roughness: 0.45 });
  WMAT.wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, metalness: 0, roughness: 0.7 });
  WMAT.leather = new THREE.MeshStandardMaterial({ color: 0x4a3020, metalness: 0, roughness: 0.8 });
  WMAT.string = new THREE.MeshStandardMaterial({ color: 0xeee6d0, roughness: 0.9 });
  return WMAT;
}
function weaponMesh(kind) { // points along +z from the grip at the origin
  const W = wmats(), g = new THREE.Group();
  const add = (geo, m, sx, sy, sz, x, y, z, rx) => { const o = mesh(geo, m, sx, sy, sz, x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  switch (kind) {
    case 'sword': add(G.box, W.steel, 0.09, 0.025, 0.92, 0, 0, 0.62); add(G.cone4, W.steel, 0.09, 0.14, 0.03, 0, 0, 1.13, Math.PI / 2); add(G.box, W.gold, 0.32, 0.06, 0.07, 0, 0, 0.15); add(G.cyl, W.leather, 0.05, 0.22, 0.05, 0, 0, 0.02, Math.PI / 2); add(G.sph, W.gold, 0.08, 0.08, 0.08, 0, 0, -0.1); break;
    case 'axe': add(G.cyl, W.wood, 0.06, 1.05, 0.06, 0, 0, 0.42, Math.PI / 2); add(G.box, W.steel, 0.04, 0.42, 0.3, 0, 0.16, 0.84); add(G.box, W.dark, 0.08, 0.1, 0.12, 0, 0, 0.84); break;
    case 'dagger': add(G.box, W.steel, 0.07, 0.022, 0.46, 0, 0, 0.34); add(G.cone4, W.steel, 0.07, 0.1, 0.022, 0, 0, 0.62, Math.PI / 2); add(G.box, W.gold, 0.2, 0.05, 0.05, 0, 0, 0.1); add(G.cyl, W.leather, 0.04, 0.16, 0.04, 0, 0, 0, Math.PI / 2); break;
    case 'spear': add(G.cyl, W.wood, 0.05, 1.9, 0.05, 0, 0, 0.62, Math.PI / 2); add(G.cone4, W.steel, 0.14, 0.38, 0.05, 0, 0, 1.73, Math.PI / 2); add(G.cyl, W.gold, 0.07, 0.08, 0.07, 0, 0, 1.52, Math.PI / 2); break;
    case 'hammer': add(G.cyl, W.wood, 0.07, 1.05, 0.07, 0, 0, 0.45, Math.PI / 2); add(G.box, W.dark, 0.44, 0.28, 0.28, 0, 0, 0.92); add(G.box, W.steel, 0.5, 0.18, 0.18, 0, 0, 0.92); break;
    case 'bow': { const b = add(G.torus, W.wood, 0.9, 0.9, 1.4, 0, 0, 0.15); b.rotation.set(0, Math.PI / 2, Math.PI / 2); add(G.box, W.string, 0.01, 0.88, 0.01, 0, 0, 0.15); add(G.cyl, W.leather, 0.06, 0.18, 0.06, 0, 0, 0.6); break; }
    case 'staff': add(G.cyl, W.wood, 0.06, 1.7, 0.06, 0, 0, 0.3, Math.PI / 2); add(G.torus, W.gold, 0.32, 0.32, 0.32, 0, 0, 1.15); const orb = add(G.sph, mat(0xa98cff, 4), 0.22, 0.22, 0.22, 0, 0, 1.2); orb.castShadow = false; break;
    default: break;
  }
  return g;
}

// ================= the delver =================
function makeHero() {
  const u = limbU(), C = clsOf(), ck = (S && S.cls) || 'warrior';
  const steel = limbMat(ck === 'warrior' ? 0x9aa4b2 : ck === 'ranger' ? 0x7a5a3e : ck === 'necro' ? 0x3a3c36 : 0x5a4a7a, { metal: ck === 'warrior' ? 0.75 : 0.1, rough: 0.55, nmap: TEX.plaster.normal, ns: 0.4 }, u), cloth = limbMat(C.col, { rough: 0.9, map: TEX.plaster.map, nmap: TEX.wood.normal, ns: 0.5 }, u), skin = limbMat(0xe2b48f, { rough: 0.6 }, u);
  const leather = limbMat(0x6a4630, { rough: 0.75, map: TEX.plaster.map, nmap: TEX.plaster.normal, ns: 0.8 }, u), hair = limbMat(0x2e2018, { rough: 0.9, nmap: TEX.wood.normal, ns: 0.8 }, u), gold = limbMat(0xe0aa50, { metal: 1, rough: 0.35 }, u);
  const g = new THREE.Group();
  const P = (geo, m, sx, sy, sz, x, y, z, limb, pv) => { const o = mesh(geo, m, sx, sy, sz, x, y, z); if (limb) { o.userData.limb = limb; o.userData.pivot = new THREE.Vector3(...pv); } g.add(o); return o; };
  for (const s of [-1, 1]) { const L = s < 0 ? 1 : 2, pv = [s * 0.13, 0.56, 0]; P(G.box, cloth, 0.17, 0.32, 0.19, s * 0.13, 0.4, 0, L, pv); P(G.box, leather, 0.19, 0.26, 0.21, s * 0.13, 0.13, 0.01, L, pv); P(G.box, leather, 0.2, 0.06, 0.28, s * 0.13, 0.03, 0.05, L, pv); }
  P(G.box, leather, 0.5, 0.12, 0.32, 0, 0.6, 0); P(G.box, gold, 0.1, 0.08, 0.04, 0, 0.6, 0.17);
  P(G.taper, steel, 0.56, 0.5, 0.36, 0, 0.9, 0);
  P(G.box, cloth, 0.36, 0.42, 0.04, 0, 0.62, 0.17);
  P(G.sph, steel, 0.3, 0.2, 0.34, -0.33, 1.12, 0); P(G.sph, steel, 0.3, 0.2, 0.34, 0.33, 1.12, 0);
  P(G.box, cloth, 0.5, 0.8, 0.04, 0, 0.7, -0.22, 5, [0, 1.12, -0.2]);
  P(G.cyl, skin, 0.16, 0.1, 0.16, 0, 1.2, 0);
  P(G.sph, skin, 0.38, 0.42, 0.38, 0, 1.42, 0.01);
  P(G.sph, hair, 0.42, 0.28, 0.42, 0, 1.55, -0.03);
  P(G.box, hair, 0.36, 0.22, 0.12, 0, 1.44, -0.16);
  P(G.box, mat(0x1a1410), 0.06, 0.05, 0.02, -0.08, 1.44, 0.19); P(G.box, mat(0x1a1410), 0.06, 0.05, 0.02, 0.08, 1.44, 0.19);
  for (const s of [-1, 1]) { const L = s < 0 ? 3 : 4, pv = [s * 0.36, 1.1, 0]; P(G.box, cloth, 0.13, 0.28, 0.14, s * 0.36, 0.96, 0, L, pv); P(G.box, steel, 0.15, 0.22, 0.16, s * 0.36, 0.72, 0.01, L, pv); P(G.sph, leather, 0.13, 0.13, 0.13, s * 0.36, 0.6, 0.02, L, pv); }
  if (ck === 'mage') { P(G.cyl, cloth, 0.62, 0.05, 0.62, 0, 1.6, 0); P(G.cone, cloth, 0.4, 0.62, 0.4, 0, 1.92, -0.06); P(G.cyl, gold, 0.42, 0.06, 0.42, 0, 1.64, 0); P(G.box, cloth, 0.62, 0.7, 0.04, 0, 0.42, 0.1); }
  else if (ck === 'necro') {
    const bone = limbMat(0xd8d2bc, { rough: 0.7 }, u), glow = limbMat(0x7cff9a, { emissive: 2.2 }, u);
    P(G.sph, cloth, 0.48, 0.46, 0.48, 0, 1.48, -0.05); P(G.cone, cloth, 0.34, 0.36, 0.34, 0, 1.66, -0.2); // hood
    P(G.box, cloth, 0.6, 0.72, 0.05, 0, 0.42, 0.12); // long robe front
    for (const s of [-1, 1]) { P(G.sph, bone, 0.26, 0.2, 0.26, s * 0.36, 1.2, 0); for (let k = 0; k < 3; k++) P(G.cone, bone, 0.05, 0.16, 0.05, s * (0.3 + k * 0.06), 1.32, -0.02); } // bone pauldrons
    P(G.sph, bone, 0.13, 0.13, 0.13, 0.16, 0.6, 0.19); P(G.box, glow, 0.03, 0.02, 0.01, 0.13, 0.61, 0.255); P(G.box, glow, 0.03, 0.02, 0.01, 0.19, 0.61, 0.255); // skull at the belt
    P(G.box, glow, 0.07, 0.03, 0.02, -0.08, 1.44, 0.2); P(G.box, glow, 0.07, 0.03, 0.02, 0.08, 1.44, 0.2); // eyes glow under the hood
  }
  else if (ck === 'ranger') { P(G.sph, cloth, 0.46, 0.4, 0.46, 0, 1.5, -0.04); P(G.cone, cloth, 0.3, 0.3, 0.3, 0, 1.58, -0.24); P(G.cyl, leather, 0.14, 0.62, 0.14, 0.18, 1.0, -0.26); for (let k = 0; k < 3; k++) P(G.box, mat(0xeee6d0), 0.03, 0.14, 0.06, 0.14 + k * 0.04, 1.36, -0.26); }
  else { P(G.box, steel, 0.42, 0.14, 0.42, 0, 1.6, 0); P(G.box, cloth, 0.06, 0.24, 0.32, 0, 1.76, -0.02); }
  if (S) addGearLook(P, u, ck);
  const parts = bakeByMaterial(g);
  const out = new THREE.Group();
  for (const p of parts) { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = true; out.add(m); }
  const shoulder = new THREE.Group(); shoulder.rotation.order = 'YXZ'; shoulder.position.set(0.36, 1.1, 0); out.add(shoulder);
  const hand = new THREE.Group(); hand.position.set(0, -0.5, 0.03); hand.rotation.x = 0.5; shoulder.add(hand);
  return { g: out, hand, shoulder, u };
}
// first-person viewmodel: gauntlet and weapon held in front of the camera
const viewmodel = (() => {
  const g = new THREE.Group();
  const W = wmats();
  const arm = new THREE.Group();
  arm.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xb8c2cf, metalness: 0.85, roughness: 0.32 }), 0.12, 0.12, 0.4, 0, -0.03, 0.22));
  arm.add(mesh(G.box, new THREE.MeshStandardMaterial({ color: 0x2f6f73, roughness: 0.85 }), 0.13, 0.13, 0.2, 0, -0.05, 0.48));
  arm.add(mesh(G.sph, W.leather, 0.12, 0.12, 0.12, 0, 0, 0.02));
  g.add(arm);
  const holder = new THREE.Group(); holder.scale.setScalar(0.72); g.add(holder);
  g.visible = false;
  camera.add(g);
  return { g, holder, kind: '' };
})();

// ================= level generation =================
let LV = null;
function tidx(x, z) { return Math.floor(z) * LV.w + Math.floor(x); }
// Themed rooms. Tile values: 0 rock, 1 floor, 3 furniture (solid, floor beneath), 5 chasm (no floor at all).
// Every theme keeps a walkable band along the room's edges, so corridors into the room stay connected.
const ROOM_THEMES = ['library', 'flooded', 'chasm', 'hall', 'tomb', 'vault', 'grove'];
function themeRooms(rooms, g, W, exitRoom) {
  const cands = rooms.slice(1).filter((r) => r !== exitRoom && r.w >= 7 && r.h >= 6);
  const n = Math.min(cands.length, randi(1, 3));
  for (let k = 0; k < n; k++) {
    const r = cands.splice(randi(0, cands.length - 1), 1)[0];
    const opts = ROOM_THEMES.filter((t) => (t !== 'chasm' && t !== 'hall') || (r.w >= 9 && r.h >= 8));
    r.theme = pick(opts);
    const at = (i, j) => g[j * W + i], set = (i, j, v) => { if (at(i, j) === 1) g[j * W + i] = v; };
    const x0 = r.x, y0 = r.y, x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
    if (r.theme === 'library') { // shelves against solid stretches of wall only, never across a doorway
      r.shelves = [];
      const wallAt = (i, j) => at(i, j) === 0;
      for (let i = x0 + 1; i < x1; i += 1) {
        if (i % 3 === 0) continue;
        if (wallAt(i, y0 - 1) && wallAt(i - 1, y0 - 1) && wallAt(i + 1, y0 - 1)) { set(i, y0, 3); r.shelves.push([i, y0, 0]); }
        if (wallAt(i, y1 + 1) && wallAt(i - 1, y1 + 1) && wallAt(i + 1, y1 + 1)) { set(i, y1, 3); r.shelves.push([i, y1, 2]); }
      }
      if (r.w >= 9) for (let j = y0 + 2; j < y1 - 1; j++) if (j % 2) { set(x0 + Math.floor(r.w / 2), j, 3); r.shelves.push([x0 + Math.floor(r.w / 2), j, 1]); }
    } else if (r.theme === 'chasm') { // a pit with a two-tile ledge round it and a cross of bridges
      const mx = x0 + Math.floor(r.w / 2) - 1, my = y0 + Math.floor(r.h / 2) - 1;
      for (let j = y0 + 2; j <= y1 - 2; j++) for (let i = x0 + 2; i <= x1 - 2; i++) if (i !== mx && i !== mx + 1 && j !== my && j !== my + 1) set(i, j, 5);
    } else if (r.theme === 'hall') { // rows of columns
      for (let j = y0 + 2; j <= y1 - 2; j += 3) for (let i = x0 + 2; i <= x1 - 2; i += 3) if (Math.abs(i + 0.5 - (x0 + r.w / 2)) > 1.2) set(i, j, 0);
    } else if (r.theme === 'vault') { // a treasury: three chests in a row, and one of them is hungry
      const cz = y0 + Math.floor(r.h / 2) + 0.5, cx = x0 + r.w / 2;
      r.chests = [-2.2, 0, 2.2].map((o) => [cx + o, cz]);
    } else if (r.theme === 'grove') { // a spring in a ring of stones, overgrown
      r.spring = [x0 + r.w / 2, y0 + r.h / 2];
    } else if (r.theme === 'tomb') { // stone coffins in the middle of the floor
      r.coffins = [];
      for (let j = y0 + 2; j <= y1 - 2; j += 3) for (let i = x0 + 2; i <= x1 - 3; i += 4) { set(i, j, 3); set(i + 1, j, 3); r.coffins.push([i + 1, j + 0.5]); }
    }
  }
}
function solid(i, j) { return i < 0 || j < 0 || i >= LV.w || j >= LV.h || LV.g[j * LV.w + i] !== 1; }
// rock, clutter and furniture stop a shot; an open chasm does not
function blocksShot(x, z) { const i = Math.floor(x), j = Math.floor(z); if (i < 0 || j < 0 || i >= LV.w || j >= LV.h) return true; const v = LV.g[j * LV.w + i]; return v !== 1 && v !== 5; }
function walkable(x, z) { return !solid(Math.floor(x), Math.floor(z)); }

function genDungeon(depth) {
  const boss = depth % 5 === 0 && !(RUN && RUN.mode); // rifts and the Pit have no boss floors
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
  if (!boss) themeRooms(rooms, g, W, exitRoom);
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
const U_TIME = { value: 0 };
const FLAME_MATS = [flameMat];
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
  burstSys.life.fill(0);
  clearCorpses(); clearMinions(); facers.length = 0; fxLife.length = 0; releaseLock(); clearZones(); villagers.length = 0;
  for (const R of rings) R.o.visible = false;
  for (const l of torchPool) { l.intensity = 0; l.distance = 9; }
  FLAME_MATS.length = 1;
}
function instanced(geo, material, list, o = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((t, i) => {
    e.set(t.rx || 0, t.ry || 0, t.rz || 0); q.setFromEuler(e);
    m4.compose(p.set(t.x, t.y, t.z), q, s.set(t.sx, t.sy, t.sz));
    im.setMatrixAt(i, m4);
    if (t.c !== undefined) im.setColorAt(i, typeof t.c === 'number' ? c.set(t.c) : t.c);
  });
  im.count = list.length;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  im.matrixAutoUpdate = false; im.updateMatrix();
  im.castShadow = !!o.cast; im.receiveShadow = o.receive !== false;
  if (!o.keep) levelDisp.push(material);
  (o.parent || world).add(im);
  return im;
}
function tint(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
function glowC(hex, k) { return new THREE.Color(hex).multiplyScalar(k); }
function grey(f) { return new THREE.Color(f, f, f).getHex(); }

// shared world materials, built once and recoloured per level (no shader recompiles between floors)
const WM = {};
function worldMats() {
  if (WM.floor) return WM;
  WM.floor = worldMat(TEX.flag, 0xffffff, 'floor', 0.5, { ns: 1.3 });
  WM.wall = worldMat(TEX.brick, 0xffffff, 'wall', 0.55, { ns: 1.4 });
  WM.cap = new THREE.MeshStandardMaterial({ color: 0x15151c, roughness: 1 });
  WM.grass = worldMat(TEX.grass, 0x7aa65a, 'floor', 0.22, { ns: 0.8, rough: 0.95 });
  WM.path = worldMat(TEX.cobble, 0xc4b498, 'floor', 0.45, { ns: 1.5 });
  WM.plaster = worldMat(TEX.plaster, 0xeadfc8, 'wall', 0.4, { ao: 0.8 });
  WM.plasterP = worldMat(TEX.plaster, 0xb8a4c8, 'wall', 0.4, { ao: 0.8 });
  WM.stone = worldMat(TEX.brick, 0xa49f96, 'wall', 0.7, { ao: 0.65, ns: 1.5 });
  WM.timber = worldMat(TEX.wood, 0xb08458, 'wall', 0.7, { ao: 0.8 });
  WM.door = worldMat(TEX.wood, 0x6a4428, 'wall', 1.3, { ao: 1 });
  WM.roofR = worldMat(TEX.shingle, 0xa04838, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofB = worldMat(TEX.shingle, 0x4a5a7a, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofG = worldMat(TEX.shingle, 0x4a7050, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.roofS = worldMat(TEX.shingle, 0x5a5a66, 'wall', 0.9, { ao: 1, ns: 1.6 });
  WM.beam = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
  WM.window = mat(0xffbe6a, 2.8);
  WM.iron = metal(0x4a4a52, 0.5);
  WM.gold = metal(0xe0aa50, 0.3);
  WM.rock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  WM.bark = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 });
  WM.leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  WM.tuft = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  WM.tuft.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U_TIME;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 hdO = vec3(0.0);
      #ifdef USE_INSTANCING
        hdO = instanceMatrix[3].xyz;
      #endif
      float hdWind = sin(uTime * 1.6 + hdO.x * 0.55 + hdO.z * 0.35) * 0.6 + sin(uTime * 3.3 + hdO.x * 1.9) * 0.25;
      transformed.x += hdWind * 0.2 * position.y; transformed.z += hdWind * 0.08 * position.y;`);
  };
  WM.tuft.customProgramCacheKey = () => 'tuft';
  WM.soil = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 1 });
  WM.water = new THREE.MeshStandardMaterial({ color: 0x1e3a52, roughness: 0.08, metalness: 0.2 });
  WM.decoStd = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  WM.decoIce = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.1, emissive: 0x2a4a6a, emissiveIntensity: 0.6 });
  WM.glow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  WM.banner = new THREE.MeshStandardMaterial({ color: 0x8a3030, roughness: 0.95, map: TEX.wood.map, normalMap: TEX.plaster.normal });
  WM.torchCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc070).multiplyScalar(5) });
  return WM;
}

// ----- dungeon -----
function buildDungeonVisuals() {
  const L = LV, B = biomeOf(L.depth), W = worldMats();
  // biome colours tint the textures; lightness is normalised so every biome stays readable
  const hsl = {};
  W.floor.color.set(B.floor).getHSL(hsl); W.floor.color.setHSL(hsl.h, Math.min(0.32, hsl.s), 0.3);
  W.wall.color.set(B.wall).getHSL(hsl); W.wall.color.setHSL(hsl.h, Math.min(0.3, hsl.s), 0.34);
  W.torchCore.color.set(B.torch).multiplyScalar(5);
  const floors = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1 && L.g[j * L.w + i] !== 3) continue;
    let n4 = 0, nd = 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(i + a, j + b)) n4++;
    for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (solid(i + a, j + b)) nd++;
    const ao = clamp(1 - 0.14 * n4 - 0.06 * nd, 0.5, 1) * rand(0.86, 1.04);
    floors.push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: grey(ao) });
  }
  instanced(G.tile, W.floor, floors, { keep: true });
  // walls are laid out by layoutWalls(), which runs again whenever the camera mode changes wall height
  L.wallTiles = []; L.torchSpots = [];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 0) continue; // rock only: furniture and chasms are dressed separately
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < L.w && jj < L.h && L.g[jj * L.w + ii] !== 0) { near = true; break; } }
    if (near) L.wallTiles.push({ i, j, v: rand(0.82, 1.1), hv: rand(-0.12, 0.12) });
  }
  for (const r of L.rooms) {
    const n = randi(1, 3);
    for (let k = 0; k < n; k++) {
      const side = randi(0, 3); let i, j;
      if (side === 0) { i = randi(r.x, r.x + r.w - 1); j = r.y - 1; } else if (side === 1) { i = randi(r.x, r.x + r.w - 1); j = r.y + r.h; }
      else if (side === 2) { i = r.x - 1; j = randi(r.y, r.y + r.h - 1); } else { i = r.x + r.w; j = randi(r.y, r.y + r.h - 1); }
      if (!solid(i, j)) continue;
      const ox = side === 2 ? 0.5 : side === 3 ? -0.5 : 0, oz = side === 0 ? 0.5 : side === 1 ? -0.5 : 0;
      L.torchSpots.push({ x: i + 0.5 + ox * 1.12, z: j + 0.5 + oz * 1.12, ox, oz });
    }
  }
  layoutWalls();
  dressThemedRooms();
  // rubble along walls and biome decoration in the rooms
  const rocks = [], deco = [], glow = [];
  const st = L.rooms[0];
  for (let j = 0; j < L.h; j++) for (let i = 0; i < L.w; i++) {
    if (L.g[j * L.w + i] !== 1) continue;
    const edge = solid(i + 1, j) || solid(i - 1, j) || solid(i, j + 1) || solid(i, j - 1);
    if (edge && chance(0.14)) { const s = rand(0.08, 0.2); rocks.push({ x: i + rand(0.15, 0.85), y: s * 0.3, z: j + rand(0.15, 0.85), sx: s, sy: s * 0.7, sz: s, ry: rand(0, 6), rx: rand(0, 1), c: tint(B.wall, rand(1.4, 2.2)) }); }
    if (!chance(0.05)) continue;
    if (i >= st.x && i < st.x + st.w && j >= st.y && j < st.y + st.h) continue;
    const x = i + rand(0.2, 0.8), z = j + rand(0.2, 0.8);
    switch (B.deco) {
      case 'bones': deco.push({ x, y: 0.04, z, sx: rand(0.35, 0.6), sy: 0.07, sz: 0.07, ry: rand(0, 3), c: 0xe0d6bc }); deco.push({ x: x + 0.12, y: 0.08, z: z + 0.1, sx: 0.16, sy: 0.15, sz: 0.17, ry: rand(0, 3), c: 0xeee4ca }); break;
      case 'shrooms': { const s = rand(0.6, 1.4); deco.push({ x, y: 0.18 * s, z, sx: 0.1 * s, sy: 0.36 * s, sz: 0.1 * s, c: 0xd8d0b8 }); glow.push({ x, y: 0.4 * s, z, sx: 0.44 * s, sy: 0.18 * s, sz: 0.44 * s, c: glowC(pick([0x8aff6a, 0x6affd0, 0xd0ff4a]), 2.4) }); break; }
      case 'cracks': glow.push({ x, y: 0.012, z, sx: rand(0.5, 1.1), sy: 0.02, sz: rand(0.05, 0.1), ry: rand(0, 3), c: glowC(0xff6a1a, 3.5) }); break;
      case 'ice': deco.push({ x, y: 0.25, z, sx: rand(0.15, 0.3), sy: rand(0.5, 1.1), sz: rand(0.15, 0.3), ry: rand(0, 3), rz: rand(-0.3, 0.3), c: 0xcfe8ff }); break;
      case 'kelp': { const s = rand(0.7, 1.5); deco.push({ x, y: 0.55 * s, z, sx: 0.07, sy: 1.1 * s, sz: 0.07, rz: rand(-0.25, 0.25), rx: rand(-0.2, 0.2), c: pick([0x3a8a6a, 0x2a6a5a, 0x5a9a5a]) }); deco.push({ x: x + 0.12, y: 0.4 * s, z: z - 0.08, sx: 0.06, sy: 0.8 * s, sz: 0.06, rz: rand(-0.3, 0.3), c: 0x2a7a6a }); if (chance(0.4)) glow.push({ x: x + 0.2, y: 0.08, z, sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(0x9affe8, 2.6) }); break; }
      case 'gears': deco.push({ x, y: 0.04, z, sx: rand(0.5, 1.0), sy: 0.08, sz: 0, ry: rand(0, 3), c: pick([0xb08a4a, 0x8a7050, 0xc8a060]) }); if (chance(0.35)) glow.push({ x, y: 0.1, z, sx: 0.1, sy: 0.1, sz: 0.1, c: glowC(0xffc84a, 3) }); break;
      case 'roots': deco.push({ x, y: 0.06, z, sx: rand(0.9, 1.8), sy: 0.12, sz: 0.14, ry: rand(0, 3), c: pick([0x4a2a22, 0x5a3426, 0x3a221c]) }); if (chance(0.5)) glow.push({ x: x + rand(-0.3, 0.3), y: 0.12, z: z + rand(-0.3, 0.3), sx: 0.16, sy: 0.12, sz: 0.16, c: glowC(0xff3a5a, 2.8) }); break;
      case 'pools': { const s = rand(0.35, 0.8); glow.push({ x, y: 0.012, z, sx: s, sy: 0.01, sz: s * rand(0.6, 1), ry: rand(0, 3), c: glowC(pick([0x3a78c8, 0x4a98c0, 0x6a62c0]), 0.9) }); if (chance(0.5)) deco.push({ x: x + rand(-0.4, 0.4), y: 0.05, z: z + rand(-0.4, 0.4), sx: 0.12, sy: 0.08, sz: 0.16, ry: rand(0, 3), c: pick([0xe8dcd0, 0xd8c8e0, 0xc8d8e8]) }); break; }
      case 'urns': { const s = rand(0.7, 1.1); deco.push({ x, y: 0.28 * s, z, sx: 0.32 * s, sy: 0.56 * s, sz: 0.32 * s, c: pick([0xd8b050, 0xc89a40, 0xe8d8b0]) }); if (chance(0.5)) glow.push({ x: x + rand(-0.4, 0.4), y: 0.02, z: z + rand(-0.4, 0.4), sx: 0.1, sy: 0.02, sz: 0.1, ry: rand(0, 3), c: glowC(0xffd860, 2.2) }); break; }
      case 'shards': glow.push({ x, y: rand(0.7, 1.6), z, sx: 0.16, sy: 0.32, sz: 0.16, ry: rand(0, 3), c: glowC(pick([0xd06cff, 0x8a6cff, 0xff6cf0]), 3) }); break;
    }
  }
  if (rocks.length) instanced(G.dodec, W.rock, rocks, { keep: true, cast: true });
  // clutter in room corners; corner tiles only, and only where no corridor opens, so paths stay clear
  const barrels = [], hoops = [], crates = [];
  for (const r of L.rooms.slice(1)) for (const [ci, cj, oi, oj] of [[r.x, r.y, -1, -1], [r.x + r.w - 1, r.y, 1, -1], [r.x, r.y + r.h - 1, -1, 1], [r.x + r.w - 1, r.y + r.h - 1, 1, 1]]) {
    if (!chance(0.32) || L.g[cj * L.w + ci] !== 1) continue;
    if (!solid(ci + oi, cj) || !solid(ci, cj + oj) || !solid(ci + oi, cj + oj)) continue;
    const x = ci + 0.5, z = cj + 0.5;
    if (chance(0.55)) { barrels.push({ x, y: 0.42, z, sx: 0.62, sy: 0.84, sz: 0.62, ry: rand(0, 6), c: grey(rand(0.85, 1.1)) }); for (const y of [0.15, 0.7]) hoops.push({ x, y, z, sx: 0.66, sy: 0.06, sz: 0.66 }); }
    else { const s = rand(0.6, 0.78); crates.push({ x, y: s / 2, z, sx: s, sy: s, sz: s, ry: rand(-0.3, 0.3), c: grey(rand(0.85, 1.1)) }); if (chance(0.5)) crates.push({ x: x + rand(-0.1, 0.1), y: s + 0.2, z: z + rand(-0.1, 0.1), sx: 0.4, sy: 0.4, sz: 0.4, ry: rand(0, 6), c: grey(rand(0.85, 1.1)) }); }
    L.g[cj * L.w + ci] = 2;
  }
  if (barrels.length) { instanced(G.cyl, W.timber, barrels, { keep: true, cast: true }); instanced(G.cyl, W.iron, hoops, { keep: true }); }
  if (crates.length) instanced(G.box, W.door, crates, { keep: true, cast: true });
  for (const q of deco) if (q.sz === 0) q.sz = q.sx; // gears lie flat and round
  if (deco.length) instanced(B.deco === 'ice' ? G.oct : B.deco === 'gears' || B.deco === 'urns' ? G.cyl : B.deco === 'kelp' ? G.taper : B.deco === 'pools' ? G.sph : G.box, B.deco === 'ice' ? W.decoIce : W.decoStd, deco, { keep: true, cast: true });
  if (glow.length) instanced(B.deco === 'shrooms' || B.deco === 'kelp' || B.deco === 'roots' || B.deco === 'pools' ? G.sph : B.deco === 'urns' ? G.cyl : B.deco === 'shards' ? G.oct : G.box, W.glow, glow, { keep: true, receive: false });
  makeEnv(tint(B.amb, 0.6), tint(B.fog, 2.5), 0x050508, B.torch);
  scene.environmentIntensity = 0.5;
}
const _capTint = new THREE.Color();
function wallHeight() { return SET.cam === 'top' ? 1.35 : 3.4; }
function layoutWalls() {
  const L = LV; if (!L || L.type !== 'dungeon') return;
  if (L.wallObjs) for (const o of L.wallObjs) { world.remove(o); if (o.isInstancedMesh) o.dispose(); if (o.isPoints) o.geometry.dispose(); }
  const W = worldMats(), B = biomeOf(L.depth), H = wallHeight(), tall = H > 2;
  const walls = [], caps = [];
  for (const t of L.wallTiles) {
    const h = H + (tall ? 0 : t.hv);
    walls.push({ x: t.i + 0.5, y: h / 2, z: t.j + 0.5, sx: 1, sy: h, sz: 1, c: grey(t.v) });
    caps.push({ x: t.i + 0.5, y: h + 0.02, z: t.j + 0.5, sx: 1.02, sy: 0.04, sz: 1.02 });
  }
  // wall tops take a little of the biome's stone colour, so the mass of the walls reads apart from the unlit void beyond
  W.cap.color.setHex(0x15151c).lerp(_capTint.setHex(B.wall), 0.3);
  const objs = [];
  objs.push(instanced(G.box, W.wall, walls, { keep: true, cast: true }));
  objs.push(instanced(G.box, W.cap, caps, { keep: true, receive: false }));
  const th = tall ? 1.95 : 0.98;
  const brackets = [], cores = [], flames = [];
  for (const s of L.torchSpots) {
    brackets.push({ x: s.x - s.ox * 0.08, y: th - 0.12, z: s.z - s.oz * 0.08, sx: 0.08, sy: 0.4, sz: 0.08, rx: s.oz * 0.4, rz: -s.ox * 0.4 });
    brackets.push({ x: s.x, y: th + 0.04, z: s.z, sx: 0.16, sy: 0.12, sz: 0.16 });
    cores.push({ x: s.x, y: th + 0.14, z: s.z, sx: 0.12, sy: 0.16, sz: 0.12 });
    flames.push({ x: s.x, y: th + 0.12, z: s.z });
    s.y = th + 0.35;
  }
  if (brackets.length) { objs.push(instanced(G.box, W.iron, brackets, { keep: true })); objs.push(instanced(G.sph, W.torchCore, cores, { keep: true, receive: false })); const f = makeFlames(flames); world.add(f); objs.push(f); }
  // banners hang on the walls between torches, in the biome's colour with a brass rod
  if (!L.bannerSpots) L.bannerSpots = L.torchSpots.filter(() => chance(0.5)).map((s) => ({ ...s, off: chance(0.5) ? 1 : -1 }));
  const cloth = [], rods = [], bh = tall ? 1.6 : 0.75, by = tall ? 2.1 : 0.62;
  for (const s of L.bannerSpots) {
    const along = s.ox ? [0, s.off] : [s.off, 0]; // slide sideways along the wall, away from the torch
    const x = s.x + along[0] * 0.9 - s.ox * 0.06, z = s.z + along[1] * 0.9 - s.oz * 0.06;
    const ry = s.ox ? Math.PI / 2 : 0;
    const wx = Math.floor(x - Math.sign(s.ox) * 0.5), wz = Math.floor(z - Math.sign(s.oz) * 0.5);
    if (!solid(wx, wz) || solid(Math.floor(x + Math.sign(s.ox) * 0.5), Math.floor(z + Math.sign(s.oz) * 0.5))) continue; // wall behind, floor in front
    cloth.push({ x, y: by, z, sx: 0.62, sy: bh, sz: 0.03, ry });
    rods.push({ x, y: by + bh / 2 + 0.04, z, sx: 0.8, sy: 0.05, sz: 0.05, ry });
  }
  if (cloth.length) {
    WM.banner.color.set(B.torch).multiplyScalar(0.55).lerp(new THREE.Color(B.wall), 0.4);
    objs.push(instanced(G.box, WM.banner, cloth, { keep: true })); objs.push(instanced(G.box, W.gold, rods, { keep: true }));
  }
  flameMat.uniforms.uCol.value.set(B.torch);
  L.wallObjs = objs;
  scene.fog = new THREE.Fog(B.fog, ...(SET.cam === 'top' ? [17, 38] : SET.cam === 'third' ? [7, 26] : [5, 22]));
}
let torchT = 0;
function updTorchLights(dt) {
  if (!LV || LV.type !== 'dungeon' || !LV.torchSpots) return;
  torchT -= dt;
  if (torchT <= 0) {
    torchT = 0.3;
    const near = LV.torchSpots.map((s) => [s, (s.x - P.x) ** 2 + (s.z - P.z) ** 2]).filter((q) => q[1] < 220).sort((a, b) => a[1] - b[1]);
    torchPool.forEach((l, i) => { const s = near[i] && near[i][0]; l.userData.spot = i < Q.pool ? s : null; if (s) l.position.set(s.x - s.ox * 0.3, s.y, s.z - s.oz * 0.3); });
  }
  const col = biomeOf(LV.depth).torch;
  torchPool.forEach((l, i) => {
    if (!l.userData.spot) { l.intensity = 0; return; }
    l.color.setHex(col);
    l.intensity = 7 * (0.82 + 0.1 * Math.sin(elapsed * 13 + i * 2.1) + 0.08 * Math.sin(elapsed * 23.7 + i));
  });
}

// ----- town -----
function roofSlabs(grp, cx, cz, w, d, baseY, rh, m, ridgeX) {
  const oh = 0.45, a = Math.atan2(rh, w / 2), len = Math.hypot(w / 2 + oh, rh + oh * Math.tan(a)) + 0.05;
  for (const s of [-1, 1]) {
    const slab = mesh(G.box, m, len, 0.14, d + oh * 2, 0, 0, 0);
    const mx = (w / 2 + oh) / 2 - oh * 0.0, my = rh / 2 - oh * Math.tan(a) / 2;
    if (ridgeX) { slab.scale.set(d + oh * 2, 0.14, len); slab.rotation.x = -s * a; slab.position.set(cx, baseY + my + 0.07, cz - s * mx); }
    else { slab.rotation.z = -s * a; slab.position.set(cx + s * mx, baseY + my + 0.07, cz); }
    grp.add(slab);
  }
  const ridge = mesh(G.box, WM.beam, ridgeX ? d + oh * 2 : 0.18, 0.16, ridgeX ? 0.18 : d + oh * 2, cx, baseY + rh + 0.06, cz); grp.add(ridge);
  const gable = new THREE.Mesh(gableRoof(ridgeX ? d : w, ridgeX ? w : d, rh), WM.cur || WM.plaster);
  if (ridgeX) gable.rotation.y = Math.PI / 2;
  gable.position.set(cx, baseY, cz); grp.add(gable);
}
function building(grp, b, o) {
  const W = worldMats();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2, w = b.w - 0.6, d = b.h - 0.6, h = o.h || 2.6, base = 0.45;
  const front = o.north ? b.y + 0.3 : b.y + b.h - 0.3, fs = o.north ? -1 : 1;
  grp.add(mesh(G.box, W.stone, w + 0.25, base, d + 0.25, cx, base / 2, cz));
  grp.add(mesh(G.box, o.wall, w, h, d, cx, base + h / 2, cz));
  if (o.beams) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.18, h, 0.18, cx + sx * w / 2, base + h / 2, cz + sz * d / 2));
    for (const y of [base + 0.08, base + h * 0.52, base + h - 0.08]) { grp.add(mesh(G.box, W.beam, w + 0.06, 0.14, 0.1, cx, y, cz + d / 2)); grp.add(mesh(G.box, W.beam, w + 0.06, 0.14, 0.1, cx, y, cz - d / 2)); grp.add(mesh(G.box, W.beam, 0.1, 0.14, d + 0.06, cx + w / 2, y, cz)); grp.add(mesh(G.box, W.beam, 0.1, 0.14, d + 0.06, cx - w / 2, y, cz)); }
    for (const sx of [-1, 1]) { const br = mesh(G.box, W.beam, 0.1, h * 0.62, 0.1, cx + sx * w * 0.3, base + h * 0.76, front + fs * 0.03); br.rotation.z = sx * 0.6; grp.add(br); }
  }
  WM.cur = o.wall;
  roofSlabs(grp, cx, cz, w, d, base + h, o.rh || 1.7, o.roof, o.ridgeX);
  // door, frame and step
  const dx = b.door[0] + 0.5;
  grp.add(mesh(G.box, W.door, 1.0, 1.75, 0.12, dx, base + 0.875, front + fs * 0.02));
  grp.add(mesh(G.box, W.beam, 1.25, 0.14, 0.16, dx, base + 1.82, front + fs * 0.04));
  for (const s of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.12, 1.85, 0.16, dx + s * 0.58, base + 0.92, front + fs * 0.04));
  grp.add(mesh(G.sph, W.gold, 0.08, 0.08, 0.08, dx + 0.3, base + 0.9, front + fs * 0.1));
  grp.add(mesh(G.box, W.stone, 1.5, 0.2, 0.6, dx, 0.1, front + fs * 0.42));
  // windows with frames and shutters
  const rows = o.stories === 2 ? [base + 1.2, base + h * 0.75] : [base + h * 0.55];
  for (const y of rows) for (const wx of [dx - 2.1, dx + 2.1]) {
    if (Math.abs(wx - cx) > w / 2 - 0.5) continue;
    grp.add(mesh(G.box, W.window, 0.72, 0.62, 0.05, wx, y, front + fs * 0.02));
    grp.add(mesh(G.box, W.beam, 0.86, 0.09, 0.1, wx, y + 0.36, front + fs * 0.05), mesh(G.box, W.beam, 0.86, 0.09, 0.1, wx, y - 0.36, front + fs * 0.05));
    grp.add(mesh(G.box, W.beam, 0.06, 0.62, 0.08, wx, y, front + fs * 0.05), mesh(G.box, W.beam, 0.72, 0.05, 0.08, wx, y, front + fs * 0.05));
    for (const s of [-1, 1]) grp.add(mesh(G.box, W.door, 0.34, 0.66, 0.06, wx + s * 0.58, y, front + fs * 0.07));
  }
  // side windows
  for (const sx of [-1, 1]) grp.add(mesh(G.box, W.window, 0.05, 0.6, 0.66, cx + sx * (w / 2 + 0.02), base + h * 0.55, cz));
  if (o.chimney) { grp.add(mesh(G.box, W.stone, 0.7, (o.rh || 1.7) + 1.4, 0.7, cx + o.chimney * w * 0.28, base + h + ((o.rh || 1.7) + 1.4) / 2 - 0.4, cz - d * 0.15)); }
}
function buildHome(grp) {
  const b = TOWN.home, lvl = S.home.house, W = worldMats();
  const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
  if (lvl === 0) {
    const sb = { x: b.x + 1.5, y: b.y + 2.5, w: 5, h: 4.5, door: b.door };
    building(grp, sb, { wall: W.timber, roof: W.roofS, h: 2.1, rh: 1.1 });
    grp.add(mesh(G.box, W.timber, 0.6, 0.6, 0.6, cx + 2.8, 0.3, cz + 2.6), mesh(G.cyl, W.timber, 0.5, 0.7, 0.5, cx + 2.8, 0.35, cz + 1.7));
  } else if (lvl === 1) building(grp, { x: b.x + 1, y: b.y + 1.6, w: 6.4, h: 5.4, door: b.door }, { wall: W.plaster, roof: W.roofR, beams: true, chimney: 1 });
  else if (lvl === 2) {
    building(grp, { x: b.x + 0.4, y: b.y + 0.8, w: 7.4, h: 6.2, door: b.door }, { wall: W.plaster, roof: W.roofR, beams: true, chimney: -1, h: 2.8, rh: 2 });
    grp.add(mesh(G.box, W.timber, 3.4, 0.14, 1.3, b.door[0] + 0.5, 2.35, b.y + b.h + 0.2));
    for (const s of [-1, 1]) grp.add(mesh(G.box, W.beam, 0.14, 2.3, 0.14, b.door[0] + 0.5 + s * 1.55, 1.15, b.y + b.h + 0.75));
  } else {
    building(grp, { x: b.x + 0.2, y: b.y + 0.3, w: 7.6, h: 7.1, door: b.door }, { wall: W.stone, roof: W.roofB, h: 4.4, rh: 2.2, stories: 2, chimney: 1, ridgeX: true });
    if (lvl === 4) {
      for (const s of [-1, 1]) {
        const tx = cx + s * 4.05, tz = b.y + b.h - 0.2;
        grp.add(mesh(G.cyl, W.stone, 1.9, 6.4, 1.9, tx, 3.2, tz), mesh(G.cone, W.roofB, 2.5, 2.4, 2.5, tx, 7.6, tz));
        grp.add(mesh(G.box, W.window, 0.3, 0.6, 0.05, tx, 4.6, tz + 0.96));
        grp.add(mesh(G.cyl, W.iron, 0.05, 1.6, 0.05, tx, 9.5, tz), mesh(G.box, mat(0x2f6f73), 0.04, 0.6, 0.9, tx, 9.9, tz + 0.45));
      }
    }
  }
  // garden beds east of the house
  if (S.home.garden > 0) {
    const rows = S.home.garden * 2;
    for (let k = 0; k < rows; k++) {
      grp.add(mesh(G.box, W.soil, 2.6, 0.2, 0.55, 14.2, 0.1, 4.6 + k * 0.9));
      for (let p = 0; p < 5; p++) grp.add(mesh(G.ico, mat(pick([0x5aa04a, 0x6ab85a, 0x8ac05a, 0x4a9040])), 0.32, rand(0.3, 0.45), 0.32, 13.2 + p * 0.5, 0.32, 4.6 + k * 0.9));
    }
    if (S.home.garden === 3) { const gh = new THREE.Mesh(G.box, new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 })); gh.scale.set(3.2, 2.2, rows * 0.9 + 0.6); gh.position.set(14.2, 1.1, 4.6 + (rows - 1) * 0.45); levelDisp.push(gh.material); grp.add(gh); }
  }
  buildDecor(grp);
  if (S.caravan) buildCaravan(grp);
  if (S.home.trophy > 0) {
    const shown = S.slain.slice(-8);
    for (let k = 0; k < 8; k++) {
      const x = 3.6 + k * 1.05, z = 14.6;
      grp.add(mesh(G.box, W.stone, 0.5, 0.9, 0.5, x, 0.45, z), mesh(G.box, W.stone, 0.62, 0.1, 0.62, x, 0.92, z));
      if (shown[k]) grp.add(mesh(G.oct, mat(shown[k].c, 2.2), 0.36, 0.5, 0.36, x, 1.3, z));
    }
  }
}
function buildTownVisuals() {
  const L = LV, W = worldMats();
  const grass = [], paths = [], tufts = [], flowers = [];
  const occupied = (i, j) => { for (const k of ['home', 'smith', 'alch', 'trader']) { const b = TOWN[k]; if (i >= b.x - 1 && i <= b.x + b.w && j >= b.y - 1 && j <= b.y + b.h) return true; } return false; };
  for (let j = -12; j < L.h + 12; j++) for (let i = -12; i < L.w + 12; i++) {
    const inside = i >= 0 && j >= 0 && i < L.w && j < L.h;
    const p = inside && L.path[j * L.w + i];
    (p ? paths : grass).push({ x: i + 0.5, y: 0, z: j + 0.5, sx: 1, sy: 1, sz: 1, c: grey(rand(0.9, 1.06)) });
    if (!p && !(inside && occupied(i, j)) && !(i >= 18 && i <= 25 && j >= 31 && j <= 34)) {
      const n = inside ? randi(1, 3) : randi(0, 2);
      for (let k = 0; k < n; k++) tufts.push({ x: i + rand(0, 1), y: 0, z: j + rand(0, 1), sx: rand(0.7, 1.3), sy: rand(0.6, 1.4), sz: rand(0.7, 1.3), ry: rand(0, 6), c: tint(pick([0x6a9a40, 0x7aaa48, 0x5a8a3a, 0x8ab050]), rand(0.85, 1.1)) });
      if (inside && chance(0.04)) flowers.push({ x: i + rand(0, 1), y: 0.2, z: j + rand(0, 1), sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(pick([0xffd24a, 0xff7aa0, 0xffffff, 0xa07aff, 0xff9a4a]), 1.3) });
    }
  }
  instanced(G.tile, W.grass, grass, { keep: true });
  instanced(G.tile, W.path, paths, { keep: true });
  instanced(G.tuft, W.tuft, tufts, { keep: true, receive: true });
  instanced(G.ico, mat(0xffffff, 1), flowers, { keep: true, receive: false });
  // trees: deciduous and pines around the edge, a few inside
  const trunks = [], crowns = [], pines = [];
  const tree = (x, z, s, pine) => {
    trunks.push({ x, y: 0.9 * s, z, sx: 0.32 * s, sy: 1.8 * s, sz: 0.32 * s, c: 0x6a4a32 });
    if (pine) { for (let k = 0; k < 3; k++) pines.push({ x, y: (1.6 + k * 0.9) * s, z, sx: (2.2 - k * 0.55) * s, sy: 1.6 * s, sz: (2.2 - k * 0.55) * s, ry: rand(0, 6), c: tint(0x2f5a3a, rand(0.85, 1.15)) }); }
    else for (let k = 0; k < 3; k++) crowns.push({ x: x + rand(-0.5, 0.5) * s, y: (2.3 + rand(0, 0.8)) * s, z: z + rand(-0.5, 0.5) * s, sx: rand(1.6, 2.2) * s, sy: rand(1.4, 1.9) * s, sz: rand(1.6, 2.2) * s, ry: rand(0, 6), c: tint(pick([0x4a8a3a, 0x5a9a42, 0x3a7a36, 0x6a9a3a]), rand(0.85, 1.1)) });
  };
  for (let j = -10; j < L.h + 10; j++) for (let i = -10; i < L.w + 10; i++) {
    const inside = i >= 2 && j >= 2 && i < L.w - 2 && j < L.h - 2;
    if (inside) continue;
    if (j >= L.h - 3 && i >= 17 && i <= 26) continue;
    const ring = Math.min(Math.abs(i - 1), Math.abs(j - 1), Math.abs(i - (L.w - 2)), Math.abs(j - (L.h - 2)));
    if (chance(ring < 3 ? 0.42 : 0.16)) tree(i + rand(0.2, 0.8), j + rand(0.2, 0.8), rand(0.8, 1.35), chance(0.35));
  }
  for (const [x, z] of [[15.5, 13.6], [27, 13.6], [5, 27], [9, 22], [38, 28], [28, 30], [14, 30]]) tree(x, z, rand(0.9, 1.15), chance(0.3));
  instanced(G.taper, W.bark, trunks, { keep: true, cast: true });
  instanced(G.ico1, W.leaf, crowns, { keep: true, cast: true });
  instanced(G.cone, W.leaf, pines, { keep: true, cast: true });
  // fence along the inner edge, open at the south gate
  const posts = [], rails = [];
  const fenceLine = (x0, z0, x1, z1) => { const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.5); for (let k = 0; k <= n; k++) { const t = k / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t); if (z > L.h - 3 && x > 17.5 && x < 26.5) continue; posts.push({ x, y: 0.45, z, sx: 0.14, sy: 0.9, sz: 0.14 }); if (k < n) { const nx = lerp(x0, x1, (k + 0.5) / n), nz = lerp(z0, z1, (k + 0.5) / n); if (nz > L.h - 3 && nx > 17.5 && nx < 26.5) continue; for (const y of [0.35, 0.7]) rails.push({ x: nx, y, z: nz, sx: x0 === x1 ? 0.07 : 1.5, sy: 0.08, sz: x0 === x1 ? 1.5 : 0.07 }); } } };
  fenceLine(1.9, 1.9, L.w - 1.9, 1.9); fenceLine(1.9, L.h - 1.9, L.w - 1.9, L.h - 1.9); fenceLine(1.9, 1.9, 1.9, L.h - 1.9); fenceLine(L.w - 1.9, 1.9, L.w - 1.9, L.h - 1.9);
  instanced(G.box, W.timber, posts, { keep: true, cast: true }); instanced(G.box, W.timber, rails, { keep: true, cast: true });
  // distant hills and mountains for the horizon
  const hills = [];
  for (let k = 0; k < 46; k++) { const a = (k / 46) * Math.PI * 2 + rand(-0.05, 0.05), r = rand(48, 70), s = rand(14, 26); hills.push({ x: 22 + Math.cos(a) * r, y: -s * 0.35, z: 18 + Math.sin(a) * r, sx: s, sy: s * rand(0.5, 0.8), sz: s, ry: rand(0, 6), c: tint(pick([0x5a7a42, 0x6a8a4a, 0x4a6a3a]), rand(0.8, 1.1)) }); }
  for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2 + rand(-0.1, 0.1), r = rand(105, 135), s = rand(30, 50); hills.push({ x: 22 + Math.cos(a) * r, y: s * 0.32, z: 18 + Math.sin(a) * r, sx: s, sy: s * rand(0.9, 1.4), sz: s, ry: rand(0, 6), c: tint(0x6a7a9a, rand(0.8, 1.1)) }); }
  instanced(G.dodec, W.rock, hills, { keep: true });
  // buildings and props, baked into a few merged meshes
  const props = new THREE.Group(); world.add(props);
  buildHome(props);
  building(props, TOWN.smith, { wall: W.stone, roof: W.roofS, chimney: 1, rh: 1.5 });
  building(props, TOWN.alch, { wall: W.plasterP, roof: W.roofG, beams: true, rh: 2.1 });
  building(props, TOWN.trader, { wall: W.timber, roof: W.roofR, north: true, beams: true, chimney: -1 });
  // smithy: anvil, forge, rack
  props.add(mesh(G.box, W.iron, 0.9, 0.3, 0.42, 18.4, 0.75, 11.4), mesh(G.box, W.iron, 0.42, 0.45, 0.32, 18.4, 0.32, 11.4), mesh(G.box, W.timber, 0.7, 0.2, 0.55, 18.4, 0.1, 11.4));
  props.add(mesh(G.box, W.stone, 1.3, 0.9, 1.0, 23, 0.45, 11.4), mesh(G.box, mat(0xff7a2a, 3), 0.9, 0.06, 0.6, 23, 0.92, 11.4));
  for (let k = 0; k < 3; k++) { const wpn = weaponMesh(['sword', 'axe', 'spear'][k]); wpn.position.set(16.2, 0.1, 10.6 + k * 0.5); wpn.rotation.x = -Math.PI / 2; props.add(wpn); }
  // apothecary: cauldron and herb pots
  props.add(mesh(G.sph, W.iron, 1.0, 0.75, 1.0, 30.4, 0.42, 11.4), mesh(G.disc, mat(0x7aff6a, 2.6), 0.4, 1, 0.4, 30.4, 0.76, 11.4));
  for (let k = 0; k < 3; k++) props.add(mesh(G.cyl, mat(0x9a5a3a), 0.4, 0.4, 0.4, 34.2 + k * 0.5, 0.2, 11.3), mesh(G.ico, mat(0x5aa04a), 0.42, 0.4, 0.42, 34.2 + k * 0.5, 0.55, 11.3));
  // market: awning, crates and barrels
  for (let k = 0; k < 6; k++) { const a = mesh(G.box, mat(k % 2 ? 0xe8dcc0 : 0xb04a3a), 1.0, 0.07, 1.5, 31.5 + k, 2.25, 20.35); a.rotation.x = -0.32; props.add(a); }
  for (const [x, z, s] of [[30.2, 19.6, 0.6], [30.9, 19.4, 0.5], [38.4, 19.8, 0.6]]) props.add(mesh(G.box, W.timber, s, s, s, x, s / 2, z));
  for (const [x, z] of [[37.4, 19.6], [37.9, 20.2]]) props.add(mesh(G.cyl, W.timber, 0.55, 0.8, 0.55, x, 0.4, z), mesh(G.cyl, W.iron, 0.58, 0.05, 0.58, x, 0.6, z));
  // well
  props.add(mesh(G.cyl, W.stone, 2.1, 0.85, 2.1, 22, 0.42, 17), mesh(G.disc, W.water, 0.82, 1, 0.82, 22, 0.72, 17));
  for (const s of [-1, 1]) props.add(mesh(G.box, W.beam, 0.14, 2.2, 0.14, 22 + s * 0.95, 1.1, 17));
  { const r = new THREE.Group(); roofSlabs(r, 22, 17, 2.2, 1.4, 2.2, 0.7, W.roofR, false); r.children.pop(); props.add(r); }
  // lamp posts
  for (const [x, z] of [[6, 14.2], [16, 14.2], [27, 14.2], [38, 14.2], [19, 24], [25, 24], [19.2, 29.6], [24.8, 29.6]]) {
    props.add(mesh(G.cyl, W.iron, 0.12, 2.6, 0.12, x, 1.3, z), mesh(G.box, W.iron, 0.36, 0.06, 0.36, x, 2.62, z), mesh(G.box, mat(0xffc878, 3.2), 0.24, 0.3, 0.24, x, 2.45, z), mesh(G.cone4, W.iron, 0.42, 0.2, 0.42, x, 2.75, z));
  }
  // rocks and benches
  for (let k = 0; k < 12; k++) { const r = mesh(G.dodec, mat(0x8a8680), rand(0.3, 0.6), rand(0.2, 0.4), rand(0.3, 0.6), rand(3, 41), 0.1, rand(15, 32)); if (walkable(r.position.x, r.position.z) && !LV.path[tidx(r.position.x, r.position.z)]) props.add(r); }
  // the Delve gate: stone arch, glowing rift and braziers
  for (const s of [-1, 1]) { props.add(mesh(G.box, W.stone, 1.8, 3.6, 1.8, 22 + s * 3, 1.8, 33), mesh(G.box, W.stone, 2.2, 0.35, 2.2, 22 + s * 3, 3.7, 33)); props.add(mesh(G.cyl, W.iron, 0.5, 0.9, 0.5, 22 + s * 4.6, 0.45, 31.2), mesh(G.cyl, W.iron, 0.8, 0.2, 0.8, 22 + s * 4.6, 0.95, 31.2)); }
  props.add(mesh(G.box, W.stone, 8.2, 0.6, 1.4, 22, 4.15, 33));
  for (let k = 0; k < 5; k++) props.add(mesh(G.box, mat(0xb08cff, 3), 0.22, 0.3, 0.05, 19.4 + k * 1.3, 4.15, 32.28));
  props.add(mesh(G.box, mat(0x05040a), 4, 0.06, 2, 22, 0.03, 33));
  const rift = new THREE.Mesh(G.disc, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U_TIME },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying vec2 vP;
      void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float sw = sin(a * 5.0 + r * 9.0 - uTime * 2.5) * 0.5 + 0.5;
        float m = smoothstep(1.0, 0.3, r) * (0.35 + 0.65 * sw); vec3 c = mix(vec3(0.5, 0.3, 1.6), vec3(2.6, 1.6, 4.0), sw * (1.0 - r));
        gl_FragColor = vec4(c * m, m);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` }));
  rift.scale.set(1.9, 1, 0.95); rift.position.set(22, 0.07, 33); rift.userData.live = 1; levelDisp.push(rift.material); props.add(rift);
  const gateFlames = makeFlames([{ x: 17.4, y: 1.1, z: 31.2 }, { x: 26.6, y: 1.1, z: 31.2 }, { x: 23, y: 0.98, z: 11.4 }]);
  gateFlames.userData.live = 1; props.add(gateFlames);
  // townsfolk
  for (const [x, z, c, a] of [[19.2, 11.7, 0x8a6a5a, 0.3], [31.4, 11.7, 0x6a5a8a, -0.3], [33.2, 19.3, 0xa07a4a, Math.PI], [24.5, 18.2, 0x5a7a8a, -1.2]]) {
    const cr = makeCreature('villager', c, 0x1a1a1a); cr.g.position.set(x, 0, z); cr.g.rotation.y = a; cr.mats.forEach((m) => levelDisp.push(m)); props.add(cr.g);
  }
  bakeStatic(props);
  // light, sky and air
  makeEnv(0x6a96c8, 0xf3c48a, 0x5a6a42, 0xffd8a0);
  scene.environmentIntensity = 0.55;
}

// ================= interactables =================
const interacts = [];
function addInteract(o) { interacts.push(o); if (o.label) addLabel(o.label, o.x, o.ly || 3.2, o.z, o.cls || 'npc', o); return o; }

// ================= themed rooms =================
function dressThemedRooms() {
  const L = LV, W = worldMats(), B = biomeOf(L.depth);
  const wood = [], books = [], stone = [], glowL = [], cliffs = [], rims = [];
  L.floods = [];
  for (const r of L.rooms) {
    if (!r.theme) continue;
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.theme === 'library') {
      for (const [i, j, side] of r.shelves) {
        const x = i + 0.5, z = j + 0.5, dz = side === 0 ? -0.22 : side === 2 ? 0.22 : 0, d = side === 1 ? 0.7 : 0.45;
        wood.push({ x, y: 1.1, z: z + dz, sx: 0.96, sy: 2.2, sz: d, c: 0x5a3a24 });
        for (let s = 0; s < 3; s++) for (let b = 0; b < 6; b++) {
          const face = side === 1 ? [-1, 1] : [side === 0 ? 1 : -1];
          for (const f of face) books.push({ x: x - 0.38 + b * 0.15 + rand(-0.02, 0.02), y: 0.45 + s * 0.62, z: z + dz + f * (d / 2 - 0.06), sx: 0.11, sy: rand(0.32, 0.44), sz: 0.16, c: pick([0x7a2a2a, 0x2a4a7a, 0x3a6a3a, 0x8a6a2a, 0x5a3a6a, 0xc8b89a]) });
        }
      }
      for (let k = 0; k < 3; k++) glowL.push({ x: rand(r.x + 1.5, r.x + r.w - 1.5), y: 0.95, z: rand(r.y + 1.5, r.y + r.h - 1.5), sx: 0.08, sy: 0.12, sz: 0.08, c: glowC(0xffc070, 3.4) });
    } else if (r.theme === 'tomb') {
      for (const [x, z] of r.coffins) {
        stone.push({ x, y: 0.3, z, sx: 1.8, sy: 0.6, sz: 0.8, c: 0x4a463f });
        stone.push({ x, y: 0.66, z, sx: 1.95, sy: 0.12, sz: 0.92, c: 0x5e5950 });
        stone.push({ x: x + 0.3, y: 0.76, z, sx: 0.5, sy: 0.08, sz: 0.36, c: 0x3a3630 });
        glowL.push({ x: x - 1.05, y: 0.4, z, sx: 0.08, sy: 0.14, sz: 0.08, c: glowC(0xffc070, 3) });
      }
    } else if (r.theme === 'vault') {
      for (let k = 0; k < 14; k++) glowL.push({ x: rand(r.x + 1, r.x + r.w - 1), y: 0.02, z: rand(r.y + 1, r.y + r.h - 1), sx: rand(0.08, 0.16), sy: 0.03, sz: rand(0.08, 0.16), ry: rand(0, 3), c: glowC(0xffd24a, 2.4) });
      for (const [x, z] of r.chests) stone.push({ x, y: 0.06, z, sx: 1.4, sy: 0.12, sz: 1.0, c: 0x6a5a3a });
    } else if (r.theme === 'grove') {
      const [x, z] = r.spring;
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; stone.push({ x: x + Math.sin(a) * 1.25, y: 0.16, z: z + Math.cos(a) * 1.25, sx: 0.42, sy: 0.32, sz: 0.36, ry: a, c: 0x6a6a5a }); }
      for (let k = 0; k < 16; k++) { const gx = rand(r.x + 0.8, r.x + r.w - 0.8), gz = rand(r.y + 0.8, r.y + r.h - 0.8); if (Math.hypot(gx - x, gz - z) < 1.8) continue; wood.push({ x: gx, y: 0.25, z: gz, sx: 0.06, sy: 0.5, sz: 0.06, c: 0x3a6a3a }); glowL.push({ x: gx, y: 0.55, z: gz, sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(pick([0x9aff9a, 0xd8ff8a, 0x8affe8]), 2.6) }); }
      const wm = liquidMat('water', { torch: 0x3affc0 }); levelDisp.push(wm); L.waterMats = (L.waterMats || []).concat(wm);
      const pool = mesh(G.cyl, wm, 2.1, 0.04, 2.1, x, 0.08, z); pool.renderOrder = 2; world.add(pool);
    } else if (r.theme === 'hall') {
      const long = r.w >= r.h, carpet = mesh(G.tile, new THREE.MeshStandardMaterial({ color: 0x6a1a22, roughness: 0.95 }), long ? r.w - 2 : 1.6, 1, long ? 1.6 : r.h - 2, cx, 0.012, cz);
      levelDisp.push(carpet.material); world.add(carpet);
    } else if (r.theme === 'flooded') {
      const lava = B.id === 'magma'; if (lava) L.lava = true;
      const wm = liquidMat(lava ? 'lava' : 'water', B); levelDisp.push(wm);
      L.waterMats = (L.waterMats || []).concat(wm);
      const wtr = mesh(G.tile, wm, r.w, 1, r.h, cx, 0.12, cz); wtr.renderOrder = 2; world.add(wtr);
      L.floods.push(r);
    } else if (r.theme === 'chasm') {
      const abyss = mesh(G.tile, new THREE.MeshBasicMaterial({ color: new THREE.Color(B.torch).multiplyScalar(0.09) }), r.w - 4, 1, r.h - 4, cx, -6, cz);
      levelDisp.push(abyss.material); world.add(abyss);
      for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
        if (L.g[j * L.w + i] !== 5) continue;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (L.g[(j + b) * L.w + i + a] === 5) continue;
          cliffs.push({ x: i + 0.5 + a * 0.5, y: -3, z: j + 0.5 + b * 0.5, sx: a ? 0.06 : 1, sy: 6, sz: b ? 0.06 : 1, c: grey(rand(0.55, 0.75)) });
          rims.push({ x: i + 0.5 + a * 0.44, y: 0.05, z: j + 0.5 + b * 0.44, sx: a ? 0.14 : 1.02, sy: 0.1, sz: b ? 0.14 : 1.02, c: grey(rand(0.8, 1)) });
        }
        if (chance(0.12)) glowL.push({ x: i + rand(0.2, 0.8), y: -5.6, z: j + rand(0.2, 0.8), sx: 0.12, sy: 0.12, sz: 0.12, c: glowC(B.torch, 3) });
      }
    }
  }
  if (wood.length) instanced(G.box, W.decoStd, wood, { keep: true, cast: true });
  if (books.length) instanced(G.box, W.decoStd, books, { keep: true });
  if (stone.length) instanced(G.box, W.decoStd, stone, { keep: true, cast: true });
  if (cliffs.length) instanced(G.box, W.wall, cliffs, { keep: true });
  if (rims.length) instanced(G.box, W.cap, rims, { keep: true });
  if (glowL.length) instanced(G.sph, W.glow, glowL, { keep: true, receive: false });
}
const inFlood = (x, z) => LV && LV.floods && LV.floods.some((r) => x >= r.x && x < r.x + r.w && z >= r.y && z < r.y + r.h);
// ================= runtime collections =================
const enemies = [], projs = [], teles = [], drops = [], parts = [], lines = [];
const P = { x: 0, z: 0, r: 0.38, face: 0, hp: 100, atkT: 0, swingT: 0, swingDur: 0.15, dodgeT: 0, dodgeCd: 0, dodgeDir: 0, iframes: 0, hurtT: 0, frenzy: 0, frenzyT: 0, burnT: 0, burnD: 0, chillT: 0, dead: false, mesh: null, hand: null, weapon: null, wkind: '', walk: 0, ghostT: 0 };
let flow = null, flowT = 0, flowTile = -1;
let bossRef = null;

// ================= line fx (bursts live in the render core) =================
function zap(ax, az, bx, bz, color) {
  if (!calm()) { boltFx(ax, 1.1, az, bx, 1.0, bz, color, 0.22); return; }
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
  const o = new THREE.Mesh(G.tile, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff2c8).multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
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
  f.x = x + rand(-0.3, 0.3); f.y = y; f.z = z; f.t = f.max = cls === 'crit' ? 1 : 0.8; f.big = cls === 'crit';
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
    const p = project(f.x, f.y, f.z), age = f.max - f.t, pop = 1 + Math.max(0, 1 - age / 0.12) * (f.big ? 0.9 : 0.55);
    f.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%) scale(${pop.toFixed(3)})`;
    f.el.style.opacity = Math.min(1, f.t / f.max * 2);
  }
  const stack = [];
  for (const L of labelEls) {
    if (L.ref && L.ref.mesh) { L.x = L.ref.x; L.z = L.ref.z; L.y = L.ref.h * L.ref.scale + 0.55; }
    const far = Math.hypot(L.x - P.x, L.z - P.z) > (L.ref && L.ref.mesh ? 14 : L.near || 30);
    const p = project(L.x, L.y, L.z);
    const show = p.ok && !far && !(L.ref && L.ref.hideLabel) && p.y > 110 && p.x > 30 && p.x < window.innerWidth - 30;
    L.el.style.display = show ? '' : 'none';
    if (show && L.near && (!L.el.classList.contains('r0') || document.body.classList.contains('alt'))) { stack.push({ L, x: p.x, y: p.y }); continue; }
    if (show) L.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }
  // item names on the ground stack upward instead of piling on top of each other
  stack.sort((a, b) => b.y - a.y);
  for (let i = 0; i < stack.length; i++) {
    const s = stack[i]; s.w = s.L.w || (s.L.w = s.L.el.offsetWidth || 80);
    for (let guard = 0; guard < 8; guard++) {
      const hit = stack.slice(0, i).find((o) => Math.abs(o.x - s.x) < (o.w + s.w) / 2 + 4 && Math.abs(o.y - s.y) < 19);
      if (!hit) break; s.y = hit.y - 19;
    }
    s.L.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
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
  const A = ARCH[arch], d = RUN.depth, B = biomeOf(d);
  const [name, color] = B.enemies[arch];
  const cr = makeCreature(arch, color, B.eye);
  // tuned against a simulated climb (see README, Balance): foes take a little longer to kill each depth and hit a
  // little harder, and past depth 25 an extra ramp builds steadily instead of jumping at the start of a cycle
  const ramp = Math.max(0, d - 25) / 25;
  const hpm = Math.pow(1.135, d - 1) * (1 + ramp * 1.5), dm = Math.pow(1.088, d - 1) * (1 + ramp * 0.8);
  const e = {
    id: uid++, arch, ai: A.ai, A, name, x, z, r: A.r, spd: A.spd * rand(0.92, 1.08), hp: A.hp * hpm, dmg: A.dmg * dm, xp: A.xp * (1 + 0.18 * (d - 1)),
    cd: rand(0.4, 1.4), wind: 0, mesh: cr.g, mats: cr.mats, u: cr.u, h: cr.h, strikeT: 0, scale: 1, arm: A.armor || 0, kx: 0, kz: 0, burnT: 0, burnD: 0, chillT: 0, flashT: 0,
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
    for (let k = 0; k < 5; k++) { const sp = mesh(G.cone4, WMAT.gold || metal(0xe0aa50, 0.3), 0.12, 0.28, 0.12, Math.sin(k * 1.256) * 0.2, cr.h + 0.12, Math.cos(k * 1.256) * 0.2); crown.add(sp); }
    crown.add(mesh(G.cyl, metal(0xe0aa50, 0.3), 0.5, 0.08, 0.5, 0, cr.h, 0));
    cr.g.add(crown);
    const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: new THREE.Color(AURAS[e.aura].col).multiplyScalar(2), transparent: true, opacity: 0.5, depthWrite: false }));
    ring.scale.setScalar(2.4); ring.position.set(x, 0.04, z); world.add(ring); e.auraRing = ring;
  }
  if (o.boss) {
    world.remove(cr.g); cr.mats.forEach((m) => m.dispose());
    const bc = makeCreature(B.boss.shape, B.boss.color, 0xffffff);
    e.mesh = bc.g; e.mats = bc.mats; e.h = bc.h; e.u = bc.u;
    const lap = Math.floor((d - 1) / (5 * BIOMES.length)); // how many times this biome has come round
    e.boss = 1; e.name = B.boss.name + (lap ? ' ' + roman(lap + 1) : '');
    e.hp = 950 * hpm; e.dmg = 15 * dm; e.xp = 400 * (1 + 0.2 * d); e.scale = 2.4; e.r = 1.25; e.spd = 2.6; e.arm = 0.1;
    e.patterns = B.boss.patterns; e.patT = 2; e.color = B.boss.color;
    e.mats[0].emissive.setHex(B.boss.color).multiplyScalar(0.25);
    bossDress(bc.g, B.id, bc.h);
  }
  e.hp *= diff().hp; e.dmg *= diff().dmg; e.xp *= diff().xp;
  if (riftMod("swift")) e.spd *= 1.3;
  if (riftMod("brutal")) e.dmg *= 1.4;
  e.maxHp = e.hp;
  e.mesh.scale.setScalar(e.scale);
  e.mesh.rotation.order = 'YXZ'; // flinch and topple tilt around the creature's own axis
  e.u.uRim.value.set(e.boss ? e.color : e.leader ? AURAS[e.aura].col : e.champ ? EAFF[e.aff[0]].col : B.torch).multiplyScalar(e.boss ? 0.5 : e.leader ? 0.5 : e.champ ? 0.42 : 0.2);
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
  if (e.boss && !bossRef) { bossRef = e; $('#bossBar').hidden = false; $('#bossName').textContent = e.name; bossIntro(e); sfx('boss'); setMusic('boss'); shake(0.35); hint('boss'); }
  else hint('fight');
  // wake the rest of the pack
  for (const o of enemies) if (!o.awake && !o.boss && Math.hypot(o.x - e.x, o.z - e.z) < 7) { o.awake = true; }
}
function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) { const t = i / n; if (blocksShot(lerp(ax, bx, t), lerp(az, bz, t))) return false; }
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
  if (e.frozenT > 0) { // frozen solid: no moving, no attacking
    e.frozenT -= dt; e.wind = 0; e.charging = 0;
    if (e.frozenT <= 0 && e.rim0) { e.u.uRim.value.copy(e.rim0); e.rim0 = null; }
    else { e.mesh.position.set(e.x, 0, e.z); return; }
  }
  if (e.burnT > 0) { e.burnT -= dt; e.hpTick = (e.hpTick || 0) + dt; if (e.hpTick > 0.5) { e.hpTick = 0; damageEnemy(e, e.burnD * 0.5, false, 0, 0, 0, false, 'burn'); if (e.dead) return; } }
  if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
  if (e.wardT > 0) e.wardT -= dt;
  if (!e.enr && e.hp < e.maxHp * 0.5 && riftMod('frenzy')) { e.enr = 1; e.spd *= 1.4; e.dmg *= 1.35; burst(e.x, e.h * e.scale, e.z, 0xff3a3a, 10, 3, 0.12); floatNum(e.x, e.h * e.scale + 0.6, e.z, 'Enraged', 'crit'); }
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
  } else if (e.leapW > 0) { // crouch, then spring at where you stood
    e.leapW -= dt; e.face = Math.atan2(e.htx - e.x, e.htz - e.z);
    if (e.leapW <= 0) { e.hopT = e.hopDur = 0.42; e.hx0 = e.x; e.hz0 = e.z; sfx('dodge'); }
  } else if (e.hopT > 0) {
    e.hopT -= dt; const k = clamp(1 - e.hopT / e.hopDur, 0, 1);
    e.x = lerp(e.hx0, e.htx, k); e.z = lerp(e.hz0, e.htz, k); e.hopY = Math.sin(k * Math.PI) * 1.5;
    if (e.hopT <= 0) { e.hopY = 0; burst(e.x, 0.2, e.z, 0xc8b89a, 10, 4, 0.12); }
  } else if (e.boss || (e.guardPat && e.casting)) { updBoss(e, dt, dist, dx, dz, spd); }
  else if (e.guardPat && e.awake && (e.patT -= dt) <= 0 && dist < 13 && e.los) { e.patT = e.hp < e.maxHp * 0.5 ? 3.2 : 4.4; bossPattern(e, pick(e.guardPat), e.hp < e.maxHp * 0.5); }
  else if (e.wind > 0) {
    e.wind -= dt * atkM; faceP();
    if (e.wind <= 0) {
      e.strikeT = 0.2;
      if (e.ai === 'melee' || e.ai === 'charger' || e.ai === 'leaper') { if (dist < e.A.range * e.scale + P.r + 0.35) hurtPlayer(e.dmg, e); swipeFx(e); }
      else if (e.ai === 'totem') { // pulse: a slow ring of bolts and a ward on every ally nearby
        for (let k = 0; k < 10; k++) enemyFire(e, e.face + k * Math.PI / 5, { spd: 5, size: 0.22, dmg: e.dmg });
        ringFx(e.x, e.z, 0.5, 6, 0.4, biomeOf(RUN.depth).bolt, 2);
        for (const o of enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.z - e.z) < 6) { o.wardT = 4; burst(o.x, o.h * o.scale, o.z, 0x6a9aff, 4, 2, 0.1); }
      }
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
      case 'leaper': {
        faceP();
        if (dist < e.A.range * e.scale + P.r && (e.bite || 0) <= 0) { e.wind = 0.32; e.bite = 1.0; }
        else if (dist > 2.4 && dist < 7.5 && e.los && e.cd <= 0 && walkable(P.x, P.z)) {
          e.cd = e.A.cd * rand(0.8, 1.2); e.leapW = 0.5; e.htx = P.x; e.htz = P.z;
          telegraph(P.x, P.z, 1.5, 0.92, e.dmg * 1.25, {});
        } else { const [sx, sz] = steer(e, dist); mx = sx * spd; mz = sz * spd; }
        e.bite = (e.bite || 0) - dt;
        break;
      }
      case 'totem': {
        e.face += dt * 0.5;
        if (e.cd <= 0 && dist < 11 && e.los) { e.cd = e.A.cd * rand(0.9, 1.15); e.wind = 0.7; }
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
  e.mesh.position.set(e.x, Math.abs(Math.sin(e.bob)) * 0.08 + (e.hopY || 0), e.z);
  const cur = e.mesh.rotation.y; e.mesh.rotation.y = cur + angDiff(e.face, cur) * Math.min(1, dt * 12);
  const windGlow = e.wind > 0 || e.windCharge > 0;
  if (e.flashT > 0 || windGlow) { e.flashT -= dt; e.mats[0].emissive.setHex(windGlow && !(e.flashT > 0) ? 0x663322 : 0xffffff).multiplyScalar(windGlow ? 0.5 : 0.8); }
  else if (!(e.fuse > 0)) e.mats[0].emissive.setHex(e.leader ? AURAS[e.aura].col : e.champ ? EAFF[e.aff[0]].col : e.boss ? e.color : 0x000000).multiplyScalar(e.leader ? 0.25 : e.champ ? 0.35 : e.boss ? 0.25 : 0);
  // flinch: lean back and squash for a moment after a hit
  e.hitT = Math.max(0, (e.hitT || 0) - dt);
  const fk = e.hitT / 0.16;
  e.mesh.rotation.x = -0.38 * fk * (e.boss ? 0.3 : 1);
  if (e.wind > 0 && e.ai !== 'ranged') e.mesh.scale.setScalar(e.scale * (1 + 0.08 * Math.sin(e.wind * 30)));
  else e.mesh.scale.set(e.scale * (1 + 0.1 * fk), e.scale * (1 - 0.13 * fk), e.scale * (1 + 0.1 * fk));
  for (const c of e.mesh.children) { if (c.userData.float) c.position.y = 1.0 + Math.sin(e.bob) * 0.1; if (c.userData.spin) c.rotation.y += dt * 2; }
  // limbs: walk cycle from ground speed, arm raised during a wind-up and brought down on the strike
  const gs = Math.hypot(mx, mz), u = e.u;
  u.uWalk.value += dt * (2.2 + gs * 2.4) * (gs > 0.1 ? 1 : 0);
  u.uAmp.value = lerp(u.uAmp.value, gs > 0.1 ? Math.min(0.75, 0.25 + gs * 0.12) : 0, Math.min(1, dt * 8));
  e.strikeT -= dt;
  const ranged = e.ai === 'ranged';
  const tgt = (e.wind > 0 || e.windCharge > 0 || e.fuse > 0 || (e.boss && e.casting)) ? (ranged ? -1.5 : -2.4) : e.strikeT > 0 ? -0.15 : 0;
  u.uArmR.value = tgt === 0 && Math.abs(u.uArmR.value) < 0.05 ? 0 : lerp(u.uArmR.value, tgt, Math.min(1, dt * (tgt === -0.15 ? 22 : 9)));
  u.uArmL.value = ranged && (e.wind > 0 || e.strikeT > 0) ? -1.5 : e.arch === 'warden' && e.awake ? -0.9 : 0;
  if (e.bar) {
    e.bar.position.set(e.x, e.h * e.scale + 0.3, e.z); e.bar.quaternion.copy(camera.quaternion);
    if (SET.cam !== 'top') e.bar.scale.setScalar(clamp(e.bar.position.distanceTo(camera.position) / 9, 0.3, 1)); else if (e.bar.scale.x !== 1) e.bar.scale.setScalar(1);
    const f = clamp(e.hp / e.maxHp, 0, 1); e.bar.userData.fg.scale.x = 0.96 * f; e.bar.userData.fg.position.x = -0.48 * (1 - f);
  }
}
function swipeFx(e) { burst(e.x + Math.sin(e.face) * e.r * 1.4, 0.8, e.z + Math.cos(e.face) * e.r * 1.4, 0xffffff, 4, 2, 0.08); }
function explodeEnemy(e) {
  if (e.tele) { disposeTele(e.tele); teles.splice(teles.indexOf(e.tele), 1); e.tele = null; }
  burst(e.x, 0.6, e.z, 0xff9a3a, 22, 7, 0.2); sfx('boom');
  if (Math.hypot(P.x - e.x, P.z - e.z) < 2.4 + P.r) hurtPlayer(e.dmg, e);
  e.hp = 0; e.exploded = true; killEnemy(e, true);
  shake(0.3);
}
function separate() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (a.dead || !a.awake) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j]; if (b.dead || !b.awake) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), push = (rr - d) / 2, nx = dx / d, nz = dz / d;
        const wa = a.boss || a.ai === 'totem' ? 0 : 1, wb = b.boss || b.ai === 'totem' ? 0 : 1;
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
    case 'whirlpool': { // drags you in while bolts circle outward
      let acc = 0, a = rand(0, 6.28);
      ringFx(e.x, e.z, 7, 0.6, 1.2, B.bolt, 2.2);
      e.casting = { t: p2 ? 2.8 : 2.2, tick: (dt) => {
        const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
        if (d > e.r + 1.2) { P.kx = dx / d * (p2 ? 4.2 : 3.3); P.kz = dz / d * (p2 ? 4.2 : 3.3); }
        acc += dt; while (acc > 0.16) { acc -= 0.16; a += 0.7; enemyFire(e, a, { spd: 5, size: 0.26, dmg: e.dmg * 0.7 }); enemyFire(e, a + Math.PI, { spd: 5, size: 0.26, dmg: e.dmg * 0.7 }); burst(e.x + Math.sin(a) * 4, 0.3, e.z + Math.cos(a) * 4, B.bolt, 2, 2, 0.1); }
      } };
      break;
    }
    case 'wave': { // rows of breakers roll towards you, each with one gap to slip through
      const a0 = Math.atan2(P.x - e.x, P.z - e.z), fx = Math.sin(a0), fz = Math.cos(a0), px = Math.cos(a0), pz = -Math.sin(a0);
      let step = 0, acc = 0; const gap = randi(-2, 2);
      e.casting = { t: 1.9, tick: (dt) => {
        acc += dt; if (acc < 0.28 || step >= (p2 ? 7 : 5)) return; acc = 0; step++;
        const g = gap + (p2 ? randi(-1, 1) : 0);
        for (let k = -4; k <= 4; k++) { if (k === g) continue; const x = e.x + fx * (1.6 + step * 1.9) + px * k * 1.9, z = e.z + fz * (1.6 + step * 1.9) + pz * k * 1.9; if (walkable(x, z)) telegraph(x, z, 1.05, 0.55, e.dmg * 1.2, { col: 0x5ae8ff }); }
      } };
      break;
    }
    case 'beam': { // three turning arms of bolts
      let acc = 0, a = rand(0, 6.28); const arms = p2 ? 4 : 3, turn = (chance(0.5) ? 1 : -1) * (p2 ? 0.95 : 0.75);
      e.casting = { t: 2.6, tick: (dt) => { a += turn * dt; acc += dt; while (acc > 0.05) { acc -= 0.05; for (let k = 0; k < arms; k++) enemyFire(e, a + k * Math.PI * 2 / arms, { spd: 12, size: 0.2, dmg: e.dmg * 0.55, col: 0xffe08a }); } } };
      break;
    }
    case 'roots': { // roots race along the ground towards you
      const a0 = Math.atan2(P.x - e.x, P.z - e.z), lines = p2 ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.35, 0, 0.35];
      let step = 0, acc = 0;
      e.casting = { t: 1.6, tick: (dt) => {
        acc += dt; if (acc < 0.09 || step >= 11) return; acc = 0; step++;
        for (const o of lines) { const x = e.x + Math.sin(a0 + o) * (1 + step * 1.15), z = e.z + Math.cos(a0 + o) * (1 + step * 1.15); if (walkable(x, z)) telegraph(x, z, 0.9, 0.5, e.dmg * 1.1, { col: 0xd03a5a }); }
      } };
      break;
    }
    case 'ripple': { // rings of breakers spread outward, each with a turning gap to stand in
      let ringN = 0, acc = 0; const g0 = rand(0, 6.28), turn = chance(0.5) ? 0.9 : -0.9;
      e.casting = { t: 2.2, tick: (dt) => {
        acc += dt; if (acc < 0.36 || ringN >= (p2 ? 5 : 4)) return; acc = 0; ringN++;
        const R = 1.8 + ringN * 1.7, n = Math.round(R * 3.2), gap = g0 + ringN * turn;
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; if (Math.abs(angDiff(a, gap)) < 0.55) continue; const x = e.x + Math.sin(a) * R, z = e.z + Math.cos(a) * R; if (walkable(x, z)) telegraph(x, z, 0.85, 0.6, e.dmg * 1.1, {}); }
      } };
      break;
    }
    case 'chase': { // blows fall where you stand, again and again: keep moving
      let n = 0, acc = 0.3;
      e.casting = { t: p2 ? 2.6 : 2.0, tick: (dt) => { acc += dt; if (acc > (p2 ? 0.28 : 0.36) && n < (p2 ? 8 : 6)) { acc = 0; n++; telegraph(P.x + (P.mx || 0) * 0.8, P.z + (P.mz || 0) * 0.8, 1.6, 0.6, e.dmg * 1.3, {}); } } };
      break;
    }
    case 'cross': { // a plus, then an X, of falling blows through the boss
      const lines = (off) => { for (let k = 0; k < 4; k++) { const a = off + k * Math.PI / 2; for (let s = 1; s <= 8; s++) { const x = e.x + Math.sin(a) * s * 1.3, z = e.z + Math.cos(a) * s * 1.3; if (!walkable(x, z)) break; telegraph(x, z, 0.8, 0.7 + s * 0.03, e.dmg * 1.2, {}); } } };
      lines(Math.atan2(P.x - e.x, P.z - e.z));
      if (p2) { let done = false; e.casting = { t: 1.2, tick: () => { if (!done && e.casting.t < 0.4) { done = true; lines(Math.atan2(P.x - e.x, P.z - e.z) + Math.PI / 4); } } }; }
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
  const col = o.col || TELE_COL;
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
  if (!_teleMats.has(col)) _teleMats.set(col, [[0.14, 1], [0.32, 1.4], [0.85, 2.6]].map(([op, k]) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: op, depthWrite: false })));
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
      } else if (Math.hypot(P.x - t.x, P.z - t.z) < t.r + P.r * 0.5) hurtPlayer(t.dmg, t);
    }
  }
}

// ================= projectiles =================
const _projMat = new Map();
function projMat(c) { if (!_projMat.has(c)) _projMat.set(c, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3.2) })); return _projMat.get(c); }
function spawnProj(o) {
  const m = new THREE.Mesh(G.lsph, projMat(o.col));
  m.scale.set(o.size * 2, o.size * 2, o.spear ? 2.4 : o.size * (o.owner === 'p' && o.size < 0.15 ? 9 : 3));
  if (o.spear) m.scale.set(0.16, 0.16, 2.4);
  m.rotation.y = o.a; m.position.set(o.x, 0.85, o.z);
  world.add(m);
  projs.push(Object.assign({ vx: Math.sin(o.a) * o.spd, vz: Math.cos(o.a) * o.spd, mesh: m, hit: new Set(), life: o.life || 1.6, pierce: o.pierce || 0 }, o));
}
function updProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    if (p.home && !p.home.dead) { // seeking bolts turn toward their mark
      const want = Math.atan2(p.home.x - p.x, p.home.z - p.z), cur = Math.atan2(p.vx, p.vz), a = cur + clamp(angDiff(want, cur), -dt * 7, dt * 7);
      p.vx = Math.sin(a) * p.spd; p.vz = Math.cos(a) * p.spd; p.mesh.rotation.y = a;
    }
    p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt;
    let dead = p.life <= 0 || blocksShot(p.x, p.z); // shots fly over chasms, not through walls
    if (!dead && p.owner === 'p') {
      for (const e of enemies) {
        if (e.dead || p.hit.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < e.r + p.size + 0.15) {
          p.hit.add(e.id);
          const { d, crit } = rollDmg(e); withElem(p.el || hitElem, () => damageEnemy(e, d * (p.mult || 1), crit, 2, p.vx / p.spd, p.vz / p.spd, true));
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
function rollDmg(e) {
  let d = ST.dmg * rand(0.9, 1.1) * (1 + 0.15 * (P.horn || 0));
  if (e) { // talents that care who is on the end of the blade
    if (e.hp < e.maxHp * 0.3) d *= 1 + 0.15 * tal('executioner');
    if (e.champ || e.leader || e.boss) d *= 1 + 0.1 * tal('huntersmark');
  }
  const crit = P.nextCrit || Math.random() * 100 < ST.crit; P.nextCrit = false; // a perfect roll or parry guarantees the next crit
  if (crit) d *= 1.5 + ST.critd / 100;
  return { d, crit };
}
function curWeapon() { return WEAPONS[ST.wk]; }
function playerAttack() {
  if (P.atkT > 0 || P.dodgeT > 0 || P.dashT > 0 || P.spinT > 0 || P.leapT > 0 || P.dead) return;
  const w = curWeapon();
  const fr = 1 + (ST.aspd + P.frenzy * 4) / 100;
  // three-hit string: swings alternate direction, the third is a heavier finisher
  P.combo = elapsed - (P.lastAtk || -9) < w.cd / fr + 0.45 ? ((P.combo || 0) + 1) % 3 : 0;
  P.lastAtk = elapsed; P.fin = !w.ranged && P.combo === 2;
  P.atkT = w.cd / fr * (P.fin ? 1.25 : 1); P.swingDur = P.swingT = Math.min(P.fin ? 0.26 : 0.2, P.atkT * 0.85);
  sfx(w.ranged ? 'shoot' : P.fin || ST.wk === 'hammer' || ST.wk === 'axe' ? 'heavy' : 'swing');
  const a = P.face;
  if (w.ranged) {
    const n = (ST.powers.split ? 3 : 1) + (Math.random() * 100 < 15 * tal('multishot') ? 2 : 0);
    for (let k = 0; k < n; k++) spawnProj({ x: P.x + Math.sin(a) * 0.5, z: P.z + Math.cos(a) * 0.5, a: a + (k - (n - 1) / 2) * 0.18, spd: w.pspd, owner: 'p', size: w.size, col: w.col, pierce: w.pierce + ST.pierce, mult: k === 0 ? 1 : 0.6, life: LV.type === 'town' ? 0.8 : undefined });
  } else {
    if (SET.cam === 'top') swingFx(a, w);
    P.pend = { t: P.swingDur * 0.42, fin: P.fin }; // the blow lands mid-swing, not on the button press
  }
}
function resolveMelee(fin) {
  const w = curWeapon(), a = P.face;
  let hits = 0, crits = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > w.range * ST.reachM * (fin ? 1.12 : 1) + e.r) continue;
    if (Math.abs(angDiff(Math.atan2(dx, dz), a)) > w.arc * ST.arcM / 2 + 0.15 + (fin ? 0.25 : 0) && d > e.r + 0.4) continue;
    const r = rollDmg(e);
    damageEnemy(e, r.d * (fin ? 1.35 : 1), r.crit, w.kb * (fin ? 1.6 : 1), dx / (d || 1), dz / (d || 1), true);
    hits++; if (r.crit) crits++;
  }
  if (hits) {
    addHitStop(crits ? 0.075 : fin ? 0.07 : ST.wk === 'hammer' ? 0.065 : 0.045);
    shake((fin ? 0.32 : 0.18) + Math.min(0.2, hits * 0.04) + (crits ? 0.08 : 0));
    if (crits) sfx('crit');
  }
  if (ST.powers.split) for (const k of [-1, 1]) spawnProj({ x: P.x, z: P.z, a: a + k * 0.3, spd: 14, owner: 'p', size: 0.2, col: 0x9fe8ff, pierce: 1, mult: 0.5, life: 0.7 });
}
// ================= elements and combos =================
// Each biome's foes shrug off some elements and fear others; status effects combine.
let hitElem = null; // set around a skill's damage (see withElem)
const withElem = (el, fn) => { const p = hitElem; hitElem = el; try { return fn(); } finally { hitElem = p; } };
const RES = {
  crypt: { fire: 1.25, cold: 0.75 }, fungal: { fire: 1.3, shock: 0.8 }, magma: { fire: 0.5, cold: 1.3 }, frost: { cold: 0.5, fire: 1.3 },
  void: { arcane: 0.6, phys: 1.2 }, drowned: { fire: 0.7, shock: 1.4 }, clock: { phys: 0.75, shock: 1.4 }, blood: { fire: 1.35, arcane: 0.8 },
  shore: { cold: 0.6, arcane: 1.35 }, gilded: { phys: 0.75, fire: 1.3 },
};
const ELEM_N = { phys: 'physical', fire: 'fire', cold: 'cold', shock: 'lightning', arcane: 'arcane' };
const elemOf = (kind) => hitElem || (kind === 'burn' ? 'fire' : ST && ST.wk === 'staff' ? 'arcane' : 'phys');
const resOf = (el) => (RUN && RES[biomeOf(RUN.depth).id] && RES[biomeOf(RUN.depth).id][el]) || 1;
function chillEnemy(e, t) { // chilling a chilled foe freezes it solid
  if (e.dead) return;
  if (e.chillT > 0 && !e.boss && !(e.frozenT > 0)) { e.frozenT = e.leader ? 0.8 : 1.5; e.chillT = 0; floatNum(e.x, e.h * e.scale + 0.7, e.z, 'Frozen', 'xp'); burst(e.x, e.h * e.scale * 0.6, e.z, 0xbfe8ff, 10, 2, 0.14); if (!e.rim0) e.rim0 = e.u.uRim.value.clone(); e.u.uRim.value.setRGB(0.3, 0.6, 1.0); }
  else if (!(e.frozenT > 0)) e.chillT = Math.max(e.chillT, t);
}
function comboBurst(e, r, col, mult, el) {
  ringFx(e.x, e.z, 0.3, r, 0.3, col, 2.4); burst(e.x, 0.8, e.z, col, 16, 6, 0.16);
  withElem(el, () => { for (const o of enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.z - e.z) < r + o.r) damageEnemy(o, ST.dmg * mult, false, 2, o.x - e.x, o.z - e.z, false, 'combo'); });
}
function damageEnemy(e, d, crit, kb, nx, nz, proc, kind) {
  if (e.dead) return;
  wake(e);
  let m = 1 - e.arm;
  const el = elemOf(kind), rm = resOf(el); m *= rm;
  if (rm !== 1 && kind !== 'burn' && !e.resShown) { e.resShown = 1; floatNum(e.x, e.h * e.scale + 0.9, e.z, rm > 1 ? `Weak to ${ELEM_N[el]}` : `Resists ${ELEM_N[el]}`, rm > 1 ? 'crit' : 'xp'); }
  let combo = null;
  if (kind !== 'burn' && kind !== 'combo') {
    if (e.frozenT > 0 && (crit || kb >= 4.5)) { m *= 2; combo = ['Shatter', 0xbfe8ff, 'cold', 2.4, 0.5]; e.frozenT = 0; }
    else if (el === 'fire' && e.chillT > 0) { m *= 1.5; combo = ['Thermal shock', 0xffc8a0, 'fire', 0, 0]; e.chillT = 0; }
    else if (el === 'shock' && e.burnT > 0) { combo = ['Overload', 0x9fd8ff, 'shock', 2.6, 0.6]; e.burnT = 0; }
  }
  if (e.auraOn === 'ward') m *= 0.6;
  if (e.wardT > 0) m *= 0.5;
  d *= m;
  e.hp -= d; e.flashT = 0.1; e.hitT = 0.16;
  if (nx || nz) { e.lastNx = nx; e.lastNz = nz; }
  // heavy blows and crits stagger ordinary foes out of a wind-up
  if (proc && e.wind > 0 && !e.boss && !e.leader && (crit || kb >= 4.5)) { e.wind = 0; e.cd = Math.max(e.cd, 0.6); floatNum(e.x, e.h * e.scale + 0.6, e.z, 'Staggered', 'xp'); }
  floatNum(e.x, e.h * e.scale + 0.2, e.z, fmt(Math.max(1, d)), crit ? 'crit' : kind === 'burn' ? 'xp' : '');
  if (combo) { floatNum(e.x, e.h * e.scale + 1.1, e.z, combo[0] + '!', 'crit'); sfx('crit'); addHitStop(0.05); novaFx(e.x, e.z, 2.2, 0.4, combo[2] === 'cold' ? 'frost' : combo[2], combo[1]); if (combo[2] === 'cold') iceFx(e.x, e.z, 1.2, 6); if (combo[3]) comboBurst(e, combo[3], combo[1], combo[4], combo[2]); else burst(e.x, 0.9, e.z, combo[1], 12, 4, 0.14); stat('combos'); }
  if (kb && !e.boss && e.ai !== 'totem') { const k = kb * (e.arch === 'brute' || e.arch === 'warden' ? 0.4 : 1) * (e.leader ? 0.5 : 1); e.kx += nx * k * 2.2; e.kz += nz * k * 2.2; }
  ensureBar(e);
  if (proc) {
    burst(e.x, 0.9, e.z, e.color, 4, 3, 0.1);
    sfx('hit');
    if (ST.ls > 0) healPlayer(d * ST.ls / 100, true);
    if (Math.random() * 100 < ST.burn) { e.burnT = 3; e.burnD = ST.dmg * 0.3 * ST.burnM; }
    if (Math.random() * 100 < ST.chill) chillEnemy(e, 2.5);
    if (ST.powers.chain && chance(0.3)) withElem('shock', () => chainLightning(e, d * 0.6));
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
  if (e.exploded) disposeEnemy(e); else addCorpse(e);
  if (e === lockT) updLock();
  addHitStop(e.boss ? 0.4 : e.leader ? 0.12 : 0.05); shake(e.boss ? 0.9 : e.leader ? 0.35 : 0.08);
  sfx(e.boss || e.leader ? 'bigkill' : 'kill');
  questEvent('kill', e);
  gainXP(e.xp);
  S.kills++; if (RUN) RUN.kills = (RUN.kills || 0) + 1;
  if (!e.boss && !e.leader) { const bn = e.champ ? e.name.split(' ').slice(e.aff.length).join(' ') : e.name; S.bestiary[bn] = (S.bestiary[bn] || 0) + 1; }
  else S.bestiary[e.name] = (S.bestiary[e.name] || 0) + 1;
  if (e.leader) stat('leaders'); if (e.champ) stat('champs');
  if (tal('rage') || tal('reaper')) for (let i = 0; i < 3; i++) skillCd[i] = Math.max(0, skillCd[i] - 0.3 * tal('rage') - 0.2 * tal('reaper'));
  if (S.cls === 'necro') { healPlayer(ST.maxHp * 0.02); if (!e.boss) addRemains(e); }
  if (Math.random() * 100 < 10 * tal('volatile') && !e.boss) { ringFx(e.x, e.z, 0.4, 2.6, 0.25, 0xb08cff, 2.4); for (const o of enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.z - e.z) < 2.6 + o.r) damageEnemy(o, ST.dmg * 0.6 * ST.skillM, false, 3, (o.x - e.x), (o.z - e.z), false); }
  if (pet) pet.kills++;
  if (e.riftGuard) riftComplete(e);
  else if (riftMod('volatile') && !e.boss) telegraph(e.x, e.z, 1.8, 0.7, e.dmg * 1.1, { col: 0xb07aff });
  if (!noLoot || e.explode) { dropLoot(e); seasonDrop(e); }
  if (e.mimic) { for (let k = 0; k < 3; k++) spawnDrop(e.x + rand(-0.5, 0.5), e.z + rand(-0.5, 0.5), { item: lootItem(RUN.depth + 2, { mf: ST.mf + 150, min: 2 }) }); spawnDrop(e.x, e.z, { gold: Math.round(randi(60, 90) * Math.pow(1.09, RUN.depth)) }); }
  if (e.split) for (let k = 0; k < 2; k++) { const s = spawnEnemy('skitter', e.x + rand(-0.6, 0.6), e.z + rand(-0.6, 0.6)); s.awake = true; s.xp *= 0.3; }
  if (e.explode && !e.ai.startsWith('bomb')) { telegraph(e.x, e.z, 2.2, 0.6, e.dmg * 0.9, { col: 0xffb02a }); }
  if (ST.powers.nova) { telegraph(e.x, e.z, 3, 0.25, ST.dmg * 0.7, { player: true, col: 0xff8a2a }); }
  if (ST.powers.vamp) healPlayer(ST.maxHp * 0.03);
  if (e.leader) { toast(`Leader slain: ${e.name}`, 'var(--r4)'); for (const o of enemies) if (o.lead === e) o.lead = null; }
  if (e.boss) bossDefeated(e);
}
// a roll that slips a blow at the last moment, or a swing that meets one, earns a reward
function perfectRoll() {
  P.perfect = true; P.nextCrit = true; slowT = Math.max(slowT, 0.4);
  for (let i = 0; i < 3; i++) skillCd[i] = Math.max(0, skillCd[i] - 1.5);
  floatNum(P.x, 2.3, P.z, 'Perfect roll', 'crit'); haptic(15); ringFx(P.x, P.z, 0.2, 2.2, 0.25, 0x9fd4ff, 2.4); sfx('blink'); stat('perfects');
}
function tryParry(src) {
  if (!src || !src.ai || !['melee', 'charger', 'leaper'].includes(src.ai) || src.boss) return false;
  if (!(P.swingT > 0) || P.swingDur - P.swingT > 0.16 || Math.hypot(src.x - P.x, src.z - P.z) > 3.2 || WEAPONS[ST.wk].ranged) return false;
  P.nextCrit = true; P.iframes = 0.2;
  src.wind = 0; src.cd = Math.max(src.cd, 1.6); src.chillT = Math.max(src.chillT, 0.8);
  const dx = src.x - P.x, dz = src.z - P.z, l = Math.hypot(dx, dz) || 1; src.kx += dx / l * 9; src.kz += dz / l * 9;
  floatNum(src.x, src.h * src.scale + 0.7, src.z, 'Parried', 'crit'); burst((src.x + P.x) / 2, 1.1, (src.z + P.z) / 2, 0xfff2c8, 14, 5, 0.12);
  addHitStop(0.08); shake(0.2); sfx('block'); stat('parries'); haptic(20);
  return true;
}
function hurtPlayer(d, src) {
  if (src && P.dodgeT > 0 && !P.perfect && LV.type === 'dungeon' && !P.dead) perfectRoll();
  if (P.iframes > 0 || P.dead || LV.type !== 'dungeon') return;
  if (tryParry(src)) return;
  if (Math.random() * 100 < ST.block) { floatNum(P.x, 2, P.z, 'Blocked', 'xp'); sfx('block'); burst(P.x + Math.sin(P.face) * 0.5, 1, P.z + Math.cos(P.face) * 0.5, 0xd8e0ff, 6, 3, 0.1); P.iframes = 0.15; return; }
  if (Math.random() * 100 < ST.evade) { floatNum(P.x, 2, P.z, 'Evaded', 'xp'); P.iframes = 0.15; return; }
  const red = ST.armor / (ST.armor + 40 + 9 * RUN.depth);
  d *= (1 - red) * (1 - ST.dr / 100) * (riftMod('glass') ? 2 : 1);
  P.hp -= d; P.hurtT = 0.2; haptic(d > ST.maxHp * 0.15 ? 60 : 22);
  shake(clamp(d / ST.maxHp * 2.2, 0.18, 0.55)); addHitStop(0.04);
  floatNum(P.x, 2, P.z, '-' + fmt(d), 'hurt');
  const v = $('#vignette'); v.classList.add('hit'); setTimeout(() => v.classList.remove('hit'), 90);
  sfx('hurt');
  if (RUN) { RUN.taken = (RUN.taken || 0) + d; if (src && src.name) RUN.lastHit = src.name; }
  if (P.hp < ST.maxHp * 0.4 && P.hp > 0) hint('potion');
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
  if (S.decor && S.decor.dummy) x *= 1.05;
  x *= seasonXP();
  if (S.level >= LVL_CAP) { gainParagon(x); return; }
  S.xp += x;
  let up = false; const from = S.level;
  while (S.level < LVL_CAP && S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; up = true; }
  if (S.level >= LVL_CAP && S.xp > 0) { const rest = S.xp; S.xp = 0; gainParagon(rest); }
  if (up) { ST = calcStats(); P.hp = ST.maxHp; sfx('level'); levelUpFx(from, S.level); }
}

// ================= loot =================
const RCOL = [0xbdb7a7, 0x74c269, 0x5c8ff2, 0xb56ff2, 0xf19a33];
function spawnDrop(x, z, data) {
  const a = rand(0, 6.28), r = rand(0.2, 1.3);
  const tx = x + Math.sin(a) * r, tz = z + Math.cos(a) * r;
  const fx = walkable(tx, tz) ? tx : x, fz = walkable(tx, tz) ? tz : z;
  const g = new THREE.Group();
  if (data.gold) { for (let k = 0; k < 3; k++) g.add(mesh(G.cyl, metal(0xe8b450, 0.25), 0.22, 0.05, 0.22, rand(-0.1, 0.1), k * 0.06, rand(-0.1, 0.1))); }
  else if (data.mat) { g.add(mesh(G.oct, mat(new THREE.Color(MATS[data.mat].c).getHex(), 1.8), 0.26, 0.34, 0.26, 0, 0.1, 0)); }
  else if (data.gem) { g.add(mesh(G.oct, mat(new THREE.Color(GEMS[gemSplit(data.gem)[0]].c).getHex(), 3), 0.22, 0.3, 0.22, 0, 0.12, 0)); }
  else if (data.potion) { g.add(mesh(G.sph, mat(0xe0473b, 2), 0.28, 0.28, 0.28, 0, 0.1, 0), mesh(G.box, mat(0x8a6a4a), 0.08, 0.12, 0.08, 0, 0.3, 0)); }
  else if (data.token) { const s = season(); g.add(mesh(G.cyl, mat(s ? s.lamp : 0xff8a2a, 2.6), 0.3, 0.06, 0.3, 0, 0.1, 0)); g.children[0].rotation.x = Math.PI / 2; }
  else if (data.item) {
    hint('loot');
    const c = data.item.set ? 0x5fd38a : RCOL[data.item.rarity];
    g.add(mesh(G.box, mat(c, 2.4), 0.3, 0.3, 0.3, 0, 0.2, 0)); g.children[0].rotation.set(0.6, 0, 0.6);
    if (data.item.rarity >= 2) { const beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); beam.scale.set(0.35, 6, 0.35); beam.position.y = 3; g.add(beam); levelDisp.push(beam.material); }
    if (data.item.rarity >= 3) sfx('rare');
  }
  g.position.set(fx, 0.3, fz);
  world.add(g);
  const D = { x: fx, z: fz, g, data, t: 0, vy: 4 };
  if (data.item) { // a name over every item on the ground; commons show only while Alt is held
    const it = data.item;
    D.lbl = addLabel(it.name, fx, 1.0, fz, `drop r${it.rarity}${it.set ? ' set' : ''}${it.anc ? ' anc' + it.anc : ''}${filtered(it) ? ' junk' : ''}`);
    D.lbl.el.dataset.r = it.set ? 'S' : 'CURELS'[it.rarity]; D.lbl.near = 13;
  }
  drops.push(D);
}
function dropLoot(e) {
  const d = RUN.depth, B = biomeOf(d), mf = ST.mf + diff().mf;
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
  for (let k = 0; k < n; k++) spawnDrop(e.x, e.z, { item: lootItem(d + (e.boss ? 1 : 0), { mf, min: e.boss ? (k === 0 ? 3 : 2) : e.leader ? 2 : 0 }) });
  if (chance(0.025 * mult)) spawnDrop(e.x, e.z, { gem: gemKey(pick(Object.keys(GEMS)), d >= 30 && chance(0.15) ? 3 : d >= 12 && chance(0.3) ? 2 : 1) });
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
    if (D.lbl) { D.lbl.x = D.x; D.lbl.z = D.z; D.lbl.y = D.g.position.y + 0.7; }
    if (D.t > 0.35 && dist < 0.8) {
      if (D.data.item && S.inv.length >= BAG_CAP && !filtered(D.data.item)) { if (!D.warned) { D.warned = 1; toast('Your bag is full. Salvage or sell something.', 'var(--bad)'); } continue; }
      pickup(D.data);
      if (D.lbl) removeLabel(D.lbl);
      world.remove(D.g); drops.splice(i, 1);
    }
  }
}
// the loot filter salvages low gear on pickup; sets and legendaries are always kept
const filtered = (it) => !it.set && it.rarity < 4 && !it.power && (S.filter === 'uncommon' ? it.rarity <= 1 : S.filter === 'common' ? it.rarity === 0 : false);
function pickup(dt) {
  if (dt.gold) { S.gold += dt.gold; RUN && (RUN.gold += dt.gold); floatNum(P.x, 1.8, P.z, '+' + dt.gold + 'g', 'crit'); sfx('coin'); }
  else if (dt.mat) { addMat(dt.mat, dt.n); toast(`+${dt.n} ${MATS[dt.mat].n}`, MATS[dt.mat].c); sfx('coin'); questEvent('mat', dt.mat, dt.n); }
  else if (dt.gem) { hint('gem'); S.gems[dt.gem] = (S.gems[dt.gem] || 0) + 1; toast(`+1 ${gemName(dt.gem)}`, GEMS[gemSplit(dt.gem)[0]].c); sfx('coin'); }
  else if (dt.token) { S.tokens = (S.tokens || 0) + dt.token; const s = season(); floatNum(P.x, 1.8, P.z, `+${dt.token} ${s ? s.token : 'token'}${dt.token > 1 ? 's' : ''}`, 'xp'); sfx('coin'); }
  else if (dt.potion) { S.potions++; toast('+1 Healing Draught', 'var(--blood-2)'); sfx('coin'); }
  else if (dt.item && filtered(dt.item)) { const n = RAR[dt.item.rarity].salv; addMat('essence', n); floatNum(P.x, 1.8, P.z, `+${n} essence`, 'xp'); sfx('coin'); }
  else if (dt.item) { S.inv.push(dt.item); toast(dt.item.name, dt.item.set ? 'var(--set)' : `var(--r${dt.item.rarity})`); sfx('coin'); if (RUN) RUN.items++; if (dt.item.set) { stat('sets'); hint('set'); } else if (dt.item.rarity === 4) stat('legs'); }
}
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
// ================= first-time hints =================
// Each fires once per hero. Touch and gamepad players get their own wording for controls.
const HINTS = {
  move: { k: 'Getting around', d: 'WASD to move, mouse to aim. Walk to the glowing gate at the south of town to begin a descent.', t: 'Left stick to move. Walk to the glowing gate at the south of town to begin a descent.', p: 'Left stick to move, right stick to aim. Walk to the glowing gate at the south of town.' },
  fight: { k: 'Fight', d: 'Click (or hold) to attack. Space rolls through danger, and you cannot be hit mid-roll.', t: 'Hold Strike to attack; it aims for you. Roll through danger.', p: 'A to attack, B to roll. You cannot be hit mid-roll.' },
  loot: { k: 'Loot', d: 'Walk over drops to pick them up. Press I to open your bag and compare gear.', t: 'Walk over drops to pick them up. The bag button shows and compares your gear.', p: 'Walk over drops to pick them up. Back opens your bag.' },
  potion: { k: 'Low health', d: 'Press Q to drink a Healing Draught (R for a Greater one).', t: 'Tap the red flask to drink a Healing Draught.', p: 'Y drinks a Healing Draught.' },
  level: { k: 'Level up', d: 'Every level gives a talent point. Press K to spend it.', t: 'Every level gives a talent point. Open the bag and choose Talents.', p: 'Every level gives a talent point. Back opens your bag; Talents is the last tab.' },
  skill: { k: 'New skill', d: 'A new skill is ready on the action bar. Press its number key.', t: 'A new skill button has lit up by your thumb.', p: 'Skills are on LB, RB and LT.' },
  stairs: { k: 'Going deeper', d: 'Stairs lead down; each depth is harder and richer. Read a Portal Scroll (T) to go home with your loot.', t: 'Stairs lead down. The scroll button opens a way home.', p: 'Stairs lead down. D-pad down reads a Portal Scroll.' },
  boss: { k: 'Boss', d: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.', t: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.', p: 'Bosses warn before big attacks: red circles on the ground. Step out before they fill.' },
  home: { k: 'Back home', d: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.', t: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.', p: 'Sell spare loot at the Copper Lantern, craft at Home, and ask Elder Maren for work.' },
  gem: { k: 'Gems', d: 'Gems go into sockets at your Home, on the Workshop tab.', t: 'Gems go into sockets at your Home, on the Workshop tab.', p: 'Gems go into sockets at your Home, on the Workshop tab.' },
  set: { k: 'Set item', d: 'Set pieces (green) grant bonuses when you wear two or three of the same set.', t: 'Set pieces (green) grant bonuses when you wear two or three of the same set.', p: 'Set pieces (green) grant bonuses when you wear two or three of the same set.' },
  rift: { k: 'Rifts', d: 'Rifts are three-floor trials with modifiers. Beat the clock for shards to spend at the caravan.', t: 'Rifts are three-floor trials with modifiers. Beat the clock for shards.', p: 'Rifts are three-floor trials with modifiers. Beat the clock for shards.' },
};
let hintQ = [], hintT = 0;
function hint(id) {
  if (!S || !S.hints || S.hints[id] || SET.hints === false || !HINTS[id]) return;
  S.hints[id] = 1;
  if (!hintQ.includes(id)) hintQ.push(id);
}
function updHints(dt) {
  const el = $('#hint'); if (!el) return;
  el.classList.toggle('hold', isPaused()); // menus and panels take the stage
  if (LV && LV.type === 'dungeon' && RUN && RUN.kills >= 12) hint('stairs');
  if (hintT > 0) { if (performance.now() > hintT) { hintT = 0; el.classList.remove('on'); } return; }
  if (!hintQ.length || isPaused()) return;
  const h = HINTS[hintQ.shift()], txt = pad.on ? h.p : touchMode ? h.t : h.d;
  el.innerHTML = `<b>${esc(h.k)}</b><span>${esc(txt)}</span><button type="button" class="btn ghost sm" id="hintOk">Got it</button>`;
  el.classList.add('on'); hintT = performance.now() + 7500;
}
function dismissHint() { hintT = 1; }

// ================= level up =================
let slowT = 0; // boss-kill slow motion
function levelUpFx(from, to) {
  const unlocked = SKILLS.filter((k) => k.lvl > from && k.lvl <= to);
  const pillar = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd890).multiplyScalar(2.2), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  pillar.scale.set(1.4, 14, 1.4); pillar.position.set(P.x, 7, P.z); world.add(pillar); levelDisp.push(pillar.material);
  fxLife.push({ m: pillar, t: 1.3, T: 1.3, kind: 'pillar' });
  ringFx(P.x, P.z, 0.4, 4.5, 0.5, 0xffd890, 3); ringFx(P.x, P.z, 0.2, 2.8, 0.4, 0xfff2c8, 2.4);
  for (let k = 0; k < 3; k++) burst(P.x, 0.4 + k * 0.8, P.z, 0xf2c56b, 14, 5, 0.16);
  const gains = [`+${(to - from) * 14} health`, `${to - from} talent point${to - from > 1 ? 's' : ''}`];
  if (unlocked.length) gains.push(`new skill: ${unlocked.map((k) => k.n).join(', ')}`);
  banner(`Level ${to}`, gains.join(' · ')); haptic([30, 40, 60]);
  hint('level'); if (unlocked.length) hint('skill');
}
const fxLife = [];
function updFxLife(dt) {
  for (let i = fxLife.length - 1; i >= 0; i--) {
    const f = fxLife[i]; f.t -= dt;
    const k = clamp(f.t / f.T, 0, 1);
    if (f.kind === 'pillar') { f.m.material.opacity = 0.55 * k; f.m.scale.x = f.m.scale.z = 1.4 * (0.4 + 0.6 * k); if (f.follow) f.m.position.set(P.x, 7, P.z); }
    if (f.t <= 0) { world.remove(f.m); fxLife.splice(i, 1); }
  }
}

// ================= stat deltas for gear comparison =================
const dpsOf = (s) => s.dmg * (1 + (Math.min(75, s.crit) / 100) * (s.critd / 100)) * (1 + s.aspd / 100) / WEAPONS[s.wk].cd;
function gearDelta(it) {
  const sl = it.slot, prev = S.equip[sl];
  const a = calcStats(); S.equip[sl] = it; const b = calcStats(); S.equip[sl] = prev;
  const rows = [
    ['Damage per second', dpsOf(a), dpsOf(b), 0], ['Max health', a.maxHp, b.maxHp, 0], ['Armor', a.armor, b.armor, 0],
    ['Critical chance', a.crit, b.crit, 1, '%'], ['Critical damage', a.critd, b.critd, 0, '%'], ['Attack speed', a.aspd, b.aspd, 0, '%'],
    ['Move speed', a.move, b.move, 0, '%'], ['Life steal', a.ls, b.ls, 1, '%'], ['Health per second', a.regen, b.regen, 1],
    ['Magic find', a.mf, b.mf, 0, '%'], ['Gold found', a.gold, b.gold, 0, '%'],
  ];
  const out = rows.filter((r) => Math.abs(r[2] - r[1]) > (r[3] ? 0.05 : 0.5)).map(([n, x, y, dp, u]) => {
    const d = y - x, up = d > 0;
    return `<li class="${up ? 'up' : 'dn'}"><span>${n}</span><b>${up ? '▲' : '▼'} ${up ? '+' : '−'}${dp ? Math.abs(d).toFixed(1) : fmt(Math.abs(d))}${u || ''}</b></li>`;
  });
  return out.length ? `<div class="delta"><div class="hint">If you equip this</div><ul>${out.join('')}</ul></div>` : '<div class="delta"><div class="hint">If you equip this: no change to your stats.</div></div>';
}

// ================= boss dressing =================
// Every biome's boss gets its own silhouette on top of its base body: crowns, horns, halos, gears, tentacles.
function bossDress(g, id, h) {
  const add = (geo, m, sx, sy, sz, x, y, z, rot) => { const q = mesh(geo, m, sx, sy, sz, x, y, z); if (rot) q.rotation.set(rot[0], rot[1], rot[2]); g.add(q); return q; };
  const orbit = (n, r, y, make, spin) => { const o = new THREE.Group(); o.position.y = y; o.userData.spin = spin || 0.8; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, p = make(k); p.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); o.add(p); } g.add(o); spinners.push(o); return o; };
  const glow = (c, i) => mat(c, i || 2.6);
  switch (id) {
    case 'crypt': {
      const bone = mat(0xe8e0c8), dark = mat(0x1a1420);
      add(G.box, mat(0x3a2448), 0.9, 1.1, 0.06, 0, h * 0.62, -0.32, [0.12, 0, 0]);
      for (let k = 0; k < 5; k++) add(G.cone4, glow(0xf2d07a, 2.2), 0.08, 0.3, 0.08, (k - 2) * 0.11, h + 0.2, 0.02);
      orbit(3, 0.95, h * 0.75, () => { const s = new THREE.Group(); s.add(mesh(G.sph, bone, 0.2, 0.2, 0.2, 0, 0, 0), mesh(G.box, dark, 0.05, 0.05, 0.03, -0.05, 0.02, 0.09), mesh(G.box, dark, 0.05, 0.05, 0.03, 0.05, 0.02, 0.09)); return s; }, 0.9);
      break;
    }
    case 'fungal': {
      add(G.sph, mat(0xc0402e), 1.15, 0.5, 1.15, 0, h + 0.18, 0);
      for (let k = 0; k < 7; k++) { const a = k * 0.9; add(G.sph, mat(0xf4ecd8), 0.13, 0.08, 0.13, Math.sin(a) * 0.38, h + 0.36, Math.cos(a) * 0.38); }
      for (const s of [-1, 1]) add(G.sph, glow(0x9aff6a, 2.4), 0.26, 0.26, 0.26, s * 0.42, h * 0.72, -0.05);
      break;
    }
    case 'magma': {
      const horn = mat(0x2a1a14);
      for (const s of [-1, 1]) { add(G.cone4, horn, 0.12, 0.55, 0.12, s * 0.22, h + 0.12, 0.02, [0.3, 0, -s * 0.7]); add(G.cone4, horn, 0.08, 0.3, 0.08, s * 0.42, h + 0.38, 0.1, [0.9, 0, -s * 0.2]); }
      for (let k = 0; k < 4; k++) add(G.box, glow(0xff7a2a, 3.2), 0.05, 0.3, 0.02, (k - 1.5) * 0.14, h * 0.55, 0.3, [0, 0, (k - 1.5) * 0.4]);
      orbit(4, 1.0, h * 0.5, () => mesh(G.ico, glow(0xff8a3a, 2.8), 0.14, 0.14, 0.14, 0, 0, 0), 1.4);
      break;
    }
    case 'frost': {
      const ice = glow(0x9fd8ff, 1.8);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; add(G.oct, ice, 0.09, 0.42 + (k % 2) * 0.2, 0.09, Math.sin(a) * 0.22, h + 0.24, Math.cos(a) * 0.22); }
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(G.oct, ice, 0.1, 0.32, 0.1, s * (0.42 + k * 0.06), h * 0.82 + k * 0.08, -0.02 + (k - 1) * 0.1, [0, 0, -s * 0.5]);
      break;
    }
    case 'void': {
      const halo = orbit(1, 0, h + 0.35, () => { const t = mesh(G.fullTorus, glow(0xc08cff, 3), 0.55, 0.55, 0.55, 0, 0, 0); t.rotation.x = Math.PI / 2; return t; }, 0.5);
      halo.rotation.x = 0.25;
      add(G.sph, glow(0xffe0ff, 3.4), 0.3, 0.3, 0.16, 0, h * 0.62, 0.3);
      orbit(5, 1.1, h * 0.4, () => mesh(G.oct, glow(0x8a5aff, 2.6), 0.1, 0.22, 0.1, 0, 0, 0), -0.7);
      break;
    }
    case 'drowned': {
      const flesh = mat(0x3a8a8a);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(G.cone4, flesh, 0.14, 0.7, 0.14, Math.sin(a) * 0.4, 0.22, Math.cos(a) * 0.4, [Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1]); }
      for (let k = 0; k < 5; k++) add(G.cyl, mat(0xff8a8a), 0.06, 0.32 + (k % 2) * 0.16, 0.06, (k - 2) * 0.12, h + 0.18, 0, [0, 0, (k - 2) * 0.25]);
      orbit(6, 1.05, 0.5, () => mesh(G.sph, glow(0x9affe8, 2.2), 0.08, 0.08, 0.08, 0, 0, 0), 0.6);
      break;
    }
    case 'clock': {
      const brass = metal(0xd0a050, 0.35);
      // a gear spins about its own axle: the holder turns the axle to point backwards, the gear turns about it
      for (const [x, y, r, sp] of [[-0.25, h * 0.75, 0.32, 1.2], [0.28, h * 0.62, 0.22, -1.7]]) {
        const p = new THREE.Group(); p.position.set(x, y, -0.36); p.rotation.x = Math.PI / 2; g.add(p);
        const gg = new THREE.Group(); gg.userData.spin = sp; p.add(gg); spinners.push(gg);
        gg.add(mesh(G.cyl, brass, r * 2, 0.08, r * 2, 0, 0, 0));
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const t = mesh(G.box, brass, 0.1, 0.08, 0.12, Math.sin(a) * r, 0, Math.cos(a) * r); t.rotation.y = a; gg.add(t); }
      }
      for (const s of [-1, 1]) add(G.cyl, metal(0x5a4a3a, 0.4), 0.12, 0.5, 0.12, s * 0.2, h + 0.15, -0.18);
      add(G.sph, glow(0x7af0ff, 3), 0.24, 0.24, 0.24, 0, h * 0.6, 0.3);
      break;
    }
    case 'shore': { // a pale moon-disc halo and trailing tide-lights
      const halo = orbit(1, 0, h + 0.4, () => { const t = mesh(G.fullTorus, glow(0xcfe4ff, 2.6), 0.6, 0.6, 0.6, 0, 0, 0); return t; }, 0.25);
      halo.position.z = -0.25;
      add(G.cyl, glow(0xe8f2ff, 3.2), 0.9, 0.04, 0.9, 0, h + 0.4, -0.3, [Math.PI / 2, 0, 0]);
      orbit(7, 1.15, h * 0.35, () => mesh(G.sph, glow(0x7ab8ff, 2.4), 0.09, 0.09, 0.09, 0, 0, 0), -0.5);
      for (let k = 0; k < 4; k++) add(G.cone4, mat(0x2a3a5a), 0.08, 0.6, 0.08, (k - 1.5) * 0.18, h * 0.3, -0.3, [0.5, 0, (k - 1.5) * 0.2]);
      break;
    }
    case 'gilded': { // a tall crown, a sun disc behind the head, and orbiting relics
      const gold = metal(0xf0c850, 0.3);
      add(G.cyl, gold, 0.5, 0.18, 0.5, 0, h + 0.1, 0);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; add(G.cone4, gold, 0.07, 0.34, 0.07, Math.sin(a) * 0.22, h + 0.32, Math.cos(a) * 0.22); }
      add(G.cyl, glow(0xffd860, 2.8), 1.3, 0.04, 1.3, 0, h * 0.85, -0.4, [Math.PI / 2, 0, 0]);
      orbit(4, 1.0, h * 0.55, () => mesh(G.box, gold, 0.16, 0.22, 0.08, 0, 0, 0), 0.7);
      add(G.sph, glow(0xfff2c0, 3), 0.2, 0.2, 0.2, 0, h * 0.6, 0.3);
      break;
    }
    case 'blood': {
      const bark = mat(0x8a6248);
      for (const s of [-1, 1]) { add(G.box, bark, 0.12, 1.0, 0.12, s * 0.3, h + 0.4, 0, [0, 0, -s * 0.45]); add(G.box, bark, 0.09, 0.55, 0.09, s * 0.7, h + 0.75, 0.05, [0.4, 0, -s * 1.1]); add(G.box, bark, 0.09, 0.5, 0.09, s * 0.52, h + 1.0, -0.05, [-0.3, 0, -s * 0.1]); add(G.box, bark, 0.07, 0.4, 0.07, s * 0.2, h + 0.95, 0.05, [0, 0, s * 0.5]); }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; add(G.cone4, mat(0x2a1a14), 0.05, 0.22, 0.05, Math.sin(a) * 0.24, h + 0.08, Math.cos(a) * 0.24, [Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6]); }
      add(G.sph, glow(0xff3a5a, 3.2), 0.26, 0.3, 0.2, 0, h * 0.62, 0.28);
      break;
    }
    default: for (let k = 0; k < 7; k++) add(G.cone4, mat(0xf2c56b, 2.5), 0.1, 0.36, 0.1, Math.sin(k * 0.9) * 0.24, h + 0.16, Math.cos(k * 0.9) * 0.24);
  }
}

// ================= boss intro card and level loading tips =================
const BOSS_EPI = { crypt: 'Keeper of the bone-halls', fungal: 'The rot that thinks', magma: 'Heart of the deep forge', frost: 'Who wears the winter', void: 'The space between', drowned: 'Lord of the sunken stair', clock: 'Measure of all hours', blood: 'The red tithe', shore: 'Light that drowned', gilded: 'Last of the old kings' };
let bossIntroId = 0;
function bossIntro(e) {
  const B = biomeOf(RUN.depth), el = $('#bossIntro'), id = ++bossIntroId;
  $('#biEpi').textContent = /Hollow King/.test(e.name) ? 'The crown beneath the world' : BOSS_EPI[B.id] || B.name;
  $('#biName').textContent = e.name;
  $('#biWhere').textContent = `${B.name} · depth ${RUN.depth}`;
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  setTimeout(() => { if (id === bossIntroId) { el.classList.add('out'); setTimeout(() => { if (id === bossIntroId) el.hidden = true; }, 600); } }, 2800);
}
const TIPS = [
  'Roll through an attack at the last moment for a perfect roll: your next hit is a guaranteed crit.',
  'Chill a chilled foe to freeze it solid, then hit it hard to shatter it.',
  'Fire on a chilled foe causes thermal shock for 50% more damage.',
  'Hold Alt to see the names of common items on the ground.',
  'The loot filter in Settings turns low items into Arcane Essence as you pick them up.',
  'Loadouts in your Bag swap gear and talents in one press.',
  'An Artificer’s Table lets you extract a legendary power and imprint it onto rare or epic gear.',
  'Every fifth floor is a boss. Beat it to open a waypoint.',
  'Champions glow and hit harder, but drop better loot.',
  'Leaders carry an aura that empowers foes near them. Kill them first.',
  'Each biome resists some elements and fears others. Watch the numbers.',
  'Portal Scrolls take you home from any depth, and back again.',
  'Your home stash keeps gear safe between heroes in the same slot.',
  'Rifts scale with your best clear. Share a rift code to race a friend on the same layout.',
  'Reduce motion, colour-safe palettes and bigger text are under Settings, Accessibility.',
];
let loadShown = false;
function loadingTick() {
  const want = !levelReady && !!LV;
  if (want === loadShown) return;
  loadShown = want; $('#loading').hidden = !want;
  if (want) $('#ldTip').textContent = pick(TIPS);
}
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
// ================= level loading =================
let spinners = [];
function placePlayerMesh() {
  if (P.mesh && P.look !== gearLook()) { scene.remove(P.mesh); P.mesh.traverse((o) => { if (o.material && o.material.dispose) o.material.dispose(); }); P.mesh = null; P.wkind = null; }
  if (!P.mesh) { P.look = gearLook(); const h = makeHero(); P.mesh = h.g; P.hand = h.hand; P.shoulder = h.shoulder; P.u = h.u; scene.add(P.mesh); }
  if (P.wkind !== ST.wk) {
    if (P.weapon) P.hand.remove(P.weapon);
    P.weapon = weaponMesh(ST.wk); P.hand.add(P.weapon); P.wkind = ST.wk;
  }
  P.mesh.position.set(P.x, 0, P.z);
}
function setTownLights() {
  // golden hour: a low warm sun throws long shadows; the sky dome and a gradient environment fill the rest
  scene.background = new THREE.Color(0xe2c8a0); scene.fog = new THREE.Fog(0xe2c8a0, SET.cam === 'top' ? 40 : 30, SET.cam === 'top' ? 95 : 150);
  if (!sky.parent) scene.add(sky);
  hemi.intensity = 1.1; hemi.color.setHex(0xb8d0f0); hemi.groundColor.setHex(0x6a5a3a);
  sun.intensity = 3.4; sun.color.setHex(0xffd2a0); torch.intensity = 0;
  for (const l of torchPool) l.intensity = 0;
  setAmbient('town');
  sun.castShadow = Q.sunShadow > 0; torch.castShadow = false; // shadow passes only where that light matters
  Post.grade([0.9, 0.96, 1.1], [1.06, 1.0, 0.9], 1.12, 0.3, 0.75, 1.15);
}
function loadTown() {
  clearWorld(); spinners = [];
  LV = genTown(); bossRef = null; $('#bossBar').hidden = true;
  setTownLights();
  caravanHere();
  buildTownVisuals();
  world.traverse((o) => { if (o.userData && o.userData.spin) spinners.push(o); });
  addInteract({ x: 8.5, z: 11.6, r: 1.7, label: 'Your Home', ly: 5.4, verb: 'Go inside', act: () => openPanel('home') });
  addInteract({ x: 20.5, z: 10.6, r: 1.7, label: "Orla's Anvil", ly: 4.6, verb: 'Browse the forge', act: () => openPanel('smith') });
  addInteract({ x: 32.5, z: 10.6, r: 1.7, label: 'Bramble & Vial', ly: 4.6, verb: 'Browse the apothecary', act: () => openPanel('alch') });
  addInteract({ x: 34.5, z: 20.4, r: 1.7, label: 'Copper Lantern', ly: 4.6, verb: 'Trade goods', act: () => openPanel('trader') });
  addInteract({ x: 22, z: 31.4, r: 2.2, label: 'The Delve', ly: 5.2, verb: 'Descend', act: () => openPanel('delve') });
  elderLabel = addInteract({ x: 24.5, z: 18.2, r: 1.8, label: 'Elder Maren', ly: 2.4, verb: 'Talk to Elder Maren', act: () => openPanel('elder') });
  P.x = LV.start.x; P.z = LV.start.z; P.dead = false; P.kx = P.kz = 0;
  ST = calcStats(); P.hp = ST.maxHp;
  placePlayerMesh(); resetMini(); snapCamera();
  releaseLock(); setMusic('town');
  P.u.uRim.value.setRGB(0.05, 0.06, 0.08);
  spawnPet(); spawnVillagers(); spawnCaravan(); placeSeasonDecor(false); applyTimeOfDay(true);
  setTimeout(() => { if (LV && LV.type === 'town' && started && S.cls) storyOnTown(); }, 900);
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
    warmGroup.add(new THREE.Mesh(G.plane, barBgMat), new THREE.Mesh(G.plane, barFgMat), swings[0].o.clone());
    warmGroup.children.forEach((o) => { o.visible = true; o.position.set(P.x, -50, P.z); });
  }
  scene.add(warmGroup);
  const done = () => { if (id !== warmId) return; scene.remove(warmGroup); levelReady = true; };
  try { renderer.compileAsync(scene, camera).then(done, done); } catch (err) { done(); }
  setTimeout(done, 2500);
}
function populate() {
  const L = LV, d = L.depth, B = biomeOf(d);
  if (L.pit) return; // the Pit fills itself, wave by wave
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
    if (d === 40 && !story().final) spawnHollowKing(a.x + a.w / 2, a.y + 6); // the end of the story
    else spawnEnemy('grunt', a.x + a.w / 2, a.y + 6, { boss: true });
    const ante = L.rooms[1];
    for (let k = 0; k < 3 + Math.floor(d / 10); k++) { const [x, z] = spot(ante); spawnEnemy(wpick(pool), x, z, { champ: k === 0 }); }
    addChest(...spot(ante, 1.5));
  } else {
    const vault = L.rooms.length > 4 ? L.rooms[randi(1, L.rooms.length - 1)] : null;
    for (const r of L.rooms.slice(1)) {
      const area = r.w * r.h;
      let n = Math.min(area > 60 ? 9 : 7, randi(2, 4) + Math.floor(d / 5) + (area > 60 ? 2 : 0)); // deep floors get tougher foes, not endless crowds
      if (riftMod('horde')) n = Math.round(n * 1.4);
      let lead = null;
      if (d >= 2 && chance(Math.min(0.38, 0.14 + d * 0.012))) {
        const [x, z] = spot(r, 2);
        lead = spawnEnemy(pick(['grunt', 'brute', 'caster', 'warden'].filter((k) => d >= ARCH[k].from)), x, z, { leader: true });
        n += 2;
      }
      for (let k = 0; k < n; k++) { const [x, z] = spot(r); const e = spawnEnemy(wpick(pool), x, z, { champ: chance((0.05 + d * 0.004) * (riftMod('elite') ? 3 : 1)) }); if (lead) e.lead = lead; }
      if (chance(0.22) || r === vault) addChest(...spot(r, 1.5));
      if (r === vault) addChest(...spot(r, 1.5));
      if (r.theme === 'vault') { const m = randi(0, 2); r.chests.forEach(([x, z], k) => (k === m && d >= 3 ? addMimic(x, z) : addChest(x, z))); }
      if (r.theme === 'grove') addSpring(...r.spring);
      const nn = randi(0, 2);
      for (let k = 0; k < nn; k++) addNode(...spot(r, 1), pick(['iron', 'iron', 'herb', B.mats[0], B.mats[1]]));
    }
    const er = L.exitRoom;
    if (RUN.rift && RUN.rift.floor >= RIFT_FLOORS) { riftStairs(er.x + er.w / 2, er.y + er.h / 2); riftGuardian(er); }
    else addStairs(er.x + er.w / 2, er.y + er.h / 2);
    placeSpecialRooms(vault);
    placeTraps();
    maybePlacePage(L.rooms);
    // shrines and altars claim tiles after the foes are placed: nudge anyone left standing inside one (found by the autoplay bot)
    for (const e of enemies) {
      if (walkable(e.x, e.z)) continue;
      search: for (let r = 1; r <= 4; r++) for (let a = 0; a < 8; a++) { const x = e.x + Math.sin(a * 0.785) * r * 0.7, z = e.z + Math.cos(a * 0.785) * r * 0.7; if (walkable(x, z)) { e.x = x; e.z = z; e.mesh.position.set(x, 0, z); break search; } }
    }
  }
  if (d % 5 === 1 && !RUN.rift) addPortalHome(L.start.x + 2.2, L.start.z);
  // starting room gets a herb or ore sometimes
  if (chance(0.5)) addNode(L.start.x - 2, L.start.z + 1.5, 'herb');
}
function loadDungeon(depth) {
  clearWorld(); spinners = [];
  bossRef = null; $('#bossBar').hidden = true;
  LV = RUN.mode === 'arena' ? genArena(depth) : seededLevel(() => genDungeon(depth)); RUN.depth = depth; RUN.phoenixUsed = false; RUN.shrine = null; RUN.ambush = null;
  releaseLock();
  S.best = Math.max(S.best, depth);
  const B = biomeOf(depth);
  scene.background = new THREE.Color(B.fog); scene.fog = new THREE.Fog(B.fog, 17, 36);
  hemi.intensity = 2.1; hemi.color.setHex(B.amb); hemi.groundColor.setHex(0x14141c);
  torch.color.setHex(B.torch); torch.intensity = 30; torch.distance = 22;
  if (sky.parent) scene.remove(sky);
  sun.castShadow = false; torch.castShadow = Q.torchShadow && SET.cam !== 'top';
  hemi.intensity = 2.4; sun.intensity = 0.7; sun.color.setHex(B.amb);
  setAmbient(B.id);
  Post.grade([0.88, 0.94, 1.12], [1.08, 1.0, 0.9], 1.06, 0.5, 1.0, 0.9);
  buildDungeonVisuals();
  P.x = LV.start.x; P.z = LV.start.z; P.kx = P.kz = 0;
  seededLevel(() => populate());
  lightForView(); setMusic('dng:' + B.id); questEvent('depth', depth);
  P.u.uRim.value.set(B.torch).multiplyScalar(0.12);
  const before = ST ? ST.maxHp : 0;
  ST = calcStats();
  if (RUN.fresh) { P.hp = ST.maxHp; RUN.fresh = false; } else P.hp = Math.min(ST.maxHp, P.hp + (ST.maxHp - before > 0 ? ST.maxHp - before : 0));
  placePlayerMesh(); resetMini(); snapCamera(); spawnPet();
  flow = null; flowTile = -1; computeFlow();
  warmLevel();
  banner(`Depth ${depth}`, B.name + (cycleOf(depth) ? ` · Cycle ${cycleOf(depth) + 1}` : ''));
  save();
}
function addChest(x, z, rich) {
  const g = new THREE.Group();
  const W = worldMats();
  g.add(mesh(G.box, W.door, 0.95, 0.5, 0.62, 0, 0.25, 0));
  for (const s of [-1, 1]) g.add(mesh(G.box, W.gold, 0.08, 0.52, 0.66, s * 0.3, 0.26, 0));
  g.add(mesh(G.box, mat(0xffc24a, 3), 0.86, 0.04, 0.5, 0, 0.5, 0));
  const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.31);
  { const top = mesh(G.cyl, W.door, 0.3, 0.95, 0.31, 0, 0.02, 0.31); top.rotation.z = Math.PI / 2; top.scale.set(0.62, 0.95, 0.62); lid.add(top); }
  for (const s of [-1, 1]) { const b = mesh(G.cyl, W.gold, 0.66, 0.08, 0.66, s * 0.3, 0.02, 0.31); b.rotation.z = Math.PI / 2; b.scale.set(0.64, 0.08, 0.64); lid.add(b); }
  lid.add(mesh(G.box, W.gold, 0.16, 0.18, 0.06, 0, -0.05, 0.63));
  g.add(lid);
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(x, 0, z); g.rotation.y = rand(-0.4, 0.4); world.add(g);
  if (rich) { g.scale.setScalar(1.25); g.add(makeFlames([{ x: -0.55, y: 0.6, z: 0.3 }, { x: 0.55, y: 0.6, z: 0.3 }])); }
  addInteract({ x, z, r: 1.4, kind: 'chest', g, verb: rich ? 'Open the altar hoard' : 'Open chest', act(o) {
    lid.rotation.x = -1.9; o.dead = true; sfx('chest');
    const d = RUN.depth, mf = ST.mf;
    spawnDrop(x, z, { gold: Math.round(randi(8, 18) * Math.pow(1.09, d) * (1 + ST.gold / 100)) });
    const n = randi(1, 2);
    for (let k = 0; k < n + (rich ? 1 : 0); k++) spawnDrop(x, z, { item: lootItem(d + (rich ? 1 : 0), { mf: mf + (rich ? 120 : 30), min: rich ? 2 : chance(0.35) ? 1 : 0 }) });
    if (rich) { spawnDrop(x, z, { gold: Math.round(randi(30, 50) * Math.pow(1.09, d)) }); spawnDrop(x, z, { mat: 'essence', n: randi(2, 4) }); }
    spawnDrop(x, z, { mat: pick(biomeOf(d).mats), n: randi(1, 3) });
    if (chance(0.4)) spawnDrop(x, z, { mat: pick(['iron', 'herb', 'essence']), n: randi(1, 2) });
    if (chance(0.3)) spawnDrop(x, z, { potion: 1 });
    if (chance(rich ? 0.6 : 0.12)) spawnDrop(x, z, { gem: gemKey(pick(Object.keys(GEMS)), d >= 30 && chance(0.2) ? 3 : d >= 12 && chance(0.35) ? 2 : 1) });
    burst(x, 0.8, z, 0xf2c56b, 16, 4, 0.12);
  } });
}
function addNode(x, z, kind) {
  const g = new THREE.Group();
  const c = new THREE.Color(MATS[kind].c).getHex();
  if (kind === 'herb') for (let k = 0; k < 7; k++) { const l = mesh(G.cone, mat(c), 0.16, rand(0.45, 0.8), 0.06, rand(-0.25, 0.25), 0.25, rand(-0.25, 0.25)); l.rotation.set(rand(-0.4, 0.4), rand(0, 6), rand(-0.4, 0.4)); g.add(l); }
  else {
    g.add(mesh(G.dodec, mat(0x55525c), 1.0, 0.55, 0.85, 0, 0.18, 0));
    for (let k = 0; k < 4; k++) { const o = mesh(G.oct, kind === 'iron' ? metal(0x9aa0aa, 0.35) : mat(c, 2.6), 0.24, rand(0.4, 0.62), 0.24, rand(-0.3, 0.3), 0.42, rand(-0.25, 0.25)); o.rotation.set(rand(-0.4, 0.4), rand(0, 6), rand(-0.5, 0.5)); g.add(o); }
  }
  g.traverse((o) => { o.castShadow = true; });
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.3, kind: 'node', mat: kind, verb: `Gather ${MATS[kind].n}`, act(o) {
    o.dead = true; world.remove(g); sfx('coin');
    spawnDrop(x, z, { mat: kind, n: kind === 'iron' ? randi(2, 4) : kind === 'herb' ? randi(2, 3) : randi(1, 2) });
    burst(x, 0.5, z, c, 12, 3, 0.1);
  } });
}
function addStairs(x, z) {
  const g = new THREE.Group();
  const W = worldMats();
  g.add(mesh(G.box, mat(0x020203, 1), 2.0, 0.03, 2.0, 0, 0.015, 0));
  for (let k = 0; k < 4; k++) g.add(mesh(G.box, W.stone, 1.7, 0.06, 0.34, 0, 0.03 - k * 0.001, -0.7 + k * 0.42));
  for (const [sx, sz, w, d] of [[0, -1.08, 2.4, 0.18], [0, 1.08, 2.4, 0.18], [-1.08, 0, 0.18, 2.4], [1.08, 0, 0.18, 2.4]]) g.add(mesh(G.box, W.stone, w, 0.22, d, sx, 0.11, sz));
  const ring = mesh(G.ring, mat(0x7fdf6a, 3), 1.45, 1, 1.45, 0, 0.24, 0); g.add(ring);
  g.add(makeFlames([{ x: -1.08, y: 0.25, z: -1.08 }, { x: 1.08, y: 0.25, z: -1.08 }, { x: -1.08, y: 0.25, z: 1.08 }, { x: 1.08, y: 0.25, z: 1.08 }]));
  g.position.set(x, 0, z); world.add(g);
  addInteract({ x, z, r: 1.6, kind: 'stairs', label: 'Stairs down', ly: 2.2, cls: '', verb: `Descend to depth ${RUN.depth + 1}`, act: () => nextFloor() });
}
function addPortalHome(x, z) {
  if (!walkable(x, z)) { x = LV.start.x; z = LV.start.z + 1.5; }
  const g = new THREE.Group(), W = worldMats();
  g.add(mesh(G.fullTorus, mat(0x6ab0ff, 3.4), 0.92, 1.25, 0.92, 0, 1.32, 0));
  const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(0.88, 1.2, 1); disc.position.y = 1.32; g.add(disc);
  for (const s of [-1, 1]) g.add(mesh(G.box, W.stone, 0.34, 0.5, 0.34, s * 0.95, 0.25, 0));
  g.add(makeFlames([{ x: -0.95, y: 0.55, z: 0 }, { x: 0.95, y: 0.55, z: 0 }], portalFlameMat()));
  g.position.set(x, 0, z); world.add(g); facers.push(g);
  addInteract({ x, z, r: 1.6, kind: 'portal', label: 'Way home', ly: 3, cls: '', verb: 'Return to Hearthdeep', act: () => returnToTown(false) });
}
function nextFloor() {
  const d = RUN.depth + 1;
  if (RUN.rift) RUN.rift.floor++;
  RUN.floors++; S.stats.longest = Math.max(S.stats.longest || 0, RUN.floors);
  loadDungeon(d);
}
function bossDefeated(e) {
  storyBossSlain(e);
  setMusic('dng:' + biomeOf(RUN.depth).id); questEvent('boss', RUN.depth);
  S.bossKills++; S.slain.push({ n: e.name, c: e.color });
  const wp = RUN.depth + 1;
  if (!S.waypoints.includes(wp)) S.waypoints.push(wp);
  S.waypoints.sort((a, b) => a - b);
  bossRef = null; $('#bossBar').hidden = true;
  banner(`${e.name} falls`, `Waypoint opened at depth ${wp}`);
  slowT = calm() ? 0 : 1.2; shake(0.7); haptic([60, 40, 120]);
  const pil = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c0).multiplyScalar(2.4), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  pil.scale.set(2.4, 18, 2.4); pil.position.set(e.x, 9, e.z); world.add(pil); levelDisp.push(pil.material); fxLife.push({ m: pil, t: 2.4, T: 2.4, kind: 'pillar' });
  for (let k = 0; k < 4; k++) setTimeout(() => ringFx(e.x, e.z, 0.5, 6 + k * 2, 0.6, k % 2 ? 0xffd890 : 0xfff2c8, 3), k * 160);
  sfx('level');
  const a = LV.arena;
  addStairs(a.x + a.w / 2 + 2.5, a.y + a.h / 2);
  addPortalHome(a.x + a.w / 2 - 2.5, a.y + a.h / 2);
  for (const q of enemies) if (q.owner === e && !q.dead) killEnemy(q, true);
  ST = calcStats();
  save();
}
function startDelve(depth, elix, mode) {
  RUN = { depth, start: depth, buffs: {}, rested: S.rested, phoenixUsed: false, gold: 0, items: 0, floors: 1, fresh: true, t0: performance.now(), kills: 0, taken: 0 };
  if (mode) Object.assign(RUN, mode);
  for (const k of elix) if (S.elixirs[k] > 0) { S.elixirs[k]--; RUN.buffs[k] = 1; }
  S.rested = false; S.runs++;
  closePanel();
  loadDungeon(depth);
  if (RUN.rested) toast('Well rested: bonus health this descent.', 'var(--ok)');
}
function returnToTown(died) {
  setTimeout(() => submitBoard(), 2000);
  if (RUN) setTimeout(() => hint('home'), 1200);
  const summary = !RUN ? '' : RUN.arena ? `Back from the Pit: ${RUN.arena.wave - (RUN.arena.exit ? 0 : 1)} waves won, ${fmt(RUN.gold)} gold.` : RUN.rift ? `Back from the rift${RUN.rift.done ? ` (sealed in ${fmtClock(riftTime())})` : ''} with ${RUN.gold} gold.` : `Back home from depth ${RUN.depth} with ${RUN.gold} gold and ${RUN.items} item${RUN.items === 1 ? '' : 's'}.`;
  const gl = S.home.garden;
  let grew = '';
  if (gl) { addMat('herb', [0, 2, 4, 7][gl] + (S.decor && S.decor.flowers ? 2 : 0)); if (gl >= 2) addMat('essence', gl - 1); if (gl >= 3) addMat('spore', 2); grew = 'Your garden yielded fresh Bitterleaf.'; }
  if (RUN) { // a line in the hall of records for every trip below
    S.records.push({ deep: RUN.depth, from: RUN.start, floors: RUN.floors, gold: RUN.gold, items: RUN.items, died: !!died, cls: S.cls, lvl: S.level, at: Date.now() });
    S.records.sort((a, b) => b.deep - a.deep || b.floors - a.floors); S.records.length = Math.min(S.records.length, 12);
  }
  S.tod = ((S.tod || 0.42) + 0.17) % 1; // time passes while you are below
  rollWeather();
  S.shop = null; S.questOffers = null;
  RUN = null;
  loadTown();
  if (!died && summary) toast(summary, 'var(--brass-2)', true);
  if (grew) toast(grew, 'var(--ok)');
  save();
}
function die() {
  P.dead = true; P.hp = 0;
  const lost = RUN.mode === 'arena' || S.diff === 'story' ? 0 : Math.floor(S.gold * 0.25);
  if (RUN.arena) S.arenaBest = Math.max(S.arenaBest || 0, RUN.arena.wave - 1);
  S.gold -= lost; S.deaths++;
  P.mesh.rotation.z = Math.PI / 2; P.mesh.position.y = 0.3; P.mesh.visible = true; viewmodel.g.visible = false;
  releaseLock(); setMusic(null); shake(0.6);
  const secs = Math.round((performance.now() - (RUN.t0 || performance.now())) / 1000);
  const tips = ['Roll through red circles: you cannot be hurt mid-roll.', 'Drink a draught before your health runs low, not after.', 'Pull packs back into a corridor so only one or two can reach you.', 'Champions glow; their affixes are named over their heads.', 'Upgrade gear at your Home workbench before pushing deeper.', 'Talents (K) and gems add up fast. Check them before a hard depth.'];
  $('#deathText').innerHTML = `<span class="killer">${RUN.lastHit ? `Slain by ${esc(RUN.lastHit)}` : 'Your wounds were too many'} · ${esc(biomeOf(RUN.depth).name)}, depth ${RUN.depth}</span>
    <span class="recap">${[['Floors this trip', RUN.floors], ['Foes slain', RUN.kills || 0], ['Gold found', fmt(RUN.gold)], ['Items found', RUN.items], ['Damage taken', fmt(RUN.taken || 0)], ['Time below', fmtTime(secs).replace('0m', '<1m')]].map(([a, b]) => `<span><em>${a}</em><b>${b}</b></span>`).join('')}</span>
    <span>You dropped ${fmt(lost)} gold in the dark, but your gear and materials came home with you.</span><span class="tip">${esc(pick(tips))}</span>`;
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
  P.dodgeT = 0.2; P.perfect = false; P.dodgeCd = 0.85 * ST.rollM; P.iframes = Math.max(P.iframes, 0.32); P.ghostT = 0;
  sfx('dodge'); burst(P.x, 0.2, P.z, 0xc8c0a8, 6, 2, 0.1);
}
function usePotion(greater) {
  if (P.dead || potCd > 0) return;
  if (P.hp >= ST.maxHp - 0.5) { toast('Already at full health.', 'var(--muted)'); return; }
  if (greater === undefined) greater = S.potions <= 0 && S.gpotions > 0;
  const k = greater ? 'gpotions' : 'potions';
  if (S[k] <= 0) { toast(greater ? 'No Greater Draughts left.' : 'No Healing Draughts left.', 'var(--bad)'); return; }
  S[k]--; potCd = 0.8;
  healPlayer(ST.maxHp * (greater ? 0.75 : 0.4) * (riftMod('drain') ? 0.5 : 1));
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
// ================= camera modes =================
// top: angled overhead, mouse aims on the ground. third: over-the-shoulder chase camera with wall collision.
// first: eye-level with a held weapon. In third and first, mouse (pointer lock) or a touch drag turns the view.
const CAM = { yaw: Math.PI, pitch: 0.28, dist: 4.6, curDist: 4.6, bob: 0, tight: 0 };
const CAM_NAMES = { top: 'Overhead', third: 'Third person', first: 'First person' };
function setCamMode(m) {
  if (!CAM_NAMES[m]) m = 'top';
  const prev = SET.cam; SET.cam = m; saveSettings();
  if (prev === 'top' && m !== 'top') { CAM.yaw = Math.PI; CAM.pitch = m === 'first' ? 0.05 : 0.28; }
  if (m === 'top' && document.pointerLockElement) document.exitPointerLock();
  updateFov();
  $('#crosshair').hidden = m === 'top';
  $('#btnView').textContent = window.innerWidth < 640 ? 'View' : 'View: ' + CAM_NAMES[m];
  if (LV && LV.type === 'dungeon') { layoutWalls(); lightForView(); }
  if (LV && LV.type === 'town') { scene.fog = new THREE.Fog(0xe2c8a0, m === 'top' ? 40 : 30, m === 'top' ? 95 : 150); applyTimeOfDay(true); }
  snapCamera();
}
function cycleCam() { setCamMode(SET.cam === 'top' ? 'third' : SET.cam === 'third' ? 'first' : 'top'); toast('View: ' + CAM_NAMES[SET.cam], 'var(--brass-2)'); }
function lookBy(dx, dy) {
  const s = 0.0026 * (SET.sens || 1);
  CAM.yaw -= dx * s;
  CAM.pitch = clamp(CAM.pitch + dy * s, SET.cam === 'first' ? -1.2 : -0.35, SET.cam === 'first' ? 1.2 : 1.1);
}
const _cv = new THREE.Vector3(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(0, 0, 0, 'YXZ');
function camBlocked(x, y, z) {
  if (y > (LV.type === 'dungeon' ? wallHeight() : 7)) return false;
  return !walkable(x, z);
}
const camProbe = { x: 0, z: 0, r: 0.3 };
function placeCamera(dt, snap) {
  const mode = SET.cam;
  camera.position.sub(shakeOff); shakeOff.set(0, 0, 0);
  if (mode === 'top') {
    const k = snap ? 1 : 1 - Math.exp(-dt * 7);
    camera.position.x = lerp(camera.position.x, P.x + CAM_OFF.x * camZoom, k);
    camera.position.y = lerp(camera.position.y, CAM_OFF.y * camZoom, k);
    camera.position.z = lerp(camera.position.z, P.z + CAM_OFF.z * camZoom, k);
    camera.lookAt(camera.position.x - CAM_OFF.x * camZoom, 0.6, camera.position.z - CAM_OFF.z * camZoom);
    return;
  }
  if (lockT && lockT.mesh) { // lock-on swings the view onto the target and keeps it framed
    const k = snap ? 1 : 1 - Math.exp(-dt * 8), dist = Math.hypot(lockT.x - P.x, lockT.z - P.z);
    CAM.yaw += angDiff(Math.atan2(lockT.x - P.x, lockT.z - P.z), CAM.yaw) * k;
    const tp = mode === 'first' ? Math.atan2(1.58 - lockT.h * lockT.scale * 0.6, Math.max(0.5, dist)) : clamp(0.42 - dist * 0.02, 0.18, 0.42);
    CAM.pitch = lerp(CAM.pitch, tp, k * 0.6);
  }
  _ce.set(-CAM.pitch, CAM.yaw + Math.PI, 0); camera.quaternion.setFromEuler(_ce);
  if (mode === 'first') {
    CAM.bob += dt * (Math.hypot(P.mx || 0, P.mz || 0) > 0.1 ? 11 : 0);
    camera.position.set(P.x, 1.58 + Math.sin(CAM.bob) * 0.035, P.z);
    return;
  }
  // third person: follow a little behind the delver, pull in when a wall sits between shoulder and camera
  const fk = snap ? 1 : 1 - Math.exp(-dt * 14);
  CAM.fx = snap || CAM.fx === undefined ? P.x : lerp(CAM.fx, P.x, fk); CAM.fz = snap || CAM.fz === undefined ? P.z : lerp(CAM.fz, P.z, fk);
  const hx = CAM.fx, hy = 1.65, hz = CAM.fz;
  _cv.set(0.55, 0.15, 1).applyQuaternion(camera.quaternion);
  let d = CAM.dist;
  for (let t = 0.3; t <= CAM.dist; t += 0.2) { if (camBlocked(hx + _cv.x * t, hy + _cv.y * t, hz + _cv.z * t)) { d = Math.max(0.6, t - 0.35); break; } }
  CAM.curDist = snap ? d : (d < CAM.curDist ? d : lerp(CAM.curDist, d, 1 - Math.exp(-dt * 4)));
  // when a wall shoves the lens in, rise up over the shoulder so the delver doesn't fill the frame
  const tight = clamp(1 - (CAM.curDist - 0.6) / 2.2, 0, 1);
  camera.position.set(hx + _cv.x * CAM.curDist, Math.max(0.4, hy + _cv.y * CAM.curDist + tight * 0.75), hz + _cv.z * CAM.curDist);
  CAM.tight = tight;
  if (camera.position.y < (LV.type === 'dungeon' ? wallHeight() : 7)) { // keep the lens out of the stonework
    camProbe.x = camera.position.x; camProbe.z = camera.position.z; collide(camProbe);
    camera.position.x = camProbe.x; camera.position.z = camProbe.z;
  }
}
function snapCamera() { placeCamera(0, true); }
function updCamera(dt) {
  placeCamera(dt, false);
  const want = SET.cam !== 'top' && !calm() && (P.dodgeT > 0 || P.dashT > 0) ? 8 : 0;
  const nk = lerp(fovKick, want, 1 - Math.exp(-dt * (want ? 18 : 6)));
  if (Math.abs(nk - fovKick) > 0.01 || (fovKick && !want && nk < 0.02)) { fovKick = nk < 0.02 && !want ? 0 : nk; camera.fov = camBaseFov + fovKick; camera.updateProjectionMatrix(); }
  applyShake(dt);
}
// lighting follows the view: overhead needs a high, wide lantern; close views a low, near one
function lightForView() {
  if (!LV || LV.type !== 'dungeon') return;
  const top = SET.cam === 'top';
  torch.intensity = top ? 96 : 30; torch.distance = top ? 34 : 22;
  if (riftMod('dark')) { torch.distance *= 0.55; torch.intensity *= 0.75; }
  hemi.intensity = top ? 3.7 : 2.4;
  // overhead, the lantern is high and its shadows barely show, while its six-sided shadow pass is the costliest
  // thing in the frame; contact shadows carry the overhead look instead. Toggling it rebuilds shaders, so warm them.
  const cast = Q.torchShadow && !top;
  if (torch.castShadow !== cast) { torch.castShadow = cast; warmLevel(); }
}
function updPlayer(dt) {
  if (P.dead) return;
  let ix = 0, iz = 0;
  if (held('up')) iz -= 1;
  if (held('down')) iz += 1;
  if (held('left')) ix -= 1;
  if (held('right')) ix += 1;
  ix += stick.x; iz += stick.y;
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  if (SET.cam !== 'top') { // camera-relative: up on the stick or W walks where the camera looks
    const fx = Math.sin(CAM.yaw), fz = Math.cos(CAM.yaw), rx = -Math.cos(CAM.yaw), rz = Math.sin(CAM.yaw);
    const nx = fx * -iz + rx * ix, nz = fz * -iz + rz * ix; ix = nx; iz = nz;
    // on touch, the chase camera drifts round behind you as you run (unless you are steering it or locked on)
    if (touchMode && SET.cam === 'third' && !lockT && lookTouch === null && il > 0.25 && stick.y < 0.35) CAM.yaw += angDiff(Math.atan2(ix, iz), CAM.yaw) * Math.min(1, dt * 1.4);
  }
  P.mx = ix; P.mz = iz;
  P.atkT -= dt; P.swingT -= dt; P.dodgeCd -= dt; P.iframes -= dt; potCd -= dt;
  if (P.frenzyT > 0) { P.frenzyT -= dt; if (P.frenzyT <= 0) P.frenzy = 0; }
  if (P.chillT > 0) P.chillT -= dt;
  if (P.burnT > 0) { P.burnT -= dt; P.hp -= P.burnD * dt; if (P.hp <= 0 && LV.type === 'dungeon') { P.hp = 0.01; hurtPlayer(9999, null); } }
  const wet = LV.type === 'dungeon' && inFlood(P.x, P.z); // wading slows you; lava burns
  if (wet && LV.lava && P.dodgeT <= 0 && !P.dead) { P.burnT = Math.max(P.burnT || 0, 0.6); P.burnD = Math.max(P.burnD || 0, ST.maxHp * 0.04); if (Math.random() < dt * 6) burst(P.x, 0.3, P.z, 0xff7a2a, 2, 2, 0.1); }
  const spd = 5.3 * (1 + ST.move / 100) * (P.chillT > 0 ? 0.6 : 1) * (wet ? 0.8 : 1);
  if (wet && il > 0.1 && Math.random() < dt * 8) burst(P.x + rand(-0.3, 0.3), 0.15, P.z + rand(-0.3, 0.3), 0xbfe8ff, 3, 2, 0.08);
  let vx = ix * spd, vz = iz * spd;
  if (P.dashT > 0) { P.dashT -= dt; vx = Math.sin(P.dashDir) * 30; vz = Math.cos(P.dashDir) * 30; dashHits(); }
  else if (P.dodgeT > 0) {
    P.dodgeT -= dt; vx = Math.sin(P.dodgeDir) * 15; vz = Math.cos(P.dodgeDir) * 15;
    if (P.dodgeT <= 0 && ST.powers.quake && LV.type === 'dungeon') { ringFx(P.x, P.z, 0.4, 3.2, 0.3, 0xd8b07a, 2.2); burst(P.x, 0.3, P.z, 0xa08060, 14, 5, 0.18); shake(0.25); withElem('phys', () => hitAround(3.2, 0.9 * ST.skillM, 5)); sfx('boom'); }
    if (ST.powers.ghost && LV.type === 'dungeon') { P.ghostT -= dt; if (P.ghostT <= 0) { P.ghostT = 0.07; telegraph(P.x, P.z, 1.3, 0.35, ST.dmg * 0.45, { player: true, col: 0x9fd4ff }); } }
  }
  if (P.leapT > 0) { vx = vz = 0; } // the leap carries you (see updClassSkills)
  P.kx = (P.kx || 0) * Math.pow(0.002, dt); P.kz = (P.kz || 0) * Math.pow(0.002, dt);
  P.x += (vx + P.kx) * dt; P.z += (vz + P.kz) * dt;
  collide(P);
  if (P.pend) { P.pend.t -= dt; if (P.pend.t <= 0) { const f = P.pend.fin; P.pend = null; resolveMelee(f); } }
  updSkills(dt);
  // aim
  const wantsAtk = mouseDown || touchAtk || held('attack') || pad.atk;
  const moving = il > 0.1 || P.dodgeT > 0 || P.dashT > 0;
  const la = lockAngle();
  if (la !== null && P.spinT <= 0) P.face = SET.cam === 'top' ? la : P.face + angDiff(la, P.face) * Math.min(1, dt * 16);
  else if (P.spinT > 0) { /* spinning */ }
  else if (SET.cam === 'top') {
    if (pad.on && pad.aim !== null) P.face = pad.aim;
    else if (touchMode || pad.on) {
      // auto-aim: stay on the current target while it lives and stays close; otherwise prefer foes
      // in the direction you push the stick, then the nearest, with a nudge toward leaders and bosses
      let best = P.aimT && !P.aimT.dead && Math.hypot(P.aimT.x - P.x, P.aimT.z - P.z) < 8 ? P.aimT : null;
      if (best && il > 0.2 && Math.abs(angDiff(Math.atan2(best.x - P.x, best.z - P.z), Math.atan2(ix, iz))) > 1.6) best = null;
      if (!best && LV.type === 'dungeon') {
        let bs = 1e9; const ma = il > 0.2 ? Math.atan2(ix, iz) : null;
        for (const e of enemies) {
          if (e.dead || !e.awake) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > 9) continue;
          const s = d + (ma !== null ? Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), ma)) * 2.2 : 0) - (e.boss || e.leader ? 1.5 : 0);
          if (s < bs) { bs = s; best = e; }
        }
      }
      P.aimT = best;
      if (best && (wantsAtk || il < 0.1)) P.face = Math.atan2(best.x - P.x, best.z - P.z);
      else if (il > 0.1) P.face = Math.atan2(ix, iz);
    } else { const ap = aimPoint(); if (ap) P.face = Math.atan2(ap.x - P.x, ap.z - P.z); }
  } else {
    let want = CAM.yaw;
    if (SET.cam === 'third' && !wantsAtk && P.atkT <= 0 && moving) want = Math.atan2(ix, iz);
    if (touchMode && wantsAtk) { // gentle aim assist toward the foe nearest the view centre
      let best = null, bs = 0.45;
      for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > 9) continue; const a = Math.abs(angDiff(Math.atan2(e.x - P.x, e.z - P.z), CAM.yaw)); if (a < bs) { bs = a; best = e; } }
      if (best) want = Math.atan2(best.x - P.x, best.z - P.z);
    }
    P.face = SET.cam === 'first' || wantsAtk || P.atkT > 0 ? want : P.face + angDiff(want, P.face) * Math.min(1, dt * 12);
  }
  if (wantsAtk) playerAttack();
  if (LV.type === 'dungeon') P.hp = Math.min(ST.maxHp, P.hp + ST.regen * dt);
  else P.hp = ST.maxHp;
  animateHero(dt, moving);
  // the lantern sits above and behind the delver so it lights the way ahead without glaring off their own armour
  const bk = SET.cam === 'first' ? 0.9 : 0.5, ta = SET.cam === 'top' ? Math.PI : P.face;
  torch.position.set(P.x - Math.sin(ta) * bk, SET.cam === 'top' ? 5.2 : SET.cam === 'third' ? 3.0 : 2.6, P.z - Math.cos(ta) * bk);
  if (LV.type === 'dungeon') { sun.position.set(P.x - 6, 20, P.z + 8); sun.target.position.set(P.x, 0, P.z); }
}
function animateHero(dt, moving) {
  const w = curWeapon(), u = P.u;
  u.uWalk.value += dt * (moving ? (P.dodgeT > 0 ? 18 : 10.5) : 0);
  u.uAmp.value = lerp(u.uAmp.value, moving ? 0.7 : 0, Math.min(1, dt * 10));
  let armR = null, armL = 0, armY = 0, handX = 0.5, twist = 0;
  if (P.spinT > 0) { armR = -1.5; armY = 1.45; handX = 1.4; }
  else if (P.dashT > 0) { armR = -1.35; armY = -0.9; handX = 1.4; }
  else if (P.swingT > 0 && !w.ranged) {
    const t = 1 - P.swingT / P.swingDur, e = 1 - Math.pow(1 - t, 3), dir = P.combo % 2 ? -1 : 1;
    if (ST.wk === 'hammer' || (P.fin && ST.wk !== 'spear')) { armR = lerp(-3.0, -0.55, e); handX = 1.15; } // overhead smash
    else if (ST.wk === 'spear') { armR = lerp(-1.15, -1.55, e); handX = 1.45; } // thrust
    else { const half = Math.min(1.5, w.arc / 2 + 0.3); armR = -1.45; armY = dir * lerp(half, -half, e); handX = 1.38; twist = armY * 0.3; }
  } else if (w.ranged && (P.atkT > -0.25)) { armR = -1.5; if (ST.wk === 'bow') armL = -1.45; }
  // between attacks the arm eases back to rest instead of snapping
  const k = Math.min(1, dt * 16);
  P.aR = armR !== null ? armR : lerp(P.aR || 0, 0, k); P.aY = armR !== null ? armY : lerp(P.aY || 0, 0, k); P.hX = armR !== null ? handX : lerp(P.hX || 0.5, 0.5, k);
  u.uArmR.value = Math.abs(P.aR) < 0.01 ? 0 : P.aR; u.uArmL.value = armL; u.uArmRY.value = P.aY;
  P.shoulder.rotation.x = armAngle(u, true); P.shoulder.rotation.y = P.aY; P.hand.rotation.x = P.hX;
  P.mesh.position.set(P.x, (moving ? Math.abs(Math.sin(u.uWalk.value)) * 0.05 : 0) + P.leapY, P.z);
  if (P.spinT > 0) P.spinRot = (P.spinRot || 0) + dt * 17; else P.spinRot = 0;
  P.mesh.rotation.y = P.face + twist + P.spinRot; P.mesh.rotation.z = 0;
  const blink = P.iframes > 0 && P.dodgeT <= 0 && Math.floor(P.iframes * 20) % 2 === 0;
  P.mesh.visible = SET.cam !== 'first' && !blink && !(SET.cam === 'third' && CAM.tight > 0.85);
  // first-person weapon
  const vm = viewmodel;
  vm.g.visible = SET.cam === 'first' && !P.dead;
  if (vm.g.visible) {
    if (vm.kind !== ST.wk) { while (vm.holder.children.length) vm.holder.remove(vm.holder.children[0]); const wm = weaponMesh(ST.wk); wm.traverse((o) => { o.castShadow = false; }); vm.holder.add(wm); vm.kind = ST.wk; }
    const sway = Math.sin(u.uWalk.value) * u.uAmp.value;
    let rx = w.ranged ? 0.12 : 0.95, ry = Math.PI, rz = w.ranged ? 0 : -0.25, py = 0, px = 0;
    if ((P.swingT > 0 && !w.ranged) || P.spinT > 0) {
      const t = P.spinT > 0 ? (elapsed * 3) % 1 : 1 - P.swingT / P.swingDur, e = 1 - Math.pow(1 - t, 3), dir = P.combo % 2 ? -1 : 1;
      if (ST.wk === 'hammer' || P.fin) { rx = lerp(1.9, -0.4, e); rz = 0; } // overhead
      else if (ST.wk === 'spear') { rx = 0.1; px = 0; py = -0.08 * Math.sin(e * Math.PI); }
      else { rx = 0.28; ry = Math.PI + dir * lerp(-1.0, 1.0, e); rz = dir * 0.5; px = dir * lerp(0.1, -0.5, e); } // sweep across the view
    } else if (w.ranged && P.atkT > 0) { py = 0.05 * (P.atkT / w.cd); }
    vm.g.position.set(0.34 + px + sway * 0.02, -0.36 + Math.abs(sway) * 0.02 - py, -0.6);
    vm.g.rotation.set(0, 0, 0);
    vm.holder.rotation.set(rx, ry, rz);
    vm.g.children[0].rotation.set(rx * 0.25 - 0.25, 0, 0);
  }
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

// ================= persistence =================
// three save slots; slot 1 keeps the original key so older saves load as they were
const saveKey = () => ['hearthdeep.save.v1', 'hearthdeep.save.v1.s2', 'hearthdeep.save.v1.s3'][SET.slot || 0];
// Every save also keeps the previous good copy as a backup; loading falls back to it if the main copy is damaged.
let saveWarned = false, saveN = 0;
function save() {
  if (!S || !started) return;
  try {
    const json = JSON.stringify(S), k = saveKey();
    if (++saveN % 5 === 1) { const prev = localStorage.getItem(k); if (prev && validSave(safeParse(prev))) localStorage.setItem(k + '.bak', prev); }
    localStorage.setItem(k, json);
  } catch (err) { if (!saveWarned) { saveWarned = true; toast('Could not save: browser storage is full or blocked.', 'var(--bad)', true); } }
}
const safeParse = (t) => { try { return t ? JSON.parse(t) : null; } catch (err) { return null; } };
const validSave = (s) => !!(s && typeof s === 'object' && s.equip && typeof s.equip === 'object' && Number.isFinite(s.level) && s.level >= 1 && Array.isArray(s.inv));
function loadSave() {
  try {
    const k = saveKey(), main = safeParse(localStorage.getItem(k));
    if (validSave(main)) return main;
    const bak = safeParse(localStorage.getItem(k + '.bak'));
    if (validSave(bak)) { setTimeout(() => toast('Your save was damaged; restored the last backup.', 'var(--brass-2)', true), 1500); return bak; }
    return null;
  } catch (err) { return null; }
}
function fixUid() {
  let m = 0; const all = [...S.inv, ...S.stash, ...Object.values(S.equip).filter(Boolean), ...((S.shop && S.shop.items) || [])];
  for (const it of all) m = Math.max(m, it.id || 0);
  uid = m + 1;
}
function normalizeSave(s) {
  const d = newSave();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.home = Object.assign(d.home, s.home); s.elixirs = Object.assign(d.elixirs, s.elixirs); s.equip = Object.assign(d.equip, s.equip);
  for (const k of ['tal', 'gems', 'stats', 'ach', 'bestiary', 'decor', 'hints']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  if (!Array.isArray(s.records)) s.records = [];
  if (!Array.isArray(s.loadouts) || s.loadouts.length !== 3) s.loadouts = [null, null, null];
  if (!Array.isArray(s.learned)) s.learned = [];
  if (typeof s.para !== 'number' || !(s.para >= 0)) s.para = 0;
  if (typeof s.pxp !== 'number' || !(s.pxp >= 0)) s.pxp = 0;
  if (!s.parap || typeof s.parap !== 'object') s.parap = {};
  if (typeof s.tokens !== 'number' || !(s.tokens >= 0)) s.tokens = 0;
  if (s.elixirs && typeof s.elixirs.plenty !== 'number') s.elixirs.plenty = 0;
  if (s.level > LVL_CAP) { s.para += s.level - LVL_CAP; s.level = LVL_CAP; s.xp = 0; } // older heroes past the new cap keep every level as Paragon
  if (!DIFF[s.diff]) s.diff = 'normal';
  if (!['none', 'common', 'uncommon'].includes(s.filter)) s.filter = 'none';
  if (typeof s.shards !== 'number') s.shards = 0;
  if (!s.story || typeof s.story !== 'object' || !Array.isArray(s.story.pages)) s.story = null;
  if (!s.seedBest || typeof s.seedBest !== 'object') s.seedBest = {};
  if (s.lastRift && (typeof s.lastRift !== 'object' || typeof s.lastRift.code !== 'string' || !isFinite(s.lastRift.secs))) delete s.lastRift;
  if (!s.rift || typeof s.rift !== 'object') s.rift = { max: 1, best: {} };
  // repair anything a bad write or an old version could have left behind
  for (const k of ['gold', 'xp', 'kills', 'deaths', 'runs', 'best', 'bossKills', 'potions', 'gpotions', 'scrolls', 'shards', 'time']) if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = d[k] || 0;
  s.level = Math.max(1, Math.floor(s.level) || 1);
  const okItem = (it) => it && typeof it === 'object' && SLOTS.includes(it.slot) && Array.isArray(it.aff) && Number.isFinite(it.il);
  s.inv = (Array.isArray(s.inv) ? s.inv : []).filter(okItem);
  s.stash = (Array.isArray(s.stash) ? s.stash : []).filter(okItem);
  for (const sl of SLOTS) if (s.equip[sl] && !okItem(s.equip[sl])) s.equip[sl] = null;
  for (const it of [...s.inv, ...s.stash, ...Object.values(s.equip)]) if (it && it.sock && !Array.isArray(it.gems)) it.gems = Array(it.sock).fill(null);
  if (s.cls && !CLASSES[s.cls]) s.cls = null;
  if (!Array.isArray(s.waypoints) || !s.waypoints.length) s.waypoints = [1];
  if (!Array.isArray(s.slain)) s.slain = [];
  if (s.mats && typeof s.mats === 'object') { for (const k of Object.keys(s.mats)) if (!Number.isFinite(s.mats[k])) s.mats[k] = 0; } else s.mats = {};
  return s;
}
// ================= skills =================
// each class brings its own three skills (see CLASSES); this array is refilled when the class is set
const SKILLS = [];
function setClassSkills() {
  SKILLS.length = 0;
  clsOf().skills.forEach((id, i) => SKILLS.push(Object.assign({ id, key: String(i + 1), lvl: SKILL_LVL[i] }, SKILL_DEFS[id])));
}
const skillCdOf = (s) => Math.max(0.5, s.cd - (s.id === 'bonespear' ? 0.3 * tal('marrow') : 0)) * (1 - (ST ? ST.cdr : 0) / 100);
const skillCd = [0, 0, 0];
Object.assign(P, { spinT: 0, dashT: 0, dashDir: 0, dashHit: new Set(), spinTicks: 0 });
function useSkill(i) {
  const s = SKILLS[i];
  if (!s || P.dead || isPaused() || !LV) return;
  if (S.level < s.lvl) { toast(`${s.n} unlocks at level ${s.lvl}.`, 'var(--muted)'); return; }
  if (skillCd[i] > 0 || P.dodgeT > 0 || P.dashT > 0 || P.spinT > 0 || P.leapT > 0) return;
  if (classSkill(s) === false) return; // nothing to aim at, or no room to land
  skillCd[i] = Math.random() * 100 < 10 * tal('overflow') ? 0.4 : skillCdOf(s);
  if (skillCd[i] < 1) floatNum(P.x, 2.2, P.z, 'Overflow', 'xp');
  else if (ST.powers.twinstar && chance(0.3)) { skillCd[i] = 0.3; floatNum(P.x, 2.2, P.z, 'Twinstar', 'crit'); burst(P.x, 1.6, P.z, 0xfff2a8, 10, 3, 0.12); }
  legendSkillHooks();
  stat('skills');
  P.atkT = Math.max(P.atkT, 0.15); P.pend = null;
  if (s.id === 'whirl') {
    P.spinT = 0.46; P.spinTicks = 0; P.iframes = Math.max(P.iframes, 0.12);
    sfx('whirl');
  } else if (s.id === 'dash') {
    const mv = Math.hypot(P.mx || 0, P.mz || 0) > 0.2;
    P.dashDir = mv ? Math.atan2(P.mx, P.mz) : P.face; P.face = P.dashDir;
    P.dashT = 0.2; P.iframes = Math.max(P.iframes, 0.34); P.dashHit.clear();
    burst(P.x, 0.6, P.z, 0x9a7aff, 14, 3, 0.16); sfx('dash');
  } else if (s.id === 'nova') {
    ringFx(P.x, P.z, 0.5, 5.0, 0.38, 0xff7a2a, 3.2); novaFx(P.x, P.z, 5.4, 0.55, 'fire', 0xff7a2a); spellLight(P.x, 1.2, P.z, 0xff8a3a, 9, 0.35);
    for (let k = 0; k < 3; k++) burst(P.x, 0.4, P.z, k ? 0xff7a2a : 0xffd06a, 18, 9, 0.22, 2.2);
    const n = withElem('fire', () => hitAround(5.0, 2.5 * ST.skillM, 7, (e) => { e.burnT = 3; e.burnD = ST.dmg * 0.4 * ST.burnM; }));
    shake(0.55); addHitStop(n ? 0.09 : 0.03); sfx('nova');
  }
}
// legendary powers that change what every skill does
function legendSkillHooks() {
  if (!LV || LV.type !== 'dungeon') return;
  const W = ST.powers, near = (r) => enemies.filter((e) => !e.dead && e.ai !== 'totem' && Math.hypot(e.x - P.x, e.z - P.z) < r + e.r);
  if (W.warhorn) { P.horn = Math.min(3, (P.hornT > 0 ? P.horn || 0 : 0) + 1); P.hornT = 5; ringFx(P.x, P.z, 0.4, 2.6, 0.3, 0xffc46a, 2); }
  if (W.vortex) {
    ringFx(P.x, P.z, 7, 0.6, 0.35, 0x8fd0ff, 2.2);
    for (const e of near(7)) { const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 1; if (!e.boss) { e.kx += dx / d * Math.min(9, d * 1.6); e.kz += dz / d * Math.min(9, d * 1.6); } e.chillT = Math.max(e.chillT || 0, 1.2); }
  }
  if (W.frostpath) { novaFx(P.x, P.z, 5, 0.45, 'frost', 0xbfe8ff); iceFx(P.x, P.z, 4.5, 14); for (const e of near(5)) chillEnemy(e, 2.5); }
  if (W.storm) {
    const ts = near(10).filter((e) => e.awake && e.los !== false).sort(() => Math.random() - 0.5).slice(0, 3);
    withElem('shock', () => { for (const e of ts) { boltFx(e.x + rand(-0.5, 0.5), 9, e.z + rand(-0.5, 0.5), e.x, 0.3, e.z, 0x9fd8ff, 0.28); burst(e.x, 1, e.z, 0x9fd8ff, 10, 4, 0.12); damageEnemy(e, ST.dmg * 1.6 * ST.skillM, false, 1, 0, 0, false, 'shock'); } });
    if (ts.length) sfx('crit');
  }
  if (W.barrage) {
    const ts = near(11).filter((e) => e.awake && e.los !== false);
    for (let k = 0; k < 5; k++) {
      const t = ts.length ? ts[k % ts.length] : null, a = t ? Math.atan2(t.x - P.x, t.z - P.z) + rand(-0.25, 0.25) : P.face + (k - 2) * 0.35;
      spawnProj({ x: P.x, z: P.z, a, spd: 15, owner: 'p', size: 0.2, col: 0xff9a4a, pierce: 0, mult: 0.55 * ST.skillM, life: 0.9, home: t, el: 'fire' });
    }
  }
}
function updLegends(dt) {
  if (P.hornT > 0) { P.hornT -= dt; if (P.hornT <= 0) P.horn = 0; }
  if (!ST.powers.emberring || !LV || LV.type !== 'dungeon') { if (P.ember) P.ember.visible = false; return; }
  if (!P.ember) {
    P.ember = new THREE.Group();
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff8a2a).multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(0.22); P.ember.add(m); }
  }
  if (P.ember.parent !== world) world.add(P.ember);
  P.ember.visible = true; P.emberA = (P.emberA || 0) + dt * 2.6;
  P.ember.position.set(P.x, 0.8, P.z);
  P.ember.children.forEach((m, k) => { const a = P.emberA + k * Math.PI / 3; m.position.set(Math.sin(a) * 2.2, Math.sin(P.emberA * 3 + k) * 0.12, Math.cos(a) * 2.2); });
  P.emberTick = (P.emberTick || 0) - dt;
  if (P.emberTick <= 0) {
    P.emberTick = 0.5;
    withElem('fire', () => { for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d > 1.4 + e.r && d < 3 + e.r) { damageEnemy(e, ST.dmg * 0.35, false, 0, 0, 0, false, 'fire'); e.burnT = Math.max(e.burnT || 0, 2); e.burnD = Math.max(e.burnD || 0, ST.dmg * 0.15 * ST.burnM); } } });
  }
}
function hitAround(radius, mult, kb, extra) {
  let n = 0;
  if (!LV || LV.type !== 'dungeon') return 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > radius + e.r) continue;
    const r = rollDmg(e); damageEnemy(e, r.d * mult, r.crit, kb, dx / (d || 1), dz / (d || 1), true);
    if (extra && !e.dead) extra(e);
    n++;
  }
  return n;
}
function dashHits() {
  if (!LV || LV.type !== 'dungeon') return;
  burst(P.x, 0.9, P.z, 0x7a5aff, 3, 1, 0.18, 1.8);
  for (const e of enemies) {
    if (e.dead || P.dashHit.has(e.id)) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > e.r + 1.1) continue;
    P.dashHit.add(e.id);
    const side = Math.sin(P.dashDir) * dz - Math.cos(P.dashDir) * dx > 0 ? 1 : -1; // knock foes aside, out of the lane
    const r = rollDmg(e); damageEnemy(e, r.d * 2 * ST.skillM, r.crit, 5, Math.cos(P.dashDir) * side, -Math.sin(P.dashDir) * side, true);
    addHitStop(0.03); shake(0.15);
  }
}
function updSkills(dt) {
  for (let i = 0; i < 3; i++) skillCd[i] = Math.max(0, skillCd[i] - dt);
  updClassSkills(dt); updLegends(dt); updMinions(dt); updRemains(dt);
  if (P.spinT > 0) {
    P.spinT -= dt;
    const due = P.spinT < 0.38 && P.spinTicks === 0 ? 1 : P.spinT < 0.12 && P.spinTicks === 1 ? 2 : 0;
    if (due) { P.spinTicks = due; ringFx(P.x, P.z, 0.6, 3.0, 0.22, 0xfff2c8, 2); const n = hitAround(2.9, 0.85 * ST.skillM, 3.5); if (n) { addHitStop(0.04); shake(0.2); } }
  }
}

// ================= spike traps =================
// Iron plates that rattle, glow, then fire spikes. They hurt anything standing on them, foes included.
const G_SPIKES = (() => { const parts = []; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = new THREE.ConeGeometry(0.07, 0.5, 6); c.translate(i * 0.27, 0.25, j * 0.27); parts.push(c); } return mergeGeos(parts); })();
let trapClock = 0;
function placeTraps() {
  const L = LV, d = L.depth, st = L.rooms[0], er = L.exitRoom;
  const n = Math.min(14, 3 + Math.floor(d / 2));
  const inRoom = (i, j, r, pad) => i >= r.x - pad && i < r.x + r.w + pad && j >= r.y - pad && j < r.y + r.h + pad;
  const cands = [];
  for (let j = 1; j < L.h - 1; j++) for (let i = 1; i < L.w - 1; i++) {
    if (L.g[j * L.w + i] !== 1 || inRoom(i, j, st, 2) || inRoom(i, j, er, 0)) continue;
    if (interacts.some((o) => Math.abs(o.x - (i + 0.5)) < 1.5 && Math.abs(o.z - (j + 0.5)) < 1.5)) continue;
    const corridor = !L.rooms.some((r) => inRoom(i, j, r, 0));
    cands.push({ i, j, w: corridor ? 3 : 1 });
  }
  const traps = [];
  for (let k = 0; k < n && cands.length; k++) {
    const c = wpick(cands.map((q) => [q, q.w]));
    cands.splice(cands.indexOf(c), 1);
    if (traps.some((t) => Math.abs(t.x - c.i - 0.5) + Math.abs(t.z - c.j - 0.5) < 3)) continue;
    traps.push({ x: c.i + 0.5, z: c.j + 0.5, ph: rand(0, 3.2), was: 0 });
  }
  L.traps = traps;
  if (!traps.length) return;
  const W = worldMats();
  L.trapPlates = instanced(G.box, W.iron, traps.map((t) => ({ x: t.x, y: 0.02, z: t.z, sx: 0.92, sy: 0.04, sz: 0.92 })), { keep: true });
  L.trapSpikes = instanced(G_SPIKES, metal(0xb8c0c8, 0.3), traps.map((t) => ({ x: t.x, y: -0.6, z: t.z, sx: 1, sy: 1, sz: 1 })), { keep: true, cast: true });
  L.trapSpikes.frustumCulled = false; // instances move, so skip the stale all-instance bound
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3a2a).multiplyScalar(2.4), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  L.trapGlow = instanced(G.tile, glow, traps.map((t) => ({ x: t.x, y: 0.05, z: t.z, sx: 0.001, sy: 1, sz: 0.001 })));
  L.trapGlow.frustumCulled = false;
}
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _tp = new THREE.Vector3(), _ts = new THREE.Vector3();
function updTraps(dt) {
  const L = LV; if (!L.traps || !L.traps.length) return;
  trapClock += dt;
  const d = L.depth, dmg = 9 * Math.pow(1.105, d - 1) * (1 + cycleOf(d) * 0.8);
  let dirty = false;
  L.traps.forEach((t, i) => {
    const near = Math.abs(t.x - P.x) < 24 && Math.abs(t.z - P.z) < 24;
    const c = (trapClock + t.ph) % 3.2, state = c < 2.0 ? 0 : c < 2.55 ? 1 : 2;
    if (state === 2 && t.was !== 2) { // spikes fire
      if (Math.abs(P.x - t.x) < 0.62 && Math.abs(P.z - t.z) < 0.62 && !P.dead) { hurtPlayer(dmg, null); burst(P.x, 0.4, P.z, 0xd04030, 8, 3, 0.12); }
      for (const e of enemies) if (!e.dead && Math.abs(e.x - t.x) < 0.6 + e.r * 0.4 && Math.abs(e.z - t.z) < 0.6 + e.r * 0.4) damageEnemy(e, dmg * 1.6, false, 0, 0, 0, false);
      if (near && Math.hypot(t.x - P.x, t.z - P.z) < 9) sfx('trap');
    }
    t.was = state;
    if (!near) return;
    const y = state === 2 ? -0.5 + Math.min(1, (c - 2.55) / 0.05) * 0.5 : state === 1 ? -0.5 + Math.abs(Math.sin(c * 60)) * 0.04 : -0.6;
    _tm.compose(_tp.set(t.x, y, t.z), _tq, _ts.set(1, 1, 1)); L.trapSpikes.setMatrixAt(i, _tm);
    const gs = state === 1 ? 0.8 + Math.sin(c * 30) * 0.12 : 0.001;
    _tm.compose(_tp.set(t.x, 0.05, t.z), _tq, _ts.set(gs, 1, gs)); L.trapGlow.setMatrixAt(i, _tm);
    dirty = true;
  });
  if (dirty) { L.trapSpikes.instanceMatrix.needsUpdate = true; L.trapGlow.instanceMatrix.needsUpdate = true; }
}

// ================= shrines and cursed altars =================
const SHRINES = {
  fury: { n: 'Shrine of Fury', d: '+30% damage', col: 0xff5a3a },
  stone: { n: 'Shrine of Stone', d: '+50% armor', col: 0xa8b8d0 },
  fortune: { n: 'Shrine of Fortune', d: '+60% magic find and +50% gold', col: 0xf2c56b },
  haste: { n: 'Shrine of Haste', d: '+20% move and attack speed', col: 0x7fe0ff },
  life: { n: 'Shrine of Life', d: 'Full health, then 2% health per second', col: 0x6ae08a },
};
let _altarFlame = null, _portalFlame = null;
function altarFlameMat() { if (!_altarFlame) { _altarFlame = flameMat.clone(); _altarFlame.uniforms.tSoft.value = TEX.soft; _altarFlame.uniforms.uCol.value.set(0xb04aff); } return _altarFlame; }
function portalFlameMat() { if (!_portalFlame) { _portalFlame = flameMat.clone(); _portalFlame.uniforms.tSoft.value = TEX.soft; _portalFlame.uniforms.uCol.value.set(0x4a8aff); } return _portalFlame; }
function roomCenterSpot(r) {
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
  for (let t = 0; t < 30; t++) { const x = cx + rand(-1, 1) * Math.min(1.5, t * 0.1), z = cz + rand(-1, 1) * Math.min(1.5, t * 0.1); if (walkable(x + 0.8, z) && walkable(x - 0.8, z) && walkable(x, z + 0.8) && walkable(x, z - 0.8)) return [x, z]; }
  return [cx, cz];
}
function placeSpecialRooms(vault) {
  const L = LV, d = L.depth;
  if (d < 2) return;
  const free = L.rooms.slice(1).filter((r) => r !== L.exitRoom && r !== vault && r.w >= 5 && r.h >= 5);
  if (free.length && chance(0.55)) { const r = free.splice(randi(0, free.length - 1), 1)[0]; addShrine(...roomCenterSpot(r)); }
  if (free.length && d >= 3 && chance(0.4)) { const r = free.splice(randi(0, free.length - 1), 1)[0]; addAltar(...roomCenterSpot(r)); }
}
function addShrine(x, z) {
  const kind = pick(Object.keys(SHRINES)), sh = SHRINES[kind], W = worldMats();
  const g = new THREE.Group();
  g.add(mesh(G.cyl, W.stone, 1.5, 0.25, 1.5, 0, 0.12, 0), mesh(G.taper, W.stone, 0.6, 1.0, 0.6, 0, 0.75, 0), mesh(G.cyl, W.stone, 0.9, 0.12, 0.9, 0, 1.3, 0));
  const crystal = mesh(G.oct, mat(sh.col, 3.2), 0.36, 0.6, 0.36, 0, 1.85, 0); crystal.userData.spin = 1.2; g.add(crystal);
  g.add(makeFlames([[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([a, b]) => ({ x: a, y: 0.3, z: b }))));
  for (const [a, b] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) g.add(mesh(G.cyl, mat(0xe8dcc0), 0.1, 0.3, 0.1, a, 0.15, b));
  g.traverse((o) => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
  g.position.set(x, 0, z); world.add(g); spinners.push(crystal);
  markSolid(x, z);
  addInteract({ x, z, r: 1.7, kind: 'shrine', label: sh.n, ly: 2.6, cls: '', verb: `Pray at the ${sh.n}`, act(o) {
    o.dead = true; RUN.shrine = kind;
    crystal.material = mat(0x3a3a44); crystal.userData.spin = 0.2;
    const before = ST.maxHp; ST = calcStats(); P.hp = Math.min(ST.maxHp, P.hp + Math.max(0, ST.maxHp - before));
    if (kind === 'life') P.hp = ST.maxHp;
    ringFx(x, z, 0.5, 4, 0.5, sh.col, 3); burst(x, 1.8, z, sh.col, 30, 5, 0.18, 2.4);
    banner(sh.n, sh.d + ' on this floor'); sfx('shrine');
  } });
}
function markSolid(x, z) { const i = Math.floor(x), j = Math.floor(z); if (LV.g[j * LV.w + i] === 1) LV.g[j * LV.w + i] = 3; }
function addAltar(x, z) {
  const W = worldMats(), g = new THREE.Group();
  g.add(mesh(G.box, mat(0x2a2430), 1.7, 0.7, 1.0, 0, 0.35, 0), mesh(G.box, mat(0x3a3040), 1.9, 0.12, 1.2, 0, 0.76, 0));
  g.add(mesh(G.sph, BONE, 0.4, 0.38, 0.42, 0, 1.0, 0), mesh(G.box, SOCKET, 0.1, 0.08, 0.04, -0.08, 1.02, 0.2), mesh(G.box, SOCKET, 0.1, 0.08, 0.04, 0.08, 1.02, 0.2));
  for (const s of [-1, 1]) g.add(mesh(G.cone4, mat(0x2a2430), 0.2, 1.4, 0.2, s * 1.1, 0.7, 0));
  g.add(makeFlames([{ x: -1.1, y: 1.45, z: 0 }, { x: 1.1, y: 1.45, z: 0 }, { x: 0, y: 1.25, z: 0 }], altarFlameMat()));
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; g.add(mesh(G.box, mat(0xb04aff, 2.6), 0.08, 0.02, 0.3, Math.cos(a) * 2.2, 0.02, Math.sin(a) * 2.2)); g.children[g.children.length - 1].rotation.y = -a; }
  g.position.set(x, 0, z); world.add(g);
  markSolid(x, z);
  addInteract({ x, z, r: 1.8, kind: 'altar', label: 'Cursed altar', ly: 2.4, cls: 'lead', verb: 'Disturb the cursed altar', act(o) {
    o.dead = true; RUN.ambush = { x, z, wave: 0, waves: 3, delay: 0.6 };
    banner('Ambush!', 'Survive three waves'); sfx('ambush'); setMusic('boss'); shake(0.4);
  } });
}
function spawnWave() {
  const A = RUN.ambush, d = RUN.depth, w = A.wave;
  const pool = Object.entries(ARCH).filter(([, a]) => d >= a.from).map(([k, a]) => [k, a.w]);
  const n = 3 + Math.floor(d / 4) + w;
  for (let k = 0; k < n; k++) {
    let x = A.x, z = A.z;
    for (let t = 0; t < 20; t++) { const a = rand(0, 6.28), r = rand(2.6, 5); x = A.x + Math.sin(a) * r; z = A.z + Math.cos(a) * r; if (walkable(x, z) && walkable(x + 0.4, z) && walkable(x, z + 0.4)) break; }
    if (!walkable(x, z)) continue;
    const e = spawnEnemy(wpick(pool), x, z, { champ: w === 2 && k === 0, leader: w === 2 && k === 1 && d >= 8 });
    e.awake = true; e.ambush = true; e.cd = rand(0.6, 1.4);
    burst(x, 0.5, z, 0xb04aff, 10, 3, 0.16, 2);
  }
  ringFx(A.x, A.z, 0.5, 5.5, 0.5, 0xb04aff, 3);
  toast(`Wave ${w + 1} of ${A.waves}`, 'var(--r3)');
}
function updAmbush(dt) {
  const A = RUN && RUN.ambush; if (!A) return;
  if (A.delay > 0) { A.delay -= dt; if (A.delay <= 0) spawnWave(); return; }
  if (enemies.some((e) => e.ambush && !e.dead)) return;
  A.wave++;
  if (A.wave < A.waves) { A.delay = 1.4; return; }
  RUN.ambush = null;
  addChest(A.x + 1.6, A.z, true);
  banner('The altar falls silent', 'A hoard lies open');
  setMusic('dng:' + biomeOf(RUN.depth).id); sfx('quest'); questEvent('altar'); stat('altars');
}

// ================= quests =================
// Elder Maren offers three tasks each time you return; take one, see it through, come back for the reward.
let elderLabel = null;
const QARCH = { grunt: 'foot soldiers', skitter: 'swarmers', archer: 'archers', brute: 'brutes', caster: 'casters', bomber: 'bloaters', summoner: 'summoners', warden: 'wardens' };
const QCOUNT = { grunt: 15, skitter: 20, archer: 10, brute: 6, caster: 8, bomber: 8, summoner: 4, warden: 5 };
function questOffer(type) {
  const b = Math.max(1, S.best);
  let q;
  switch (type) {
    case 'slay': { const a = pick(Object.keys(ARCH).filter((k) => ARCH[k].from <= Math.max(2, b))); const n = QCOUNT[a] + Math.floor(b / 5) * 2; q = { arch: a, n, desc: `Slay ${n} ${QARCH[a]}`, diff: 1 }; break; }
    case 'leaders': { const n = 1 + (b >= 6) + (b >= 14); q = { n, desc: `Slay ${n} pack leader${n > 1 ? 's' : ''}`, diff: 1.4 }; break; }
    case 'champs': { const n = 3 + Math.floor(b / 6); q = { n, desc: `Slay ${n} champions`, diff: 1.2 }; break; }
    case 'depth': { const t = Math.max(3, b + randi(2, 3)); q = { n: 1, target: t, desc: `Reach depth ${t}`, diff: 1.3 }; break; }
    case 'gather': { const m = pick(biomeOf(b).mats), n = 6 + Math.floor(b / 3); q = { mat: m, n, desc: `Gather ${n} ${MATS[m].n}`, diff: 1 }; break; }
    case 'altar': { const n = b >= 10 ? 2 : 1; q = { n, desc: `Silence ${n === 1 ? 'a cursed altar' : n + ' cursed altars'}`, diff: 1.3 }; break; }
    case 'boss': { const t = Math.ceil((b + 1) / 5) * 5; q = { n: 1, target: t, desc: `Slay the boss of depth ${t}`, diff: 2 }; break; }
  }
  q.type = type; q.have = 0; q.done = false;
  q.gold = Math.round(70 * Math.pow(1.1, b) * q.diff); q.ess = Math.round((2 + b / 4) * q.diff); q.item = chance(0.45 + 0.25 * (q.diff - 1));
  return q;
}
function makeQuestOffers() {
  const types = ['slay', 'slay', 'leaders', 'champs', 'depth', 'gather', 'boss'];
  if (S.best >= 3) types.push('altar', 'altar');
  const out = [];
  while (out.length < 3) { const t = pick(types); if (!out.some((q) => q.type === t) || (t === 'slay' && out.filter((q) => q.type === 'slay').length < 1)) out.push(questOffer(t)); }
  return out;
}
function questEvent(kind, a, n) {
  const q = S && S.quest; if (!q || q.done) return;
  let add = 0;
  if (kind === 'kill') { const e = a; if ((q.type === 'slay' && e.arch === q.arch && !e.boss) || (q.type === 'leaders' && e.leader) || (q.type === 'champs' && e.champ)) add = 1; }
  else if (kind === 'mat' && q.type === 'gather' && a === q.mat) add = n;
  else if (kind === 'depth' && q.type === 'depth' && a >= q.target) add = 1;
  else if (kind === 'boss' && q.type === 'boss' && a >= q.target) add = 1;
  else if (kind === 'altar' && q.type === 'altar') add = 1;
  if (!add) return;
  q.have = Math.min(q.n, q.have + add);
  if (q.have >= q.n) { q.done = true; toast(`Task done: ${q.desc}. Return to Elder Maren.`, 'var(--ok)', true); sfx('quest'); }
}
function claimQuest() {
  const q = S.quest; if (!q || !q.done) return;
  S.gold += q.gold; addMat('essence', q.ess); gainXP(xpNeed(S.level) * 0.2 * q.diff);
  let got = `${fmt(q.gold)} gold and ${q.ess} Arcane Essence`;
  if (q.item) {
    const it = genItem(Math.max(1, S.best) + 1, { mf: 80, min: 2 });
    if (S.inv.length < BAG_CAP) { S.inv.push(it); got += `, plus ${it.name}`; }
    else if (S.stash.length < stashCap()) { S.stash.push(it); got += `, plus ${it.name} (sent to your stash)`; }
    else { S.gold += it.value * 2; got += `, plus ${fmt(it.value * 2)} gold in place of an item (no room)`; }
  }
  S.questsDone = (S.questsDone || 0) + 1; S.quest = null; S.questOffers = null;
  toast(`Reward: ${got}`, 'var(--brass-2)', true); sfx('quest');
}
function updElderLabel() {
  if (!elderLabel || !LV || LV.type !== 'town') return;
  const L = labelEls.find((q) => q.ref === elderLabel); if (!L) return;
  const mark = S.quest ? (S.quest.done ? ' ?' : '') : ' !';
  const txt = 'Elder Maren' + mark; if (L.el.textContent !== txt) L.el.textContent = txt;
}

// ================= vault mimics and grove springs =================
function addMimic(x, z) {
  // looks like any chest; opening it wakes a Mimic that drops a rich hoard
  const before = interacts.length; addChest(x, z);
  const o = interacts[before]; if (!o) return;
  o.act = (it) => {
    it.dead = true; if (it.g) world.remove(it.g);
    const e = spawnEnemy('brute', x, z, { champ: true }); e.awake = true; e.name = 'Mimic'; e.hp *= 1.6; e.maxHp = e.hp; e.mimic = true;
    burst(x, 0.8, z, 0xffc24a, 24, 6, 0.2); shake(0.4); sfx('ambush'); floatNum(x, 2.2, z, 'It bites!', 'crit');
  };
}
function addSpring(x, z) {
  addInteract({ x, z, r: 1.9, kind: 'spring', label: 'Healing Spring', ly: 1.2, cls: '', verb: 'Drink from the spring', act(o) {
    o.dead = true; healPlayer(ST.maxHp * 0.5); P.burnT = 0; sfx('drink'); ringFx(x, z, 0.4, 2.4, 0.5, 0x7affc8, 2.2); burst(x, 0.6, z, 0x9affd8, 20, 3, 0.14);
    toast('The spring restores you.', 'var(--ok)');
    if (LV.waterMats) for (const m of LV.waterMats) if (m.emissive) m.emissive.multiplyScalar(0.3);
  } });
}
// ================= audio =================
// Everything is synthesised: an effects bus and a music bus feed a gentle compressor.
let AC = null, muted = true, lastHit = 0, sfxBus = null, musBus = null, noiseBuf = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.95; sfxBus.connect(comp);
    musBus = AC.createGain(); musBus.gain.value = SET.music === false ? 0 : 0.5; musBus.connect(comp);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f1, f2, dur, type, vol, at, bus, attack) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f1, at); if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(bus || sfxBus); o.start(at); o.stop(at + dur + 0.05);
  return o;
}
function noise(dur, vol, at, ftype, f1, f2, q, bus) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const fl = AC.createBiquadFilter(); fl.type = ftype || 'lowpass'; fl.Q.value = q || 0.8;
  fl.frequency.setValueAtTime(f1 || 1800, at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(fl).connect(g).connect(bus || sfxBus); s.start(at, Math.random() * 0.5, dur + 0.05);
}
function sfx(t) {
  if (muted) return;
  try {
    audio(); const now = AC.currentTime;
    switch (t) {
      case 'hit': if (now - lastHit < 0.035) return; lastHit = now; tone(160, 55, 0.11, 'sine', 0.22, now); noise(0.06, 0.16, now, 'lowpass', 1600, 500); noise(0.02, 0.08, now, 'highpass', 3000); break;
      case 'crit': tone(1500, 1500, 0.25, 'sine', 0.05, now); tone(2250, 2250, 0.18, 'sine', 0.03, now + 0.01); noise(0.09, 0.12, now, 'bandpass', 2500, 900, 2); break;
      case 'kill': tone(110, 38, 0.22, 'sine', 0.25, now); noise(0.16, 0.12, now, 'bandpass', 900, 200, 1.2); break;
      case 'bigkill': tone(80, 30, 0.6, 'sine', 0.3, now); noise(0.5, 0.18, now, 'lowpass', 1200, 80); tone(220, 110, 0.5, 'triangle', 0.06, now + 0.05); break;
      case 'swing': noise(0.13, 0.09, now, 'bandpass', 700, 2600, 1.4); break;
      case 'heavy': noise(0.2, 0.12, now, 'bandpass', 400, 1500, 1.2); tone(90, 60, 0.15, 'sine', 0.05, now); break;
      case 'whirl': for (let k = 0; k < 3; k++) noise(0.15, 0.09, now + k * 0.13, 'bandpass', 500, 2400, 1.4); break;
      case 'dash': noise(0.25, 0.12, now, 'bandpass', 2600, 400, 1.6); tone(500, 120, 0.22, 'triangle', 0.04, now); break;
      case 'nova': tone(70, 35, 0.7, 'sawtooth', 0.08, now); noise(0.6, 0.22, now, 'lowpass', 2400, 120); noise(0.25, 0.08, now, 'highpass', 5000); break;
      case 'shoot': tone(700, 260, 0.09, 'triangle', 0.05, now); noise(0.05, 0.04, now, 'highpass', 2500); break;
      case 'hurt': tone(220, 80, 0.18, 'sawtooth', 0.07, now); noise(0.08, 0.1, now, 'lowpass', 900); break;
      case 'coin': tone(1320, 1980, 0.08, 'square', 0.02, now); tone(1980, 1980, 0.06, 'square', 0.015, now + 0.05); break;
      case 'rare': tone(660, 660, 0.14, 'triangle', 0.06, now); tone(990, 990, 0.3, 'triangle', 0.06, now + 0.1); tone(1320, 1320, 0.4, 'sine', 0.04, now + 0.2); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.06, now + i * 0.08)); break;
      case 'quest': [392, 523, 659, 784].forEach((f, i) => tone(f, f, 0.45, 'triangle', 0.05, now + i * 0.11)); tone(1046, 1046, 0.8, 'sine', 0.04, now + 0.44); break;
      case 'dodge': noise(0.14, 0.07, now, 'bandpass', 1200, 400, 1); break;
      case 'drink': tone(300, 620, 0.22, 'sine', 0.07, now); tone(620, 900, 0.12, 'sine', 0.03, now + 0.18); break;
      case 'boom': noise(0.45, 0.25, now, 'lowpass', 900, 60); tone(90, 32, 0.4, 'sine', 0.2, now); break;
      case 'boss': tone(110, 55, 1.4, 'sawtooth', 0.07, now, null, 0.2); tone(165, 82, 1.4, 'sawtooth', 0.05, now, null, 0.2); noise(1.2, 0.08, now, 'lowpass', 300, 60); break;
      case 'chest': tone(400, 820, 0.18, 'triangle', 0.06, now); noise(0.1, 0.06, now, 'bandpass', 1400, 600, 1); break;
      case 'portal': tone(300, 900, 0.5, 'sine', 0.06, now); tone(450, 1350, 0.5, 'sine', 0.03, now + 0.05); break;
      case 'die': tone(300, 50, 1.4, 'sawtooth', 0.08, now); noise(1, 0.08, now, 'lowpass', 600, 60); break;
      case 'buy': tone(900, 1300, 0.09, 'square', 0.03, now); tone(1300, 1300, 0.09, 'square', 0.03, now + 0.08); break;
      case 'craft': noise(0.1, 0.1, now, 'bandpass', 2400, 1600, 2); tone(500, 500, 0.12, 'square', 0.03, now + 0.06); break;
      case 'trap': noise(0.12, 0.14, now, 'highpass', 2200); tone(900, 300, 0.1, 'square', 0.03, now); break;
      case 'shrine': [523, 659, 784].forEach((f) => tone(f, f, 1.2, 'sine', 0.05, now, null, 0.05)); tone(1046, 1046, 1.4, 'sine', 0.03, now + 0.2, null, 0.1); break;
      case 'ambush': tone(98, 49, 1.6, 'sawtooth', 0.09, now, null, 0.02); noise(1.2, 0.12, now, 'lowpass', 500, 60); tone(147, 73, 1.4, 'square', 0.03, now + 0.1); break;
      case 'lock': tone(1200, 1600, 0.06, 'square', 0.025, now); break;
      case 'step': noise(0.05, 0.03, now, 'lowpass', 600); break;
      case 'cry': tone(140, 90, 0.7, 'sawtooth', 0.09, now); tone(210, 130, 0.6, 'square', 0.04, now + 0.02); noise(0.5, 0.1, now, 'bandpass', 600, 300, 1); break;
      case 'summon': noise(0.5, 0.1, now, 'lowpass', 300, 900, 1.5); tone(110, 220, 0.5, 'sawtooth', 0.04, now); tone(330, 165, 0.6, 'triangle', 0.03, now + 0.15); for (let k = 0; k < 4; k++) noise(0.04, 0.06, now + 0.1 + k * 0.07, 'bandpass', 2200, 0, 3); break;
      case 'blink': tone(1600, 400, 0.25, 'sine', 0.06, now); tone(800, 2400, 0.2, 'sine', 0.03, now + 0.08); noise(0.15, 0.05, now, 'highpass', 4000); break;
      case 'bite': noise(0.06, 0.12, now, 'bandpass', 1800, 700, 2); tone(260, 140, 0.07, 'square', 0.03, now); break;
      case 'block': tone(1900, 1700, 0.12, 'square', 0.03, now); noise(0.06, 0.12, now, 'highpass', 3000); break;
      case 'gem': [1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.2, 'sine', 0.035, now + i * 0.06)); break;
      case 'page': noise(0.12, 0.05, now, 'bandpass', 3000, 1200, 1.5); break;
    }
  } catch (err) { /* audio unavailable */ }
}

// ================= music =================
// A tiny step sequencer schedules notes ~0.3 s ahead of the audio clock. Tracks: town, one per biome, boss.
const Music = { want: null, track: null, next: 0, step: 0, bpm: 80, nodes: [], out: null, echo: null };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const BIOME_ROOT = { crypt: 45, fungal: 48, magma: 38, frost: 50, void: 43, drowned: 41, clock: 47, blood: 40, shore: 39, gilded: 44 }; // MIDI note of each biome's drone
function setMusic(track) { Music.want = track; }
function stopTrack() {
  if (!Music.out) { Music.track = null; return; }
  const t = AC.currentTime, out = Music.out, nodes = Music.nodes;
  out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (err) { /* already stopped */ } } out.disconnect(); }, 1500);
  Music.out = null; Music.nodes = []; Music.track = null;
}
function startTrack(name) {
  Music.track = name; Music.step = 0; Music.next = AC.currentTime + 0.1;
  const out = AC.createGain(); out.gain.setValueAtTime(0.0001, AC.currentTime); out.gain.linearRampToValueAtTime(1, AC.currentTime + 2); out.connect(musBus);
  const echo = AC.createDelay(1); echo.delayTime.value = 0.42; const fb = AC.createGain(); fb.gain.value = 0.32; const ef = AC.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2200;
  echo.connect(ef).connect(fb).connect(echo); ef.connect(out);
  Music.out = out; Music.echo = echo; Music.nodes = [];
  if (name === 'town') Music.bpm = 84;
  else if (name === 'boss') Music.bpm = 136;
  else if (name.startsWith('dng:')) {
    Music.bpm = 58;
    const root = hz(BIOME_ROOT[name.slice(4)] || 45);
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280; f.Q.value = 1.2;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.06; lg.gain.value = 110; lfo.connect(lg).connect(f.frequency); lfo.start();
    const dg = AC.createGain(); dg.gain.value = 0.028; f.connect(dg).connect(out);
    for (const [m, det] of [[1, -6], [1.5, 4], [0.5, 0]]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = root * m; o.detune.value = det; o.connect(f); o.start(); Music.nodes.push(o); }
    Music.nodes.push(lfo);
  }
}
function musicTick() {
  if (muted || !AC || SET.music === false || !Music.want) { if (Music.track && AC) stopTrack(); return; }
  if (Music.want !== Music.track) { stopTrack(); startTrack(Music.want); }
  const now = AC.currentTime;
  if (Music.next < now) Music.next = now + 0.05;
  const step = 60 / Music.bpm / 2; // eighth notes
  while (Music.next < now + 0.3) { playStep(Music.step, Music.next); Music.step++; Music.next += step; }
}
const TOWN_CHORDS = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]; // D, Bm, G, A
const MINOR_PENTA = [0, 3, 5, 7, 10];
function playStep(i, at) {
  const out = Music.out; if (!out) return;
  const tr = Music.track;
  if (tr === 'town') {
    const ch = TOWN_CHORDS[Math.floor(i / 16) % 4], beat = 60 / Music.bpm;
    if (i % 16 === 0) for (const n of ch) { tone(hz(n - 12), hz(n - 12), beat * 8, 'triangle', 0.018, at, out, 0.8); tone(hz(n - 12) * 1.004, hz(n - 12) * 1.004, beat * 8, 'triangle', 0.012, at, out, 0.9); }
    if (i % 8 === 0) tone(hz(ch[0] - 24), hz(ch[0] - 24), beat * 3.5, 'sine', 0.06, at, out, 0.02);
    if (Math.random() < 0.62) { const n = ch[randi(0, 2)] + pick([0, 12, 12]); tone(hz(n), hz(n), 0.6, 'sine', 0.026, at, Music.echo, 0.004); tone(hz(n), hz(n), 0.5, 'sine', 0.02, at, out, 0.004); }
    if (Math.random() < 0.03) for (let k = 0; k < randi(2, 4); k++) tone(2600 + Math.random() * 900, 3600, 0.06, 'sine', 0.008, at + k * 0.09, out); // birdsong
  } else if (tr === 'boss') {
    const root = 40, pat = [0, 0, 12, 0, 3, 0, 7, 5], beat = 60 / Music.bpm;
    if (i % 2 === 0) tone(140, 42, 0.26, 'sine', 0.16, at, out);
    if (i % 8 === 2 || i % 8 === 6) noise(0.13, 0.06, at, 'highpass', 1800, 0, 0.7, out);
    noise(0.03, 0.018, at, 'highpass', 7000, 0, 0.7, out);
    tone(hz(root + pat[i % 8]), hz(root + pat[i % 8]), beat * 0.45, 'sawtooth', 0.03, at, out);
    if (i % 2 === 1) { const n = 64 + [0, 3, 7, 11, 12, 11, 7, 3][(i >> 1) % 8]; tone(hz(n), hz(n), beat * 0.4, 'triangle', 0.016, at, Music.echo); }
  } else if (tr && tr.startsWith('dng:')) {
    const id = tr.slice(4), root = BIOME_ROOT[id] || 45;
    if (Math.random() < 0.13) { const n = root + 24 + MINOR_PENTA[randi(0, 4)] + pick([0, 12]); tone(hz(n), hz(n), 3, 'sine', 0.024, at, Music.echo, 0.01); tone(hz(n) * 2.01, hz(n) * 2.01, 1.4, 'sine', 0.006, at, out, 0.01); }
    if (i % 16 === 0) tone(hz(root - 12), hz(root - 14), 1.6, 'sine', 0.07, at, out, 0.02);
    if ((id === 'crypt' || id === 'frost' || id === 'fungal' || id === 'drowned') && Math.random() < (id === 'drowned' ? 0.06 : 0.025)) tone(1900 + Math.random() * 600, 700, 0.09, 'sine', 0.014, at, Music.echo); // drips
    if (id === 'magma' && Math.random() < 0.03) noise(1.2, 0.04, at, 'lowpass', 140, 60, 0.7, out); // rumble
    if (id === 'void' && Math.random() < 0.04) tone(hz(root + 36 + MINOR_PENTA[randi(0, 4)]), hz(root + 48), 1.5, 'sine', 0.01, at, Music.echo, 0.4);
  }
}

// ================= ambience and footsteps =================
// Each biome has a few sparse one-shots layered over the music; the town has birds by day and crickets at night.
const STEP_SURF = { crypt: 'stone', fungal: 'moss', magma: 'ash', frost: 'snow', void: 'stone', drowned: 'wet', clock: 'metal', blood: 'flesh', shore: 'ash', gilded: 'stone' };
function footstep(surf) {
  if (muted || !AC) return; const now = AC.currentTime, v = 0.045;
  switch (surf) {
    case 'grass': noise(0.07, v * 0.8, now, 'highpass', 2600); break;
    case 'snow': noise(0.11, v, now, 'bandpass', 1400, 700, 1.4); break;
    case 'wet': noise(0.09, v, now, 'bandpass', 900, 1800, 3); tone(500, 900, 0.05, 'sine', 0.012, now + 0.02); break;
    case 'metal': noise(0.04, v * 0.7, now, 'highpass', 3000); tone(1900, 1700, 0.08, 'triangle', 0.008, now); break;
    case 'moss': noise(0.08, v * 0.7, now, 'lowpass', 500); break;
    case 'ash': noise(0.08, v, now, 'bandpass', 2400, 1200, 0.9); break;
    case 'flesh': noise(0.08, v, now, 'lowpass', 380); tone(90, 60, 0.08, 'sine', 0.02, now); break;
    default: noise(0.05, v, now, 'lowpass', 700); tone(140, 90, 0.04, 'sine', 0.012, now);
  }
}
let ambT = 2, stepD = 0, lastPX = null, lastPZ = 0;
function ambTick(dt) {
  if (muted || !AC || !LV || isPaused()) { lastPX = null; return; }
  // footsteps from distance actually covered
  if (lastPX !== null && !P.dead && P.dodgeT <= 0 && P.dashT <= 0) {
    const m = Math.hypot(P.x - lastPX, P.z - lastPZ);
    if (m < 1) { stepD += m; if (stepD > 1.25) { stepD = 0; footstep(LV.type === 'town' ? 'grass' : STEP_SURF[biomeOf(RUN ? RUN.depth : 1).id] || 'stone'); } }
  }
  lastPX = P.x; lastPZ = P.z;
  ambT -= dt; if (ambT > 0) return;
  ambT = rand(2.5, 6.5);
  const now = AC.currentTime, B = AC.createGain(); B.gain.value = 0.55; B.connect(sfxBus);
  if (LV.type === 'town') {
    if (nightK > 0.5) { for (let k = 0; k < 3; k++) tone(4200, 4300, 0.04, 'sine', 0.008, now + k * 0.07, B); ambT = rand(1.2, 3); } // crickets
    else { const f = rand(2200, 3200); tone(f, f * 1.3, 0.08, 'sine', 0.014, now, B); tone(f * 1.2, f * 0.9, 0.1, 'sine', 0.012, now + 0.12, B); } // a bird
    return;
  }
  if (LV.type !== 'dungeon' || !RUN) return;
  switch (biomeOf(RUN.depth).id) {
    case 'crypt': if (chance(0.6)) { const f = rand(900, 1500); tone(f, f * 0.55, 0.12, 'sine', 0.02, now, B); } else noise(1.4, 0.02, now, 'bandpass', 300, 160, 2, B); break; // drips, distant wind
    case 'drowned': for (let k = 0; k < 2; k++) { const f = rand(700, 1300); tone(f, f * 0.6, 0.1, 'sine', 0.02, now + k * rand(0.2, 0.5), B); } break;
    case 'fungal': for (let k = 0; k < 3; k++) { const f = rand(200, 380); tone(f, f * 1.8, 0.07, 'sine', 0.014, now + k * 0.09, B); } break; // spore pops
    case 'magma': noise(1.6, 0.035, now, 'lowpass', 140, 60, 1, B); tone(48, 40, 1.2, 'sine', 0.03, now, B, 0.3); break; // rumble
    case 'frost': noise(2.4, 0.03, now, 'bandpass', 600, 1400, 4, B); break; // wind through ice
    case 'void': tone(rand(180, 260), rand(150, 300), 2.2, 'sine', 0.012, now, B, 0.8); tone(rand(300, 420), rand(280, 440), 2, 'triangle', 0.006, now + 0.4, B, 0.8); break; // whispers
    case 'clock': for (let k = 0; k < 4; k++) noise(0.03, 0.03, now + k * 0.5, 'highpass', 3500, 0, 1, B); ambT = rand(4, 7); break; // ticking
    case 'shore': noise(2.8, 0.035, now, 'lowpass', 500, 1400, 0.8, B); ambT = rand(3.5, 6); break; // a slow wave washing in
    case 'gilded': { const f = pick([880, 988, 1175, 1319]); tone(f, f, 1.6, 'sine', 0.01, now, B, 0.02); tone(f * 1.5, f * 1.5, 1.2, 'sine', 0.005, now + 0.05, B, 0.02); break; } // a distant chime
    case 'blood': for (let k = 0; k < 2; k++) tone(62, 44, 0.16, 'sine', 0.05, now + k * 0.22, B); ambT = rand(3, 5); break; // heartbeat
  }
}
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
      ringFx(P.x, P.z, 0.4, 4.4, 0.35, 0xffc24a, 3); novaFx(P.x, P.z, 4.6, 0.5, 'arcane', 0xffc24a);
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
      burst(ox, 1, oz, 0x9fd4ff, 18, 5, 0.16); novaFx(ox, oz, 3.4, 0.5, 'frost', 0x9fd4ff); iceFx(ox, oz, 2.8, 12);
      if (LV.type === 'dungeon') for (const e of enemies) {
        if (e.dead) continue; const dx = e.x - ox, dz = e.z - oz, d = Math.hypot(dx, dz);
        if (d > 3.2 + e.r) continue;
        const q = rollDmg(e); withElem('cold', () => damageEnemy(e, q.d * 1.2 * ST.skillM, q.crit, 3, dx / (d || 1), dz / (d || 1), true)); chillEnemy(e, 3.5);
      }
      P.x = r.x; P.z = r.z; P.iframes = Math.max(P.iframes, 0.3); P.face = Math.atan2(r.x - ox, r.z - oz);
      burst(P.x, 1, P.z, 0xb08cff, 18, 5, 0.16); sfx('blink');
      if (SET.cam !== 'top') { CAM.fx = P.x; CAM.fz = P.z; }
      return;
    }
    case 'raise': {
      if (LV.type !== 'dungeon') { floatNum(P.x, 2.2, P.z, 'Not here', 'xp'); return false; }
      const n = tal('legion') >= 3 ? 3 : 2;
      for (let k = 0; k < n; k++) { const a = P.face + Math.PI + (k - (n - 1) / 2) * 0.9; raiseSkeleton(P.x + Math.sin(a) * 1.4, P.z + Math.cos(a) * 1.4); }
      while (minions.length > 4) dismissMinion(minions[0], false);
      ringFx(P.x, P.z, 0.3, 3, 0.4, 0x9fe8a0, 2.2); sfx('summon');
      return;
    }
    case 'bonespear': {
      const t = skillTarget(12); P.face = Math.atan2(t.x - P.x, t.z - P.z);
      spawnProj({ x: P.x + Math.sin(P.face) * 0.6, z: P.z + Math.cos(P.face) * 0.6, a: P.face, spd: 26, owner: 'p', size: 0.22, col: 0xe8e2c8, pierce: 99, mult: (2.6 + 0.2 * tal('marrow')) * ST.skillM, life: LV.type === 'town' ? 0.5 : 0.9, spear: true });
      P.atkT = Math.max(P.atkT, 0.25); P.swingT = P.swingDur = 0.22; sfx('shoot'); shake(0.15);
      return;
    }
    case 'corpse': {
      if (LV.type !== 'dungeon') { floatNum(P.x, 2.2, P.z, 'Not here', 'xp'); return false; }
      const reach = 9 + 2 * tal('plague'), rad = 2.8 * (1 + 0.15 * tal('plague'));
      const near = remains.filter((r) => Math.hypot(r.x - P.x, r.z - P.z) < reach);
      if (!near.length) { floatNum(P.x, 2.2, P.z, 'No fallen foes', 'xp'); return false; }
      near.forEach((r, k) => setTimeout(() => detonateRemains(r, rad), k * 70));
      for (const r of near) removeRemains(r);
      sfx('boom');
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
        if (chance(0.5)) { const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * z.r; boltFx(z.x + Math.sin(a) * r + rand(-1, 1), 8, z.z + Math.cos(a) * r, z.x + Math.sin(a) * r, 0.1, z.z + Math.cos(a) * r, 0xd8e8a0, 0.16); }
        for (const e of enemies) {
          if (e.dead || Math.hypot(e.x - z.x, e.z - z.z) > z.r + e.r) continue;
          const q = rollDmg(e); withElem('shock', () => damageEnemy(e, q.d * 0.45 * ST.skillM, q.crit, 0.5, 0, 0, false)); // storm-tipped: lightning
        }
        sfx('hit');
      }
    } else if (z.kind === 'meteor') {
      const k = clamp(1 - z.t / z.T, 0, 1);
      z.rock.position.set(lerp(z.x - 3, z.x, k), lerp(12, 0.3, k * k), lerp(z.z + 2, z.z, k));
      if (z.t <= 0) {
        world.remove(z.rock);
        ringFx(z.x, z.z, 0.5, 4.2, 0.4, 0xff7a2a, 3.4); novaFx(z.x, z.z, 4.6, 0.7, 'fire', 0xff6a1a); spellLight(z.x, 1.5, z.z, 0xff7a2a, 14, 0.5);
        for (let n = 0; n < 3; n++) burst(z.x, 0.4, z.z, n ? 0xff7a2a : 0xffe08a, 22, 10, 0.24, 2.4);
        let hit = 0;
        for (const e of enemies) {
          if (e.dead) continue; const dx = e.x - z.x, dz = e.z - z.z, d = Math.hypot(dx, dz);
          if (d > z.r + e.r) continue;
          const q = rollDmg(e); withElem('fire', () => damageEnemy(e, q.d * 3.8 * ST.skillM, q.crit, 8, dx / (d || 1), dz / (d || 1), true)); hit++;
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

// ================= the necromancer's dead: skeletons and remains =================
const minions = [], remains = [];
let remainsMesh = null;
function raiseSkeleton(x, z) {
  const cr = makeCreature('grunt', 0xd8d2bc, 0x7cff9a);
  cr.mats.forEach((m) => levelDisp.push(m));
  const m = { x, z, r: 0.34, face: P.face, mesh: cr.g, u: cr.u, h: cr.h, scale: 0.92, biteT: rand(0, 0.5), tgt: null, scanT: 0, t: 20 + 5 * tal('legion'), rise: 0, lunge: 0 };
  const sp = reachTo(x, z); m.x = sp.x; m.z = sp.z;
  m.mesh.scale.setScalar(m.scale); m.mesh.position.set(m.x, -1.2, m.z); m.u.uRim.value.setRGB(0.1, 0.5, 0.16);
  world.add(m.mesh); minions.push(m);
  burst(m.x, 0.3, m.z, 0x9fe8a0, 12, 3, 0.12); burst(m.x, 0.2, m.z, 0xd8d2bc, 8, 2.5, 0.1);
}
function dismissMinion(m, burstDmg) {
  const i = minions.indexOf(m); if (i < 0) return; minions.splice(i, 1);
  burst(m.x, 0.8, m.z, 0xd8d2bc, 14, 4, 0.14);
  if (burstDmg && tal('undying') && LV.type === 'dungeon') {
    ringFx(m.x, m.z, 0.3, 2.6, 0.3, 0x9fe8a0, 2.2);
    for (const e of enemies) if (!e.dead && Math.hypot(e.x - m.x, e.z - m.z) < 2.6 + e.r) damageEnemy(e, ST.dmg * 0.5 * tal('undying'), false, 3, e.x - m.x, e.z - m.z, false);
  }
  world.remove(m.mesh);
}
function clearMinions() { while (minions.length) dismissMinion(minions[0], false); remains.length = 0; if (remainsMesh) remainsMesh.count = 0; }
function updMinions(dt) {
  if (!minions.length) return;
  const fight = LV.type === 'dungeon', pct = 0.45 * (1 + 0.2 * tal('gravepact'));
  for (const m of [...minions]) {
    m.t -= dt; m.biteT -= dt; m.scanT -= dt; m.lunge = Math.max(0, m.lunge - dt); m.rise = Math.min(1, m.rise + dt * 2.2);
    if (m.t <= 0 || !fight || P.dead) { dismissMinion(m, true); continue; }
    if (m.scanT <= 0) {
      m.scanT = 0.3; m.tgt = null; let bd = 1e9;
      for (const e of enemies) { if (e.dead || !e.awake || Math.hypot(e.x - P.x, e.z - P.z) > 11) continue; const d = Math.hypot(e.x - m.x, e.z - m.z) + (e.boss ? -2 : 0); if (d < bd) { bd = d; m.tgt = e; } }
    }
    if (m.tgt && m.tgt.dead) m.tgt = null;
    let tx, tz, spd = 0;
    if (m.tgt) {
      const e = m.tgt, d = Math.hypot(e.x - m.x, e.z - m.z);
      tx = e.x; tz = e.z; spd = d > e.r + m.r + 0.3 ? 6.2 : 0;
      if (d < e.r + m.r + 0.7 && m.biteT <= 0 && m.rise >= 1) {
        m.biteT = 0.9; m.lunge = 0.2;
        const q = rollDmg(e); damageEnemy(e, q.d * pct, q.crit, 1, (e.x - m.x) / (d || 1), (e.z - m.z) / (d || 1), false);
        sfx('hit');
      }
    } else {
      const k = minions.indexOf(m), a = P.face + Math.PI + (k - 1.5) * 0.7, fx = P.x + Math.sin(a) * 1.8, fz = P.z + Math.cos(a) * 1.8, d = Math.hypot(fx - m.x, fz - m.z);
      tx = fx; tz = fz; spd = d > 0.6 ? clamp(d * 2.2, 2, 8) : 0;
    }
    const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
    if (Math.hypot(P.x - m.x, P.z - m.z) > 16) { const sp = reachTo(P.x - Math.sin(P.face) * 1.5, P.z - Math.cos(P.face) * 1.5); m.x = sp.x; m.z = sp.z; }
    else if (spd && d > 0.05 && m.rise >= 1) { const st = Math.min(spd * dt, d); m.x += dx / d * st; m.z += dz / d * st; collide(m); }
    if (d > 0.05 && (spd || m.tgt)) m.face = Math.atan2(dx, dz);
    const cur = m.mesh.rotation.y; m.mesh.rotation.y = cur + angDiff(m.face, cur) * Math.min(1, dt * 10);
    m.mesh.position.set(m.x + Math.sin(m.face) * m.lunge * 1.4, (m.rise - 1) * 1.2 + (m.t < 1 ? (m.t - 1) * 1.2 : 0), m.z + Math.cos(m.face) * m.lunge * 1.4);
    m.u.uWalk.value += dt * (3 + spd * 1.6) * (spd ? 1 : 0);
    m.u.uAmp.value = lerp(m.u.uAmp.value, spd ? 0.8 : 0, Math.min(1, dt * 8));
  }
}
// fallen foes leave remains for 12 seconds, shown as faint green soul-lights the Necromancer can detonate
function addRemains(e) {
  remains.push({ x: e.x, z: e.z, t: 12, big: e.leader || e.champ });
  while (remains.length > 24) remains.shift();
}
function removeRemains(r) { const i = remains.indexOf(r); if (i >= 0) remains.splice(i, 1); }
function detonateRemains(r, rad) {
  if (!LV || LV.type !== 'dungeon') return;
  novaFx(r.x, r.z, rad, 0.45, 'bone', 0x9fe8a0); spellLight(r.x, 1, r.z, 0x7cff9a, 4, 0.25); burst(r.x, 0.6, r.z, 0xb8f0a8, 16, 6, 0.18); burst(r.x, 0.4, r.z, 0xd8d2bc, 10, 5, 0.12);
  const mult = (r.big ? 2.2 : 1.6) * ST.skillM;
  for (const e of enemies) {
    if (e.dead) continue; const dx = e.x - r.x, dz = e.z - r.z, d = Math.hypot(dx, dz);
    if (d > rad + e.r) continue;
    const q = rollDmg(e); damageEnemy(e, q.d * mult, q.crit, 4, dx / (d || 1), dz / (d || 1), true);
  }
  shake(0.12);
}
function updRemains(dt) {
  for (let i = remains.length - 1; i >= 0; i--) { remains[i].t -= dt; if (remains[i].t <= 0) remains.splice(i, 1); }
  if (!remainsMesh) {
    remainsMesh = new THREE.InstancedMesh(G.sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7cff9a).multiplyScalar(1.6), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }), 24);
    remainsMesh.frustumCulled = false; remainsMesh.count = 0;
  }
  if (remainsMesh.parent !== world) world.add(remainsMesh);
  const now = performance.now() / 1000;
  remainsMesh.count = remains.length;
  remains.forEach((r, i) => { const s = (r.big ? 0.26 : 0.18) * Math.min(1, r.t / 2); _rm.makeScale(s, s, s).setPosition(r.x, 0.45 + Math.sin(now * 2.4 + i) * 0.12, r.z); remainsMesh.setMatrixAt(i, _rm); });
  remainsMesh.instanceMatrix.needsUpdate = true;
}
const _rm = new THREE.Matrix4();
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
  if (thunderT <= 0) { thunderT = rand(14, 32); flashT = calm() ? 0 : 0.35; if (AC && !muted) { noise(2.4, 0.28, AC.currentTime + 0.4, 'lowpass', 180, 60, 0.7); tone(55, 38, 2, 'sine', 0.12, AC.currentTime + 0.4); } }
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
// ================= seeded randomness (weekly rift) =================
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function withSeed(seed, fn) { const orig = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = orig; } }
const seededLevel = (fn) => (RUN && RUN.rift && RUN.rift.seed ? withSeed(RUN.rift.seed + RUN.rift.floor * 7919, fn) : fn());

// ================= rift trials =================
const RIFT_MODS = {
  swift: { n: 'Swift', d: 'Foes move 30% faster' },
  brutal: { n: 'Brutal', d: 'Foes hit 40% harder' },
  horde: { n: 'Horde', d: '40% more foes' },
  elite: { n: 'Elite', d: 'Three times as many champions' },
  glass: { n: 'Glass', d: 'You and your foes deal double damage' },
  dark: { n: 'Lightless', d: 'Your lantern reaches half as far' },
  volatile: { n: 'Volatile', d: 'Slain foes burst a moment later' },
  drain: { n: 'Draining', d: 'No health regeneration; draughts heal half' },
  frenzy: { n: 'Frenzied', d: 'Wounded foes enrage, moving and hitting harder' },
};
const RIFT_FLOORS = 3;
const riftDepth = (t) => 2 + 3 * t;
const riftPar = (t) => 210 + 8 * t;
const riftMod = (k) => !!(RUN && RUN.rift && RUN.rift.mods.includes(k));
const riftMax = () => Math.max(1, (S.rift && S.rift.max) || 1);
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function weekKey() { const d = new Date(), j = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const w = Math.ceil(((d - j) / 864e5 + j.getUTCDay() + 1) / 7); return `${d.getUTCFullYear()}-W${w}`; }
function weeklyDef() {
  const k = weekKey(); let h = 2166136261; for (const c of k) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const seed = h >>> 0;
  return withSeed(seed, () => { const keys = Object.keys(RIFT_MODS), mods = []; while (mods.length < 3) { const m = pick(keys); if (!mods.includes(m)) mods.push(m); } return { key: k, seed, tier: 6, mods }; });
}
function startRift(t, weekly, coded) {
  let mods, seed = 0;
  if (coded) { t = coded.tier; mods = coded.mods; seed = coded.seed; }
  else if (weekly) { const W = weeklyDef(); t = W.tier; mods = W.mods; seed = W.seed; }
  else { const n = t >= 10 ? 3 : t >= 4 ? 2 : 1, keys = Object.keys(RIFT_MODS); mods = []; while (mods.length < n) { const m = pick(keys); if (!mods.includes(m)) mods.push(m); } seed = (Math.floor(Math.random() * 0xfffffffe) + 1) >>> 0; } // a seed of its own, so any rift can be shared afterwards
  startDelve(riftDepth(t), [], { mode: 'rift', rift: { tier: t, mods, floor: 1, t0: performance.now(), par: riftPar(t), weekly: !!weekly, seed, code: coded ? coded.code : null, share: coded ? coded.code : riftCode(t, mods, seed) } });
  hint('rift'); ghostRecStart(); if (weekly) autoGhost();
  banner(weekly ? 'Weekly Rift' : coded ? 'Seeded rift' : `Rift tier ${t}`, mods.map((m) => RIFT_MODS[m].n).join(' · '));
}
const riftTime = () => (RUN && RUN.rift ? ((RUN.rift.end || performance.now()) - RUN.rift.t0) / 1000 : 0);
function riftStairs(x, z) { // the last floor's exit is a sealed rift until its guardian falls
  const g = new THREE.Group();
  g.add(mesh(G.fullTorus, mat(0xb07aff, 3.6), 1.1, 1.4, 1.1, 0, 1.5, 0));
  const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(1.05, 1.35, 1); disc.position.y = 1.5; g.add(disc);
  g.position.set(x, 0, z); world.add(g); facers.push(g);
  addInteract({ x, z, r: 1.8, kind: 'portal', label: 'Rift seal', ly: 3.2, cls: '', verb: 'Close the rift', act: () => {
    if (!RUN.rift.done) { toast('The Rift Guardian still stands.', 'var(--bad)'); return; }
    returnToTown(false);
  } });
}
function riftGuardian(r) {
  const [x, z] = [r.x + r.w / 2 + 1.5, r.y + r.h / 2];
  const Gd = GUARDIANS[(RUN.rift.seed !== undefined ? Math.abs(RUN.rift.seed) : randi(0, 999)) % GUARDIANS.length];
  const e = spawnEnemy(Gd.arch, x, z, { leader: true });
  e.name = Gd.n; e.riftGuard = 1; e.hp = e.maxHp = e.maxHp * 2.6; e.dmg *= 1.15; e.scale *= 1.3; e.mesh.scale.setScalar(e.scale);
  e.guardPat = Gd.pats; e.patterns = Gd.pats; e.patT = 3;
  if (e.label) e.label.el.textContent = e.name;
  e.u.uRim.value.setRGB(...Gd.rim);
}
function riftComplete(e) {
  const R = RUN.rift; if (R.done) return;
  R.done = true; R.end = performance.now();
  const secs = riftTime(), fast = secs <= R.par, t = R.tier;
  const shards = (2 + t * 2) * (fast ? 2 : 1);
  S.shards = (S.shards || 0) + shards;
  S.rift = S.rift || { max: 1, best: {} };
  if (fast && !R.weekly && !R.code) S.rift.max = Math.max(S.rift.max || 1, t + 1);
  S.rift.cleared = Math.max(S.rift.cleared || 0, t);
  if (!S.rift.best[t] || secs < S.rift.best[t]) S.rift.best[t] = secs;
  if (R.code) { S.seedBest = S.seedBest || {}; if (!S.seedBest[R.code] || secs < S.seedBest[R.code]) S.seedBest[R.code] = secs; }
  if (R.weekly) { const k = weeklyDef().key; if (!S.weekly || S.weekly.key !== k) S.weekly = { key: k, best: null, tries: 0 }; if (!S.weekly.best || secs < S.weekly.best) S.weekly.best = secs; submitBoard({ time: secs, ghost: ghostString(R) }); }
  if (R.share) { S.lastRift = { code: R.share, secs, tier: t }; dareToast(R.share, secs); }
  partyDone(secs);
  stat('rifts');
  gainXP(80 * t + 40);
  addChest(e.x, e.z, true);
  slowT = 1; shake(0.6); sfx('quest');
  banner(fast ? 'Rift sealed in time' : 'Rift sealed', `${fmtClock(secs)} · +${shards} rift shards${fast && !R.weekly ? ` · tier ${t + 1} unlocked` : ''}`);
}

// ================= the pit (endless arena) =================
const arenaDepthBase = () => Math.max(1, (S.best || 1) - 2);
function startArena() {
  startDelve(arenaDepthBase(), [], { mode: 'arena', arena: { wave: 0, rest: 3.5, base: arenaDepthBase(), exit: null } });
  banner('The Pit', 'Survive the waves. Leave between them to keep what you earned.');
}
function genArena(depth) {
  const W = 40, H = 40, g = new Uint8Array(W * H);
  const room = { x: 7, y: 7, w: 26, h: 26 };
  for (let j = room.y; j < room.y + room.h; j++) for (let i = room.x; i < room.x + room.w; i++) {
    const dx = i + 0.5 - 20, dz = j + 0.5 - 20; if (dx * dx + dz * dz < 13.2 * 13.2) g[j * W + i] = 1; // round floor
  }
  for (const [px, py] of [[-6, -6], [5, -6], [-6, 5], [5, 5]]) g[(20 + py) * W + 20 + px] = 0;
  return { type: 'dungeon', depth, boss: false, pit: true, w: W, h: H, g, rooms: [room], arena: room, exitRoom: room, start: { x: 20.5, z: 26.5 }, explored: new Uint8Array(W * H).fill(1) };
}
function arenaSpot() {
  for (let t = 0; t < 60; t++) {
    const a = rand(0, 6.28), r = rand(7, 12), x = 20 + Math.sin(a) * r, z = 20 + Math.cos(a) * r;
    if (walkable(x, z) && walkable(x + 0.5, z) && walkable(x - 0.5, z) && Math.hypot(x - P.x, z - P.z) > 6) return [x, z];
  }
  return [20, 13];
}
function arenaWave() {
  const A = RUN.arena; A.wave++;
  RUN.depth = A.base + Math.floor((A.wave - 1) / 2);
  const d = RUN.depth, pool = Object.entries(ARCH).filter(([, a]) => d >= a.from && a.ai !== 'totem').map(([k, a]) => [k, a.w]);
  const n = Math.min(22, 4 + Math.round(A.wave * 1.6));
  for (let k = 0; k < n; k++) { const [x, z] = arenaSpot(); const e = spawnEnemy(wpick(pool), x, z, { champ: A.wave >= 4 && chance(0.06 + A.wave * 0.01) }); e.awake = true; }
  if (A.wave % 5 === 0) { const [x, z] = arenaSpot(); const L = spawnEnemy(pick(['brute', 'warden']), x, z, { leader: true }); L.awake = true; if (A.wave % 10 === 0) { L.name = 'Pit Champion'; L.hp = L.maxHp = L.maxHp * 2.5; L.scale *= 1.2; L.mesh.scale.setScalar(L.scale); if (L.label) L.label.el.textContent = L.name; } }
  if (A.exit) { A.exit.i.dead = true; world.remove(A.exit.g); A.exit = null; } // the interact loop drops it and its label
  banner(`Wave ${A.wave}`, `${n + (A.wave % 5 === 0 ? 1 : 0)} foes · depth ${d}`); sfx('ambush'); ringFx(20, 20, 2, 14, 0.6, 0xff6a3a, 2.6);
}
function arenaCleared() {
  const A = RUN.arena, w = A.wave;
  const gold = Math.round(12 * w * Math.pow(1.08, RUN.depth)); S.gold += gold; RUN.gold += gold;
  gainXP(20 * w * (1 + 0.15 * RUN.depth));
  if (w % 5 === 0) { addChest(20, 20, w % 10 === 0); S.shards = (S.shards || 0) + Math.floor(w / 5); toast(`+${Math.floor(w / 5)} rift shards`, '#b07aff'); }
  S.arenaBest = Math.max(S.arenaBest || 0, w);
  A.rest = 7; toast(`Wave ${w} cleared · +${fmt(gold)} gold`, 'var(--brass-2)', true); sfx('quest');
  // a way out between waves
  const g = new THREE.Group(); g.add(mesh(G.fullTorus, mat(0x6ab0ff, 3.4), 0.92, 1.25, 0.92, 0, 1.32, 0)); const disc = new THREE.Mesh(G_PORTAL, PORTAL_MAT); disc.scale.set(0.88, 1.2, 1); disc.position.y = 1.32; g.add(disc);
  g.position.set(20.5, 0, 31); world.add(g); facers.push(g);
  A.exit = { g, i: addInteract({ x: 20.5, z: 31, r: 1.6, kind: 'portal', label: 'Leave the Pit', ly: 3, cls: '', verb: `Leave with wave ${w} won`, act: () => returnToTown(false) }) };
}
function updArena(dt) {
  if (!RUN || !RUN.arena || P.dead) return;
  const A = RUN.arena, alive = enemies.some((e) => !e.dead);
  if (A.wave > 0 && !alive && A.rest <= 0) arenaCleared();
  if (!alive) { A.rest -= dt; if (A.rest <= 0 && (A.wave === 0 || A.exit)) arenaWave(); }
}

// ================= the caravan =================
const CARAVAN_SPOT = { x: 39.5, z: 16.5 };
function rollCaravan() {
  const il = Math.max(1, S.best || 1), st = [];
  for (let k = 0; k < 2; k++) st.push({ item: makeSetItem(il), price: { shards: 12 + Math.floor(il / 3) } });
  const L = genItem(il, { rarity: 4 }); st.push({ item: L, price: { gold: Math.round(L.value * 9) } });
  st.push({ item: genItem(il + 2, { rarity: 3, sock: 2 }), price: { shards: 6 } });
  for (const g of ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'].sort(() => Math.random() - 0.5).slice(0, 3)) st.push({ gem: gemKey(g, il >= 20 ? 3 : 2), price: { gold: il >= 20 ? 2400 : 700 } });
  st.push({ cache: 1, price: { shards: 4 } });
  return { stock: st, until: S.runs + 2 };
}
function caravanHere() {
  if (S.caravan && S.caravan.until >= S.runs) return true;
  if (S.runs >= 2 && (chance(0.35) || ((S.shards || 0) >= 8 && !S.caravanSeen))) { S.caravan = rollCaravan(); S.caravanSeen = 1; return true; }
  S.caravan = null; return false;
}
function buildCaravan(grp) {
  const { x, z } = CARAVAN_SPOT, W = worldMats();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7a3a6a, roughness: 0.9, side: THREE.DoubleSide });
  grp.add(mesh(G.box, W.timber, 3.0, 0.5, 1.6, x, 0.85, z));
  const cover = mesh(G.cyl, cloth, 1.7, 2.9, 1.7, x, 1.1, z); cover.rotation.z = Math.PI / 2; cover.scale.set(1.6, 2.9, 1.7); grp.add(cover);
  for (const [dx, dz] of [[-1, -0.85], [1, -0.85], [-1, 0.85], [1, 0.85]]) { const w = mesh(G.cyl, W.timber, 0.9, 0.12, 0.9, x + dx, 0.45, z + dz); w.rotation.x = Math.PI / 2; grp.add(w); }
  grp.add(mesh(G.box, W.timber, 1.6, 0.08, 0.08, x - 2.2, 0.6, z));
  for (const k of [-0.6, 0, 0.6]) grp.add(mesh(G.box, mat(pick([0xe0aa50, 0xb07aff, 0x5fd38a])), 0.4, 0.4, 0.4, x + k, 1.3, z + 1.0));
  grp.add(mesh(G.cyl, W.iron, 0.06, 2.6, 0.06, x + 1.6, 1.3, z - 0.9), mesh(G.box, mat(0xffc878, 3.4), 0.2, 0.26, 0.2, x + 1.6, 2.6, z - 0.9));
  for (let i = -2; i <= 1; i++) for (let j = -1; j <= 0; j++) markSolid(x + i + 0.5, z + j + 0.5);
}
function spawnCaravan() {
  if (!S.caravan) return;
  const cr = makeCreature('villager', 0x7a3a6a, 0x1a1a1a); cr.mats.forEach((m) => levelDisp.push(m));
  cr.g.position.set(37.4, 0, 18.4); cr.g.rotation.y = -0.6; world.add(cr.g);
  addInteract({ x: 37.4, z: 18.4, r: 1.8, kind: 'npc', label: 'Sabine · Caravan', ly: 2.4, cls: 'npc', verb: 'Browse the caravan', act: () => openPanel('caravan') });
}
function caravanHtml() {
  const C = S.caravan; if (!C) return '<p class="hint">The caravan has moved on.</p>';
  const price = (p) => (p.shards ? `${p.shards} rift shards` : `${fmt(p.gold)} gold`);
  const can = (p) => (p.shards ? (S.shards || 0) >= p.shards : S.gold >= p.gold);
  const rows = C.stock.map((s, i) => {
    if (s.sold) return '';
    const what = s.item ? `<div class="t ${s.item.set ? 'set' : 'r' + s.item.rarity}">${esc(s.item.name)}<small>${s.item.set ? 'Set' : RAR[s.item.rarity].n} ${esc(typeName(s.item))}, item level ${s.item.il}</small></div>${s.item.set ? `<div class="d">${esc(SETS[s.item.set].n)}</div>` : s.item.power ? `<div class="d">${esc(legendOf(s.item).desc)}</div>` : `<div class="d">${s.item.sock} sockets</div>`}`
      : s.gem ? `<div class="t" style="color:${GEMS[gemSplit(s.gem)[0]].c}">${esc(gemName(s.gem))}</div><div class="d">${esc(gemLine(s.gem))}</div>`
      : '<div class="t">Sealed cache<small>a gamble</small></div><div class="d">A Rare, Epic or (rarely) Legendary item from somewhere far away.</div>';
    return `<div class="row"><div>${what}<div class="costs"><span class="cost${can(s.price) ? '' : ' no'}">${price(s.price)}</span></div></div><div class="acts">${s.item ? `<button class="btn ghost sm" type="button" data-act="cvLook" data-i="${i}">Inspect</button>` : ''}<button class="btn" type="button" data-act="cvBuy" data-i="${i}"${can(s.price) && (!s.item && !s.cache || S.inv.length < BAG_CAP) ? '' : ' disabled'}>Buy</button></div></div>`;
  }).join('');
  const look = Panel.cvLook !== undefined && C.stock[Panel.cvLook] && C.stock[Panel.cvLook].item && !C.stock[Panel.cvLook].sold ? itemCard(C.stock[Panel.cvLook].item, S.equip[C.stock[Panel.cvLook].item.slot]) + gearDelta(C.stock[Panel.cvLook].item) : '';
  return `<div class="purse-row"><span><b>${fmt(S.gold)}</b> gold</span><span><b style="color:#b07aff">${S.shards || 0}</b> rift shards</span><span>Here for ${Math.max(0, C.until - S.runs + 1)} more descent${C.until - S.runs ? 's' : ''}</span></div>
    <p class="hint" style="margin:0 0 12px">"Things from the far roads. Shards from the rifts spend as well as gold, better even."</p><div class="two"><div class="rows">${rows || '<p class="hint">Sold out.</p>'}</div><div>${look}</div></div>`;
}
function caravanBuy(i) {
  const s = S.caravan && S.caravan.stock[i]; if (!s || s.sold) return;
  const p = s.price;
  if (p.shards) { if ((S.shards || 0) < p.shards) return; S.shards -= p.shards; } else { if (S.gold < p.gold) return; S.gold -= p.gold; }
  if (s.item) { S.inv.push(s.item); toast(`Bought ${s.item.name}`, s.item.set ? 'var(--set)' : `var(--r${s.item.rarity})`); if (s.item.set) stat('sets'); }
  else if (s.gem) { S.gems[s.gem] = (S.gems[s.gem] || 0) + 1; toast(`Bought ${gemName(s.gem)}`, GEMS[gemSplit(s.gem)[0]].c); }
  else { const it = lootItem(Math.max(1, S.best || 1) + 1, { min: 2, mf: 150 }); S.inv.push(it); toast(`The cache held ${it.name}`, it.set ? 'var(--set)' : `var(--r${it.rarity})`, true); }
  s.sold = true; Panel.cvLook = undefined; sfx('buy');
}

// ================= delve panel tabs for the modes =================
function riftHtml() {
  const mx = riftMax(), t = Math.min(Panel.riftT || mx, mx), W = weeklyDef(), wk = S.weekly && S.weekly.key === W.key ? S.weekly : null;
  const best = (S.rift && S.rift.best) || {};
  return `<div class="purse-row"><span><b style="color:#b07aff">${S.shards || 0}</b> rift shards</span><span>Highest tier unlocked: ${mx}</span><span>Three floors · beat the par time to unlock the next tier and double the shards</span></div>
    <div class="rows">
    <div class="row"><div><div class="t">Rift Trial<small>tier ${t} · depth ${riftDepth(t)} · par ${fmtClock(riftPar(t))}${best[t] ? ` · best ${fmtClock(best[t])}` : ''}</small></div>
      <div class="d">Random modifiers each attempt (${t >= 10 ? 3 : t >= 4 ? 2 : 1} at this tier). The third floor's seal opens when its guardian falls. No way home but a scroll.</div>
      <div class="tierpick">${Array.from({ length: mx }, (_, i) => i + 1).slice(-12).map((k) => `<button class="tog${k === t ? ' on' : ''}" type="button" data-act="riftT" data-t="${k}">${k}</button>`).join('')}</div></div>
      <button class="btn" type="button" data-act="rift">Open tier ${t}</button></div>
    <div class="row"><div><div class="t">Weekly Rift<small>${W.key} · same floors for everyone this week · tier ${W.tier}</small></div>
      <div class="d">${W.mods.map((m) => `<b>${RIFT_MODS[m].n}</b>: ${RIFT_MODS[m].d}`).join('<br>')}</div>${wk && wk.best ? `<div class="d" style="color:var(--ok)">Your best this week: ${fmtClock(wk.best)}</div>` : ''}</div>
      <button class="btn" type="button" data-act="weekly">Enter</button></div>
    <div class="row"><div><div class="t">Daily seed<small>today's floors, the same for anyone with the code</small></div>${(() => { const c = dailyCode(), p = parseRiftCode(c), b = S.seedBest && S.seedBest[c]; return `<div class="d"><code>${c}</code> · tier ${p.tier} · ${p.mods.map((m) => RIFT_MODS[m].n).join(', ')}${b ? ` · <span style="color:var(--ok)">your best ${fmtClock(b)}</span>` : ''}</div><div class="acts"><button class="btn ghost sm" type="button" data-act="copyCode" data-code="${c}">${canLink() ? 'Copy challenge link' : 'Copy code'}</button></div>`; })()}</div>
      <button class="btn" type="button" data-act="daily">Enter</button></div>
${S.lastRift && parseRiftCode(S.lastRift.code) ? `<div class="row"><div><div class="t">Your last rift<small>dare a friend to beat your time on the same floors</small></div><div class="d"><code>${esc(S.lastRift.code)}</code> · tier ${S.lastRift.tier} · sealed in ${fmtClock(S.lastRift.secs)}</div></div>
      <button class="btn ghost" type="button" data-act="copyCode" data-code="${esc(S.lastRift.code)}" data-secs="${Math.round(S.lastRift.secs)}">${canLink() ? 'Copy challenge link' : 'Copy code'}</button></div>` : ''}
    <div class="row"><div><div class="t">Play a code<small>a friend's rift, floor for floor</small></div><input id="seedIn" class="code-in" type="text" placeholder="HD-4-SB-1A2B3C" value="${pendingRift ? pendingRift.code : ''}" autocomplete="off" spellcheck="false"><div class="hint" id="seedMsg"></div></div>
      <button class="btn ghost" type="button" data-act="seedGo">Play</button></div>
    </div>`;
}
function pitHtml() {
  return `<div class="purse-row"><span>Best wave: <b>${S.arenaBest || 0}</b></span><span>Starts at depth ${arenaDepthBase()}</span><span>No gold is lost if you fall in the Pit</span></div>
    <div class="rows"><div class="row"><div><div class="t">The Pit<small>endless waves</small></div><div class="d">Waves grow larger and deeper; a pack leader every fifth wave and a Pit Champion every tenth. Gold and experience after each wave, a chest and rift shards every fifth. A way out opens between waves.</div></div><button class="btn" type="button" data-act="pit">Enter the Pit</button></div></div>`;
}
// ================= the story =================
// Eight chapters, one per biome's keeper, told by Elder Maren when you come home; Aldric's journal pages
// turn up in the deep; the first time down at depth 40 the last keeper is the Hollow King himself.
const STORY = {
  prologue: [
    ['Elder Maren', "So you're the one who answered the bell. I'm Maren. I keep the village, and the village keeps the hole."],
    ['Elder Maren', 'We call it the Delve. Nobody has found the bottom. My grandfather, Aldric, went looking a hundred years ago.'],
    ['Elder Maren', 'He never came back. But things come up out of it. More of them every winter.'],
    ['Elder Maren', "Go down. Bring back what you find, and anything with his name on it. I'd like to know how far he got."],
  ],
  chapters: [
    { n: 'The First Keeper', boss: 'crypt', lines: [
      ['Elder Maren', 'The Bone Regent. I know that name from his stories: the keeper of the first seal.'],
      ['Elder Maren', 'A keeper is meant to hold the dark down, not wear it like a crown. If the keepers have turned, the seals are failing.'],
      ['Elder Maren', 'That would explain the winters. Below the crypt are the Hollows. Mind the spores.'] ] },
    { n: 'Roots of Rot', boss: 'fungal', lines: [
      ['Elder Maren', 'Mycelia was set to bind the walls with root, so nothing could climb. Now the rot does the climbing.'],
      ['Elder Maren', "There's a word in Aldric's pages I can't make sense of. Hollow. He writes it with a capital, like a name."] ] },
    { n: 'Banked Fires', boss: 'magma', lines: [
      ['Elder Maren', 'A forge-wyrm, tamed to keep the fires lit so the cold underneath could not rise. You have let the cold in.'],
      ['Elder Maren', "Don't look at me like that. It was always coming. Better that you meet it before it meets us."] ] },
    { n: 'The Door of Rime', boss: 'frost', lines: [
      ['Elder Maren', 'Aldric wrote that the Sovereign kept the door between the made halls and the Rift.'],
      ['Elder Maren', 'Past her, he said, the deep stops pretending to be a place.'] ] },
    { n: 'A Star That Sings', boss: 'void', lines: [
      ['Elder Maren', "Hollow again. A star that eats light. The pages say he followed it down because it sang to him in my grandmother's voice."],
      ['Elder Maren', 'Three keepers left, if his count was right. Then whatever waits at the bottom.'] ] },
    { n: 'The Sea That Isn\'t', boss: 'drowned', lines: [
      ['Elder Maren', 'He drowned down there once, he wrote, and woke up dry. I think he stopped being entirely himself after that.'],
      ['Elder Maren', 'His handwriting changes on the next page. Smaller. Very neat. As if someone else were holding the pen.'] ] },
    { n: 'Nothing Is Counting', boss: 'clock', lines: [
      ['Elder Maren', 'The Orrery counted the years the Hollow sleeps. You broke it. So now nothing is counting.'],
      ['Elder Maren', 'One keeper left: the Warren, under everything. Bring a lantern you trust. And come back up. Please.'] ] },
    { n: 'The Hollow King', boss: 'blood', lines: [
      ['Elder Maren', '...You found him.'],
      ['Elder Maren', "I always thought I'd be angry. I'm not. I'm glad it was you who brought him home."],
      ['Elder Maren', "He'd want you to keep going down. He never could stop either. The hole has no bottom, but it sleeps easier now."] ] },
  ],
  ending: [
    'The Hollow King kneels. Under the crown of roots is a face you have seen before, in the portrait over Maren\'s hearth.',
    '"Tell her," he says, "that I counted every step back up. I just never reached the last one."',
    'The roots let go. The deep falls quiet. For the first time in a hundred years, the bell in Hearthdeep does not ring.',
  ],
};
const LORE = [
  'Day one. Maren\'s mother made me promise to be home by the first snow. I have a good lantern, a better rope, and no idea how deep this goes.',
  'The crypt is older than the village. Older than the valley, maybe. The bones here were buried facing down, as if to keep watch on something below.',
  'Met the first keeper. He let me pass. He said, "You will come back up this way, or you will not come back at all." Friendly sort.',
  'The mushrooms hum when the lantern goes out. I have stopped letting the lantern go out.',
  'Found the roots that hold the walls. They are warm. They have a pulse. I did not stay to find out whose.',
  'The forge runs on nothing I can name. The wyrm watches me drink from my flask and seems to find it funny.',
  'Cold, below the forge. Not winter cold. The cold of a held breath. Something down here has been holding its breath for a very long time.',
  'The Sovereign asked my name and wrote it in the frost on her door. When I looked back from the stairs, it had melted.',
  'There is a star in the Rift. It sings. I know it is not her. I know. I am going to follow it a little way anyway.',
  'I drowned today. I am writing this, so I suppose I did not. The water here is not water. It remembers you.',
  'Lost count of the days. The clockwork in the vault counts for me: so many turns of the great wheel, so many years asleep.',
  'The wheel says the Hollow wakes soon. The keepers know it. They are frightened, and frightened keepers make poor jailers.',
  'I understand it now. The Hollow is not a hole. It is a hunger, and the deep is just the shape it has eaten out of the world.',
  'Somebody has to sit on the lid. I am already very far down. I am already a little hollow. It might as well be me.',
  'If you are reading this, you came further than anyone. Tell Maren I am sorry about the snow.',
  'The roots are kind, at first. They take the cold away. Then they take the rest. — A.',
];
const story = () => (S.story = S.story || { ch: 0, told: 0, pages: [], final: false, intro: false });
const pageAvailable = (d) => Math.min(LORE.length, 1 + Math.floor((d - 1) / 2.5)); // pages unlock roughly two per biome, in order
function storyBossSlain(e) {
  const St = story(), bi = BIOMES.findIndex((B) => B === biomeOf(RUN.depth));
  if (e.hollowKing) { St.final = true; St.ch = 8; setTimeout(() => playEnding(), 2200); return; }
  if (bi >= 0 && bi < 7 && St.ch < bi + 1) St.ch = bi + 1;
}
function storyOnTown() {
  const St = story();
  if (!St.intro && S.cls) { St.intro = true; dialogue(STORY.prologue); return; }
  if (St.told < St.ch) { const c = STORY.chapters[St.ch - 1]; St.told = St.ch; dialogue([['', `Chapter ${St.ch}: ${c.n}`]].concat(c.lines)); }
}
// a journal page on some floors, in order
function maybePlacePage(rooms) {
  const St = story(), next = St.pages.length;
  if (next >= pageAvailable(LV.depth) || RUN.mode || !chance(0.6)) return;
  const r = pick(rooms.slice(1)); if (!r) return;
  for (let t = 0; t < 30; t++) {
    const x = rand(r.x + 1, r.x + r.w - 1), z = rand(r.y + 1, r.y + r.h - 1);
    if (!walkable(x, z)) continue;
    const g = new THREE.Group();
    const pg = mesh(G.box, mat(0xf2e6c8, 1.6), 0.36, 0.02, 0.46, 0, 0.5, 0); pg.rotation.set(-0.5, 0.3, 0.15); g.add(pg);
    const beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe8b0).multiplyScalar(1.4), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.scale.set(0.3, 4, 0.3); beam.position.y = 2; g.add(beam); levelDisp.push(beam.material);
    g.position.set(x, 0, z); g.userData.spin = 0.8; world.add(g); spinners.push(g);
    const o = addInteract({ x, z, r: 1.4, kind: 'page', label: 'A journal page', ly: 1.6, cls: '', verb: 'Read the page', act: () => {
      const n = St.pages.length; if (n >= LORE.length) return;
      St.pages.push(n); o.dead = true; world.remove(g); sfx('page');
      dialogue([[`Aldric's journal · page ${n + 1} of ${LORE.length}`, LORE[n]]]);
      stat('pages');
    } });
    return;
  }
}
// ================= dialogue overlay =================
let dlgQ = [], dlgOn = false;
function dialogue(lines) { dlgQ = dlgQ.concat(lines); if (!dlgOn) dlgNext(); }
function dlgNext() {
  const el = $('#dlg');
  if (!dlgQ.length) { dlgOn = false; el.hidden = true; return; }
  dlgOn = true; el.hidden = false; mouseDown = false; touchAtk = false;
  const [who, text] = dlgQ.shift();
  el.innerHTML = `<div class="dlg-in">${who ? `<b>${esc(who)}</b>` : ''}<p>${esc(text)}</p><button type="button" class="btn sm" id="dlgNext">${dlgQ.length ? 'Next' : 'Close'}</button></div>`;
  setTimeout(() => { const b = $('#dlgNext'); if (b) b.focus(); }, 30);
}
// ================= the Hollow King =================
function spawnHollowKing(x, z) {
  const e = spawnEnemy('grunt', x, z, { boss: true });
  e.hollowKing = 1; e.name = 'The Hollow King'; $('#bossName').textContent = e.name;
  e.hp = e.maxHp = e.maxHp * 1.6; e.dmg *= 1.1;
  e.patterns = ['beam', 'whirlpool', 'roots', 'summon', 'wave', 'meteor'];
  e.mats[0].emissive.setHex(0x8a5aff).multiplyScalar(0.3);
  bossDress(e.mesh, 'void', e.h); bossDress(e.mesh, 'crown', e.h); // the Warren's antlers are already on the body
  return e;
}
function playEnding() {
  const el = $('#ending');
  el.innerHTML = `<div class="end-in">${STORY.ending.map((t, i) => `<p style="animation-delay:${0.6 + i * 2.6}s">${esc(t)}</p>`).join('')}
    <h2 style="animation-delay:${0.6 + STORY.ending.length * 2.6}s">The End</h2>
    <p class="sub" style="animation-delay:${1.6 + STORY.ending.length * 2.6}s">...but the Delve has no bottom. Every floor below is still new.</p>
    <button class="btn" type="button" id="endOk" style="animation-delay:${2.4 + STORY.ending.length * 2.6}s">Keep delving</button></div>`;
  el.hidden = false; setMusic(null); sfx('quest');
  stat('endings');
}
function storyHtml() {
  const St = story();
  const ch = STORY.chapters.map((c, i) => (i < St.ch ? `<section class="chap"><h3>Chapter ${i + 1}: ${esc(c.n)}</h3>${c.lines.map(([w, t]) => `<p><b>${esc(w)}:</b> ${esc(t)}</p>`).join('')}</section>` : `<section class="chap locked"><h3>Chapter ${i + 1}: ???</h3><p class="hint">Slay the keeper of ${esc(BIOMES[i].name)} (depth ${i * 5 + 5}).</p></section>`)).join('');
  const pages = LORE.map((t, i) => (St.pages.includes(i) ? `<div class="pagec"><b>Page ${i + 1}</b><p>${esc(t)}</p></div>` : `<div class="pagec locked"><b>Page ${i + 1}</b><p class="hint">Not yet found${i >= pageAvailable(S.best || 1) ? ` (lies deeper than depth ${S.best || 1})` : ''}.</p></div>`)).join('');
  return `<p class="hint" style="margin:0 0 12px">${St.final ? 'You reached the bottom of the story. The deep goes on.' : `Chapter ${St.ch} of ${STORY.chapters.length}. ${St.pages.length} of ${LORE.length} journal pages found.`}</p>${ch}<h3 style="margin-top:16px">Aldric's journal</h3><div class="pages">${pages}</div>`;
}
document.addEventListener('click', (ev) => {
  if (ev.target && ev.target.id === 'dlgNext') dlgNext();
  else if (ev.target && ev.target.id === 'endOk') { $('#ending').hidden = true; setMusic('dng:' + biomeOf(RUN ? RUN.depth : 1).id); }
});
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
  whirl: '<path d="M12 4a8 8 0 1 1-7.4 5"/><path d="M12 8a4 4 0 1 1-3.7 2.5"/><path d="M3 5l1.6 4 4-1.4"/>',
  dash: '<path d="M4 12h9m-3-5 5 5-5 5"/><path d="M15 6l5 6-5 6"/><path d="M3 7h3M3 17h3"/>',
  nova: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M5 19l2.8-2.8M16.2 7.8 19 5"/>',
  lock: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  leap: '<path d="M4 19c3-9 9-13 16-13"/><path d="M15 4l5 2-2 5"/><path d="M3 21h8"/><path d="M5 18l-2 3m4-3 1 3"/>',
  cry: '<path d="M4 10v4h3l5 4V6L7 10z"/><path d="M15 9c1 1 1 5 0 6M18 7c2 2 2 8 0 10"/>',
  volley: '<path d="M4 20 18 6M7 20 20 9M4 17 15 4"/><path d="M15 4h3v3M18 6h2v3M20 9v2"/>',
  rain: '<path d="M6 3v7M10 2v7M14 3v7M18 2v7"/><path d="m5 9 1 2 1-2m2-1 1 2 1-2m2 1 1 2 1-2m2-1 1 2 1-2"/><ellipse cx="12" cy="19" rx="8" ry="2.5"/>',
  blink: '<circle cx="6" cy="16" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M8 14l1.5-1.5M11 11l1.5-1.5M14 8l1.5-1.5" stroke-dasharray="1 2"/>',
  meteor: '<circle cx="15" cy="15" r="4"/><path d="M12 12 4 4M14 10 8 3M10 14 3 8"/>',
  raise: '<path d="M9 10a3 3 0 1 1 6 0v2h-6z"/><path d="M10 15h4M12 12v8M8 17h8M4 21h16"/><path d="M10 9.5h.01M14 9.5h.01"/>',
  bonespear: '<path d="M4 20 18 6"/><path d="M18 6l2-2m-2 2 1 4m-1-4-4 1"/><path d="M5 17l2 2M7 15l2 2"/>',
  corpse: '<circle cx="12" cy="13" r="3"/><path d="M12 3v4M12 19v2M4 13H2M22 13h-2M6 7l2 2M18 7l-2 2M6 19l2-2M18 19l-2-2"/>',
  hound: '<path d="M5 18v-5l-2-3 3-1 2-3 2 2h6l3 3v7"/><path d="M8 18v-3m8 3v-3"/><circle cx="6.5" cy="10.5" r=".6"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M12 9v11"/>',
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
  { id: 'dodge', key: 'Space', kb: 'roll', icon: () => 'dodge', act: () => tryDodge(), title: 'Roll: Space, Shift or right mouse' },
  ...[0, 1, 2].map((i) => ({ id: 'sk' + i, key: String(i + 1), kb: 'skill' + (i + 1), icon: () => (SKILLS[i] ? SKILLS[i].id : 'whirl'), act: () => useSkill(i), title: () => (SKILLS[i] ? `${SKILLS[i].n}: ${SKILLS[i].d} Unlocks at level ${SKILLS[i].lvl}. ${SKILLS[i].cd}s cooldown.` : ''), skill: i })),
  { id: 'pot', key: 'Q', kb: 'potion', icon: () => 'potion', act: () => usePotion(false), title: 'Healing Draught' },
  { id: 'gpot', key: 'R', kb: 'gpotion', icon: () => 'gpotion', act: () => usePotion(true), title: 'Greater Draught' },
  { id: 'scroll', key: 'T', kb: 'scroll', icon: () => 'scroll', act: () => useScroll(), title: 'Portal Scroll' },
  { id: 'bag', key: 'I', kb: 'bag', icon: () => 'bag', act: () => openPanel('bag'), title: 'Bag and character' },
];
function buildActionBar() {
  const bar = $('#actionBar');
  bar.innerHTML = SLOTS_BAR.map((s) => `<button class="slot${s.skill !== undefined ? ' skill' : ''}" type="button" data-slot="${s.id}" title="${esc(typeof s.title === 'function' ? s.title() : s.title)}" aria-label="${esc((typeof s.title === 'function' ? s.title() : s.title).split(':')[0])}"><span class="k">${esc(s.kb ? keyLabel(KB[s.kb]) : s.key)}</span><span class="ic">${svg(s.icon())}</span><span class="n"></span><span class="cd"></span></button>`).join('');
  SKILLS.forEach((k, i) => { const b = $('#tS' + (i + 1)); if (b) { b.innerHTML = svg(k.id) + '<i></i>'; b.setAttribute('aria-label', k.n); } });
  const tl = $('#tLock'); if (tl) tl.innerHTML = svg('lock');
  bar.querySelectorAll('.slot').forEach((b) => b.addEventListener('click', () => { const s = SLOTS_BAR.find((q) => q.id === b.dataset.slot); s.act(); }));
}
let lastWk = '';
function hud() {
  if (!S || !ST || !LV) return;
  $('#hLvl').textContent = 'Lv ' + S.level + (S.para ? ` · P${S.para}` : '');
  const f = clamp(P.hp / ST.maxHp, 0, 1);
  $('#hpFill').style.width = f * 100 + '%';
  $('#hpText').textContent = `${Math.ceil(Math.max(0, P.hp))} / ${ST.maxHp}`;
  $('#xpFill').style.width = (S.level >= LVL_CAP ? clamp((S.pxp || 0) / paraNeed(S.para || 0), 0, 1) : clamp(S.xp / xpNeed(S.level), 0, 1)) * 100 + '%';
  $('#xpFill').classList.toggle('para', S.level >= LVL_CAP);
  $('#hGold').textContent = fmt(S.gold) + ' gold';
  const tp = talPoints();
  $("#hMisc").textContent = `Bag ${S.inv.length}/${BAG_CAP}`;
  const buffs = [];
  if (RUN) { if (RUN.buffs.plenty) buffs.push('Plenty'); if (RUN.buffs.might) buffs.push('Might'); if (RUN.buffs.stone) buffs.push('Stoneskin'); if (RUN.buffs.swift) buffs.push('Gale'); if (RUN.rested) buffs.push('Rested'); }
  if (P.frenzy) buffs.push('Frenzy ×' + P.frenzy);
  if (P.horn) buffs.push('Warhorn ×' + P.horn);
  if (P.cryT > 0) buffs.push('War Cry ' + Math.ceil(P.cryT) + 's');
  if (RUN && RUN.shrine) buffs.push(SHRINES[RUN.shrine].n.replace('Shrine of ', ''));
  if (P.chillT > 0) buffs.push('Chilled'); if (P.burnT > 0) buffs.push('Burning');
  $('#hBuffs').innerHTML = (tp ? `<span class="buff tp">${tp} talent point${tp > 1 ? 's' : ''} · K</span>` : '') + buffs.map((b) => `<span class="buff">${b}</span>`).join('');
  if (LV.type === 'town') { $('#hLoc').textContent = 'Hearthdeep · ' + todName() + (weatherName() ? ' · ' + weatherName() : ''); $('#hObj').textContent = 'Shops restock each time you return. The Delve waits at the south gate.'; }
  else {
    const B = biomeOf(LV.depth);
    $('#hLoc').textContent = `Depth ${LV.depth} · ${B.name}`;
    let o;
    if (LV.boss) o = bossRef ? `Slay ${bossRef.name}` : enemies.some((e) => e.boss && !e.dead) ? 'Something vast waits beyond the antechamber' : 'Take the stairs down or the way home';
    else o = 'Find the stairs down';
    if (LV.depth % 5 === 1 && !RUN.rift) o += ' · A way home stands in the first room';
    if (RUN && RUN.rift) { const R = RUN.rift, t = riftTime(); $('#hLoc').textContent = `${R.weekly ? 'Weekly Rift' : R.code ? 'Seeded rift ' + R.code : 'Rift tier ' + R.tier} · floor ${Math.min(R.floor, RIFT_FLOORS)}/${RIFT_FLOORS} · ${B.name}`; o = `${fmtClock(t)} / par ${fmtClock(R.par)} · ${R.mods.map((m) => RIFT_MODS[m].n).join(', ')}${R.floor >= RIFT_FLOORS ? (R.done ? ' · The seal is open' : ' · Slay the Rift Guardian') : ''}`; $('#hObj').classList.toggle('late', t > R.par && !R.done); }
    else if (RUN && RUN.arena) { const A = RUN.arena, left = enemies.filter((e) => !e.dead).length; $('#hLoc').textContent = `The Pit · wave ${A.wave} · depth ${LV.depth}`; o = left ? `${left} foe${left > 1 ? 's' : ''} left · best wave ${S.arenaBest || 0}` : A.exit ? 'Next wave soon. Step into the portal to leave.' : 'The gates are opening...'; }
    else $('#hObj').classList.remove('late');
    $('#hObj').textContent = o;
  }
  if (bossRef) $('#bossFill').style.width = clamp(bossRef.hp / bossRef.maxHp, 0, 1) * 100 + '%';
  // action bar
  const set = (id, n, cd) => { const b = document.querySelector(`[data-slot="${id}"]`); if (!b) return; b.querySelector('.n').textContent = n === null ? '' : n; b.querySelector('.cd').style.height = cd ? clamp(cd, 0, 1) * 100 + '%' : '0'; };
  if (ST.wk !== lastWk) { lastWk = ST.wk; const b = document.querySelector('[data-slot="atk"] .ic'); if (b) b.innerHTML = svg(ST.wk); }
  set('atk', null, P.atkT > 0 ? P.atkT / (curWeapon().cd) : 0);
  set('dodge', null, P.dodgeCd > 0 ? P.dodgeCd / 0.85 : 0);
  set('pot', S.potions, 0); set('gpot', S.gpotions, 0); set('scroll', S.scrolls, 0); set('bag', null, 0);
  SKILLS.forEach((k, i) => {
    const locked = S.level < k.lvl, cd = skillCd[i] / skillCdOf(k);
    set('sk' + i, locked ? 'Lv' + k.lvl : null, locked ? 0 : cd);
    const b = document.querySelector(`[data-slot="sk${i}"]`); if (b) b.classList.toggle('locked', locked);
    const t = $('#tS' + (i + 1));
    if (t) { t.classList.toggle('locked', locked); t.style.setProperty('--cd', locked ? 0 : clamp(cd, 0, 1)); t.querySelector('i').textContent = locked ? 'Lv' + k.lvl : skillCd[i] > 0 ? Math.ceil(skillCd[i]) : ''; }
  });
  $('#tLock').classList.toggle('on', !!lockT);
  // quest tracker
  const q = S.quest, qe = $('#hQuest');
  if (q) { qe.hidden = false; qe.textContent = q.done ? `Elder Maren: ${q.desc}, done. Return to town.` : `Elder Maren: ${q.desc}${q.n > 1 ? ` (${q.have}/${q.n})` : ''}`; qe.classList.toggle('done', q.done); }
  else qe.hidden = true;
  updElderLabel();
  $('#tPot').innerHTML = svg('potion') + `<b>${S.potions + S.gpotions}</b>`;
  $('#tScroll').innerHTML = svg('scroll') + `<b>${S.scrolls}</b>`;
  $('#tBag').innerHTML = svg('bag');
}

// ================= panels =================
const Panel = { kind: null, tab: null, sel: null, forge: {}, elix: {} };
function isPaused() { return !started || Panel.kind !== null || !$('#title').hidden || !$('#death').hidden || dlgOn || PHOTO.on || !$('#ending').hidden || !$('#share').hidden; }
function openPanel(kind, tab) {
  Panel.kind = kind; Panel.sel = null;
  rebinding = null;
  Panel.tab = tab || { settings: 'game', online: 'week', bag: 'gear', home: 'home', smith: 'buy', trader: 'buy', alch: 'buy', delve: 'delve', elder: 'tasks', class: 'class', codex: 'ach' }[kind];
  $('#pClose').hidden = kind === 'class';
  if (kind === 'elder' && !S.quest && !S.questOffers) S.questOffers = makeQuestOffers();
  Panel.abandon = false;
  if ((kind === 'smith') && !S.shop) restock();
  $('#panel').hidden = false; mouseDown = false; touchAtk = false;
  renderPanel();
  $('#pClose').focus({ preventScroll: true });
}
function closePanel() { if (Panel.kind === 'class' && !S.cls) return; Panel.kind = null; $('#panel').hidden = true; hud(); }
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
  const leg = it.set ? setInfoHtml(it) : it.power ? `<div class="leg">${esc(legendOf(it).desc)}</div>` : '';
  const socks = it.sock ? `<div class="socks">${it.gems.map((g) => (g ? `<span class="sock" style="--gc:${GEMS[gemSplit(g)[0]].c}"><i></i>${esc(gemName(g))}: ${esc(gemLine(g))}</span>` : '<span class="sock empty"><i></i>Empty socket</span>')).join('')}</div>` : '';
  return `<div class="icard${it.anc ? ' anc' + it.anc : ''}"><div class="nm r${it.rarity}${it.set ? ' set' : ''}">${esc(it.name)}${it.up ? ` <span class="r0">+${it.up}</span>` : ''}</div>
    <div class="sub">${it.anc ? `<b class="ancb">${ANC[it.anc].n}</b> ` : ''}${it.set ? 'Set' : RAR[it.rarity].n} ${esc(typeName(it))} · ${SLOT_N[it.slot]}</div>${base}${affs ? `<ul>${affs}</ul>` : ''}${socks}${leg}
    <div class="meta"><span>Item level ${it.il}</span><span>Sells for ${fmt(it.value)}g</span>${cmp && cmp !== it ? `<span>vs ${esc(cmp.name)}</span>` : ''}</div></div>`;
}
const cellsHtml = (list, src, cap, priceFn) => {
  let h = list.map((it) => `<button class="cell r${it.rarity}${it.set ? ' set' : ''}${it.anc ? ' anc' + it.anc : ''}${Panel.sel && Panel.sel.src === src && String(Panel.sel.id) === String(it.id) ? ' on' : ''}" type="button" data-act="sel" data-src="${src}" data-id="${it.id}" title="${esc(it.name)}">${itemIcon(it)}${it.up ? `<b>+${it.up}</b>` : ''}${priceFn ? `<i>${fmt(priceFn(it))}</i>` : ''}</button>`).join('');
  if (cap) for (let k = list.length; k < Math.min(cap, list.length + 6); k++) h += '<div class="cell empty"></div>';
  return `<div class="cells">${h}</div>`;
};
function eqHtml() {
  return `<div class="eq-grid">${SLOTS.map((sl) => { const it = S.equip[sl]; const on = Panel.sel && Panel.sel.src === 'equip' && Panel.sel.id === sl;
    return `<button class="eqs ${it ? 'r' + it.rarity : ''}${it && it.set ? ' set' : ''}${on ? ' on' : ''}" type="button" data-act="sel" data-src="equip" data-id="${sl}"${it ? '' : ' disabled'}>${it ? itemIcon(it) : svg(sl === 'weapon' ? 'fists' : sl)}<div style="min-width:0"><span>${SLOT_N[sl]}</span><em class="${it ? 'r' + it.rarity : ''}${it && it.set ? ' set' : ''}">${it ? esc(it.name) : 'Empty'}</em></div></button>`; }).join('')}</div>`;
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
  return `${itemCard(it, src === 'equip' ? null : eq)}${src !== 'equip' ? gearDelta(it) : ''}<div class="acts">${acts}</div>${src !== 'equip' && eq ? `<div class="hint">Currently worn:</div>${itemCard(eq)}` : ''}`;
}
function renderPanel() {
  const p = Panel; if (!p.kind) return;
  let title = '', sub = '', tabs = [], body = '';
  const it = selected();
  switch (p.kind) {
    case 'bag': {
      title = 'Bag'; sub = `Level ${S.level} delver`;
      tabs = [['gear', 'Gear'], ['loadouts', 'Loadouts'], ['mats', 'Materials'], ['char', 'Character'], ['talents', `Talents${talPoints() ? ' (' + talPoints() + ')' : ''}`]];
      if (S.level >= LVL_CAP) tabs.push(['paragon', `Paragon${paraFree() ? ' (' + paraFree() + ')' : ''}`]);
      if (p.tab === 'gear') body = purseRow() + `<div class="inv"><section><h3>Equipped</h3>${eqHtml()}</section><section><h3>Bag<small>${S.inv.length}/${BAG_CAP}</small></h3>${S.inv.length ? cellsHtml(S.inv, 'inv', BAG_CAP) : '<p class="hint">Empty. Loot drops from foes, chests and bosses; walk over an item to pick it up.</p>'}<div class="acts" style="margin-top:10px"><button class="btn ghost" type="button" data-act="salvageJunk"${S.inv.some((q) => q.rarity <= 1) ? '' : ' disabled'}>Salvage all Common and Uncommon</button></div></section><section class="detail">${detailFor(it, 'bag')}</section></div>`;
      else if (p.tab === 'mats') body = matsHtml();
      else if (p.tab === 'loadouts') body = loadoutsHtml();
      else if (p.tab === 'paragon') body = paragonHtml();
      else if (p.tab === 'talents') body = talentsHtml();
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
      tabs = [['home', 'Upgrades'], ['decor', 'Yard'], ['craft', 'Workbench'], ['work', 'Workshop'], ['gems', 'Gems'], ['stash', 'Stash']];
      if (p.tab === 'home') body = homeHtml();
      else if (p.tab === 'decor') body = decorHtml();
      else if (p.tab === 'gems') body = gemsHtml();
      else if (p.tab === 'craft') body = craftHtml();
      else if (p.tab === 'work') body = workHtml(it);
      else body = purseRow() + `<div class="inv"><section><h3>Bag<small>${S.inv.length}/${BAG_CAP}</small></h3>${cellsHtml(S.inv, 'inv', BAG_CAP)}</section><section><h3>Stash<small>${S.stash.length}/${stashCap()}</small></h3>${cellsHtml(S.stash, 'stash', stashCap())}<p class="hint">A bigger house holds more.</p></section><section class="detail">${detailFor(it, 'stash')}</section></div>`;
      break;
    }
    case 'elder': {
      title = 'Elder Maren'; sub = `Keeper of the well · tasks done: ${S.questsDone || 0}`;
      tabs = [['tasks', 'Tasks'], ['skills', 'Skills']];
      body = p.tab === 'skills' ? skillsHtml() : elderHtml();
      break;
    }
    case 'settings': {
      title = 'Settings'; sub = 'Saved in this browser · difficulty and loot filter are per hero';
      tabs = [['game', 'Game'], ['access', 'Accessibility'], ['keys', 'Controls']];
      body = settingsHtml(p.tab);
      break;
    }
    case 'credits': { title = 'Credits'; sub = ''; body = creditsHtml(); break; }
    case 'online': {
      title = 'Online'; sub = ONLINE.party ? `Party ${ONLINE.code.toUpperCase()}` : 'Leaderboards, ghosts and parties';
      tabs = [['week', 'Weekly Rift'], ['deep', 'Deepest'], ['party', 'Party']];
      body = '<p class="hint">Loading\u2026</p>';
      const want = p.tab, tk = (p.onlineTk = (p.onlineTk || 0) + 1);
      onlineHtml(want).then((h) => { if (Panel.kind === 'online' && Panel.tab === want && p.onlineTk === tk) $('#pBody').innerHTML = h; });
      break;
    }
    case 'season': {
      const s = season(); title = s ? `${s.n} Stall` : 'Festival Stall'; sub = 'Trade festival tokens';
      body = seasonHtml();
      break;
    }
    case 'caravan': {
      title = "Sabine's Caravan"; sub = 'Rare goods from the far roads';
      body = caravanHtml();
      break;
    }
    case 'class': {
      title = 'Choose your path'; sub = S.runs || S.kills ? 'Your gear stays with you; talents start fresh' : 'You can change your talents later, but not your class';
      body = classHtml();
      break;
    }
    case 'codex': {
      title = 'Codex'; sub = `${Object.keys(S.ach).length}/${ACH.length} achievements · ${fmtTime(S.time || 0)} played`;
      tabs = [['ach', 'Achievements'], ['story', 'Story'], ['beasts', 'Bestiary'], ['records', 'Records'], ['save', 'Save file']];
      body = codexHtml(p.tab);
      break;
    }
    case 'delve': {
      title = 'The Delve'; sub = `Deepest reached: ${S.best || 'none yet'} · Bosses slain: ${S.bossKills}`;
      tabs = [['delve', 'Descend'], ['rift', 'Rift Trials'], ['pit', 'The Pit']];
      body = p.tab === 'rift' ? riftHtml() : p.tab === 'pit' ? pitHtml() : delveHtml();
      break;
    }
  }
  $('#pTitle').innerHTML = `${esc(title)}<small>${esc(sub)}</small>`;
  $('#pTabs').innerHTML = tabs.length > 1 ? tabs.map(([k, n]) => `<button class="tab${p.tab === k ? ' on' : ''}" type="button" data-act="tab" data-tab="${k}">${n}</button>`).join('') : '';
  $('#pBody').innerHTML = body;
}
function rewardChips(q) { return `<div class="costs"><span class="cost">${fmt(q.gold)} gold</span><span class="cost">${q.ess} Arcane Essence</span><span class="cost">Experience</span>${q.item ? '<span class="cost r2">A Rare or better item</span>' : ''}</div>`; }
function elderHtml() {
  const q = S.quest;
  if (q) {
    const prog = q.n > 1 ? `${q.have} of ${q.n}` : q.done ? 'Done' : 'Not yet';
    return `<p class="hint" style="margin:0 0 12px">${q.done ? '"Well done. The village owes you."' : '"The deep does not wait. Neither should you."'}</p>
      <div class="rows"><div class="row"><div><div class="t">${esc(q.desc)}<small>${prog}</small></div><div class="d">Reward</div>${rewardChips(q)}</div>
      ${q.done ? '<button class="btn" type="button" data-act="qClaim">Claim reward</button>' : Panel.abandon ? '<div class="acts"><button class="btn" type="button" data-act="qAbandonYes">Give up this task</button><button class="btn ghost" type="button" data-act="qAbandonNo">Keep it</button></div>' : '<button class="btn ghost" type="button" data-act="qAbandon">Give up…</button>'}</div></div>`;
  }
  const offers = S.questOffers || [];
  return `<p class="hint" style="margin:0 0 12px">"Three things need doing below. Take one. I will have new work each time you come home."</p>
    <div class="rows">${offers.map((o, i) => `<div class="row"><div><div class="t">${esc(o.desc)}</div><div class="d">Reward</div>${rewardChips(o)}</div><button class="btn" type="button" data-act="qTake" data-i="${i}">Take this task</button></div>`).join('')}</div>`;
}
function skillsHtml() {
  return `<p class="hint" style="margin:0 0 12px">Skills unlock as you level. Keys 1, 2 and 3, or the skill buttons on a touch screen.</p><div class="rows">${SKILLS.map((k) => `<div class="row${S.level < k.lvl ? ' locked' : ''}"><div><div class="t">${k.n}<small>${S.level < k.lvl ? 'unlocks at level ' + k.lvl : 'key ' + k.key + ' · ' + k.cd + 's cooldown'}</small></div><div class="d">${k.d}</div></div><span class="sk-ic">${svg(k.id)}</span></div>`).join('')}</div>`;
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
    S.level >= LVL_CAP ? ['Paragon', `${S.para || 0} (${fmt(S.pxp || 0)} / ${fmt(paraNeed(S.para || 0))})`] : ['Experience', `${fmt(S.xp)} / ${fmt(xpNeed(S.level))}`], ['Deepest depth', S.best], ['Foes slain', fmt(S.kills)], ['Bosses slain', S.bossKills], ['Descents', S.runs], ['Times fallen', S.deaths],
  ];
  const pw = Object.keys(s.powers).map((k) => LEGENDS.find((l) => l.power === k));
  return `<div class="stats">${rows.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('')}</div>${pw.length ? `<h3 style="margin-top:16px">Legendary powers</h3>${pw.map((l) => `<p class="hint" style="color:var(--r4)">${esc(l.name)}: ${esc(l.desc)}</p>`).join('')}` : ''}`;
}
function homeHtml() {
  const restBtn = S.rested ? '<span class="hint">You are rested for your next descent.</span>' : '<button class="btn" type="button" data-act="rest">Sleep until morning</button>';
  return purseRow() + `<div class="rows"><div class="row"><div><div class="t">Your bed</div><div class="d">Sleep to wake rested: +${6 + 4 * S.home.house}% max health for your next descent.</div></div>${restBtn}</div>
    ${Object.entries(HOME).map(([k, h]) => { const lvl = S.home[k] || 0, next = h.levels[lvl + 1];
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
      ${socketHtml(it)}${powerHtml(it)}
      <div class="row"><div><div class="t">Reroll affixes</div><div class="d">${it.rarity === 0 ? 'Common gear has no affixes to reroll.' : 'Keeps rarity, level and upgrades.'}</div>${it.rarity ? costChips(rc) : ''}</div><button class="btn" type="button" data-act="reroll"${it.rarity && hasCost(rc) ? '' : ' disabled'}>Reroll</button></div>`;
  }
  const sel = (q) => Panel.sel && String(Panel.sel.id) === String(q.id);
  const src = (q) => (SLOTS.some((s) => S.equip[s] === q) ? 'equip' : 'inv');
  const cell = (q) => `<button class="cell r${q.rarity}${q.set ? " set" : ""}${sel(q) || (Panel.sel && Panel.sel.src === 'equip' && S.equip[Panel.sel.id] === q) ? ' on' : ''}" type="button" data-act="sel" data-src="${src(q)}" data-id="${src(q) === 'equip' ? q.slot : q.id}" title="${esc(q.name)}">${itemIcon(q)}${q.up ? `<b>+${q.up}</b>` : ''}</button>`;
  return purseRow() + `<div class="two"><section><h3>Your gear<small>worn first</small></h3><div class="cells">${all.map(cell).join('')}</div></section><section class="detail">${act}</section></div>`;
}
function delveHtml() {
  const B = (d) => biomeOf(d).name;
  const wps = S.waypoints.map((d) => `<button class="wpb" type="button" data-act="delve" data-d="${d}"><b>Depth ${d}</b><span>${B(d)}${cycleOf(d) ? ` · Cycle ${cycleOf(d) + 1}` : ''}</span><span>${d === 1 ? 'From the top' : 'Waypoint from a slain boss'}</span></button>`).join('');
  const el = [['might', 'Elixir of Might', '+25% damage'], ['stone', 'Elixir of Stoneskin', '+40% armor'], ['swift', 'Elixir of the Gale', '+15% speed']].concat(S.elixirs.plenty ? [['plenty', 'Elixir of Plenty', '+50% gold and experience']] : []);
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
      stat('crafts'); sfx('craft'); break;
    }
    case 'upItem': if (it) { const c = upCost(it); if (it.up < benchCap() && hasCost(c)) { payCost(c); it.up++; it.value = Math.round(it.value * 1.15); toast(`${it.name} is now +${it.up}`, `var(--r${it.rarity})`); afterGear(); sfx('craft'); } } break;
    case 'reroll': if (it && it.rarity) { const c = rerollCost(it); if (hasCost(c)) { payCost(c); rollAffixes(it); if (it.rarity < 4) nameItem(it); toast(`New affixes on ${it.name}`, `var(--r${it.rarity})`); afterGear(); sfx('craft'); } } break;
    case 'elix': Panel.elix[d.k] = !Panel.elix[d.k]; break;
    case 'qTake': if (!S.quest && S.questOffers) { S.quest = S.questOffers[+d.i]; S.questOffers = null; toast(`New task: ${S.quest.desc}`, 'var(--brass-2)'); sfx('buy'); } break;
    case 'qClaim': claimQuest(); break;
    case 'qAbandon': Panel.abandon = true; break;
    case 'qAbandonNo': Panel.abandon = false; break;
    case 'qAbandonYes': S.quest = null; Panel.abandon = false; S.questOffers = makeQuestOffers(); break;
    case 'delve': { const el = Object.keys(Panel.elix).filter((k) => Panel.elix[k]); Panel.elix = {}; startDelve(+d.d, el); return; }
    case 'rift': startRift(Math.min(Panel.riftT || riftMax(), riftMax()), false); return;
    case 'weekly': startRift(0, true); return;
    case 'riftT': Panel.riftT = +d.t; break;
    case 'pit': startArena(); return;
    case 'daily': { const c = parseRiftCode(dailyCode()); if (c) startRift(0, false, c); return; }
    case 'seedGo': { const inp = $('#seedIn'), c = findRiftCode(inp && inp.value); if (!c) { const m = $('#seedMsg'); if (m) m.textContent = 'That is not a rift code. Codes look like HD-4-SB-1A2B3C.'; return; } pendingRift = null; startRift(0, false, c); return; }
    case 'copyCode': { copyChallenge(d.code, +d.secs || 0); return; }
    case 'cvBuy': caravanBuy(+d.i); break;
    case 'cvLook': Panel.cvLook = +d.i; break;
    default: if (settingsAct(d) || onlineAct(d)) break; if (metaAct(d, it) === 'stop') return;
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
$('#panel').addEventListener('change', (ev) => { // renaming a loadout
  const t = ev.target; if (!t.matches || !t.matches('.lo-name')) return;
  const i = +t.dataset.k; if (S.loadouts[i]) { S.loadouts[i].name = t.value.trim().slice(0, 24) || `Loadout ${i + 1}`; save(); }
});
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
// ================= gamepad =================
// Standard mapping. In play: left stick moves, right stick aims (overhead) or looks (close views),
// A attack, B roll, X use, Y draught, LB/RB/LT skills, RT attack, R3 lock on, d-pad: up greater draught,
// down portal scroll, left cycle lock, right change view; Start menu, Back bag.
// In panels and menus: d-pad or left stick moves focus, A presses, B closes, LB/RB switch tabs.
const pad = { on: false, atk: false, aim: null, prev: [], navT: 0, idx: -1 };
const DEAD = 0.22;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
function padFocusables() {
  const root = !$('#dlg').hidden ? $('#dlg') : !$('#share').hidden ? $('#share') : !$('#ending').hidden ? $('#ending') : !$('#panel').hidden ? $('#panel') : !$('#title').hidden ? $('#title') : !$('#death').hidden ? $('#death') : PHOTO.on ? $('#photo') : null;
  if (!root) return [];
  return [...root.querySelectorAll('button:not([disabled]), [data-act]:not([disabled]), input, textarea')].filter((b) => b.offsetParent !== null);
}
function padMove(dx, dy) { // spatial navigation: the nearest control in the pushed direction
  const list = padFocusables(); if (!list.length) return;
  const cur = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
  if (!cur) { list[0].focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bs = Infinity;
  for (const b of list) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2, vx = bx - ax, vy = by - ay;
    const along = vx * dx + vy * dy; if (along <= 4) continue;
    const across = Math.abs(vx * dy - vy * dx), score = along + across * 2.2;
    if (score < bs) { bs = score; best = b; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
}
function padTab(dir) {
  const tabs = [...document.querySelectorAll('#pTabs [data-tab]')]; if (!tabs.length) return;
  const i = tabs.findIndex((t) => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true');
  tabs[(i + dir + tabs.length) % tabs.length].click();
}
function pollPad(dt) {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  let g = null; for (const q of gps) if (q && q.connected) { g = q; break; }
  if (!g) { if (pad.on) { pad.on = false; pad.atk = false; pad.aim = null; stick.x = stick.y = 0; } return; }
  const b = g.buttons.map((x) => x.pressed || x.value > 0.5), was = pad.prev, hit = (i) => b[i] && !was[i];
  const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
  const any = b.some(Boolean) || lx || ly || rx || ry;
  if (any && !pad.on) { pad.on = true; if (touchMode) setTouchMode(false); }
  if (!pad.on) { pad.prev = b; return; }
  const ui = !$('#panel').hidden || !$('#title').hidden || !$('#death').hidden || !$('#dlg').hidden || !$('#share').hidden || !$('#ending').hidden || PHOTO.on;
  if (ui) {
    pad.atk = false; stick.x = stick.y = 0;
    pad.navT -= dt;
    let mx = (b[15] ? 1 : 0) - (b[14] ? 1 : 0), my = (b[13] ? 1 : 0) - (b[12] ? 1 : 0);
    if (!mx && !my && (Math.abs(lx) > 0.5 || Math.abs(ly) > 0.5)) { if (Math.abs(lx) > Math.abs(ly)) mx = Math.sign(lx); else my = Math.sign(ly); }
    if ((mx || my) && pad.navT <= 0) { padMove(mx, my); pad.navT = was.some(Boolean) && pad.navT > -0.05 ? 0.12 : 0.28; }
    if (!mx && !my) pad.navT = 0;
    if (hit(0)) { const f = document.activeElement; if (f && f !== document.body && f.click) f.click(); else { const l = padFocusables(); if (l[0]) l[0].focus(); } }
    if (hit(1)) { if (!$('#dlg').hidden) dlgNext(); else if (!$('#share').hidden) $('#share').hidden = true; else if (PHOTO.on) exitPhoto(); else if (!$('#panel').hidden) closePanel(); else if (!$('#title').hidden && started) resume(); }
    if (hit(4)) padTab(-1); if (hit(5)) padTab(1);
    if (hit(9) && !$('#title').hidden && started) resume();
    pad.prev = b; return;
  }
  // in play
  stick.x = lx; stick.y = ly;
  pad.atk = b[0] || b[7];
  if (SET.cam === 'top') pad.aim = rx || ry ? Math.atan2(rx, ry) : null;
  else if (rx || ry) { CAM.yaw -= rx * dt * 2.6 * SET.sens; CAM.pitch = clamp(CAM.pitch + ry * dt * 1.6 * SET.sens, -0.5, 1.1); }
  if (hit(1)) tryDodge();
  if (hit(2)) interact();
  if (hit(3)) usePotion(false);
  if (hit(12)) usePotion(true);
  if (hit(13)) useScroll();
  if (hit(4)) useSkill(0); if (hit(5)) useSkill(1); if (hit(6)) useSkill(2);
  if (hit(11) || hit(14)) cycleLock();
  if (hit(15)) cycleCam();
  if (hit(9)) showTitle();
  if (hit(8)) openPanel('bag');
  pad.prev = b;
}
window.addEventListener('gamepadconnected', () => toast('Controller connected', 'var(--ok)'));
document.addEventListener('click', (ev) => { if (ev.target && ev.target.id === 'hintOk') dismissHint(); });
// ================= sharing: frame capture, run card, photo mode =================
function captureFrame() { Post.render(); try { return renderer.domElement.toDataURL('image/png'); } catch (err) { return null; } }
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t; }
  if (line) ctx.fillText(line, x, y); return y + lh;
}
// a portrait: the camera steps round in front of the hero for one frame, then goes back where it was
function heroPortrait() {
  const pos = camera.position.clone(), q = camera.quaternion.clone(), fov = camera.fov, vis = P.mesh.visible;
  const a = P.face + 0.5;
  camera.position.set(P.x + Math.sin(a) * 3.3, 1.75, P.z + Math.cos(a) * 3.3); camera.lookAt(P.x, 1.0, P.z);
  camera.fov = 38; camera.updateProjectionMatrix(); P.mesh.visible = true; if (viewmodel.g) viewmodel.g.visible = false;
  const url = captureFrame();
  camera.position.copy(pos); camera.quaternion.copy(q); camera.fov = fov; camera.updateProjectionMatrix(); P.mesh.visible = vis;
  return url;
}
async function makeRunCard() {
  const shot = await loadImg(heroPortrait());
  const C = clsOf(), W = 1200, H = 630, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), col = '#' + C.col.toString(16).padStart(6, '0');
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#15131c'); bg.addColorStop(1, '#0c0b10'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  if (shot) { // square crop from the middle of the current view
    const s = Math.min(shot.width, shot.height); x.drawImage(shot, (shot.width - s) / 2, (shot.height - s) / 2, s, s, 0, 0, H, H);
    const fade = x.createLinearGradient(H - 160, 0, H, 0); fade.addColorStop(0, 'rgba(12,11,16,0)'); fade.addColorStop(1, 'rgba(12,11,16,1)'); x.fillStyle = fade; x.fillRect(H - 160, 0, 160, H);
  }
  x.fillStyle = col; x.fillRect(H, 0, 6, H);
  const L = H + 48;
  x.fillStyle = '#f2c56b'; x.font = '28px Georgia, serif'; x.fillText('HEARTHDEEP', L, 70);
  x.fillStyle = '#efe8da'; x.font = '64px Georgia, serif'; x.fillText(`${C.n}, level ${S.level}`, L, 150);
  x.fillStyle = '#a49f96'; x.font = '22px system-ui, sans-serif';
  const St = S.story || {}; x.fillText(St.final ? 'Freed the Hollow King' : `Story chapter ${St.ch || 0} of 8`, L, 188);
  const stats = [['Deepest depth', S.best || 0], ['Bosses slain', S.bossKills], ['Foes slain', fmt(S.kills)], ['Best rift', (S.rift && S.rift.cleared) || 0], ['Best Pit wave', S.arenaBest || 0], ['Achievements', `${Object.keys(S.ach || {}).length}/${ACH.length}`]];
  stats.forEach(([k, v], i) => {
    const cx = L + (i % 2) * 250, cy = 250 + Math.floor(i / 2) * 92;
    x.fillStyle = '#7d786e'; x.font = '16px system-ui, sans-serif'; x.fillText(k.toUpperCase(), cx, cy);
    x.fillStyle = '#efe8da'; x.font = '600 40px system-ui, sans-serif'; x.fillText(String(v), cx, cy + 44);
  });
  const w = S.equip.weapon; x.font = '20px system-ui, sans-serif'; x.fillStyle = w && w.set ? '#5fd38a' : w ? ['#bdb7a7', '#74c269', '#5c8ff2', '#b56ff2', '#f19a33'][w.rarity] : '#a49f96';
  wrapText(x, w ? `Wielding ${w.name}` : 'Fighting bare-handed', L, 548, W - L - 40, 26);
  x.fillStyle = '#5a564e'; x.font = '15px system-ui, sans-serif'; x.fillText(`${fmtTime(S.time || 0)} played`, L, 596);
  return cv.toDataURL('image/png');
}
function runSummary() {
  return `Hearthdeep: ${clsOf().n} level ${S.level}, deepest depth ${S.best || 0}, ${S.bossKills} bosses, ${fmt(S.kills)} foes, best rift ${(S.rift && S.rift.cleared) || 0}, best Pit wave ${S.arenaBest || 0}.${canLink() ? ' Play free: ' + playUrl() : ''}`;
}
function showShare(url, title, note) {
  const el = $('#share');
  el.innerHTML = `<div class="share-in"><header><b>${esc(title)}</b><button class="x" type="button" id="shareX">Close</button></header>
    <img src="${url}" alt="${esc(title)}"><p class="hint">${esc(note || 'If your browser blocks saving, right-click or long-press the image to save it.')}</p>
    <div class="acts"><button class="btn" type="button" id="shareCopy">Copy image</button><button class="btn ghost" type="button" id="shareSave">Save image</button><button class="btn ghost" type="button" id="shareText">Copy summary</button></div></div>`;
  el.hidden = false; el.dataset.url = url;
}
// Saving: inside claude.ai the page asks the viewer through the downloads capability; elsewhere a plain download.
let dlNS = null;
try { if (window.claude && window.claude.use) window.claude.use('downloads').then((n) => { dlNS = n; }, () => {}); } catch (err) { /* not hosted in claude.ai */ }
async function saveImage(url) {
  const blob = await (await fetch(url)).blob(), name = `hearthdeep-${Date.now()}.png`;
  if (dlNS) {
    try { await dlNS.save({ filename: name, data: blob }); toast('Image saved.', 'var(--ok)'); }
    catch (err) { if (err && err.code === 'declined') return; toast('Saving is unavailable here. Right-click or long-press the image instead.', 'var(--muted)', true); }
    return;
  }
  if (window.claude && window.claude.use) { toast('Saving is unavailable here. Right-click or long-press the image instead.', 'var(--muted)', true); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function copyImage(url) {
  try { const b = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('Image copied.', 'var(--ok)'); }
  catch (err) { toast('Copying images is blocked here. Save it instead.', 'var(--muted)'); }
}
document.addEventListener('click', async (ev) => {
  const id = ev.target && ev.target.id;
  if (id === 'shareX') $('#share').hidden = true;
  else if (id === 'shareCopy') copyImage($('#share').dataset.url);
  else if (id === 'shareSave') saveImage($('#share').dataset.url);
  else if (id === 'shareText') { try { await navigator.clipboard.writeText(runSummary()); toast('Summary copied.', 'var(--ok)'); } catch (err) { toast(runSummary(), 'var(--muted)', true); } }
  else if (id === 'runCard') { const u = await makeRunCard(); showShare(u, 'Run card'); }
  else if (id === 'mPhoto') { resume(); setTimeout(enterPhoto, 50); }
});

// ================= photo mode =================
const PHOTO = { on: false, yaw: 0, pitch: 0.3, dist: 6, tx: 0, ty: 1.2, tz: 0, fov: 50, filter: 'natural', drag: null };
const FILTERS = {
  natural: null,
  warm: [[1.0, 0.9, 0.8], [1.12, 1.0, 0.82], 1.15, 0.35, 0.9, 1.0],
  cold: [[0.8, 0.92, 1.15], [0.92, 1.0, 1.12], 0.9, 0.4, 0.9, 1.0],
  noir: [[0.9, 0.9, 0.9], [1.05, 1.05, 1.05], 0.0, 0.6, 1.0, 0.95],
  vivid: [[0.92, 0.96, 1.05], [1.05, 1.0, 0.95], 1.45, 0.25, 0.8, 1.05],
};
function enterPhoto() {
  if (!started || P.dead || PHOTO.on) return;
  PHOTO.on = true; PHOTO.tx = P.x; PHOTO.tz = P.z; PHOTO.ty = 1.1;
  PHOTO.yaw = Math.atan2(camera.position.x - P.x, camera.position.z - P.z); PHOTO.dist = clamp(Math.hypot(camera.position.x - P.x, camera.position.z - P.z), 3, 14);
  PHOTO.pitch = 0.6; PHOTO.dist = 6; PHOTO.fov = 50; PHOTO.filter = 'natural';
  document.body.classList.add('photo'); mouseDown = false;
  if (document.pointerLockElement) document.exitPointerLock();
  renderPhotoBar(); $('#photo').hidden = false;
}
function exitPhoto() {
  if (!PHOTO.on) return;
  PHOTO.on = false; document.body.classList.remove('photo'); $('#photo').hidden = true;
  applyFilter('natural'); updateFov(); snapCamera();
}
function applyFilter(k) {
  PHOTO.filter = k;
  if (FILTERS[k]) Post.grade(...FILTERS[k]);
  else if (LV && LV.type === 'town') applyTimeOfDay(true);
  else Post.grade([0.88, 0.94, 1.12], [1.08, 1.0, 0.9], 1.06, 0.5, 1.0, 0.9);
  renderPhotoBar();
}
function renderPhotoBar() {
  $('#photo').innerHTML = `<div class="ph-in"><span class="ph-t">Photo mode</span><div class="ph-f">${Object.keys(FILTERS).map((k) => `<button type="button" class="tog${PHOTO.filter === k ? ' on' : ''}" data-ph="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
    <label class="ph-fov">Lens <input type="range" min="20" max="90" value="${PHOTO.fov}" id="phFov"></label>
    <div class="ph-a"><button class="btn" type="button" id="phShot">Capture</button><button class="btn ghost" type="button" id="phExit">Done</button></div>
    <span class="hint">Drag to orbit · wheel to zoom · WASD to move</span></div>`;
}
function updPhoto(dt) {
  const k = 4 * dt;
  if (held('up')) { PHOTO.tx -= Math.sin(PHOTO.yaw) * k; PHOTO.tz -= Math.cos(PHOTO.yaw) * k; }
  if (held('down')) { PHOTO.tx += Math.sin(PHOTO.yaw) * k; PHOTO.tz += Math.cos(PHOTO.yaw) * k; }
  if (held('left')) { PHOTO.tx -= Math.cos(PHOTO.yaw) * k; PHOTO.tz += Math.sin(PHOTO.yaw) * k; }
  if (held('right')) { PHOTO.tx += Math.cos(PHOTO.yaw) * k; PHOTO.tz -= Math.sin(PHOTO.yaw) * k; }
  if (keys.KeyQ) PHOTO.ty = Math.max(0.2, PHOTO.ty - k * 0.5); if (keys.KeyE) PHOTO.ty = Math.min(8, PHOTO.ty + k * 0.5);
  const cp = Math.cos(PHOTO.pitch);
  camera.position.set(PHOTO.tx + Math.sin(PHOTO.yaw) * cp * PHOTO.dist, PHOTO.ty + Math.sin(PHOTO.pitch) * PHOTO.dist, PHOTO.tz + Math.cos(PHOTO.yaw) * cp * PHOTO.dist);
  camera.lookAt(PHOTO.tx, PHOTO.ty, PHOTO.tz);
  if (camera.fov !== PHOTO.fov) { camera.fov = PHOTO.fov; camera.updateProjectionMatrix(); }
}
document.addEventListener('click', async (ev) => {
  const t = ev.target; if (!t) return;
  if (t.dataset && t.dataset.ph) applyFilter(t.dataset.ph);
  else if (t.id === 'phExit') exitPhoto();
  else if (t.id === 'phShot') { const u = captureFrame(); if (u) { sfx('page'); showShare(u, 'Photo'); } }
});
document.addEventListener('input', (ev) => { if (ev.target && ev.target.id === 'phFov') PHOTO.fov = +ev.target.value; });
window.addEventListener('pointerdown', (ev) => { if (PHOTO.on && ev.target === renderer.domElement) PHOTO.drag = { x: ev.clientX, y: ev.clientY }; });
window.addEventListener('pointermove', (ev) => {
  if (!PHOTO.on || !PHOTO.drag) return;
  PHOTO.yaw -= (ev.clientX - PHOTO.drag.x) * 0.006; PHOTO.pitch = clamp(PHOTO.pitch + (ev.clientY - PHOTO.drag.y) * 0.005, -0.3, 1.45);
  PHOTO.drag = { x: ev.clientX, y: ev.clientY };
});
window.addEventListener('pointerup', () => { PHOTO.drag = null; });
window.addEventListener('wheel', (ev) => { if (PHOTO.on) PHOTO.dist = clamp(PHOTO.dist * (ev.deltaY > 0 ? 1.1 : 0.9), 1.2, 30); }, { passive: true });

// ================= seed codes (daily and shared rifts) =================
const MOD_L = { swift: 'S', brutal: 'B', horde: 'H', elite: 'E', glass: 'G', dark: 'L', volatile: 'V', drain: 'D', frenzy: 'F' };
const riftCode = (tier, mods, seed) => `HD-${tier}-${mods.map((m) => MOD_L[m]).join('')}-${(seed >>> 0).toString(36).toUpperCase()}`;
function parseRiftCode(code) {
  const m = String(code || '').trim().toUpperCase().match(/^HD-(\d{1,2})-([SBHEGLVDF]{1,3})-([0-9A-Z]{1,8})$/);
  if (!m) return null;
  const inv = Object.fromEntries(Object.entries(MOD_L).map(([k, v]) => [v, k]));
  const mods = [...new Set(m[2].split('').map((c) => inv[c]))];
  const tier = clamp(+m[1], 1, 30), seed = parseInt(m[3], 36) >>> 0;
  return seed ? { tier, mods, seed, code: riftCode(tier, mods, seed) } : null;
}
// Challenge links: a rift code can travel as a link (?rift=HD-4-SB-1A2B3C). A code is also found inside any pasted text,
// so a whole message or link can go straight into the "Play a code" box.
const findRiftCode = (text) => { const m = String(text || '').toUpperCase().match(/HD-\d{1,2}-[SBHEGLVDF]{1,3}-[0-9A-Z]{1,8}/); return m ? parseRiftCode(m[0]) : null; };
const canLink = () => /^https?:$/.test(location.protocol) && !window.claude;
const playUrl = () => location.origin + location.pathname;
const riftLink = (code) => `${playUrl()}?rift=${code}`;
let pendingRift = null;
try { pendingRift = findRiftCode(new URLSearchParams(location.search).get('rift')); } catch (err) { pendingRift = null; }
function announcePendingRift() {
  if (!pendingRift) return;
  toast(`A friend's rift is waiting: ${pendingRift.code} (tier ${pendingRift.tier}). Walk to the Delve and choose Rift Trials to race it.`, 'var(--brass)', true);
}
function copyChallenge(code, secs) {
  const link = canLink(), say = secs ? `I sealed this Hearthdeep rift in ${fmtClock(secs)}. Same floors, same foes. Beat it:` : 'Race me in Hearthdeep, same floors, same foes:';
  const t = link ? `${say} ${riftLink(code)}` : code;
  // on a phone the share sheet is the natural way to send a link; everywhere else it goes to the clipboard
  if (link && navigator.share && window.matchMedia('(pointer: coarse)').matches) { navigator.share({ title: 'Hearthdeep', text: say, url: riftLink(code) }).catch(() => {}); return; }
  try { navigator.clipboard.writeText(t).then(() => toast(link ? 'Challenge link copied. Send it to a friend.' : 'Code copied: ' + t, 'var(--ok)'), () => toast(t, 'var(--muted)', true)); } catch (err) { toast(t, 'var(--muted)', true); }
}
// the moment a rift is sealed is when a time is worth showing off: offer the link there, and keep it in the Delve for later
function dareToast(code, secs) {
  const box = $('#toasts'), el = document.createElement('div'); el.className = 'toast big dare';
  const s = document.createElement('span'); s.textContent = `Sealed in ${fmtClock(secs)}. Dare a friend to beat it.`;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.textContent = canLink() ? (navigator.share && window.matchMedia('(pointer: coarse)').matches ? 'Send challenge' : 'Copy challenge link') : 'Copy code';
  b.addEventListener('click', () => { copyChallenge(code, secs); el.remove(); });
  el.append(s, b); box.prepend(el); setTimeout(() => el.remove(), 14000);
}
function dailyCode() {
  const d = new Date(), key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  let h = 2166136261; for (const c of key + 'daily') h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const seed = h >>> 0;
  return withSeed(seed, () => { const keys = Object.keys(RIFT_MODS), mods = []; while (mods.length < 2) { const q = pick(keys); if (!mods.includes(q)) mods.push(q); } return riftCode(4, mods, seed); });
}
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
// ================= settings, accessibility, key bindings =================
const KB_DEFAULT = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'KeyJ', roll: 'Space', use: 'KeyE', potion: 'KeyQ', gpotion: 'KeyR', scroll: 'KeyT', skill1: 'Digit1', skill2: 'Digit2', skill3: 'Digit3', lock: 'Tab', unlock: 'KeyX', view: 'KeyV', bag: 'KeyI', talents: 'KeyK', codex: 'KeyC', photo: 'KeyP' };
const KB_NAMES = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Attack (hold)', roll: 'Roll', use: 'Use, open, talk', potion: 'Healing Draught', gpotion: 'Greater Draught', scroll: 'Portal Scroll', skill1: 'Skill 1', skill2: 'Skill 2', skill3: 'Skill 3', lock: 'Lock on / next', unlock: 'Release lock', view: 'Switch view', bag: 'Bag', talents: 'Talents', codex: 'Codex', photo: 'Photo mode' };
// keys that always work alongside the bindings (arrows move, shift rolls, F uses)
const KB_EXTRA = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ShiftLeft: 'roll', ShiftRight: 'roll', KeyF: 'use', KeyB: 'bag', KeyN: 'talents' };
const KB = Object.assign({}, KB_DEFAULT, SET.keys || {});
const keyAction = (code) => Object.keys(KB).find((a) => KB[a] === code) || KB_EXTRA[code] || null;
const held = (a) => !!keys[KB[a]] || Object.entries(KB_EXTRA).some(([c, x]) => x === a && keys[c]);
const keyLabel = (code) => (code || '').replace(/^Key/, '').replace(/^Digit/, '').replace('Space', 'Space').replace('Arrow', '').replace('Left', ' left').replace('Right', ' right') || '—';
let rebinding = null;

// colour palettes: rarities and the enemy warning colour, readable for common kinds of colour blindness
const PALETTES = {
  default: { n: 'Default', r: ['#bdb7a7', '#74c269', '#5c8ff2', '#b56ff2', '#f19a33'], set: '#5fd38a', tele: 0xff3b2f },
  redgreen: { n: 'Red-green safe', r: ['#c8c4b8', '#56b4e9', '#f0e442', '#cc79a7', '#e69f00'], set: '#00c4a0', tele: 0xffd400 },
  blueyellow: { n: 'Blue-yellow safe', r: ['#c8c4b8', '#3fbf6f', '#ff6f91', '#b56ff2', '#ff8c1a'], set: '#2bd4c0', tele: 0xff2a6a },
};
let TELE_COL = 0xff3b2f;
function applyA11y() {
  const pal = PALETTES[SET.cb] || PALETTES.default, root = document.documentElement.style;
  pal.r.forEach((c, i) => { root.setProperty('--r' + i, c); RCOL[i] = new THREE.Color(c).getHex(); });
  root.setProperty('--set', pal.set); TELE_COL = pal.tele;
  document.body.classList.toggle('cb', SET.cb && SET.cb !== 'default');
  root.setProperty('--ui', String(SET.ui || 1));
  document.body.classList.toggle('calm', !!SET.motion);
}
const calm = () => !!SET.motion; // reduced motion: no shake, hit-stop, slow motion, lens kicks or flashes
function haptic(p) { if (SET.haptics !== false && touchMode && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(p); } catch (err) { /* unsupported */ } } }

// difficulty is per hero
const DIFF = {
  story: { n: 'Story', hp: 0.6, dmg: 0.55, xp: 1, mf: 0, d: 'Foes are much softer and you lose no gold when you fall. For the tale and the sights.' },
  normal: { n: 'Normal', hp: 1, dmg: 1, xp: 1, mf: 0, d: 'The deep as it was meant.' },
  hard: { n: 'Hard', hp: 1.4, dmg: 1.35, xp: 1.3, mf: 40, d: 'Tougher, harder-hitting foes; 30% more experience and 40% more magic find.' },
};
const diff = () => DIFF[(S && S.diff) || 'normal'];

function settingsHtml(tab) {
  const seg = (key, items, per) => `<div class="seg">${items.map(([v, n]) => `<button type="button" class="${String(per ? S[key] || 'normal' : SET[key]) === String(v) ? 'on' : ''}" data-act="${per ? 'sset' : 'gset'}" data-k="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const row = (t, d, c) => `<div class="row"><div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${c}</div>`;
  if (tab === 'access') {
    return `<div class="rows">${row('Colour palette', 'Rarity colours and the warning colour of enemy attacks. The non-default palettes also letter each item by rarity.', seg('cb', Object.entries(PALETTES).map(([k, p]) => [k, p.n])))}
      ${row('Interface size', 'Scales the HUD, menus and dialogue.', seg('ui', [[0.9, 'Small'], [1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger']]))}
      ${row('Reduce motion', 'Turns off screen shake, hit-stop, slow motion, lens kicks and lightning flashes.', seg('motion', [[false, 'Off'], [true, 'On']]))}
      ${row('Screen shake', '', seg('shake', [[true, 'On'], [false, 'Off']]))}
      ${row('Hints', 'First-time tips for new players.', seg('hints', [[true, 'On'], [false, 'Off']]))}
      ${row('Difficulty', `${esc(diff().d)} You can change this any time.`, seg('diff', Object.entries(DIFF).map(([k, q]) => [k, q.n]), true))}</div>`;
  }
  if (tab === 'keys') {
    return `<p class="hint" style="margin:0 0 10px">Choose an action, then press the key you want for it. Arrow keys, Shift and F keep working as well.</p><div class="keys">${Object.keys(KB_DEFAULT).map((a) => `<button type="button" class="keyb${rebinding === a ? ' on' : ''}" data-act="rebind" data-k="${a}"><span>${KB_NAMES[a]}</span><kbd>${rebinding === a ? 'Press a key…' : esc(keyLabel(KB[a]))}</kbd></button>`).join('')}</div>
      <div class="acts" style="margin-top:12px"><button class="btn ghost" type="button" data-act="kbReset">Reset to defaults</button></div>`;
  }
  return `<div class="rows">${row('View', '', seg('cam', [['top', 'Overhead'], ['third', 'Third person'], ['first', 'First person']]))}
    ${row('Graphics', '', seg('q', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]))}
    ${row('Battery saver', 'Caps the frame rate at 30 and keeps resolution low. Good for phones and long sessions.', seg('battery', [[false, 'Off'], [true, 'On']]))}
    ${row('Look speed', '', seg('sens', [[0.6, 'Slow'], [1, 'Normal'], [1.6, 'Fast']]))}
    ${row('Music', '', seg('music', [[true, 'On'], [false, 'Off']]))}
    ${row('Vibration', 'Short buzzes on hits, level-ups and big moments (phones that support it).', seg('haptics', [[true, 'On'], [false, 'Off']]))}
    ${row('Loot filter', 'Turns low items into Arcane Essence the moment you pick them up. Set and legendary items are always kept.', seg('filter', [['none', 'Keep all'], ['common', 'Salvage common'], ['uncommon', 'Salvage common and uncommon']], true))}</div>`;
}
function settingsAct(d) {
  switch (d.act) {
    case 'gset': {
      const k = d.k, v = d.v === 'true' ? true : d.v === 'false' ? false : isNaN(+d.v) ? d.v : +d.v;
      if (k === 'cam') { setCamMode(v); break; }
      if (k === 'q') { setQuality(v); break; }
      SET[k] = v; saveSettings();
      if (k === 'music' && musBus) musBus.gain.value = SET.music === false ? 0 : 0.5;
      if (k === 'battery') { if (v) setQuality('low'); perf.cap = v ? 1 : Math.min(window.devicePixelRatio || 1, Q.ratioCap); perf.ratio = Math.min(perf.ratio, perf.cap); renderer.setPixelRatio(perf.ratio); Post.setup(); }
      applyA11y(); break;
    }
    case 'sset': S[d.k] = d.v; if (d.k === 'diff') toast(`Difficulty: ${DIFF[d.v].n}`, 'var(--brass-2)'); save(); break;
    case 'rebind': rebinding = d.k; break;
    case 'kbReset': Object.assign(KB, KB_DEFAULT); SET.keys = {}; saveSettings(); rebinding = null; buildActionBar(); refreshKeyList(); break;
    default: return false;
  }
  return true;
}
// a key press while rebinding is captured here first
function captureRebind(ev) {
  if (!rebinding) return false;
  ev.preventDefault();
  if (ev.code !== 'Escape') {
    for (const a of Object.keys(KB)) if (KB[a] === ev.code && a !== rebinding) KB[a] = KB[rebinding]; // swap with whatever had it
    KB[rebinding] = ev.code; SET.keys = Object.assign({}, KB); saveSettings(); buildActionBar(); refreshKeyList();
  }
  rebinding = null; renderPanel(); return true;
}
function creditsHtml() {
  return `<div class="credits"><h3>Hearthdeep</h3><p>A JAT Dungeon Crawler by Jeremy Anderson (Jeremy Anderson Tech).</p>
    <h3>Built with</h3><p>three.js r186 · © 2010–2026 three.js authors · MIT licence</p><p>Fonts: IM Fell English SC, Alegreya Sans, Spline Sans Mono (SIL Open Font License), via Google Fonts</p><p>Every texture, model, sound and note of music is generated by the game's own code.</p>
    <h3>Thanks</h3><p>To everyone who answered the bell.</p></div>`;
}
// ================= online play (only on the published page, where the platform offers it) =================
// Leaderboards and ghosts live in the page's shared database; parties use live rooms. On a plain web host
// none of this exists and the game stays single-player. Names are never stored: only ids, resolved to
// names on screen. Everything another player sends is untrusted data.
const ONLINE = { ready: false, db: null, user: null, room: null, me: null, party: null, code: '', peers: [], avatars: new Map(), ghost: null, invite: null, sentT: 0 };
const PARTY_RE = /^[a-z0-9]{5}$/;

async function initOnline() {
  if (!window.claude || typeof window.claude.use !== 'function') return;
  const use = (n) => window.claude.use(n).catch(() => null);
  const [db, user, room] = await Promise.all([use('db'), use('user'), use('room')]);
  Object.assign(ONLINE, { db, user, room });
  if (user) { try { ONLINE.me = await user.id(); } catch (err) { ONLINE.me = null; } }
  ONLINE.ready = !!(db || room);
  document.body.classList.toggle('online', ONLINE.ready);
  if (Panel.kind === 'online') renderPanel();
}
const canBoard = () => !!(ONLINE.db && ONLINE.me);
const canParty = () => !!ONLINE.room;
async function names(ids) {
  const out = {}; const list = [...new Set(ids.filter(Boolean))];
  if (ONLINE.user && list.length) { try { const ps = await ONLINE.user.profiles(list); for (const id of list) out[id] = (ps[id] && ps[id].name) || ''; } catch (err) { /* names stay blank */ } }
  return out;
}

// --- leaderboards: one document per player, holding their best weekly time (with its ghost) and deepest descent ---
let boardBusy = false;
async function submitBoard(extra) {
  if (!canBoard() || boardBusy) return;
  boardBusy = true;
  try {
    const ref = ONLINE.db.doc('lb/' + ONLINE.me), cur = await ref.get(), old = cur.exists ? cur.data() : {};
    const wk = weekKey(), next = { week: old.week || '', time: old.time || null, ghost: old.ghost || '', gcls: old.gcls || '', best: Math.max(old.best || 0, S.best || 0), cls: S.cls || 'warrior', lvl: S.level, para: S.para || 0, at: Date.now() };
    if (old.week !== wk) { next.week = wk; next.time = null; next.ghost = ''; }
    if (extra && extra.time && (!next.time || extra.time < next.time)) { next.time = Math.round(extra.time * 10) / 10; next.ghost = extra.ghost || ''; next.gcls = S.cls || ''; next.week = wk; }
    const changed = ['week', 'time', 'best', 'lvl', 'para', 'cls'].some((k) => old[k] !== next[k]);
    if (changed) await ref.set(next);
  } catch (err) { /* offline or not allowed: the board just won't show this run */ }
  boardBusy = false;
}
async function boardHtml(kind) {
  if (!canBoard()) return '<p class="hint">Leaderboards appear on the published page when you are signed in.</p>';
  let rows = [];
  try {
    const col = ONLINE.db.collection('lb');
    const snap = kind === 'deep' ? await col.orderBy('best', 'desc').limit(20).get() : await col.where('week', '==', weekKey()).orderBy('time', 'asc').limit(20).get();
    rows = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).filter((r) => (kind === 'deep' ? r.best > 0 : r.time > 0));
  } catch (err) { return '<p class="hint">The leaderboard could not be reached just now. Try again in a moment.</p>'; }
  if (!rows.length) return `<p class="hint">${kind === 'deep' ? 'No descents recorded yet. Yours is sent when you return to town.' : 'Nobody has sealed this week’s rift yet. Be the first: Delve, Weekly Rift.'}</p>`;
  const nm = await names(rows.map((r) => r.id));
  const C = (k) => (CLASSES[k] ? CLASSES[k].n : '');
  return `<ol class="board">${rows.map((r, i) => `<li class="${r.id === ONLINE.me ? 'me' : ''}"><span class="rk">${i + 1}</span><span class="who">${esc(nm[r.id] || (r.id === ONLINE.me ? 'You' : 'A delver'))}<small>${esc(C(r.cls))} · level ${+r.lvl || 1}${r.para ? ` · Paragon ${+r.para}` : ''}</small></span><b>${kind === 'deep' ? 'Depth ' + (+r.best) : fmtClock(+r.time)}</b>${kind === 'week' && r.ghost && r.id !== ONLINE.me ? `<button class="btn ghost sm" type="button" data-act="ghostPick" data-k="${esc(r.id)}">Race ghost</button>` : ''}</li>`).join('')}</ol>`;
}

// --- ghosts: a weekly-rift run recorded as [floor, x, z] every quarter second ---
const GHOST_STEP = 250;
function ghostRecStart() { if (RUN && RUN.rift && RUN.rift.weekly) RUN.rift.rec = { t0: RUN.rift.t0, pts: [] }; }
function ghostRecTick() {
  const R = RUN && RUN.rift; if (!R || !R.rec || R.done) return;
  const i = Math.floor((performance.now() - R.rec.t0) / GHOST_STEP);
  while (R.rec.pts.length <= i && R.rec.pts.length < 4800) R.rec.pts.push(`${R.floor}.${Math.round(P.x * 10)}.${Math.round(P.z * 10)}`);
}
const ghostString = (R) => (R && R.rec ? R.rec.pts.join(',') : '');
async function ghostPick(id) {
  if (!canBoard()) return;
  try {
    const d = await ONLINE.db.doc('lb/' + id).get(); if (!d.exists) return;
    const g = d.data(); if (!g.ghost || g.week !== weekKey()) { toast('That ghost has faded.', 'var(--bad)'); return; }
    const nm = await names([id]);
    ONLINE.ghost = { pts: String(g.ghost).split(',').slice(0, 4800).map((s) => s.split('.').map(Number)), time: +g.time, name: nm[id] || 'A delver', cls: CLASSES[g.gcls] ? g.gcls : 'warrior' };
    toast(`Racing ${ONLINE.ghost.name}'s ghost (${fmtClock(ONLINE.ghost.time)}) on the next Weekly Rift.`, '#9fd8ff', true);
  } catch (err) { toast('Could not fetch that ghost.', 'var(--bad)'); }
}
async function autoGhost() { // with no ghost picked, race this week's fastest that is not you
  if (ONLINE.ghost || !canBoard()) return;
  try {
    const snap = await ONLINE.db.collection('lb').where('week', '==', weekKey()).orderBy('time', 'asc').limit(5).get();
    const best = snap.docs.find((d) => d.id !== ONLINE.me && d.data().ghost);
    if (best) await ghostPick(best.id);
  } catch (err) { /* race alone */ }
}

// --- avatars for ghosts and party members: a hero-shaped, translucent figure with a name ---
function makeAvatar(cls, col, label) {
  const cr = makeCreature('villager', CLASSES[cls] ? CLASSES[cls].col : 0x7a8a9a, 0xffffff);
  cr.mats.forEach((m) => { m.transparent = true; m.opacity = 0.55; m.depthWrite = false; if (m.emissive) { m.emissive.set(col); m.emissiveIntensity = 0.5; } levelDisp.push(m); });
  world.add(cr.g);
  const A = { g: cr.g, u: cr.u, x: P.x, z: P.z, tx: P.x, tz: P.z, face: 0, label: addLabel(label, P.x, 2.4, P.z, 'npc ghostlbl') };
  return A;
}
function dropAvatar(A) { if (!A) return; world.remove(A.g); if (A.label) removeLabel(A.label); }
function moveAvatar(A, dt) {
  const dx = A.tx - A.x, dz = A.tz - A.z, d = Math.hypot(dx, dz);
  if (d > 6) { A.x = A.tx; A.z = A.tz; } else { const k = Math.min(1, dt * 10); A.x += dx * k; A.z += dz * k; }
  if (d > 0.05) A.face = Math.atan2(dx, dz);
  A.g.position.set(A.x, 0, A.z); A.g.rotation.y += angDiff(A.face, A.g.rotation.y) * Math.min(1, dt * 10);
  A.u.uWalk.value += dt * (d > 0.05 ? 9 : 0); A.u.uAmp.value = lerp(A.u.uAmp.value, d > 0.05 ? 0.8 : 0, Math.min(1, dt * 8));
  if (A.label) { A.label.x = A.x; A.label.z = A.z; }
}
let ghostAv = null;
function updGhost(dt) {
  const G2 = ONLINE.ghost, R = RUN && RUN.rift;
  const show = G2 && R && R.weekly && LV && LV.type === 'dungeon' && !R.done;
  if (!show) { if (ghostAv) { dropAvatar(ghostAv); ghostAv = null; } return; }
  const i = Math.min(G2.pts.length - 1, Math.floor((performance.now() - R.t0) / GHOST_STEP)), p = G2.pts[i];
  if (!p || p[0] !== R.floor) { if (ghostAv) { dropAvatar(ghostAv); ghostAv = null; } return; }
  if (!ghostAv || ghostAv.lv !== LV) { dropAvatar(ghostAv); ghostAv = makeAvatar(G2.cls, 0x9fd8ff, `Ghost · ${G2.name} · ${fmtClock(G2.time)}`); ghostAv.lv = LV; ghostAv.x = p[1] / 10; ghostAv.z = p[2] / 10; }
  ghostAv.tx = p[1] / 10; ghostAv.tz = p[2] / 10; moveAvatar(ghostAv, dt);
}

// --- parties: a named live room; you see each other in town and in the same seeded rift ---
const partyScene = () => (!LV ? '' : LV.type === 'town' ? 'town' : RUN && RUN.rift && (RUN.rift.code || RUN.rift.weekly) ? `rift:${RUN.rift.code || weekKey()}:${RUN.rift.floor}` : '');
async function partyJoin(code) {
  if (!canParty()) return;
  code = String(code || '').trim().toLowerCase();
  if (!PARTY_RE.test(code)) { toast('A party code is five letters or digits.', 'var(--bad)'); return; }
  await partyLeave(true);
  try {
    const R = await ONLINE.room.join('hd-party-' + code);
    ONLINE.party = R; ONLINE.code = code;
    R.onPeers((ch) => { ONLINE.peers = ch.peers.filter((p) => !p.isMe); for (const p of ch.joined) if (!p.isMe) partyNote(p, 'joined the party'); for (const p of ch.left) if (!p.isMe) partyNote(p, 'left the party'); if (Panel.kind === 'online') renderPanel(); });
    R.on('party', (m) => partyMsg(m));
    toast(`In party ${code.toUpperCase()}`, '#9fd8ff', true);
    partyPresence(true);
  } catch (err) { toast(err && err.code === 'not_permitted' ? 'Parties are not available on this page.' : 'Could not join the party. Try again.', 'var(--bad)'); }
  if (Panel.kind === 'online') renderPanel();
}
async function partyLeave(quiet) {
  const R = ONLINE.party; ONLINE.party = null; ONLINE.code = ''; ONLINE.peers = []; ONLINE.invite = null;
  for (const A of ONLINE.avatars.values()) dropAvatar(A); ONLINE.avatars.clear();
  if (R) { try { await R.leave(); } catch (err) { /* already gone */ } if (!quiet) toast('Left the party.', 'var(--muted)'); }
  hideInvite();
}
async function partyNote(p, what) { const nm = await names([p.by || (p.presence && p.presence.uid)]); toast(`${nm[p.by] || nm[p.presence && p.presence.uid] || 'A delver'} ${what}.`, '#9fd8ff'); }
function partyPresence(force) {
  const R = ONLINE.party; if (!R) return;
  const now = performance.now(); if (!force && now - ONLINE.sentT < 150) return; ONLINE.sentT = now;
  R.presence({ uid: ONLINE.me || null, cls: S.cls || 'warrior', lvl: S.level, para: S.para || 0, sc: partyScene(), x: Math.round(P.x * 10) / 10, z: Math.round(P.z * 10) / 10, f: Math.round(P.face * 100) / 100, hp: Math.round((P.hp / ST.maxHp) * 100), rift: RUN && RUN.rift ? { fl: RUN.rift.floor, done: !!RUN.rift.done, t: RUN.rift.done ? Math.round(riftTime() * 10) / 10 : null } : null }).catch(() => {});
}
function updParty(dt) {
  if (!ONLINE.party) return;
  partyPresence(false);
  const sc = partyScene(), seen = new Set();
  for (const p of ONLINE.peers) {
    const q = p.presence || {}; if (!q.sc || q.sc !== sc || typeof q.x !== 'number' || typeof q.z !== 'number') continue;
    seen.add(p.peer);
    let A = ONLINE.avatars.get(p.peer);
    if (!A || A.lv !== LV) { if (A) dropAvatar(A); A = makeAvatar(CLASSES[q.cls] ? q.cls : 'warrior', 0x7cff9a, 'Party member'); A.lv = LV; A.x = q.x; A.z = q.z; A.peer = p.peer; ONLINE.avatars.set(p.peer, A); nameAvatar(A, p); }
    A.tx = clamp(q.x, 0, 200); A.tz = clamp(q.z, 0, 200); moveAvatar(A, dt);
  }
  for (const [k, A] of ONLINE.avatars) if (!seen.has(k)) { dropAvatar(A); ONLINE.avatars.delete(k); }
}
async function nameAvatar(A, p) { const id = p.by || (p.presence && p.presence.uid); const nm = await names([id]); if (A.label) A.label.el.textContent = nm[id] || 'Party member'; }
// the party leader (anyone) can send everyone into the same seeded rift; each player chooses to follow
function partyGo(code) {
  const R = ONLINE.party; if (!R) return;
  R.emit('party', { k: 'go', code }).catch((err) => toast(err && err.code === 'not_permitted' ? 'Only people who can use this page can call a rift.' : 'The call did not go through.', 'var(--bad)'));
}
async function partyMsg(m) {
  const d = m && m.data; if (!d || typeof d !== 'object' || m.isMe) return;
  const nm = await names([m.by]), who = nm[m.by] || 'A party member';
  if (d.k === 'go') { const c = parseRiftCode(d.code); if (!c) return; ONLINE.invite = { code: c.code, who }; showInvite(); }
  else if (d.k === 'done' && typeof d.t === 'number') toast(`${who} sealed the rift in ${fmtClock(d.t)}.`, '#9fd8ff', true);
}
function partyDone(t) { const R = ONLINE.party; if (R) R.emit('party', { k: 'done', t: Math.round(t * 10) / 10 }).catch(() => {}); }
function showInvite() {
  const I = ONLINE.invite, el = $('#invite'); if (!I || !el) return;
  $('#invTxt').textContent = `${I.who} calls the party into rift ${I.code}.`;
  el.hidden = false;
}
function hideInvite() { const el = $('#invite'); if (el) el.hidden = true; }
document.addEventListener('click', (ev) => {
  const b = ev.target.closest && ev.target.closest('#invGo, #invNo'); if (!b) return;
  const I = ONLINE.invite; hideInvite(); ONLINE.invite = null;
  if (b.id === 'invGo' && I) { const c = parseRiftCode(I.code); if (c && LV.type === 'town') startRift(0, false, c); else if (c) toast('Head back to town first, then answer the call from the party panel.', 'var(--bad)'); }
});
function newPartyCode() { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

function onlineTick(dt) { if (!ONLINE.ready) return; ghostRecTick(); updGhost(dt); updParty(dt); }

// --- the Online panel ---
async function onlineHtml(tab) {
  if (!ONLINE.ready) return '<p class="hint">Leaderboards, ghosts and parties work on the published page. This copy of the game is offline.</p>';
  if (tab === 'party') {
    if (!canParty()) return '<p class="hint">Parties are not available on this page.</p>';
    const P2 = ONLINE.party;
    if (!P2) return `<p class="hint" style="margin:0 0 12px">Start a party and share its code, or type a friend’s. You will see each other walking the village, and inside the same seeded rift you can race side by side. Each of you fights your own foes.</p>
      <div class="acts"><button class="btn" type="button" data-act="ptNew">Start a party</button><input id="ptCode" class="lo-name" maxlength="5" placeholder="code" aria-label="Party code" style="max-width:120px;text-transform:uppercase"><button class="btn ghost" type="button" data-act="ptJoin">Join</button></div>`;
    const ids = ONLINE.peers.map((p) => p.by || (p.presence && p.presence.uid)); const nm = await names(ids);
    const list = ONLINE.peers.map((p) => { const q = p.presence || {}, id = p.by || q.uid; return `<li><span class="who">${esc(nm[id] || 'A delver')}<small>${esc(CLASSES[q.cls] ? CLASSES[q.cls].n : '')}${q.lvl ? ` · level ${+q.lvl}` : ''} · ${q.sc === 'town' ? 'in the village' : String(q.sc || '').startsWith('rift') ? `in a rift, floor ${q.rift ? +q.rift.fl : '?'}${q.rift && q.rift.done ? ', sealed' : ''}` : 'delving'}</small></span>${typeof q.hp === 'number' ? `<b>${clamp(+q.hp, 0, 100)}%</b>` : ''}</li>`; }).join('');
    const code = RUN && RUN.rift && RUN.rift.code ? RUN.rift.code : dailyCode();
    return `<div class="purse-row"><span>Party <b>${esc(ONLINE.code.toUpperCase())}</b></span><span>${ONLINE.peers.length} other${ONLINE.peers.length === 1 ? '' : 's'} here</span></div>
      <ol class="board">${list || '<li><span class="who">Waiting for friends<small>Send them the code above</small></span></li>'}</ol>
      <div class="acts" style="margin-top:12px"><button class="btn" type="button" data-act="ptGo" data-k="${esc(code)}"${LV.type === 'town' ? '' : ' disabled'}>Call everyone into rift ${esc(code)}</button>${ONLINE.invite ? `<button class="btn" type="button" data-act="ptAnswer">Answer ${esc(ONLINE.invite.who)}’s call</button>` : ''}<button class="btn ghost" type="button" data-act="ptLeave">Leave party</button></div>`;
  }
  return `<p class="hint" style="margin:0 0 12px">${tab === 'deep' ? 'Deepest descent by each delver on this page.' : `This week’s rift (${esc(weeklyDef().key)}), fastest first. Race a ghost to see their path beside yours; with none chosen you race the fastest.`}</p>${await boardHtml(tab === 'deep' ? 'deep' : 'week')}`;
}
function onlineAct(d) {
  switch (d.act) {
    case 'ghostPick': ghostPick(d.k); return true;
    case 'ptNew': partyJoin(newPartyCode()); return true;
    case 'ptJoin': { const v = $('#ptCode'); partyJoin(v ? v.value : ''); return true; }
    case 'ptLeave': partyLeave(false); return true;
    case 'ptGo': { const c = parseRiftCode(d.k); if (c && LV.type === 'town') { partyGo(c.code); closePanel(); startRift(0, false, c); } return true; }
    case 'ptAnswer': { const I = ONLINE.invite; ONLINE.invite = null; hideInvite(); const c = I && parseRiftCode(I.code); if (c && LV.type === 'town') { closePanel(); startRift(0, false, c); } return true; }
    default: return false;
  }
}
// ================= input =================
const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (ev) => {
  if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
  if (captureRebind(ev)) return;
  if (dlgOn) { if (['Space', 'Enter', 'KeyE', 'Escape'].includes(ev.code)) { ev.preventDefault(); dlgNext(); } return; }
  if (!$('#share').hidden) { if (ev.code === 'Escape') $('#share').hidden = true; return; }
  if (PHOTO.on) { keys[ev.code] = true; if (ev.code === 'Escape' || ev.code === KB.photo) exitPhoto(); return; }

  if (!$('#title').hidden) { if (ev.code === 'Escape' && started) resume(); return; }
  if (!$('#death').hidden) return;
  if (Panel.kind) {
    const a = keyAction(ev.code);
    if (ev.code === 'Escape' || ((a === 'bag' || a === 'talents') && Panel.kind === 'bag') || (a === 'codex' && Panel.kind === 'codex')) { ev.preventDefault(); closePanel(); }
    return;
  }
  if (GAME_KEYS.has(ev.code) || ev.code === KB.roll || ev.code === KB.lock) ev.preventDefault();
  if (ev.code === 'Backquote' || ev.code === 'F3') { ev.preventDefault(); perf.on = !perf.on; $('#perf').hidden = !perf.on; return; }
  if (ev.code === 'AltLeft' || ev.code === 'AltRight') { ev.preventDefault(); document.body.classList.add('alt'); }
  if (ev.repeat) return;
  keys[ev.code] = true;
  if (ev.code === 'Escape') { showTitle(); return; }
  switch (keyAction(ev.code)) { // actions follow the player's key bindings (Settings, Controls)
    case 'roll': tryDodge(); break;
    case 'use': interact(); break;
    case 'potion': usePotion(false); break;
    case 'gpotion': usePotion(true); break;
    case 'scroll': useScroll(); break;
    case 'bag': openPanel('bag'); break;
    case 'talents': openPanel('bag', 'talents'); break;
    case 'codex': openPanel('codex'); break;
    case 'lock': cycleLock(); break;
    case 'unlock': releaseLock(); break;
    case 'skill1': useSkill(0); break;
    case 'skill2': useSkill(1); break;
    case 'skill3': useSkill(2); break;
    case 'view': cycleCam(); break;
    case 'photo': enterPhoto(); break;
  }
});
window.addEventListener('keyup', (ev) => { keys[ev.code] = false; if (ev.code === 'AltLeft' || ev.code === 'AltRight') document.body.classList.remove('alt'); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; touchAtk = false; document.body.classList.remove('alt'); });
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.pointerType === 'touch') { setTouchMode(true); if (SET.cam !== 'top') { lookTouch = ev.pointerId; lookX = ev.clientX; lookY = ev.clientY; } return; }
  if (isPaused()) return;
  // third and first person: the first click captures the mouse for looking around (optional; works without it)
  if (SET.cam !== 'top' && document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* not available */ } }
  if (ev.button === 0) mouseDown = true;
  if (ev.button === 1) { ev.preventDefault(); if (lockT) releaseLock(); else cycleLock(); }
  if (ev.button === 2) tryDodge();
});
let lookTouch = null, lookX = 0, lookY = 0;
canvas.addEventListener('pointermove', (ev) => { if (ev.pointerId === lookTouch && !isPaused()) { lookBy((ev.clientX - lookX) * 1.6, (ev.clientY - lookY) * 1.6); lookX = ev.clientX; lookY = ev.clientY; } });
for (const t of ['pointerup', 'pointercancel']) canvas.addEventListener(t, (ev) => { if (ev.pointerId === lookTouch) lookTouch = null; });
canvas.addEventListener('wheel', (ev) => {
  if (isPaused()) return; ev.preventDefault();
  if (SET.cam === 'top') camZoom = clamp(camZoom * (ev.deltaY > 0 ? 1.08 : 0.93), 0.55, 1.5);
  else if (SET.cam === 'third') CAM.dist = clamp(CAM.dist * (ev.deltaY > 0 ? 1.1 : 0.9), 2.2, 9);
}, { passive: false });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) mouseDown = false; });
window.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'touch' && ev.button === 0) mouseDown = false; });
window.addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'touch') return;
  if (touchMode && ev.pointerType === 'mouse') setTouchMode(false);
  mouse.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  if (SET.cam !== 'top' && !isPaused() && started) lookBy(ev.movementX || 0, ev.movementY || 0);
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on; document.body.classList.toggle("touch", on);
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
  tap('#tView', cycleCam); tap('#tDodge', tryDodge);
  tap('#tS1', () => useSkill(0)); tap('#tS2', () => useSkill(1)); tap('#tS3', () => useSkill(2)); tap('#tLock', () => (lockT ? releaseLock() : cycleLock())); tap('#tUse', interact); tap('#tPot', () => usePotion()); tap('#tScroll', useScroll); tap('#tBag', () => openPanel('bag'));
})();

// ================= title, menu, death =================
let started = false;
let titleSlots = false, eraseSlot = -1;
function slotLine(i) {
  const s = peekSlot(i); if (!s) return null;
  return `${s.cls ? CLASSES[s.cls].n : 'Delver'}, level ${s.level} · deepest ${s.best || 0}${s.time ? ' · ' + fmtTime(s.time) : ''}`;
}
function showTitle() {
  if (started && !titleSlots) {
    $('#menuBtns').innerHTML = '<button class="btn" type="button" id="mResume">Resume</button><button class="btn ghost" type="button" id="mCodex">Codex</button><button class="btn ghost" type="button" id="mPhoto">Photo mode</button><button class="btn ghost" type="button" id="mSlots">Change hero</button>'
      + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  } else {
    $('#menuBtns').innerHTML = `<div class="slots">${[0, 1, 2].map((i) => { const l = slotLine(i); return `<div class="slotrow${i === SET.slot && started ? ' cur' : ''}"><button class="btn${l ? '' : ' ghost'} slotb" type="button" id="mSlot${i}"><b>Slot ${i + 1}</b><span>${l ? esc(l) : 'Empty · begin a new hero'}</span></button>${l ? `<button class="btn ghost sm" type="button" id="mDel${i}" aria-label="Erase slot ${i + 1}">Erase</button>` : ''}</div>`; }).join('')}</div>`
      + (started ? '<button class="btn ghost" type="button" id="mBack">Back</button>' : '') + `<button class="btn ghost" type="button" id="mSound">${muted ? 'Sound off' : 'Sound on'}</button>`;
  }
  $('#opts').innerHTML = optRow('View', 'cam', [['top', 'Overhead'], ['third', 'Third person'], ['first', 'First person']]) + optRow('Graphics', 'q', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']])
    + '<div class="opt"><span>More</span><div class="seg"><button type="button" id="mSettings">Settings</button><button type="button" id="mAccess">Accessibility</button><button type="button" id="mKeys">Controls</button><button type="button" id="mCredits">Credits</button><button type="button" id="mOnline" class="online-only">Online</button></div></div>';
  if (document.pointerLockElement) document.exitPointerLock();
  $('#title').hidden = false; $('#confirmNew').hidden = true; mouseDown = false;
  const b = $('#mResume') || $('#mSlot' + (SET.slot || 0)); if (b) b.focus();
}
function resume() { $('#title').hidden = true; }
function optRow(label, key, items) { return `<div class="opt"><span>${label}</span><div class="seg">${items.map(([v, n]) => `<button type="button" class="${String(SET[key]) === String(v) ? 'on' : ''}" data-opt="${key}" data-v="${v}">${n}</button>`).join('')}</div></div>`; }
function setQuality(q) { SET.q = q; saveSettings(); applyQuality(); perf.cap = Math.min(window.devicePixelRatio || 1, Q.ratioCap); perf.ratio = Math.min(perf.ratio, perf.cap); renderer.setPixelRatio(perf.ratio); Post.setup(); warmLevel(); }
// behind the title menu the camera drifts slowly around the village
let flyA = 0.6;
function titleFly(dt) {
  flyA += dt * (calm() ? 0.02 : 0.06);
  const r = 26, cx = P.x, cz = P.z - 4;
  camera.position.set(cx + Math.sin(flyA) * r, 13 + Math.sin(flyA * 0.7) * 2, cz + Math.cos(flyA) * r);
  camera.lookAt(cx, 1.5, cz);
}
function begin() {
  started = true; snapCamera();
  $('#title').hidden = true; $('#hud').hidden = false;
  setTouchMode(touchMode || window.matchMedia('(pointer: coarse)').matches);
  $('#touch').hidden = !touchMode;
  hud(); save();
  if (!S.cls) openPanel('class');
  else if (S.runs === 0 && S.kills === 0) hint('move');
  if (S.cls) announcePendingRift();
}
function freshHero() {
  S = newSave(); uid = 1; RUN = null; P.dead = false;
  S.equip.weapon = genItem(1, { slot: 'weapon', kind: 'sword', rarity: 0 });
  S.equip.chest = genItem(1, { slot: 'chest', rarity: 0 });
  setClassSkills(); buildActionBar();
  ST = calcStats(); rebuildHero(); loadTown();
}
$('#title').addEventListener('click', (ev) => {
  const id = ev.target.closest('button') && ev.target.closest('button').id;
  if (id === 'mResume') resume();
  else if (id === 'mCodex') { resume(); openPanel('codex'); }
  else if (id === 'mSlots') { titleSlots = true; showTitle(); }
  else if (id === 'mBack') { titleSlots = false; showTitle(); }
  else if (id && id.startsWith('mSlot')) {
    const i = +id.slice(5);
    if (started && i === SET.slot) { titleSlots = false; resume(); return; }
    save(); SET.slot = i; saveSettings();
    const s = peekSlot(i);
    if (s) switchToSave(s); else freshHero();
    titleSlots = false; begin();
  } else if (id && id.startsWith('mDel')) { eraseSlot = +id.slice(4); $('#confirmNew').hidden = false; $('#confirmNew span').textContent = `Erase slot ${eraseSlot + 1}? That hero is gone for good.`; $('#btnWipe').focus(); }
  else if (id === 'btnWipe') {
    try { localStorage.removeItem(SLOT_KEYS[eraseSlot]); localStorage.removeItem(SLOT_KEYS[eraseSlot] + '.bak'); } catch (err) { /* ignore */ }
    if (eraseSlot === SET.slot) { started = false; freshHero(); $('#hud').hidden = true; $('#touch').hidden = true; }
    eraseSlot = -1; titleSlots = !started ? false : titleSlots; showTitle();
  }
  else if (id === 'btnKeep') $('#confirmNew').hidden = true;
  else if (id === 'mSound') { toggleMute(); showTitle(); }
  else if (id === 'mSettings' || id === 'mAccess' || id === 'mKeys') { resume(); openPanel('settings', { mSettings: 'game', mAccess: 'access', mKeys: 'keys' }[id]); }
  else if (id === 'mCredits') { resume(); openPanel('credits'); }
  else if (id === 'mOnline') { resume(); openPanel('online'); }
  const o = ev.target.closest('[data-opt]');
  if (o) {
    if (o.dataset.opt === 'cam') setCamMode(o.dataset.v);
    else if (o.dataset.opt === 'q') setQuality(o.dataset.v);
    else if (o.dataset.opt === 'music' || o.dataset.opt === 'shake' || o.dataset.opt === 'hints') { SET[o.dataset.opt] = o.dataset.v === 'true'; saveSettings(); if (musBus) musBus.gain.value = SET.music === false ? 0 : 0.5; }
    else { SET.sens = +o.dataset.v; saveSettings(); }
    showTitle();
  }
});
function toggleMute() { muted = !muted; $('#btnMute').textContent = muted ? 'Sound off' : 'Sound on'; if (!muted) { audio(); sfx('coin'); } }
$('#btnMute').addEventListener('click', toggleMute);
$('#btnMenu').addEventListener('click', showTitle);
$('#btnView').addEventListener('click', cycleCam);
$('#btnRevive').addEventListener('click', () => { $('#death').hidden = true; P.dead = false; returnToTown(true); });
function refreshKeyList() {
  const k = (a) => esc(keyLabel(KB[a]));
  $('#keyList').innerHTML = [
    [`${k('up')}${k('left')}${k('down')}${k('right')}`, 'Move'], ['Mouse', 'Aim or look'], ['Left click', 'Attack (hold)'], [k('roll'), 'Roll'], [`${k('skill1')} ${k('skill2')} ${k('skill3')}`, 'Skills'], [k('lock'), 'Lock on / next'], [k('unlock'), 'Release lock'], [k('use'), 'Use, open, talk'], [k('view'), 'Switch view'], ['Wheel', 'Zoom'], [`${k('potion')} / ${k('gpotion')}`, 'Draught / Greater'], [k('scroll'), 'Portal scroll'], [k('bag'), 'Bag and character'], [k('talents'), 'Talents'], [k('codex'), 'Codex'], [k('photo'), 'Photo mode'], ['Alt', 'Show all item names'], ['Esc', 'Menu'], ['`', 'Performance readout'],
  ].map(([a, v]) => `<div><kbd>${a}</kbd><span>${v}</span></div>`).join('') + '<div><kbd>Touch</kbd><span>Stick moves; drag the screen to look in close views</span></div>';
}

// ================= performance readout & adaptive resolution =================
const perf = { on: false, acc: 0, cpu: 0, n: 0, slow: 0, fast: 0, ratio: Math.min(window.devicePixelRatio || 1, Q.ratioCap), cap: Math.min(window.devicePixelRatio || 1, Q.ratioCap), ms: 0, cpuMs: 0 };
renderer.setPixelRatio(perf.ratio);
function perfTick(dt, cpuMs) {
  perf.acc += dt; perf.cpu += cpuMs; perf.n++;
  if (perf.n < 60) return;
  perf.ms = (perf.acc / perf.n) * 1000; perf.cpuMs = perf.cpu / perf.n;
  perf.acc = perf.cpu = 0; perf.n = 0;
  // adaptive pixel ratio: fill rate scales with ratio squared, so trade sharpness for frames when the device struggles
  if (perf.ms > 24) { perf.slow++; perf.fast = 0; } else if (perf.ms < 17.5) { perf.fast++; perf.slow = 0; } else { perf.slow = perf.fast = 0; }
  if (perf.slow >= 2 && perf.ratio > 1) { perf.ratio = Math.max(1, perf.ratio - 0.25); renderer.setPixelRatio(perf.ratio); perf.slow = 0; }
  if (perf.slow >= 3 && perf.ratio <= 1 && SET.q !== 'low' && !perf.dropped) { perf.dropped = true; setQuality(SET.q === 'high' ? 'medium' : 'low'); toast(`Graphics lowered to ${SET.q} to keep the game smooth. Change it in the menu.`, 'var(--muted)'); perf.slow = 0; }
  if (perf.fast >= 6 && perf.ratio < perf.cap) { perf.ratio = Math.min(perf.cap, perf.ratio + 0.25); renderer.setPixelRatio(perf.ratio); perf.fast = 0; }
  if (perf.on) {
    const i = renderer.info;
    $('#perf').textContent = `${perf.ms.toFixed(1)} ms/frame · ${perf.cpuMs.toFixed(1)} ms CPU\n${i.render.calls} draw calls · ${fmt(i.render.triangles)} tris\n${i.memory.geometries} geometries · ${i.programs.length} programs\npixel ratio ${perf.ratio.toFixed(2)} · ${SET.q} · ${enemies.length} foes`;
  }
}

// ================= main loop =================
const timer = new THREE.Timer();
timer.connect(document);
let hudT = 0, miniT = 0, saveT = 0, achT = 0;
let DBG = { turbo: 0 };
function simTick(dt) {
  let gdt = dt;
  if (hitStop > 0) { hitStop -= dt; gdt = dt * 0.06; }
  if (slowT > 0) { slowT -= dt; if (!calm()) gdt *= 0.3; } // the moment a boss falls
  if (!isPaused()) {
    updPlayer(gdt);
    if (LV.type === 'dungeon') {
      flowT -= gdt;
      const ti = tidx(P.x, P.z);
      if (flowT <= 0 || ti !== flowTile) { flowT = 0.35; flowTile = ti; computeFlow(); }
      for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.dead) updEnemy(e, gdt); }
      separate();
      for (const e of enemies) if (!e.dead) collide(e);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
      // anything past the fog is invisible anyway: skip drawing it (and its shadow passes)
      // and only foes close to the lantern throw shadows: the six-sided shadow pass costs per caster
      const vr = SET.cam === 'top' ? 34 : SET.cam === 'third' ? 25 : 22;
      for (const e of enemies) {
        const d = Math.hypot(e.x - P.x, e.z - P.z), v = e.boss || d < vr;
        if (e.mesh.visible !== v) { e.mesh.visible = v; if (e.bar) e.bar.visible = v; if (e.auraRing) e.auraRing.visible = v; }
        const cs = d < 10 || e.boss;
        if (e.cs !== cs) { e.cs = cs; for (const c of e.mesh.children) if (c.userData.cs) c.castShadow = cs; }
      }
      updTeles(gdt); updDrops(gdt); updTraps(gdt); updAmbush(gdt);
      revealT -= dt; if (revealT <= 0) { revealT = 0.2; reveal(); }
    }
    updProjs(gdt);
    updCorpses(gdt); updPet(gdt); updFxLife(gdt); updArena(gdt);
    if (LV.type === 'town') { updVillagers(gdt); updTimeOfDay(gdt); }
    updWeather(dt);
    S.time = (S.time || 0) + dt;
    updInteract();
    saveT += dt; if (saveT > 20) { saveT = 0; save(); }
  }
}
let lastFrameTs = 0;
function frame(ts) {
  if (SET.battery && ts - lastFrameTs < 31) return; // battery saver: about 30 frames a second
  lastFrameTs = ts;
  timer.update(ts);
  const dt = Math.min(0.05, timer.getDelta());
  elapsed += dt; U_TIME.value = elapsed;
  renderer.info.reset();
  const t0 = performance.now();
  loadingTick();
  if (!levelReady) { perfTick(dt, 0); return; }
  // DBG.turbo runs extra fixed simulation steps per rendered frame (used by the autoplay test bots)
  const steps = 1 + (DBG.turbo | 0);
  for (let st = 0; st < steps; st++) simTick(st ? 0.05 : dt);
  const gdt = dt * (hitStop > 0 ? 0.06 : 1) * (slowT > 0 ? 0.3 : 1); // effects follow the slowed clock too
  for (const s of spinners) s.rotation.y += dt * (s.userData.spin || 1);
  updParts(gdt); updSwings(dt); updRings(dt); updVfx(dt); if (started) onlineTick(dt); updTorchLights(dt); updBlobs(); updLock();
  if (PHOTO.on) updPhoto(dt); else if (!started && LV.type === 'town' && !$('#title').hidden) titleFly(dt); else if (P.mesh) updCamera(dt);
  updTrail(gdt); updFacers();
  musicTick(); ambTick(dt);
  // shader time, point-size scale and the things that follow the camera
  const ps = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  burstSys.pts.material.uniforms.uScale.value = ps; ambientSys.m.uniforms.uScale.value = ps;
  ambientSys.m.uniforms.uTime.value = elapsed; ambientSys.m.uniforms.uCenter.value.set(P.x, 0, P.z);
  for (const fm of FLAME_MATS) { fm.uniforms.uTime.value = elapsed; fm.uniforms.uScale.value = ps; }
  sky.position.copy(camera.position);
  if (LV.type === 'town' && sun.castShadow) { // keep the sun's shadow box centred on the player, snapped to texels to avoid shimmer
    const step = 44 / sun.shadow.mapSize.x, sx = Math.round(P.x / step) * step, sz = Math.round(P.z / step) * step;
    sun.position.set(sx + sunOff.x, sunOff.y, sz + sunOff.z); sun.target.position.set(sx, 0, sz);
  }
  Post.render();
  updOverlays(dt); updLockMark();
  pollPad(dt); updHints(dt);
  hudT -= dt; if (hudT <= 0) { hudT = 0.1; hud(); achT -= 1; if (achT <= 0) { achT = 10; checkAch(); } }
  miniT -= dt; if (miniT <= 0 && LV) { miniT = 0.1; drawMini(); }
  perfTick(dt, performance.now() - t0);
}

// ================= boot =================
function boot(data) {
  applyA11y(); refreshKeyList(); initOnline();
  // installable, offline-capable when served from a web host with the manifest (not inside claude.ai)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel=manifest]') && !window.claude) navigator.serviceWorker.register('sw.js').catch(() => {});
  applyQuality();
  renderer.setPixelRatio(perf.ratio);
  resize();
  $('#btnView').textContent = window.innerWidth < 640 ? 'View' : 'View: ' + CAM_NAMES[SET.cam]; $('#crosshair').hidden = SET.cam === 'top';
  const saved = (data && data.S) || loadSave();
  if (saved) { S = normalizeSave(saved); fixUid(); setClassSkills(); buildActionBar(); ST = calcStats(); loadTown(); }
  else freshHero();
  if (data && data.started) { begin(); } else showTitle();
  renderer.setAnimationLoop(frame);
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ S, started }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
return { get S() { return S; }, get RUN() { return RUN; }, get P() { return P; }, get LV() { return LV; }, enemies, renderer, startDelve, begin, freshHero, openPanel, closePanel, loadDungeon, get ready() { return levelReady; }, perf, debug: { damageEnemy, parseRiftCode, setTouchMode, returnToTown, afterGear, DBG, stick, interacts, interact, usePotion, get skillCd() { return skillCd; }, isPaused, snapCamera, nextFloor, loadTown, rollCaravan, startRift, startArena, die, gainXP, hurtPlayer, calcStats, xpNeed, ARCH, BIOMES, genItem, makeSetItem, scene, sun, hemi, sky, walkable, spawnEnemy, bossPattern, get LVL() { return LV; }, applyTimeOfDay, get pet() { return pet; }, villagers, zones, chooseClass, checkAch, playerAttack, CAM, setCamMode, useSkill, cycleLock, get lockT() { return lockT; }, corpses, skillCd, questEvent, makeQuestOffers, claimQuest, get trail() { return trail; }, spawnDrop, bossIntro, LEGENDS, applyLoadout, ascend, gainParagon, GUARDIANS, season, minions, remains, initOnline, ONLINE, submitBoard, get drops() { return drops; } } };
};
