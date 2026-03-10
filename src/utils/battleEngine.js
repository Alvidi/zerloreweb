const MAX_CHAIN_ROLLS = 180

const sanitize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const parseThreshold = (value, fallback = 4) => {
  const raw = String(value || '')
  const plusMatch = raw.match(/(\d+)\s*\+/)
  if (plusMatch) return toInt(plusMatch[1], fallback)
  const numMatch = raw.match(/\d+/)
  if (numMatch) return toInt(numMatch[0], fallback)
  return fallback
}

const parseDamage = (value, fallback = 1) => {
  const raw = String(value || '')
  const numMatch = raw.match(/-?\d+/)
  if (!numMatch) return fallback
  return toInt(numMatch[0], fallback)
}

const parseDiceExpr = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  const md = raw.match(/(\d+)\s*d\s*(\d+)?/)
  if (md) {
    const count = clamp(toInt(md[1], 1), 0, 60)
    const hasExplicitSides = Boolean(md[2])
    const sides = hasExplicitSides ? clamp(toInt(md[2], 6), 2, 100) : 6
    return {
      count,
      sides,
      hasExplicitSides,
      label: hasExplicitSides ? `${count}D${sides}` : `${count}D`,
    }
  }
  const asNum = toInt(raw, 1)
  return { count: clamp(asNum, 0, 60), sides: 6, hasExplicitSides: false, label: String(asNum) }
}

const rollDie = (sides = 6) => Math.floor(Math.random() * sides) + 1

const rollDice = (count, sides = 6) => Array.from({ length: Math.max(0, count) }, () => rollDie(sides))

const rollAttackDiceCount = (expr) => {
  if (!expr?.count) return { total: 0, rolls: [] }
  if (!expr.hasExplicitSides) return { total: expr.count, rolls: [] }
  const rolls = rollDice(expr.count, expr.sides)
  return { total: rolls.reduce((sum, value) => sum + value, 0), rolls }
}

const resolveRollableThreshold = (value, fallback = 4) => {
  const expr = parseDiceExpr(value)
  if (!expr.hasExplicitSides) {
    return { value: parseThreshold(value, fallback), rolls: [], label: '' }
  }
  const rolled = rollAttackDiceCount(expr)
  return { value: rolled.total, rolls: rolled.rolls, label: expr.label }
}

const ABILITY_ALIASES = {
  assaulter: ['asaltante', 'raider'],
  heavy: ['pesada', 'heavy'],
  quickAttack: ['ataque rapido', 'quick attack'],
  gunslinger: ['pistolero', 'gunslinger'],
  explosive: ['explosiva', 'explosive'],
  criticalAttack: ['ataque critico', 'critical attack'],
  chainedImpacts: ['impactos encadenados', 'chained impacts'],
  precision: ['precision'],
  anti: ['anti'],
  ignoreCover: ['ignora coberturas', 'ignora cobertura', 'ignore coverage', 'ignore coverages'],
  parabolicShot: ['disparo parabolico', 'parabolic shot', 'indirect fire'],
  unstable: ['inestable', 'unstable'],
  direct: ['directo', 'straight', 'direct'],
  guerrilla: ['guerrilla'],
  limitedAmmo: ['municion limitada', 'limited ammo'],
}

const abilityPrefixes = (abilityKeyOrPrefix) => ABILITY_ALIASES[abilityKeyOrPrefix] || [abilityKeyOrPrefix]

const matchesAbilityPrefix = (ability, prefixes) => {
  const normalized = sanitize(ability)
  return prefixes.some((prefix) => normalized.startsWith(sanitize(prefix)))
}

const findAbilityByKey = (weapon, abilityKeyOrPrefix) => {
  const prefixes = abilityPrefixes(abilityKeyOrPrefix)
  return (weapon?.abilities || []).find((ability) => matchesAbilityPrefix(ability, prefixes))
}

const hasAbility = (weapon, abilityKeyOrPrefix) => Boolean(findAbilityByKey(weapon, abilityKeyOrPrefix))

