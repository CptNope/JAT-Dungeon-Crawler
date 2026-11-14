// Captures press screenshots and GIF frames from the running game, frame by frame, with the autoplay bot at the controls.
// Frames are stepped by hand (one 50 ms game step per capture), so footage plays back smoothly at 20 fps even when
// the machine renders slowly (headless software rendering included).
//   python3 -m http.server 8000 &
//   npm i --no-save playwright && npx playwright install chromium
//   node tools/capture-media.mjs tools/capture-scenes.json
// Output lands in capture/shots/<scene>-<n>.png and capture/frames/<scene>/0000.jpg. Turn frames into a GIF with:
//   ffmpeg -framerate 20 -i capture/frames/<scene>/%04d.jpg -vf "scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" out.gif
// Scene fields: name; mode ('delve' | 'pit' | 'rift' | 'town'); depth; cam ('top' | 'third' | 'first'); cls; lvl;
// near (foes within reach before capturing); boss (wait for the boss); zoom (wheel notches in); shots, gap (stills and
// steps between them); frames (capture a sequence instead of stills); nohud (town only: hide the HUD).
// Env: CHROME_PATH (use an installed Chrome), GAME_URL (default http://localhost:8000/index.html), OUT (default capture).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), OUT = process.env.OUT || 'capture';
fs.mkdirSync(`${OUT}/shots`, { recursive: true });
const scenes = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', m => { if (m.type()==='error' && !/fonts|ERR_/.test(m.text())) errs.push('C:'+m.text().slice(0,300)); });
p.on('pageerror', e => errs.push('E:'+String(e).slice(0,400)));
await p.addInitScript(() => {
  const q = []; let id = 0; window.__manual = false; const real = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { if (!window.__manual) return real(cb); q.push(cb); return ++id; };
  window.__step = (n) => { for (let i = 0; i < n; i++) { const cbs = q.splice(0); const t = performance.now(); for (const cb of cbs) cb(t); } return q.length; };
});
await p.goto(process.env.GAME_URL || 'http://localhost:8000/index.html');
await p.waitForFunction(() => window.hearthdeep && window.hearthdeep.ready);
await p.evaluate(() => document.querySelector('#mSlot0').click());
await p.waitForTimeout(1200);
await p.addStyleTag({ content: '#hint,#touch,#toasts{display:none!important}' });
await p.addScriptTag({ content: fs.readFileSync(path.join(here, 'autoplay-bot.js'), 'utf8') });
await p.evaluate(() => { hearthdeep.debug.chooseClass('mage'); });
await p.waitForTimeout(2500);
const state = () => p.evaluate(() => { const H = hearthdeep, P = H.P; const near = H.enemies.filter(e => !e.dead && e.awake && Math.hypot(e.x-P.x, e.z-P.z) < 7).length; return { near, type: H.LV.type, d: H.RUN && H.RUN.depth, hp: Math.round(P.hp), boss: H.enemies.some(e => !e.dead && e.boss && e.awake), dlg: !document.querySelector('#dlg').hidden, panel: !document.querySelector('#panel').hidden }; });
for (const sc of scenes) {
  await p.evaluate(() => { window.__manual = false; window.__step(1); }); // hand any queued frame back to the browser's own clock
  if (sc.mode === 'town') {
    await p.evaluate((sc) => { const H = hearthdeep; if (H.LV.type !== 'town') H.debug.returnToTown(false); H.debug.setCamMode(sc.cam || 'third'); }, sc);
    await p.waitForTimeout(4000);
    for (let k = 0; k < 12; k++) { const o = await p.evaluate(() => { const d = document.querySelector('#dlg'); if (!d.hidden) { const n = document.querySelector('#dlgNext'); if (n) n.click(); return 1; } if (!document.querySelector('#panel').hidden) { hearthdeep.closePanel(); return 1; } return 0; }); if (!o) break; await p.waitForTimeout(200); }
    await p.waitForTimeout(2500);
    if (sc.nohud) await p.addStyleTag({ content: '#hud{display:none!important}' });
    for (let k = 0; k < (sc.shots || 1); k++) { await p.screenshot({ path: `${OUT}/shots/${sc.name}-${k}.png` }); if (sc.yaw) await p.evaluate((y) => { hearthdeep.debug.CAM.yaw += y; }, sc.yaw); await p.waitForTimeout(1500); } console.log(sc.name); continue;
  }
  await p.evaluate((sc) => { const H = hearthdeep, D = H.debug, kind = { warrior: 'sword', ranger: 'bow', mage: 'staff', necro: 'dagger', necromancer: 'dagger' }[sc.cls || 'mage']; D.setCamMode(sc.cam || 'top'); if (sc.cls && H.S.cls !== sc.cls) { H.S.cls = null; D.chooseClass(sc.cls); H.closePanel(); } for (const slot of ['weapon', 'helm', 'chest', 'boots', 'ring', 'amulet']) H.S.equip[slot] = D.genItem(sc.depth + 4, slot === 'weapon' ? { slot, kind, rarity: 4 } : { slot, rarity: 3 }); H.S.inv.length = 0; window.startBot(sc.cls || 'mage', [[sc.mode || 'delve', sc.depth, 100000, sc.lvl]]); D.DBG.turbo = 3; }, sc);
  await p.waitForFunction(() => hearthdeep.ready && hearthdeep.LV.type === 'dungeon', null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { window.__manual = true; });
  await p.waitForTimeout(600);
  let st, ok = false;
  const t0 = Date.now();
  for (let i = 0; i < 900 && Date.now() - t0 < (sc.maxMs || 150000); i++) {
    await p.evaluate(() => window.__step(1));
    if (i % 3 === 0) { st = await state(); if (st.near >= (sc.near || 3) && (!sc.boss || st.boss)) { ok = true; break; } }
  }
  await p.evaluate((sc) => { hearthdeep.debug.DBG.turbo = 0; if (sc.zoom) { const c = document.querySelector('canvas'); for (let i = 0; i < sc.zoom; i++) c.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })); } }, sc);
  for (let i = 0; i < (sc.settle || 14); i++) await p.evaluate(() => window.__step(1));
  console.log(sc.name, ok, JSON.stringify(st));
  if (sc.frames) {
    fs.mkdirSync(`${OUT}/frames/${sc.name}`, { recursive: true });
    for (let i = 0; i < sc.frames; i++) { await p.evaluate(() => window.__step(1)); await p.screenshot({ path: `${OUT}/frames/${sc.name}/${String(i).padStart(4,'0')}.jpg`, quality: 92, type: 'jpeg' }); }
  } else {
    for (let k = 0; k < (sc.shots || 3); k++) { for (let i = 0; i < (sc.gap || 10); i++) await p.evaluate(() => window.__step(1)); await p.screenshot({ path: `${OUT}/shots/${sc.name}-${k}.png` }); }
  }
  await p.evaluate(() => { window.stopBot && window.stopBot(); });
}
console.log('errs', errs);
await b.close();
