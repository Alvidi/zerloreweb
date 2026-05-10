import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const OUT_DIR = path.resolve('src/images/faction_passives')
const SIZE = 384
const GRID = 64
const SCALE = SIZE / GRID

const COLORS = {
  black: '#05080f',
  panel: '#0d1423',
  inner: '#0a1020',
  frameLight: '#7db9ff',
  frameDark: '#2d5f9f',
  cornerLight: '#f7e6a2',
  cornerDark: '#c9912c',
  cream: '#f6edcb',
  gold: '#d2a246',
  blue: '#7db9ff',
  blueLight: '#9fd0ff',
  steel: '#577aa7',
}

const iconShapes = {
  'atrincheramiento.png': [
    ['steel', 14, 36, 36, 10],
    ['blueLight', 14, 34, 36, 2],
    ['blueLight', 16, 38, 6, 6],
    ['blueLight', 24, 38, 6, 6],
    ['blueLight', 32, 38, 6, 6],
    ['blueLight', 40, 38, 8, 6],
    ['cream', 26, 16, 12, 4],
    ['cream', 22, 20, 20, 4],
    ['cream', 20, 24, 24, 4],
    ['cream', 20, 28, 24, 4],
    ['gold', 22, 32, 20, 4],
    ['gold', 26, 36, 12, 2],
  ],
  'fuego-coordinado.png': [
    ['cream', 11, 14, 10, 6],
    ['cream', 11, 29, 10, 6],
    ['cream', 11, 44, 10, 6],
    ['blue', 21, 16, 18, 2],
    ['blue', 21, 31, 18, 2],
    ['blue', 21, 46, 18, 2],
    ['gold', 39, 18, 10, 2],
    ['gold', 39, 30, 10, 4],
    ['gold', 39, 44, 10, 2],
    ['cream', 47, 22, 4, 20],
    ['cream', 41, 28, 16, 4],
    ['gold', 44, 25, 10, 2],
    ['gold', 44, 33, 10, 2],
    ['gold', 44, 27, 2, 6],
    ['gold', 52, 27, 2, 6],
  ],
  'repliegue-tactico.png': [
    ['cream', 17, 24, 22, 4],
    ['cream', 17, 36, 22, 4],
    ['cream', 13, 28, 4, 8],
    ['cream', 39, 28, 4, 8],
    ['gold', 9, 28, 4, 4],
    ['gold', 5, 32, 4, 4],
    ['gold', 9, 36, 4, 4],
    ['blue', 38, 16, 4, 20],
    ['blue', 34, 20, 4, 16],
    ['blue', 42, 20, 4, 16],
    ['blue', 30, 24, 4, 8],
    ['blue', 46, 24, 4, 8],
  ],
  'artilleria-de-apoyo.png': [
    ['steel', 13, 41, 22, 5],
    ['blue', 17, 36, 15, 5],
    ['blue', 28, 30, 5, 6],
    ['cream', 33, 25, 5, 5],
    ['cream', 38, 20, 5, 5],
    ['gold', 38, 36, 4, 12],
    ['gold', 34, 40, 12, 4],
    ['cornerLight', 30, 32, 4, 4],
    ['cornerLight', 34, 28, 4, 4],
    ['cornerLight', 42, 28, 4, 4],
    ['cornerLight', 46, 32, 4, 4],
    ['cornerLight', 46, 40, 4, 4],
    ['cornerLight', 42, 44, 4, 4],
  ],
  'formacion-de-asalto.png': [
    ['cream', 12, 38, 12, 4],
    ['cream', 24, 34, 4, 12],
    ['gold', 20, 30, 4, 4],
    ['gold', 16, 26, 4, 4],
    ['cream', 26, 32, 12, 4],
    ['cream', 38, 28, 4, 12],
    ['gold', 34, 24, 4, 4],
    ['gold', 30, 20, 4, 4],
    ['cream', 40, 26, 12, 4],
    ['cream', 52, 22, 4, 12],
    ['gold', 48, 18, 4, 4],
    ['gold', 44, 14, 4, 4],
  ],
  'contraofensiva.png': [
    ['cream', 15, 31, 16, 4],
    ['cream', 31, 27, 4, 12],
    ['gold', 11, 27, 4, 4],
    ['gold', 7, 31, 4, 4],
    ['gold', 11, 35, 4, 4],
    ['blue', 39, 17, 4, 22],
    ['blue', 43, 21, 4, 18],
    ['blue', 35, 21, 4, 18],
    ['blue', 31, 25, 4, 10],
    ['blue', 47, 25, 4, 10],
    ['cream', 39, 39, 4, 8],
    ['cream', 35, 47, 12, 4],
    ['gold', 33, 51, 16, 2],
  ],
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c >>> 0
  }
  return table
})()

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([len, typeBuffer, data, crc])
}

const writePng = (filePath, width, height, pixels) => {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1)
    raw[rowOffset] = 0
    pixels.copy(raw, rowOffset + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])

  fs.writeFileSync(filePath, png)
}

const setPixel = (pixels, width, x, y, color) => {
  if (x < 0 || y < 0 || x >= width || y >= width) return
  const offset = (y * width + x) * 4
  const [r, g, b] = hexToRgb(color)
  pixels[offset] = r
  pixels[offset + 1] = g
  pixels[offset + 2] = b
  pixels[offset + 3] = 255
}

const fillRect = (pixels, x, y, w, h, colorKey) => {
  const color = COLORS[colorKey]
  for (let py = y * SCALE; py < (y + h) * SCALE; py += 1) {
    for (let px = x * SCALE; px < (x + w) * SCALE; px += 1) {
      setPixel(pixels, SIZE, px, py, color)
    }
  }
}

const drawBase = (pixels) => {
  fillRect(pixels, 0, 0, 64, 64, 'black')
  fillRect(pixels, 3, 3, 58, 58, 'panel')
  fillRect(pixels, 5, 5, 54, 54, 'inner')
  fillRect(pixels, 3, 3, 58, 2, 'frameLight')
  fillRect(pixels, 3, 59, 58, 2, 'frameDark')
  fillRect(pixels, 3, 5, 2, 54, 'frameLight')
  fillRect(pixels, 59, 5, 2, 54, 'frameDark')
  fillRect(pixels, 8, 8, 4, 4, 'cornerLight')
  fillRect(pixels, 52, 8, 4, 4, 'cornerLight')
  fillRect(pixels, 8, 52, 4, 4, 'cornerDark')
  fillRect(pixels, 52, 52, 4, 4, 'cornerDark')
}

const renderIcon = (fileName, shapes) => {
  const pixels = Buffer.alloc(SIZE * SIZE * 4)
  drawBase(pixels)
  shapes.forEach(([color, x, y, w, h]) => fillRect(pixels, x, y, w, h, color))
  writePng(path.join(OUT_DIR, fileName), SIZE, SIZE, pixels)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
Object.entries(iconShapes).forEach(([fileName, shapes]) => renderIcon(fileName, shapes))
console.log(`Generated ${Object.keys(iconShapes).length} faction passive icons.`)
