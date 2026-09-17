
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) { updateRound(DT); updateWorld(DT); } };

startLevel(0); beginLive();

// Ищем на карте прямой свободный коридор, чтобы тест не зависел от расстановки ящиков.
function findOpenLane(minTiles) {
  for (let ty = 1; ty < MAP_H - 1; ty++) {
    let run = 0;
    for (let tx = 1; tx < MAP_W; tx++) {
      if (walkable(tx, ty)) {
        run++;
        if (run >= minTiles) return { ty, x0: tx - run + 1, x1: tx };
      } else run = 0;
    }
  }
  return null;
}
const lane = findOpenLane(9);
if (!lane) { console.log('✗ на карте нет прямого коридора длиной 9 тайлов'); process.exit(1); }
console.log(`  коридор для теста: y=${lane.ty}, x=${lane.x0}..${lane.x1}`);
// Заложников убираем с линии — их поведение проверяется отдельно.
hostages.forEach(h => { h.x = SPAWN_CT.x; h.y = SPAWN_CT.y; });

// ── Бот видит игрока и открывает огонь ─────────────────────────────────
const b = bots[0];
const bPos = tc(lane.x1, lane.ty), pPos = tc(lane.x0, lane.ty);
b.x = bPos.x; b.y = bPos.y; b.ang = Math.PI;
b.post = { x: bPos.x, y: bPos.y }; b.facing = Math.PI;   // поводок вокруг нового места
player.x = pPos.x; player.y = pPos.y; player.ang = 0; player.hp = 100; player.armor = 0;
giveWeapon(b, 'ak');
say(lineClear(b.x, b.y, player.x, player.y), 'между ботом и игроком нет стены');
say(botSees(b, player.x, player.y), 'бот видит игрока в своём конусе');

const hp0 = player.hp;
let engaged = false;
for (let i = 0; i < 600 && player.alive; i++) {
  b.update(DT);
  if (b.mode === 'engage') engaged = true;
}
say(engaged, 'бот перешёл в режим БОЙ');
say(player.hp < hp0, `за 10 секунд боя снял ${(hp0 - Math.max(0, player.hp)).toFixed(0)} HP из ${hp0}`);

// ── Бот не видит игрока за стеной ───────────────────────────────────────
player.x = 220; player.y = 1020;            // спавн спецназа, другой конец карты
b.x = 1400; b.y = 480; b.setMode('guard'); b.react = 0;
say(!botSees(b, player.x, player.y), 'сквозь стены бот игрока не видит');

// ── Бот не стреляет, когда на линии огня заложник ───────────────────────
player.x = pPos.x; player.y = pPos.y; player.hp = 100; player.alive = true;
b.x = bPos.x; b.y = bPos.y; b.ang = Math.PI; b.setMode('engage'); b.react = 0; b.cooldown = 0;
const hostage = hostages[0];
hostage.x = (pPos.x + bPos.x) / 2; hostage.y = pPos.y; hostage.alive = true;
say(b.hostageInLine(player.x, player.y), 'бот распознаёт заложника на линии огня');
const hpBefore = player.hp, hHpBefore = hostage.hp;
// Держим геометрию заблокированной: бота возвращаем на место после каждого кадра,
// иначе он честно обойдёт заложника сбоку — и это уже другое поведение.
for (let i = 0; i < 180; i++) {
  b.update(DT);
  b.x = bPos.x; b.y = bPos.y;
}
say(player.hp === hpBefore && hostage.hp === hHpBefore,
    'пока заложник на линии, бот не делает ни одного выстрела');

// А если заложника убрать — тот же бот открывает огонь. Окно берём с запасом:
// боты теперь мажут, и на коротком отрезке проверка была бы лотереей.
hostage.x = SPAWN_CT.x; hostage.y = SPAWN_CT.y;
b.react = 0; b.cooldown = 0; b.ang = Math.PI;
let fired = 0;
for (let i = 0; i < 300; i++) {
  const mag = ammoOf(b, b.weapon).mag;
  b.update(DT);
  if (ammoOf(b, b.weapon).mag < mag) fired++;
  b.x = bPos.x; b.y = bPos.y;
}
// Проверяем сам факт огня. Попадёт ли — дело случая, точность меряется отдельно ниже;
// требование урона делало тест лотереей: все выстрелы изредка уходят мимо.
say(fired > 0,
    `без заложника открыл огонь: ${fired} выстрелов (урон ${hpBefore - Math.max(0, player.hp)} — зависит от разброса)`);

