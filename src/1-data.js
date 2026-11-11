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
