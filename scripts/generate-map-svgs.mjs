import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'src', 'images', 'maps')

const PX_PER_IN = 30
const MARGIN = 58
const LEGEND_ROW_HEIGHT = 70

const COLORS = {
  red: '#ff1717',
  blue: '#1266ff',
  green: '#18bf2c',
  yellow: '#ffd900',
  neutral: '#111111',
}

const FONT_FAMILY = 'Arial, Helvetica, sans-serif'
const MEASURE_TEXT_STYLE = `font-family="${FONT_FAMILY}" font-size="22" font-weight="900" fill="#050505"`
const POST_NUMBER_STYLE = `font-family="${FONT_FAMILY}" font-size="38" font-weight="900" fill="#050505"`
const LEGEND_NUMBER_STYLE = `font-family="${FONT_FAMILY}" font-size="28" font-weight="900" fill="#050505"`
const LEGEND_LABEL_STYLE = `font-family="${FONT_FAMILY}" font-size="14" font-weight="800" fill="#111111"`

const ZONE_COLORS = {
  red: '#ff1f2d',
  blue: '#347cff',
  green: '#39c950',
  yellow: '#f6d900',
}

const maps = [
  {
    file: 'guerra-total-4p-esquinas.svg',
    title: 'Guerra Total - Escaramuza 4 jugadores esquinas',
    boardIn: 24,
    tokenDiameter: 3,
    posts: [
      { n: 1, x: 4, y: 20, color: 'red', label: 'RED HQ' },
      { n: 2, x: 20, y: 4, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 4, y: 4, color: 'green', label: 'GREEN HQ' },
      { n: 4, x: 20, y: 20, color: 'yellow', label: 'YELLOW HQ' },
      { n: 5, x: 12, y: 12, color: 'neutral' },
      { n: 6, x: 8, y: 8, color: 'neutral' },
      { n: 7, x: 16, y: 8, color: 'neutral' },
      { n: 8, x: 8, y: 16, color: 'neutral' },
      { n: 9, x: 16, y: 16, color: 'neutral' },
    ],
    zones: ['red', 'blue', 'green', 'yellow'],
  },
  {
    file: 'guerra-total-2p-diagonal.svg',
    title: 'Guerra Total - Escaramuza 2 jugadores diagonal',
    boardIn: 24,
    tokenDiameter: 3,
    posts: [
      { n: 1, x: 4, y: 20, color: 'red', label: 'RED HQ' },
      { n: 2, x: 20, y: 4, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 8, y: 8, color: 'neutral' },
      { n: 4, x: 16, y: 16, color: 'neutral' },
      { n: 5, x: 12, y: 12, color: 'neutral' },
      { n: 6, x: 16, y: 8, color: 'neutral' },
      { n: 7, x: 8, y: 16, color: 'neutral' },
    ],
    zones: ['red', 'blue'],
  },
  {
    file: 'guerra-total-4p-centro.svg',
    title: 'Guerra Total - Escaramuza 4 jugadores centro',
    boardIn: 24,
    tokenDiameter: 3,
    posts: [
      { n: 1, x: 10, y: 14, color: 'red', label: 'RED HQ' },
      { n: 2, x: 14, y: 10, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 10, y: 10, color: 'green', label: 'GREEN HQ' },
      { n: 4, x: 14, y: 14, color: 'yellow', label: 'YELLOW HQ' },
      { n: 5, x: 12, y: 12, color: 'neutral' },
      { n: 6, x: 4, y: 4, color: 'neutral' },
      { n: 7, x: 20, y: 4, color: 'neutral' },
      { n: 8, x: 4, y: 20, color: 'neutral' },
      { n: 9, x: 20, y: 20, color: 'neutral' },
    ],
    zones: ['red', 'blue', 'green', 'yellow'],
  },
  {
    file: 'escaramuza-2p-diagonal-3in.svg',
    title: 'Guerra Total - Escaramuza 2 jugadores flancos',
    boardIn: 24,
    tokenDiameter: 3,
    posts: [
      { n: 1, x: 4, y: 12, color: 'red', label: 'RED HQ' },
      { n: 2, x: 20, y: 12, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 8, y: 7, color: 'neutral' },
      { n: 4, x: 16, y: 17, color: 'neutral' },
      { n: 5, x: 12, y: 12, color: 'neutral' },
      { n: 6, x: 16, y: 7, color: 'neutral' },
      { n: 7, x: 8, y: 17, color: 'neutral' },
    ],
    zones: ['red', 'blue'],
  },
  {
    file: 'gran-batalla-2p-normal.svg',
    title: 'Guerra Total - Gran Batalla 2 jugadores normal',
    boardIn: 36,
    tokenDiameter: 6,
    posts: [
      { n: 1, x: 6, y: 30, color: 'red', label: 'RED HQ' },
      { n: 2, x: 30, y: 6, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 12, y: 12, color: 'neutral' },
      { n: 4, x: 24, y: 24, color: 'neutral' },
      { n: 5, x: 18, y: 18, color: 'neutral' },
      { n: 6, x: 24, y: 12, color: 'neutral' },
      { n: 7, x: 12, y: 24, color: 'neutral' },
    ],
    zones: ['red', 'blue'],
  },
  {
    file: 'gran-batalla-2p-comprometida.svg',
    title: 'Guerra Total - Gran Batalla 2 jugadores cuarteles expuestos',
    boardIn: 36,
    tokenDiameter: 6,
    posts: [
      { n: 1, x: 6, y: 30, color: 'neutral' },
      { n: 2, x: 30, y: 6, color: 'neutral' },
      { n: 3, x: 12, y: 12, color: 'neutral' },
      { n: 4, x: 24, y: 24, color: 'neutral' },
      { n: 5, x: 18, y: 18, color: 'neutral' },
      { n: 6, x: 24, y: 12, color: 'blue', label: 'BLUE HQ' },
      { n: 7, x: 12, y: 24, color: 'red', label: 'RED HQ' },
    ],
    zones: ['red', 'blue'],
  },
  {
    file: 'gran-batalla-4p-esquinas.svg',
    title: 'Guerra Total - Gran Batalla 4 jugadores esquinas',
    boardIn: 36,
    tokenDiameter: 6,
    posts: [
      { n: 1, x: 6, y: 30, color: 'red', label: 'RED HQ' },
      { n: 2, x: 30, y: 6, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 6, y: 6, color: 'green', label: 'GREEN HQ' },
      { n: 4, x: 30, y: 30, color: 'yellow', label: 'YELLOW HQ' },
      { n: 5, x: 18, y: 18, color: 'neutral' },
      { n: 6, x: 12, y: 12, color: 'neutral' },
      { n: 7, x: 24, y: 12, color: 'neutral' },
      { n: 8, x: 12, y: 24, color: 'neutral' },
      { n: 9, x: 24, y: 24, color: 'neutral' },
    ],
    zones: ['red', 'blue', 'green', 'yellow'],
  },
  {
    file: 'gran-batalla-4p-cuarteles-expuestos.svg',
    title: 'Guerra Total - Gran Batalla 4 jugadores cuarteles expuestos',
    boardIn: 36,
    tokenDiameter: 6,
    posts: [
      { n: 1, x: 12, y: 24, color: 'red', label: 'RED HQ' },
      { n: 2, x: 24, y: 12, color: 'blue', label: 'BLUE HQ' },
      { n: 3, x: 12, y: 12, color: 'green', label: 'GREEN HQ' },
      { n: 4, x: 24, y: 24, color: 'yellow', label: 'YELLOW HQ' },
      { n: 5, x: 18, y: 18, color: 'neutral' },
      { n: 6, x: 6, y: 6, color: 'neutral' },
      { n: 7, x: 30, y: 6, color: 'neutral' },
      { n: 8, x: 6, y: 30, color: 'neutral' },
      { n: 9, x: 30, y: 30, color: 'neutral' },
    ],
    zones: ['red', 'blue', 'green', 'yellow'],
  },
]

