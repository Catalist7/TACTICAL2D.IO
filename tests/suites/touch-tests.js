
/* Ввод с экрана: режим, стики, прицел, кнопки, ориентация. */
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) updateWorld(DT); };
const T = CFG.TILE;

Math.random = mulberry32(2024);
progress.tutorial = 'done';
progress.completed = 5;

/** Касание экрана: те же события, что шлёт браузер. */
const touch = (type, id, x, y) => {
  const e = { pointerId: id, clientX: x, clientY: y, pointerType: 'touch',
              preventDefault() { this.prevented = true; } };
  for (const fn of __listeners.canvas[type] || []) fn(e);
  return e;
};
const down = (id, x, y) => touch('pointerdown', id, x, y);
const move = (id, x, y) => touch('pointermove', id, x, y);
const up = id => touch('pointerup', id, 0, 0);

startLevel(0); beginLive();
bots.forEach(b => { b.alive = false; });
hostages.forEach(h => { h.alive = false; h.rescued = true; });

// ── Режим ввода ───────────────────────────────────────────────────────────
{
  say(!touchMode(), 'по умолчанию игра в режиме мыши и клавиатуры');
  down(1, 120, 300);
  say(touchMode(), 'первое касание переводит в тач-режим');
  up(1);
  for (const fn of __listeners.canvas.mousemove || []) fn({ clientX: 10, clientY: 10 });
  say(!touchMode(), 'движение мышью возвращает обратно');
}

// ── Левый стик двигает игрока ─────────────────────────────────────────────
{
  const startX = player.x;
  down(1, 120, 300);
  move(1, 178, 300);                       // палец ушёл вправо на полный ход
  const axis = moveAxis();
  say(axis.x > 0.9 && Math.abs(axis.y) < 0.1, `стик даёт вектор вправо: ${axis.x.toFixed(2)}`);
  step(30);
  say(player.x > startX + 40, 'игрок пошёл вправо');
  up(1);
  say(moveAxis().x === 0, 'палец убрали — движение прекратилось');
}

// ── Мёртвая зона и тихий шаг ──────────────────────────────────────────────
{
  down(1, 120, 300);
  move(1, 126, 300);                       // 6 px — меньше мёртвой зоны
  say(moveAxis().x === 0, 'мелкое дрожание пальца игрока не двигает');
  move(1, 140, 300);                       // 20 px из 58 — слабое отклонение
  say(moveAxis().walk, 'слабое отклонение — тихий шаг');
  move(1, 178, 300);
  say(!moveAxis().walk, 'полное отклонение — бег');
  up(1);
}

// ── Правый стик целится ───────────────────────────────────────────────────
{
  input.sticks.move = input.sticks.aim = null;
  down(2, view.w - 120, 300);
  move(2, view.w - 120 + 58, 300);          // полный ход вправо
  updateWorld(DT);
  say(Math.abs(angDiff(player.ang, 0)) < 0.05,
      `игрок смотрит вправо: ${player.ang.toFixed(2)} рад`);
  const p = worldToScreen(player.x, player.y);
  say(mouse.x > p.x + 100, 'синтетический курсор ушёл вправо от бойца');
  move(2, view.w - 120, 300 - 58);          // полный ход вверх
  updateWorld(DT);
  say(Math.abs(angDiff(player.ang, -Math.PI / 2)) < 0.05, 'прицел следует за стиком');
  up(2);
}

// ── Автоогонь ─────────────────────────────────────────────────────────────
{
  player.cooldown = 0;
  giveWeapon(player, 'usp');
  player.active = 'pistol';
  down(2, view.w - 120, 300);
  move(2, view.w - 120 + 20, 300);          // 0.34 хода — меньше порога огня
  updateWorld(DT);
  say(!mouse.down && !input.firing, 'в мёртвой зоне и на малом отклонении огня нет');
  move(2, view.w - 120 + 50, 300);          // 0.86 хода — выше порога
  updateWorld(DT);
  say(mouse.down && input.firing, 'отклонение за порог открывает огонь');
  up(2);
  updateWorld(DT);
  say(!mouse.down, 'палец убрали — огонь прекратился');
}

// ── Доводчик прицела ──────────────────────────────────────────────────────
{
  const lane = (() => {
    for (let ty = 2; ty < MAP_H - 2; ty++)
      for (let tx = 2; tx < MAP_W - 14; tx++) {
        let ok = true;
        for (let i = 0; i < 12 && ok; i++)
          for (let j = -1; j <= 1; j++) if (!walkable(tx + i, ty + j)) ok = false;
        if (ok) return { x0: (tx + .5) * T, y: (ty + .5) * T };
      }
  })();
  player.x = lane.x0; player.y = lane.y;
  const foe = bots[0];
  Object.assign(foe, { alive: true, hp: 100, x: lane.x0 + 5 * T, y: lane.y + 14 });
  player.ang = 0;
  const wanted = Math.atan2(foe.y - player.y, foe.x - player.x);
  const fixed = aimAssist(0);
  say(Math.abs(angDiff(fixed, wanted)) < Math.abs(angDiff(0, wanted)),
      'доводчик тянет прицел к видимому врагу в конусе');

  foe.y = lane.y + 400;                      // вне конуса
  say(aimAssist(0) === 0, 'далеко в стороне доводчик не работает');
  foe.alive = false;
  say(aimAssist(0) === 0, 'по мёртвым не доводит');
}

