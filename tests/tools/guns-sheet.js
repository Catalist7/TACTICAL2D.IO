const fs = require('fs');
const SP = OUT_DIR;
const tabs = [
  ['Пистолеты', ['glock','p250','usp','fiveseven','deagle']],
  ['ПП', ['mac10','ump45','mp5','p90']],
  ['Винтовки', ['galil','famas','ak','m4','aug']],
  ['Снайперские', ['ssg08','awp','scar20']],
  ['Дробовики', ['nova','mag7','xm1014']],
];
const K = 5, cellW = 50 * K, cellH = 22 * K, left = 150;
let out = [];
const W = left + 5 * cellW, H = W;
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#16202e"/>`);
tabs.forEach(([label, ids], r) => {
  const y0 = 20 + r * (cellH + 30);
  out.push(`<text x="10" y="${y0 + cellH / 2}" fill="#e9eef6" font-family="Helvetica" font-size="20">${label}</text>`);
  ids.forEach((id, c) => {
    const g = GUN_SHAPES[id];
    const ox = left + c * cellW + 14 * K, oy = y0 + cellH / 2;
    out.push(`<text x="${left + c * cellW + 10}" y="${y0 + 14}" fill="${['p250','fiveseven','mac10','ump45','p90','galil','famas','aug','ssg08','scar20','mag7','xm1014'].includes(id) ? '#ffc857' : '#8b98ad'}" font-family="Helvetica" font-size="15">${WEAPONS[id].name}</text>`);
    for (const [x, y, w, h, tone] of g.parts)
      out.push(`<rect x="${ox + x * K}" y="${oy + y * K}" width="${w * K}" height="${h * K}" rx="${Math.min(1.5, h / 2) * K}" fill="${GUN_TONE[tone]}"/>`);
    if (g.scope) {
      const [x, y, w, h] = g.scope;
      out.push(`<rect x="${ox + x * K}" y="${oy + y * K}" width="${w * K}" height="${h * K}" rx="${h / 2 * K}" fill="${GUN_TONE[3]}"/>`);
      out.push(`<circle cx="${ox + (x + w - 1.4) * K}" cy="${oy}" r="${1.2 * K}" fill="#8fd8ff"/>`);
    }
    out.push(`<circle cx="${ox}" cy="${oy}" r="4" fill="#ff5566"/>`);
    if (g.fore != null) out.push(`<circle cx="${ox + g.fore * K}" cy="${oy}" r="4" fill="#63e39b"/>`);
    out.push(`<line x1="${ox + g.len * K}" y1="${oy - 40}" x2="${ox + g.len * K}" y2="${oy + 40}" stroke="#ffc857" stroke-dasharray="4 4"/>`);
  });
});
out.push('</svg>');
fs.writeFileSync(SP + 'guns.svg', out.join('\n'));

// Сколько попаданий на убийство: без брони и в броне, на 150 и 400 px.
const hits = (w, d, armored) => {
  let hp = 100, armor = armored ? 100 : 0, n = 0;
  const falloff = 1 - 0.35 * Math.min(d / w.range, 1);
  const per = w.dmg * falloff * (w.pellets ? Math.round(w.pellets * 0.6) : 1);
  while (hp > 0 && n < 50) { let out = per; if (armor > 0) { armor = Math.max(0, armor - per * (1 - w.pierce) * 0.55); out = per * w.pierce; } hp -= out; n++; }
  return n;
};
console.log('ствол         цена  темп  150px(без/броня)  400px(без/броня)  время до убийства 150px, с');
for (const [label, ids] of tabs) {
  console.log('— ' + label);
  for (const id of ids) {
    const w = WEAPONS[id];
    const a = hits(w, 150, false), b = hits(w, 150, true), c = hits(w, 400, false), d = hits(w, 400, true);
    console.log(`  ${w.name.padEnd(13)} ${String(w.price).padStart(5)} ${String(w.rpm).padStart(4)}   ${String(a).padStart(3)} / ${String(b).padEnd(3)}        ${String(c).padStart(3)} / ${String(d).padEnd(3)}        ${((a - 1) * 60 / w.rpm).toFixed(2)}`);
  }
}
