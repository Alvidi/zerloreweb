export const WEAPON_ABILITY_IDS = {
  reliable:    'reliable',
  piercing:    'piercing',
  criticalHit: 'criticalHit',
  burst:       'burst',
  sure:        'sure',
  direct:      'direct',
  relentless:  'relentless',
  preciseShot: 'preciseShot',
  heavy:       'heavy',
}

export const normalizeAbilityText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

// Se compara el nombre entero, no el comienzo, para que "Certera" y
// "Disparo certero" no se confundan.
const ALIASES = [
  [WEAPON_ABILITY_IDS.reliable, ['fiable', 'reliable']],
  [WEAPON_ABILITY_IDS.piercing, ['perforante', 'piercing']],
  [WEAPON_ABILITY_IDS.criticalHit, ['golpe critico', 'critical hit']],
  [WEAPON_ABILITY_IDS.burst, ['rafaga', 'burst']],
  [WEAPON_ABILITY_IDS.sure, ['certera', 'sure']],
  [WEAPON_ABILITY_IDS.direct, ['directo', 'direct']],
  [WEAPON_ABILITY_IDS.relentless, ['implacable', 'relentless']],
  [WEAPON_ABILITY_IDS.preciseShot, ['disparo certero', 'precise shot']],
  [WEAPON_ABILITY_IDS.heavy, ['pesada', 'heavy']],
]

const ID_BY_ALIAS = new Map(ALIASES.flatMap(([id, aliases]) => aliases.map((alias) => [alias, id])))

export const getWeaponAbilityId = (rawAbility) => ID_BY_ALIAS.get(normalizeAbilityText(rawAbility)) || null
