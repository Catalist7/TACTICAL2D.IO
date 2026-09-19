
/* Красные бочки: взрыв, урон, цепочка, награда, столкновения и расстановка. */
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const T = CFG.TILE;

Math.random = mulberry32(4242);
progress.tutorial = 'done';
progress.completed = 8;

const step = n => { for (let i = 0; i < n; i++) updateWorld(DT); };
const at = (tx, ty) => ({ x: (tx + 0.5) * T, y: (ty + 0.5) * T });

/** Бой на третьем уровне — там есть открытый двор 9×9: без врагов,
 *  заложников и бочек расстановки. */
function arena(squad = []) {
  progress.squad = squad.map(([cls, level]) => ({ cls, level }));
  startLevel(2);
  beginLive();
  bots.forEach(b => { b.alive = false; });
  hostages.forEach(h => { h.alive = false; h.rescued = true; });
  barrels = [];
  blasts = [];
}

/** Открытая площадка n×n клеток: левый верхний тайл. */
function openArea(n) {
  for (let ty = 1; ty < MAP_H - n; ty++)
    for (let tx = 1; tx < MAP_W - n; tx++) {
      let ok = true;
      for (let j = 0; j < n && ok; j++)
        for (let i = 0; i < n && ok; i++) if (!walkable(tx + i, ty + j)) ok = false;
      if (ok) return { tx, ty };
    }
  return null;
}

/** Враг в точке: живой, на посту, с заданной защитой. */
function enemyAt(p, { armor = 0, helmet = false } = {}) {
  const b = new Bot({ at: { x: p.x, y: p.y }, facing: 0 }, 'ak', skillForRound(1), T_KITS[0]);
  b.armor = armor; b.helmet = helmet;
  bots.push(b);
  return b;
}

// ── Бочка и выстрел ───────────────────────────────────────────────────────
{
  arena();
  const a = openArea(9);
  say(!!a, 'на карте нашлась площадка 9×9');
  const c = at(a.tx + 4, a.ty + 4);
  const br = addBarrel(c.x, c.y);
  say(br && br.alive && barrels.includes(br), 'бочка ставится и стоит живой');

  player.x = c.x - 4 * T; player.y = c.y;
  hitscan(player.x, player.y, 0, playerWeapon('usp'), player);
  say(!br.alive, 'одна пуля игрока взрывает бочку');
  say(blasts.length === 1, 'взрыв виден');
  say(decals.some(d => d.kind === 'scorch'), 'на полу осталась опалина');
}

// ── Урон по расстоянию ────────────────────────────────────────────────────
{
  arena();
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  const br = addBarrel(c.x, c.y);
  const close = enemyAt({ x: c.x + 1.5 * T, y: c.y });
  const vest = enemyAt({ x: c.x - 1.5 * T, y: c.y }, { armor: CFG.ARMOR_MAX });
  const edge = enemyAt({ x: c.x, y: c.y + 2.7 * T });
  const far = enemyAt({ x: c.x - 3.6 * T, y: c.y + T });
  br.by = player;
  explodeBarrel(br);
  say(close.alive && Math.abs(close.hp - (CFG.BOT_HP - BARREL.DMG)) < 1e-6,
      `с одного взрыва не убивает: враг рядом теряет ${BARREL.DMG} и жив`);
  say(vest.alive && Math.abs(vest.hp - close.hp) < 1e-6, 'бронежилет врага от взрыва не спасает');
  say(edge.alive && edge.hp > close.hp && edge.hp < CFG.BOT_HP, 'враг у края взрыва ранен слабее');
  say(far.alive && far.hp === CFG.BOT_HP, 'враг за радиусом взрыва цел');
  say(blastDamage(0) === BARREL.DMG && blastDamage(BARREL.BLAST) < blastDamage(BARREL.BLAST * 0.75)
      && blastDamage(BARREL.BLAST * 0.75) < BARREL.DMG, 'вблизи полный урон, к краю взрыва слабее');
}

