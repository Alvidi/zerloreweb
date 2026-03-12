#!/usr/bin/env node
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

const BOOKS = [
  {
    source: 'src/data/spanish/ZEROLORE - REGLAMENTO juego rápido 313087d94b3380dc9c0ffd50e9ba8d50.html',
    target: 'src/data/english/ZEROLORE_QUICK_PLAY_RULEBOOK_EN.html',
  },
  {
    source: 'src/data/spanish/ZEROLORE - REGLAMENTO avanzado 2eb087d94b33800ea112ed9327b7e9c8.html',
    target: 'src/data/english/ZEROLORE_ADVANCED_RULEBOOK_EN.html',
  },
]

const normalizeText = (text) => String(text || '').replace(/\s+/g, ' ').trim()

const hasLetters = (text) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)

const shouldTranslate = (text) => {
  const value = normalizeText(text)
  if (!value) return false
  if (!hasLetters(value)) return false
  if (/^(https?:\/\/|www\.)/i.test(value)) return false
  return true
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function postProcess(value) {
  let text = value
  const replacements = [
    ['ZEROLORE - RULES fast game', 'ZEROLORE - QUICK PLAY RULEBOOK'],
    ['ZEROLORE - Advanced REGULATIONS', 'ZEROLORE - ADVANCED RULEBOOK'],
    ['Advanced regulation', 'Advanced Rulebook'],
    ['Fundamental concepts', 'Core Concepts'],
    ['Salvation', 'Save'],
    ['salvation', 'save'],
    ['Diana', 'Bullseye'],
    ['Parabolic shot', 'Parabolic Shot'],
    ['Parabolic Shooting', 'Parabolic Shot'],
    ['Quick game', 'Quick Play'],
    ['Assaulter', 'Raider'],
    ['Critical attack', 'Critical Attack'],
    ['Ignore coverage', 'Ignore Cover'],
    ['Shift structure', 'Turn Structure'],
    ['Motion', 'Movement'],
    ['Shot', 'Shooting'],
    ['Prepared', 'Ready'],
    ['Career', 'Sprint'],
    ['Burden', 'Charge'],
    ['General rule', 'General Rule'],
    ['thumbnail', 'miniature'],
    ['Choose objective', 'Choose target'],
    ['Throw impacts', 'Roll to hit'],
    ['Weapon skills', 'Weapon Abilities'],
    ['weapon skills', 'weapon abilities'],
    ['Club blow', 'Bludgeon'],
    ['Pointed', 'Aimed Shot'],
    ['Agility in combat', 'Combat Agility'],
    ['Ours is the victory', 'Victory is Ours'],
    ['More than prepared', 'More Than Ready'],
  ]

  replacements.forEach(([from, to]) => {
    text = text.replace(new RegExp(`\\b${escapeRegex(from)}\\b`, 'g'), to)
  })

  text = text.replace(/\s+([,.;:!?\)])/g, '$1')
  text = text.replace(/\(\s+/g, '(')
  text = text.replace(/([.,:;!?])([A-Za-z(])/g, '$1 $2')
  text = text.replace(/([a-z0-9\)])([A-Z][a-z])/g, '$1 $2')
  text = text.replace(/\b(\d+)\s+share(s)?\b/gi, (_, qty, plural) => `${qty} action${plural ? 's' : ''}`)
  text = text.replace(/\bshare\b/gi, 'action')
  text = text.replace(/\bMoment:\b/g, 'Timing:')
  text = text.replace(/\bRace\b/g, 'Sprint')
  text = text.replace(/\bCaC\b/g, 'melee combat')
  text = text.replace(/\bValor\b/g, 'Value')
  text = text.replace(/\bEnd of Shift\b/g, 'End of Turn')
  text = text.replace(/\bActivations Phase\b/g, 'Activation Phase')
  text = text.replace(/\bActions of a unit\b/g, 'Unit Actions')
  text = text.replace(/\s{2,}/g, ' ')
  return text
}

async function translateEsToEn(content, cache, format = 'text') {
  const source = String(content || '').trim()
  if (!source) return content
  if (cache.has(source)) return cache.get(source)

  let attempts = 0
  while (attempts < 4) {
    attempts += 1

    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'es')
    url.searchParams.set('tl', 'en')
    url.searchParams.set('dt', 't')
    url.searchParams.set('format', format)
    url.searchParams.set('q', source)

    const response = await fetch(url)
    if (response.ok) {
      const payload = await response.json()
      const translated = Array.isArray(payload?.[0])
        ? payload[0].map((item) => item?.[0] || '').join('')
        : source

      const clean = postProcess(translated || source)
      cache.set(source, clean)
      return clean
    }

    if (attempts >= 4) {
      throw new Error(`Translation API error ${response.status} for: ${source.slice(0, 120)}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 450 * attempts))
  }

  return source
}

const BLOCK_SELECTORS = [
  'title',
  'h1.page-title',
  'nav.table_of_contents a',
  'h1',
  'h2',
  'h3',
  'p',
  'li',
  'blockquote',
  'th',
  'td',
].join(', ')

async function translateDom(dom, cache) {
  const { document } = dom.window
  const blocks = Array.from(document.querySelectorAll(BLOCK_SELECTORS))

  let translatedCount = 0
  for (const block of blocks) {
    const plain = normalizeText(block.textContent || '')
    if (!shouldTranslate(plain)) continue

    const isTitle = block.tagName === 'TITLE'
    const raw = isTitle ? (block.textContent || '') : (block.innerHTML || '')
    if (!raw.trim()) continue
    const format = raw.includes('<') ? 'html' : 'text'
    const translated = await translateEsToEn(raw, cache, format)
    if (!translated || translated === raw) continue

    if (isTitle) {
      block.textContent = translated
    } else {
      block.innerHTML = translated
    }
    translatedCount += 1
  }

  return { candidates: blocks.length, translated: translatedCount }
}

async function run() {
  const cache = new Map()
  const reports = []

  for (const book of BOOKS) {
    const html = fs.readFileSync(book.source, 'utf8')
    const dom = new JSDOM(html)
    const report = await translateDom(dom, cache)
    fs.writeFileSync(book.target, dom.serialize(), 'utf8')
    reports.push({ ...book, ...report })
  }

  console.log('translate-rulebooks-from-spanish completed')
  reports.forEach((report) => {
    console.log(`${report.target}: translated ${report.translated}/${report.candidates} text nodes`)
  })
  console.log(`unique phrases translated: ${cache.size}`)
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
