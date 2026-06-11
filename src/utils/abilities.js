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

const normalizeAntiValue = (value) => {
  if (!value) return 'X+'
  if (value.endsWith('+')) return value
  if (value.startsWith('+')) return `${value.slice(1)}+`
  if (value.startsWith('-')) return `${value}+`
  return `${value}+`
}

const normalizeLimitedValue = (value) => {
  if (!value) return 'X'
  if (value.endsWith('+')) return value.slice(0, -1)
  if (value.startsWith('+')) return value.slice(1)
  return value
}

const parseAbilityTarget = (raw) => {
  const match = String(raw || '').match(/\(([^)]+)\)/)
  return match ? match[1].trim() : ''
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
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    const target = parseAbilityTarget(raw)
    return lang === 'en'
      ? `Hits count as critical hits on a natural result of ${normalizeAntiValue(value)}${target ? ` against ${target}` : ''}.`
      : `Los impactos se consideran críticos con un resultado natural de ${normalizeAntiValue(value)}${target ? ` contra ${target}` : ''}.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    const target = parseAbilityTarget(raw)
    return lang === 'en'
      ? `Critical hits worsen the target's Save by 1${target ? ` against ${target}` : ''}.`
      : `Los impactos críticos empeoran la Salvación del objetivo en 1${target ? ` contra ${target}` : ''}.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.assaulter) {
    return lang === 'en'
      ? `The target suffers ${ensureSigned(value)} to Save against this attack.`
      : `El objetivo pierde ${ensureSigned(value)} a su Salvación frente a ese ataque.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.heavy) {
    return lang === 'en'
      ? 'If it moved: +1 to Precision value. If it did not move: -1 to Precision value.'
      : 'Si se ha movido: +1 al valor de Precisión. Si no se ha movido: -1 al valor de Precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.quickAttack) {
    return lang === 'en'
      ? `At half range or less, gain ${ensureSigned(value)} Attacks.`
      : `A mitad o menos del alcance, suma ${ensureSigned(value)} Ataques.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) {
    return lang === 'en'
      ? 'This weapon can be used while the unit is locked in melee combat, against the unit it is fighting in melee combat.'
      : 'Esta arma puede usarse aunque la unidad esté trabada en combate cuerpo a cuerpo, contra la unidad que está en cuerpo a cuerpo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return lang === 'en'
      ? 'When a unit suffers hits from this ability, the damage caused also applies to all allied and enemy units within 3" of the target.'
      : 'Cuando una unidad recibe impactos con esta habilidad, el daño causado se aplica también a todas las unidades aliadas y enemigas a 3" del objetivo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.criticalAttack) {
    return lang === 'en'
      ? 'Critical hits cannot be saved.'
      : 'Los impactos críticos no pueden ser salvados.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.chainedImpacts) {
    return lang === 'en'
      ? 'Each critical hit generates one additional attack resolved normally.'
      : 'Cada ataque crítico genera un ataque adicional que se resuelve de forma normal.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.anti) {
    const target = parseAbilityTarget(raw)
    return lang === 'en'
      ? `Against ${target || 'the listed type'}, results of ${normalizeAntiValue(value)} count as critical hits.`
      : `Contra ${target || 'el tipo indicado'}, los resultados de ${normalizeAntiValue(value)} son críticos.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.ignoreCover) {
    return lang === 'en'
      ? 'The target cannot benefit from defensive bonuses from partial cover.'
      : 'El objetivo no puede beneficiarse de ningún bono defensivo por cobertura parcial.'
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
  if (abilityId === WEAPON_ABILITY_IDS.unstable) {
    return lang === 'en'
      ? 'After resolving the attack, roll 1D6. On a 1-2, the unit carrying this weapon suffers the same damage it inflicted on the target. If the attack caused no damage, there is no backlash.'
      : 'Tras resolver el ataque, lanza 1D6. Con resultado de 1 o 2, la unidad que porta esta arma sufre el mismo daño que infligió al objetivo. Si el ataque no causó daño, no hay retroceso.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return lang === 'en'
      ? 'This weapon hits directly and has no Precision.'
      : 'Esta arma impacta directamente, no tiene precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.guerrilla) {
    return lang === 'en'
      ? 'Can perform an extra shooting action after using Rush.'
      : 'Puede hacer una acción extra de disparo después de usar Acometida.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.specializedAttack) {
    const target = parseAbilityTarget(raw)
    return lang === 'en'
      ? `This weapon can only attack ${target || 'the indicated unit type'}.`
      : `Esta arma solo puede atacar a ${target || 'el tipo de unidad indicado'}.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.limitedAmmo) {
    return lang === 'en'
      ? `Only ${normalizeLimitedValue(value)} of this weapon may be equipped.`
      : `Solo se puede equipar ${normalizeLimitedValue(value)} de esta arma.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.overexertion) {
    return lang === 'en'
      ? 'Spend 1 Command Token at the start of the attack to use this weapon. If you cannot pay it, it cannot be used during this activation.'
      : 'Gasta 1 Ficha de Mando al inicio del ataque para usar esta arma. Si no puedes pagarla, no puede utilizarse en esta activación.'
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

  if (abilityId === WEAPON_ABILITY_IDS.reliable) return 'Reliable'
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    const target = parseAbilityTarget(raw)
    return target ? `Brutal${suffix} (${target})` : `Brutal${suffix}`
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    const target = parseAbilityTarget(raw)
    return target ? `Piercing (${target})` : 'Piercing'
  }
  if (abilityId === WEAPON_ABILITY_IDS.assaulter) return `Raider${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.heavy) return 'Heavy'
  if (abilityId === WEAPON_ABILITY_IDS.quickAttack) return `Quick Attack${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) return 'Multi-use'
  if (abilityId === WEAPON_ABILITY_IDS.explosive) return 'Explosive'
  if (abilityId === WEAPON_ABILITY_IDS.criticalAttack) return 'Critical Attack'
  if (abilityId === WEAPON_ABILITY_IDS.chainedImpacts) return 'Chained Impacts'
  if (abilityId === WEAPON_ABILITY_IDS.precision) return 'Precision'
  if (abilityId === WEAPON_ABILITY_IDS.anti) {
    const target = parseAbilityTarget(raw)
    return target ? `Anti${suffix} (${target})` : `Anti${suffix}`
  }
  if (abilityId === WEAPON_ABILITY_IDS.ignoreCover) return 'Ignore Cover'
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) return 'Arcing'
  if (abilityId === WEAPON_ABILITY_IDS.reach) return 'Reach'
  if (abilityId === WEAPON_ABILITY_IDS.unstable) return 'Unstable'
  if (abilityId === WEAPON_ABILITY_IDS.direct) return 'Direct'
  if (abilityId === WEAPON_ABILITY_IDS.guerrilla) return 'Guerrilla'
  if (abilityId === WEAPON_ABILITY_IDS.specializedAttack) {
    const target = parseAbilityTarget(raw)
    return target ? `Specialized Attack (${target})` : 'Specialized Attack'
  }
  if (abilityId === WEAPON_ABILITY_IDS.limitedAmmo) return `Weapon Limited${suffix}`
  return formatAbilityLabel(raw)
}