// ── Стена гасит взрыв ─────────────────────────────────────────────────────
{
  arena();
  // Клетка пола, за ней одна клетка стены, за ней снова пол.
  let spot = null;
  for (let ty = 2; ty < MAP_H - 2 && !spot; ty++)
    for (let tx = 2; tx < MAP_W - 3 && !spot; tx++)
      if (walkable(tx, ty) && cell(tx + 1, ty) === WALL && walkable(tx + 2, ty)
          && cell(tx + 1, ty - 1) === WALL && cell(tx + 1, ty + 1) === WALL) spot = { tx, ty };
  say(!!spot, 'нашлась стена толщиной в клетку');
  const c = at(spot.tx, spot.ty);
  const br = addBarrel(c.x, c.y);
  const behind = enemyAt(at(spot.tx + 2, spot.ty));
  br.by = player;
  explodeBarrel(br);
  say(behind.alive && behind.hp === CFG.BOT_HP, 'враг за стеной в двух клетках цел');
}

// ── Взрыв бьёт и по своим ─────────────────────────────────────────────────
{
  arena([['assault', 1]]);
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  let br = addBarrel(c.x, c.y);
  player.x = c.x + T; player.y = c.y; player.hp = 100; player.armor = 0;
  const ally = allies[0];
  ally.x = c.x - T; ally.y = c.y; ally.armor = 0;
  const allyHp = ally.hp;
  const h = hostages[0];
  h.alive = true; h.rescued = false; h.hp = CFG.HOSTAGE_HP;
  h.x = c.x; h.y = c.y + T;
  br.by = player;
  explodeBarrel(br);
  say(player.alive && Math.abs(player.hp - (100 - BARREL.DMG)) < 1e-6, `игрок рядом со взрывом теряет ${BARREL.DMG}`);
  say(Math.abs(ally.hp - (allyHp - BARREL.DMG)) < 1e-6, 'боец отряда рядом со взрывом — тоже');
  say(h.alive && h.hp === CFG.HOSTAGE_HP, 'заложника взрыв не трогает');

  // Бронежилет игрока гасит взрыв так же, как пулю.
  br = addBarrel(c.x, c.y);
  player.hp = 100; player.armor = 100;
  br.by = player;
  explodeBarrel(br);
  say(player.hp === 100 && Math.abs(player.armor - (100 - BARREL.DMG)) < 1e-6, 'бронежилет игрока принимает взрыв на себя');
}

// ── Щит принимает взрыв спереди ───────────────────────────────────────────
{
  arena([['shield', 1]]);
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  const br = addBarrel(c.x, c.y);
  const sh = allies[0];
  sh.x = c.x + T; sh.y = c.y; sh.ang = Math.PI;           // смотрит на бочку
  player.x = c.x - 4 * T; player.y = c.y + 3 * T;        // поджёг сбоку, не спереди щита
  const hp0 = sh.hp, shield0 = sh.shield;
  br.by = player;
  explodeBarrel(br);
  say(sh.hp === hp0 && sh.shield < shield0, 'щитоносец лицом к бочке принимает взрыв щитом');
}

// ── Напарник не поджигает бочку рядом со своими ───────────────────────────
{
  arena([['assault', 1]]);
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  const ally = allies[0];
  ally.x = c.x - 4 * T; ally.y = c.y;
  const foe = enemyAt({ x: c.x + 3 * T, y: c.y });
  player.x = c.x + T; player.y = c.y + 2.5 * T;          // в зоне взрыва, но в стороне от линии огня
  say(!ally.lineBlocked(foe.x, foe.y), 'без бочки игрок линию огня не перекрывает');
  addBarrel(c.x, c.y);                                   // бочка на линии огня
  say(ally.lineBlocked(foe.x, foe.y), 'бочка на линии огня, игрок в зоне её взрыва — напарник не стреляет');
  player.x = c.x - 3 * T; player.y = c.y + 4 * T;
  say(!ally.lineBlocked(foe.x, foe.y), 'свои далеко от бочки — стреляет');
  ally.x = c.x - 1.5 * T; ally.y = c.y + T;              // сам у бочки
  say(ally.lineBlocked(foe.x, foe.y), 'и не стреляет через бочку, у которой стоит сам');
}

