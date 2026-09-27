// Снимки трёхмерного бойца из настоящего браузера (WebGL в node нет).
// Нужен Playwright с Chromium вне проекта: npm i playwright && npx playwright install chromium
// Запуск: node tests/tools/arsenal-3d-shots.js index.html <папка> [брони через запятую] [углы] [стволы]
// CLOSE=1 — крупный план головы и груди.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [html, out, armorsArg, yawsArg, gunsArg] = process.argv.slice(2);
  const armors = (armorsArg || 'none,kevlar,helmet,assault,heavy,eod').split(',');
  const yaws = (yawsArg || '0,1.57,3.14,4.71').split(',').map(Number);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(html));
  const close = process.env.CLOSE;
  await p.evaluate(close => {
    if (close) ARS3D.CAM = { eye: [0, 1.55, 1.35], at: [0, 1.45, 0] };
    progress.tutorial = 'done'; progress.money = 99999; progress.completed = 8;
    for (const id of Object.keys(WEAPONS)) if (!progress.owned.includes(id)) progress.owned.push(id);
    progress.armorOwned = ARMOR_TYPES.map(a => a.id);
    ARS3D.SPIN = 1e9;
    openArsenal();
  }, close);
  const guns = (gunsArg || 'ak,m4,awp,nova,p90,mp5').split(',');
  let i = 0;
  for (const armor of armors) {
    const gun = guns[i++ % guns.length];
    for (const yaw of yaws) {
      await p.evaluate(([a, g, y]) => {
        progress.armorEquipped = a === 'none' ? null : a;
        progress.equipped.rifle = g === 'none' ? null : g;
        ARS3D.yaw = y; drawArsenalFigure();
      }, [armor, gun, yaw]);
      await p.waitForTimeout(60);
      await p.evaluate(y => { ARS3D.yaw = y; }, yaw);
      await (await p.$('#arsenalCanvas')).screenshot({ path: `${out}/s-${armor}-${gun}-${yaw}.png` });
    }
  }
  if (gunsArg !== undefined || true) {
    await p.evaluate(() => { arsenalTab = CATALOG[0].tab; renderArsenal(); });
    await p.waitForTimeout(200);
    await (await p.$('#arsenalCatalog')).screenshot({ path: `${out}/catalog.png` });
  }
  console.log(errs.length ? 'ОШИБКИ:\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'без ошибок');
  await b.close();
})();
