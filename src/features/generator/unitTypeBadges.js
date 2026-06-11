import lineBadge from '../../images/units_icons/line.png'
import eliteBadge from '../../images/units_icons/elite.png'
import vehicleBadge from '../../images/units_icons/vehicle.png'
import monsterBadge from '../../images/units_icons/monster.png'
import heroBadge from '../../images/units_icons/hero.png'
import linePastBadge from '../../images/units_icons/past/line.png'
import elitePastBadge from '../../images/units_icons/past/elite.png'
import vehiclePastBadge from '../../images/units_icons/past/vehicle.png'
import heroPastBadge from '../../images/units_icons/past/hero.png'
import { getUnitTypeToken } from './generatorUtils.js'

export const unitTypeBadgeByToken = {
  line: lineBadge,
  elite: eliteBadge,
  vehicle: vehicleBadge,
  monster: monsterBadge,
  hero: heroBadge,
}

export const pastUnitTypeBadgeByToken = {
  line: linePastBadge,
  elite: elitePastBadge,
  vehicle: vehiclePastBadge,
  hero: heroPastBadge,
}

const normalizeEraToken = (era = '') => {
  if (Array.isArray(era)) {
    return era.some((entry) => normalizeEraToken(entry) === 'past') ? 'past' : ''
  }
  if (era && typeof era === 'object') {
    return normalizeEraToken(era.token || era.label || era.nombre || era.name || '')
  }
  const normalized = String(era || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (normalized.includes('pasado') || normalized.includes('past')) return 'past'
  if (normalized.includes('futuro') || normalized.includes('future')) return 'future'
  return ''
}

export const getUnitTypeBadgeSrc = (type, era = '') => {
  const token = getUnitTypeToken(type)
  if (normalizeEraToken(era) === 'past') {
    return pastUnitTypeBadgeByToken[token] || unitTypeBadgeByToken[token] || lineBadge
  }
  return unitTypeBadgeByToken[token] || lineBadge
}