// ── Насколько именно боты стали мазать ──────────────────────────────────
function accuracy(bot, distPx, shots) {
  player.x = bot.x - distPx; player.y = bot.y;
  player.hp = 1e9; player.armor = 0; player.helmet = false; player.alive = true;
  let hits = 0;
  for (let i = 0; i < shots; i++) {
    bot.spread = 0; bot.cooldown = 0; bot.reloading = 0;   // чистая точность, без отдачи
    ammoOf(bot, bot.weapon).mag = 10;
    const before = player.hp;
    fireWeapon(bot, Math.PI, bot.skill.aim);
    if (player.hp < before) hits++;
  }
  return hits / shots;
}
{
  b.x = bPos.x; b.y = bPos.y; b.ang = Math.PI;
  hostages.forEach(h => { h.alive = false; });   // чтобы не ловили пули на линии
  const near1 = accuracy(b, 140, 400);
  const far1 = accuracy(b, 340, 400);
  b.skill = skillForRound(10);
  const near10 = accuracy(b, 140, 400);
  const far10 = accuracy(b, 340, 400);
  b.skill = skillForRound(1);
  console.log(`  попадания с AK: раунд 1 — ${(near1*100).toFixed(0)}% вблизи, ${(far1*100).toFixed(0)}% на 340px`);
  console.log(`                  раунд 10 — ${(near10*100).toFixed(0)}% вблизи, ${(far10*100).toFixed(0)}% на 340px`);
  say(near1 > 0.35, `вблизи боты всё же опасны — ${(near1*100).toFixed(0)}% попаданий`);
  say(far1 < 0.6, `на дистанции заметно мажут — ${(far1*100).toFixed(0)}% попаданий`);
  say(far10 > far1, 'к десятому раунду точность подрастает');
  hostages.forEach(h => { h.alive = true; });
}

// ── Шум разворачивает, но не сдвигает ───────────────────────────────────
const c = bots[2];
c.mode = 'guard'; c.lastKnown = null; c.alertTimer = 0;
const cAt = { x: c.x, y: c.y };
const cAng = c.ang;
emitNoise(c.x + 300, c.y, 900, 'ct', 'shot');
say(c.mode === 'alert', `на выстрел бот переходит в режим СЕКТОР (${c.mode})`);
for (let i = 0; i < 120; i++) c.update(DT);
say(dist(c.x, c.y, cAt.x, cAt.y) < 1, 'на звук бот не делает ни шагу');
say(Math.abs(angDiff(c.ang, 0)) < Math.abs(angDiff(cAng, 0)) || Math.abs(angDiff(c.ang, 0)) < 0.25,
    'но разворачивается в сторону шума');
for (let i = 0; i < 420; i++) c.update(DT);
say(c.mode === 'guard', 'подержав сектор, возвращается к охране позиции');

// ── Поводок ─────────────────────────────────────────────────────────────
// Сначала сам механизм: сколько ни толкай наружу, за круг не выпустит.
{
  const g = bots[3];
  g.alive = true; g.hp = 100;
  g.post = { x: g.x, y: g.y };
  let maxOut = 0;
  for (let i = 0; i < 1200; i++) {
    const a = (i / 120) * Math.PI;                 // толкаем во все стороны по кругу
    g.leashedMove(Math.cos(a) * 3, Math.sin(a) * 3);
    maxOut = Math.max(maxOut, dist(g.x, g.y, g.post.x, g.post.y));
  }
  say(maxOut <= CFG.BOT_LEASH + 6,
      `механизм поводка держит: максимум ${maxOut.toFixed(0)}px при лимите ${CFG.BOT_LEASH}px`);
  say(maxOut > 40, `при этом бот реально смещается, а не стоит (дошёл до ${maxOut.toFixed(0)}px)`);
}

