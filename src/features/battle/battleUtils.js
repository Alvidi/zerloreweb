import { parseThreshold } from '../../utils/battleEngine.js'
import { resolveFactionAbilityEffectKey, implementedFactionAbilityKeys } from './factionAbilities.js'
import {
  findWeaponAbilityRaw,
  getWeaponAbilityConditionKey,
  hasWeaponAbilityId,
  parseWeaponAbility,
  WEAPON_ABILITY_IDS,
} from './weaponAbilities.js'

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const pickRandomItem = (items) => {
  if (!Array.isArray(items) || !items.length) return null
  return items[Math.floor(Math.random() * items.length)]
}

export const sanitizeUnitHp = (rawHp, unit) => {
  const maxHp = Math.max(0, toNumber(unit?.hp, 0))
  return clamp(toNumber(rawHp, maxHp), 0, maxHp)
}

export const isFactionData = (data) => data && data.faccion && Array.isArray(data.unidades)

const normalizeWeapon = (weapon, kind) => {
  const abilities = Array.isArray(weapon.habilidades_arma) ? weapon.habilidades_arma : []
  return {
    id: slugify(weapon.nombre || `${kind}-${Math.random().toString(36).slice(2, 8)}`),
    name: weapon.nombre || 'Arma',
    kind,
    attacks: weapon.ataques ?? weapon.atq ?? '1D',
    range: weapon.distancia ?? '-',
    hit: weapon.impactos ? String(weapon.impactos).replace(/^\+?(\d+)\+?$/, '$1+') : null,
    damage: weapon.danio ?? '1',
    critDamage: weapon.danio_critico ?? weapon.critico ?? weapon.danio ?? '1',
    extraValue: toNumber(weapon.valor_extra ?? 0),
    abilities,
    abilityEntries: abilities.map((ability) => parseWeaponAbility(ability)),
  }
}

const getFactionAbilityName = (ability) => {
  if (!ability || typeof ability !== 'object') return ''
  const nameKey = Object.keys(ability).find((key) => key !== 'id' && key !== 'descripcion')
  return nameKey ? String(ability[nameKey] || '').trim() : ''
}

const normalizeFactionAbility = (ability, index, factionId) => {
  const name = getFactionAbilityName(ability)
  const description = String(ability?.descripcion || '').trim()
  return {
    id: `${factionId || 'faction'}-ability-${index + 1}`,
    name,
    description,
    effectKey: resolveFactionAbilityEffectKey(name),
  }
}

const hiddenFactionAbilityNames = new Set(['potencia-blindada', 'armored-power'])

export { implementedFactionAbilityKeys }

const getMaxRangedWeapons = (unit, profile) => {
  const explicit = unit.max_armas_disparo ?? unit.maxArmasDisparo ?? profile?.max_armas_disparo
  if (explicit) return Math.max(1, toNumber(explicit, 1))
  const text = `${unit.especialidad || ''} ${profile?.especialidad || ''}`.toLowerCase()
  if (text.includes('dos armas') || text.includes('2 armas')) return 2
  return 1
}

const getEraToken = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (!normalized) return ''
  if (normalized.includes('futuro') || normalized.includes('future')) return 'future'
  if (normalized.includes('pasado') || normalized.includes('past')) return 'past'
  return ''
}

