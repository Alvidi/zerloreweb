#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const EN_DIR = path.resolve('src/data/factions/jsonFaccionesEN')

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const cleanText = (value) =>
  String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[”″“]/g, '"')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?\)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim()

const GROUP_MAP = {
  linea: 'Line',
  line: 'Line',
  elite: 'Elite',
  elites: 'Elite',
  vehiculo: 'Vehicle',
  vehiculos: 'Vehicle',
  vehicle: 'Vehicle',
  vehicles: 'Vehicle',
  monstruo: 'Monster',
  monstruos: 'Monster',
  monster: 'Monster',
  monsters: 'Monster',
  heroe: 'Hero',
  heroes: 'Hero',
  hero: 'Hero',
  titan: 'Titan',
  titans: 'Titan',
  todo: 'All',
  all: 'All',
}

const parseSigned = (text) => {
  const plus = text.match(/(\d+)\s*\+/)
  if (plus) return `+${plus[1]}`
  const signed = text.match(/[+-]\s*\d+/)
  if (signed) return signed[0].replace(/\s+/g, '')
  return ''
}

const parseUnsigned = (text) => {
  const m = text.match(/(\d+)\s*\+?/)
  return m ? `${m[1]}+` : ''
}

const normalizeClass = (value) => {
  const key = normalize(value)
  if (key === 'linea' || key === 'line') return 'Line'
  if (key === 'elite' || key === 'elite unit') return 'Elite'
  if (key === 'vehiculo' || key === 'vehicle') return 'Vehicle'
  if (key === 'heroe' || key === 'hero') return 'Hero'
  if (key === 'titan' || key === 'titans') return 'Titan'
  if (key === 'monstruo' || key === 'monster') return 'Monster'
  return value
}

const normalizeAbility = (raw) => {
  const text = cleanText(raw)
  if (!text || /^[-–—]$/.test(text)) return ''
  const key = normalize(text)

  const antiMatch = text.match(/^anti\s*([+-]?\s*\d+\+?)?\s*(?:\(([^)]+)\))?$/i)
  if (antiMatch) {
    const threshold = parseUnsigned(antiMatch[1] || text)
    const groups = (antiMatch[2] || '')
      .split(/[\/,]/)
      .map((group) => GROUP_MAP[normalize(group)] || cleanText(group))
      .filter(Boolean)
    const groupsPart = groups.length ? ` (${groups.join('/')})` : ''
    return `Anti${threshold ? ` ${threshold}` : ''}${groupsPart}`
  }

  if (key.startsWith('asaltante') || key.startsWith('raider')) {
    const signed = parseSigned(text)
    return `Raider${signed ? ` ${signed}` : ''}`
  }
  if (key.startsWith('pesada') || key.startsWith('heavy')) return 'Heavy'
  if (key.startsWith('ataque rapido') || key.startsWith('quick attack')) {
    const signed = parseSigned(text)
    return `Quick Attack${signed ? ` ${signed}` : ''}`
  }
  if (key.startsWith('pistolero') || key.startsWith('gunslinger')) return 'Gunslinger'
  if (key.startsWith('explosiva') || key.startsWith('explosive')) return 'Explosive'
  if (key.startsWith('ataque critico') || key.startsWith('critical attack')) return 'Critical Attack'
  if (key.startsWith('impactos encadenados') || key.startsWith('chained impacts')) return 'Chained Impacts'
  if (key.startsWith('precision')) return 'Precision'
  if (key.startsWith('ignora coberturas') || key.startsWith('ignora cobertura') || key.startsWith('ignore cover')) {
    return 'Ignore Coverage'
  }
  if (key.startsWith('disparo parabolico') || key.startsWith('indirect fire') || key.startsWith('parabolic shot')) {
    return 'Parabolic Shot'
  }
  if (key.startsWith('inestable') || key.startsWith('unstable')) return 'Unstable'
  if (key.startsWith('directo') || key.startsWith('direct')) return 'Direct'
  if (key.startsWith('guerrilla')) return 'Guerrilla'
  if (key.startsWith('municion limitada') || key.startsWith('limited ammo')) {
    const amount = text.match(/\d+/)
    return amount ? `Limited Ammo (${amount[0]})` : 'Limited Ammo'
  }

  return text
}

function normalizeFactionJson(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  for (const unit of data.unidades || []) {
    unit.clase = normalizeClass(unit.clase)

    for (const type of ['disparo', 'cuerpo_a_cuerpo']) {
      for (const weapon of unit.armas?.[type] || []) {
        if (Array.isArray(weapon.habilidades_arma)) {
          weapon.habilidades_arma = weapon.habilidades_arma.map(normalizeAbility).filter(Boolean)
        }

        if (weapon.nombre === 'Reinforced Porrón') {
          weapon.nombre = 'Reinforced Club'
        }
      }
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

function run() {
  const files = fs
    .readdirSync(EN_DIR)
    .filter((file) => file.endsWith('.en.json'))
    .sort()

  files.forEach((file) => normalizeFactionJson(path.join(EN_DIR, file)))
  console.log(`normalize-factions-en completed (${files.length} files)`)
}

run()
