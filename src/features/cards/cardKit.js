/**
 * Piezas comunes de las cartas vectoriales (unidad, Héroe y equipamiento).
 *
 * Las cartas son un único SVG de 1536 × 1024. Todo lo que se ve se dibuja aquí,
 * sin plantillas PNG: las etiquetas son texto y se cambian en el código. El texto
 * se mide con las fuentes reales antes de colocarlo, y para el PDF el SVG se
 * pasa a imagen con esas mismas fuentes incrustadas, así que la carta exportada
 * es exactamente la que se ve en pantalla.
 */
import { useEffect, useState } from 'react'

import cinzel700 from '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url'
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff2?url'
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url'
import rajdhani600 from '@fontsource/rajdhani/files/rajdhani-latin-600-normal.woff2?url'
import rajdhani700 from '@fontsource/rajdhani/files/rajdhani-latin-700-normal.woff2?url'

export const CARD_W = 1536
export const CARD_H = 1024

export const GOLD = '#c9a35c'
export const GOLD_HI = '#e6c983'
export const CREAM = '#f3e3bb'
export const INK = '#14161c'
export const INK_SOFT = '#2a2c33'
export const PAPER = '#f1efea'
export const NIGHT = '#0b0b0e'
export const PANEL = '#0d0d10'

/* ── Geometría ──────────────────────────────────────────────────────────── */

/** Rectángulo con esquinas cortadas a 45°: la forma de todos los marcos. */
export const cham = (x, y, w, h, c) =>
  `M${x + c} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h - c}L${x + w - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`

/** Octógono regular centrado (Valor e insignias de sección). */
export const octo = (cx, cy, r) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')

/** Panel con las esquinas de abajo redondeadas (habilidad de unidad). */
export const bottomRounded = (x, y, w, h, r) =>
  `M${x} ${y}H${x + w}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}Z`

/* ── Iconos pequeños de la carta (caja de 32 × 32) ───────────────────────── */

export const CARD_ICONS = {
  movimiento: 'M2 6 L11 16 L2 26 H8 L17 16 L8 6Z M13 6 L22 16 L13 26 H19 L28 16 L19 6Z',
  vidas: 'M16 28 L4.5 16.5 C1 13 1.5 6 8 5.2 C11.5 4.8 14.2 6.8 16 9.4 C17.8 6.8 20.5 4.8 24 5.2 C30.5 6 31 13 27.5 16.5Z',
  defensa: 'M16 2.5 L28 6.5 V14.5 C28 21.5 23 26.8 16 29.5 C9 26.8 4 21.5 4 14.5 V6.5Z',
  escuadra: [
    'M21.2 9a5.2 5.2 0 1 1-10.4 0a5.2 5.2 0 1 1 10.4 0Z',
    'M10.3 11.5a3.8 3.8 0 1 1-7.6 0a3.8 3.8 0 1 1 7.6 0Z',
    'M29.3 11.5a3.8 3.8 0 1 1-7.6 0a3.8 3.8 0 1 1 7.6 0Z',
    'M7 29 C7 21 10.5 16.5 16 16.5 C21.5 16.5 25 21 25 29Z',
    'M0.5 27 C0.5 21 2.5 17.6 6.5 17.6 C7.7 17.6 8.7 17.9 9.5 18.4 C7.3 20.6 6 23.6 5.7 27Z',
    'M31.5 27 C31.5 21 29.5 17.6 25.5 17.6 C24.3 17.6 23.3 17.9 22.5 18.4 C24.7 20.6 26 23.6 26.3 27Z',
  ].join(' '),
  // Mira: anillo, cuatro marcas y punto central
  disparo: 'M16 6a10 10 0 1 0 0.01 0Z M16 9a7 7 0 1 1-0.01 0Z M14.5 0.5H17.5V8H14.5Z M14.5 24H17.5V31.5H14.5Z M0.5 14.5H8V17.5H0.5Z M24 14.5H31.5V17.5H24Z M19 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0Z',
  // Dos espadas cruzadas con sus guardas
  cac: 'M3.5 6 L6 3.5 L25.5 23 L23 25.5Z M28.5 6 L26 3.5 L6.5 23 L9 25.5Z M17.5 27.5 L19.6 25.4 L27 18 L29.1 20.1 L21.7 27.5Z M14.5 27.5 L12.4 25.4 L5 18 L2.9 20.1 L10.3 27.5Z',
  // Estrella sobre galones (habilidades)
  habilidades: 'M16 2 L18.6 7.4 L24.5 8.2 L20.2 12.2 L21.3 18 L16 15.2 L10.7 18 L11.8 12.2 L7.5 8.2 L13.4 7.4Z M4 18 L16 23 L28 18 V21.5 L16 26.5 L4 21.5Z M4 23.5 L16 28.5 L28 23.5 V26 L16 31 L4 26Z',
}

/* ── Fuentes y medición de texto ───────────────────────────────────────── */

/*
 * Las cartas usan sus propias copias de las fuentes (los mismos archivos que se
 * incrustan en el PDF), con un nombre aparte. Si usaran las de Google de la
 * página, el texto se mediría con una versión y el PDF se pintaría con otra
 * algo más ancha, y los párrafos se saldrían de su caja.
 */
export const FONT = {
  title: 'ZL Cinzel',
  body: 'ZL Inter',
  label: 'ZL Rajdhani',
}

const FONT_FACES = [
  [FONT.title, 700, cinzel700],
  [FONT.body, 400, inter400],
  [FONT.body, 600, inter600],
  [FONT.label, 600, rajdhani600],
  [FONT.label, 700, rajdhani700],
]

