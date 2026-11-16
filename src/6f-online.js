// ================= online play =================
// On the published claude.ai page, leaderboards and ghosts live in the page's shared database and parties use live
// rooms. On any other web host, leaderboards and ghosts come from your own server when one is configured (below);
// with neither, the game stays single-player. The published page stores no names, only ids resolved to names on
// screen; your own server stores the display name a player chooses. Everything another player sends is untrusted data.
const ONLINE = { ready: false, db: null, user: null, room: null, me: null, party: null, code: '', peers: [], avatars: new Map(), ghost: null, invite: null, sentT: 0 };
const PARTY_RE = /^[a-z0-9]{5}$/;

// ---- your own server (server/ in this repository): leaderboards and ghosts on any web host ----
// The address comes from <meta name="hearthdeep-api"> in src/head.html. The server is spoken to through the same
// small doc / collection / user shapes the published page's database offers, so the code below does not care which
// one it has. There are no accounts: the server hands this browser a random token the first time a score is sent.
const REST = { base: '', id: null, token: null, name: '', names: new Map(), msg: '', typed: '', pending: null };
const REST_KEY = 'hearthdeep-online';
const restBase = () => { const m = document.querySelector('meta[name="hearthdeep-api"]'); return String(window.HEARTHDEEP_API || (m && m.content) || '').trim().replace(/\/+$/, ''); };
function restSave() { try { localStorage.setItem(REST_KEY, JSON.stringify({ base: REST.base, id: REST.id, token: REST.token, name: REST.name, pending: REST.pending })); } catch (err) { /* storage unavailable: the identity lasts for this visit */ } }
async function restCall(method, path, body, auth) {
  const headers = { Accept: 'application/json' }; if (body) headers['Content-Type'] = 'application/json'; if (auth && REST.token) headers.Authorization = 'Bearer ' + REST.token;
  // a server that hangs must not hang the panel: give up after 8 seconds
  const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
  let r; try { r = await fetch(REST.base + '/api/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'omit', signal: ctl ? ctl.signal : undefined }); } finally { clearTimeout(timer); }
  const j = await r.json().catch(() => null);
  if (r.status === 401 && auth) { REST.id = null; REST.token = null; REST.pending = null; ONLINE.me = null; restSave(); } // the server no longer knows this browser: join afresh next time
  if (!r.ok) { const e = new Error((j && j.message) || 'HTTP ' + r.status); e.status = r.status; throw e; }
  return j || {};
}
async function restJoin(name) { // become a player on the server (once per browser)
  if (REST.token) return REST.id;
  const j = await restCall('POST', '/players', name ? { name } : {});
  if (!j.id || !j.token) throw new Error('bad reply');
  REST.id = String(j.id); REST.token = String(j.token); REST.name = String(j.name || ''); REST.names.set(REST.id, REST.name); restSave(); ONLINE.me = REST.id;
  return REST.id;
}
// A weekly time that could not be sent (server down, no signal) is kept and sent with the next successful call.
// Depth needs no such care: it is read from the save and sent again every time the hero comes home.
async function restFlush() {
  const p = REST.pending; if (!p || !REST.token) return;
  try { await restCall('PUT', '/me/entry', p, true); REST.pending = null; restSave(); }
  catch (err) { if (err.status >= 400 && err.status < 500 && err.status !== 429) { REST.pending = null; restSave(); } else throw err; } // refused for good (a week gone by): let it go
}
async function restRename(name) {
  if (!REST.token) { await restJoin(name); return REST.name; }
  const j = await restCall('PATCH', '/me', { name }, true); REST.name = String(j.name || name); REST.names.set(REST.id, REST.name); restSave(); return REST.name;
}
function restDb() {
  const snap = (rows) => ({ docs: (Array.isArray(rows) ? rows : []).map((r) => { REST.names.set(String(r.id), String(r.name || '')); return { id: String(r.id), data: () => r }; }) });
  return {
    doc(path) {
      const id = String(path).split('/')[1];
      return {
        async get() { if (!id || id === 'null') return { exists: false, data: () => ({}) }; const j = await restCall('GET', '/players/' + encodeURIComponent(id) + '/entry'); return { exists: !!j.exists, data: () => j.data || {} }; },
        async set(v) {
          const line = { best: v.best | 0, cls: v.cls, lvl: v.lvl | 0, para: v.para | 0, week: v.week || null, time: v.time || null, ghost: v.ghost || null, gcls: v.gcls || null };
          try { await restJoin(); await restFlush(); await restCall('PUT', '/me/entry', line, true); }
          catch (err) { if (line.time && !(err.status >= 400 && err.status < 500 && err.status !== 429) && (!REST.pending || REST.pending.week !== line.week || line.time < REST.pending.time)) { REST.pending = line; restSave(); } throw err; }
        },
      };
    },
    collection() {
      const q = { kind: 'deep', week: '', n: 20 };
      const c = { where(f, op, v) { if (f === 'week') { q.kind = 'week'; q.week = String(v); } return c; }, orderBy(f) { q.kind = f === 'best' ? 'deep' : 'week'; return c; }, limit(n) { q.n = n | 0; return c; },
        async get() { const j = await restCall('GET', `/board?kind=${q.kind}&week=${encodeURIComponent(q.week)}&limit=${q.n}`); return snap(j.rows); } };
      return c;
    },
  };
}
const restUser = {
  async id() { return REST.id; },
  async profiles(ids) {
    const miss = ids.filter((i) => !REST.names.has(i));
    if (miss.length) { try { const j = await restCall('GET', '/players?ids=' + miss.map(encodeURIComponent).join(',')); for (const [k, v] of Object.entries(j.names || {})) REST.names.set(k, String(v)); } catch (err) { /* names stay blank */ } }
    const out = {}; for (const i of ids) out[i] = { name: REST.names.get(i) || '' }; return out;
  },
};
// Party rooms over plain HTTP: about twice a second this browser tells the server where its hero is and hears who
// else is in the room and anything said since. It offers the same join / onPeers / on / presence / emit / leave
// shape as the published page's live rooms, so the party code further down runs unchanged.
function restRoom() {
  return {
    async join(name) {
      await restJoin();
      const code = String(name).replace(/^hd-party-/, ''), path = '/rooms/' + encodeURIComponent(code);
      const R = { pres: {}, since: null, known: new Map(), timer: 0, gone: false, fails: 0, n: 0, peersCb: null, handlers: {},
        onPeers(cb) { R.peersCb = cb; }, on(ev, cb) { R.handlers[ev] = cb; },
        presence(p) { R.pres = p; return Promise.resolve(); },
        emit(ev, data) { return restCall('POST', path + '/emit', { data }, true); },
        async leave() { R.gone = true; clearTimeout(R.timer); try { await restCall('POST', path + '/leave', {}, true); } catch (err) { /* the server forgets a silent member in seconds */ } } };
      const hear = (j) => {
        const now = new Map(), joined = [], left = [];
        for (const q of Array.isArray(j.peers) ? j.peers : []) {
          const id = String(q.id); REST.names.set(id, String(q.name || ''));
          let p = R.known.get(id); if (!p) { p = { peer: id, by: id, isMe: id === REST.id, presence: {} }; joined.push(p); }
          p.presence = q.presence && typeof q.presence === 'object' ? q.presence : {}; now.set(id, p); // the same object each time: the party list holds on to it
        }
        for (const [id, p] of R.known) if (!now.has(id)) left.push(p);
        R.known = now; R.n++;
        if (R.peersCb && (joined.length || left.length || R.n % 10 === 0)) R.peersCb({ peers: [...now.values()], joined: R.n === 1 ? [] : joined, left });
        if (typeof j.cursor === 'number') R.since = j.cursor;
        for (const m of Array.isArray(j.messages) ? j.messages : []) if (R.handlers.party) R.handlers.party({ data: m.data, by: String(m.by), isMe: String(m.by) === REST.id });
      };
      const ask = () => restCall('POST', path + '/sync', { presence: R.pres, since: R.since }, true);
      const loop = async () => {
        if (R.gone) return;
        try { hear(await ask()); R.fails = 0; }
        catch (err) { R.fails++; if (err.status === 401 || err.status === 409 || R.fails > 30) { R.gone = true; if (ONLINE.party === R) { partyLeave(true); toast(err.status === 409 ? 'That party is full.' : 'Lost touch with the party.', 'var(--bad)'); } return; } }
        R.timer = setTimeout(loop, document.hidden ? 4000 : R.fails ? 2500 : 500); // slower in a background tab or when the server is struggling
      };
      const first = await ask(); // a full room or a dead server fails the join here, before the party starts
      setTimeout(() => { hear(first); R.timer = setTimeout(loop, 500); }, 0); // after the caller has attached its listeners
      return R;
    },
  };
}
async function initRestOnline() {
  REST.base = restBase(); if (!/^https?:\/\//.test(REST.base)) return;
  try { const j = JSON.parse(localStorage.getItem(REST_KEY) || 'null'); if (j && j.base === REST.base && j.token) { REST.id = j.id; REST.token = j.token; REST.name = j.name || ''; REST.pending = j.pending && typeof j.pending === 'object' ? j.pending : null; REST.names.set(REST.id, REST.name); } } catch (err) { /* start fresh */ }
  let st; try { st = await restCall('GET', '/status'); if (!st.ok) return; } catch (err) { return; } // server down or not allowed from this page: stay single-player
  Object.assign(ONLINE, { db: restDb(), user: restUser, room: st.rooms ? restRoom() : null, rest: true, me: REST.id, ready: true });
  document.body.classList.add('online');
  if (Panel.kind === 'online') renderPanel();
  restFlush().catch(() => {});
}
function restNameRow() { // a display name for the boards; the only thing the server knows about a player besides their scores
  return `<div class="row" style="margin-bottom:12px"><div><div class="t">Your name on the boards<small>no account or email; this browser is remembered</small></div><div class="d" id="olMsg" role="status">${REST.msg ? esc(REST.msg) : REST.token ? '' : 'You join the boards the first time you come home from a delve, or when you save a name here.'}</div></div>
    <div class="acts"><input id="olName" class="lo-name" maxlength="16" value="${esc(REST.typed || REST.name)}" placeholder="2 to 16 letters" aria-label="Your name on the leaderboards" style="max-width:190px"><button class="btn ghost" type="button" data-act="olName">Save</button></div></div>`;
}
async function restNameSave() { // the panel redraws around this, so what happened is kept in REST.msg, not written into the page
  const inp = $('#olName'); if (!inp) return;
  REST.typed = inp.value.trim(); REST.msg = '';
  try { const n = await restRename(REST.typed); REST.typed = ''; toast('You are ' + n + ' on the boards.', 'var(--ok)'); }
  catch (err) { REST.msg = err.status === 422 ? 'That name cannot be used. Try 2 to 16 letters or numbers.' : err.status === 429 ? 'Too many tries. Wait a minute and try again.' : 'The server could not be reached. Try again in a moment.'; }
  if (Panel.kind === 'online') renderPanel();
}

async function initOnline() {
  if (!window.claude || typeof window.claude.use !== 'function') { await initRestOnline(); return; }
  const use = (n) => window.claude.use(n).catch(() => null);
  const [db, user, room] = await Promise.all([use('db'), use('user'), use('room')]);
  Object.assign(ONLINE, { db, user, room });
  if (user) { try { ONLINE.me = await user.id(); } catch (err) { ONLINE.me = null; } }
  ONLINE.ready = !!(db || room);
  document.body.classList.toggle('online', ONLINE.ready);
  if (Panel.kind === 'online') renderPanel();
}
const canBoard = () => !!(ONLINE.db && (ONLINE.me || ONLINE.rest)); // on your own server the boards can be read before joining
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
  if (ONLINE.rest && !ONLINE.me && !(S.best > 0) && !(extra && extra.time)) return; // nothing to show yet: do not join for it
  boardBusy = true;
  try {
    if (ONLINE.rest && !ONLINE.me) await restJoin();
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
  if (d > 6) { A.x = A.tx; A.z = A.tz; } else { const k = Math.min(1, dt * (A.slow ? 4.5 : 10)); A.x += dx * k; A.z += dz * k; } // slow: positions arrive twice a second, so ease over the gap
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
  } catch (err) { toast(err && err.code === 'not_permitted' ? 'Parties are not available on this page.' : err && err.status === 409 ? 'That party is full.' : 'Could not join the party. Try again.', 'var(--bad)'); }
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
    if (!A || A.lv !== LV) { if (A) dropAvatar(A); A = makeAvatar(CLASSES[q.cls] ? q.cls : 'warrior', 0x7cff9a, 'Party member'); A.lv = LV; A.x = q.x; A.z = q.z; A.peer = p.peer; A.slow = !!ONLINE.rest; ONLINE.avatars.set(p.peer, A); nameAvatar(A, p); }
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
  return `${ONLINE.rest ? restNameRow() : ''}<p class="hint" style="margin:0 0 12px">${tab === 'deep' ? 'Deepest descent by each delver on this page.' : `This week’s rift (${esc(weeklyDef().key)}), fastest first. Race a ghost to see their path beside yours; with none chosen you race the fastest.`}</p>${await boardHtml(tab === 'deep' ? 'deep' : 'week')}`;
}
function onlineAct(d) {
  switch (d.act) {
    case 'ghostPick': ghostPick(d.k); return true;
    case 'olName': restNameSave(); return true;
    case 'ptNew': partyJoin(newPartyCode()); return true;
    case 'ptJoin': { const v = $('#ptCode'); partyJoin(v ? v.value : ''); return true; }
    case 'ptLeave': partyLeave(false); return true;
    case 'ptGo': { const c = parseRiftCode(d.k); if (c && LV.type === 'town') { partyGo(c.code); closePanel(); startRift(0, false, c); } return true; }
    case 'ptAnswer': { const I = ONLINE.invite; ONLINE.invite = null; hideInvite(); const c = I && parseRiftCode(I.code); if (c && LV.type === 'town') { closePanel(); startRift(0, false, c); } return true; }
    default: return false;
  }
}