const getAbilityValue = (weapon, abilityKeyOrPrefix, fallback = 0) => {
  const ability = findAbilityByKey(weapon, abilityKeyOrPrefix)
  if (!ability) return fallback
  const num = String(ability).match(/[+-]?\s*\d+/)
  if (!num) return fallback
  return toInt(num[0].replace(/\s+/g, ''), fallback)
}

const parseAntiAbility = (weapon) => {
  const anti = findAbilityByKey(weapon, 'anti')
  if (!anti) return null
  const threshold = parseThreshold(anti, 99)
  const lower = sanitize(anti)
  const groupMatch = lower.match(/\(([^)]+)\)/)
  const groups = groupMatch
    ? groupMatch[1]
      .split(/[/,]/)
      .map((token) => sanitize(token))
      .filter(Boolean)
    : []
  return { threshold, groups }
}

const getUnitTypeTokens = (unitType) => {
  const normalizedType = sanitize(unitType)
  const tokens = new Set([normalizedType])

  if (normalizedType.includes('line')) tokens.add('line')
  if (normalizedType.includes('linea')) tokens.add('linea')

  if (normalizedType.includes('elite')) {
    tokens.add('elite')
    tokens.add('elites')
  }

  if (normalizedType.includes('vehiculo') || normalizedType.includes('vehicle')) {
    tokens.add('vehiculo')
    tokens.add('vehiculos')
    tokens.add('vehicle')
    tokens.add('vehicles')
  }

  if (normalizedType.includes('monstruo') || normalizedType.includes('monster')) {
    tokens.add('monstruo')
    tokens.add('monstruos')
    tokens.add('monster')
    tokens.add('monsters')
  }

  if (normalizedType.includes('heroe') || normalizedType.includes('hero')) {
    tokens.add('heroe')
    tokens.add('heroes')
    tokens.add('hero')
  }

  if (normalizedType.includes('titan')) {
    tokens.add('titan')
    tokens.add('titans')
  }

  return Array.from(tokens)
}

const unitTypeMatchesAnti = (unitType, antiData) => {
  if (!antiData) return false
  if (!Array.isArray(antiData.groups) || antiData.groups.length === 0) return true
  if (antiData.groups.some((token) => token === 'todo' || token === 'all')) return true
  const typeTokens = getUnitTypeTokens(unitType)
  return antiData.groups.some((groupToken) =>
    typeTokens.some((typeToken) => groupToken.includes(typeToken) || typeToken.includes(groupToken)),
  )
}

const classifyRoll = (roll, hitThreshold, antiData, defenderType) => {
  if (roll === 6) return 'crit'
  if (unitTypeMatchesAnti(defenderType, antiData) && roll >= antiData.threshold) return 'crit'
  if (roll >= hitThreshold) return 'hit'
  return 'fail'
}

const summarizeHits = (entries) => {
  let hits = 0
  let crits = 0
  entries.forEach((entry) => {
    if (entry.outcome === 'hit') hits += 1
    if (entry.outcome === 'crit') crits += 1
  })
  return { hits, crits }
}

