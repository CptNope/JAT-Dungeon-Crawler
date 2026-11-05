# Hearthdeep — JAT Dungeon Crawler

A browser action-RPG built on three.js r186. A village sits on the lip of a hole with no bottom: delve through endless procedurally generated floors, bring loot home, craft at your bench, and grow your shack into a keep.

## Play

Any static host works (GitHub Pages: Settings → Pages → deploy from `main`, root). Locally, ES modules need a server:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

`dist/hearthdeep.html` is a single self-contained file that loads three.js from jsDelivr instead of `vendor/`.

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Aim |
| Left click (hold) or J | Attack |
| Space, Shift or right click | Roll (brief invulnerability) |
| E | Use, open, talk |
| Q / R | Healing Draught / Greater Draught |
| T | Portal Scroll (opens a way home) |
| I | Bag, materials, character sheet |
| Esc | Menu |
| `` ` `` or F3 | Performance readout |
| Touch | Left stick moves, Strike auto-aims |

## What's in it

- **Overworld town**: Orla's Anvil (gear, restocks every trip), Bramble & Vial (draughts, scrolls, elixirs), Copper Lantern (materials, buys anything), and your Home.
- **Upgradable home**: House (Leaky Shack → Hearth Keep; stash size and Rested bonus), Workbench (recipe tiers, upgrade cap), Garden (herbs and essence each return), Trophy Hall (permanent bonuses per boss slain). The house model changes as you build.
- **Endless dungeon**: rooms-and-corridors generation with a flow field for enemy pathing. Five biomes cycle every 25 depths with rising difficulty (Sunken Crypt, Fungal Hollows, Magma Forge, Rime Halls, The Hollow Rift).
- **40 enemy types**: 8 behaviours (melee, charger, archer, caster, swarm, bomber, summoner, shield-bearer) × 5 biomes, plus 10 champion affixes (Swift, Vampiric, Splitting, Explosive…), named **leaders** with Frenzy/Ward/Rally auras that buff their pack, and a two-phase **boss** every fifth depth with its own attack patterns. Bosses open waypoints.
- **Loot**: 7 weapon types (melee arcs and ranged projectiles), 6 slots, 5 rarities, 13 affixes, 8 legendary powers (chain lightning, flame nova, spectral blades, phoenix…).
- **Crafting**: draughts, portal scrolls, elixirs, forging rare/epic/legendary gear for a chosen slot, upgrades to +10, affix rerolls, salvage into essence.
- Progress saves in the browser (localStorage).

## Performance work

Applied from the `threejs-performance` skill in [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills), measured with `renderer.info` (press `` ` `` in game):

| Technique | Where |
| --- | --- |
| **Merge static geometry** per material | Town props are baked into one mesh per material (`bakeStatic`); each creature kind is merged once and the geometry shared by every creature of that kind (`makeCreature`). A creature is 2–3 draw calls instead of 6–9. |
| **Instancing** | Floors, walls, wall caps, torches, flames, trees and biome decoration are `InstancedMesh`es with per-instance colour. |
| **Fewer triangles** | Floor tiles are single quads (2 triangles) instead of boxes (12). |
| **Static transforms** | Baked and instanced scenery uses `matrixAutoUpdate = false`. |
| **No transparent double-sided draws** | Attack arcs are single-sided; telegraph and projectile materials are cached and reused. |
| **No allocations in the loop** | Pooled particles, attack arcs and floating numbers; shared steering vector; emissive colours set in place. |
| **Shader compile stalls** | `renderer.compileAsync(scene, camera)` warms every program (including effect materials) before a new floor's first frame. |
| **Fill rate** | Pixel ratio capped at 2 and adapted at runtime: it steps down when frames average over 24 ms and back up when there's headroom. |
| **Loop** | `renderer.setAnimationLoop` with `THREE.Timer` connected to the document (pauses in hidden tabs). |

Typical counts in headless testing: 26–75 draw calls on dungeon floors with 50–75 enemies, about 32 in town.

## Layout

```
src/            game source (edit these)
  1-data.js     items, affixes, enemies, biomes, recipes, home upgrades, stats
  2-world.js    renderer, geometry merging, creature models, level generation and visuals
  3-entities.js enemies, AI, bosses, projectiles, telegraphs, combat, loot
  4-game.js     level flow, player, minimap, audio, saving
  5-ui.js       HUD and all panels (shops, home, crafting, bag)
  6-main.js     input, loop, adaptive resolution, boot
  head.html / body.html
build.sh        assembles game.js, index.html and dist/hearthdeep.html
vendor/         three.js r186 (MIT, see THREE-LICENSE)
```

Run `./build.sh` after editing `src/`.
