
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';
const T = CFG.TILE;

// Воспроизводимая случайность: разброс и задержки не должны делать тест мигающим.
Math.random = mulberry32(4242);

startLevel(0); beginLive();
const freezeAll = () => { bots.forEach(b => { b.alive = false; }); hostages.forEach(h => { h.alive = false; }); };

/** Прямой коридор: 12 свободных клеток по горизонтали и по клетке сверху и снизу. */
function lane() {
  for (let ty = 2; ty < MAP_H - 2; ty++)
    for (let tx = 2; tx < MAP_W - 14; tx++) {
      let ok = true;
      for (let i = 0; i < 12 && ok; i++)
        for (let j = -1; j <= 1; j++) if (!walkable(tx + i, ty + j)) ok = false;
      if (ok) return { x0: (tx + .5) * T, y: (ty + .5) * T };
    }
  return null;
}
const L = lane();
say(!!L, 'на карте нашёлся прямой коридор для замеров');

/** Бот на посту в коридоре. Пост совпадает с точкой старта. */
function botAt(x, y, ang, round = 1) {
  freezeAll();
  const b = bots[0];
  Object.assign(b, { x, y, ang, facing: ang, post: { x, y }, alive: true, hp: 100, armor: 0,
                     mode: 'guard', lookAt: null, lastKnown: null, goal: null, path: null,
                     cooldown: 0, reloading: 0, spread: 0, skill: skillForRound(round) });
  b.setMode('guard');
  return b;
}

// ── Параметры ────────────────────────────────────────────────────────────
{
  const s1 = skillForRound(1), s10 = skillForRound(10);
  say(CFG.BOT_SPEED === 115, `боты медленнее: ${CFG.BOT_SPEED} px/с (было 142)`);
  say(CFG.BOT_LEASH === 120, `радиус перемещения меньше: ${CFG.BOT_LEASH} px, 3 клетки (было 180)`);
  say(CFG.BOT_TRACK === 4.5, `прицел за целью ведут медленнее: ${CFG.BOT_TRACK} рад/с (было 6.5)`);
  say(Math.abs(s1.react - 1.05) < 1e-9 && Math.abs(s10.react - 0.6) < 1e-9,
      `реакция медленнее: ${s1.react.toFixed(2)} → ${s10.react.toFixed(2)} с (было 0.75 → 0.42)`);
  say(Math.abs(s1.aim - 0.22) < 1e-9 && Math.abs(s10.aim - 0.105) < 1e-9,
      `разброс больше: +${s1.aim.toFixed(3)} → +${s10.aim.toFixed(3)} (было 0.155 → 0.075)`);
  say(s10.react > s1.react * 0.5 && s10.aim < s1.aim, 'к десятому раунду боты всё ещё острее, чем в первом');
  say(CFG.PLAYER_SPEED * 0.7 > CFG.BOT_SPEED, 'даже в сапёрном костюме игрок заметно быстрее ботов');
}

// ── Скорость на деле: возвращение на пост ────────────────────────────────
{
  const b = botAt(L.x0, L.y, 0);
  b.x = L.x0 + 8 * T;                          // снесло с поста — идёт назад
  const x0 = b.x;
  for (let i = 0; i < 30; i++) b.update(DT);
  const v = (x0 - b.x) / (30 * DT);
  say(v > 0 && v <= CFG.BOT_SPEED + 0.5, `на пост возвращается не быстрее ${CFG.BOT_SPEED} px/с: ${v.toFixed(0)} px/с`);
}

// ── Реакция: увидел — стреляет не сразу ──────────────────────────────────
{
  const b = botAt(L.x0, L.y, 0);
  player.alive = true; player.hp = 1e9; player.armor = 0;
  player.x = L.x0 + 6 * T; player.y = L.y;
  let t = 0, firstShot = null;
  const mag0 = ammoOf(b, b.weapon).mag;
  for (let i = 0; i < 180 && firstShot === null; i++) {
    b.update(DT); t += DT;
    if (ammoOf(b, b.weapon).mag < mag0) firstShot = t;
  }
  say(b.mode === 'engage', 'бот увидел игрока и вступил в бой');
  say(firstShot !== null && firstShot >= skillForRound(1).react * 0.85,
      `первый выстрел через ${firstShot && firstShot.toFixed(2)} с — не раньше реакции ~${skillForRound(1).react.toFixed(2)} с`);
}

