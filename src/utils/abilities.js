import { getWeaponAbilityId, normalizeAbilityText, WEAPON_ABILITY_IDS } from './weaponAbilities.js'

const parseAbilityNumber = (raw) => {
  const text = String(raw || '')
  const plusMatch = text.match(/(\d+)\s*\+/)
  if (plusMatch) return plusMatch[1]
  const signedMatch = text.match(/[+-]\s*\d+/)
  if (signedMatch) return signedMatch[0].replace(/\s+/g, '')
  const numMatch = text.match(/\d+/)
  return numMatch ? numMatch[0] : null
}

const parseAbilityStateVariants = (raw) => {
  const match = String(raw || '').trim().match(/^(.+?)\s*\(([^()]*)\)$/)
  if (!match) return null

  const normal = match[1].trim()
  const transformed = match[2].trim()
  if (!getWeaponAbilityId(normal) || !getWeaponAbilityId(transformed)) return null

  return { normal, transformed }
}

const ANTI_TARGET_LABELS_EN = {
  choque: 'Shock',
  elite: 'Elite',
  especialista: 'Specialist',
  especialistas: 'Specialists',
  comando: 'Commando',
  asaltante: 'Raider',
  monstruo: 'Monster',
  monstruos: 'Monsters',
  vehiculo: 'Vehicle',
  vehiculos: 'Vehicles',
  artilleria: 'Artillery',
  heroe: 'Hero',
  heroes: 'Heroes',
}

const getAntiTargetLabel = (rawAbility, lang = 'es') => {
  const target = String(rawAbility || '')
    .trim()
    .replace(/^anti[\s-]*/i, '')
    .trim()
  if (!target) return ''
  if (lang !== 'en') return target
  const normalized = normalizeAbilityText(target)
  return ANTI_TARGET_LABELS_EN[normalized] || target
}

export const getAbilityDescription = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const variants = parseAbilityStateVariants(raw)
  if (variants) {
    const normalDescription = getAbilityDescription(variants.normal, lang)
    const transformedDescription = getAbilityDescription(variants.transformed, lang)
    return lang === 'en'
      ? `Normal form: ${normalDescription} Monster form: ${transformedDescription}`
      : `Forma normal: ${normalDescription} Forma Monstruo: ${transformedDescription}`
  }
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
      ? 'This weapon can shoot even while the unit is locked in melee combat.'
      : 'Esta arma puede disparar aunque la unidad esté trabada en combate cuerpo a cuerpo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return lang === 'en'
      ? 'This weapon hits directly and has no Precision.'
      : 'Esta arma impacta directamente, no tiene precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return lang === 'en'
      ? 'If the target suffers damage, choose up to X additional allied or enemy miniatures within 3" of the hit miniature; each suffers the same direct damage. In a squad, its owner assigns it following the normal squad rules.'
      : 'Si el objetivo sufre daño, elige hasta X miniaturas adicionales aliadas o enemigas a 3" de la miniatura impactada; cada una sufre el mismo daño directo. En una escuadra, su propietario lo asigna siguiendo las reglas normales de la escuadra.'
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
  if (abilityId === WEAPON_ABILITY_IDS.sweep) {
    return lang === 'en'
      ? 'Melee weapon. When attacking, instead of choosing a single target, this weapon attacks all enemy units locked with it. Resolve the attack separately against each one.'
      : 'Arma de cuerpo a cuerpo. Al atacar, en vez de elegir un objetivo, esta arma ataca a todas las unidades enemigas trabadas con ella. Resuelve el ataque por separado contra cada una.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.anti) {
    const target = getAntiTargetLabel(raw, lang)
    return lang === 'en'
      ? `This weapon inflicts 1D3 extra damage against ${target || 'the specified type'}, as long as it deals at least 1 damage to the target.`
      : `Esta arma inflige 1D3 de daño extra contra ${target || 'el tipo indicado'}, siempre que haga al menos 1 de daño al objetivo.`
  }

  return ''
}

export const formatAbilityLabel = (label) => {
  const raw = String(label || '').trim()
  if (!raw) return ''
  return raw
    .toLowerCase()
    .split(' ')
    .map((word) => word
      .split('-')
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join('-'))
    .join(' ')
}

export const getAbilityLabel = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const variants = parseAbilityStateVariants(raw)
  if (variants) {
    return `${getAbilityLabel(variants.normal, lang)} (${getAbilityLabel(variants.transformed, lang)})`
  }
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
  if (abilityId === WEAPON_ABILITY_IDS.sweep)         return raw.replace(/^barrido/i, 'Sweep')
  if (abilityId === WEAPON_ABILITY_IDS.anti)          return `Anti-${getAntiTargetLabel(raw, 'en') || 'X'}`
  return formatAbilityLabel(raw)
}
