export const WEAPON_ABILITY_IDS = {
  reliable:      'reliable',
  deadAngle:     'deadAngle',
  brutal:        'brutal',
  piercing:      'piercing',
  unstable:      'unstable',
  gunslinger:    'gunslinger',
  direct:        'direct',
  explosive:     'explosive',
  parabolicShot: 'parabolicShot',
  reach:         'reach',
  erratic:       'erratic',
  sweep:         'sweep',
}

export const normalizeAbilityText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

const WEAPON_ABILITY_DEFINITIONS = [
  { id: WEAPON_ABILITY_IDS.reliable,      aliases: ['fiable', 'reliable'],                                              conditionKey: null },
  { id: WEAPON_ABILITY_IDS.deadAngle,     aliases: ['angulo muerto', 'dead angle'],                                     conditionKey: null },
  { id: WEAPON_ABILITY_IDS.brutal,        aliases: ['brutal'],                                                           conditionKey: null },
  { id: WEAPON_ABILITY_IDS.piercing,      aliases: ['perforante', 'piercing'],                                           conditionKey: null },
  { id: WEAPON_ABILITY_IDS.unstable,      aliases: ['inestable', 'unstable'],                                            conditionKey: null },
  { id: WEAPON_ABILITY_IDS.gunslinger,    aliases: ['multiuso', 'multiusos', 'multi-use', 'multi use', 'multiuse'],      conditionKey: null },
  { id: WEAPON_ABILITY_IDS.direct,        aliases: ['directo', 'straight', 'direct'],                                   conditionKey: null },
  { id: WEAPON_ABILITY_IDS.explosive,     aliases: ['explosiva', 'explosive'],                                           conditionKey: null },
  { id: WEAPON_ABILITY_IDS.parabolicShot, aliases: ['parabolica', 'disparo parabolico', 'arcing', 'parabolic shot', 'indirect fire'], conditionKey: null },
  { id: WEAPON_ABILITY_IDS.reach,         aliases: ['alcance', 'reach'],                                                 conditionKey: null },
  { id: WEAPON_ABILITY_IDS.erratic,       aliases: ['erratica', 'erratic'],                                              conditionKey: null },
  { id: WEAPON_ABILITY_IDS.sweep,         aliases: ['barrido', 'sweep'],                                                 conditionKey: null },
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