let fontsPromise = null
let fontsLoaded = false
export const loadCardFonts = () => {
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return Promise.resolve()
  fontsPromise ||= Promise.all(FONT_FACES.map(async ([family, weight, url]) => {
    const face = new FontFace(family, `url(${url}) format('woff2')`, { weight: String(weight), style: 'normal' })
    document.fonts.add(await face.load())
  })).then(() => { fontsLoaded = true })
  return fontsPromise
}

/**
 * Las cartas parten y encogen el texto midiéndolo. Si se mide antes de que
 * llegue la fuente, se mide con la de reserva y el texto acaba fuera de su caja,
 * así que la carta se vuelve a maquetar en cuanto las fuentes están listas.
 */
export const useCardFonts = () => {
  // No vale document.fonts.check: da por cargada una fuente que aún no se ha registrado.
  const [ready, setReady] = useState(fontsLoaded)
  useEffect(() => {
    let alive = true
    loadCardFonts().then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])
  return ready
}

let measureContext = null
/** Ancho del texto tal y como lo pinta el SVG (incluido el espaciado entre letras). */
export const measureText = (text, { size, family = FONT.body, weight = 400, ls = 0 }) => {
  const value = String(text ?? '')
  if (!value) return 0
  if (typeof document === 'undefined') return value.length * size * 0.56
  measureContext ||= document.createElement('canvas').getContext('2d')
  measureContext.font = `${weight} ${size}px "${family}"`
  return measureContext.measureText(value).width + ls * value.length
}

/** Mayor tamaño de letra (bajando de medio en medio punto) con el que cabe en una línea. */
export const fitSize = (text, maxWidth, { max, min, ...font }) => {
  let size = max
  while (size > min && measureText(text, { ...font, size }) > maxWidth) size -= 0.5
  return size
}

/** Parte un párrafo en renglones que quepan en `maxWidth`. */
export const wrapText = (text, maxWidth, font) => {
  const lines = []
  let current = ''
  for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word
    if (current && measureText(next, font) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

/**
 * Coloca una lista de bloques (título en Cinzel + párrafo) centrados en una
 * caja, encogiendo la letra hasta que quepan. Devuelve las líneas con su
 * posición, listas para pintarse, y dónde van los separadores entre grupos.
 */
export const layoutTextBlocks = (blocks, box, {
  maxBody = 26, minBody = 13, titleRatio = 1.12, gap = 10, blockGap = 20, lineHeight = 1.36,
} = {}) => {
  for (let size = maxBody; size >= minBody; size -= 0.5) {
    const titleSize = size * titleRatio
    const lh = size * lineHeight
    const prepared = blocks.map((block) => ({
      ...block,
      lines: block.text ? wrapText(block.text, box.w, { size, family: FONT.body, weight: 400 }) : [],
    }))
    const titleWidthOk = prepared.every((block) => !block.title
      || measureText(block.title.toUpperCase(), { size: titleSize, family: FONT.title, weight: 700, ls: 2 }) <= box.w)
    let total = 0
    prepared.forEach((block, index) => {
      if (index) total += blockGap * (block.newGroup ? 2 : 1)
      if (block.title) total += titleSize * 1.1 + (block.lines.length ? gap : 0)
      total += block.lines.length * lh
    })
    if ((total > box.h || !titleWidthOk) && size > minBody) continue

    const items = []
    const dividers = []
    let y = box.y + Math.max(0, (box.h - total) / 2)
    prepared.forEach((block, index) => {
      if (index) {
        if (block.newGroup) {
          y += blockGap
          dividers.push(y)
        }
        y += blockGap
      }
      if (block.title) {
        items.push({ kind: 'title', text: block.title.toUpperCase(), x: box.x + box.w / 2, y: y + titleSize * 0.86, size: titleSize })
        y += titleSize * 1.1 + (block.lines.length ? gap : 0)
      }
      block.lines.forEach((line) => {
        items.push({ kind: 'body', text: line, x: box.x + box.w / 2, y: y + size * 0.98, size })
        y += lh
      })
    })
    return { items, dividers }
  }
  return { items: [], dividers: [] }
}

/* ── Paso a imagen para el PDF ─────────────────────────────────────────── */

const toDataUrl = async (url) => {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

let embeddedFontCss = null
const getEmbeddedFontCss = () => {
  embeddedFontCss ||= Promise.all(FONT_FACES.map(async ([family, weight, url]) =>
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(${await toDataUrl(url)}) format('woff2');}`))
    .then((faces) => faces.join(''))
  return embeddedFontCss
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Pinta un SVG de la carta en un canvas. Un SVG cargado como imagen no ve las
 * fuentes ni las imágenes de la página, así que se le incrustan dentro: las
 * fuentes como @font-face en base64 y cada <image> como data URL.
 */
export const rasterizeCardSvg = async (svgElement, { width = CARD_W, height = CARD_H, scale = 2 } = {}) => {
  if (!svgElement) return null
  await loadCardFonts()

  const clone = svgElement.cloneNode(true)
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.querySelectorAll('[data-export="skip"]').forEach((node) => node.remove())

  await Promise.all(Array.from(clone.querySelectorAll('image')).map(async (image) => {
    const href = image.getAttribute('href')
    if (href && !href.startsWith('data:')) image.setAttribute('href', await toDataUrl(href))
  }))

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = await getEmbeddedFontCss()
  clone.insertBefore(style, clone.firstChild)

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = url
    })
    // Las fuentes incrustadas se decodifican al pintar: se espera un instante
    // para que no salga ningún texto con la fuente de reserva.
    if (image.decode) await image.decode().catch(() => {})
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Lo mismo, partiendo de un SVG en texto (los tokens). */
export const rasterizeSvgMarkup = (markup, options) => {
  const svgElement = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement
  return rasterizeCardSvg(svgElement, options)
}
