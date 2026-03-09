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

const startsWithAny = (key, prefixes) => prefixes.some((prefix) => key.startsWith(prefix))

export const getAbilityDescription = (ability, lang = 'es') => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const value = parseAbilityNumber(raw)

  if (startsWithAny(key, ['asaltante', 'raider'])) {
    return lang === 'en'
      ? `The target suffers ${ensureSigned(value)} to Save against this attack.`
      : `El objetivo pierde ${ensureSigned(value)} a su Salvación frente a ese ataque.`
  }
  if (key.startsWith('pesada') || key.startsWith('heavy')) {
    return lang === 'en'
      ? 'If it moved: +1 to Hit value. If it did not move: -1 to Hit value.'
      : 'Si se ha movido: +1 al valor de Impactos. Si no se ha movido: -1 al valor de Impactos.'
  }
  if (startsWithAny(key, ['ataque rapido', 'quick attack'])) {
    return lang === 'en'
      ? `At half range or less, gain ${ensureSigned(value)} Attacks.`
      : `A mitad o menos del alcance, suma ${ensureSigned(value)} Ataques.`
  }
  if (key.startsWith('pistolero') || key.startsWith('gunslinger')) {
    return lang === 'en'
      ? 'Can shoot while engaged, only against the unit it is fighting in melee.'
      : 'Puede disparar trabada, solo contra la unidad con la que combate cuerpo a cuerpo.'
  }
  if (key.startsWith('explosiva') || key.startsWith('explosive')) {
    return lang === 'en'
      ? 'Declare an impact point within range. All enemy units with a base within 3” receive the full attack, resolving hits, saves and damage independently. Units engaged in melee are not affected.'
      : 'Declara un punto de impacto dentro del alcance. Todas las unidades enemigas cuya peana esté a 3” o menos reciben el ataque completo, resolviendo impactos, salvaciones y daño de forma independiente. Las unidades trabadas en cuerpo a cuerpo no se ven afectadas.'
  }
  if (startsWithAny(key, ['ataque critico', 'critical attack'])) {
    return lang === 'en'
      ? 'Critical hits cannot be saved.'
      : 'Los impactos críticos no pueden ser salvados.'
  }
  if (startsWithAny(key, ['impactos encadenados', 'chained impacts'])) {
    return lang === 'en'
      ? 'Each critical hit generates one additional attack resolved normally.'
      : 'Cada ataque crítico genera un ataque adicional que se resuelve de forma normal.'
  }
  if (key.startsWith('precision')) {
    return lang === 'en'
      ? 'Reroll all failed attack rolls.'
      : 'Repite todas las tiradas fallidas de ataque.'
  }
  if (key.startsWith('anti')) {
    return lang === 'en'
      ? `Against the listed type, results of ${normalizeAntiValue(value)} count as critical hits.`
      : `Contra el tipo indicado, los resultados de ${normalizeAntiValue(value)} son críticos.`
  }
  if (startsWithAny(key, ['ignora coberturas', 'ignora cobertura', 'ignore coverages', 'ignore coverage'])) {
    return lang === 'en'
      ? 'The target cannot benefit from defensive bonuses from partial cover.'
      : 'El objetivo no puede beneficiarse de ningún bono defensivo por cobertura parcial.'
  }
  if (startsWithAny(key, ['disparo parabolico', 'parabolic shot', 'indirect fire'])) {
    return lang === 'en'
      ? 'Can shoot without line of sight. Mark a target point within range and roll the scatter die. On a bullseye, hits that point; on an arrow, deviates 3" in that direction. All enemy units within 3" of the final impact point receive the full attack.'
      : 'Puede disparar sin línea de visión. Marca un punto objetivo dentro del alcance y tira el dado de dispersión. Si sale Diana, impacta en ese punto; si sale flecha, se desvía 3" en esa dirección. Todas las unidades enemigas cuya peana esté a 3" del punto de impacto reciben el ataque completo.'
  }
  if (key.startsWith('inestable') || key.startsWith('unstable')) {
    return lang === 'en'
      ? 'After attacking, roll 1D6: on 1-2, this unit suffers the same damage dealt to the target. If the target received no hits, this unit also suffers nothing.'
      : 'Tras atacar, tira 1D6: con 1-2, la unidad recibe los mismos puntos de daño que recibió el objetivo. Si el objetivo no recibió ningún impacto, esta tampoco recibe nada.'
  }
  if (key.startsWith('directo') || key.startsWith('straight')) {
    return lang === 'en'
      ? 'Hits automatically, no Hit roll required.'
      : 'Impacta automáticamente, sin tirada de Impactos.'
  }
  if (key.startsWith('guerrilla')) {
    return lang === 'en'
      ? 'Can perform an extra shooting action after using Sprint.'
      : 'Puede hacer una acción extra de disparo después de usar Carrera.'
  }
  if (startsWithAny(key, ['municion limitada', 'limited ammo'])) {
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

  const key = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const num = raw.match(/[+-]?\s*\d+[+]?/)
  const suffix = num ? ` ${num[0].trim()}` : ''

  if (key.startsWith('asaltante') || key.startsWith('raider')) return `Raider${suffix}`
  if (key.startsWith('pesada') || key.startsWith('heavy')) return 'Heavy'
  if (key.startsWith('ataque rapido') || key.startsWith('quick attack')) return `Quick Attack${suffix}`
  if (key.startsWith('pistolero') || key.startsWith('gunslinger')) return 'Gunslinger'
  if (key.startsWith('explosiva') || key.startsWith('explosive')) return 'Explosive'
  if (key.startsWith('ataque critico') || key.startsWith('critical attack')) return 'Critical Attack'
  if (key.startsWith('impactos encadenados') || key.startsWith('chained impacts')) return 'Chained Impacts'
  if (key.startsWith('precision')) return 'Precision'
  if (key.startsWith('anti')) return `Anti${suffix}`
  if (key.startsWith('ignora cobertura') || key.startsWith('ignore cover')) return 'Ignore Cover'
  if (key.startsWith('disparo parabolico') || key.startsWith('parabolic shot') || key.startsWith('indirect fire')) return 'Parabolic Shot'
  if (key.startsWith('inestable') || key.startsWith('unstable')) return 'Unstable'
  if (key.startsWith('directo') || key.startsWith('straight') || key.startsWith('direct')) return 'Direct'
  if (key.startsWith('guerrilla')) return 'Guerrilla'
  if (key.startsWith('municion limitada') || key.startsWith('limited ammo')) return `Limited Ammo${suffix}`
  return formatAbilityLabel(raw)
}
