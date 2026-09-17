
const say = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) process.exitCode = 1; };
progress.tutorial = 'done';

// ── Клавиши удалённых гранат в бою ничего не ломают ──────────────────────
startLevel(0); beginLive();
for (const key of ['4', 'g', 'п']) {
  let crash = null;
  try { press(key); release(key); } catch (e) { crash = e; }
  say(!crash, crash ? `клавиша «${key}» в бою: ПАДЕНИЕ — ${crash.message}` : `клавиша «${key}» в бою не вызывает ошибок`);
}

// ── На экране операций нет подсказок про гранаты и закупку ───────────────
{
  const html = require('fs').readFileSync(GAME_HTML, 'utf8');
  const screen = html.slice(html.indexOf('<div id="levelScreen"'), html.indexOf('<div id="arsenalScreen"'));
  for (const stale of ['гранат', 'закупк', 'На руках всегда', 'зум AWP'])
    say(!screen.includes(stale), `на экране операций нет «${stale}»`);
  say(screen.includes('<kbd>E</kbd>') && screen.includes('<kbd>1 2 3</kbd>'), 'живые подсказки на месте');
}

// ── Табло подготовки не зовёт в закупку ──────────────────────────────────
{
  const texts = [];
  const realFill = ctx.fillText;
  ctx.fillText = t => texts.push(String(t));
  startLevel(0);
  let crash = null;
  try { drawHUD(); } catch (e) { crash = e; }
  ctx.fillText = realFill;
  say(!crash, crash ? 'ПАДЕНИЕ HUD: ' + crash.message : 'табло рисуется');
  say(state.phase === PHASE.BUY && !texts.some(t => /ЗАКУПКА|· B/.test(t)),
      `во время подготовки на табло: ${texts.filter(t => /ПОДГОТОВКА|ЗАКУПКА/.test(t)).join(', ') || '(нет метки)'}`);
}
