#!/bin/bash
# Assembles the game from src/ into:
#   game.js + index.html          -> served as-is (GitHub Pages, any static host); uses vendor/three.module.js
#   dist/hearthdeep.html          -> single self-contained file; loads three.js r186 from jsDelivr
set -e
cd "$(dirname "$0")"
{ echo "// Built from src/ by build.sh — edit src/, not this file."; echo "window.startHearthdeep = function (THREE) {"; cat src/1-data.js src/1b-meta.js src/2-render.js src/3-world.js src/3b-visuals.js src/4-entities.js src/4b-feel.js src/4c-juice.js src/5-game.js src/5b-depth.js src/5c-audio.js src/5d-class.js src/5e-town.js src/5f-modes.js src/5g-story.js src/6-ui.js src/6b-meta-ui.js src/6c-pad.js src/6d-share.js src/7-main.js; echo "};"; } > game.js
loader() {
  cat <<JS
<script type="module">
const sources = [$1];
let T = null;
for (const u of sources) { try { T = await import(u); break; } catch (err) { console.warn('three.js failed to load from', u); } }
if (!T) { document.querySelector('.tag').textContent = 'The 3D engine could not load. Check your connection and reload the page.'; }
else window.hearthdeep = window.startHearthdeep(T);
</script>
JS
}
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; cat src/head.html; echo '</head><body>'; cat src/body.html; echo '<script src="game.js"></script>'; loader "'./vendor/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js'"; echo '</body></html>'; } > index.html
mkdir -p dist
{ echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; cat src/head.html; echo '</head><body>'; cat src/body.html; echo "<script>"; tail -n +2 game.js; echo "</script>"; loader "'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js'"; echo '</body></html>'; } > dist/hearthdeep.html
node --check game.js 2>/dev/null && echo "built: game.js, index.html, dist/hearthdeep.html" || echo "built (node not found, syntax unchecked)"