const getMetrics = (boardIn, legendRows = 1) => {
  const boardPx = boardIn * PX_PER_IN
  const legendTop = MARGIN + boardPx + 62
  const legendHeight = 36 + legendRows * LEGEND_ROW_HEIGHT
  return {
    boardIn,
    boardPx,
    legendTop,
    legendHeight,
    svgWidth: MARGIN * 2 + boardPx,
    svgHeight: legendTop + legendHeight + 38,
  }
}

const px = (metrics, inch) => MARGIN + inch * PX_PER_IN
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const renderText = (text, x, y, extra = '') =>
  `<text x="${x}" y="${y}" ${extra}>${esc(text)}</text>`

const renderZone = (color, metrics) => {
  const size = (metrics.boardIn / 4) * PX_PER_IN
  const zones = {
    red: { x: MARGIN, y: MARGIN + metrics.boardPx - size },
    blue: { x: MARGIN + metrics.boardPx - size, y: MARGIN },
    green: { x: MARGIN, y: MARGIN },
    yellow: { x: MARGIN + metrics.boardPx - size, y: MARGIN + metrics.boardPx - size },
  }
  const zone = zones[color]
  if (!zone) return ''
  return `<rect x="${zone.x}" y="${zone.y}" width="${size}" height="${size}" fill="url(#zone-${color})"/>`
}