// ── Ведение прицела медленнее ────────────────────────────────────────────
{
  // Игрок вплотную (его видно и боковым зрением) рывками перескакивает с одного
  // бока бота на другой: цель требует разворота быстрее потолка.
  const b = botAt(L.x0 + 6 * T, L.y, Math.PI);
  const side = s => { player.x = b.x - Math.cos(0.8) * 60; player.y = b.y + s * Math.sin(0.8) * 60; };
  side(1); b.update(DT);
  let maxRate = 0;
  for (let i = 0; i < 90; i++) {
    side(Math.floor(i / 12) % 2 ? -1 : 1);
    const a0 = b.ang;
    b.update(DT);
    maxRate = Math.max(maxRate, Math.abs(angDiff(b.ang, a0)) / DT);
  }
  say(b.mode === 'engage', 'бот ведёт бой с игроком, который мечется у него сбоку');
  say(maxRate <= CFG.BOT_TRACK + 1e-6 && maxRate > CFG.BOT_TRACK * 0.9,
      `прицел упирается в потолок ${CFG.BOT_TRACK} рад/с: максимум ${maxRate.toFixed(2)} (было бы до 6.5)`);
}

// ── Меткость: из 200 выстрелов попадают реже, чем раньше ─────────────────
{
  const hits = aimAdd => {
    Math.random = mulberry32(777);
    const b = botAt(L.x0, L.y, 0);
    b.weapon = 'ak'; giveWeapon(b, 'ak');
    player.x = L.x0 + 7 * T; player.y = L.y; player.alive = true; player.armor = 0;
    let n = 0;
    for (let i = 0; i < 200; i++) {
      player.hp = 1e9;
      b.cooldown = 0; b.reloading = 0; b.spread = 0; ammoOf(b, 'ak').mag = 30;
      fireWeapon(b, 0, aimAdd);
      if (player.hp < 1e9) n++;
    }
    return n;
  };
  const was = hits(0.155), now = hits(skillForRound(1).aim);
  say(now < was, `с 280 px AK бота попадает реже: ${now} из 200 против ${was} раньше`);
  Math.random = mulberry32(4243);
}

// ── Обстрел из невидимой точки: попадание ────────────────────────────────
{
  // Игрок за спиной у бота в 7 клетках — в конус не попадает.
  const b = botAt(L.x0 + 8 * T, L.y, 0);
  player.x = L.x0 + T; player.y = L.y; player.alive = true; player.hp = 100;
  b.update(DT);
  say(b.mode === 'guard' && !botSees(b, player.x, player.y), 'бот стоит спиной и игрока не видит');
  const pos = { x: b.x, y: b.y };
  hitscan(player.x, player.y, Math.atan2(b.y - player.y, b.x - player.x), WEAPONS.usp, player);
  say(b.hp < 100 && b.mode === 'alert', 'после попадания из-за спины бот насторожился');
  say(b.lookAt && Math.hypot(b.lookAt.x - player.x, b.lookAt.y - player.y) < 1, 'и смотрит туда, откуда прилетела пуля');
  // Разворот закончен, когда стрелок попал в конус зрения — тогда бот его и видит.
  let turnedAt = null, t = 0, moved = 0;
  for (let i = 0; i < 150 && b.mode !== 'engage'; i++) {
    b.update(DT); t += DT;
    if (b.mode === 'alert') moved = Math.max(moved, Math.hypot(b.x - pos.x, b.y - pos.y));
    if (turnedAt === null && b.mode === 'engage') turnedAt = t;
  }
  const facing = Math.abs(angDiff(Math.atan2(player.y - b.y, player.x - b.x), b.ang));
  say(turnedAt !== null && turnedAt > 0.3,
      `развернулся к стрелку и увидел его через ${turnedAt && turnedAt.toFixed(2)} с — не мгновенно`);
  say(facing <= CFG.FOV / 2, `в момент обнаружения стрелок в конусе: ${(facing * 180 / Math.PI).toFixed(0)}° от взгляда`);
  say(moved < 1, 'пока разворачивался, с места не сходил');
  say(b.mode === 'engage', 'стрелок оказался в конусе — бот его увидел и вступил в бой');
}

