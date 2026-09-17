
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
const step = n => { for (let i = 0; i < n; i++) { updateRound(DT); updateWorld(DT); render(); } };

progress.completed = 100;
progress.tutorial = 'done';   // иначе обучение держит всё дальше первой операции закрытым                    // уровни бесконечные: «открыть всё» — это с запасом
[0, 1, 2, 3, 6, 9].map(i => [levelAt(i), i]).forEach(([lv, i]) => {
  startLevel(i);
  say(MAP_NAME === MAPS[lv.map].name && MAP_W === MAPS[lv.map].w,
      `уровень ${i + 1} «${lv.name}»: карта ${MAP_NAME}, ${MAP_W}×${MAP_H}, ${bots.length} врагов`);
  say(!hitsWall(player.x, player.y, player.r), '  игрок стоит на проходимом месте');
  say(bots.every(b => !hitsWall(b.x, b.y, b.r)), '  все враги стоят свободно');
  say(hostages.every(h => !hitsWall(h.x, h.y, h.r)), '  все заложники стоят свободно');
  beginLive();
  let crash = null;
  try { step(1800); } catch (e) { crash = e; }
  say(!crash, crash ? '  ПАДЕНИЕ: ' + crash.message : '  30 секунд игры с отрисовкой — без исключений');
  say(bots.filter(b => b.alive).every(b => dist(b.x, b.y, b.post.x, b.post.y) <= CFG.BOT_LEASH + 2),
      '  за 30 секунд никто не ушёл за поводок');
});
