import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from './weaponAbilities.js'

const parseAbilityNumber = (raw) => {
  const text = String(raw || '')
  const plusMatch = text.match(/(\d+)\s*\+/)
  if (plusMatch) return `${plusMatch[1]}+`
  const signedMatch = text.match(/[+-]\s*\d+/)
  if (signedMatch) return signedMatch[0].replace(/\s+/g, '')
  const numMatch = text.match(/\d+/)
  return numMatch ? numMatch[0] : null
}

const ensureSigned = (value) => {
  if (!value) return 'X'
  if (value.startsWith('+') || value.startsWith('-')) return value
  if (value.endsWith('+')) return value
  return `+${value}`
}

export const getAbilityDescription = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const abilityId = getWeaponAbilityId(raw)
  const value = parseAbilityNumber(raw)

  if (abilityId === WEAPON_ABILITY_IDS.reliable) {
    return lang === 'en'
      ? 'This weapon has no special rules.'
      : 'Esta arma no tiene reglas especiales.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.deadAngle) {
    return lang === 'en'
      ? 'This weapon cannot shoot at targets within half its range.'
      : 'Esta arma no puede disparar por debajo de la mitad de su rango.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    return lang === 'en'
      ? `Hits count as critical hits on a natural result of ${value || 'X'}+.`
      : `Los impactos se consideran críticos con un resultado natural de ${value || 'X'}+.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    return lang === 'en'
      ? 'Critical hits worsen the target\'s Save by 1.'
      : 'Los impactos críticos empeoran la Salvación del objetivo en 1.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.unstable) {
    return lang === 'en'
      ? 'After resolving the attack, roll 1D6. On a 1-2, the unit carrying this weapon suffers the same damage it inflicted on the target. If the attack caused no damage, there is no backlash.'
      : 'Tras resolver el ataque, lanza 1D6. Con resultado de 1 o 2, la unidad que porta esta arma sufre el mismo daño que infligió al objetivo. Si el ataque no causó daño, no hay retroceso.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) {
    return lang === 'en'
      ? 'This weapon can be used while the unit is locked in melee combat, against the unit it is fighting in melee combat.'
      : 'Esta arma puede usarse aunque la unidad esté trabada en combate cuerpo a cuerpo, contra la unidad que está en cuerpo a cuerpo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return lang === 'en'
      ? 'This weapon hits directly and has no Precision.'
      : 'Esta arma impacta directamente, no tiene precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return lang === 'en'
      ? 'When a unit suffers hits from this ability, the damage caused also applies to all allied and enemy units within 3" of the target.'
      : 'Cuando una unidad recibe impactos con esta habilidad, el daño causado se aplica también a todas las unidades aliadas y enemigas a 3" del objetivo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) {
    return lang === 'en'
      ? 'Can attack targets without direct line of sight, as long as they are within Range.'
      : 'Puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Distancia.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.reach) {
    return lang === 'en'
      ? 'This melee weapon can be used against any enemy unit within 3", whether or not it is locked with this unit.'
      : 'Esta arma CaC puede usarse contra cualquier unidad enemiga a 3" o menos, esté o no trabada con esta unidad.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.erratic) {
    return lang === 'en'
      ? 'Before resolving the attack, roll 1D6: that result becomes the Precision of the weapon for this attack.'
      : 'Antes de resolver el ataque, lanza 1D6: el resultado es la Precisión del arma durante ese ataque.'
  }

  return ''
}

export const formatAbilityLabel = (label) => {
  const raw = String(label || '').trim()
  if (!raw) return ''
  return raw
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

export const getAbilityLabel = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  if (lang !== 'en') return formatAbilityLabel(raw)

  const abilityId = getWeaponAbilityId(raw)
  const num = raw.match(/[+-]?\s*\d+[+]?/)
  const suffix = num ? ` ${num[0].trim()}` : ''

  if (abilityId === WEAPON_ABILITY_IDS.reliable)      return 'Reliable'
  if (abilityId === WEAPON_ABILITY_IDS.deadAngle)     return 'Dead Angle'
  if (abilityId === WEAPON_ABILITY_IDS.brutal)        return `Brutal${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.piercing)      return 'Piercing'
  if (abilityId === WEAPON_ABILITY_IDS.unstable)      return 'Unstable'
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger)    return 'Multi-use'
  if (abilityId === WEAPON_ABILITY_IDS.direct)        return 'Direct'
  if (abilityId === WEAPON_ABILITY_IDS.explosive)     return 'Explosive'
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) return 'Arcing'
  if (abilityId === WEAPON_ABILITY_IDS.reach)         return 'Reach'
  if (abilityId === WEAPON_ABILITY_IDS.erratic)       return 'Erratic'
  return formatAbilityLabel(raw)
}
