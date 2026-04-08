import { buildFactionAbilityLogDetails } from './factionAbilities.js'
import { normalizeText } from './battleUtils.js'
import {
  hasWeaponAbilityId,
  isWeaponAbilityRule,
  WEAPON_ABILITY_IDS,
} from './weaponAbilities.js'

const summarizeRollOutcomes = (lang, rollEntries) => {
  const critCount = rollEntries.filter((entry) => entry.outcome === 'crit').length
  const hitCount = rollEntries.filter((entry) => entry.outcome === 'hit').length
  const failCount = rollEntries.filter((entry) => entry.outcome === 'fail').length
  const parts = []
  if (lang === 'en') {
    if (critCount > 0) parts.push(`${critCount} ${critCount === 1 ? 'critical hit' : 'critical hits'}`)
    if (hitCount > 0) parts.push(`${hitCount} ${hitCount === 1 ? 'normal hit' : 'normal hits'}`)
    if (failCount > 0) parts.push(`${failCount} ${failCount === 1 ? 'fail' : 'fails'}`)
  } else {
    if (critCount > 0) parts.push(`${critCount} ${critCount === 1 ? 'crítico' : 'críticos'}`)
    if (hitCount > 0) parts.push(`${hitCount} ${hitCount === 1 ? 'normal' : 'normales'}`)
    if (failCount > 0) parts.push(`${failCount} ${failCount === 1 ? 'fallo' : 'fallos'}`)
  }
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'y'} ${parts[parts.length - 1]}`
}

const summarizeHitCritTotals = (lang, hits, crits) => {
  const parts = []
  if (lang === 'en') {
    if (hits > 0) parts.push(`${hits} ${hits === 1 ? 'hit' : 'hits'}`)
    if (crits > 0) parts.push(`${crits} ${crits === 1 ? 'crit' : 'crits'}`)
  } else {
    if (hits > 0) parts.push(`${hits} ${hits === 1 ? 'impacto' : 'impactos'}`)
    if (crits > 0) parts.push(`${crits} ${crits === 1 ? 'crítico' : 'críticos'}`)
  }
  if (!parts.length) return lang === 'en' ? 'no impacts' : 'sin impactos'
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'y'} ${parts[parts.length - 1]}`
}

const parseFlatDamageValue = (value, fallback = 1) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '')
  const pureNumber = raw.match(/^-?\d+$/)
  if (pureNumber) return Number.parseInt(pureNumber[0], 10)
  return fallback
}

const countOutcomes = (entries = [], useInitial = false) => {
  let hits = 0
  let crits = 0
  entries.forEach((entry) => {
    const outcome = useInitial ? (entry.initialOutcome || entry.displayOutcome || entry.outcome) : entry.outcome
    if (outcome === 'hit') hits += 1
    if (outcome === 'crit') crits += 1
  })
  return { hits, crits }
}

const computeFlatDamageTotal = ({ hits = 0, crits = 0, weapon }) => {
  const normalDamage = Math.max(0, parseFlatDamageValue(weapon?.damage, 1))
  const critDamage = Math.max(0, parseFlatDamageValue(weapon?.critDamage, normalDamage))
  return (hits * normalDamage) + (crits * critDamage)
}

const splitDetailsByType = (details = []) => {
  const grouped = {
    conditionDetails: [],
    weaponAbilityDetails: [],
    factionAbilityDetails: [],
  }

  details.forEach((detail) => {
    if (detail?.source === 'faction') {
      grouped.factionAbilityDetails.push(detail)
    } else if (detail?.source === 'condition') {
      grouped.conditionDetails.push(detail)
    } else {
      grouped.weaponAbilityDetails.push(detail)
    }
  })

  return grouped
}

