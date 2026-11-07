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
| Mouse | Aim (overhead) or look (third and first person; click to capture the mouse) |
| Left click (hold) or J | Attack (three-hit combo; the third swing is a heavy finisher) |
| Space, Shift or right click | Roll (brief invulnerability) |
| 1 / 2 / 3 | Skills: Whirlwind (level 1), Shadow Dash (level 4), Ember Nova (level 8) |
| Tab or middle click | Lock on to the nearest foe / cycle targets |
| X | Release lock-on |
| E | Use, open, talk |
| V | Switch view: Overhead → Third person → First person |
| Mouse wheel | Zoom (overhead and third person) |
| Q / R | Healing Draught / Greater Draught |
| T | Portal Scroll (opens a way home) |
| I | Bag, materials, character sheet |
| Esc | Menu |
| `` ` `` or F3 | Performance readout |
| Touch | Left stick moves; drag the screen to look in close views; Strike aims for you; skill, lock and utility buttons around the thumbs |

## What's in it

- **Three views**: angled overhead, over-the-shoulder third person with wall collision, and first person with a held weapon. Dungeon walls rise to full height in the close views. Change view with V, the View button, or the menu.
- **Graphics**: golden-hour town with sun shadows, sky dome and image-based light; torch-lit dungeons where the lantern casts shadows and the nearest wall torches flicker as real lights; HDR bloom, ACES tone mapping, colour grade and vignette; procedurally generated stone, brick, cobble, grass, wood, shingle and plaster textures with normal maps; wind-blown grass, biome particles (dust, spores, embers, snow, void sparks) and torch flames; arm and leg animation for every creature. High, Medium and Low quality presets, with automatic step-down on slow devices.

- **Combat feel**: hit-stop and camera shake on heavy blows (shake can be turned off), three-hit combos with real swing animations, weapon trails, shockwave rings, flinch and stagger, corpses that topple and sink, lock-on targeting with camera framing, FOV kick on rolls and dashes.
- **Skills**: Whirlwind, Shadow Dash and Ember Nova unlock as you level, each on its own cooldown.
- **Dungeon events**: spike traps, shrines (Fury, Stone, Fortune, Haste, Life) that bless the rest of the run, and cursed altars that summon three ambush waves guarding a rich chest. Rooms are dressed with barrels, crates and biome-coloured banners.
- **Quests**: Elder Maren by the well offers three tasks each visit (slay a kind of foe, hunt leaders or champions, reach a depth, gather materials, silence an altar, fell a boss) for gold, essence, experience and gear; the active task shows under the minimap.
- **Music**: a procedural score — town chords, a drone per biome, and a driving rhythm for boss fights (toggle in the menu).
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
| **Animated but merged characters** | Arms, legs and capes swing in the vertex shader from per-creature uniforms (limb tags baked into the merged geometry), so animation adds no draw calls. |
| **GPU particles** | Bursts are one `Points` object; ambient motes and torch flames animate entirely in the vertex shader from a time uniform. Contact shadows are one instanced quad. |
| **Shadows only where they matter** | The sun casts shadows in town only; the lantern casts them in dungeons only (High). A small pool of torch lights is reassigned to the nearest torches instead of one light per torch. |
| **Shared world materials** | Floor, wall and town materials are created once and recoloured per biome, so changing floors needs no shader rebuild. |
| **Shader compile stalls** | `renderer.compileAsync(scene, camera)` warms every program (including effect materials) before a new floor's first frame. |
| **Fill rate** | Pixel ratio capped at 2 and adapted at runtime: it steps down when frames average over 24 ms and back up when there's headroom. |
| **Loop** | `renderer.setAnimationLoop` with `THREE.Timer` connected to the document (pauses in hidden tabs). |

Draw calls are counted across every render pass in a frame (shadow maps, scene, bloom). Typical counts in headless testing on High: 70–150 in dungeons overhead (the lantern skips its shadow pass when seen from above), 150–280 in the close views with a room full of foes, about 120 in town.

## Layout

```
src/            game source (edit these)
  1-data.js     items, affixes, enemies, biomes, recipes, home upgrades, stats
  2-render.js   renderer, quality presets, HDR post-processing, procedural textures, materials, sky, particles
  3-world.js    creature, hero and weapon models, first-person viewmodel, level generation
  3b-visuals.js dungeon and town construction, torch lights
  4-entities.js enemies, AI, bosses, projectiles, telegraphs, combat, loot
  4b-feel.js    hit-stop, shake, corpses, weapon trails, rings, lock-on, portals
  5-game.js     level flow, player, camera modes, minimap, saving
  5b-depth.js   skills, traps, shrines, altar ambushes, quests
  5c-audio.js   sound effects and the procedural music sequencer
  6-ui.js       HUD and all panels (shops, home, crafting, bag)
  7-main.js     input, look controls, settings, loop, adaptive quality, boot
  head.html / body.html
build.sh        assembles game.js, index.html and dist/hearthdeep.html
vendor/         three.js r186 (MIT, see THREE-LICENSE)
```

Run `./build.sh` after editing `src/`.
