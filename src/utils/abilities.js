import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from './weaponAbilities.js'

const parseAbilityStateVariants = (raw) => {
  const match = String(raw || '').trim().match(/^(.+?)\s*\(([^()]*)\)$/)
  if (!match) return null

  const normal = match[1].trim()
  const transformed = match[2].trim()
  if (!getWeaponAbilityId(normal) || !getWeaponAbilityId(transformed)) return null

  return { normal, transformed }
}

export const getAbilityDescription = (ability) => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const variants = parseAbilityStateVariants(raw)
  if (variants) {
    const normalDescription = getAbilityDescription(variants.normal)
    const transformedDescription = getAbilityDescription(variants.transformed)
    return `Forma normal: ${normalDescription} Forma Monstruo: ${transformedDescription}`
  }
  const abilityId = getWeaponAbilityId(raw)

  if (abilityId === WEAPON_ABILITY_IDS.reliable) {
    return 'Esta arma no tiene reglas especiales.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.deadAngle) {
    return 'Esta arma no puede disparar por debajo de la mitad de su rango.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    return 'Los impactos de esta arma se consideran críticos con un resultado natural de 5+ en la tirada de ataque.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    return 'Los impactos de esta arma empeoran en 1 la Salvación realizada contra ellos.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.unstable) {
    return 'Tras resolver el ataque, lanza 1D6. Con resultado de 1 o 2, la unidad que porta esta arma sufre el mismo daño que infligió al objetivo. Si el ataque no causó daño, no hay retroceso.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) {
    return 'Esta arma puede disparar aunque la unidad esté trabada en combate cuerpo a cuerpo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return 'Esta arma impacta directamente, no tiene precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return 'El ataque se resuelve con normalidad contra la unidad objetivo, incluida su salvación. El daño final que reciba el objetivo lo sufren también todas las miniaturas enemigas a 3" o menos de la miniatura impactada, sin tirar salvación adicional. No hay fuego amigo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) {
    return 'Puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Distancia y el objetivo no esté en cobertura.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.reach) {
    return 'Esta arma CaC puede usarse contra cualquier unidad enemiga a 3" o menos, esté o no trabada con esta unidad. Atacar así no traba a las unidades.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.master) {
    return 'Los ataques CaC con esta arma solo fallan con un resultado de 1. Si el objetivo hace fallar con 1, 2 o 3 (por cobertura o Berserker), con Maestro solo falla con 1 o 2.'
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

export const getAbilityLabel = (ability) => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const variants = parseAbilityStateVariants(raw)
  if (variants) {
    return `${getAbilityLabel(variants.normal)} (${getAbilityLabel(variants.transformed)})`
  }
  return formatAbilityLabel(raw)
}