export const createBattleLogBuilders = ({ lang, tx }) => {
  const buildCombatEntry = ({
    key,
    attackerSide,
    attackerName,
    defenderName,
    weapon,
    attackerHpBefore,
    defenderHpBefore,
    result,
    attackerResultHpOverride = null,
    attackerResultDefeatedOverride = null,
    extraFactionAbilityDetails = [],
  }) => {
    const weaponName = weapon?.name || ''
    const attackerFinalHp = Number.isFinite(attackerResultHpOverride)
      ? attackerResultHpOverride
      : (result.attackerAfter?.hp ?? attackerHpBefore ?? 0)
    const defenderFinalHp = result.defenderAfter?.hp ?? defenderHpBefore ?? 0

    if (result.blocked) {
      return {
        key,
        attackerSide,
        coverLabel: '',
        coverLine: '',
        attackerLine: lang === 'en'
          ? `${attackerName} attacks with ${weaponName}.`
          : `${attackerName} ataca con ${weaponName}.`,
        defenderLine: lang === 'en'
          ? `${defenderName} defends: ${result.blockedReason || tx.blocked}.`
          : `${defenderName} defiende: ${result.blockedReason || tx.blocked}.`,
        abilityLine: '',
        defenderLead: '',
        defenderSave: '',
        defenderCover: '',
        defenderTail: '',
        abilityDetails: [],
        preAttackDetails: [],
        damageDetails: [],
        attackCountDice: [],
        hitThresholdDice: [],
        attackDice: [],
        defenseDice: [],
        resultState: {
          attacker: {
            name: attackerName,
            hp: attackerFinalHp,
            defeated: attackerFinalHp <= 0,
            hpBefore: attackerHpBefore,
          },
          defender: { name: defenderName, hp: defenderFinalHp, defeated: defenderFinalHp <= 0 },
          selfDamage: 0,
        },
        damageValue: 0,
      }
    }
    const blockedTotal = (result.totals?.blockedHits || 0) + (result.totals?.blockedCrits || 0)
    const attackerSelfDamage = result.totals?.selfDamage || 0
    const attackCountDice = (result.attackCountRolls || [])
      .filter((entry) => Array.isArray(entry?.rolls) && entry.rolls.length > 0 && Number.isFinite(entry?.total))
      .map((entry) => ({
        value: `${entry.total}`,
        dieType: entry.label || '1D6',
        outcome: 'hit',
        tone: 'count',
      }))
    const hitThresholdDice = (result.hitThresholdRoll?.rolls || []).length > 0
      ? [{
        value: `${result.hitThreshold}`,
        dieType: result.hitThresholdRoll?.label || '1D6',
        outcome: 'hit',
        tone: 'count',
      }]
      : []
    const attackDice = (result.hitEntries || [])
      .filter((entry) => entry.source === 'base')
      .filter((entry) => Number.isFinite(entry.initialRoll) || Number.isFinite(entry.roll))
      .map((entry) => ({
        value: `${Number.isFinite(entry.initialRoll) ? entry.initialRoll : entry.roll}`,
        outcome: entry.initialOutcome || entry.displayOutcome || entry.outcome || 'fail',
      }))
    const saveRolls = (result.saveRolls || []).filter((roll) => Number.isFinite(roll))
    const blockedFlags = new Array(saveRolls.length).fill(false)
    const sixIndices = []
    const regularPassIndices = []

    saveRolls.forEach((roll, index) => {
      if (roll === 6) {
        sixIndices.push(index)
      } else if (roll >= result.saveThreshold) {
        regularPassIndices.push(index)
      }
    })

    let remainingBlockedCrits = result.totals?.blockedCrits || 0
    sixIndices.forEach((index) => {
      if (remainingBlockedCrits <= 0) return
      blockedFlags[index] = true
      remainingBlockedCrits -= 1
    })

    let remainingBlockedHits = result.totals?.blockedHits || 0
    regularPassIndices.forEach((index) => {
      if (remainingBlockedHits <= 0) return
      blockedFlags[index] = true
      remainingBlockedHits -= 1
    })
    sixIndices.forEach((index) => {
      if (remainingBlockedHits <= 0 || blockedFlags[index]) return
      blockedFlags[index] = true
      remainingBlockedHits -= 1
    })

    const defenseDice = saveRolls.map((roll, index) => ({ value: roll, blocked: blockedFlags[index] }))
    const appliedAbilityRules = (result.rulesApplied || []).filter((rule) => isWeaponAbilityRule(rule))
    const abilityDetails = []
    const preAttackDetails = []
    const damageDetails = []
    const pushAbilityDetail = (esText, enText, dice = [], source = 'weapon', owner = 'attacker', phase = 'pre') => {
      abilityDetails.push({
        text: lang === 'en' ? enText : esText,
        dice,
        source,
        owner,
        phase,
      })
    }
    const pushPreAttackDetail = (esText, enText, dice = [], source = 'weapon', owner = 'attacker') => {
      preAttackDetails.push({
        text: lang === 'en' ? enText : esText,
        dice,
        source,
        owner,
      })
    }
    const pushDamageDetail = (esText, enText, dice = []) => {
      damageDetails.push({
        text: lang === 'en' ? enText : esText,
        dice,
      })
    }
    const factionAbilityDetails = buildFactionAbilityLogDetails({ result, lang, weapon })
    factionAbilityDetails.forEach((detail) => {
      abilityDetails.push(detail)
    })
    ;(extraFactionAbilityDetails || []).forEach((detail) => {
      abilityDetails.push(detail)
    })
    const appliedRules = result.rulesApplied || []
    const entrenchmentRule = appliedRules.find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('atrincheramiento') || normalized.startsWith('entrenchment')
    })
    if (entrenchmentRule) {
      pushPreAttackDetail(
        'Atrincheramiento añade +1 dado de ataque a este disparo.',
        'Entrenchment adds +1 attack die to this ranged attack.',
        [{ value: '+1', outcome: 'hit', tone: 'count' }],
        'faction',
        'attacker',
      )
    }
    const fallenFuryRule = appliedRules.find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('furia de los caidos') || normalized.startsWith('fury of the fallen')
    })
    if (fallenFuryRule) {
      pushPreAttackDetail(
        'Furia de los Caídos añade +1 dado de ataque en esta acción.',
        'Fury of the Fallen adds +1 attack die in this action.',
        [{ value: '+1', outcome: 'hit', tone: 'count' }],
        'faction',
        'attacker',
      )
    }
    const quickAttackRule = appliedRules.find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('ataque rapido') || normalized.startsWith('quick attack')
    })
    if (quickAttackRule) {
      const quickAttackBonusMatch = quickAttackRule.match(/([+-]?\d+)/)
      const quickAttackBonus = quickAttackBonusMatch ? Number.parseInt(quickAttackBonusMatch[1], 10) : 1
      pushPreAttackDetail(
        `Ataque rápido añade +${quickAttackBonus} dado${quickAttackBonus === 1 ? '' : 's'} de ataque por estar a media distancia.`,
        `Quick Attack adds +${quickAttackBonus} attack die${quickAttackBonus === 1 ? '' : 's'} for being at half range.`,
        [{ value: `+${quickAttackBonus}`, outcome: 'hit', tone: 'count' }],
      )
    }
    const guerrillaRoll = (result.attackCountRolls || []).find((entry) => entry.source === 'guerrilla' && Number.isFinite(entry.total))
    if (guerrillaRoll) {
      pushPreAttackDetail(
        `Guerrilla añade una ráfaga extra tras Carrera: ${guerrillaRoll.label} = +${guerrillaRoll.total} dados.`,
        `Guerrilla adds an extra volley after Sprint: ${guerrillaRoll.label} = +${guerrillaRoll.total} dice.`,
        [{ value: `+${guerrillaRoll.total}`, outcome: 'hit', tone: 'count' }],
      )
    }
    const allHitEntries = result.hitEntries || []
    const precisionRerolls = (result.hitEntries || []).filter(
      (entry) => entry.rerolled && String(entry.rerollSource || '').includes('precision'),
    )
    if (hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.precision)) {
      if (precisionRerolls.length) {
        const failedInitials = precisionRerolls.map((entry) => entry.initialRoll)
        const rerollSummary = summarizeRollOutcomes(lang, precisionRerolls) || (lang === 'en' ? 'no results' : 'sin resultados')

        pushAbilityDetail(
          `Precisión repite fallos [${failedInitials.join(', ')}]: ${rerollSummary}.`,
          `Precision rerolls failed rolls [${failedInitials.join(', ')}]: ${rerollSummary}.`,
          precisionRerolls.map((entry) => ({
            value: entry.roll,
            outcome: entry.outcome,
          })),
        )
      }
    }
    const chainedEntries = allHitEntries.filter((entry) => entry.source === 'chain' && Number.isFinite(entry.roll))
    if (chainedEntries.length > 0) {
      const chainedSummary = summarizeRollOutcomes(lang, chainedEntries) || (lang === 'en' ? 'no results' : 'sin resultados')
      pushAbilityDetail(
        `Impactos encadenados añade ${chainedEntries.length} tirada${chainedEntries.length > 1 ? 's' : ''}: ${chainedSummary}.`,
        `Chained Impacts adds ${chainedEntries.length} extra roll${chainedEntries.length > 1 ? 's' : ''}: ${chainedSummary}.`,
        chainedEntries.map((entry) => ({ value: entry.roll, outcome: entry.outcome })),
      )
    }

    const antiRule = appliedAbilityRules.find((rule) => normalizeText(rule).startsWith('anti '))
    const antiThresholdMatch = antiRule ? antiRule.match(/(\d+)\+?/) : null
    const antiThreshold = antiThresholdMatch ? Number.parseInt(antiThresholdMatch[1], 10) : null
    if (Number.isFinite(antiThreshold)) {
      const antiCritEntries = allHitEntries.filter(
        (entry) => Number.isFinite(entry.roll) && entry.outcome === 'crit' && entry.roll < 6 && entry.roll >= antiThreshold,
      )
      if (antiCritEntries.length > 0) {
        const antiLabel = antiRule || `Anti ${antiThreshold}+`
        pushAbilityDetail(
          `${antiLabel} convierte ${antiCritEntries.length} resultado${antiCritEntries.length > 1 ? 's' : ''} en crítico.`,
          `${antiLabel} turns ${antiCritEntries.length} roll${antiCritEntries.length > 1 ? 's' : ''} into critical hits.`,
        )
      }
    }

    const assaulterRule = appliedAbilityRules.find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('asaltante') || normalized.startsWith('raider')
    })
    if (assaulterRule) {
      const savePenaltyMatch = assaulterRule.match(/([+-]?\d+)/)
      const savePenalty = savePenaltyMatch ? Number.parseInt(savePenaltyMatch[1], 10) : 1
      const bonusText = Number.isFinite(savePenalty) && savePenalty >= 0 ? `+${savePenalty}` : `${savePenalty || 1}`
      pushAbilityDetail(
        `Asaltante aplica ${bonusText} a la salvación enemiga (salva con ${result.saveThreshold}+).`,
        `Raider applies ${bonusText} to enemy Save (saves on ${result.saveThreshold}+).`,
      )
    }

    const unstableRule = (result.rulesApplied || []).find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('inestable') || normalized.startsWith('unstable')
    })
    if (unstableRule) {
      const unstableRoll = Number.isFinite(result.totals?.unstableRoll)
        ? Number(result.totals.unstableRoll)
        : (() => {
            const unstableRollMatch = unstableRule.match(/(\d+)/)
            return unstableRollMatch ? Number.parseInt(unstableRollMatch[1], 10) : null
          })()
      const unstableTriggered = Boolean(result.totals?.unstableTriggered)
      const unstableSelfDamage = Math.max(0, Number(result.totals?.selfDamage || 0))
      pushAbilityDetail(
        unstableTriggered
          ? unstableSelfDamage > 0
            ? `Inestable tira ${unstableRoll ?? '-'}: se activa y causa ${unstableSelfDamage} de autodaño.`
            : `Inestable tira ${unstableRoll ?? '-'}: se activa, pero no causa autodaño porque el daño base es 0.`
          : `Inestable tira ${unstableRoll ?? '-'}: no se activa autodaño.`,
        unstableTriggered
          ? unstableSelfDamage > 0
            ? `Unstable rolls ${unstableRoll ?? '-'}: it triggers and deals ${unstableSelfDamage} self-damage.`
            : `Unstable rolls ${unstableRoll ?? '-'}: it triggers, but deals no self-damage because base damage is 0.`
          : `Unstable rolls ${unstableRoll ?? '-'}: no self-damage is triggered.`,
        Number.isFinite(unstableRoll)
          ? [{ value: unstableRoll, outcome: unstableTriggered ? 'fail' : 'hit' }]
          : [],
      )
    }
    if (result.parabolicScatter) {
      const scatter = result.parabolicScatter
      pushPreAttackDetail(
        scatter.bullseye
          ? `Disparo parabólico: tira ${scatter.roll} y logra diana (5-6).`
          : `Disparo parabólico: tira ${scatter.roll} y falla la diana (1-4).`,
        scatter.bullseye
          ? `Parabolic Shot: rolls ${scatter.roll} and scores a bullseye (5-6).`
          : `Parabolic Shot: rolls ${scatter.roll} and misses the bullseye (1-4).`,
        [{
          value: scatter.roll,
          outcome: scatter.bullseye ? 'crit' : 'fail',
        }],
      )
      pushAbilityDetail(
        scatter.bullseye
          ? 'Disparo parabólico: al dar diana, el defensor no puede realizar tirada de salvación e ignora cobertura.'
          : 'Disparo parabólico: al fallar la diana, el defensor realiza su salvación con normalidad y mantiene cobertura.',
        scatter.bullseye
          ? 'Parabolic Shot: on a bullseye, the defender cannot make a Save roll and ignores cover.'
          : 'Parabolic Shot: on a missed bullseye, the defender saves normally and keeps cover.',
      )
    }
    if (hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.explosive)) {
      const nearbyUnits = Math.max(0, Number(result.totals?.explosiveNearbyUnits || 0))
      const targetDamage = Math.max(0, Number(result.totals?.damage || 0))
      const totalAreaDamage = Math.max(0, Number(result.totals?.totalAreaDamage || targetDamage))
      pushAbilityDetail(
        nearbyUnits > 0
          ? `Explosiva: la unidad objetivo recibe ${targetDamage} de daño. ${nearbyUnits} unidades a 3" o menos reciben también ${targetDamage} cada una. Daño total del área tras la salvación: ${totalAreaDamage}.`
          : `Explosiva: no hay unidades a 3" o menos. La unidad objetivo recibe ${targetDamage} de daño.`,
        nearbyUnits > 0
          ? `Explosive: the target unit takes ${targetDamage} damage. ${nearbyUnits} units within 3" also take ${targetDamage} each. Total area damage after the Save: ${totalAreaDamage}.`
          : `Explosive: there are no units within 3". The target unit takes ${targetDamage} damage.`,
        [],
        'weapon',
        'defender',
        'post',
      )
    }

    if (result.hasDirect) {
      pushAbilityDetail(
        'Directo convierte los ataques en impactos automáticos.',
        'Direct turns attacks into automatic hits.',
      )
    }
    const criticalAttackRule = (result.rulesApplied || []).find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('ataque critico') || normalized.startsWith('critical attack')
    })
    if (criticalAttackRule && Number(result.totals?.crits || 0) > 0) {
      pushAbilityDetail(
        `Ataque crítico: ${result.totals?.crits || 0} crítico${Number(result.totals?.crits || 0) === 1 ? '' : 's'} no genera${Number(result.totals?.crits || 0) === 1 ? '' : 'n'} tirada de salvación.`,
        `Critical Attack: ${result.totals?.crits || 0} crit${Number(result.totals?.crits || 0) === 1 ? '' : 's'} generate no Save roll.`,
      )
    }
    const ignoresCoverRule = (result.rulesApplied || []).find((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('ignora coberturas') || normalized.startsWith('ignore cover')
    })
    if (ignoresCoverRule && result.coverType === 'partial') {
      pushAbilityDetail(
        'Ignora coberturas anula la cobertura parcial del defensor.',
        'Ignore Cover cancels the defender partial cover.',
      )
    }
    const selectedCoverType = result.selectedCoverType || result.coverType || 'none'
    const coverIgnoredByType = Boolean(result.coverIgnoredByType)
    const parabolicBullseyeIgnoresCover = Boolean(result.parabolicScatter?.bullseye && result.parabolicScatter?.ignoreCover)
    const appliedCoverRules = (result.rulesApplied || []).filter((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('cobertura parcial')
    })
    const ignoresPartialCover = (result.rulesApplied || []).some((rule) =>
      normalizeText(rule).startsWith('ignora coberturas') || normalizeText(rule).startsWith('ignore cover'),
    )
    const coverAffectsDefense = (
      result.mode === 'ranged'
      && 
      appliedCoverRules.length > 0
      && !(ignoresPartialCover && result.coverType === 'partial')
      && !coverIgnoredByType
      && !parabolicBullseyeIgnoresCover
    )
    const meleePartialCoverActive = Boolean(result.meleePartialCoverActive)
    const rollOutcomeSummary = summarizeRollOutcomes(lang, attackDice)
    const baseOutcomeTotals = countOutcomes(
      (result.hitEntries || []).filter((entry) => entry.source === 'base'),
      true,
    )
    const baseDamageTotal = computeFlatDamageTotal({
      hits: baseOutcomeTotals.hits,
      crits: baseOutcomeTotals.crits,
      weapon,
    })
    const directSummary = summarizeHitCritTotals(lang, result.totals?.hits || 0, result.totals?.crits || 0)
    const attackerDamageSuffix = lang === 'en'
      ? ` -> base damage ${baseDamageTotal}.`
      : ` -> daño base ${baseDamageTotal}.`
    const attackerSummary = result.hasDirect
      ? lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (automatic hits): ${directSummary}${attackerDamageSuffix}`
        : `${attackerName} ataca con ${weaponName} (impactos automáticos): ${directSummary}${attackerDamageSuffix}`
      : lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (hits on ${result.hitThreshold}+): ${rollOutcomeSummary || 'no rolls recorded'}${attackerDamageSuffix}`
        : `${attackerName} ataca con ${weaponName} (impacta con ${result.hitThreshold}+): ${rollOutcomeSummary || 'sin tiradas registradas'}${attackerDamageSuffix}`
    const defenderCover = coverAffectsDefense
      ? lang === 'en'
        ? 'cover: partial'
        : 'cobertura parcial'
      : ''
    const selectedCoverLabel = selectedCoverType === 'none'
      ? ''
      : lang === 'en'
        ? 'partial cover'
        : 'cobertura parcial'
    const coverLabel = coverAffectsDefense ? selectedCoverLabel : ''
    const coverUnitName = coverAffectsDefense && selectedCoverLabel ? tx.defender : ''
    const defenderLead = lang === 'en' ? `${defenderName} defends (` : `${defenderName} defiende (`
    const failedDefenses = Math.max(0, saveRolls.length - blockedTotal)
    const defenseSummary = (() => {
      if (lang === 'en') {
        const parts = []
        if (blockedTotal > 0) parts.push(`blocks ${blockedTotal}`)
        if (failedDefenses > 0) parts.push(`fails ${failedDefenses}`)
        return parts.join('; ')
      }
      const parts = []
      if (blockedTotal > 0) parts.push(`bloquea ${blockedTotal}`)
      if (failedDefenses > 0) parts.push(`falla ${failedDefenses}`)
      return parts.join('; ')
    })()
    const coverLine = (() => {
      if (meleePartialCoverActive) {
        return lang === 'en'
          ? 'applied to both units (-1 melee attack die)'
          : 'aplicada a ambas unidades (-1 dado de ataque CaC)'
      }
      if (defenderCover) {
        return lang === 'en'
          ? 'applied to the defender (-1 save value)'
          : 'aplicada al defensor (-1 al valor de salvación)'
      }
      if (parabolicBullseyeIgnoresCover && selectedCoverType !== 'none') {
        return lang === 'en'
          ? 'not applied to the defender'
          : 'no aplicada al defensor'
      }
      if (ignoresPartialCover && selectedCoverType === 'partial') {
        return lang === 'en'
          ? 'not applied to the defender'
          : 'no aplicada al defensor'
      }
      if (coverIgnoredByType && selectedCoverType !== 'none') {
        return lang === 'en'
          ? 'not applied to the defender'
          : 'no aplicada al defensor'
      }
      return ''
    })()
    const preventedDamage = Math.max(0, Number(result.totals?.preventedDamage || 0))
    const rawDamage = Math.max(0, Number(result.totals?.rawDamage || result.totals?.damage || 0))
    const defenderMitigationInline = preventedDamage > 0
      ? lang === 'en'
        ? `-${preventedDamage} from ability`
        : `-${preventedDamage} de habilidad`
      : ''
    const defenderTailPrefix = preventedDamage > 0
      ? lang === 'en'
        ? `): ${defenseSummary || 'no defense rolls'}; damage getting through ${rawDamage}; `
        : `): ${defenseSummary || 'sin tiradas de defensa'}; daño que entra ${rawDamage}; `
      : ''
    const defenderTailSuffix = preventedDamage > 0
      ? lang === 'en'
        ? `; final damage ${result.totals.damage} (${defenderHpBefore} -> ${defenderFinalHp} HP).`
        : `; daño final ${result.totals.damage} (${defenderHpBefore} -> ${defenderFinalHp} vidas).`
      : ''
    const defenderTail = preventedDamage > 0
      ? ''
      : lang === 'en'
        ? `): ${defenseSummary || 'no defense rolls'}; takes ${result.totals.damage} damage (${defenderHpBefore} -> ${defenderFinalHp} HP).`
        : `): ${defenseSummary || 'sin tiradas de defensa'}; recibe ${result.totals.damage} de daño (${defenderHpBefore} -> ${defenderFinalHp} vidas).`
    const defenderMitigationNote = ''
    const defenderLinePrefix = preventedDamage > 0
      ? lang === 'en'
        ? `${defenderName} defends: no Save rolls; damage getting through ${rawDamage}; `
        : `${defenderName} defiende: sin tiradas de defensa; daño que entra ${rawDamage}; `
      : ''
    const defenderLineSuffix = preventedDamage > 0
      ? lang === 'en'
        ? `; final damage ${result.totals.damage} (${defenderHpBefore} -> ${defenderFinalHp} HP).`
        : `; daño final ${result.totals.damage} (${defenderHpBefore} -> ${defenderFinalHp} vidas).`
      : ''
    const defenderNoSaveLine = parabolicBullseyeIgnoresCover && result.saveDiceCount === 0
      ? preventedDamage > 0
        ? ''
        : lang === 'en'
          ? `${defenderName} defends: no Save rolls; takes ${result.totals.damage} damage (${defenderHpBefore} -> ${defenderFinalHp} HP).`
          : `${defenderName} defiende: sin tiradas de defensa; recibe ${result.totals.damage} de daño (${defenderHpBefore} -> ${defenderFinalHp} vidas).`
      : ''

    const normalDamageRolls = Array.isArray(result.totals?.normalDamageRolls) ? result.totals.normalDamageRolls : []
    const critDamageRolls = Array.isArray(result.totals?.critDamageRolls) ? result.totals.critDamageRolls : []

    const hasVariableNormalDamage = result.totals?.normalDamageKind === 'dice'
    const hasVariableCritDamage = result.totals?.critDamageKind === 'dice'

    if (hasVariableNormalDamage && normalDamageRolls.length > 0) {
      const values = normalDamageRolls
        .map((entry) => Number(entry?.total))
        .filter((value) => Number.isFinite(value))
      const label = String(normalDamageRolls[0]?.label || (lang === 'en' ? 'Damage' : 'Daño'))
      const total = values.reduce((sum, value) => sum + value, 0)
      if (values.length > 0) {
        pushDamageDetail(
          `Daño normal (${label}) en ${values.length} impacto${values.length === 1 ? '' : 's'}: ${values.join(', ')} (total ${total}).`,
          `Normal damage (${label}) over ${values.length} hit${values.length === 1 ? '' : 's'}: ${values.join(', ')} (total ${total}).`,
          values.map((value) => ({ value, outcome: 'hit' })),
        )
      }
    }

    if (hasVariableCritDamage && critDamageRolls.length > 0) {
      const values = critDamageRolls
        .map((entry) => Number(entry?.total))
        .filter((value) => Number.isFinite(value))
      const label = String(critDamageRolls[0]?.label || (lang === 'en' ? 'Critical damage' : 'Daño crítico'))
      const total = values.reduce((sum, value) => sum + value, 0)
      if (values.length > 0) {
        pushDamageDetail(
          `Daño crítico (${label}) en ${values.length} crítico${values.length === 1 ? '' : 's'}: ${values.join(', ')} (total ${total}).`,
          `Critical damage (${label}) over ${values.length} crit${values.length === 1 ? '' : 's'}: ${values.join(', ')} (total ${total}).`,
          values.map((value) => ({ value, outcome: 'crit' })),
        )
      }
    }

    if ((hasVariableNormalDamage || hasVariableCritDamage) && damageDetails.length === 0) {
      pushDamageDetail(
        'Daño variable: sin tiradas porque no han entrado impactos.',
        'Variable damage: no rolls because no hits got through.',
      )
    }

    const preAttackGroups = splitDetailsByType(preAttackDetails)
    const resolvedAbilityGroups = splitDetailsByType(abilityDetails)
    const attackerFactionAbilityDetails = resolvedAbilityGroups.factionAbilityDetails.filter((detail) => detail.owner !== 'defender')
    const defenderFactionAbilityDetails = resolvedAbilityGroups.factionAbilityDetails.filter((detail) => detail.owner === 'defender')
    const attackerCoverDetails = meleePartialCoverActive && coverLine
      ? [{
        text: coverLine,
        dice: [],
        label: coverLabel || tx.coverType,
        unitName: attackerName,
      }]
      : []
    const coverDetails = coverLine && !meleePartialCoverActive
      ? [{
        text: coverLine,
        dice: [],
        label: coverLabel || tx.coverType,
        unitName: coverUnitName || defenderName,
      }]
      : []

    return {
      key,
      attackerSide,
      coverLabel,
      coverUnitName,
      coverLine,
      attackerLine: attackerSummary,
      abilityLine: '',
      defenderLine: defenderNoSaveLine,
      defenderLead,
      defenderSave: defenderNoSaveLine ? '' : `${result.saveThreshold}+`,
      defenderCover,
      defenderTail,
      defenderTailPrefix,
      defenderTailSuffix,
      defenderLinePrefix,
      defenderLineSuffix,
      defenderMitigationInline,
      defenderMitigationNote,
      attackerCoverDetails,
      conditionDetails: preAttackGroups.conditionDetails,
      preWeaponAbilityDetails: preAttackGroups.weaponAbilityDetails,
      preFactionAbilityDetails: preAttackGroups.factionAbilityDetails,
      coverDetails,
      weaponAbilityDetails: resolvedAbilityGroups.weaponAbilityDetails,
      attackerFactionAbilityDetails,
      defenderFactionAbilityDetails,
      preAttackDetails,
      attackCountDice,
      hitThresholdDice,
      attackDice,
      defenseDice,
      abilityDetails,
      damageDetails,
      resultState: {
        attacker: {
          name: attackerName,
          hp: attackerFinalHp,
          defeated: typeof attackerResultDefeatedOverride === 'boolean'
            ? attackerResultDefeatedOverride
            : attackerFinalHp <= 0,
          hpBefore: attackerHpBefore,
        },
        defender: { name: defenderName, hp: defenderFinalHp, defeated: defenderFinalHp <= 0 },
        selfDamage: attackerSelfDamage,
      },
      damageValue: Number(result.totals?.damage || 0),
    }
  }

  const buildStatusEntry = ({
    key,
    attackerSide = 'left',
    attackerName,
    defenderName,
    attackerHp,
    defenderHp,
    attackerLine,
    defenderLine,
    attackDice = [],
    selfDamage = 0,
    hideResult = false,
    hidePrimaryLine = false,
    abilityDetails = [],
  }) => {
    const resolvedAbilityGroups = splitDetailsByType(abilityDetails)
    return {
      key,
      attackerSide,
      coverLabel: '',
      coverLine: '',
      attackerLine,
      defenderLine,
      abilityLine: '',
      defenderLead: '',
      defenderSave: '',
      defenderCover: '',
      defenderTail: '',
      defenderTailPrefix: '',
      defenderTailSuffix: '',
      defenderLinePrefix: '',
      defenderLineSuffix: '',
      defenderMitigationInline: '',
      attackerCoverDetails: [],
      conditionDetails: [],
      preWeaponAbilityDetails: [],
      preFactionAbilityDetails: [],
      coverDetails: [],
      weaponAbilityDetails: resolvedAbilityGroups.weaponAbilityDetails,
      attackerFactionAbilityDetails: resolvedAbilityGroups.factionAbilityDetails.filter((detail) => detail.owner !== 'defender'),
      defenderFactionAbilityDetails: resolvedAbilityGroups.factionAbilityDetails.filter((detail) => detail.owner === 'defender'),
      preAttackDetails: [],
      abilityDetails,
      damageDetails: [],
      attackCountDice: [],
      hitThresholdDice: [],
      attackDice,
      defenseDice: [],
      hidePrimaryLine,
      hideResult,
      resultState: {
        attacker: {
          name: attackerName,
          hp: attackerHp,
          defeated: attackerHp <= 0,
          hpBefore: attackerHp,
        },
        defender: { name: defenderName, hp: defenderHp, defeated: defenderHp <= 0 },
        selfDamage,
      },
      damageValue: 0,
    }
  }

  return { buildCombatEntry, buildStatusEntry }
}
