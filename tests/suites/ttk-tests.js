
const DT = 1/60;
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
startLevel(0); beginLive();

function findOpenRect(w, h) {
  for (let ty = 1; ty < MAP_H - h; ty++)
    for (let tx = 1; tx < MAP_W - w; tx++) {
      let free = true;
      for (let dy = 0; dy < h && free; dy++)
        for (let dx = 0; dx < w && free; dx++) if (!walkable(tx+dx, ty+dy)) free = false;
      if (free) return { tx, ty };
    }
}
const spot = findOpenRect(4, 12);
hostages.forEach(h => { h.alive = false; });

// Сколько бот теперь убивает игрока — усредняем по прогонам, стрельба случайна.
function timeToKill(scale) {
  const saved = CFG.ENEMY_DAMAGE;
  CFG.ENEMY_DAMAGE = scale;
  const runs = [];
  const realRandom = Math.random;
  for (let r = 0; r < 40; r++) {
    // Одинаковая случайность для обоих режимов: иначе два независимых замера
    // шумят сами по себе, и их отношение гуляет от 1.1 до 1.7.
    Math.random = mulberry32(9000 + r);
    const b = bots[0];
    const home = tc(spot.tx + 1, spot.ty + 1), far = tc(spot.tx + 1, spot.ty + 9);
    b.x = home.x; b.y = home.y; b.post = { x: home.x, y: home.y };
    b.ang = Math.PI/2; b.alive = true; b.hp = 100; b.blind = 0; b.spread = 0;
    giveWeapon(b, 'ak'); b.setMode('engage'); b.react = 0;
    player.x = far.x; player.y = far.y; player.hp = 100; player.armor = 0;
    player.helmet = false; player.alive = true;
    let f = 0;
    while (player.alive && f < 60 * 30) { b.update(DT); f++; }
    runs.push(player.alive ? Infinity : f / 60);
  }
  Math.random = realRandom;
  CFG.ENEMY_DAMAGE = saved;
  const ok = runs.filter(Number.isFinite);
  return { median: ok.sort((a,b)=>a-b)[Math.floor(ok.length/2)] ?? Infinity, survived: runs.length - ok.length };
}

const before = timeToKill(1.0);
const after = timeToKill(CFG.ENEMY_DAMAGE);
console.log(`  время до смерти игрока (AK, ~320px, медиана из 40 прогонов):`);
console.log(`    при прежнем уроне: ${before.median.toFixed(1)}с`);
console.log(`    сейчас (${(CFG.ENEMY_DAMAGE*100)|0}%):     ${after.median.toFixed(1)}с`);
say(after.median > before.median * 1.3, `запас прочности вырос в ${(after.median/before.median).toFixed(1)} раза`);

// Производительность: markExplored убрана, кадр должен подешеветь.
player.x = tc(spot.tx+1, spot.ty+5).x; player.y = tc(spot.tx+1, spot.ty+5).y;
for (let i = 0; i < 60; i++) { updateRound(DT); updateWorld(DT); }
globalThis.__calls = 0;
const N = 200, t0 = process.hrtime.bigint();
for (let i = 0; i < N; i++) { updateRound(DT); updateWorld(DT); render(); }
const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
console.log(`  кадр: ${ms.toFixed(3)} мс логики, ${(globalThis.__calls/N).toFixed(0)} вызовов canvas`);
say(ms < 16.6, 'кадр укладывается в бюджет 60 fps');
