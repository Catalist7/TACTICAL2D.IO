
const DT = 1 / 60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };

startLevel(0); beginLive();
console.log(`  окно 1440×900 → масштаб ×${zoom().toFixed(2)}, видно ${viewWorld().w.toFixed(0)}×${viewWorld().h.toFixed(0)} мира`);

// Ставим всех в поле зрения игрока, чтобы измерить худший случай.
player.x = 1000; player.y = 600; player.ang = 0;
bots.forEach((b, i) => { b.x = 1120 + i * 40; b.y = 540 + i * 30; b.alive = true; });
hostages.forEach((h, i) => { h.x = 1080 + i * 36; h.y = 660; h.following = i < 2; });
for (let i = 0; i < 30; i++) { updateRound(DT); updateWorld(DT); }

globalThis.__calls = 0;
const N = 120;
for (let i = 0; i < N; i++) render();
const perFrame = globalThis.__calls / N;
say(perFrame < 6000, `вызовов canvas за кадр: ${perFrame.toFixed(0)}`);

// Сколько из них стоят фигуры.
globalThis.__calls = 0;
for (let i = 0; i < N; i++) { drawPlayer(); drawBots(); drawHostages(true); drawHostages(false); }
const figs = globalThis.__calls / N;
console.log(`  из них на модели бойцов: ${figs.toFixed(0)} вызовов (${bots.filter(b=>b.alive).length} ботов + 4 заложника + игрок)`);

// Лист моделей рисуется только по клавише — проверяем отдельно.
let err = null;
try { state.sheet = true; for (let i = 0; i < 20; i++) render(); } catch (e) { err = e; }
say(!err, err ? 'ПАДЕНИЕ листа моделей: ' + err.message : 'лист моделей (M) отрисовывается без исключений');
state.sheet = false;

// Трупы всех типов.
err = null;
try {
  killEntity(bots[0], player);
  killEntity(hostages[0], player);
  const saved = player.alive; killEntity(player, bots[1]); player.alive = saved;
  for (let i = 0; i < 20; i++) render();
} catch (e) { err = e; }
say(!err, err ? 'ПАДЕНИЕ на трупах: ' + err.message : `трупы всех трёх типов рисуются (${corpses.length} шт.)`);

// Все стволы в руках — каждая модель хотя бы раз проходит через отрисовку.
err = null;
try {
  for (const wid of Object.keys(WEAPONS)) {
    giveWeapon(player, wid);
    player.active = WEAPONS[wid].slot;
    player.reloading = wid === 'awp' ? 1 : 0;
    render();
  }
} catch (e) { err = e; }
say(!err, err ? 'ПАДЕНИЕ на оружии: ' + err.message : `все ${Object.keys(WEAPONS).length} моделей оружия отрисованы`);