// ── Цепочка ───────────────────────────────────────────────────────────────
{
  arena();
  const a = openArea(9);
  const c = at(a.tx + 1, a.ty + 4);
  const first = addBarrel(c.x, c.y);
  const second = addBarrel(c.x + 2 * T, c.y);
  const lone = addBarrel(c.x + 7 * T, c.y);
  player.x = c.x - 5 * T; player.y = c.y;
  first.by = player;
  explodeBarrel(first);
  say(second.alive, 'соседняя бочка взрывается не мгновенно, а следом');
  step(Math.ceil(BARREL.CHAIN / DT) + 2);
  say(!second.alive, 'соседняя бочка подхватила взрыв');
  say(lone.alive, 'дальняя бочка устояла');
  say(blasts.length >= 1, 'второй взрыв тоже виден');
}

// ── Награда: кто поджёг, тому и ликвидация ────────────────────────────────
{
  arena([['assault', 1]]);
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  let br = addBarrel(c.x, c.y);
  // Взрыв добивает раненых; целый враг его переживает.
  enemyAt({ x: c.x + T, y: c.y }).hp = 50;
  enemyAt({ x: c.x, y: c.y + T }).hp = 50;
  const whole = enemyAt({ x: c.x, y: c.y - T });
  const money0 = progress.money, kills0 = player.kills;
  player.x = c.x - 4 * T; player.y = c.y;
  hitscan(player.x, player.y, 0, playerWeapon('usp'), player);
  say(player.kills === kills0 + 2 && whole.alive, 'двое добитых взрывом засчитаны игроку, целый враг жив');
  say(progress.money === money0 + 2 * CFG.PAY_KILL, 'и оплачены как обычные ликвидации');

  whole.alive = false;
  br = addBarrel(c.x, c.y);
  enemyAt({ x: c.x + T, y: c.y }).hp = 50;
  const ally = allies[0];
  ally.x = c.x; ally.y = c.y - 4 * T;
  const squad0 = player.squadKills;
  hitscan(ally.x, ally.y, Math.PI / 2, weaponOf(ally), ally);
  say(!br.alive, 'пуля бойца отряда тоже взрывает бочку');
  say(player.squadKills === squad0 + 1, 'ликвидация засчитана отряду');
}

// ── Пуля врага бочку не трогает ───────────────────────────────────────────
{
  arena();
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  const br = addBarrel(c.x, c.y);
  const shooter = enemyAt({ x: c.x - 3 * T, y: c.y });
  player.x = c.x + 3 * T; player.y = c.y;
  hitscan(shooter.x, shooter.y, 0, WEAPONS.ak, shooter);
  say(br.alive, 'пуля врага пролетает бочку насквозь');
}

// ── Грохот слышно ─────────────────────────────────────────────────────────
{
  arena();
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  const br = addBarrel(c.x, c.y);
  const listener = enemyAt({ x: c.x + 8 * T, y: c.y });
  listener.mode = 'guard';
  br.by = player;
  explodeBarrel(br);
  say(listener.alive && listener.mode === 'alert', 'враг в восьми клетках услышал взрыв и насторожился');
  say(listener.lookAt && dist(listener.lookAt.x, listener.lookAt.y, c.x, c.y) < 1,
      'и смотрит туда, где грохнуло');
}

// ── Сквозь бочку не пройти ────────────────────────────────────────────────
{
  arena([['assault', 1]]);
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  addBarrel(c.x, c.y);
  const ally = allies[0];
  ally.x = c.x + 3; ally.y = c.y;
  player.x = c.x - 2; player.y = c.y + 1;
  const b = enemyAt({ x: c.x, y: c.y - 4 });
  separateEntities();
  say(dist(ally.x, ally.y, c.x, c.y) >= ally.r + BARREL.R - 0.5, 'боец отряда выходит из бочки');
  say(dist(player.x, player.y, c.x, c.y) >= player.r + BARREL.R - 0.5, 'игрок выходит из бочки');
  say(dist(b.x, b.y, c.x, c.y) >= b.r + BARREL.R - 0.5, 'враг выходит из бочки');
  say(barrels[0].x === c.x && barrels[0].y === c.y, 'бочка стоит на месте');
}

