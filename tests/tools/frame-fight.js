const fs = require('fs');
// Кадр боя: игрок, бот, кровь, гильзы, искры — всё как в игре.
// Туман войны выключаем: он вырезает конус режимом наложения, которого в SVG нет.
drawFog = () => {};
globalThis.innerWidth = 1000; globalThis.innerHeight = 1000;
resize();
progress.tutorial = 'done'; progress.money = 9000; progress.completed = 6;
progress.owned.push('ak'); equipWeapon('ak');
progress.armorOwned.push('assault'); equipArmor('assault');
startLevel(2);                   // сгенерированная карта — там видно оттенки комнат
beginLive();
const bot = bots[0];
bots.slice(1).forEach(b => { b.alive = false; });
hostages.forEach(h => { h.alive = false; });
player.x = bot.x - 150; player.y = bot.y + 30;
player.ang = Math.atan2(bot.y - player.y, bot.x - player.x);
player.active = 'rifle';
for (let i = 0; i < 7; i++) {
  player.cooldown = 0;
  fireWeapon(player, player.ang + (i - 3) * 0.02);
  updateWorld(1 / 60);
}
bot.hp = 5; hitscan(player.x, player.y, player.ang, WEAPONS.ak, player);
for (let i = 0; i < 14; i++) updateWorld(1 / 60);
player.cooldown = 0; fireWeapon(player, player.ang - 0.05);
for (const a of [player.ang - 1.3, player.ang + 1.15]) hitscan(player.x, player.y, a, WEAPONS.ak, player);
const z = zoom();
camera.x = (player.x + bot.x) / 2 - view.w / z / 2;
camera.y = (player.y + bot.y) / 2 - view.h / z / 2;
render();
fs.writeFileSync(process.argv[2], svgOf($('game'), view.w, view.h, '#0b1017'));
console.log(`кадр ${view.w}×${view.h}, фигур ${$('game').__rec.out.length}, ` +
  `частиц ${particles.length}, отметин ${decals.length}, трупов ${corpses.length}`);
