const fs = require('fs');
drawFog = () => {};
globalThis.innerWidth = 760; globalThis.innerHeight = 760;
resize();
progress.tutorial = 'done'; progress.money = 9000; progress.completed = 6;
progress.owned.push('ak'); equipWeapon('ak');
startLevel(1);                     // «Комбинат» — ручная карта с секциями
beginLive();
hostages.forEach(h => { h.alive = false; });
const bot = bots[0];
bots.slice(1).forEach(b => { b.alive = false; });
// Ставим игрока у стены, чтобы в кадр попали искры и щепки.
let spot = null;
for (let ty = 2; ty < MAP_H - 2 && !spot; ty++)
  for (let tx = 2; tx < MAP_W - 2 && !spot; tx++)
    if (cell(tx, ty) === FLOOR && cell(tx + 3, ty) === WALL && cell(tx + 1, ty) === FLOOR &&
        cell(tx, ty + 1) === FLOOR && cell(tx, ty - 1) === FLOOR)
      spot = { x: (tx + .5) * CFG.TILE, y: (ty + .5) * CFG.TILE };
player.x = spot.x; player.y = spot.y; player.ang = 0; player.active = 'rifle';
bot.x = spot.x + 95; bot.y = spot.y - 18; bot.alive = true; bot.hp = 100;
for (let i = 0; i < 4; i++) { player.cooldown = 0; fireWeapon(player, player.ang); updateWorld(1 / 60); }
killEntity(bot, player);
for (let i = 0; i < 10; i++) updateWorld(1 / 60);
player.cooldown = 0; fireWeapon(player, 0.35);
hitscan(player.x, player.y, 0.05, WEAPONS.ak, player);       // в стену: искры
function nearCrate() {
  for (let ty = 2; ty < MAP_H - 2; ty++)
    for (let tx = 2; tx < MAP_W - 2; tx++) {
      const cx = (tx + .5) * CFG.TILE, cy = (ty + .5) * CFG.TILE;
      if (cell(tx, ty) === CRATE && Math.hypot(cx - player.x, cy - player.y) < 260) return { x: cx, y: cy };
    }
  return null;
}
const woodBox = nearCrate();
if (woodBox) hitscan(player.x, player.y, Math.atan2(woodBox.y - player.y, woodBox.x - player.x), WEAPONS.ak, player);
for (let i = 0; i < 3; i++) updateWorld(1 / 60);
const z = zoom();
camera.x = player.x + 40 - view.w / z / 2;
camera.y = player.y - view.h / z / 2;
render();
fs.writeFileSync(process.argv[2], svgOf($('game'), view.w, view.h, '#0b1017'));
console.log(`ближний план: частиц ${particles.length}, отметин ${decals.length}, искр ${particles.filter(p => p.glow).length}`);
