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
    return 'Los impactos de esta arma son críticos con un resultado natural de 5+.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    return 'Los impactos de esta arma empeoran en 1 la Salvación del objetivo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.criticalHit) {
    return 'Los críticos no pueden salvarse.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return 'Todos los dados impactan, sin tirar Precisión. Los 6 siguen siendo críticos.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.relentless) {
    return 'Puede volver a tirar los dados que no hayan impactado.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.preciseShot) {
    return 'Si el objetivo está a la mitad o menos de la Distancia del arma, el ataque gana +1 dado.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.overflow) {
    return 'Si este ataque destruye a la unidad objetivo y sobra daño, el atacante puede aplicar ese sobrante a otra unidad enemiga a 3" o menos de la última miniatura eliminada del objetivo.'
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

