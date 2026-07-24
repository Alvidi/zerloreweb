import { getUnitTypeToken } from './generatorUtils.js'

const badgeModules = import.meta.glob('../../images/units_icons/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

const badgeByEraAndType = Object.entries(badgeModules).reduce((badges, [path, src]) => {
  const match = path.match(/units_icons\/([^/]+)\/([^/]+)\.png$/)
  if (!match) return badges
  const [, era, type] = match
  const normalizedType = type === 'heroe' ? 'hero' : type
  if (!badges[era]) badges[era] = {}
  badges[era][normalizedType] = src
  return badges
}, {})

const normalizeEraToken = (era = '') => {
  if (Array.isArray(era)) {
    return era.map(normalizeEraToken).find(Boolean) || ''
  }
  if (era && typeof era === 'object') {
    return normalizeEraToken(era.token || era.label || era.nombre || era.name || '')
  }

  const normalized = String(era || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('primal')) return 'primal'
  if (normalized.includes('kingdom') || normalized.includes('pasado') || normalized.includes('past')) return 'kingdom'
  if (normalized.includes('ascension')) return 'ascension'
  if (normalized.includes('dominion') || normalized.includes('futuro') || normalized.includes('future')) return 'dominion'
  return ''
}

export const getUnitTypeBadgeSrc = (type, era = '') => {
  const typeToken = getUnitTypeToken(type)
  const eraToken = normalizeEraToken(era)
  const preferredEraBadges = badgeByEraAndType[eraToken] || {}
  const fallbackEraBadges = badgeByEraAndType.dominion || badgeByEraAndType.kingdom || {}

  return preferredEraBadges[typeToken]
    || fallbackEraBadges[typeToken]
    || preferredEraBadges.line
    || fallbackEraBadges.line
    || ''
}