const buildNarrative = ({
  attacker,
  defender,
  weapon,
  mode,
  attackDiceCount,
  hitThreshold,
  hitEntries,
  saveThreshold,
  saveDiceCount,
  saveRolls,
  totals,
  defenderAfter,
  blockedReason,
  rules,
}) => {
  if (blockedReason) {
    return [
      `${attacker.name} intenta atacar con ${weapon.name}.`,
      blockedReason,
    ]
  }

  const actionLabel = mode === 'melee' ? 'carga al combate' : 'abre fuego'
  const lines = [`${attacker.name} ${actionLabel} con ${weapon.name} sobre ${defender.name}.`]

  lines.push(`Ataques: ${attackDiceCount} dados.`)

  if (hitEntries.length) {
    const rolls = hitEntries.map((entry) => {
      if (!entry.rerolled) return String(entry.roll)
      return `${entry.initialRoll}→${entry.roll}`
    })
    lines.push(`Impactos (${hitThreshold}+): [${rolls.join(', ')}].`)
  } else if (hasAbility(weapon, 'direct')) {
    lines.push('Impactos automáticos por habilidad Directo.')
  }

  lines.push(`Resultado ofensivo: ${totals.hits} impactos y ${totals.crits} críticos.`)
  lines.push(`Salvación (${saveThreshold}+): ${saveDiceCount} dados [${saveRolls.join(', ')}].`)
  lines.push(`Bloqueos: ${totals.blockedHits} normales y ${totals.blockedCrits} críticos.`)
  lines.push(`Daño total: ${totals.damage}. ${defender.name} queda con ${defenderAfter.hp}/${defender.maxHp} vidas.`)

  if (defenderAfter.destroyed) {
    lines.push(`${defender.name} queda fuera de combate.`)
  }

  if (rules.length) {
    lines.push(`Reglas aplicadas: ${rules.join(', ')}.`)
  }

  return lines
}

