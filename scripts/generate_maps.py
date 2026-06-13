#!/usr/bin/env python3
"""Generador de mapas SVG de ZeroLore.

Produce mapas de misión con rejilla en pulgadas, puestos de mando, zonas de
despliegue, distancias clave anotadas, guía para 2 jugadores y leyenda
bilingüe (ES/EN). Reescribe los mapas existentes y crea las variantes .en.svg.

Uso:  python3 scripts/generate_maps.py
Salida: src/images/maps/*.svg  y  *.en.svg
"""
import math
import os

PX = 30          # píxeles por pulgada
M = 58           # margen del tablero
HEADER = 70      # banda superior para el título

HQ_COLORS = {1: "#ff1717", 2: "#1266ff", 3: "#18bf2c", 4: "#ffd900"}
ZONE_COLORS = {1: "#ff1f2d", 2: "#347cff", 3: "#39c950", 4: "#f6d900"}

STR = {
    "es": {
        "hq": "CG", "hq_full": "CUARTEL GENERAL", "post": "PUESTO DE MANDO",
        "neutral": "NEUTRAL", "neutral_posts": "PUESTOS NEUTRALES",
        "two_player": "Solo 3-4 jugadores", "skirmish": "Escaramuza",
        "grand": "Gran Batalla", "colors": {1: "ROJO", 2: "AZUL", 3: "VERDE", 4: "AMARILLO"},
    },
    "en": {
        "hq": "HQ", "hq_full": "HEADQUARTERS", "post": "COMMAND POST",
        "neutral": "NEUTRAL", "neutral_posts": "NEUTRAL POSTS",
        "two_player": "3-4 players only", "skirmish": "Skirmish",
        "grand": "Grand Battle", "colors": {1: "RED", 2: "BLUE", 3: "GREEN", 4: "YELLOW"},
    },
}

FONT = 'font-family="Arial, Helvetica, sans-serif"'


def px(v):
    return M + v * PX


def fmt(n):
    return f"{n:.1f}".rstrip("0").rstrip(".")


def dist(a, b):
    return math.hypot(a[1] - b[1], a[2] - b[2])


