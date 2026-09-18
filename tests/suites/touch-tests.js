
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
