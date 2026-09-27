const fs = require('fs');
// Лист бойца из арсенала: каждый вид брони со своим стволом, плюс вариант
// без основного ствола. Каждый портрет — отдельный SVG; путь-шаблон с {n}.
const looks = [
  [null, null, 'usp'], ['kevlar', 'mp5', 'usp'], ['helmet', 'ak', 'glock'],
  ['assault', 'm4', 'deagle'], ['heavy', 'awp', 'usp'], ['eod', 'nova', 'usp'],
  ['assault', 'aug', 'usp'], ['helmet', 'p90', 'usp'], ['heavy', 'xm1014', 'usp'],
];
const out = process.argv[2] || 'tests/build/figure-{n}.svg';
looks.forEach(([armor, rifle, pistol], n) => {
  if (armor && !progress.armorOwned.includes(armor)) progress.armorOwned.push(armor);
  progress.armorEquipped = armor;
  progress.equipped.rifle = rifle;
  progress.equipped.pistol = pistol;
  const cv = $('arsenalCanvas');
  if (cv.__rec) cv.__rec.out.length = 0;
  drawArsenalFigure();
  fs.writeFileSync(out.replace('{n}', n), svgOf(cv, FIGURE.H, FIGURE.H, '#0f1722'));
  console.log(`${n}: ${armor || 'без брони'} · ${rifle || pistol}`);
});