// ── Пуля вплотную и пуля далеко ──────────────────────────────────────────
{
  const b = botAt(L.x0 + 8 * T, L.y, 0);
  player.x = L.x0 + T; player.y = L.y - 0.9 * T;
  // Выстрел вдоль коридора с промахом: проходит в ~20 px от бота.
  const aim = Math.atan2((b.y - 20) - player.y, b.x - player.x);
  hitscan(player.x, player.y, aim, WEAPONS.usp, player);
  say(b.hp === 100 && b.mode === 'alert', 'пуля прошла вплотную, не задев — бот всё равно обернулся');

  const c = botAt(L.x0 + 8 * T, L.y, 0);
  player.x = L.x0 + T; player.y = L.y;
  hitscan(player.x, player.y, -Math.PI / 2, WEAPONS.usp, player);   // в потолок, далеко от бота
  say(c.mode === 'guard', 'выстрел в другую сторону бота не тревожит');
}

// ── Кто не реагирует ─────────────────────────────────────────────────────
{
  const b = botAt(L.x0 + 4 * T, L.y, Math.PI);
  player.x = L.x0; player.y = L.y;
  b.update(DT);
  say(b.mode === 'engage', 'бот в бою видит игрока');
  b.onShot(L.x0 + 10 * T, L.y);
  say(b.mode === 'engage', 'в бою на обстрел не отвлекается');

  const c = botAt(L.x0 + 4 * T, L.y, 0);
  c.setMode('cover'); c.setGoal(L.x0 + 6 * T, L.y);
  c.onShot(L.x0, L.y);
  say(c.mode === 'cover', 'отходящий в укрытие продолжает отходить');

  const d = botAt(L.x0 + 8 * T, L.y, 0);
  const shooter = bots[1]; shooter.alive = true; shooter.x = L.x0 + T; shooter.y = L.y;
  hitscan(shooter.x, shooter.y, 0, WEAPONS.ak, shooter);
  say(d.mode === 'guard', 'на выстрелы своих не оборачиваются');
  shooter.alive = false;
}

// ── Нож со спины ─────────────────────────────────────────────────────────
{
  const b = botAt(L.x0 + 4 * T, L.y, 0);
  player.x = b.x - 24; player.y = b.y; player.ang = 0;
  player.active = 'melee'; player.cooldown = 0; player.alive = true;
  fireWeapon(player, 0);
  say(b.hp < 100 && b.mode === 'alert' && b.lookAt, 'ударили ножом со спины — бот оборачивается');
}

// ── Поводок в бою: не дальше 120 px за 20 секунд перестрелки ─────────────
{
  const b = botAt(L.x0 + 6 * T, L.y, Math.PI);
  player.x = L.x0; player.y = L.y; player.hp = 1e9; player.alive = true;
  let far = 0;
  for (let i = 0; i < 20 * 60; i++) {
    player.y = L.y + Math.sin(i / 40) * 30;
    b.hp = 100;
    b.update(DT);
    far = Math.max(far, Math.hypot(b.x - b.post.x, b.y - b.post.y));
  }
  say(far <= CFG.BOT_LEASH + 0.5, `за 20 секунд боя отошёл от поста максимум на ${far.toFixed(0)} px из ${CFG.BOT_LEASH}`);
}
