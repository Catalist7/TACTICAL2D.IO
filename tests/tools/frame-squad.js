const fs = require('fs');
// Кадр с отрядом: четыре бойца разных классов и уровней, панель отряда,
// выделение, точка приказа и раненый. Туман выключаем — в SVG его нет.
drawFog = () => {};
globalThis.innerWidth = 1100; globalThis.innerHeight = 900;
resize();
progress.tutorial = 'done'; progress.money = 9000; progress.completed = 8;
progress.owned.push('ak'); equipWeapon('ak');
progress.armorOwned.push('assault'); equipArmor('assault');
progress.squad = [{ cls: 'assault', level: 1 }, { cls: 'medic', level: 6 },
                  { cls: 'shield', level: 10 }, { cls: 'assault', level: 10 }];
startLevel(2);
beginLive();
const bot = bots[0];
bots.slice(1).forEach(b => { b.alive = false; });
hostages.forEach(h => { h.alive = false; });
player.active = 'rifle';
player.ang = 0;
// Игрок остаётся на спавне: отряд успевает построиться вокруг него.
for (let i = 0; i < 60 * 6; i++) updateWorld(1 / 60);
// Враг ставится рядом, в открытую часть комнаты.
let spot = null;
for (let d = 200; d <= 320 && !spot; d += 20)
  for (const a of [0, .4, -.4, .8, -.8]) {
    const p = { x: player.x + Math.cos(a) * d, y: player.y + Math.sin(a) * d };
    if (!hitsWall(p.x, p.y, bot.r) && lineClear(player.x, player.y, p.x, p.y)) { spot = p; break; }
  }
Object.assign(bot, { x: spot.x, y: spot.y, post: { x: spot.x, y: spot.y }, alive: true, hp: 100 });
player.ang = Math.atan2(bot.y - player.y, bot.x - player.x);
mouse.x = view.w / 2; mouse.y = view.h / 2;
allies[0].selected = true;
allies[1].order = { x: player.x + 110, y: player.y - 80 };
applyDamage(allies[3], 9999, 0, bot);              // один ранен
for (let i = 0; i < 30; i++) updateWorld(1 / 60);
const z = zoom();
camera.x = player.x - view.w / z / 2;
camera.y = player.y - view.h / z / 2;
render();
fs.writeFileSync(process.argv[2], svgOf($('game'), view.w, view.h, '#0b1017'));
console.log(`кадр ${view.w}×${view.h}, бойцов ${allies.length}, ` +
  `в строю ${allies.filter(a => a.alive).length}, фигур ${$('game').__rec.out.length}`);
