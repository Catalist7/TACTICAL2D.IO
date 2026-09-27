#!/usr/bin/env python3
"""Упаковать двоичный файл (модель, панораму, картинку) в скрипт assets/<имя>.js.

Браузер не даёт странице, открытой двойным кликом (file://), читать файлы
с диска через fetch, а обычный <script src> грузится всегда. Поэтому
модели лежат в assets/ как скрипты, которые кладут base64 в window.ASSETS.

    python3 tools/pack-asset.py путь/к/файлу.glb имя.glb
"""
import base64, os, sys

src, name = sys.argv[1], sys.argv[2]
out = os.path.join(os.path.dirname(__file__), '..', 'assets', name + '.js')
data = base64.b64encode(open(src, 'rb').read()).decode()
with open(out, 'w') as f:
    f.write("(window.ASSETS = window.ASSETS || {})[%r] = '%s';\n" % (name, data))
print(f'{out}: {os.path.getsize(out) // 1024} КБ')