const renderGrid = (metrics) => {
  const lines = []
  for (let i = 3; i < metrics.boardIn; i += 3) {
    const pos = px(metrics, i)
    const isCenter = i === metrics.boardIn / 2
    const lineStyle = isCenter
      ? 'stroke="#111111" stroke-width="1.5" stroke-dasharray="8 10"'
      : 'stroke="#d8d8d8" stroke-width="1"'
    lines.push(`<line x1="${pos}" y1="${MARGIN}" x2="${pos}" y2="${MARGIN + metrics.boardPx}" class="${isCenter ? 'center-line' : 'grid-line'}" ${lineStyle}/>`)
    lines.push(`<line x1="${MARGIN}" y1="${pos}" x2="${MARGIN + metrics.boardPx}" y2="${pos}" class="${isCenter ? 'center-line' : 'grid-line'}" ${lineStyle}/>`)
  }
  return lines.join('\n')
}

const renderRulers = (metrics) => {
  const labels = []
  for (let i = 3; i <= metrics.boardIn; i += 3) {
    const pos = px(metrics, i)
    labels.push(renderText(`${i}"`, pos, 36, `class="measure top" ${MEASURE_TEXT_STYLE} text-anchor="middle"`))
    labels.push(renderText(`${i}"`, pos, MARGIN + metrics.boardPx + 29, `class="measure bottom" ${MEASURE_TEXT_STYLE} text-anchor="middle"`))
    labels.push(renderText(`${i}"`, MARGIN - 14, pos + 8, `class="measure left" ${MEASURE_TEXT_STYLE} text-anchor="end"`))
    labels.push(renderText(`${i}"`, MARGIN + metrics.boardPx + 14, pos + 8, `class="measure right" ${MEASURE_TEXT_STYLE} text-anchor="start"`))
  }
  return labels.join('\n')
}

const renderPost = (post, tokenDiameter, metrics) => {
  const x = px(metrics, post.x)
  const y = px(metrics, post.y)
  const stroke = COLORS[post.color] || COLORS.neutral
  const footprintRadius = (tokenDiameter / 2) * PX_PER_IN
  const markerRadius = 28
  return `
    <g class="post post-${post.color}" data-post="${post.n}" data-x-in="${post.x}" data-y-in="${post.y}" data-token-diameter-in="${tokenDiameter}">
      <circle cx="${x}" cy="${y}" r="${footprintRadius}" class="post-footprint" fill="none" stroke="${stroke}" stroke-width="2" stroke-opacity="0.18" stroke-dasharray="7 8"/>
      <circle cx="${x}" cy="${y}" r="${markerRadius}" fill="#ffffff" stroke="#101010" stroke-width="5"/>
      <circle cx="${x}" cy="${y}" r="${markerRadius - 6}" fill="#f9f9f9" stroke="${stroke}" stroke-width="${post.color === 'neutral' ? 0 : 7}"/>
      <text x="${x}" y="${y + 14}" class="post-number" ${POST_NUMBER_STYLE} text-anchor="middle">${post.n}</text>
    </g>`
}

const getLegendItems = (map) => {
  const hqItems = map.posts
    .filter((post) => post.label)
    .map((post) => ({
      color: post.color,
      n: post.n,
      lines: [post.label, 'COMMAND POST'],
    }))

  return [
    ...hqItems,
    { color: 'neutral', n: '', lines: ['NEUTRAL', 'COMMAND POSTS'] },
  ]
}