// ── Новый раунд — бочки заново ────────────────────────────────────────────
{
  progress.squad = [];
  startLevel(0);
  const spots = barrelSpots();
  say(barrels.length === spots.length && barrels.every(b => b.alive), 'в начале раунда все бочки на местах');
  beginLive();
  barrels[0].by = player;
  explodeBarrel(barrels[0]);
  startRound();
  say(barrels.length === spots.length && barrels.every(b => b.alive), 'в следующем раунде бочки стоят снова');
}

// ── Расстановка ───────────────────────────────────────────────────────────
{
  const bfs = (sx, sy) => {
    const d = new Int32Array(MAP_W * MAP_H).fill(-1);
    const q = [[sx, sy]]; d[gi(sx, sy)] = 0;
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!walkable(nx, ny) || d[gi(nx, ny)] >= 0) continue;
        d[gi(nx, ny)] = d[gi(x, y)] + 1;
        q.push([nx, ny]);
      }
    }
    return d;
  };
  const bad = {};
  const fail = (what, name) => { (bad[what] = bad[what] || []).push(name); };
  const LEVELS_TO_CHECK = 32;
  let total = 0;
  for (let i = 0; i < LEVELS_TO_CHECK; i++) {
    const lv = levelAt(i);
    loadMap(lv.map, lv.enemies);
    const name = MAP_NAME;
    const spots = barrelSpots();
    total += spots.length;
    if (spots.length < BARREL.MIN || spots.length > BARREL.MAX) fail('число бочек', `${name}: ${spots.length}`);
    const sp = { tx: Math.floor(SPAWN_CT.x / T), ty: Math.floor(SPAWN_CT.y / T) };
    const fromSpawn = bfs(sp.tx, sp.ty);
    for (const s of spots) {
      const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T);
      let open = true;
      for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (!walkable(tx + k, ty + j)) open = false;
      if (!open) fail('не в проходе', name);
      const posts = ENEMY_POSTS.map(p => dist(p.at.x, p.at.y, s.x, s.y));
      if (Math.min(...posts) < BARREL.POST_MIN * T - 1) fail('не на посту', name);
      const covers = ENEMY_POSTS.some(p => dist(p.at.x, p.at.y, s.x, s.y) <= BARREL.POST_MAX * T + 1
                                          && lineClear(s.x, s.y, p.at.x, p.at.y));
      if (!covers) fail('рядом с постом', name);
      if (HOSTAGE_POS.some(h => dist(h.x, h.y, s.x, s.y) < T)) fail('не на заложнике', name);
      if (s.x > RESCUE.x - T && s.x < RESCUE.x + RESCUE.w + T && s.y > RESCUE.y - T && s.y < RESCUE.y + RESCUE.h + T)
        fail('не в зоне эвакуации', name);
      if (fromSpawn[gi(tx, ty)] < BARREL.FROM_SPAWN) fail('не у старта', name);
      // Бочку видно откуда-то с пути игрока, не вплотную, и враг на посту
      // не стоит на линии выстрела — пуля должна долететь до бочки.
      let seen = false;
      for (let y = ty - BARREL.SIGHT_MAX; y <= ty + BARREL.SIGHT_MAX && !seen; y++)
        for (let x = tx - BARREL.SIGHT_MAX; x <= tx + BARREL.SIGHT_MAX && !seen; x++) {
          if (!walkable(x, y)) continue;
          const d = Math.hypot(x - tx, y - ty);
          if (d < BARREL.SIGHT_MIN || d > BARREL.SIGHT_MAX) continue;
          if (fromSpawn[gi(x, y)] < 0 || fromSpawn[gi(x, y)] >= fromSpawn[gi(tx, ty)]) continue;
          const ax = (x + .5) * T, ay = (y + .5) * T;
          if (!lineClear(ax, ay, s.x, s.y)) continue;
          if (ENEMY_POSTS.every(p => segDist(p.at.x, p.at.y, ax, ay, s.x, s.y) > CFG.BOT_R + BARREL.R)) seen = true;
        }
      if (!seen) fail('видна с подхода', name);
    }
    // Бочки на всём пути, а не только в первых комнатах.
    const far = Math.max(...ENEMY_POSTS.map(p => fromSpawn[gi(Math.floor(p.at.x / T), Math.floor(p.at.y / T))]));
    const last = Math.max(...spots.map(s => fromSpawn[gi(Math.floor(s.x / T), Math.floor(s.y / T))]));
    if (last < far * 0.5) fail('и в дальней части уровня', `${name}: ${last} из ${far}`);
    for (let a = 0; a < spots.length; a++)
      for (let b = a + 1; b < spots.length; b++)
        if (dist(spots[a].x, spots[a].y, spots[b].x, spots[b].y) < BARREL.SPACING * T - 1) fail('расстояние между бочками', name);

    // Тот же уровень — те же бочки.
    const again = (loadMap(lv.map, lv.enemies), barrelSpots());
    if (JSON.stringify(again) !== JSON.stringify(spots)) fail('одинаковые при повторе', name);
  }
  for (const what of ['число бочек', 'не в проходе', 'не на посту', 'рядом с постом', 'не на заложнике',
                      'не в зоне эвакуации', 'не у старта', 'видна с подхода', 'и в дальней части уровня', 'расстояние между бочками',
                      'одинаковые при повторе'])
    say(!bad[what], `расстановка на ${LEVELS_TO_CHECK} уровнях: ${what}` + (bad[what] ? ` — ${bad[what].slice(0, 4).join('; ')}` : ''));
  console.log(`  бочек на ${LEVELS_TO_CHECK} уровнях: ${total}`);
}

