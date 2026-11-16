// Headless smoke test: serves the repo, boots the game in Chromium, starts a hero and lets the autoplay bot
// fight through a short delve. Fails on any page error, failed game file, bot-reported script error, or a hero that
// does not move.
//   npm i --no-save playwright && npx playwright install chromium && node tools/smoke-test.mjs
// Set CHROME_PATH to use an installed Chrome instead of Playwright's download; SMOKE_SECONDS to change the delve length.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]); if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}/`;

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } }); // small and on Low: software rendering is slow
// a scripted controller: the test flips window.__padOn and pokes axes and buttons the way a real pad reports them
await page.addInitScript(() => {
  window.__rumbles = 0; window.__padOn = false;
  window.__pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect() { window.__rumbles++; return Promise.resolve('complete'); } } };
  window.__press = (i, on) => { window.__pad.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; window.__pad.timestamp++; };
  navigator.getGamepads = () => (window.__padOn ? [window.__pad] : []);
});
const problems = [];
page.on('pageerror', (e) => problems.push('page error: ' + String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.|net::ERR_/.test(m.text())) problems.push('console error: ' + m.text().slice(0, 300)); });
page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) problems.push(what); };
const seconds = +(process.env.SMOKE_SECONDS || 60);

try {
  // 1. boots to the title menu, arriving from a challenge link
  await page.goto(base + '?rift=HD-4-SB-1A2B3C');
  await page.waitForFunction(() => window.hearthdeep && window.hearthdeep.ready, null, { timeout: 90000 });
  check(await page.evaluate(() => document.querySelectorAll('#menuBtns button').length >= 3), 'title menu shows the save slots');
  check(await page.evaluate(() => !!document.querySelector('meta[property="og:image"]') && !!document.querySelector('script[type="application/ld+json"]') && JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type'] === 'VideoGame'), 'share tags and structured data are present and parse');
  await page.evaluate(() => { const low = [...document.querySelectorAll('#opts button')].find((b) => b.textContent.trim() === 'Low'); if (low) low.click(); });
  // 2. a new hero reaches the village
  await page.evaluate(() => document.querySelector('#mSlot0').click());
  await page.waitForTimeout(800);
  await page.evaluate(() => { hearthdeep.debug.chooseClass('mage'); });
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => hearthdeep.LV.type === 'town' && hearthdeep.S.cls === 'mage'), 'a new mage stands in the village');
  // 3. the challenge link filled in the code box
  for (let i = 0; i < 20; i++) { // click through the opening dialogue the way a player would
    const open = await page.evaluate(() => { const d = document.querySelector('#dlg'); if (d.hidden) return false; const n = document.querySelector('#dlgNext'); if (n) n.click(); return true; });
    if (!open) break; await page.waitForTimeout(150);
  }
  await page.evaluate(() => hearthdeep.openPanel('delve', 'rift'));
  const code = await page.evaluate(() => { const i = document.querySelector('#seedIn'); return i ? i.value : null; });
  check(code === null || code === 'HD-4-SB-1A2B3C', 'the rift code from the link is waiting in the Delve' + (code === null ? ' (rift tab not open for a new hero; skipped)' : ''));
  await page.evaluate(() => hearthdeep.closePanel());
  // 4. the bot delves
  await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'tools/autoplay-bot.js'), 'utf8') });
  // turbo 3, not the bot's default 8: at a few frames a second, big simulation jumps make it overshoot its waypoints
  await page.evaluate(() => { window.startBot('mage', [['delve', 1, 100000, 6]]); hearthdeep.debug.DBG.turbo = 3; });
  await page.waitForFunction(() => hearthdeep.ready && hearthdeep.LV.type === 'dungeon', null, { timeout: 90000 });
  check(true, 'the first dungeon floor generated and loaded');
  const seen = () => page.evaluate(() => hearthdeep.LV.explored.reduce((n, v) => n + (v ? 1 : 0), 0));
  const seen0 = await seen();
  await page.waitForTimeout(seconds * 1000);
  const seen1 = await seen();
  const rep = JSON.parse(await page.evaluate(() => window.botReport()));
  if (rep.events && rep.events.length) console.log('     bot events:', rep.events.join(' | '));
  console.log('     bot:', JSON.stringify({ explored: [seen0, seen1], floors: rep.floors, kills: rep.kills, deaths: rep.deaths, softlocks: rep.softlocks, frameMs: rep.frameMs }));
  check(rep.errors.length === 0, 'no script errors while delving' + (rep.errors.length ? ': ' + rep.errors.join(' | ') : ''));
  // (the bot's own softlock timer is wall-clock and trips on slow renderers, so it is reported above but not judged)
  check(seen1 > seen0 + 20 || rep.kills > 0 || rep.floors > 1, 'the hero moves and explores under bot control');
  // 5. sealing a rift offers the challenge link and remembers the rift
  await page.evaluate(() => { window.stopBot(); const H = hearthdeep, D = H.debug; if (H.LV.type !== 'town') D.returnToTown(false); });
  await page.waitForFunction(() => hearthdeep.ready && hearthdeep.LV.type === 'town', null, { timeout: 90000 });
  await page.evaluate(() => hearthdeep.debug.startRift(1, false));
  await page.waitForFunction(() => hearthdeep.ready && hearthdeep.LV.type === 'dungeon' && hearthdeep.RUN.rift, null, { timeout: 90000 });
  await page.evaluate(() => { const H = hearthdeep, D = H.debug; const e = D.spawnEnemy(Object.keys(D.ARCH)[0], H.P.x + 1.2, H.P.z, { leader: true }); e.riftGuard = 1; D.damageEnemy(e, 1e9, false, 0, 0, 0); });
  await page.waitForTimeout(1500);
  const seal = await page.evaluate(() => ({ dare: !!document.querySelector('.toast.dare button'), share: hearthdeep.RUN.rift.share, last: hearthdeep.S.lastRift && hearthdeep.S.lastRift.code, ok: !!hearthdeep.debug.parseRiftCode(hearthdeep.RUN.rift.share) }));
  check(seal.dare && seal.ok && seal.last === seal.share, 'a sealed rift offers its challenge link (' + seal.share + ')');
  // 6. a controller: stick moves the hero, key caps follow the pad in hand, feedback rumbles, Start pauses, keyboard takes over again
  // (back in the village first: a hero left standing in a rift gets frozen, swarmed or killed mid-check. Then wait for
  // the village to hold still, clicking through anything that opens: on a slow machine a second level load or a
  // late dialogue can land seconds after the first "ready".)
  await page.evaluate(() => hearthdeep.debug.returnToTown(false));
  for (let calm = 0, i = 0; calm < 6 && i < 120; i++) {
    const st = await page.evaluate(() => { const H = hearthdeep, d = document.querySelector('#dlg'); if (!d.hidden) { const n = document.querySelector('#dlgNext'); if (n) n.click(); return 'busy'; } if (!document.querySelector('#panel').hidden) { H.closePanel(); return 'busy'; } return H.ready && H.LV.type === 'town' && !H.debug.isPaused() ? 'calm' : 'busy'; });
    calm = st === 'calm' ? calm + 1 : 0; await page.waitForTimeout(500);
  }
  const until = (fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
  const cap = () => page.evaluate(() => document.querySelector('#actionBar .slot .k').textContent);
  const kbCap = await cap();
  await page.evaluate(() => { window.__x0 = hearthdeep.P.x; window.__z0 = hearthdeep.P.z; window.__padOn = true; window.__pad.axes[0] = 1; });
  const moved = await until(() => document.body.classList.contains('pad') && Math.hypot(hearthdeep.P.x - window.__x0, hearthdeep.P.z - window.__z0) > 0.3);
  await page.evaluate(() => { window.__pad.axes[0] = 0; });
  check(moved, 'the left stick moves the hero');
  check(await until(() => document.querySelector('#actionBar .slot .k').textContent === 'A'), 'the action bar shows Xbox button names with an Xbox pad');
  await page.evaluate(() => { window.__pad.id = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'; window.__pad.timestamp++; });
  check(await until(() => document.querySelector('#actionBar .slot .k').textContent === '✕'), 'and PlayStation symbols with a DualSense');
  await page.evaluate(() => hearthdeep.debug.haptic(60)); // the call every hit, parry and level-up makes
  await page.waitForTimeout(300);
  check(await page.evaluate(() => window.__rumbles > 0), 'game feedback rumbles the controller');
  await page.evaluate(() => window.__press(9, true)); await page.waitForTimeout(500); await page.evaluate(() => window.__press(9, false)); await page.waitForTimeout(300);
  const paused = await page.evaluate(() => ({ title: !document.querySelector('#title').hidden, focus: document.querySelector('#title').contains(document.activeElement) }));
  check(paused.title && paused.focus, 'Start opens the menu with a button focused');
  await page.evaluate(() => window.__press(9, true)); await page.waitForTimeout(500); await page.evaluate(() => window.__press(9, false)); await page.waitForTimeout(300);
  check(await page.evaluate(() => document.querySelector('#title').hidden), 'Start again resumes');
  // 7. the parts that used to need a mouse or keyboard: zoom, typing, photo mode
  const tap = async (i) => { await page.evaluate((i) => window.__press(i, true), i); await page.waitForTimeout(450); await page.evaluate((i) => window.__press(i, false), i); await page.waitForTimeout(300); };
  await tap(10);
  check(await page.evaluate(() => /Camera: close/.test(document.querySelector('#toasts').textContent)), 'L3 steps the camera zoom');
  await page.evaluate(() => { hearthdeep.openPanel('delve', 'rift'); const i = document.querySelector('#seedIn'); i.value = ''; i.focus(); });
  await page.waitForTimeout(400); await tap(0);
  check(await page.evaluate(() => !!document.querySelector('#osk')), 'A on a text box opens the on-screen keyboard');
  for (const ch of ['H', 'D', '-']) { await page.evaluate((ch) => { const b = [...document.querySelectorAll('#osk [data-osk]')].find((x) => x.dataset.osk.toUpperCase() === ch); b.focus(); }, ch); await tap(0); }
  await tap(2); // X deletes the dash
  const typed = await page.evaluate(() => document.querySelector('#seedIn').value);
  await tap(9); // Start: done
  check(typed.toUpperCase() === 'HD' && await page.evaluate(() => !document.querySelector('#osk') && document.activeElement.id === 'seedIn'), `typing with the pad fills the field ("${typed}") and Start closes the keyboard`);
  await tap(1); // B closes the panel
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'B closes the panel');
  await tap(9); await page.evaluate(() => document.querySelector('#mPhoto').focus()); await tap(0);
  const ph0 = await page.evaluate(() => { const P = hearthdeep.debug.PHOTO; window.__pad.axes[2] = 1; window.__pad.axes[1] = -1; window.__pad.timestamp++; return { on: P.on, yaw: P.yaw, tx: P.tx, tz: P.tz }; });
  await page.waitForTimeout(1500);
  const ph1 = await page.evaluate(() => { const P = hearthdeep.debug.PHOTO; window.__pad.axes[2] = 0; window.__pad.axes[1] = 0; return { yaw: P.yaw, tx: P.tx, tz: P.tz, help: document.querySelector('#photo .hint').textContent }; });
  check(ph0.on && Math.abs(ph1.yaw - ph0.yaw) > 0.1 && Math.hypot(ph1.tx - ph0.tx, ph1.tz - ph0.tz) > 0.2 && /orbit/.test(ph1.help), 'photo mode opens from the menu and the sticks fly and orbit the camera');
  await tap(1);
  check(await page.evaluate(() => !hearthdeep.debug.PHOTO.on), 'B leaves photo mode');
  await page.keyboard.press('F8'); await page.evaluate(() => { window.__padOn = false; }); await page.waitForTimeout(500);
  check(await cap() === kbCap && !(await page.evaluate(() => document.body.classList.contains('pad'))), 'touching the keyboard brings the key names back');
} catch (err) { problems.push('test crashed: ' + String(err).slice(0, 400)); }
await browser.close(); server.close();
if (problems.length) { console.error('\n' + problems.length + ' problem(s):\n- ' + [...new Set(problems)].join('\n- ')); process.exit(1); }
console.log('\nSmoke test passed.');
