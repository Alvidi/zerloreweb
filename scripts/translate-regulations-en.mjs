#!/usr/bin/env node
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

const EN_FILES = [
  'src/data/english/ZEROLORE_QUICK_PLAY_RULEBOOK_EN.html',
  'src/data/english/ZEROLORE_ADVANCED_RULEBOOK_EN.html',
]

const SPANISH_STOPWORDS = [
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'del',
  'al',
  'que',
  'con',
  'para',
  'como',
  'cuando',
  'donde',
  'desde',
  'hasta',
  'puede',
  'debe',
  'deben',
  'unidad',
  'unidades',
  'escuadra',
  'escuadras',
  'miniatura',
  'miniaturas',
  'movimiento',
  'velocidad',
  'salvacion',
  'salvación',
  'disparo',
  'cobertura',
  'enemigo',
  'enemiga',
  'enemigos',
  'enemigas',
  'partida',
  'turno',
  'turnos',
  'puntos',
  'dano',
  'daño',
  'impacto',
  'impactos',
  'critico',
  'crítico',
  'doctrina',
  'doctrinas',
]

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function looksSpanish(text) {
  if (!text || text.length < 3) return false
  if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(text)) return true

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  let matches = 0
  for (const word of SPANISH_STOPWORDS) {
    const safe = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b${safe}\\b`, 'i')
    if (re.test(normalized)) matches += 1
    if (matches >= 2) return true
  }

  return false
}

async function translateEsToEn(text, cache) {
  const source = normalizeText(text)
  if (!source) return text
  if (cache.has(source)) return cache.get(source)

  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'es')
  url.searchParams.set('tl', 'en')
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', source)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Translation API error ${response.status} for text: ${source.slice(0, 120)}`)
  }

  const payload = await response.json()
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map((item) => item?.[0] || '').join('')
    : source

  cache.set(source, translated || source)
  return cache.get(source)
}

async function translateFile(filePath, cache) {
  const html = fs.readFileSync(filePath, 'utf8')
  const dom = new JSDOM(html)
  const { document, NodeFilter } = dom.window
  const walker = document.createTreeWalker(document.body || document, NodeFilter.SHOW_TEXT)

  const updates = []
  let current = walker.nextNode()
  while (current) {
    const raw = current.nodeValue || ''
    const compact = normalizeText(raw)
    if (looksSpanish(compact)) {
      updates.push(current)
    }
    current = walker.nextNode()
  }

  let translatedCount = 0
  for (const node of updates) {
    const raw = node.nodeValue || ''
    const trimmed = raw.trim()
    if (!trimmed) continue

    const leading = raw.match(/^\s*/)?.[0] || ''
    const trailing = raw.match(/\s*$/)?.[0] || ''
    const translated = await translateEsToEn(trimmed, cache)
    if (translated && translated !== trimmed) {
      node.nodeValue = `${leading}${translated}${trailing}`
      translatedCount += 1
    }
  }

  fs.writeFileSync(filePath, dom.serialize(), 'utf8')
  return { filePath, translatedCount, candidates: updates.length }
}

async function run() {
  const cache = new Map()
  const reports = []
  for (const filePath of EN_FILES) {
    reports.push(await translateFile(filePath, cache))
  }

  console.log('translate-regulations-en completed')
  for (const item of reports) {
    console.log(`${item.filePath}: translated ${item.translatedCount}/${item.candidates} candidates`)
  }
  console.log(`unique text entries translated: ${cache.size}`)
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
