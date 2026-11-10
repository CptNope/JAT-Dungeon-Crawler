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
