/**
 * Carta de misión secundaria en vectorial, con las mismas piezas que la de
 * equipamiento: nombre y tipo en una cabecera compacta, puntos en un rombo y
 * panel claro con el objetivo. Reverso con el logo y el color del mazo.
 *
 * Devuelve el SVG en texto (como los tokens) para poder pasarlo a imagen en el
 * PDF sin montar ningún componente. Mide el texto con las fuentes de las cartas:
 * hay que esperar a `loadCardFonts()` antes de llamarla.
 */
import {
  CARD_H, CARD_ICONS, CARD_W, FONT, INK, INK_SOFT, NIGHT, PANEL, PAPER,
  cham, fitSize, layoutTextBlocks,
} from './cardKit.js'
import { getCardPalette } from './unitIcons.js'

const FRONT = { x: 16, y: 14, w: 744, h: 996 }
const BACK = { x: 776, y: 14, w: 744, h: 996 }
const BODY = { x: 34, y: 168, w: 708, h: 824, c: 22 }

const star = (cx, cy, outer, inner) => `M${Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5
  const r = i % 2 ? inner : outer
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
}).join('L')}Z`

// Emblemas en caja de 32 × 32, solo relleno. El estandarte es el del token de Conquista.
const EMBLEMS = {
  'puesto de mando': { d: `M4 3H28V6H4Z M7 7.5H25V29L16 23L7 29Z ${star(16, 15, 5.4, 2.3)}`, rule: 'evenodd' },
  eliminacion: { d: CARD_ICONS.disparo, rule: 'nonzero' },
}
const FALLBACK_EMBLEM = { d: CARD_ICONS.habilidades, rule: 'nonzero' }

const normalize = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const txt = (x, y, size, content, { family = FONT.label, weight = 700, fill = '#f2f0eb', anchor = 'middle', ls = 0 } = {}) =>
  `<text x="${x}" y="${y.toFixed(2)}" font-size="${size}" font-family="${family}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(content)}</text>`

/** Emblema a escala, con la mitad derecha sombreada como los iconos de clase. */
const emblem = ({ d, rule }, x, y, scale, color, id) => `
  <clipPath id="${id}"><rect x="16" y="0" width="16" height="32"/></clipPath>
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="${d}" fill="${color}" fill-rule="${rule}"/>
    <path d="${d}" fill="#000" fill-opacity=".22" fill-rule="${rule}" clip-path="url(#${id})"/>
  </g>`

/** Los puntos como cifra para el rombo ("10 pts" → "10"). */
const pointsValue = (meta) => String(meta || '').match(/\d+/)?.[0] || '—'

