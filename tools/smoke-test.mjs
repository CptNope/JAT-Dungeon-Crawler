// Headless smoke test: serves the repo, boots the game in Chromium, starts a hero and lets the autoplay bot
// fight through a short delve. Fails on any page error, failed game file, or bot-reported error.
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
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
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
  await page.evaluate(() => window.startBot('mage', [['delve', 1, 100000, 6]]));
  await page.waitForFunction(() => hearthdeep.ready && hearthdeep.LV.type === 'dungeon', null, { timeout: 90000 });
  check(true, 'the first dungeon floor generated and loaded');
  await page.waitForTimeout(seconds * 1000);
  const rep = JSON.parse(await page.evaluate(() => window.botReport()));
  console.log('     bot:', JSON.stringify({ floors: rep.floors, kills: rep.kills, deaths: rep.deaths, softlocks: rep.softlocks, frameMs: rep.frameMs }));
  check(rep.errors.length === 0, 'no script errors while delving' + (rep.errors.length ? ': ' + rep.errors.join(' | ') : ''));
  check(rep.softlocks === 0, 'no softlocks');
  check(rep.kills > 0 || rep.floors > 1, 'the bot is making progress (kills or floors)');
} catch (err) { problems.push('test crashed: ' + String(err).slice(0, 400)); }
await browser.close(); server.close();
if (problems.length) { console.error('\n' + problems.length + ' problem(s):\n- ' + [...new Set(problems)].join('\n- ')); process.exit(1); }
console.log('\nSmoke test passed.');