// Теперь в настоящем бою: игрок виден и далеко, а у бота дробовик —
// значит он всерьёз хочет сократить дистанцию и упрётся в поводок.
{
  function findOpenRect(w, h) {
    for (let ty = 1; ty < MAP_H - h; ty++)
      for (let tx = 1; tx < MAP_W - w; tx++) {
        let free = true;
        for (let dy = 0; dy < h && free; dy++)
          for (let dx = 0; dx < w && free; dx++)
            if (!walkable(tx + dx, ty + dy)) free = false;
        if (free) return { tx, ty };
      }
    return null;
  }
  const spot = findOpenRect(4, 12);
  say(!!spot, spot ? `площадка для теста: тайлы ${spot.tx},${spot.ty} (4×12)` : 'площадки не нашлось');

  const g = bots[3];
  const home = tc(spot.tx + 1, spot.ty + 1);
  const far = tc(spot.tx + 1, spot.ty + 11);
  g.x = home.x; g.y = home.y;
  g.post = { x: home.x, y: home.y };
  g.facing = Math.PI / 2; g.ang = Math.PI / 2;
  g.alive = true; g.hp = 100; g.armor = 0; g.blind = 0;
  giveWeapon(g, 'nova');                      // дробовик рвётся в упор
  g.setMode('engage'); g.react = 0;

  player.alive = true; player.hp = 1e9; player.armor = 0;
  player.x = far.x; player.y = far.y;
  hostages.forEach(h => { h.x = SPAWN_CT.x; h.y = SPAWN_CT.y; });

  const gap = dist(g.post.x, g.post.y, player.x, player.y);
  say(lineClear(g.x, g.y, player.x, player.y) && botSees(g, player.x, player.y),
      `игрок виден боту с ${gap.toFixed(0)}px`);
  say(gap > CFG.BOT_LEASH + 100, 'и стоит заметно дальше поводка — бежать есть куда');

  let maxOut = 0, engagedFrames = 0;
  for (let i = 0; i < 900; i++) {
    g.update(DT);
    if (g.mode === 'engage') engagedFrames++;
    maxOut = Math.max(maxOut, dist(g.x, g.y, g.post.x, g.post.y));
  }
  say(engagedFrames > 600, `бот вёл бой ${(engagedFrames / 60).toFixed(1)}с из 15 — проверка не вхолостую`);
  say(maxOut > 40, `бот рвался вперёд и отошёл на ${maxOut.toFixed(0)}px`);
  say(maxOut <= CFG.BOT_LEASH + 2,
      `но дальше поводка не ушёл: ${maxOut.toFixed(0)}px при лимите ${CFG.BOT_LEASH}px`);
  player.hp = 100;
}

// ── Потеряв цель, возвращается на позицию ───────────────────────────────
{
  const g = bots[4] || bots[0];
  g.alive = true; g.hp = 100;
  g.post = { x: g.x, y: g.y };
  const home = { x: g.post.x, y: g.post.y };
  // Смещаем на заведомо проходимую клетку: если бросить бота в стену,
  // он не сдвинется и тест будет мерить не возврат, а застревание.
  let moved = null;
  for (const [ox, oy] of [[150,0],[-150,0],[0,150],[0,-150],[110,110],[-110,-110]]) {
    if (!hitsWall(home.x + ox, home.y + oy, g.r) &&
        corridorClear(home.x, home.y, home.x + ox, home.y + oy, g.r)) {
      moved = { x: home.x + ox, y: home.y + oy }; break;
    }
  }
  say(!!moved, moved ? `бота отвели на ${dist(moved.x, moved.y, home.x, home.y).toFixed(0)}px от позиции`
                     : 'не нашлось свободного места рядом с позицией');
  g.x = moved.x; g.y = moved.y;
  g.mode = 'guard'; g.goal = null; g.path = null;
  player.x = -9999; player.y = -9999;       // игрока не видно
  for (let i = 0; i < 600; i++) g.update(DT);
  say(dist(g.x, g.y, home.x, home.y) < 40,
      `вернулся на позицию: ${dist(g.x, g.y, home.x, home.y).toFixed(0)}px от неё`);
}

// ── Производительность кадра ────────────────────────────────────────────
startLevel(0); beginLive();
player.x = 1000; player.y = 600;
step(120);                                  // прогреть
const N = 600;
const t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) { updateRound(DT); updateWorld(DT); render(); }
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
say(ms < 16.6, `кадр логики+отрисовки: ${ms.toFixed(2)} мс (бюджет 16.6 мс при 60 fps)`);