// ── Бочка помогает: каждая сильно ранит хотя бы одного врага на посту ─────
{
  const weak = [];
  for (const i of [0, 1, 2, 5, 11, 17, 24]) {
    progress.squad = [];
    progress.completed = Math.max(progress.completed, i);
    startLevel(i);
    state.round = 6;                       // враги в бронежилетах и шлемах
    // Каждую бочку — в свежем раунде: соседняя не должна заранее снять общего врага.
    for (let k = 0; k < barrelSpots().length; k++) {
      startRound();
      beginLive();
      bots.forEach(b => { b.armor = CFG.ARMOR_MAX; b.helmet = true; });
      const br = barrels[k];
      br.by = player;
      explodeBarrel(br);
      if (!bots.some(b => !b.alive || b.hp <= CFG.BOT_HP - 50)) weak.push(`${MAP_NAME} (${Math.floor(br.x / T)},${Math.floor(br.y / T)})`);
    }
  }
  say(!weak.length, 'каждая бочка снимает с врага на посту не меньше 50 здоровья' + (weak.length ? ` — ${weak.join('; ')}` : ''));
}

// ── Рисование и панель разработчика ───────────────────────────────────────
{
  arena();
  const a = openArea(9);
  const c = at(a.tx + 4, a.ty + 4);
  addBarrel(c.x, c.y);
  const br = addBarrel(c.x + 3 * T, c.y);
  br.by = player;
  explodeBarrel(br);
  let threw = null;
  try { for (let i = 0; i < 20; i++) { updateWorld(DT); render(); } } catch (e) { threw = e; }
  say(!threw, 'бочки, взрыв и миникарта рисуются без ошибок' + (threw ? ` — ${threw.message}` : ''));
  step(120);
  say(blasts.length === 0, 'взрыв гаснет');

  const n = barrels.length;
  // Курсор — на свободный пол между бочками.
  mouse.x = (c.x + 1.5 * T - camera.x) * zoom(); mouse.y = (c.y - camera.y) * zoom();
  const out = runAdminCommand('barrel');
  say(barrels.length === n + 1 && barrels[barrels.length - 1].alive, 'команда barrel ставит бочку под курсор');
  say(typeof out === 'string' && out.length > 0, 'и отвечает в консоли');
}
