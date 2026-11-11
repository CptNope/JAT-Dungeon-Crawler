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
