import {
  findWeaponAbilityRaw,
  getWeaponAbilityNumericValue,
  hasWeaponAbilityId,
  WEAPON_ABILITY_IDS,
} from '../features/battle/weaponAbilities.js'

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
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  const md = raw.match(/^(\d*)d(\d+)?([+-]\d+)?$/)
  if (md) {
    const count = clamp(toInt(md[1] || '1', 1), 0, 60)
    const hasExplicitSides = Boolean(md[2])
    const sides = hasExplicitSides ? clamp(toInt(md[2], 6), 2, 100) : 6
    const modifier = toInt(md[3], 0)
    const labelBase = hasExplicitSides ? `${count}D${sides}` : `${count}D`
    return {
      count,
      sides,
      hasExplicitSides,
      modifier,
      label: modifier ? `${labelBase}${modifier > 0 ? `+${modifier}` : modifier}` : labelBase,
    }
  }
  const asNum = toInt(raw, 1)
  return { count: clamp(asNum, 0, 60), sides: 6, hasExplicitSides: false, label: String(asNum), modifier: 0 }
}

const rollDie = (sides = 6) => Math.floor(Math.random() * sides) + 1
const SCATTER_DIRECTIONS = ['N', 'NE', 'SE', 'S', 'SW', 'NW']

const rollDice = (count, sides = 6) => Array.from({ length: Math.max(0, count) }, () => rollDie(sides))

const rollAttackDiceCount = (expr) => {
  if (!expr?.count) {
    const total = Math.max(0, toInt(expr?.modifier, 0))
    return { total, rolls: [] }
  }
  if (!expr.hasExplicitSides) {
    const total = Math.max(0, expr.count + toInt(expr.modifier, 0))
    return { total, rolls: [] }
  }
  const rolls = rollDice(expr.count, expr.sides)
  const total = Math.max(0, rolls.reduce((sum, value) => sum + value, 0) + toInt(expr.modifier, 0))
  return { total, rolls }
}

const resolveRollableThreshold = (value, fallback = 4) => {
  const expr = parseDiceExpr(value)
  if (!expr.hasExplicitSides) {
    return { value: parseThreshold(value, fallback), rolls: [], label: '' }
  }
  const rolled = rollAttackDiceCount(expr)
  return { value: rolled.total, rolls: rolled.rolls, label: expr.label }
}

const hasAbility = (weapon, abilityId) => hasWeaponAbilityId(weapon, abilityId)
const getAbilityValue = (weapon, abilityId, fallback = 0) => getWeaponAbilityNumericValue(weapon, abilityId, fallback)

