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

export const createBattleLogBuilders = ({ lang, tx, currentModeLabel }) => {
  const buildCombatEntry = ({
    key,
    title,
    attackerSide,
    attackerName,
    defenderName,
    weapon,
    attackerHpBefore,
    defenderHpBefore,
    result,
    extraFactionAbilityDetails = [],
  }) => {
    const weaponName = weapon?.name || ''
    const attackerFinalHp = result.attackerAfter?.hp ?? attackerHpBefore ?? 0
    const defenderFinalHp = result.defenderAfter?.hp ?? defenderHpBefore ?? 0
    const baseStatsLine = ''
    const specialtyLine = ''

    if (result.blocked) {
      return {
        key,
        title,
        attackerSide,
        subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
        baseStatsLine,
        specialtyLine,
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
        damageDetails: [],
        attackCountDice: [],
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
      }
    }
    const blockedTotal = (result.totals?.blockedHits || 0) + (result.totals?.blockedCrits || 0)
    const attackerSelfDamage = result.totals?.selfDamage || 0
    const attackCountDice = (result.attackCountRolls || [])
      .flatMap((entry) => (entry.rolls || []).map((roll) => ({
        value: `${roll}`,
        dieType: entry.label || '1D6',
        outcome: 'hit',
        tone: 'count',
      })))
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
    const damageDetails = []
    const pushAbilityDetail = (esText, enText, dice = [], source = 'weapon', owner = 'attacker') => {
      abilityDetails.push({
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
    const factionAbilityDetails = buildFactionAbilityLogDetails({ result, lang })
    factionAbilityDetails.forEach((detail) => {
      abilityDetails.push(detail)
    })
    ;(extraFactionAbilityDetails || []).forEach((detail) => {
      abilityDetails.push(detail)
    })
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
        pushAbilityDetail(
          `Anti ${antiThreshold}+ convierte ${antiCritEntries.length} resultado${antiCritEntries.length > 1 ? 's' : ''} en crítico.`,
          `Anti ${antiThreshold}+ turns ${antiCritEntries.length} roll${antiCritEntries.length > 1 ? 's' : ''} into critical hits.`,
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
      const unstableRollMatch = unstableRule.match(/(\d+)/)
      const unstableRoll = unstableRollMatch ? Number.parseInt(unstableRollMatch[1], 10) : null
      const unstableTriggered = (result.totals?.selfDamage || 0) > 0
      pushAbilityDetail(
        unstableTriggered
          ? `Inestable tira ${unstableRoll ?? '-'}: se activa y causa ${result.totals?.selfDamage || 0} de autodaño.`
          : `Inestable tira ${unstableRoll ?? '-'}: no se activa autodaño.`,
        unstableTriggered
          ? `Unstable rolls ${unstableRoll ?? '-'}: it triggers and deals ${result.totals?.selfDamage || 0} self-damage.`
          : `Unstable rolls ${unstableRoll ?? '-'}: no self-damage is triggered.`,
        Number.isFinite(unstableRoll)
          ? [{ value: unstableRoll, outcome: unstableTriggered ? 'fail' : 'hit' }]
          : [],
      )
    }
    if (result.parabolicScatter) {
      const scatter = result.parabolicScatter
      const scatterTextEs = scatter.bullseye
        ? `Disparo parabólico tira ${scatter.roll}: diana (5-6). El objetivo no puede realizar tirada de salvación.`
        : `Disparo parabólico tira ${scatter.roll}: fallo de precisión (1-4). El objetivo puede salvar normalmente.`
      const scatterTextEn = scatter.bullseye
        ? `Parabolic Shot rolls ${scatter.roll}: bullseye (5-6). The target cannot make Save rolls.`
        : `Parabolic Shot rolls ${scatter.roll}: precision failure (1-4). The target can save normally.`
      pushAbilityDetail(
        scatterTextEs,
        scatterTextEn,
        [{
          value: scatter.roll,
          outcome: scatter.bullseye ? 'crit' : 'fail',
        }],
      )
    }
    if (hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.explosive)) {
      const nearbyUnits = Math.max(0, Number(result.totals?.explosiveNearbyUnits || 0))
      const affectedUnits = Math.max(1, Number(result.totals?.explosiveAffectedUnits || 1))
      const baseDamage = Math.max(0, Number(result.totals?.baseDamage || result.totals?.damage || 0))
      const finalDamage = Math.max(0, Number(result.totals?.damage || 0))
      pushAbilityDetail(
        nearbyUnits > 0
          ? `Explosiva: objetivo + ${nearbyUnits} cercanas (${affectedUnits} en total). Daño: ${baseDamage} x ${affectedUnits} = ${finalDamage}.`
          : 'Explosiva: solo afecta al objetivo.',
        nearbyUnits > 0
          ? `Explosive: target + ${nearbyUnits} nearby (${affectedUnits} total). Damage: ${baseDamage} x ${affectedUnits} = ${finalDamage}.`
          : 'Explosive: only affects the target.',
      )
    }

    if (result.hasDirect) {
      pushAbilityDetail(
        'Directo convierte los ataques en impactos automáticos.',
        'Direct turns attacks into automatic hits.',
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
    const appliedCoverRules = (result.rulesApplied || []).filter((rule) => {
      const normalized = normalizeText(rule)
      return normalized.startsWith('cobertura parcial') || normalized.startsWith('cobertura de altura')
    })
    const ignoresPartialCover = (result.rulesApplied || []).some((rule) =>
      normalizeText(rule).startsWith('ignora coberturas') || normalizeText(rule).startsWith('ignore cover'),
    )
    const coverAffectsDefense = (
      appliedCoverRules.length > 0
      && !(ignoresPartialCover && result.coverType === 'partial')
      && !coverIgnoredByType
    )
    const rollOutcomeSummary = summarizeRollOutcomes(lang, attackDice)
    const directSummary = summarizeHitCritTotals(lang, result.totals?.hits || 0, result.totals?.crits || 0)
    const attackerSummary = result.hasDirect
      ? lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (automatic hits): ${directSummary}.`
        : `${attackerName} ataca con ${weaponName} (impactos automáticos): ${directSummary}.`
      : lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (hits on ${result.hitThreshold}+): ${rollOutcomeSummary || 'no rolls recorded'}.`
        : `${attackerName} ataca con ${weaponName} (impacta con ${result.hitThreshold}+): ${rollOutcomeSummary || 'sin tiradas registradas'}.`
    const defenderCover = coverAffectsDefense
      ? lang === 'en'
        ? result.coverType === 'height'
          ? 'cover: high'
          : 'cover: partial'
        : result.coverType === 'height'
          ? 'cobertura de altura'
          : 'cobertura parcial'
      : ''
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
      if (defenderCover) {
        return lang === 'en'
          ? `Applied cover: ${defenderCover}.${
            coverAffectsDefense && Number(result.saveThreshold) === 1 ? ' Save stays at 1+ (cap).' : ''
          }`
          : `Cobertura aplicada: ${defenderCover}.${
            coverAffectsDefense && Number(result.saveThreshold) === 1 ? ' La salvación se mantiene en 1+ (tope).' : ''
          }`
      }
      if (coverIgnoredByType && selectedCoverType !== 'none') {
        const coverLabel = lang === 'en'
          ? selectedCoverType === 'height' ? 'high cover' : 'partial cover'
          : selectedCoverType === 'height' ? 'cobertura de altura' : 'cobertura parcial'
        return lang === 'en'
          ? `Selected cover: ${coverLabel}; no effect on vehicle/monster/titan units.`
          : `Cobertura seleccionada: ${coverLabel}; sin efecto sobre unidades vehículo/monstruo/titán.`
      }
      return ''
    })()
    const defenderTail = lang === 'en'
      ? `): ${defenseSummary || 'no defense rolls'}; takes ${result.totals.damage} damage (${defenderHpBefore} -> ${defenderFinalHp} HP).`
      : `): ${defenseSummary || 'sin tiradas de defensa'}; recibe ${result.totals.damage} de daño (${defenderHpBefore} -> ${defenderFinalHp} vidas).`

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

    return {
      key,
      title,
      attackerSide,
      subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
      baseStatsLine,
      specialtyLine,
      coverLine,
      attackerLine: attackerSummary,
      abilityLine: '',
      defenderLine: '',
      defenderLead,
      defenderSave: `${result.saveThreshold}+`,
      defenderCover,
      defenderTail,
      attackCountDice,
      attackDice,
      defenseDice,
      abilityDetails,
      damageDetails,
      resultState: {
        attacker: {
          name: attackerName,
          hp: attackerFinalHp,
          defeated: attackerFinalHp <= 0,
          hpBefore: attackerHpBefore,
        },
        defender: { name: defenderName, hp: defenderFinalHp, defeated: defenderFinalHp <= 0 },
        selfDamage: attackerSelfDamage,
      },
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
  }) => ({
    key,
    attackerSide,
    title: '',
    subtitle: '',
    baseStatsLine: '',
    specialtyLine: '',
    coverLine: '',
    attackerLine,
    defenderLine,
    abilityLine: '',
    defenderLead: '',
    defenderSave: '',
    defenderCover: '',
    defenderTail: '',
    abilityDetails,
    damageDetails: [],
    attackCountDice: [],
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
  })

  return { buildCombatEntry, buildStatusEntry }
}
