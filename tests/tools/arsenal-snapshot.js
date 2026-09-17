const fs = require('fs');
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ser = el => {
  const tag = (el.tagName || 'div').toLowerCase();
  const cls = el.className ? ` class="${el.className}"` : '';
  const st = el.style && el.style.width ? ` style="width:${el.style.width}"` : '';
  const dis = el.disabled ? ' disabled' : '';
  const inner = el.children.length ? el.children.map(ser).join('') : esc(el.textContent || '');
  return `<${tag}${cls}${st}${dis}>${inner}</${tag}>`;
};
progress.tutorial = 'done'; progress.money = 4200;
progress.owned.push('mp5', 'ak', 'awp'); progress.equipped.rifle = 'ak'; progress.armorOwned = ['kevlar', 'assault']; progress.armorEquipped = 'assault'; applyLoadout();
const tab = process.argv[2] || 'rifles';
arsenalTab = tab; openArsenal();
const html = fs.readFileSync(GAME_HTML, 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const markup = html.match(/<div id="arsenalScreen"[\s\S]*?\n<\/div>\n/)[0]
  .replace('<nav class="arsenal-tabs" id="arsenalTabs" role="tablist"></nav>',
           `<nav class="arsenal-tabs" id="arsenalTabs">${$('arsenalTabs').children.map(ser).join('')}</nav>`)
  .replace('<div class="arsenal-catalog" id="arsenalCatalog"></div>',
           `<div class="arsenal-catalog" id="arsenalCatalog">${$('arsenalCatalog').children.map(ser).join('')}</div>`)
  .replace('<div class="slots" id="arsenalSlots"></div>',
           `<div class="slots" id="arsenalSlots">${$('arsenalSlots').children.map(ser).join('')}</div>`)
  .replace('<div class="chip cash" id="arsenalMoney">$0</div>', `<div class="chip cash">${$('arsenalMoney').textContent}</div>`)
  .replace('class="overlay screen"', 'class="overlay screen show"');
fs.writeFileSync(OUT_DIR + `snap-${tab}.html`,
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body style="width:1280px;height:1000px;margin:0;background:#0b1017">${markup}</body></html>`);