const parseAntiAbility = (weapon) => {
  const anti = findWeaponAbilityRaw(weapon, WEAPON_ABILITY_IDS.anti)
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
  } else if (hasAbility(weapon, WEAPON_ABILITY_IDS.direct)) {
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
  const attackerRerollFailedHits = Boolean(conditions.attackerRerollFailedHits)
  const attackerVoidEyesBeyond = Boolean(conditions.attackerVoidEyesBeyond)
  const attackerVoracity = Boolean(conditions.attackerVoracity)
  const attackerWildUncontrolledFury = Boolean(conditions.attackerWildUncontrolledFury)
  const defenderMartialResistance = Boolean(conditions.defenderMartialResistance)
  const defenderCrucibleGlory = Boolean(conditions.defenderCrucibleGlory)
  const attackerCrucibleSacredVow = Boolean(conditions.attackerCrucibleSacredVow)
  const defenderRebelFeint = Boolean(conditions.defenderRebelFeint)
  const attackerTechnocratsCombatProtocols = Boolean(conditions.attackerTechnocratsCombatProtocols)
  const attackerFederationEntrenchment = Boolean(conditions.attackerFederationEntrenchment)
  const attackerFederationFuryOfTheFallen = Boolean(conditions.attackerFederationFuryOfTheFallen)
  const rulesApplied = []
  const hasParabolic = mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.parabolicShot)
  const hasGunslinger = mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.gunslinger)
  let parabolicScatter = null

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
    rulesApplied.push('Disparo parabólico')
  }

  if (mode === 'ranged' && hasParabolic) {
    const scatterRoll = rollDie(6)
    const bullseye = scatterRoll === 1
    const direction = bullseye ? null : SCATTER_DIRECTIONS[(scatterRoll - 2) % SCATTER_DIRECTIONS.length]
    parabolicScatter = {
      roll: scatterRoll,
      bullseye,
      direction,
      deviationInches: bullseye ? 0 : 3,
    }
    rulesApplied.push(
      bullseye
        ? 'Disparo parabólico (dispersión: diana)'
        : `Disparo parabólico (dispersión: flecha ${direction}, desvío 3")`,
    )
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
  const attackCountRolls = []
  let saveThreshold = parseThreshold(defender.save, 4) + toInt(conditions.saveModifier, 0)
  let bonusSaveDice = 0

  if (baseAttackRoll.rolls.length) {
    attackCountRolls.push({
      source: 'base',
      label: attackExpr.label,
      rolls: [...baseAttackRoll.rolls],
      total: baseAttackDiceCount,
    })
    rulesApplied.push(`Ataques variables (${attackExpr.label}: ${baseAttackRoll.rolls.join('+')} = ${baseAttackDiceCount})`)
  }
  if (hitThresholdRoll.rolls.length) {
    rulesApplied.push(`Impactos variables (${hitThresholdRoll.label}: ${hitThresholdRoll.rolls.join('+')} = ${baseHitThreshold})`)
  }
  if (attackerRerollFailedHits) {
    rulesApplied.push('Objetivo en la mira (repite impactos fallidos)')
  }
  const attackerVoidEyesBeyondActive = mode === 'ranged' && attackerVoidEyesBeyond && coverType === 'partial'
  if (attackerVoidEyesBeyondActive) {
    rulesApplied.push('Ojos del más allá (repite impactos fallidos contra cobertura parcial)')
  }
  if (mode === 'ranged' && defenderMartialResistance) {
    hitThreshold += 1
    rulesApplied.push('Resistencia marcial (+1 al valor de impactos enemigo en disparo)')
  }
  if (mode === 'ranged' && defenderCrucibleGlory) {
    rulesApplied.push('Gloria del Crisol (ignora 1 daño del primer disparo recibido)')
  }
  if (mode === 'melee' && attackerCrucibleSacredVow) {
    rulesApplied.push('Voto sagrado (repite 1 dado fallido en CaC)')
  }
  if (mode === 'melee' && attackerWildUncontrolledFury) {
    bonusAttackDice += 1
    rulesApplied.push('Furia incontrolada (+1 dado de ataque en CaC al cargar)')
  }
  if (mode === 'ranged' && defenderRebelFeint) {
    rulesApplied.push('Finta (respuesta gratuita al recibir ataque a distancia)')
  }
  if (mode === 'ranged' && attackerTechnocratsCombatProtocols) {
    hitThreshold -= 1
    rulesApplied.push('Protocolos de combate (+1 al resultado de impactos)')
  }
  if (mode === 'ranged' && attackerFederationEntrenchment && !conditions.attackerMoved) {
    bonusAttackDice += 1
    rulesApplied.push('Atrincheramiento (+1 dado de ataque en disparo si no movió)')
  }
  if (attackerFederationFuryOfTheFallen) {
    bonusAttackDice += 1
    rulesApplied.push('Furia de los Caídos (+1 dado de ataque)')
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

  if (mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.quickAttack) && conditions.halfRange) {
    const rapidBonus = getAbilityValue(weapon, WEAPON_ABILITY_IDS.quickAttack, 1)
    bonusAttackDice += rapidBonus
    rulesApplied.push(`Ataque rápido (+${rapidBonus} dados)`)
  }

  if (mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.heavy)) {
    if (conditions.attackerMoved) {
      hitThreshold += 1
      rulesApplied.push('Pesada (movió: +1 al valor de impactos)')
    } else {
      hitThreshold -= 1
      rulesApplied.push('Pesada (no movió: -1 al valor de impactos)')
    }
  }

  if (mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.assaulter)) {
    const savePenalty = Math.max(1, getAbilityValue(weapon, WEAPON_ABILITY_IDS.assaulter, 1))
    saveThreshold += savePenalty
    rulesApplied.push(`Asaltante (+${savePenalty} a salvación enemiga)`)
  }

  const ignoreCover = hasAbility(weapon, WEAPON_ABILITY_IDS.ignoreCover) && mode === 'ranged'
  if (ignoreCover && coverType === 'partial') {
    saveThreshold += 1
    rulesApplied.push('Ignora coberturas (anula cobertura parcial)')
  }

  hitThreshold = clamp(hitThreshold, 2, 7)
  saveThreshold = clamp(saveThreshold, 2, 7)
  const antiData = parseAntiAbility(weapon)
  if (antiData) rulesApplied.push(`Anti ${antiData.threshold}+`)

  const hasDirect = hasAbility(weapon, WEAPON_ABILITY_IDS.direct) && mode === 'ranged'
  const hasPrecision = hasAbility(weapon, WEAPON_ABILITY_IDS.precision)
  const hasChains = hasAbility(weapon, WEAPON_ABILITY_IDS.chainedImpacts)
  const critUnsavable = hasAbility(weapon, WEAPON_ABILITY_IDS.criticalAttack)
  const hasExplosive = hasAbility(weapon, WEAPON_ABILITY_IDS.explosive) && mode === 'ranged'
  const hasGuerrilla = hasAbility(weapon, WEAPON_ABILITY_IDS.guerrilla) && mode === 'ranged'

  if (hasGuerrilla && conditions.afterDash) {
    // Guerrilla grants an extra shooting action after dash; in 1v1 simulator we model it as one extra volley.
    const guerrillaRoll = rollAttackDiceCount(attackExpr)
    bonusAttackDice += guerrillaRoll.total
    if (guerrillaRoll.rolls.length) {
      attackCountRolls.push({
        source: 'guerrilla',
        label: attackExpr.label,
        rolls: [...guerrillaRoll.rolls],
        total: guerrillaRoll.total,
      })
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
  let sacredVowRerollUsed = false
  const failedHitRerollSources = []
  if (attackerRerollFailedHits) failedHitRerollSources.push('target_in_sight')
  if (attackerVoidEyesBeyondActive) failedHitRerollSources.push('eyes_beyond')
  const canFactionRerollFailedHits = failedHitRerollSources.length > 0

  const resolveOneHitDie = (source = 'base') => {
    if (chainGuard > MAX_CHAIN_ROLLS) return
    chainGuard += 1
    const initialRoll = rollDie(6)
    let roll = initialRoll
    let outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
    const initialOutcome = outcome
    let rerolled = false
    let rerollSource = null

    if ((hasPrecision || canFactionRerollFailedHits) && outcome === 'fail') {
      roll = rollDie(6)
      outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
      rerolled = true
      if (hasPrecision && canFactionRerollFailedHits) {
        rerollSource = `precision_${failedHitRerollSources.join('_')}`
      }
      else if (hasPrecision) rerollSource = 'precision'
      else rerollSource = failedHitRerollSources.join('_')
    } else if (mode === 'melee' && attackerCrucibleSacredVow && !sacredVowRerollUsed && outcome === 'fail') {
      roll = rollDie(6)
      outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
      rerolled = true
      rerollSource = 'sacred_vow'
      sacredVowRerollUsed = true
    }

    // Chained extra rolls can only become normal hits or fails.
    if (source === 'chain' && outcome === 'crit') {
      outcome = 'hit'
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
      rerollSource,
    })

    // Only base crits spawn one chained extra roll.
    if (hasChains && source === 'base' && outcome === 'crit') {
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
  const rawDamage = unblockedHits * normalDamage + unblockedCrits * critDamage
  const preventedDamage = mode === 'ranged' && defenderCrucibleGlory ? Math.min(1, rawDamage) : 0
  const totalDamage = Math.max(0, rawDamage - preventedDamage)

  let selfDamage = 0
  if (mode === 'ranged' && hasAbility(weapon, WEAPON_ABILITY_IDS.unstable)) {
    const unstableRoll = rollDie(6)
    rulesApplied.push(`Inestable (tirada ${unstableRoll})`)
    if (unstableRoll <= 2) {
      selfDamage = totalDamage
    }
  }

  const defenderAfterHp = Math.max(0, defender.hp - totalDamage)
  const attackerAfterHp = Math.max(0, attacker.hp - selfDamage)
  const canTriggerVoracity = attackerVoracity && mode === 'melee' && defenderAfterHp <= 0
  const voracityHeal = canTriggerVoracity ? Math.min(1, Math.max(0, attacker.maxHp - attackerAfterHp)) : 0
  const attackerAfterHpWithVoracity = attackerAfterHp + voracityHeal
  const defenderAfter = { hp: defenderAfterHp, maxHp: defender.maxHp, destroyed: defenderAfterHp <= 0 }
  const attackerAfter = { hp: attackerAfterHpWithVoracity, maxHp: attacker.maxHp, destroyed: attackerAfterHpWithVoracity <= 0 }

  if (voracityHeal > 0) {
    rulesApplied.push(`Voracidad (+${voracityHeal} vida)`)
  }
  const totals = {
    attackDiceCount,
    hits: rollSummary.hits,
    crits: rollSummary.crits,
    blockedHits,
    blockedCrits,
    damage: totalDamage,
    rawDamage,
    preventedDamage,
    selfDamage,
    heal: voracityHeal,
  }

  const canCounter = Boolean(
    mode === 'ranged'
      && !defenderAfter.destroyed
      && !attackerAfter.destroyed
      && (conditions.defenderPrepared || defenderRebelFeint),
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
    attackCountRolls,
    rulesApplied,
    hasDirect,
    canCounter,
    parabolicScatter,
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
