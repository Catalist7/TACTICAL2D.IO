const fs = require('fs');
// Два кадра с красной бочкой у поста врага: до выстрела и через мгновение
// после взрыва. Туман выключаем — в SVG его нет.
drawFog = () => {};
globalThis.innerWidth = 1100; globalThis.innerHeight = 760;
resize();
progress.tutorial = 'done'; progress.money = 9000; progress.completed = 8;
progress.owned.push('ak'); equipWeapon('ak');
progress.squad = [];
startLevel(Number(process.argv[4] || 2));
beginLive();
hostages.forEach(h => { h.alive = false; });

// Бочка, у которой больше всего врагов в зоне взрыва.
const T = CFG.TILE;
const near = br => bots.filter(b => dist(b.x, b.y, br.x, br.y) < BARREL.BLAST).length;
const br = barrels.slice().sort((a, b) => near(b) - near(a))[0];
// Игрок — на подходе к бочке, в пяти-семи клетках, с прямой видимостью.
let spot = null;
for (let d = 5 * T; d <= 8 * T && !spot; d += T / 2)
  for (let a = 0; a < TAU && !spot; a += TAU / 32) {
    const p = { x: br.x + Math.cos(a) * d, y: br.y + Math.sin(a) * d };
    if (!hitsWall(p.x, p.y, player.r) && lineClear(p.x, p.y, br.x, br.y)
        && bots.every(b => dist(b.x, b.y, p.x, p.y) > 3 * T
                        && segDist(b.x, b.y, p.x, p.y, br.x, br.y) > b.r + br.r)) spot = p;
  }
player.x = spot.x; player.y = spot.y;
player.active = 'rifle';
player.ang = Math.atan2(br.y - player.y, br.x - player.x);
const z = zoom();
const aim = () => {
  camera.x = (player.x + br.x) / 2 - view.w / z / 2;
  camera.y = (player.y + br.y) / 2 - view.h / z / 2;
  mouse.x = (br.x - camera.x) * z; mouse.y = (br.y - camera.y) * z;
};
aim();
render();
fs.writeFileSync(process.argv[2], svgOf($('game'), view.w, view.h, '#0b1017'));
const before = bots.filter(b => b.alive).length;

hitscan(player.x, player.y, player.ang, playerWeapon('ak'), player);
for (let i = 0; i < 6; i++) updateWorld(1 / 60);
aim();
render();
fs.writeFileSync(process.argv[3], svgOf($('game'), view.w, view.h, '#0b1017'));
console.log(`${MAP_NAME}: бочек ${barrels.length}, у выбранной врагов ${near(br)}, ` +
  `убито взрывом ${before - bots.filter(b => b.alive).length}, бочка ${br.alive ? 'цела' : 'взорвана'}`);
