#!/usr/bin/env python3
"""Вырезать фон у фотографий стволов и упаковать их в assets/weapon-photos.js.

    U2NET_HOME=<папка для модели> python3 tools/cutout-weapons.py <папка с manifest.json и фото>

Нужны Pillow, NumPy и rembg (pip install "rembg[cpu]"); при первом запуске
rembg скачивает нейросеть isnet-general-use (~180 МБ) в U2NET_HOME. Нейросеть
отделяет ствол от любого фона — белого, стола, травы, рук. Потом ствол
выравнивается по горизонту (по главной оси силуэта), обрезается и
сохраняется в WebP с прозрачностью: 20 фото весят ~1,3 МБ.
"""
import base64, io, json, math, os, sys

import numpy as np
from PIL import Image
from rembg import new_session, remove

src = sys.argv[1]
manifest = json.load(open(os.path.join(src, 'manifest.json'), encoding='utf-8'))
OUT_W = 1040                      # 520 точек карточки ×2 для ретины
# Снимки, где ствол лежит по диагонали. У остальных главная ось силуэта
# врёт: рукоять пистолета или сошки тянут её вниз, а снято и так ровно.
LEVEL = {'ssg08', 'scar20'}
session = new_session('isnet-general-use')

lines = ["(window.ASSETS = window.ASSETS || {});"]
report = []
for wid, m in manifest.items():
    path = os.path.join(src, m['file'])
    im = Image.open(path).convert('RGB')
    if m.get('flip'):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    cut = remove(im, session=session, post_process_mask=True)
    # Выравнивание: главная ось силуэта должна лечь горизонтально.
    a = np.asarray(cut.getchannel('A')) > 128
    ys, xs = np.nonzero(a)
    xs = xs - xs.mean(); ys = ys - ys.mean()
    cov = np.cov(np.vstack([xs, ys]))
    vx, vy = np.linalg.eigh(cov)[1][:, -1]
    ang = math.degrees(math.atan2(vy, vx))
    if ang > 90: ang -= 180
    if ang < -90: ang += 180
    if wid in LEVEL and 3 < abs(ang) < 60:
        cut = cut.rotate(ang, resample=Image.BICUBIC, expand=True)
    bbox = cut.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    cut = cut.crop(bbox)
    if cut.width > OUT_W:
        cut = cut.resize((OUT_W, round(cut.height * OUT_W / cut.width)), Image.LANCZOS)
    buf = io.BytesIO()
    cut.save(buf, 'WEBP', quality=86, method=6)
    lines.append(f"window.ASSETS['photo-{wid}'] = '{base64.b64encode(buf.getvalue()).decode()}';")
    cut.save(os.path.join(src, f'cut-{wid}.png'))
    report.append(f'{wid}: {cut.width}×{cut.height}, {len(buf.getvalue()) // 1024} КБ, наклон {ang:+.0f}°')

out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'weapon-photos.js')
open(out, 'w').write('\n'.join(lines) + '\n')
print('\n'.join(report))
print(f'{out}: {os.path.getsize(out) // 1024} КБ')