export function resolveAttack({
  attacker,
  defender,
  weapon,
  mode = 'ranged',
  conditions = {},
}) {
  const coverType = conditions.coverType || 'none'
  const hasLineOfSight = conditions.hasLineOfSight !== false
  const attackerEngaged = Boolean(conditions.attackerEngaged)
  const rulesApplied = []
  const hasParabolic = mode === 'ranged' && hasAbility(weapon, 'parabolicShot')
  const hasGunslinger = mode === 'ranged' && hasAbility(weapon, 'gunslinger')

  if (mode === 'ranged' && attackerEngaged && !hasGunslinger) {
    return {
      blocked: true,
      blockedReason: 'No puede disparar estando trabada (requiere Pistolero).',
      narrative: buildNarrative({
        attacker,
        defender,
        weapon,
        mode,
        blockedReason: 'La unidad está trabada y no dispone de Pistolero.',
        rules: [],
      }),
      canCounter: false,
    }
  }

  if (mode === 'ranged' && attackerEngaged && hasGunslinger) {
    rulesApplied.push('Pistolero (puede disparar estando trabada)')
  }

  if (mode === 'ranged' && !hasLineOfSight && !hasParabolic) {
    return {
      blocked: true,
      blockedReason: 'No hay línea de visión para el disparo.',
      narrative: buildNarrative({
        attacker,
        defender,
        weapon,
        mode,
        blockedReason: 'El disparo se cancela por falta de línea de visión.',
        rules: [],
      }),
      canCounter: false,
    }
  }

  if (mode === 'ranged' && !hasLineOfSight && hasParabolic) {
    rulesApplied.push('Disparo parabólico (ignora línea de visión)')
  }

  if (coverType === 'total' && mode === 'ranged') {
    return {
      blocked: true,
      blockedReason: 'Cobertura total: no hay línea de tiro válida para este ataque.',
      narrative: buildNarrative({
        attacker,
        defender,
        weapon,
        mode,
        blockedReason: 'El disparo se cancela por cobertura total.',
        rules: [],
      }),
      canCounter: false,
    }
  }

  const attackExpr = parseDiceExpr(weapon.attacks)
  const baseAttackRoll = rollAttackDiceCount(attackExpr)
  const hitThresholdRoll = mode === 'melee' ? { value: 3, rolls: [], label: '' } : resolveRollableThreshold(weapon.hit, 4)
  const baseHitThreshold = hitThresholdRoll.value
  let hitThreshold = baseHitThreshold + toInt(conditions.hitModifier, 0)
  let baseAttackDiceCount = baseAttackRoll.total
  let bonusAttackDice = 0
  let saveThreshold = parseThreshold(defender.save, 4) + toInt(conditions.saveModifier, 0)
  let bonusSaveDice = 0

  if (baseAttackRoll.rolls.length) {
    rulesApplied.push(`Ataques variables (${attackExpr.label}: ${baseAttackRoll.rolls.join('+')} = ${baseAttackDiceCount})`)
  }
  if (hitThresholdRoll.rolls.length) {
    rulesApplied.push(`Impactos variables (${hitThresholdRoll.label}: ${hitThresholdRoll.rolls.join('+')} = ${baseHitThreshold})`)
  }

  if (mode === 'ranged' && coverType === 'partial') {
    saveThreshold -= 1
    rulesApplied.push('Cobertura parcial (-1 al valor de salvación)')
  }
  if (mode === 'ranged' && coverType === 'height') {
    saveThreshold -= 1
    hitThreshold += 1
    rulesApplied.push('Cobertura de altura (-1 al valor de salvación, +1 impacto requerido)')
  }

  if (mode === 'ranged' && hasAbility(weapon, 'quickAttack') && conditions.halfRange) {
    const rapidBonus = getAbilityValue(weapon, 'quickAttack', 1)
    bonusAttackDice += rapidBonus
    rulesApplied.push(`Ataque rápido (+${rapidBonus} dados)`)
  }

  if (mode === 'ranged' && hasAbility(weapon, 'heavy')) {
    if (conditions.attackerMoved) {
      hitThreshold += 1
      rulesApplied.push('Pesada (movió: +1 al valor de impactos)')
    } else {
      hitThreshold -= 1
      rulesApplied.push('Pesada (no movió: -1 al valor de impactos)')
    }
  }

  if (mode === 'ranged' && hasAbility(weapon, 'assaulter')) {
    const savePenalty = Math.max(1, getAbilityValue(weapon, 'assaulter', 1))
    saveThreshold += savePenalty
    rulesApplied.push(`Asaltante (+${savePenalty} a salvación enemiga)`)
  }

  const ignoreCover = hasAbility(weapon, 'ignoreCover') && mode === 'ranged'
  if (ignoreCover && coverType === 'partial') {
    saveThreshold += 1
    rulesApplied.push('Ignora coberturas (anula cobertura parcial)')
  }

  hitThreshold = clamp(hitThreshold, 2, 7)
  saveThreshold = clamp(saveThreshold, 2, 7)
  const antiData = parseAntiAbility(weapon)
  if (antiData) rulesApplied.push(`Anti ${antiData.threshold}+`)

  const hasDirect = hasAbility(weapon, 'direct') && mode === 'ranged'
  const hasPrecision = hasAbility(weapon, 'precision')
  const hasChains = hasAbility(weapon, 'chainedImpacts')
  const critUnsavable = hasAbility(weapon, 'criticalAttack')
  const hasExplosive = hasAbility(weapon, 'explosive') && mode === 'ranged'
  const hasGuerrilla = hasAbility(weapon, 'guerrilla') && mode === 'ranged'

  if (hasGuerrilla && conditions.afterDash) {
    // Guerrilla grants an extra shooting action after dash; in 1v1 simulator we model it as one extra volley.
    const guerrillaRoll = rollAttackDiceCount(attackExpr)
    bonusAttackDice += guerrillaRoll.total
    if (guerrillaRoll.rolls.length) {
      rulesApplied.push(
        `Guerrilla (tras carrera: ${attackExpr.label} ${guerrillaRoll.rolls.join('+')} = +${guerrillaRoll.total} dados)`,
      )
    } else {
      rulesApplied.push(`Guerrilla (tras carrera: +${guerrillaRoll.total} dados)`)
    }
  }
  const attackDiceCount = clamp(baseAttackDiceCount + bonusAttackDice, 0, 80)

  const hitEntries = []
  let chainGuard = 0

  const resolveOneHitDie = (source = 'base') => {
    if (chainGuard > MAX_CHAIN_ROLLS) return
    chainGuard += 1
    const initialRoll = rollDie(6)
    let roll = initialRoll
    let outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
    const initialOutcome = outcome
    let rerolled = false

    if (hasPrecision && outcome === 'fail') {
      roll = rollDie(6)
      outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
      rerolled = true
    }

    hitEntries.push({
      source,
      initialRoll,
      initialOutcome,
      // Visual outcome for the original die shown in the attacker line.
      displayOutcome: initialOutcome,
      roll,
      outcome,
      rerolled,
    })

    if (hasChains && outcome === 'crit') {
      resolveOneHitDie('chain')
    }
  }

  if (hasDirect) {
    for (let i = 0; i < attackDiceCount; i += 1) {
      hitEntries.push({
        source: 'direct',
        initialRoll: null,
        roll: null,
        outcome: 'hit',
        rerolled: false,
      })
    }
    rulesApplied.push('Directo (impactos automáticos)')
  } else {
    for (let i = 0; i < attackDiceCount; i += 1) resolveOneHitDie()
  }

  if (hasExplosive) {
    rulesApplied.push('Explosiva (sin objetivos adicionales en simulador 1v1)')
  }

  const rollSummary = summarizeHits(hitEntries)
  const incomingHits = rollSummary.hits + rollSummary.crits
  const saveDiceCount = Math.max(0, incomingHits + bonusSaveDice)
  const saveRolls = rollDice(saveDiceCount, 6)

  const defensiveSixes = saveRolls.filter((roll) => roll === 6).length
  const regularPasses = saveRolls.filter((roll) => roll >= saveThreshold && roll !== 6).length

  const blockedCrits = critUnsavable ? 0 : Math.min(rollSummary.crits, defensiveSixes)
  const sixesLeftForNormal = critUnsavable ? defensiveSixes : defensiveSixes - blockedCrits
  const blockedHits = Math.min(rollSummary.hits, regularPasses + sixesLeftForNormal)

  const unblockedHits = Math.max(0, rollSummary.hits - blockedHits)
  const unblockedCrits = Math.max(0, rollSummary.crits - blockedCrits)

  const normalDamage = parseDamage(weapon.damage, 1)
  const critDamage = parseDamage(weapon.critDamage, normalDamage)
  const totalDamage = unblockedHits * normalDamage + unblockedCrits * critDamage

  let selfDamage = 0
  if (mode === 'ranged' && hasAbility(weapon, 'unstable') && totalDamage > 0) {
    const unstableRoll = rollDie(6)
    rulesApplied.push(`Inestable (tirada ${unstableRoll})`)
    if (unstableRoll <= 2) {
      selfDamage = totalDamage
    }
  }

  const defenderAfterHp = Math.max(0, defender.hp - totalDamage)
  const attackerAfterHp = Math.max(0, attacker.hp - selfDamage)
  const defenderAfter = { hp: defenderAfterHp, maxHp: defender.maxHp, destroyed: defenderAfterHp <= 0 }
  const attackerAfter = { hp: attackerAfterHp, maxHp: attacker.maxHp, destroyed: attackerAfterHp <= 0 }

  const totals = {
    attackDiceCount,
    hits: rollSummary.hits,
    crits: rollSummary.crits,
    blockedHits,
    blockedCrits,
    damage: totalDamage,
    selfDamage,
  }

  const canCounter = Boolean(
    mode === 'ranged'
      && !defenderAfter.destroyed
      && !attackerAfter.destroyed
      && conditions.defenderPrepared,
  )

  return {
    blocked: false,
    attackerAfter,
    defenderAfter,
    totals,
    coverType,
    mode,
    hitThreshold,
    saveThreshold,
    saveDiceCount,
    saveRolls,
    hitEntries,
    rulesApplied,
    hasDirect,
    canCounter,
    narrative: buildNarrative({
      attacker,
      defender,
      weapon,
      mode,
      attackDiceCount,
      hitThreshold,
      hitEntries,
      saveThreshold,
      saveDiceCount,
      saveRolls,
      totals,
      defenderAfter,
      rules: rulesApplied,
    }),
  }
}