export const missionCardSvg = (mission, { logoHref = '', id = 'mision' } = {}) => {
  const uid = String(id).replace(/[^a-zA-Z0-9-]/g, '')
  const mark = EMBLEMS[normalize(mission.tipo)] || FALLBACK_EMBLEM

  const palette = getCardPalette('mision')
  const name = String(mission.title || '').toUpperCase()
  const nameSize = fitSize(name, 458, { max: 58, min: 20, family: FONT.title, weight: 700, ls: 2 })
  const subtitle = ['MISIÓN', mission.tipo].filter(Boolean).join(' · ').toUpperCase()
  const subtitleSize = fitSize(subtitle, 458, { max: 27, min: 16, family: FONT.label, weight: 700, ls: 2.5 })
  const valor = pointsValue(mission.meta)
  const valorSize = fitSize(valor, 56, { max: 42, min: 18, family: FONT.title, weight: 700 })

  const objective = layoutTextBlocks(
    [{ title: 'Objetivo', text: mission.summary }],
    { x: BODY.x + 56, y: BODY.y + 276, w: BODY.w - 112, h: BODY.h - 330 },
    { maxBody: 46, minBody: 18, lineHeight: 1.4, gap: 18 },
  )

  const right = FRONT.x + FRONT.w
  const front = `
    <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="${FRONT.h}" rx="26" fill="${NIGHT}"/>
    <g clip-path="url(#${uid}-front)">
      <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="141" fill="${palette.header}"/>
      <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="141" fill="url(#${uid}-hex)"/>
      <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="141" fill="url(#${uid}-fade)"/>
    </g>
    <line x1="${FRONT.x}" y1="155" x2="${right}" y2="155" stroke="${palette.border}" stroke-width="2.5"/>

    <path d="${cham(38, 34, 108, 108, 12)}" fill="${PANEL}" stroke="${palette.border}" stroke-width="2"/>
    ${emblem(mark, 56, 52, 2.25, palette.highlight, `${uid}-half-a`)}
    ${txt(162, 86, nameSize, name, { family: FONT.title, fill: palette.highlight, anchor: 'start', ls: 2 })}
    ${txt(164, 126, subtitleSize, subtitle, { fill: palette.highlight, anchor: 'start', ls: 2.5 })}
    <g aria-label="${esc(`Puntos: ${valor}`)}">
      <title>${esc(`Puntos: ${valor}`)}</title>
      <polygon points="694,34 748,88 694,142 640,88" fill="${PANEL}" stroke="${palette.border}" stroke-width="2.5"/>
      ${txt(694, 88 + valorSize * 0.36, valorSize, valor, { family: FONT.title })}
    </g>

    <path d="${cham(BODY.x, BODY.y, BODY.w, BODY.h, BODY.c)}" fill="${PAPER}" stroke="${palette.border}" stroke-width="2.2"/>
    ${emblem(mark, BODY.x + BODY.w / 2 - 80, BODY.y + 60, 5, palette.onPaper, `${uid}-half-b`)}
    <line x1="${BODY.x + BODY.w * 0.3}" y1="${BODY.y + 244}" x2="${BODY.x + BODY.w * 0.7}" y2="${BODY.y + 244}" stroke="${palette.onPaper}" stroke-width="1.4"/>
    ${objective.items.map((item) => (item.kind === 'title'
      ? txt(item.x, item.y, item.size, item.text, { family: FONT.title, fill: INK, ls: 2 })
      : txt(item.x, item.y, item.size, item.text, { family: FONT.body, weight: 400, fill: INK_SOFT }))).join('')}

    <rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="${FRONT.h}" rx="26" fill="none" stroke="${palette.border}" stroke-width="3"/>`

  const back = `
    <rect x="${BACK.x}" y="${BACK.y}" width="${BACK.w}" height="${BACK.h}" rx="26" fill="${NIGHT}"/>
    <rect x="${BACK.x}" y="${BACK.y}" width="${BACK.w}" height="${BACK.h}" rx="26" fill="url(#${uid}-hex)"/>
    <path d="${cham(BACK.x + 26, BACK.y + 26, BACK.w - 52, BACK.h - 52, 26)}" fill="none" stroke="${palette.border}" stroke-width="2"/>
    ${logoHref ? `<image href="${logoHref}" x="${BACK.x + 112}" y="${BACK.y + BACK.h / 2 - 162}" width="${BACK.w - 224}" height="324" preserveAspectRatio="xMidYMid meet"/>` : ''}
    <rect x="${BACK.x}" y="${BACK.y}" width="${BACK.w}" height="${BACK.h}" rx="26" fill="none" stroke="${palette.border}" stroke-width="3"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <pattern id="${uid}-hex" width="30" height="51.96" patternUnits="userSpaceOnUse" patternTransform="scale(.9)">
      <path d="M15 0 L30 8.66 V25.98 L15 34.64 L0 25.98 V8.66Z M15 34.64 V51.96 M0 25.98 L-15 34.64 M30 25.98 L45 34.64" fill="none" stroke="rgba(255,255,255,.075)" stroke-width="1.6"/>
    </pattern>
    <linearGradient id="${uid}-fade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".75"/>
    </linearGradient>
    <clipPath id="${uid}-front"><rect x="${FRONT.x}" y="${FRONT.y}" width="${FRONT.w}" height="${FRONT.h}" rx="26"/></clipPath>
  </defs>${front}${back}
</svg>`
}
