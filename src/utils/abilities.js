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
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    return 'Los impactos de esta arma se consideran críticos con un resultado natural de 5+ en la tirada de ataque.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    return 'Los impactos de esta arma empeoran en 1 la Salvación realizada contra ellos.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.criticalHit) {
    return 'Los críticos no pueden ser salvados.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return 'Todos los dados de ataque de esta arma impactan, sin necesidad de superar la Precisión.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.relentless) {
    return 'Puede volver a tirar los dados de ataque que no hayan impactado: los que no superen la Precisión en disparo, o los que fallen en CaC.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return 'El ataque se resuelve con normalidad contra la unidad objetivo, incluida su salvación. Además, todas las miniaturas enemigas a 3" o menos de la miniatura impactada sufren el daño base del arma, sin tirar salvación. No hay fuego amigo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.preciseShot) {
    return 'Si el objetivo está a la mitad o menos de la Distancia de esta arma, el ataque gana +1 dado.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.conquest) {
    return 'Aporta a la escuadra: +3 al Valor de la escuadra.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.rally) {
    return 'Aporta a la escuadra: Refuerzos dobles, trae 2 miniaturas por turno.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.assault) {
    return 'Aporta a la escuadra: la carga de la escuadra no tira chequeo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.march) {
    return 'Aporta a la escuadra: +3" de Movimiento a la escuadra.'
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