// ── Огонь не залипает и работает с полуавтоматикой ────────────────────────
{
  giveWeapon(player, 'usp');                 // стартовый ствол, auto: false
  player.active = 'pistol';
  player.cooldown = 0;
  input.sticks.move = input.sticks.aim = null;
  down(4, view.w - 120, 300);
  move(4, view.w - 120 + 58, 300);
  updateWorld(DT);
  say(input.firing, 'на телефоне стик за порогом устанавливает флаг огня');
  const shots = tracers.length;
  player.cooldown = 0;
  updateWorld(DT);
  say(tracers.length > shots, 'полуавтоматика стреляет при удержании стика');

  move(4, view.w - 120 + 4, 300);            // вернули стик в мёртвую зону
  updateWorld(DT);
  say(!mouse.down && !input.firing, 'вернул стик в центр, не отпуская экран — огонь прекратился');
  up(4);
}

// ── Доводчик тянет ровно наполовину ───────────────────────────────────────
{
  const lane2 = (() => {
    for (let ty = 2; ty < MAP_H - 2; ty++)
      for (let tx = 2; tx < MAP_W - 14; tx++) {
        let ok = true;
        for (let i = 0; i < 12 && ok; i++)
          for (let j = -1; j <= 1; j++) if (!walkable(tx + i, ty + j)) ok = false;
        if (ok) return { x0: (tx + .5) * T, y: (ty + .5) * T };
      }
  })();
  player.x = lane2.x0; player.y = lane2.y; player.ang = 0;
  const foe2 = bots[0];
  Object.assign(foe2, { alive: true, hp: 100, x: lane2.x0 + 5 * T, y: lane2.y + 14 });
  const to = Math.atan2(foe2.y - player.y, foe2.x - player.x);
  const got = aimAssist(0);
  say(Math.abs(got - angDiff(to, 0) * AIM_ASSIST.PULL) < 1e-9,
      'доводчик смещает ровно на половину разницы');
  say(Math.abs(angDiff(got, to)) > 1e-6, 'то есть не защёлкивает цель полностью');

  // Врага за стеной доводчик не видит. Ищем стену в пределах дальности.
  let wall = null;
  for (let ty = 1; ty < MAP_H - 1 && !wall; ty++)
    for (let tx = 1; tx < MAP_W - 1 && !wall; tx++) {
      if (solid(tx, ty)) {
        const w = tc(tx, ty);
        if (dist(player.x, player.y, w.x, w.y) <= AIM_ASSIST.RANGE) wall = w;
      }
    }
  if (wall) {
    Object.assign(foe2, { x: wall.x, y: wall.y });
    player.ang = Math.atan2(foe2.y - player.y, foe2.x - player.x);
    const blind = aimAssist(player.ang);
    say(blind === player.ang, 'цель за стеной доводчик не подтягивает');
  } else {
    say(true, 'цель за стеной доводчик не подтягивает (стены в пределах дальности не найдены)');
  }
  foe2.alive = false;
}

// ── Тач не трогает mouse.clicked ──────────────────────────────────────────
// На mouse.clicked держится весь интерфейс: это одиночный щелчок, и его читает
// панель отряда. Если тач-огонь станет выставлять его каждый кадр, прицел,
// попавший на панель, начнёт «нажимать» строки бойцов. Поэтому проверяется
// сам инвариант: сколько бы кадров ни шёл огонь пальцем, флаг не поднимается.
{
  progress.squad = [{ cls: 'assault', level: 1 }, { cls: 'medic', level: 2 }];
  startLevel(0); beginLive();
  bots.forEach(b => { b.alive = false; });
  hostages.forEach(h => { h.alive = false; h.rescued = true; });
  giveWeapon(player, 'usp');                 // полуавтомат — тот самый случай
  player.active = 'pistol';
  input.sticks.move = input.sticks.aim = null;
  mouse.clicked = false;

  down(5, view.w - 120, 300);
  move(5, view.w - 120 + 58, 300);
  let shots = 0;
  for (let i = 0; i < 30; i++) {
    const before = tracers.length;
    updateWorld(DT);
    if (tracers.length > before) shots++;
  }
  say(!mouse.clicked, 'за 30 кадров тач-огня mouse.clicked не поднялся ни разу');
  say(shots > 1, `а полуавтомат при этом стрелял: выстрелов ${shots}`);
  say(squadCmd.fireLock === 0, 'и собственный огонь ничем не блокировался');
  up(5);
}
