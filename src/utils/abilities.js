import { getWeaponAbilityId, WEAPON_ABILITY_IDS } from '../features/battle/weaponAbilities.js'

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

export const getAbilityDescription = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const abilityId = getWeaponAbilityId(raw)
  const value = parseAbilityNumber(raw)

  if (abilityId === WEAPON_ABILITY_IDS.assaulter) {
    return lang === 'en'
      ? `The target suffers ${ensureSigned(value)} to Save against this attack.`
      : `El objetivo pierde ${ensureSigned(value)} a su Salvación frente a ese ataque.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.heavy) {
    return lang === 'en'
      ? 'If it moved: +1 to Hit value. If it did not move: -1 to Hit value.'
      : 'Si se ha movido: +1 al valor de Impactos. Si no se ha movido: -1 al valor de Impactos.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.quickAttack) {
    return lang === 'en'
      ? `At half range or less, gain ${ensureSigned(value)} Attacks.`
      : `A mitad o menos del alcance, suma ${ensureSigned(value)} Ataques.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) {
    return lang === 'en'
      ? 'Can shoot while engaged, only against the unit it is fighting in melee.'
      : 'Puede disparar trabada, solo contra la unidad con la que combate cuerpo a cuerpo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.explosive) {
    return lang === 'en'
      ? 'Declare an impact point within range. All enemy units with a base within 3” receive the full attack, resolving hits, saves and damage independently. Units engaged in melee are not affected.'
      : 'Declara un punto de impacto dentro del alcance. Todas las unidades enemigas cuya peana esté a 3” o menos reciben el ataque completo, resolviendo impactos, salvaciones y daño de forma independiente. Las unidades trabadas en cuerpo a cuerpo no se ven afectadas.'
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
  if (abilityId === WEAPON_ABILITY_IDS.precision) {
    return lang === 'en'
      ? 'Reroll all failed attack rolls.'
      : 'Repite todas las tiradas fallidas de ataque.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.anti) {
    return lang === 'en'
      ? `Against the listed type, results of ${normalizeAntiValue(value)} count as critical hits.`
      : `Contra el tipo indicado, los resultados de ${normalizeAntiValue(value)} son críticos.`
  }
  if (abilityId === WEAPON_ABILITY_IDS.ignoreCover) {
    return lang === 'en'
      ? 'The target cannot benefit from defensive bonuses from partial cover.'
      : 'El objetivo no puede beneficiarse de ningún bono defensivo por cobertura parcial.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) {
    return lang === 'en'
      ? 'Can shoot without line of sight. Mark a target point within range and roll the scatter die. On a bullseye, hits that point; on an arrow, deviates 3" in that direction. All enemy units within 3" of the final impact point receive the full attack.'
      : 'Puede disparar sin línea de visión. Marca un punto objetivo dentro del alcance y tira el dado de dispersión. Si sale Diana, impacta en ese punto; si sale flecha, se desvía 3" en esa dirección. Todas las unidades enemigas cuya peana esté a 3" del punto de impacto reciben el ataque completo.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.unstable) {
    return lang === 'en'
      ? 'After attacking, roll 1D6: on 1-2, this unit suffers the same damage dealt to the target. If the target received no hits, this unit also suffers nothing.'
      : 'Tras atacar, tira 1D6: con 1-2, la unidad recibe los mismos puntos de daño que recibió el objetivo. Si el objetivo no recibió ningún impacto, esta tampoco recibe nada.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.direct) {
    return lang === 'en'
      ? 'Hits automatically, no Hit roll required.'
      : 'Impacta automáticamente, sin tirada de Impactos.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.guerrilla) {
    return lang === 'en'
      ? 'Can perform an extra shooting action after using Sprint.'
      : 'Puede hacer una acción extra de disparo después de usar Carrera.'
  }
  if (abilityId === WEAPON_ABILITY_IDS.limitedAmmo) {
    return lang === 'en'
      ? `This weapon has ${normalizeLimitedValue(value)} limited shots.`
      : `Tiene ${normalizeLimitedValue(value)} disparos limitados con esta arma.`
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

  if (abilityId === WEAPON_ABILITY_IDS.assaulter) return `Raider${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.heavy) return 'Heavy'
  if (abilityId === WEAPON_ABILITY_IDS.quickAttack) return `Quick Attack${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.gunslinger) return 'Gunslinger'
  if (abilityId === WEAPON_ABILITY_IDS.explosive) return 'Explosive'
  if (abilityId === WEAPON_ABILITY_IDS.criticalAttack) return 'Critical Attack'
  if (abilityId === WEAPON_ABILITY_IDS.chainedImpacts) return 'Chained Impacts'
  if (abilityId === WEAPON_ABILITY_IDS.precision) return 'Precision'
  if (abilityId === WEAPON_ABILITY_IDS.anti) return `Anti${suffix}`
  if (abilityId === WEAPON_ABILITY_IDS.ignoreCover) return 'Ignore Cover'
  if (abilityId === WEAPON_ABILITY_IDS.parabolicShot) return 'Parabolic Shot'
  if (abilityId === WEAPON_ABILITY_IDS.unstable) return 'Unstable'
  if (abilityId === WEAPON_ABILITY_IDS.direct) return 'Direct'
  if (abilityId === WEAPON_ABILITY_IDS.guerrilla) return 'Guerrilla'
  if (abilityId === WEAPON_ABILITY_IDS.limitedAmmo) return `Limited Ammo${suffix}`
  return formatAbilityLabel(raw)
}