const splitEraValues = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
  const raw = String(value || '').trim()
  if (!raw) return []

  return raw
    .split(/\s*(?:,|\/|\+| y | and |&)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeEraEntries = (value) => {
  const seen = new Set()
  return splitEraValues(value)
    .map((label) => ({
      label,
      token: getEraToken(label) || 'neutral',
    }))
    .filter((entry) => {
      const key = `${entry.token}:${entry.label.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const normalizeUnit = (unit, index) => {
  const profile = unit.perfil || {}
  const rangedWeapons = (unit.armas?.disparo || []).map((weapon) => normalizeWeapon(weapon, 'ranged'))
  const meleeWeapons = (unit.armas?.cuerpo_a_cuerpo || []).map((weapon) => normalizeWeapon(weapon, 'melee'))
  const enabledRangedWeapons = meleeWeapons.length ? rangedWeapons : []
  const squadMinRaw = toNumber(profile?.escuadra?.min ?? 1, 1)
  const squadMaxRaw = toNumber(profile?.escuadra?.max ?? squadMinRaw, squadMinRaw)
  const squadMin = Math.max(1, squadMinRaw)
  const squadMax = Math.max(squadMin, squadMaxRaw)
  return {
    id: unit.id || slugify(unit.nombre_unidad || `unidad-${index + 1}`),
    name: unit.nombre_unidad || `Unidad ${index + 1}`,
    type: unit.clase || 'Línea',
    eras: normalizeEraEntries(unit.era || unit.zona_temporal || unit.periodo || unit.timeline || ''),
    movement: profile.movimiento ?? unit.movimiento ?? '-',
    hp: Math.max(1, toNumber(profile.vidas, 1)),
    saveLabel: String(profile.salvacion ?? unit.salvacion ?? '+4').replace(/^\+?(\d+)\+?$/, '$1+'),
    save: parseThreshold(profile.salvacion ?? '+4', 4),
    speed: profile.velocidad ?? unit.velocidad ?? '-',
    squadMin,
    squadMax,
    valueBase: toNumber(profile.valor ?? unit.valor_base ?? unit.valor ?? 0),
    specialty: profile.especialidad ?? unit.especialidad ?? '-',
    maxRangedWeapons: getMaxRangedWeapons(unit, profile),
    weapons: [
      ...enabledRangedWeapons,
      ...meleeWeapons,
    ],
  }
}

export const normalizeFaction = (data, baseId, index) => {
  const factionId = baseId || slugify(data.faccion?.nombre || `faccion-${index + 1}`)
  return {
    id: factionId,
    name: data.faccion?.nombre || `Facción ${index + 1}`,
    units: (data.unidades || []).map(normalizeUnit),
    abilities: (data.faccion?.habilidades_faccion || []).map((ability, abilityIndex) =>
      normalizeFactionAbility(ability, abilityIndex, factionId),
    ).filter((ability) => !hiddenFactionAbilityNames.has(slugify(ability?.name))),
  }
}

export const factionImages = {
  alianza: new URL('../../images/faccion/alianza.svg', import.meta.url).href,
  legionarios_crisol: new URL('../../images/faccion/legionarios_crisol.svg', import.meta.url).href,
  salvajes: new URL('../../images/faccion/salvajes.svg', import.meta.url).href,
  vacio: new URL('../../images/faccion/vacio.svg', import.meta.url).href,
  rebeldes: new URL('../../images/faccion/rebeldes.svg', import.meta.url).href,
  tecnotumbas: new URL('../../images/faccion/tecnotumbas.svg', import.meta.url).href,
  enjambre: new URL('../../images/faccion/enjambre.svg', import.meta.url).href,
  federacion: new URL('../../images/faccion/federacion.svg', import.meta.url).href,
  tecnocratas: new URL('../../images/faccion/tecnocratas.svg', import.meta.url).href,
}

export const makeHpKey = (side, factionId, unitId) => `${side}:${factionId || 'none'}:${unitId || 'none'}`
export const buildHpValues = (maxHp) => Array.from({ length: Math.max(0, maxHp) }, (_, index) => maxHp - index)
export const attackTypeOptions = ['ranged', 'melee', 'charge']
export const coverTypeOptions = ['none', 'partial']
export const CHARGE_DISTANCE_MIN = 2
export const CHARGE_DISTANCE_MAX = 12
export const chargeDistanceOptions = Array.from(
  { length: CHARGE_DISTANCE_MAX - CHARGE_DISTANCE_MIN + 1 },
  (_, index) => CHARGE_DISTANCE_MIN + index,
)

export const resolveMode = (attackType) => (attackType === 'ranged' ? 'ranged' : 'melee')

export const getWeaponSlotsForMode = (_unit, _mode, weaponCount) => {
  if (!weaponCount) return 0
  return 1
}

export const buildWeaponSelection = (rawIds, availableWeapons, slots) => {
  if (!slots || !availableWeapons.length) return []
  const validIds = (rawIds || []).filter((id) => availableWeapons.some((weapon) => weapon.id === id))
  const fallbackIds = availableWeapons.map((weapon) => weapon.id)
  return Array.from({ length: slots }, (_, index) => validIds[index] || fallbackIds[index] || fallbackIds[0])
}

export const pickWeaponIdsForMode = (unit, mode) => {
  const all = (unit?.weapons || []).filter((weapon) => weapon.kind === mode)
  const slots = getWeaponSlotsForMode(unit, mode, all.length)
  return all.slice(0, slots).map((weapon) => weapon.id)
}

export const pickRandomWeaponIdsForMode = (unit, mode) => {
  const all = (unit?.weapons || []).filter((weapon) => weapon.kind === mode)
  const slots = getWeaponSlotsForMode(unit, mode, all.length)
  if (!all.length || !slots) return []
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return Array.from({ length: slots }, (_, index) => shuffled[index % shuffled.length]?.id).filter(Boolean)
}

export const pickRandomUnitForMode = (faction, mode) => {
  const units = faction?.units || []
  if (!units.length) return null
  const withWeaponsForMode = units.filter((unit) => (unit.weapons || []).some((weapon) => weapon.kind === mode))
  return pickRandomItem(withWeaponsForMode.length ? withWeaponsForMode : units)
}

export const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

export const getConditionKeyForAbility = (ability) => getWeaponAbilityConditionKey(ability)

export const weaponHasAnyPrefix = (weapon, prefixes) =>
  (weapon?.abilities || []).some((ability) => prefixes.some((prefix) => normalizeText(ability).startsWith(prefix)))

export const weaponHasAbilityId = (weapon, abilityId) => hasWeaponAbilityId(weapon, abilityId)

export const getConditionSupport = (weapons, mode) => {
  if (mode !== 'ranged') {
    return { moved: false, halfRange: false, afterDash: false }
  }
  return {
    moved: weapons.some((weapon) => hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.heavy)),
    halfRange: weapons.some((weapon) => hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.quickAttack)),
    afterDash: weapons.some((weapon) => hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.guerrilla)),
  }
}

export const getLimitedAmmoMax = (weapon) => {
  const raw = findWeaponAbilityRaw(weapon, WEAPON_ABILITY_IDS.limitedAmmo)
  if (!raw) return null
  const match = String(raw).match(/\d+/)
  if (!match) return null
  const value = Number.parseInt(match[0], 10)
  return Number.isFinite(value) ? Math.max(0, value) : null
}

export const makeAmmoKey = (side, factionId, unitId, weaponId) =>
  `${side}:${factionId || 'none'}:${unitId || 'none'}:${weaponId || 'none'}`

const swapSidePrefixInKey = (key, leftPrefix, rightPrefix) => {
  if (key.startsWith(`${leftPrefix}:`)) return `${rightPrefix}:${key.slice(leftPrefix.length + 1)}`
  if (key.startsWith(`${rightPrefix}:`)) return `${leftPrefix}:${key.slice(rightPrefix.length + 1)}`
  return key
}

export const swapMapBySidePrefix = (map, leftPrefix, rightPrefix) =>
  Object.fromEntries(
    Object.entries(map || {}).map(([key, value]) => [swapSidePrefixInKey(key, leftPrefix, rightPrefix), value]),
  )

export const rollChargeDice = () => {
  const first = Math.floor(Math.random() * 6) + 1
  const second = Math.floor(Math.random() * 6) + 1
  return { first, second, total: first + second }
}

export const getUnitTypeToken = (type) => {
  const normalized = String(type || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('linea') || normalized.includes('line')) return 'line'
  if (normalized.includes('elite')) return 'elite'
  if (normalized.includes('vehiculo') || normalized.includes('vehicle')) return 'vehicle'
  if (normalized.includes('monstruo') || normalized.includes('monster')) return 'monster'
  if (normalized.includes('heroe') || normalized.includes('hero')) return 'hero'
  if (normalized.includes('titan') || normalized.includes('titante')) return 'titan'
  return 'line'
}