def build(board_w, board_h, posts, lang, title, two_player_dim=()):
    """posts: lista de (num, x_in, y_in). 1-4 = CG; 5+ = neutral."""
    s = STR[lang]
    W = M * 2 + board_w * PX
    bx0, by0 = M, M + HEADER
    bw, bh = board_w * PX, board_h * PX
    bx1, by1 = bx0 + bw, by0 + bh
    legend_y = by1 + 62
    legend_h = 176
    H = legend_y + legend_h + 20

    out = []
    out.append(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
        f'viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">'
    )
    out.append(f'  <title id="title">{title}</title>')
    out.append(
        f'  <desc id="desc">ZeroLore {board_w}x{board_h} inch map. '
        f'Command post centers in inch coordinates. Token diameter 3 inches.</desc>'
    )
    out.append('  <defs>')
    for n, col in ZONE_COLORS.items():
        out.append(
            f'    <radialGradient id="zone-{n}" cx="50%" cy="50%" r="50%">'
            f'<stop offset="0%" stop-color="{col}" stop-opacity="0.34"/>'
            f'<stop offset="60%" stop-color="{col}" stop-opacity="0.10"/>'
            f'<stop offset="100%" stop-color="{col}" stop-opacity="0"/>'
            f'</radialGradient>'
        )
    out.append(f'    <clipPath id="board-clip"><rect x="{bx0}" y="{by0}" width="{bw}" height="{bh}"/></clipPath>')
    out.append('  </defs>')
    out.append(f'  <rect width="100%" height="100%" fill="#ffffff"/>')

    # Título dentro del SVG
    out.append(
        f'  <text x="{W/2:.0f}" y="42" {FONT} font-size="30" font-weight="900" '
        f'fill="#0b0b0b" text-anchor="middle">{title}</text>'
    )

    # Etiquetas de medida (cada 3", los 4 lados)
    g = []
    for i in range(1, board_w):
        if i % 3 == 0:
            x = px(i)
            g.append(f'<text x="{x}" y="{by0-12}" {FONT} font-size="20" font-weight="900" fill="#222" text-anchor="middle">{i}&quot;</text>')
    for i in range(1, board_h):
        if i % 3 == 0:
            y = py = by0 + i * PX
            g.append(f'<text x="{bx0-14}" y="{py+6}" {FONT} font-size="20" font-weight="900" fill="#222" text-anchor="end">{i}&quot;</text>')
    out.append("  " + "\n  ".join(g))

    out.append(f'  <g class="board" data-board-size-in="{board_w}x{board_h}">')
    out.append(f'    <rect x="{bx0}" y="{by0}" width="{bw}" height="{bh}" class="board-bg" fill="#fbfbfa"/>')

    # Zonas de despliegue (glow alrededor de cada CG), recortadas al tablero
    out.append('    <g clip-path="url(#board-clip)">')
    for n, xin, yin in posts:
        if n in HQ_COLORS:
            cx, cy = px(xin), by0 + yin * PX
            r = 6.5 * PX
            out.append(f'      <circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#zone-{n})"/>')
    out.append('    </g>')

    # Rejilla
    cw, ch = board_w / 2, board_h / 2
    for i in range(1, board_w):
        x = px(i)
        if abs(i - cw) < 0.01:
            out.append(f'    <line x1="{x}" y1="{by0}" x2="{x}" y2="{by1}" stroke="#111" stroke-width="1.5" stroke-dasharray="8 10"/>')
        elif i % 3 == 0:
            out.append(f'    <line x1="{x}" y1="{by0}" x2="{x}" y2="{by1}" stroke="#d8d8d8" stroke-width="1"/>')
    for i in range(1, board_h):
        y = by0 + i * PX
        if abs(i - ch) < 0.01:
            out.append(f'    <line x1="{bx0}" y1="{y}" x2="{bx1}" y2="{y}" stroke="#111" stroke-width="1.5" stroke-dasharray="8 10"/>')
        elif i % 3 == 0:
            out.append(f'    <line x1="{bx0}" y1="{y}" x2="{bx1}" y2="{y}" stroke="#d8d8d8" stroke-width="1"/>')
    out.append(f'    <rect x="{bx0}" y="{by0}" width="{bw}" height="{bh}" fill="none" stroke="#0b0b0b" stroke-width="2.2"/>')

    # Distancias clave: CG1 -> neutral más cercano, y CG1 <-> CG2
    hqs = [p for p in posts if p[0] in HQ_COLORS]
    neus = [p for p in posts if p[0] not in HQ_COLORS]

    def to_px(p):
        return (px(p[1]), by0 + p[2] * PX)

    annot = []
    if hqs and neus:
        a = hqs[0]
        nearest = min(neus, key=lambda n: dist(a, n))
        d = dist(a, nearest)
        ax, ay = to_px(a); bx, by = to_px(nearest)
        mx, my = (ax + bx) / 2, (ay + by) / 2
        annot.append(f'<line x1="{ax:.0f}" y1="{ay:.0f}" x2="{bx:.0f}" y2="{by:.0f}" stroke="#1266ff" stroke-width="2" stroke-dasharray="4 5" opacity="0.7"/>')
        annot.append(f'<rect x="{mx-26:.0f}" y="{my-14:.0f}" width="52" height="22" rx="4" fill="#ffffff" stroke="#1266ff" stroke-width="1"/>')
        annot.append(f'<text x="{mx:.0f}" y="{my+2:.0f}" {FONT} font-size="15" font-weight="900" fill="#1266ff" text-anchor="middle">{fmt(d)}&quot;</text>')
    if len(hqs) >= 2:
        a, b = hqs[0], hqs[1]
        d = dist(a, b)
        ax, ay = to_px(a); bx, by = to_px(b)
        mx, my = (ax + bx) / 2, (ay + by) / 2
        annot.append(f'<line x1="{ax:.0f}" y1="{ay:.0f}" x2="{bx:.0f}" y2="{by:.0f}" stroke="#888" stroke-width="1.5" stroke-dasharray="2 6" opacity="0.55"/>')
        annot.append(f'<rect x="{mx-34:.0f}" y="{my-13:.0f}" width="68" height="22" rx="4" fill="#ffffff" stroke="#888" stroke-width="1"/>')
        annot.append(f'<text x="{mx:.0f}" y="{my+3:.0f}" {FONT} font-size="14" font-weight="800" fill="#555" text-anchor="middle">{s["hq"]}-{s["hq"]} {fmt(d)}&quot;</text>')
    if annot:
        out.append("    " + "\n    ".join(annot))

    # Puestos
    for n, xin, yin in posts:
        cx, cy = px(xin), by0 + yin * PX
        ring = HQ_COLORS.get(n, "#111111")
        ring_w = 7 if n in HQ_COLORS else 0
        dim = n in two_player_dim
        op = ' opacity="0.30"' if dim else ''
        out.append(f'    <g class="post" data-post="{n}" data-x-in="{xin}" data-y-in="{yin}" data-token-diameter-in="3"{op}>')
        out.append(f'      <circle cx="{cx}" cy="{cy}" r="45" fill="none" stroke="{ring}" stroke-width="2" stroke-opacity="0.18" stroke-dasharray="7 8"/>')
        out.append(f'      <circle cx="{cx}" cy="{cy}" r="28" fill="#ffffff" stroke="#101010" stroke-width="5"/>')
        out.append(f'      <circle cx="{cx}" cy="{cy}" r="22" fill="#f9f9f9" stroke="{ring}" stroke-width="{ring_w}"/>')
        out.append(f'      <text x="{cx}" y="{cy+14}" {FONT} font-size="38" font-weight="900" fill="#050505" text-anchor="middle">{n}</text>')
        if dim:
            out.append(f'      <text x="{cx}" y="{cy+62}" {FONT} font-size="13" font-weight="800" fill="#b00" text-anchor="middle">{s["two_player"]}</text>')
        out.append('    </g>')
    out.append('  </g>')

    # Leyenda
    out.append('  <g class="legend">')
    out.append(f'    <rect x="{M-20}" y="{legend_y}" width="{W-2*(M-20)}" height="{legend_h}" fill="#ffffff" stroke="#111" stroke-width="2"/>')
    cols = [M + 28, M + 28 + (W - 2 * M) / 3, M + 28 + 2 * (W - 2 * M) / 3]
    rows = [legend_y + 48, legend_y + 118]
    items = []
    for n in (1, 2, 3, 4):
        items.append((HQ_COLORS[n], str(n), f'{s["colors"][n]} {s["hq"]}', s["post"]))
    items.append(("#111111", "", s["neutral"], s["neutral_posts"]))
    for idx, (col, num, l1, l2) in enumerate(items):
        cx = cols[idx % 3]; cy = rows[idx // 3]
        rw = 7 if num else 0
        out.append(f'    <g transform="translate({cx:.0f}, {cy})">')
        out.append(f'      <circle cx="0" cy="0" r="25" fill="#ffffff" stroke="#101010" stroke-width="5"/>')
        out.append(f'      <circle cx="0" cy="0" r="19" fill="#f9f9f9" stroke="{col}" stroke-width="{rw}"/>')
        if num:
            out.append(f'      <text x="0" y="11" {FONT} font-size="28" font-weight="900" fill="#050505" text-anchor="middle">{num}</text>')
        out.append(f'      <text x="44" y="-8" {FONT} font-size="14" font-weight="800" fill="#111">{l1}</text>')
        out.append(f'      <text x="44" y="18" {FONT} font-size="14" font-weight="800" fill="#111">{l2}</text>')
        out.append('    </g>')
    out.append('  </g>')
    out.append('</svg>\n')
    return "\n".join(out)


# Definición de los mapas: nombre base -> (board_w, board_h, posts, dim_2p, etiqueta)
MAPS = {
    "guerra-total-4p-esquinas": (36, 36, [
        (1, 6, 30), (2, 30, 6), (3, 6, 6), (4, 30, 30),
        (5, 18, 18), (6, 12, 12), (7, 24, 12), (8, 12, 24), (9, 24, 24),
    ], (6, 9), "skirmish"),
    "guerra-total-4p-centro": (36, 36, [
        (1, 15, 21), (2, 21, 15), (3, 15, 15), (4, 21, 21),
        (5, 18, 18), (6, 6, 6), (7, 30, 6), (8, 6, 30), (9, 30, 30),
    ], (6, 9), "skirmish"),
    "guerra-total-4p-expuestos": (36, 36, [
        (1, 12, 24), (2, 24, 12), (3, 12, 12), (4, 24, 24),
        (5, 18, 18), (6, 6, 6), (7, 30, 6), (8, 6, 30), (9, 30, 30),
    ], (6, 9), "skirmish"),
    "gran-batalla-4p-esquinas": (46, 46, [
        (1, 8, 38), (2, 38, 8), (3, 8, 8), (4, 38, 38),
        (5, 23, 23), (6, 15, 15), (7, 31, 15), (8, 15, 31), (9, 31, 31),
    ], (6, 9), "grand"),
    "gran-batalla-4p-cuarteles-expuestos": (46, 46, [
        (1, 15, 31), (2, 31, 15), (3, 15, 15), (4, 31, 31),
        (5, 23, 23), (6, 8, 8), (7, 38, 8), (8, 8, 38), (9, 38, 38),
    ], (6, 9), "grand"),
    "gran-batalla-4p-72x48": (72, 48, [
        (1, 12, 36), (2, 60, 12), (3, 12, 12), (4, 60, 36),
        (5, 36, 24), (6, 24, 16), (7, 48, 16), (8, 24, 32), (9, 48, 32),
    ], (6, 9), "grand"),
}

TITLES = {
    "es": {"skirmish": "Escaramuza", "grand": "Gran Batalla"},
    "en": {"skirmish": "Skirmish", "grand": "Grand Battle"},
}


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.normpath(os.path.join(here, "..", "src", "images", "maps"))
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for base, (bw, bh, posts, dim, kind) in MAPS.items():
        for lang in ("es", "en"):
            label = TITLES[lang][kind]
            title = f"ZeroLore · {label} {bw}×{bh}\""
            svg = build(bw, bh, posts, lang, title, two_player_dim=dim)
            suffix = "" if lang == "es" else ".en"
            path = os.path.join(out_dir, f"{base}{suffix}.svg")
            with open(path, "w", encoding="utf-8") as f:
                f.write(svg)
            n += 1
            print("escrito:", os.path.basename(path))
    print(f"\n{n} mapas generados en {out_dir}")


if __name__ == "__main__":
    main()
