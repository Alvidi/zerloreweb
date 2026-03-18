export const WEAPON_ABILITY_IDS = {
  assaulter: 'assaulter',
  heavy: 'heavy',
  quickAttack: 'quickAttack',
  gunslinger: 'gunslinger',
  explosive: 'explosive',
  criticalAttack: 'criticalAttack',
  chainedImpacts: 'chainedImpacts',
  precision: 'precision',
  anti: 'anti',
  ignoreCover: 'ignoreCover',
  parabolicShot: 'parabolicShot',
  unstable: 'unstable',
  direct: 'direct',
  guerrilla: 'guerrilla',
  limitedAmmo: 'limitedAmmo',
}

export const normalizeAbilityText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const WEAPON_ABILITY_DEFINITIONS = [
  { id: WEAPON_ABILITY_IDS.assaulter, aliases: ['asaltante', 'raider'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.heavy, aliases: ['pesada', 'heavy'], conditionKey: 'moved' },
  { id: WEAPON_ABILITY_IDS.quickAttack, aliases: ['ataque rapido', 'quick attack'], conditionKey: 'halfRange' },
  { id: WEAPON_ABILITY_IDS.gunslinger, aliases: ['pistolero', 'gunslinger'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.explosive, aliases: ['explosiva', 'explosive'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.criticalAttack, aliases: ['ataque critico', 'critical attack'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.chainedImpacts, aliases: ['impactos encadenados', 'chained impacts'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.precision, aliases: ['precision'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.anti, aliases: ['anti'], conditionKey: null },
  {
    id: WEAPON_ABILITY_IDS.ignoreCover,
    aliases: ['ignora coberturas', 'ignora cobertura', 'ignore coverage', 'ignore coverages', 'ignore cover'],
    conditionKey: null,
  },
  {
    id: WEAPON_ABILITY_IDS.parabolicShot,
    aliases: ['disparo parabolico', 'parabolic shot', 'indirect fire'],
    conditionKey: null,
  },
  { id: WEAPON_ABILITY_IDS.unstable, aliases: ['inestable', 'unstable'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.direct, aliases: ['directo', 'straight', 'direct'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.guerrilla, aliases: ['guerrilla'], conditionKey: 'afterDash' },
  { id: WEAPON_ABILITY_IDS.limitedAmmo, aliases: ['municion limitada', 'limited ammo'], conditionKey: null },
]

const definitionById = new Map(WEAPON_ABILITY_DEFINITIONS.map((definition) => [definition.id, definition]))

export const getWeaponAbilityDefinition = (abilityId) => definitionById.get(abilityId) || null

const matchesAlias = (normalizedText, aliases) =>
  aliases.some((alias) => normalizedText.startsWith(normalizeAbilityText(alias)))

export const getWeaponAbilityId = (rawAbility) => {
  const normalized = normalizeAbilityText(rawAbility)
  const definition = WEAPON_ABILITY_DEFINITIONS.find((item) => matchesAlias(normalized, item.aliases))
  return definition?.id || null
}

export const parseWeaponAbility = (rawAbility) => ({
  id: getWeaponAbilityId(rawAbility),
  raw: String(rawAbility || '').trim(),
  normalized: normalizeAbilityText(rawAbility),
})

const getWeaponAbilityEntries = (weapon) => {
  if (Array.isArray(weapon?.abilityEntries) && weapon.abilityEntries.length > 0) {
    return weapon.abilityEntries
  }
  return (weapon?.abilities || []).map((rawAbility) => parseWeaponAbility(rawAbility))
}

export const findWeaponAbilityRaw = (weapon, abilityId) => {
  const entry = getWeaponAbilityEntries(weapon).find((item) => item.id === abilityId)
  return entry?.raw || null
}

export const hasWeaponAbilityId = (weapon, abilityId) => Boolean(findWeaponAbilityRaw(weapon, abilityId))

export const getWeaponAbilityNumericValue = (weapon, abilityId, fallback = 0) => {
  const raw = findWeaponAbilityRaw(weapon, abilityId)
  if (!raw) return fallback
  const num = String(raw).match(/[+-]?\s*\d+/)
  if (!num) return fallback
  const parsed = Number.parseInt(num[0].replace(/\s+/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const getWeaponAbilityConditionKey = (rawAbility) => {
  const abilityId = getWeaponAbilityId(rawAbility)
  if (!abilityId) return null
  return getWeaponAbilityDefinition(abilityId)?.conditionKey || null
}

export const isWeaponAbilityRule = (ruleText) => Boolean(getWeaponAbilityId(ruleText))

