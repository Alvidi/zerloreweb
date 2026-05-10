import lineBadge from '../../images/units_icons/line.png'
import eliteBadge from '../../images/units_icons/elite.png'
import vehicleBadge from '../../images/units_icons/vehicle.png'
import monsterBadge from '../../images/units_icons/monster.png'
import heroBadge from '../../images/units_icons/hero.png'
import titanBadge from '../../images/units_icons/titan.png'
import { getUnitTypeToken } from './generatorUtils.js'

export const unitTypeBadgeByToken = {
  line: lineBadge,
  elite: eliteBadge,
  vehicle: vehicleBadge,
  monster: monsterBadge,
  hero: heroBadge,
  titan: titanBadge,
}

export const getUnitTypeBadgeSrc = (type) => {
  const token = getUnitTypeToken(type)
  return unitTypeBadgeByToken[token] || lineBadge
}
