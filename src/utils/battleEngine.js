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
    return {
      count: clamp(toInt(md[1], 1), 0, 60),
      sides: clamp(toInt(md[2] || 6, 6), 2, 100),
      label: `${toInt(md[1], 1)}D${md[2] ? toInt(md[2], 6) : ''}`,
    }
  }
  const asNum = toInt(raw, 1)
  return { count: clamp(asNum, 0, 60), sides: 6, label: `${asNum}D` }
}

const rollDie = (sides = 6) => Math.floor(Math.random() * sides) + 1

const rollDice = (count, sides = 6) => Array.from({ length: Math.max(0, count) }, () => rollDie(sides))

const hasAbility = (weapon, prefix) => {
  const p = sanitize(prefix)
  return (weapon?.abilities || []).some((ability) => sanitize(ability).startsWith(p))
}

const getAbilityValue = (weapon, prefix, fallback = 0) => {
  const p = sanitize(prefix)
  const ability = (weapon?.abilities || []).find((item) => sanitize(item).startsWith(p))
  if (!ability) return fallback
  const num = String(ability).match(/[+-]?\s*\d+/)
  if (!num) return fallback
  return toInt(num[0].replace(/\s+/g, ''), fallback)
}

const parseAntiAbility = (weapon) => {
  const anti = (weapon?.abilities || []).find((item) => sanitize(item).startsWith('anti'))
  if (!anti) return null
  const threshold = parseThreshold(anti, 99)
  const lower = sanitize(anti)
  const groupMatch = lower.match(/\(([^)]+)\)/)
  const groups = groupMatch
    ? groupMatch[1]
      .split(/[/,]/)
      .map((token) => token.trim())
      .filter(Boolean)
    : []
  return { threshold, groups }
}

const unitTypeMatchesAnti = (unitType, antiData) => {
  if (!antiData) return false
  if (!Array.isArray(antiData.groups) || antiData.groups.length === 0) return true
  if (antiData.groups.some((token) => token === 'todo' || token === 'all')) return true
  const normalizedType = sanitize(unitType)
  return antiData.groups.some((token) => normalizedType.includes(token))
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
  } else if (hasAbility(weapon, 'directo')) {
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
  const rulesApplied = []

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
  const baseHitThreshold = mode === 'melee' ? 3 : parseThreshold(weapon.hit, 4)
  let hitThreshold = baseHitThreshold + toInt(conditions.hitModifier, 0)
  let bonusAttackDice = 0
  let saveThreshold = parseThreshold(defender.save, 4) + toInt(conditions.saveModifier, 0)
  let bonusSaveDice = 0

  if (mode === 'ranged' && coverType === 'partial') {
    bonusSaveDice += 1
    rulesApplied.push('Cobertura parcial (+1 dado de salvación)')
  }
  if (mode === 'ranged' && coverType === 'height') {
    bonusSaveDice += 1
    hitThreshold += 1
    rulesApplied.push('Cobertura de altura (+1 salvación, +1 impacto requerido)')
  }

  if (mode === 'ranged' && hasAbility(weapon, 'ataque rapido') && conditions.halfRange) {
    const rapidBonus = getAbilityValue(weapon, 'ataque rapido', 1)
    bonusAttackDice += rapidBonus
    rulesApplied.push(`Ataque rápido (+${rapidBonus} dados)`)
  }

  if (mode === 'ranged' && hasAbility(weapon, 'pesada')) {
    if (conditions.attackerMoved) {
      hitThreshold += 1
      rulesApplied.push('Pesada (movió: +1 al valor de impactos)')
    } else {
      hitThreshold -= 1
      rulesApplied.push('Pesada (no movió: -1 al valor de impactos)')
    }
  }

  if (hasAbility(weapon, 'asaltante')) {
    const savePenalty = Math.max(1, getAbilityValue(weapon, 'asaltante', 1))
    saveThreshold += savePenalty
    rulesApplied.push(`Asaltante (+${savePenalty} a salvación enemiga)`)
  }

  const ignoreCover = hasAbility(weapon, 'ignora coberturas') && mode === 'ranged'
  if (ignoreCover && coverType === 'partial') {
    bonusSaveDice = Math.max(0, bonusSaveDice - 1)
    rulesApplied.push('Ignora coberturas (anula cobertura parcial)')
  }

  hitThreshold = clamp(hitThreshold, 2, 7)
  saveThreshold = clamp(saveThreshold, 2, 7)

  const attackDiceCount = clamp(attackExpr.count + bonusAttackDice, 0, 80)
  const antiData = parseAntiAbility(weapon)
  if (antiData) rulesApplied.push(`Anti ${antiData.threshold}+`)

  const hasDirect = hasAbility(weapon, 'directo') && mode === 'ranged'
  const hasPrecision = hasAbility(weapon, 'precision')
  const hasChains = hasAbility(weapon, 'impactos encadenados')
  const critUnsavable = hasAbility(weapon, 'ataque critico')

  const hitEntries = []
  let chainGuard = 0

  const resolveOneHitDie = (source = 'base') => {
    if (chainGuard > MAX_CHAIN_ROLLS) return
    chainGuard += 1
    const initialRoll = rollDie(6)
    let roll = initialRoll
    let outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
    let rerolled = false

    if (hasPrecision && outcome === 'fail') {
      roll = rollDie(6)
      outcome = classifyRoll(roll, hitThreshold, antiData || { threshold: 99, groups: [] }, defender.type)
      rerolled = true
    }

    hitEntries.push({ source, initialRoll, roll, outcome, rerolled })

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
  if (mode === 'ranged' && hasAbility(weapon, 'inestable') && totalDamage > 0) {
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
