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

const FACTION_ABILITY_DEFINITIONS = [
  {
    effectKey: 'alliance_target_in_sight',
    nameTokens: ['objetivo-en-la-mira', 'target-in-sight'],
    appliesTo: 'attacker',
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
      if (!rerolledEntries.length) return null
      return {
        text: t(
          lang,
          'Objetivo en la mira activo: esta unidad repite impactos fallidos contra el objetivo marcado.',
          'Target in sight active: this unit rerolls failed hit rolls against the marked target.',
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
    effectKey: 'alliance_martial_resistance',
    nameTokens: ['resistencia-marcial', 'martial-resistance'],
    appliesTo: 'defender',
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
]

const isDefinitionEnabledInMode = (definition, mode) =>
  !Array.isArray(definition.modes) || definition.modes.includes(mode)

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
    attackerVoracity: false,
    defenderMartialResistance: false,
    defenderCrucibleGlory: false,
    attackerCrucibleSacredVow: false,
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

export const buildFactionAbilityLogDetails = ({ result, lang }) => {
  const rulesApplied = result?.rulesApplied || []

  return FACTION_ABILITY_DEFINITIONS.map((definition) => {
    if (!definition.buildLogDetail) return null
    const hasRule = rulesApplied.some((rule) => {
      const normalized = normalizeRuleText(rule)
      return (definition.rulePrefixes || []).some((prefix) => normalized.startsWith(prefix))
    })
    return definition.buildLogDetail({ lang, result, hasRule })
  }).filter(Boolean)
}
