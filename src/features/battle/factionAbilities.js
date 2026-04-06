const normalizeAbilityToken = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeRuleText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const t = (lang, es, en) => (lang === 'en' ? en : es)

const parseFlatDamageValue = (value, fallback = 1) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '')
  const pureNumber = raw.match(/^-?\d+$/)
  if (pureNumber) return Number.parseInt(pureNumber[0], 10)
  return fallback
}

const summarizeHitCritTotals = (lang, hits, crits) => {
  const parts = []
  if (lang === 'en') {
    if (crits > 0) parts.push(`${crits} ${crits === 1 ? 'critical hit' : 'critical hits'}`)
    if (hits > 0) parts.push(`${hits} ${hits === 1 ? 'normal hit' : 'normal hits'}`)
  } else {
    if (crits > 0) parts.push(`${crits} ${crits === 1 ? 'crítico' : 'críticos'}`)
    if (hits > 0) parts.push(`${hits} ${hits === 1 ? 'normal' : 'normales'}`)
  }
  if (!parts.length) return lang === 'en' ? 'no impacts' : 'sin impactos'
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} ${lang === 'en' ? 'and' : 'y'} ${parts[parts.length - 1]}`
}

const computeFlatDamageTotal = ({ hits = 0, crits = 0, weapon }) => {
  const normalDamage = Math.max(0, parseFlatDamageValue(weapon?.damage, 1))
  const critDamage = Math.max(0, parseFlatDamageValue(weapon?.critDamage, normalDamage))
  return (hits * normalDamage) + (crits * critDamage)
}

const FACTION_ABILITY_DEFINITIONS = [
  {
    effectKey: 'alliance_target_in_sight',
    nameTokens: ['objetivo-en-la-mira', 'target-in-sight'],
    appliesTo: 'attacker',
    logPhase: 'post',
    engineConditionKey: 'attackerRerollFailedHits',
    rulePrefixes: ['objetivo en la mira', 'target in sight'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule) return null
      const rerolledEntries = (result.hitEntries || []).filter(
        (entry) =>
          entry.rerolled
          && Number.isFinite(entry.initialRoll)
          && Number.isFinite(entry.roll)
          && String(entry.rerollSource || '').includes('target_in_sight'),
      )
      const failedInitials = rerolledEntries
        .map((entry) => entry.initialRoll)
        .filter((value) => Number.isFinite(value))
      const rerollResults = rerolledEntries
        .map((entry) => entry.roll)
        .filter((value) => Number.isFinite(value))
      const finalHits = Math.max(0, Number(result.totals?.hits || 0))
      const finalCrits = Math.max(0, Number(result.totals?.crits || 0))
      const finalSummary = summarizeHitCritTotals(lang, finalHits, finalCrits)
      const updatedDamage = computeFlatDamageTotal({ hits: finalHits, crits: finalCrits, weapon: result.weapon || {} })
      return {
        text: t(
          lang,
          failedInitials.length
            ? `Objetivo en la mira: repite fallos [${failedInitials.join(', ')}] -> nuevas tiradas [${rerollResults.join(', ')}] -> daño final total: ${finalSummary}, daño base ${updatedDamage}.`
            : 'Objetivo en la mira activo: esta unidad repite impactos fallidos contra el objetivo marcado.',
          failedInitials.length
            ? `Target in sight: rerolls failed hits [${failedInitials.join(', ')}] -> new rolls [${rerollResults.join(', ')}] -> final total: ${finalSummary}, base damage ${updatedDamage}.`
            : 'Target in sight active: this unit rerolls failed hit rolls against the marked target.',
        ),
        dice: rerolledEntries.map((entry) => ({
          value: `${entry.roll}`,
          outcome: entry.outcome || 'fail',
        })),
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'void_eyes_beyond',
    nameTokens: ['ojos-del-mas-alla', 'eyes-from-beyond', 'eyes-beyond'],
    appliesTo: 'attacker',
    logPhase: 'post',
    modes: ['ranged'],
    engineConditionKey: 'attackerVoidEyesBeyond',
    rulePrefixes: ['ojos del mas alla', 'eyes from beyond', 'eyes beyond'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule) return null
      const rerolledEntries = (result.hitEntries || []).filter(
        (entry) =>
          entry.rerolled
          && Number.isFinite(entry.initialRoll)
          && Number.isFinite(entry.roll)
          && String(entry.rerollSource || '').includes('eyes_beyond'),
      )
      const failedInitials = rerolledEntries
        .map((entry) => entry.initialRoll)
        .filter((value) => Number.isFinite(value))
      const rerollResults = rerolledEntries
        .map((entry) => entry.roll)
        .filter((value) => Number.isFinite(value))
      const finalHits = Math.max(0, Number(result.totals?.hits || 0))
      const finalCrits = Math.max(0, Number(result.totals?.crits || 0))
      const finalSummary = summarizeHitCritTotals(lang, finalHits, finalCrits)
      const updatedDamage = computeFlatDamageTotal({ hits: finalHits, crits: finalCrits, weapon: result.weapon || {} })
      return {
        text: t(
          lang,
          failedInitials.length
            ? `Ojos del más allá: repite fallos [${failedInitials.join(', ')}] contra cobertura -> nuevas tiradas [${rerollResults.join(', ')}] -> daño final total: ${finalSummary}, daño base ${updatedDamage}.`
            : 'Ojos del más allá activo: esta unidad repite impactos fallidos contra cobertura.',
          failedInitials.length
            ? `Eyes from beyond: rerolls failed hits [${failedInitials.join(', ')}] against cover -> new rolls [${rerollResults.join(', ')}] -> final total: ${finalSummary}, base damage ${updatedDamage}.`
            : 'Eyes from beyond active: this unit rerolls failed hit rolls against cover.',
        ),
        dice: rerolledEntries.map((entry) => ({
          value: `${entry.roll}`,
          outcome: entry.outcome || 'fail',
        })),
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'wild_uncontrolled_fury',
    nameTokens: ['furia-incontrolada', 'uncontrolled-fury'],
    appliesTo: 'attacker',
    logPhase: 'pre',
    modes: ['melee'],
    engineConditionKey: 'attackerWildUncontrolledFury',
    rulePrefixes: ['furia incontrolada', 'uncontrolled fury'],
    buildLogDetail: ({ lang, hasRule }) => {
      if (!hasRule) return null
      return {
        text: t(
          lang,
          'Furia incontrolada activa: esta unidad añade +1 dado de ataque en este CaC por cargar.',
          'Uncontrolled fury active: this unit gains +1 melee attack die for charging.',
        ),
        dice: [],
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'alliance_martial_resistance',
    nameTokens: ['resistencia-marcial', 'martial-resistance'],
    appliesTo: 'defender',
    logPhase: 'pre',
    modes: ['ranged'],
    engineConditionKey: 'defenderMartialResistance',
    rulePrefixes: ['resistencia marcial', 'martial resistance'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule || result.mode !== 'ranged') return null
      return {
        text: t(
          lang,
          `Resistencia marcial activa: el atacante impacta con ${result.hitThreshold}+ en este disparo.`,
          `Martial resistance active: the attacker hits on ${result.hitThreshold}+ in this ranged attack.`,
        ),
        dice: [],
        source: 'faction',
        owner: 'defender',
      }
    },
  },
  {
    effectKey: 'swarm_voracity',
    nameTokens: ['voracidad', 'voracity'],
    appliesTo: 'attacker',
    logPhase: 'result',
    modes: ['melee'],
    engineConditionKey: 'attackerVoracity',
    rulePrefixes: ['voracidad', 'voracity'],
    buildLogDetail: ({ lang, hasRule }) => {
      if (!hasRule) return null
      return {
        text: t(
          lang,
          'Voracidad activa: al eliminar en CaC, recupera 1 vida.',
          'Voracity active: on a melee elimination, recovers 1 HP.',
        ),
        dice: [],
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'crucible_glory',
    nameTokens: ['gloria-del-crisol', 'glory-of-the-crucible'],
    appliesTo: 'defender',
    logPhase: 'post',
    modes: ['ranged'],
    engineConditionKey: 'defenderCrucibleGlory',
    rulePrefixes: ['gloria del crisol', 'glory of the crucible'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule || result.mode !== 'ranged') return null
      const prevented = Number(result.totals?.preventedDamage || 0)
      if (prevented <= 0) return null
      return {
        text: t(
          lang,
          `Gloria del Crisol activa: ignora ${prevented} de daño de este disparo.`,
          `Glory of the Crucible active: ignores ${prevented} damage from this ranged attack.`,
        ),
        dice: [],
        source: 'faction',
        owner: 'defender',
      }
    },
  },
  {
    effectKey: 'crucible_heroic_fall',
    nameTokens: ['caida-heroica', 'heroic-fall'],
    appliesTo: 'defender',
  },
  {
    effectKey: 'crucible_sacred_vow',
    nameTokens: ['voto-sagrado', 'sacred-vow'],
    appliesTo: 'attacker',
    logPhase: 'post',
    modes: ['melee'],
    engineConditionKey: 'attackerCrucibleSacredVow',
    rulePrefixes: ['voto sagrado', 'sacred vow'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule || result.mode !== 'melee') return null
      const rerolledEntries = (result.hitEntries || []).filter(
        (entry) =>
          entry.rerolled
          && Number.isFinite(entry.initialRoll)
          && Number.isFinite(entry.roll)
          && entry.rerollSource === 'sacred_vow',
      )
      if (!rerolledEntries.length) return null
      return {
        text: t(
          lang,
          'Voto sagrado activo: esta unidad repite 1 dado fallido de cuerpo a cuerpo.',
          'Sacred vow active: this unit rerolls 1 failed melee die.',
        ),
        dice: rerolledEntries.map((entry) => ({
          value: `${entry.roll}`,
          outcome: entry.outcome || 'fail',
        })),
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'rebels_feint',
    nameTokens: ['finta', 'feint'],
    appliesTo: 'defender',
    modes: ['ranged'],
    engineConditionKey: 'defenderRebelFeint',
    rulePrefixes: ['finta', 'feint'],
  },
  {
    effectKey: 'technocrats_combat_protocols',
    nameTokens: ['protocolos-de-combate', 'combat-protocols'],
    appliesTo: 'attacker',
    logPhase: 'pre',
    modes: ['ranged'],
    engineConditionKey: 'attackerTechnocratsCombatProtocols',
    rulePrefixes: ['protocolos de combate', 'combat protocols'],
    buildLogDetail: ({ lang, result, hasRule }) => {
      if (!hasRule || result.mode !== 'ranged') return null
      return {
        text: t(
          lang,
          `Protocolos de combate activo: esta unidad impacta con ${result.hitThreshold}+ en este disparo.`,
          `Combat protocols active: this unit hits on ${result.hitThreshold}+ in this ranged attack.`,
        ),
        dice: [],
        source: 'faction',
        owner: 'attacker',
      }
    },
  },
  {
    effectKey: 'federation_entrenchment',
    nameTokens: ['atrincheramiento', 'entrenchment'],
    appliesTo: 'attacker',
    modes: ['ranged'],
    engineConditionKey: 'attackerFederationEntrenchment',
    rulePrefixes: ['atrincheramiento', 'entrenchment'],
  },
  {
    effectKey: 'federation_fury_of_the_fallen',
    nameTokens: ['furia-de-los-caidos', 'fury-of-the-fallen'],
    appliesTo: 'attacker',
    engineConditionKey: 'attackerFederationFuryOfTheFallen',
    rulePrefixes: ['furia de los caidos', 'fury of the fallen'],
  },
]

const isDefinitionEnabledInMode = (definition, mode) =>
  !Array.isArray(definition.modes) || definition.modes.includes(mode)

const findDefinitionByEffectKey = (effectKey) =>
  FACTION_ABILITY_DEFINITIONS.find((definition) => definition.effectKey === effectKey) || null

const hasEnabledFactionAbility = (abilities, stateMap, effectKey) =>
  (abilities || []).some((ability) => ability.effectKey === effectKey && Boolean(stateMap?.[ability.id]))

export const implementedFactionAbilityKeys = new Set(
  FACTION_ABILITY_DEFINITIONS.map((definition) => definition.effectKey),
)

export const resolveFactionAbilityEffectKey = (name) => {
  const token = normalizeAbilityToken(name)
  const match = FACTION_ABILITY_DEFINITIONS.find((definition) =>
    definition.nameTokens.some((nameToken) => token.includes(nameToken)),
  )
  return match?.effectKey || null
}

export const buildFactionAttackConditions = ({
  attackerAbilities,
  attackerState,
  defenderAbilities,
  defenderState,
  mode,
}) => {
  const conditions = {
    attackerRerollFailedHits: false,
    attackerVoidEyesBeyond: false,
    attackerVoracity: false,
    attackerWildUncontrolledFury: false,
    defenderMartialResistance: false,
    defenderCrucibleGlory: false,
    attackerCrucibleSacredVow: false,
    defenderRebelFeint: false,
    attackerTechnocratsCombatProtocols: false,
    attackerFederationEntrenchment: false,
    attackerFederationFuryOfTheFallen: false,
  }

  FACTION_ABILITY_DEFINITIONS.forEach((definition) => {
    if (!definition.engineConditionKey) return
    if (!isDefinitionEnabledInMode(definition, mode)) return
    const enabled = definition.appliesTo === 'defender'
      ? hasEnabledFactionAbility(defenderAbilities, defenderState, definition.effectKey)
      : hasEnabledFactionAbility(attackerAbilities, attackerState, definition.effectKey)
    if (enabled) conditions[definition.engineConditionKey] = true
  })

  return conditions
}

export const isFactionEffectEnabled = ({ abilities, stateMap, effectKey }) =>
  hasEnabledFactionAbility(abilities, stateMap, effectKey)

export const isFactionAbilityAvailableInMode = (effectKey, mode) => {
  const definition = findDefinitionByEffectKey(effectKey)
  if (!definition) return true
  return isDefinitionEnabledInMode(definition, mode)
}

export const buildFactionAbilityLogDetails = ({ result, lang, weapon }) => {
  const rulesApplied = result?.rulesApplied || []

  return FACTION_ABILITY_DEFINITIONS.map((definition) => {
    if (!definition.buildLogDetail) return null
    const hasRule = rulesApplied.some((rule) => {
      const normalized = normalizeRuleText(rule)
      return (definition.rulePrefixes || []).some((prefix) => normalized.startsWith(prefix))
    })
    const detail = definition.buildLogDetail({ lang, result, hasRule, weapon })
    if (!detail) return null
    return {
      ...detail,
      effectKey: definition.effectKey,
      phase: definition.logPhase || 'post',
    }
  }).filter(Boolean)
}
