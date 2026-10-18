import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from './weaponAbilities.js'

// Mismos textos que la tabla de Habilidades de armas del reglamento.
const DESCRIPTIONS = {
  [WEAPON_ABILITY_IDS.reliable]: 'Esta arma no tiene reglas especiales.',
  [WEAPON_ABILITY_IDS.piercing]: 'Empeora en 1 la Defensa del objetivo.',
  [WEAPON_ABILITY_IDS.criticalHit]: 'Los impactos con un 6 no se pueden bloquear con la Defensa.',
  [WEAPON_ABILITY_IDS.burst]: 'Cada impacto con un 6 añade 1 dado de ataque más, que se tira en ese momento. Si vuelve a salir un 6, se sigue añadiendo.',
  [WEAPON_ABILITY_IDS.sure]: 'Ignora la cobertura: el objetivo no mejora su Defensa por estar cubierto.',
  [WEAPON_ABILITY_IDS.direct]: 'Todos los dados impactan, sin tirar Precisión.',
  [WEAPON_ABILITY_IDS.relentless]: 'Puede volver a tirar una vez los dados que no hayan impactado.',
  [WEAPON_ABILITY_IDS.preciseShot]: 'Si el objetivo está a la mitad o menos del Alcance del arma, el ataque gana 1 dado de ataque más.',
  [WEAPON_ABILITY_IDS.heavy]: 'Si la unidad no se ha movido en esta activación, el ataque gana 1 dado de ataque más.',
}

export const getAbilityDescription = (ability) => {
  const id = getWeaponAbilityId(ability)
  return DESCRIPTIONS[id] || ''
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

export const getAbilityLabel = (ability) => formatAbilityLabel(ability)
