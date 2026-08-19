import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from './weaponAbilities.js'

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

const getAntiTargetLabel = (rawAbility) => {
  const target = String(rawAbility || '')
    .trim()
    .replace(/^anti[\s-]*/i, '')
    .trim()
  return target
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
  const value = parseAbilityNumber(raw)

  if (abilityId === WEAPON_ABILITY_IDS.reliable) {
    return 'Esta arma no tiene reglas especiales.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.deadAngle) {
    return 'Esta arma no puede disparar por debajo de la mitad de su rango.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.brutal) {
    return `Los impactos se consideran críticos con un resultado natural de ${value || 'X'}+.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.piercing) {
    return 'Los impactos críticos empeoran la Salvación del objetivo en 1.'
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
    return 'Si el objetivo sufre daño, elige hasta X miniaturas adicionales aliadas o enemigas a 3" de la miniatura impactada; cada una sufre el mismo daño directo. En una escuadra, su propietario lo asigna siguiendo las reglas normales de la escuadra.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) {
    return 'Puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Distancia.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.reach) {
    return 'Esta arma CaC puede usarse contra cualquier unidad enemiga a 3" o menos, esté o no trabada con esta unidad.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.erratic) {
    return 'Antes de resolver el ataque, lanza 1D6: el resultado es la Precisión del arma durante ese ataque.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.sweep) {
    return 'Arma de cuerpo a cuerpo. Al atacar, en vez de elegir un objetivo, esta arma ataca a todas las unidades enemigas trabadas con ella. Resuelve el ataque por separado contra cada una.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.anti) {
    const target = getAntiTargetLabel(raw)
    return `Esta arma inflige 1D3 de daño extra contra ${target || 'el tipo indicado'}, siempre que haga al menos 1 de daño al objetivo.`
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