const renderLegend = (map) => {
  const items = getLegendItems(map)
  const columnCount = Math.min(3, items.length)
  const rowCount = Math.ceil(items.length / columnCount)
  const metrics = getMetrics(map.boardIn, rowCount)
  const left = MARGIN - 20
  const width = metrics.boardPx + 40
  const slot = width / columnCount

  return `
    <g class="legend">
      <rect x="${left}" y="${metrics.legendTop}" width="${width}" height="${metrics.legendHeight}" fill="#ffffff" stroke="#111111" stroke-width="2"/>
      ${items.map((item, index) => {
        const column = index % columnCount
        const row = Math.floor(index / columnCount)
        const x = left + slot * column + 48
        const y = metrics.legendTop + 48 + LEGEND_ROW_HEIGHT * row
        const stroke = COLORS[item.color] || COLORS.neutral
        return `
          <g transform="translate(${x}, ${y})">
            <circle cx="0" cy="0" r="25" fill="#ffffff" stroke="#101010" stroke-width="5"/>
            <circle cx="0" cy="0" r="19" fill="#f9f9f9" stroke="${stroke}" stroke-width="${item.color === 'neutral' ? 0 : 7}"/>
            ${item.n ? `<text x="0" y="11" class="legend-number" ${LEGEND_NUMBER_STYLE} text-anchor="middle">${item.n}</text>` : ''}
            <text x="44" y="-8" class="legend-label" ${LEGEND_LABEL_STYLE}>${esc(item.lines[0])}</text>
            <text x="44" y="18" class="legend-label" ${LEGEND_LABEL_STYLE}>${esc(item.lines[1])}</text>
          </g>`
      }).join('\n')}
    </g>`
}

const renderSvg = (map) => {
  const legendRowCount = Math.ceil(getLegendItems(map).length / Math.min(3, getLegendItems(map).length))
  const metrics = getMetrics(map.boardIn, legendRowCount)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${metrics.svgWidth}" height="${metrics.svgHeight}" viewBox="0 0 ${metrics.svgWidth} ${metrics.svgHeight}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(map.title)}</title>
  <desc id="desc">ZeroLore symmetric ${metrics.boardIn} inch by ${metrics.boardIn} inch map. Command post centers use inch coordinates. Command post token diameter: ${map.tokenDiameter} inches.</desc>
  <metadata>
    board-size-in: ${metrics.boardIn}x${metrics.boardIn};
    grid-step-in: 3;
    major-step-in: 6;
    command-post-token-diameter-in: ${map.tokenDiameter};
    coordinate-origin: top-left;
  </metadata>
  <defs>
    <radialGradient id="zone-red" cx="0%" cy="100%" r="110%">
      <stop offset="0%" stop-color="${ZONE_COLORS.red}" stop-opacity="0.5"/>
      <stop offset="78%" stop-color="${ZONE_COLORS.red}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${ZONE_COLORS.red}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="zone-blue" cx="100%" cy="0%" r="110%">
      <stop offset="0%" stop-color="${ZONE_COLORS.blue}" stop-opacity="0.44"/>
      <stop offset="78%" stop-color="${ZONE_COLORS.blue}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${ZONE_COLORS.blue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="zone-green" cx="0%" cy="0%" r="110%">
      <stop offset="0%" stop-color="${ZONE_COLORS.green}" stop-opacity="0.42"/>
      <stop offset="78%" stop-color="${ZONE_COLORS.green}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${ZONE_COLORS.green}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="zone-yellow" cx="100%" cy="100%" r="110%">
      <stop offset="0%" stop-color="${ZONE_COLORS.yellow}" stop-opacity="0.48"/>
      <stop offset="78%" stop-color="${ZONE_COLORS.yellow}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${ZONE_COLORS.yellow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${renderRulers(metrics)}
  <g class="board" data-board-size-in="${metrics.boardIn}">
    <rect x="${MARGIN}" y="${MARGIN}" width="${metrics.boardPx}" height="${metrics.boardPx}" class="board-bg" fill="#fbfbfa"/>
    ${map.zones.map((zone) => renderZone(zone, metrics)).join('\n')}
    ${renderGrid(metrics)}
    <rect x="${MARGIN}" y="${MARGIN}" width="${metrics.boardPx}" height="${metrics.boardPx}" class="board-border" fill="none" stroke="#0b0b0b" stroke-width="2.2"/>
    ${map.posts.map((post) => renderPost(post, map.tokenDiameter, metrics)).join('\n')}
  </g>
  ${renderLegend(map)}
</svg>
`
}

mkdirSync(outputDir, { recursive: true })

for (const map of maps) {
  writeFileSync(join(outputDir, map.file), renderSvg(map))
}

console.log(`Generated ${maps.length} map SVGs in ${outputDir}`)
