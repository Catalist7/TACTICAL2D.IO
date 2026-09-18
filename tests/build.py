#!/usr/bin/env python3
"""Собирает запускаемые наборы тестов из игры.

Игра — один index.html, поэтому каждый набор это склейка трёх частей:
заготовка браузера (DOM, холст, хранилище) + скрипт игры + сам набор.
Результат кладётся в tests/build и запускается обычным node.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
GAME = ROOT.parent / 'index.html'
BUILD = ROOT / 'build'

# Набор → заготовка. Счётчик вызовов холста нужен там, где проверяется отрисовка.
SUITES = {
    'level-tests': 'prelude-dom', 'switch-tests': 'prelude-dom', 'loadout-tests': 'prelude-dom',
    'pen-tests': 'prelude-dom', 'arsenal-tests': 'prelude-dom', 'gen-level-tests': 'prelude-dom',
    'gen-validate': 'prelude-dom', 'tutorial-tests': 'prelude-dom', 'hints-tests': 'prelude-dom',
    'armor-tests': 'prelude-dom', 'fx-tests': 'prelude-dom', 'bot-tests': 'prelude-dom', 'upgrade-tests': 'prelude-dom', 'props-tests': 'prelude-dom', 'decay-tests': 'prelude-dom', 'squad-tests': 'prelude-dom', 'options-tests': 'prelude-dom', 'integration-tests': 'prelude-dom',
    'ai-tests': 'prelude-dom', 'draw-tests': 'prelude-count', 'ttk-tests': 'prelude-count',
}
TOOLS = {'frame-fight': 'prelude-svg', 'frame-closeup': 'prelude-svg',
         'frame-squad': 'prelude-svg',
         'guns-sheet': 'prelude-dom', 'arsenal-snapshot': 'prelude-dom'}


def game_script():
    html = GAME.read_text(encoding='utf-8')
    m = re.search(r'<script>\n(.*)\n</script>', html, re.S)
    if not m:
        sys.exit('в index.html не нашёлся скрипт игры')
    return m.group(1)


def header():
    return (f'globalThis.GAME_HTML = {str(GAME)!r};\n'
            f'globalThis.OUT_DIR = {str(BUILD) + "/"!r};\n').replace("'", '"')


def build():
    BUILD.mkdir(exist_ok=True)
    game = game_script()
    (BUILD / 'game.js').write_text(game, encoding='utf-8')
    made = []
    for name, prelude in {**SUITES, **TOOLS}.items():
        src = ROOT / ('suites' if name in SUITES else 'tools') / f'{name}.js'
        part = (ROOT / 'lib' / f'{prelude}.js').read_text(encoding='utf-8')
        (BUILD / f'{name}.js').write_text(
            part + header() + game + src.read_text(encoding='utf-8'), encoding='utf-8')
        made.append(name)
    # Отдельный прогон встроенной самопроверки игры (та же, что по ?test=1).
    (BUILD / 'self-check.js').write_text(
        (ROOT / 'lib' / 'prelude-dom.js').read_text(encoding='utf-8') + header() + game +
        '\nconsole.log("__SUMMARY__", window.TEST_RESULTS.failed.length, "провалов");\n',
        encoding='utf-8')
    return made


if __name__ == '__main__':
    names = build()
    print(f'собрано: {len(names) + 1} файлов в {BUILD}')
