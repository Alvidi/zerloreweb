import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { getAbilityLabel, getAbilityDescription } from '../utils/abilities.js'
import { parseThreshold, resolveAttack } from '../utils/battleEngine.js'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const pickRandomItem = (items) => {
  if (!Array.isArray(items) || !items.length) return null
  return items[Math.floor(Math.random() * items.length)]
}
const sanitizeUnitHp = (rawHp, unit) => {
  const maxHp = Math.max(0, toNumber(unit?.hp, 0))
  return clamp(toNumber(rawHp, maxHp), 0, maxHp)
}

const isFactionData = (data) => data && data.faccion && Array.isArray(data.unidades)

const normalizeWeapon = (weapon, kind) => ({
  id: slugify(weapon.nombre || `${kind}-${Math.random().toString(36).slice(2, 8)}`),
  name: weapon.nombre || 'Arma',
  kind,
  attacks: weapon.ataques ?? weapon.atq ?? '1D',
  range: weapon.distancia ?? '-',
  hit: weapon.impactos ? String(weapon.impactos).replace(/^\+?(\d+)\+?$/, '$1+') : null,
  damage: weapon.danio ?? '1',
  critDamage: weapon.danio_critico ?? weapon.critico ?? weapon.danio ?? '1',
  extraValue: toNumber(weapon.valor_extra ?? 0),
  abilities: Array.isArray(weapon.habilidades_arma) ? weapon.habilidades_arma : [],
})

const getMaxRangedWeapons = (unit, profile) => {
  const explicit = unit.max_armas_disparo ?? unit.maxArmasDisparo ?? profile?.max_armas_disparo
  if (explicit) return Math.max(1, toNumber(explicit, 1))
  const text = `${unit.especialidad || ''} ${profile?.especialidad || ''}`.toLowerCase()
  if (text.includes('dos armas') || text.includes('2 armas')) return 2
  return 1
}

const normalizeUnit = (unit, index) => {
  const profile = unit.perfil || {}
  const rangedWeapons = (unit.armas?.disparo || []).map((weapon) => normalizeWeapon(weapon, 'ranged'))
  const meleeWeapons = (unit.armas?.cuerpo_a_cuerpo || []).map((weapon) => normalizeWeapon(weapon, 'melee'))
  const enabledRangedWeapons = meleeWeapons.length ? rangedWeapons : []
  return {
    id: unit.id || slugify(unit.nombre_unidad || `unidad-${index + 1}`),
    name: unit.nombre_unidad || `Unidad ${index + 1}`,
    type: unit.clase || 'Línea',
    movement: profile.movimiento ?? unit.movimiento ?? '-',
    hp: Math.max(1, toNumber(profile.vidas, 1)),
    saveLabel: String(profile.salvacion ?? unit.salvacion ?? '+4').replace(/^\+?(\d+)\+?$/, '$1+'),
    save: parseThreshold(profile.salvacion ?? '+4', 4),
    speed: profile.velocidad ?? unit.velocidad ?? '-',
    valueBase: toNumber(profile.valor ?? unit.valor_base ?? unit.valor ?? 0),
    specialty: profile.especialidad ?? unit.especialidad ?? '-',
    maxRangedWeapons: getMaxRangedWeapons(unit, profile),
    weapons: [
      ...enabledRangedWeapons,
      ...meleeWeapons,
    ],
  }
}

const normalizeFaction = (data, baseId, index) => ({
  id: baseId || slugify(data.faccion?.nombre || `faccion-${index + 1}`),
  name: data.faccion?.nombre || `Facción ${index + 1}`,
  units: (data.unidades || []).map(normalizeUnit),
})

const factionImages = {
  alianza: new URL('../images/faccion/alianza.svg', import.meta.url).href,
  legionarios_crisol: new URL('../images/faccion/legionarios_crisol.svg', import.meta.url).href,
  salvajes: new URL('../images/faccion/salvajes.svg', import.meta.url).href,
  vacio: new URL('../images/faccion/vacio.svg', import.meta.url).href,
  rebeldes: new URL('../images/faccion/rebeldes.svg', import.meta.url).href,
  tecnotumbas: new URL('../images/faccion/tecnotumbas.svg', import.meta.url).href,
  enjambre: new URL('../images/faccion/enjambre.svg', import.meta.url).href,
  federacion: new URL('../images/faccion/federacion.svg', import.meta.url).href,
  tecnocratas: new URL('../images/faccion/tecnocratas.svg', import.meta.url).href,
}

const makeHpKey = (side, factionId, unitId) => `${side}:${factionId || 'none'}:${unitId || 'none'}`
const buildHpValues = (maxHp) => Array.from({ length: Math.max(0, maxHp) }, (_, index) => maxHp - index)
const attackTypeOptions = ['ranged', 'melee', 'charge']
const coverTypeOptions = ['none', 'partial', 'height']
const CHARGE_DISTANCE_MIN = 2
const CHARGE_DISTANCE_MAX = 12
const chargeDistanceOptions = Array.from(
  { length: CHARGE_DISTANCE_MAX - CHARGE_DISTANCE_MIN + 1 },
  (_, index) => CHARGE_DISTANCE_MIN + index,
)
const resolveMode = (attackType) => (attackType === 'ranged' ? 'ranged' : 'melee')
const getWeaponSlotsForMode = (_unit, _mode, weaponCount) => {
  if (!weaponCount) return 0
  return 1
}
const buildWeaponSelection = (rawIds, availableWeapons, slots) => {
  if (!slots || !availableWeapons.length) return []
  const validIds = (rawIds || []).filter((id) => availableWeapons.some((weapon) => weapon.id === id))
  const fallbackIds = availableWeapons.map((weapon) => weapon.id)
  return Array.from({ length: slots }, (_, index) => validIds[index] || fallbackIds[index] || fallbackIds[0])
}
const pickWeaponIdsForMode = (unit, mode) => {
  const all = (unit?.weapons || []).filter((weapon) => weapon.kind === mode)
  const slots = getWeaponSlotsForMode(unit, mode, all.length)
  return all.slice(0, slots).map((weapon) => weapon.id)
}
const pickRandomWeaponIdsForMode = (unit, mode) => {
  const all = (unit?.weapons || []).filter((weapon) => weapon.kind === mode)
  const slots = getWeaponSlotsForMode(unit, mode, all.length)
  if (!all.length || !slots) return []
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  return Array.from({ length: slots }, (_, index) => shuffled[index % shuffled.length]?.id).filter(Boolean)
}
const pickRandomUnitForMode = (faction, mode) => {
  const units = faction?.units || []
  if (!units.length) return null
  const withWeaponsForMode = units.filter((unit) => (unit.weapons || []).some((weapon) => weapon.kind === mode))
  return pickRandomItem(withWeaponsForMode.length ? withWeaponsForMode : units)
}
const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
const LIMITED_AMMO_PREFIXES = ['municion limitada', 'limited ammo']
const HEAVY_PREFIXES = ['pesada', 'heavy']
const QUICK_ATTACK_PREFIXES = ['ataque rapido', 'quick attack']
const PARABOLIC_PREFIXES = ['disparo parabolico', 'parabolic shot', 'indirect fire']
const GUERRILLA_PREFIXES = ['guerrilla']
const DIRECT_PREFIXES = ['directo', 'straight', 'direct']
const getConditionKeyForAbility = (ability) => {
  const normalized = normalizeText(ability)
  if (HEAVY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'moved'
  if (QUICK_ATTACK_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'halfRange'
  if (GUERRILLA_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'afterDash'
  return null
}
const weaponHasAnyPrefix = (weapon, prefixes) =>
  (weapon?.abilities || []).some((ability) => prefixes.some((prefix) => normalizeText(ability).startsWith(prefix)))
const getConditionSupport = (weapons, mode) => {
  if (mode !== 'ranged') {
    return { moved: false, halfRange: false, noLineOfSight: false, afterDash: false }
  }
  return {
    moved: weapons.some((weapon) => weaponHasAnyPrefix(weapon, HEAVY_PREFIXES)),
    halfRange: weapons.some((weapon) => weaponHasAnyPrefix(weapon, QUICK_ATTACK_PREFIXES)),
    // Line of sight is a battlefield condition; parabolic weapons only modify its effect.
    noLineOfSight: true,
    afterDash: weapons.some((weapon) => weaponHasAnyPrefix(weapon, GUERRILLA_PREFIXES)),
  }
}
const getLimitedAmmoMax = (weapon) => {
  const raw = (weapon?.abilities || []).find((ability) =>
    LIMITED_AMMO_PREFIXES.some((prefix) => normalizeText(ability).startsWith(prefix)),
  )
  if (!raw) return null
  const match = String(raw).match(/\d+/)
  if (!match) return null
  const value = Number.parseInt(match[0], 10)
  return Number.isFinite(value) ? Math.max(0, value) : null
}
const makeAmmoKey = (side, factionId, unitId, weaponId) =>
  `${side}:${factionId || 'none'}:${unitId || 'none'}:${weaponId || 'none'}`
const swapSidePrefixInKey = (key, leftPrefix, rightPrefix) => {
  if (key.startsWith(`${leftPrefix}:`)) return `${rightPrefix}:${key.slice(leftPrefix.length + 1)}`
  if (key.startsWith(`${rightPrefix}:`)) return `${leftPrefix}:${key.slice(rightPrefix.length + 1)}`
  return key
}
const swapMapBySidePrefix = (map, leftPrefix, rightPrefix) =>
  Object.fromEntries(
    Object.entries(map || {}).map(([key, value]) => [swapSidePrefixInKey(key, leftPrefix, rightPrefix), value]),
  )
const parseSpeedValue = (unit) => {
  const match = String(unit?.speed ?? '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : 0
}
const rollChargeDice = () => {
  const first = Math.floor(Math.random() * 6) + 1
  const second = Math.floor(Math.random() * 6) + 1
  return { first, second, total: first + second }
}
const getUnitTypeToken = (type) => {
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

function UnitTypeBadge({ type }) {
  const token = getUnitTypeToken(type)
  const iconProps = { viewBox: '0 0 24 24', className: 'unit-type-icon', 'aria-hidden': true }

  const renderIcon = () => {
    if (token === 'line') {
      return (
        <svg {...iconProps}>
          <path d="M5 18H19L17 7H7Z" />
          <path d="M9 7V5H15V7" />
        </svg>
      )
    }
    if (token === 'elite') {
      return (
        <svg {...iconProps}>
          <path d="M12 3L16 8L21 12L16 16L12 21L8 16L3 12L8 8Z" />
        </svg>
      )
    }
    if (token === 'vehicle') {
      return (
        <svg {...iconProps}>
          <rect x="4" y="8" width="16" height="8" rx="1" />
          <circle cx="8" cy="17.5" r="1.5" />
          <circle cx="16" cy="17.5" r="1.5" />
        </svg>
      )
    }
    if (token === 'monster') {
      return (
        <svg {...iconProps}>
          <path d="M5 20L8 9L11 15L14 8L17 14L19 6" />
        </svg>
      )
    }
    if (token === 'hero') {
      return (
        <svg {...iconProps}>
          <path d="M4 16L6 8L10 12L12 6L14 12L18 8L20 16Z" />
          <path d="M7 18H17" />
        </svg>
      )
    }
    if (token === 'titan') {
      return (
        <svg {...iconProps}>
          <rect x="7" y="4" width="10" height="16" />
          <path d="M10 8H14" />
          <path d="M10 12H14" />
          <path d="M10 16H14" />
        </svg>
      )
    }
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="7" />
      </svg>
    )
  }

  return (
    <span className={`unit-type-badge unit-type-${token}`}>
      {renderIcon()}
      <span>{type}</span>
    </span>
  )
}

function Batalla() {
  const { lang } = useI18n()
  const tx = useMemo(
    () =>
      lang === 'en'
        ? {
          eyebrow: 'Battle',
          title: 'Combat Resolution',
          subtitle: 'Choose attacker and defender. Select their weapons and resolve the combat in one click.',
          attacker: 'Attacker',
          defender: 'Defender',
          faction: 'Faction',
          unit: 'Unit',
          weapon: 'Weapon',
          weapons: 'Weapons',
          ranged: 'Ranged',
          melee: 'Melee',
          charge: 'Charge + Melee',
          attackType: 'Attack Type',
          conditions: 'Combat Conditions',
          coverType: 'Cover',
          coverNone: 'No cover',
          coverPartial: 'Partial cover',
          coverHeight: 'High cover',
          moved: 'Moved this turn',
          halfRange: 'Half range',
          noLineOfSight: 'No line of sight',
          engaged: 'Engaged in melee',
          afterDash: 'After dash',
          chargeDistance: 'Charge distance',
          chargeRoll: 'Charge roll',
          chargeSuccess: 'Charge successful',
          chargeFailed: 'Charge failed',
          outOfAmmo: 'Out of ammo',
          ammo: 'Ammo',
          firstBySpeed: 'Attacks first by speed',
          mov: 'Mov',
          vidas: 'HP',
          salv: 'Save',
          vel: 'Spd',
          weaponAtq: 'Atk',
          weaponDist: 'Range',
          weaponImp: 'Hit',
          weaponDamage: 'Damage',
          weaponCrit: 'Critical',
          weaponSkills: 'Abilities',
          valueUnit: 'VALUE',
          resolve: 'Resolve Combat',
          random: 'Random',
          reset: 'Reset',
          flip: 'Flip',
          combatLog: 'Combat Log',
          emptyLog: 'Press resolve to run the combat.',
          noWeapons: 'No weapons available for this attack type.',
          attackRoll: 'Attack roll',
          saveRoll: 'Defense roll',
          damage: 'Damage',
          result: 'Result',
          attackStep: 'Attack',
          counterStep: 'Counter',
          counterattack: 'Counterattack',
          blocked: 'Attack blocked',
          hp: 'HP',
          save: 'Save',
          steps: 'steps',
        }
        : {
          eyebrow: 'Batalla',
          title: 'Resolución de combate',
          subtitle: 'Elige atacante y defensor. Selecciona sus armas y resuelve el combate con un clic.',
          attacker: 'Atacante',
          defender: 'Defensor',
          faction: 'Facción',
          unit: 'Unidad',
          weapon: 'Arma',
          weapons: 'Armas',
          ranged: 'Disparo',
          melee: 'Cuerpo a cuerpo',
          charge: 'Carga + CaC',
          attackType: 'Tipo de ataque',
          conditions: 'Condiciones de combate',
          coverType: 'Cobertura',
          coverNone: 'Sin cobertura',
          coverPartial: 'Cobertura parcial',
          coverHeight: 'Cobertura de altura',
          moved: 'Se ha movido',
          halfRange: 'Media distancia',
          noLineOfSight: 'Sin línea de visión',
          engaged: 'Trabada en CaC',
          afterDash: 'Tras carrera',
          chargeDistance: 'Distancia de carga',
          chargeRoll: 'Tirada de carga',
          chargeSuccess: 'Carga exitosa',
          chargeFailed: 'Carga fallida',
          outOfAmmo: 'Sin munición',
          ammo: 'Munición',
          firstBySpeed: 'Ataca primero por velocidad',
          mov: 'Mov',
          vidas: 'Vidas',
          salv: 'Salv',
          vel: 'Vel',
          weaponAtq: 'Atq',
          weaponDist: 'Dist',
          weaponImp: 'Imp',
          weaponDamage: 'Daño',
          weaponCrit: 'Crítico',
          weaponSkills: 'Habilidades',
          valueUnit: 'VALOR',
          resolve: 'Resolución',
          random: 'Aleatorio',
          reset: 'Reset',
          flip: 'Flip',
          combatLog: 'Registro de combate',
          emptyLog: 'Pulsa resolución para ejecutar el combate.',
          noWeapons: 'No hay armas disponibles para este tipo de ataque.',
          attackRoll: 'Tirada de ataque',
          saveRoll: 'Tirada de defensa',
          damage: 'Daño',
          result: 'Resultado',
          attackStep: 'Ataque',
          counterStep: 'Contra',
          counterattack: 'Contraataque',
          blocked: 'Ataque bloqueado',
          hp: 'Vidas',
          save: 'Salvación',
          steps: 'pasos',
        },
    [lang],
  )

  const factions = useMemo(() => {
    return buildLocalizedFactionEntries(factionModules, lang)
      .map((item, index) => {
        if (!isFactionData(item.data)) return null
        return normalizeFaction(item.data, item.base, index)
      })
      .filter(Boolean)
  }, [lang])

  const [left, setLeft] = useState({ factionId: '', unitId: '', weaponIds: [] })
  const [right, setRight] = useState({ factionId: '', unitId: '', weaponIds: [] })
  const [attackType, setAttackType] = useState('ranged')
  const [leftCoverType, setLeftCoverType] = useState('none')
  const [rightCoverType, setRightCoverType] = useState('none')
  const [leftMoved, setLeftMoved] = useState(false)
  const [rightMoved, setRightMoved] = useState(false)
  const [leftHalfRange, setLeftHalfRange] = useState(false)
  const [rightHalfRange, setRightHalfRange] = useState(false)
  const [leftNoLineOfSight, setLeftNoLineOfSight] = useState(false)
  const [rightNoLineOfSight, setRightNoLineOfSight] = useState(false)
  const [leftAfterDash, setLeftAfterDash] = useState(false)
  const [rightAfterDash, setRightAfterDash] = useState(false)
  const [chargeDistance, setChargeDistance] = useState(7)
  const [hpMap, setHpMap] = useState({})
  const [ammoMap, setAmmoMap] = useState({})
  const [logEntries, setLogEntries] = useState([])
  const [isResolving, setIsResolving] = useState(false)
  const [defenderCounterattack, setDefenderCounterattack] = useState(true)
  const timersRef = useRef([])
  const resolveRunRef = useRef(0)
  const mode = resolveMode(attackType)
  const canCounterByMode = mode === 'melee' || attackType === 'ranged'
  const isCounterattackEnabled = canCounterByMode && defenderCounterattack

  const factionById = useMemo(() => new Map(factions.map((faction) => [faction.id, faction])), [factions])

  const leftFactionId = left.factionId && factionById.has(left.factionId) ? left.factionId : factions[0]?.id || ''
  const rightFactionId = right.factionId && factionById.has(right.factionId) ? right.factionId : factions[0]?.id || ''

  const leftFaction = factionById.get(leftFactionId) || null
  const rightFaction = factionById.get(rightFactionId) || null

  const leftUnitId =
    left.unitId && leftFaction?.units.some((unit) => unit.id === left.unitId) ? left.unitId : leftFaction?.units[0]?.id || ''
  const rightUnitId =
    right.unitId && rightFaction?.units.some((unit) => unit.id === right.unitId) ? right.unitId : rightFaction?.units[0]?.id || ''

  const leftUnit = leftFaction?.units.find((unit) => unit.id === leftUnitId) || null
  const rightUnit = rightFaction?.units.find((unit) => unit.id === rightUnitId) || null
  const leftWeapons = leftUnit?.weapons.filter((weapon) => weapon.kind === mode) || []
  const rightWeapons = rightUnit?.weapons.filter((weapon) => weapon.kind === mode) || []
  const leftWeaponSlots = getWeaponSlotsForMode(leftUnit, mode, leftWeapons.length)
  const rightWeaponSlots = getWeaponSlotsForMode(rightUnit, mode, rightWeapons.length)

  const safeLeftWeaponIds = buildWeaponSelection(
    left.weaponIds?.slice(0, leftWeaponSlots).length ? left.weaponIds : pickWeaponIdsForMode(leftUnit, mode),
    leftWeapons,
    leftWeaponSlots,
  )
  const safeRightWeaponIds = buildWeaponSelection(
    right.weaponIds?.slice(0, rightWeaponSlots).length ? right.weaponIds : pickWeaponIdsForMode(rightUnit, mode),
    rightWeapons,
    rightWeaponSlots,
  )

  const leftSelectedWeapons = safeLeftWeaponIds
    .map((weaponId) => leftWeapons.find((weapon) => weapon.id === weaponId))
    .filter(Boolean)
  const rightSelectedWeapons = safeRightWeaponIds
    .map((weaponId) => rightWeapons.find((weapon) => weapon.id === weaponId))
    .filter(Boolean)
  const leftConditionSupport = getConditionSupport(leftSelectedWeapons, mode)
  const rightConditionSupport = getConditionSupport(rightSelectedWeapons, mode)

  const leftPrimaryWeaponId = leftSelectedWeapons[0]?.id || ''
  const rightPrimaryWeaponId = rightSelectedWeapons[0]?.id || ''
  const getWeaponAmmoInfo = (side, factionId, unit, weapon, pendingSpend = {}) => {
    const maxAmmo = getLimitedAmmoMax(weapon)
    if (!maxAmmo && maxAmmo !== 0) {
      return { limited: false, max: null, used: 0, remaining: null, key: null }
    }
    const key = makeAmmoKey(side, factionId, unit?.id, weapon?.id)
    const used = Math.max(0, (ammoMap[key] || 0) + (pendingSpend[key] || 0))
    const remaining = Math.max(0, maxAmmo - used)
    return { limited: true, max: maxAmmo, used, remaining, key }
  }

  const leftHpKey = makeHpKey('L', leftFactionId, leftUnit?.id)
  const rightHpKey = makeHpKey('R', rightFactionId, rightUnit?.id)

  const leftHp = sanitizeUnitHp(hpMap[leftHpKey], leftUnit)
  const rightHp = sanitizeUnitHp(hpMap[rightHpKey], rightUnit)

  const setUnitHp = (side, factionId, unit, rawValue) => {
    if (!unit) return
    const key = makeHpKey(side, factionId, unit.id)
    const next = clamp(toNumber(rawValue, unit.hp), 0, unit.hp)
    setHpMap((prev) => ({ ...prev, [key]: next }))
  }

  const setWeaponAtSlot = (side, slotIndex, weaponId, availableWeapons, slots, activeIds) => {
    const setSide = side === 'left' ? setLeft : setRight
    setSide((prev) => {
      const nextIds = buildWeaponSelection(activeIds, availableWeapons, slots)
      if (slotIndex >= 0 && slotIndex < nextIds.length) {
        nextIds[slotIndex] = weaponId
      }
      return { ...prev, weaponIds: nextIds }
    })
  }

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(
    () => () => {
      clearTimers()
    },
    [],
  )

  const playLog = (entries) => {
    const runId = resolveRunRef.current + 1
    resolveRunRef.current = runId
    clearTimers()
    setLogEntries([])
    if (!entries.length) {
      setIsResolving(false)
      return
    }
    setIsResolving(true)
    const stepMs = entries.length > 8 ? 160 : 230

    entries.forEach((entry, index) => {
      const timer = setTimeout(() => {
        if (resolveRunRef.current !== runId) return
        setLogEntries((prev) => [...prev, entry])
      }, stepMs * (index + 1))
      timersRef.current.push(timer)
    })

    const totalMs = stepMs * (entries.length + 1)
    const finish = setTimeout(() => {
      if (resolveRunRef.current !== runId) return
      setIsResolving(false)
    }, totalMs)
    timersRef.current.push(finish)

    const safety = setTimeout(() => {
      if (resolveRunRef.current !== runId) return
      setIsResolving(false)
      clearTimers()
    }, totalMs + 1200)
    timersRef.current.push(safety)
  }

  const currentModeLabel = attackType === 'charge' ? tx.charge : mode === 'ranged' ? tx.ranged : tx.melee
  const getAbilityConditionBinding = (side, rawAbility) => {
    const key = getConditionKeyForAbility(rawAbility)
    if (!key) return null
    const support = side === 'left' ? leftConditionSupport : rightConditionSupport
    if (!support[key]) return null

    if (side === 'left') {
      if (key === 'moved') return { checked: leftMoved, setChecked: setLeftMoved, label: tx.moved }
      if (key === 'halfRange') return { checked: leftHalfRange, setChecked: setLeftHalfRange, label: tx.halfRange }
      if (key === 'noLineOfSight') return { checked: leftNoLineOfSight, setChecked: setLeftNoLineOfSight, label: tx.noLineOfSight }
      if (key === 'afterDash') return { checked: leftAfterDash, setChecked: setLeftAfterDash, label: tx.afterDash }
      return null
    }

    if (key === 'moved') return { checked: rightMoved, setChecked: setRightMoved, label: tx.moved }
    if (key === 'halfRange') return { checked: rightHalfRange, setChecked: setRightHalfRange, label: tx.halfRange }
    if (key === 'noLineOfSight') return { checked: rightNoLineOfSight, setChecked: setRightNoLineOfSight, label: tx.noLineOfSight }
    if (key === 'afterDash') return { checked: rightAfterDash, setChecked: setRightAfterDash, label: tx.afterDash }
    return null
  }
  const abilityRulePrefixes = [
    'asaltante',
    'raider',
    'pesada',
    'heavy',
    'ataque rapido',
    'quick attack',
    'pistolero',
    'gunslinger',
    'explosiva',
    'explosive',
    'ataque critico',
    'critical attack',
    'impactos encadenados',
    'chained impacts',
    'precision',
    'anti',
    'ignora coberturas',
    'ignore coverage',
    'disparo parabolico',
    'parabolic shot',
    'indirect fire',
    'inestable',
    'unstable',
    'directo',
    'straight',
    'direct',
    'guerrilla',
    'municion limitada',
    'limited ammo',
  ]
  const isAbilityRule = (rule) => {
    const normalized = normalizeText(rule)
    return abilityRulePrefixes.some((prefix) => normalized.startsWith(prefix))
  }

  const buildAbilityNotes = (weapon) =>
    (weapon?.abilities || [])
      .map((ability) => ({
        raw: ability,
        label: getAbilityLabel(ability, lang),
        description: getAbilityDescription(ability, lang),
      }))
      .filter((item) => item.label)
  const summarizeRollOutcomes = (rollEntries) => {
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
  const getScatterDirectionLabel = (direction) => {
    if (!direction) return ''
    if (lang === 'en') return direction
    return direction
  }

  const buildCombatEntry = ({
    key,
    title,
    attackerName,
    defenderName,
    weapon,
    attackerHpBefore,
    defenderHpBefore,
    result,
  }) => {
    const weaponName = weapon?.name || ''
    const attackerFinalHp = result.attackerAfter?.hp ?? attackerHpBefore ?? 0
    const defenderFinalHp = result.defenderAfter?.hp ?? defenderHpBefore ?? 0

    if (result.blocked) {
      return {
        key,
        title,
        subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
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
        attackCountDice: [],
        attackDice: [],
        defenseDice: [],
        resultState: {
          attacker: { name: attackerName, hp: attackerFinalHp, defeated: attackerFinalHp <= 0 },
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
    const appliedAbilityRules = (result.rulesApplied || []).filter((rule) => isAbilityRule(rule))
    const abilityDetails = []
    const pushAbilityDetail = (esText, enText, dice = []) => {
      abilityDetails.push({
        text: lang === 'en' ? enText : esText,
        dice,
      })
    }
    const allHitEntries = result.hitEntries || []
    const precisionRerolls = (result.hitEntries || []).filter((entry) => entry.rerolled)
    if (weaponHasAnyPrefix(weapon, ['precision'])) {
      if (precisionRerolls.length) {
        const failedInitials = precisionRerolls.map((entry) => entry.initialRoll)
        const rerollHits = precisionRerolls.filter((entry) => entry.outcome === 'hit').length
        const rerollCrits = precisionRerolls.filter((entry) => entry.outcome === 'crit').length
        const rerollFails = precisionRerolls.filter((entry) => entry.outcome === 'fail').length

        pushAbilityDetail(
          `Precisión repite fallos [${failedInitials.join(', ')}] con nuevos dados: ${rerollHits} impactos, ${rerollCrits} críticos y ${rerollFails} fallos.`,
          `Precision rerolls failed rolls [${failedInitials.join(', ')}] with new dice: ${rerollHits} hits, ${rerollCrits} crits and ${rerollFails} fails.`,
          precisionRerolls.map((entry) => ({
            value: entry.roll,
            outcome: entry.outcome,
          })),
        )
      }
    }
    const chainedEntries = allHitEntries.filter((entry) => entry.source === 'chain' && Number.isFinite(entry.roll))
    if (chainedEntries.length > 0) {
      const chainedHits = chainedEntries.filter((entry) => entry.outcome === 'hit').length
      const chainedCrits = chainedEntries.filter((entry) => entry.outcome === 'crit').length
      const chainedFails = chainedEntries.filter((entry) => entry.outcome === 'fail').length
      pushAbilityDetail(
        `Impactos encadenados añade ${chainedEntries.length} tirada${chainedEntries.length > 1 ? 's' : ''}: ${chainedHits} impactos, ${chainedCrits} críticos y ${chainedFails} fallos.`,
        `Chained Impacts adds ${chainedEntries.length} extra roll${chainedEntries.length > 1 ? 's' : ''}: ${chainedHits} hits, ${chainedCrits} crits and ${chainedFails} fails.`,
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
      const scatterDirection = getScatterDirectionLabel(scatter.direction)
      const scatterTextEs = scatter.bullseye
        ? 'Disparo parabólico: diana. Impacta en el punto marcado.'
        : `Disparo parabólico: flecha ${scatterDirection}, desvío ${scatter.deviationInches}".`
      const scatterTextEn = scatter.bullseye
        ? 'Parabolic Shot: bullseye. It lands on the marked point.'
        : `Parabolic Shot: arrow ${scatterDirection}, deviates ${scatter.deviationInches}".`
      pushAbilityDetail(
        scatterTextEs,
        scatterTextEn,
        [{
          value: scatter.bullseye ? 'DIANA' : `FLECHA ${scatterDirection}`,
          outcome: scatter.bullseye ? 'crit' : 'fail',
        }],
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
    const appliedCoverRules = (result.rulesApplied || []).filter((rule) => normalizeText(rule).startsWith('cobertura'))
    const ignoresPartialCover = (result.rulesApplied || []).some((rule) =>
      normalizeText(rule).startsWith('ignora coberturas') || normalizeText(rule).startsWith('ignore cover'),
    )
    const coverAffectsDefense = appliedCoverRules.length > 0 && !(ignoresPartialCover && result.coverType === 'partial')
    const rollOutcomeSummary = summarizeRollOutcomes(attackDice)
    const attackerSummary = result.hasDirect
      ? lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (automatic hits): ${result.totals.hits} hits and ${result.totals.crits} crits.`
        : `${attackerName} ataca con ${weaponName} (impactos automáticos): ${result.totals.hits} impactos y ${result.totals.crits} críticos.`
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
    const landedImpacts = Math.max(0, (result.totals?.hits || 0) + (result.totals?.crits || 0) - blockedTotal)
    const defenderTail = lang === 'en'
      ? `): blocks ${blockedTotal}; ${landedImpacts} land; takes ${result.totals.damage} damage (${defenderHpBefore} -> ${defenderFinalHp} HP).`
      : `): consigue bloquear ${blockedTotal}; impactan ${landedImpacts}; recibe ${result.totals.damage} de daño (${defenderHpBefore} -> ${defenderFinalHp} vidas).`

    return {
      key,
      title,
      subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
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
      resultState: {
        attacker: { name: attackerName, hp: attackerFinalHp, defeated: attackerFinalHp <= 0 },
        defender: { name: defenderName, hp: defenderFinalHp, defeated: defenderFinalHp <= 0 },
        selfDamage: attackerSelfDamage,
      },
    }
  }

  const buildStatusEntry = ({
    key,
    attackerName,
    defenderName,
    attackerHp,
    defenderHp,
    attackerLine,
    defenderLine,
    attackDice = [],
    selfDamage = 0,
    hideResult = false,
  }) => ({
    key,
    title: '',
    subtitle: '',
    attackerLine,
    defenderLine,
    abilityLine: '',
    defenderLead: '',
    defenderSave: '',
    defenderCover: '',
    defenderTail: '',
    abilityDetails: [],
    attackCountDice: [],
    attackDice,
    defenseDice: [],
    hideResult,
    resultState: {
      attacker: { name: attackerName, hp: attackerHp, defeated: attackerHp <= 0 },
      defender: { name: defenderName, hp: defenderHp, defeated: defenderHp <= 0 },
      selfDamage,
    },
  })

  const handleFlip = () => {
    if (isResolving) return
    if (!leftUnit || !rightUnit) return

    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])

    const nextLeft = {
      factionId: rightFactionId,
      unitId: rightUnitId,
      weaponIds: [...safeRightWeaponIds],
    }
    const nextRight = {
      factionId: leftFactionId,
      unitId: leftUnitId,
      weaponIds: [...safeLeftWeaponIds],
    }

    setLeft(nextLeft)
    setRight(nextRight)

    setLeftCoverType(rightCoverType)
    setRightCoverType(leftCoverType)
    setLeftMoved(rightMoved)
    setRightMoved(leftMoved)
    setLeftHalfRange(rightHalfRange)
    setRightHalfRange(leftHalfRange)
    setLeftNoLineOfSight(rightNoLineOfSight)
    setRightNoLineOfSight(leftNoLineOfSight)
    setLeftAfterDash(rightAfterDash)
    setRightAfterDash(leftAfterDash)

    setHpMap((prev) => swapMapBySidePrefix(prev, 'L', 'R'))
    setAmmoMap((prev) => swapMapBySidePrefix(prev, 'left', 'right'))
  }

  const handleReset = () => {
    if (isResolving) return
    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])
    setHpMap({})
    setAmmoMap({})
  }

  const handleResolve = () => {
    if (isResolving) return
    if (!leftUnit || !rightUnit || !leftSelectedWeapons.length) return
    const rightStartsMelee = attackType === 'melee' && parseSpeedValue(rightUnit) > parseSpeedValue(leftUnit)
    const needsRightWeapons = rightStartsMelee || isCounterattackEnabled
    if (needsRightWeapons && !rightSelectedWeapons.length) return

    // Every resolve starts a fresh simulation and replaces prior results.
    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])
    setAmmoMap({})

    let nextLeftHp = leftHp
    let nextRightHp = rightHp
    const entries = []
    const pendingAmmoSpend = {}
    let rangedCounterReady = false

    const runAttack = ({ attackerSide, weapon, stepLabel, index }) => {
      const defenderSide = attackerSide === 'left' ? 'right' : 'left'
      const attackerUnit = attackerSide === 'left' ? leftUnit : rightUnit
      const defenderUnit = defenderSide === 'left' ? leftUnit : rightUnit
      if (!attackerUnit || !defenderUnit) return

      const attackerHpBefore = attackerSide === 'left' ? nextLeftHp : nextRightHp
      const defenderHpBefore = defenderSide === 'left' ? nextLeftHp : nextRightHp
      if (attackerHpBefore <= 0 || defenderHpBefore <= 0) return

      const attackerFactionId = attackerSide === 'left' ? leftFactionId : rightFactionId
      const ammoInfo = getWeaponAmmoInfo(attackerSide, attackerFactionId, attackerUnit, weapon, pendingAmmoSpend)
      if (ammoInfo.limited && ammoInfo.remaining <= 0) {
        entries.push(
          buildStatusEntry({
            key: `${stepLabel}-${weapon.id}-${index}-no-ammo`,
            attackerName: attackerUnit.name,
            defenderName: defenderUnit.name,
            attackerHp: attackerHpBefore,
            defenderHp: defenderHpBefore,
            attackerLine:
              lang === 'en'
                ? `${attackerUnit.name} cannot use ${weapon.name}: ${tx.outOfAmmo}.`
                : `${attackerUnit.name} no puede usar ${weapon.name}: ${tx.outOfAmmo}.`,
            defenderLine:
              lang === 'en'
                ? `${defenderUnit.name} receives no damage in this step.`
                : `${defenderUnit.name} no recibe daño en este paso.`,
          }),
        )
        return
      }

      const attackerSupport = attackerSide === 'left' ? leftConditionSupport : rightConditionSupport
      const attackerMoved = attackerSupport.moved
        ? attackerSide === 'left'
          ? leftMoved
          : rightMoved
        : false
      const halfRange = attackerSupport.halfRange
        ? attackerSide === 'left'
          ? leftHalfRange
          : rightHalfRange
        : false
      const noLineOfSight = attackerSupport.noLineOfSight
        ? attackerSide === 'left'
          ? leftNoLineOfSight
          : rightNoLineOfSight
        : false
      const afterDash = attackerSupport.afterDash
        ? attackerSide === 'left'
          ? leftAfterDash
          : rightAfterDash
        : false
      const defenderCoverType = defenderSide === 'left' ? leftCoverType : rightCoverType

      const attackResult = resolveAttack({
        attacker: {
          id: attackerSide,
          name: attackerUnit.name,
          hp: attackerHpBefore,
          maxHp: attackerUnit.hp,
        },
        defender: {
          id: defenderSide,
          name: defenderUnit.name,
          hp: defenderHpBefore,
          maxHp: defenderUnit.hp,
          type: defenderUnit.type,
          save: defenderUnit.save,
        },
        weapon,
        mode,
        conditions: {
          coverType: defenderCoverType,
          defenderPrepared: mode === 'ranged' && defenderSide === 'right',
          attackerMoved,
          halfRange,
          attackerEngaged: false,
          hasLineOfSight: !noLineOfSight,
          afterDash,
        },
      })

      if (ammoInfo.limited && !attackResult.blocked) {
        pendingAmmoSpend[ammoInfo.key] = (pendingAmmoSpend[ammoInfo.key] || 0) + 1
      }

      if (attackerSide === 'left') {
        nextLeftHp = attackResult.attackerAfter?.hp ?? nextLeftHp
        nextRightHp = attackResult.blocked ? nextRightHp : attackResult.defenderAfter.hp
        if (attackType === 'ranged' && attackResult.canCounter) {
          rangedCounterReady = true
        }
      } else {
        nextRightHp = attackResult.attackerAfter?.hp ?? nextRightHp
        nextLeftHp = attackResult.blocked ? nextLeftHp : attackResult.defenderAfter.hp
      }

      entries.push(
        buildCombatEntry({
          key: `${stepLabel}-${weapon.id}-${index}`,
          title: '',
          attackerName: attackerUnit.name,
          defenderName: defenderUnit.name,
          weapon,
          attackerHpBefore,
          defenderHpBefore,
          result: attackResult,
        }),
      )
    }

    const runWeaponsForSide = (side, stepLabel) => {
      const selectedWeapons = side === 'left' ? leftSelectedWeapons : rightSelectedWeapons
      selectedWeapons.forEach((weapon, index) => {
        runAttack({ attackerSide: side, weapon, stepLabel, index })
      })
    }

    if (attackType === 'charge') {
      const distanceToTarget = clamp(toNumber(chargeDistance, 7), CHARGE_DISTANCE_MIN, CHARGE_DISTANCE_MAX)
      const chargeRoll = rollChargeDice()
      const chargeSuccess = chargeRoll.total >= distanceToTarget

      entries.push(
        buildStatusEntry({
          key: `charge-roll-${chargeRoll.first}-${chargeRoll.second}`,
          attackerName: leftUnit.name,
          defenderName: rightUnit.name,
          attackerHp: nextLeftHp,
          defenderHp: nextRightHp,
          attackerLine:
            lang === 'en'
              ? `${tx.chargeRoll}: ${chargeRoll.total} (${chargeRoll.first}+${chargeRoll.second}) vs ${distanceToTarget}. ${
                chargeSuccess ? 'Charge was successful.' : 'Charge failed.'
              }`
              : `${tx.chargeRoll}: ${chargeRoll.total} (${chargeRoll.first}+${chargeRoll.second}) frente a ${distanceToTarget}. ${
                chargeSuccess ? 'La carga fue un éxito.' : 'La carga ha fallado.'
              }`,
          defenderLine: '',
          attackDice: [
            { value: chargeRoll.first, outcome: chargeSuccess ? 'hit' : 'fail', tone: 'charge' },
            { value: chargeRoll.second, outcome: chargeSuccess ? 'hit' : 'fail', tone: 'charge' },
          ],
          hideResult: true,
        }),
      )

      if (chargeSuccess) {
        runWeaponsForSide('left', 'charge-attack')
        if (isCounterattackEnabled && nextLeftHp > 0 && nextRightHp > 0) {
          runWeaponsForSide('right', 'charge-counter')
        }
      }
    } else if (attackType === 'melee') {
      const leftSpeed = parseSpeedValue(leftUnit)
      const rightSpeed = parseSpeedValue(rightUnit)
      const firstSide = rightSpeed > leftSpeed ? 'right' : 'left'
      const secondSide = firstSide === 'left' ? 'right' : 'left'

      if (firstSide === 'right') {
        entries.push(
          buildStatusEntry({
            key: 'melee-speed-priority',
            attackerName: rightUnit.name,
            defenderName: leftUnit.name,
            attackerHp: nextRightHp,
            defenderHp: nextLeftHp,
            attackerLine: lang === 'en'
              ? `${rightUnit.name} ${tx.firstBySpeed.toLowerCase()}.`
              : `${rightUnit.name} ${tx.firstBySpeed.toLowerCase()}.`,
            defenderLine: lang === 'en'
              ? `${leftUnit.name} receives the first melee sequence.`
              : `${leftUnit.name} recibe la primera secuencia de cuerpo a cuerpo.`,
          }),
        )
      }

      runWeaponsForSide(firstSide, 'melee-attack')
      if (isCounterattackEnabled && nextLeftHp > 0 && nextRightHp > 0) {
        runWeaponsForSide(secondSide, 'melee-counter')
      }
    } else {
      runWeaponsForSide('left', 'attack')
      if (isCounterattackEnabled && rangedCounterReady && nextLeftHp > 0 && nextRightHp > 0) {
        runWeaponsForSide('right', 'ranged-counter')
      }
    }

    setHpMap((prev) => ({
      ...prev,
      [leftHpKey]: sanitizeUnitHp(nextLeftHp, leftUnit),
      [rightHpKey]: sanitizeUnitHp(nextRightHp, rightUnit),
    }))

    if (Object.keys(pendingAmmoSpend).length > 0) {
      setAmmoMap((prev) => {
        const next = { ...prev }
        for (const [key, spend] of Object.entries(pendingAmmoSpend)) {
          next[key] = (next[key] || 0) + spend
        }
        return next
      })
    }

    playLog(entries)
  }

  const handleRandomizeSide = (side) => {
    if (isResolving || !factions.length) return

    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])
    setHpMap({})
    setAmmoMap({})

    const randomFaction = pickRandomItem(factions)
    if (!randomFaction) return
    const randomUnit = pickRandomUnitForMode(randomFaction, mode)
    const nextSelection = {
      factionId: randomFaction.id,
      unitId: randomUnit?.id || '',
      weaponIds: pickRandomWeaponIdsForMode(randomUnit, mode),
    }
    if (side === 'left') {
      setLeft(nextSelection)
    } else {
      setRight(nextSelection)
    }
  }

  return (
    <section className="section battle-page" id="batalla">
      <div className="section-head reveal">
        <p className="eyebrow">{tx.eyebrow}</p>
        <h2>{tx.title}</h2>
        <p>{tx.subtitle}</p>
      </div>

      <div className="duel-attack-type reveal">
        <span>{tx.attackType}</span>
        <div className="duel-attack-type-actions">
          {attackTypeOptions.map((type) => {
            const label = type === 'charge' ? tx.charge : type === 'ranged' ? tx.ranged : tx.melee
            const isActive = type === attackType
            return (
              <button
                key={type}
                type="button"
                className={isActive ? 'duel-attack-type-btn active' : 'duel-attack-type-btn'}
                onClick={() => setAttackType(type)}
              >
                {label}
              </button>
            )
          })}
        </div>
        {attackType === 'charge' && (
          <label className="field duel-charge-distance">
            <span>{tx.chargeDistance}</span>
            <select
              value={chargeDistance}
              onChange={(event) =>
                setChargeDistance(clamp(toNumber(event.target.value, 7), CHARGE_DISTANCE_MIN, CHARGE_DISTANCE_MAX))
              }
            >
              {chargeDistanceOptions.map((distance) => (
                <option key={`charge-distance-${distance}`} value={distance}>
                  {distance}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="battle-duel-grid">
        <article className="duel-panel attacker-panel reveal">
          <h3>{tx.attacker}</h3>
          <button
            type="button"
            className="ghost duel-panel-random"
            onClick={() => handleRandomizeSide('left')}
            disabled={!factions.length || isResolving}
          >
            {tx.random}
          </button>
          <label className="field">
            <span>{tx.faction}</span>
            <div className="duel-faction-select">
              {factionImages[leftFactionId] && <img src={factionImages[leftFactionId]} alt={leftFaction?.name || ''} />}
              <select
                value={leftFactionId}
                onChange={(event) => {
                  const faction = factionById.get(event.target.value)
                  setLeft({
                    factionId: event.target.value,
                    unitId: faction?.units[0]?.id || '',
                    weaponIds: pickWeaponIdsForMode(faction?.units[0], mode),
                  })
                }}
              >
                {factions.map((faction) => (
                  <option key={faction.id} value={faction.id}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>{tx.unit}</span>
            <select
              value={leftUnitId}
              onChange={(event) =>
                setLeft((prev) => {
                  const unit = leftFaction?.units.find((item) => item.id === event.target.value)
                  return {
                    ...prev,
                    unitId: event.target.value,
                    weaponIds: pickWeaponIdsForMode(unit, mode),
                  }
                })}
              disabled={!leftFaction}
            >
              {leftFaction?.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{leftWeaponSlots > 1 ? tx.weapons : tx.weapon}</span>
            {!leftWeapons.length ? (
              <p className="battle-empty">{tx.noWeapons}</p>
            ) : leftWeaponSlots > 1 ? (
              <div className="duel-weapon-multi">
                {Array.from({ length: leftWeaponSlots }).map((_, slotIndex) => (
                  <label key={`left-slot-${slotIndex}`} className="field duel-weapon-slot">
                    <span>{tx.weapon} {slotIndex + 1}</span>
                    <select
                      value={safeLeftWeaponIds[slotIndex] || ''}
                      onChange={(event) =>
                        setWeaponAtSlot('left', slotIndex, event.target.value, leftWeapons, leftWeaponSlots, safeLeftWeaponIds)}
                      disabled={!leftWeapons.length}
                    >
                      {leftWeapons.map((weapon) => (
                        <option key={weapon.id} value={weapon.id}>
                          {weapon.name} · {weapon.attacks}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={leftPrimaryWeaponId}
                onChange={(event) => setLeft((prev) => ({ ...prev, weaponIds: [event.target.value] }))}
                disabled={!leftWeapons.length}
              >
                {leftWeapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.name} · {weapon.attacks}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="duel-unit-divider" aria-hidden="true" />

          {leftUnit && (
            <article className="duel-unit-card">
              <div className="unit-card-header">
                <h4>{leftUnit.name}</h4>
              </div>
              <p className="unit-meta">
                <UnitTypeBadge type={leftUnit.type} />
                {' '}· <span className="unit-value">{leftUnit.valueBase} {tx.valueUnit}</span>
              </p>
              <div className="unit-stats-table">
                <div className="unit-stats-row head">
                  <span>{tx.mov}</span>
                  <span>{tx.vidas}</span>
                  <span>{tx.salv}</span>
                  <span>{tx.vel}</span>
                </div>
                <div className="unit-stats-row">
                  <span>{leftUnit.movement}</span>
                  <span>
                    <select
                      className="duel-hp-select"
                      value={leftHp}
                      onChange={(event) => setUnitHp('L', leftFactionId, leftUnit, event.target.value)}
                    >
                      {leftHp <= 0 && <option value={0}>KO</option>}
                      {buildHpValues(leftUnit.hp).map((value) => (
                        <option key={`left-hp-${value}`} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>{leftUnit.saveLabel}</span>
                  <span>{leftUnit.speed}</span>
                </div>
              </div>
              {leftUnit.specialty && leftUnit.specialty !== '-' && (
                <p className="unit-specialty duel-unit-specialty">{leftUnit.specialty}</p>
              )}
              {!!leftSelectedWeapons.length && (
                <div className="duel-weapon-stack">
                  {leftSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    const ammoInfo = getWeaponAmmoInfo('left', leftFactionId, leftUnit, weapon)
                    return (
                      <div key={`left-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
                        {ammoInfo.limited && (
                          <p className="duel-weapon-ammo">
                            {tx.ammo}: {ammoInfo.remaining}/{ammoInfo.max}
                          </p>
                        )}
                        <div className="weapon-stats-table duel-weapon-table">
                          <div className="weapon-stats-row duel-weapon-row head">
                            <span>{tx.weaponAtq}</span>
                            <span>{tx.weaponDist}</span>
                            <span>{tx.weaponImp}</span>
                            <span>{tx.weaponDamage}</span>
                            <span>{tx.weaponCrit}</span>
                            <span>{tx.weaponSkills}</span>
                          </div>
                          <div className="weapon-stats-row duel-weapon-row">
                            <span>{weapon.attacks}</span>
                            <span>{weapon.range || '-'}</span>
                            <span>{weapon.kind === 'melee' ? '3+' : weaponHasAnyPrefix(weapon, DIRECT_PREFIXES) ? '-' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.map((a) => getAbilityLabel(a, lang)).join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => {
                              const binding = getAbilityConditionBinding('left', note.raw)
                              return (
                                <div key={note.raw || note.label} className="duel-ability-note-item">
                                  <div>
                                    <strong>{note.label}:</strong> {note.description}
                                  </div>
                                  {binding && (
                                    <label className="duel-ability-check">
                                      <input
                                        type="checkbox"
                                        checked={binding.checked}
                                        onChange={(event) => binding.setChecked(event.target.checked)}
                                      />
                                      <span>{binding.label}</span>
                                    </label>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )}
          <label className="field">
            <span>{tx.coverType}</span>
            <select value={leftCoverType} onChange={(event) => setLeftCoverType(event.target.value)}>
              {coverTypeOptions.map((option) => (
                <option key={`left-cover-${option}`} value={option}>
                  {option === 'none' ? tx.coverNone : option === 'partial' ? tx.coverPartial : tx.coverHeight}
                </option>
              ))}
            </select>
          </label>

        </article>

        <article className="duel-panel defender-panel reveal">
          <h3>{tx.defender}</h3>
          <button
            type="button"
            className="ghost duel-panel-random"
            onClick={() => handleRandomizeSide('right')}
            disabled={!factions.length || isResolving}
          >
            {tx.random}
          </button>
          <label className="field">
            <span>{tx.faction}</span>
            <div className="duel-faction-select">
              {factionImages[rightFactionId] && <img src={factionImages[rightFactionId]} alt={rightFaction?.name || ''} />}
              <select
                value={rightFactionId}
                onChange={(event) => {
                  const faction = factionById.get(event.target.value)
                  setRight({
                    factionId: event.target.value,
                    unitId: faction?.units[0]?.id || '',
                    weaponIds: pickWeaponIdsForMode(faction?.units[0], mode),
                  })
                }}
              >
                {factions.map((faction) => (
                  <option key={faction.id} value={faction.id}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>{tx.unit}</span>
            <select
              value={rightUnitId}
              onChange={(event) =>
                setRight((prev) => {
                  const unit = rightFaction?.units.find((item) => item.id === event.target.value)
                  return {
                    ...prev,
                    unitId: event.target.value,
                    weaponIds: pickWeaponIdsForMode(unit, mode),
                  }
                })}
              disabled={!rightFaction}
            >
              {rightFaction?.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{rightWeaponSlots > 1 ? tx.weapons : tx.weapon}</span>
            {!rightWeapons.length ? (
              <p className="battle-empty">{tx.noWeapons}</p>
            ) : rightWeaponSlots > 1 ? (
              <div className="duel-weapon-multi">
                {Array.from({ length: rightWeaponSlots }).map((_, slotIndex) => (
                  <label key={`right-slot-${slotIndex}`} className="field duel-weapon-slot">
                    <span>{tx.weapon} {slotIndex + 1}</span>
                    <select
                      value={safeRightWeaponIds[slotIndex] || ''}
                      onChange={(event) =>
                        setWeaponAtSlot('right', slotIndex, event.target.value, rightWeapons, rightWeaponSlots, safeRightWeaponIds)}
                      disabled={!rightWeapons.length}
                    >
                      {rightWeapons.map((weapon) => (
                        <option key={weapon.id} value={weapon.id}>
                          {weapon.name} · {weapon.attacks}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={rightPrimaryWeaponId}
                onChange={(event) => setRight((prev) => ({ ...prev, weaponIds: [event.target.value] }))}
                disabled={!rightWeapons.length}
              >
                {rightWeapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.name} · {weapon.attacks}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="duel-unit-divider" aria-hidden="true" />

          {rightUnit && (
            <article className="duel-unit-card">
              <div className="unit-card-header">
                <h4>{rightUnit.name}</h4>
              </div>
              <p className="unit-meta">
                <UnitTypeBadge type={rightUnit.type} />
                {' '}· <span className="unit-value">{rightUnit.valueBase} {tx.valueUnit}</span>
              </p>
              <div className="unit-stats-table">
                <div className="unit-stats-row head">
                  <span>{tx.mov}</span>
                  <span>{tx.vidas}</span>
                  <span>{tx.salv}</span>
                  <span>{tx.vel}</span>
                </div>
                <div className="unit-stats-row">
                  <span>{rightUnit.movement}</span>
                  <span>
                    <select
                      className="duel-hp-select"
                      value={rightHp}
                      onChange={(event) => setUnitHp('R', rightFactionId, rightUnit, event.target.value)}
                    >
                      {rightHp <= 0 && <option value={0}>KO</option>}
                      {buildHpValues(rightUnit.hp).map((value) => (
                        <option key={`right-hp-${value}`} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>{rightUnit.saveLabel}</span>
                  <span>{rightUnit.speed}</span>
                </div>
              </div>
              {rightUnit.specialty && rightUnit.specialty !== '-' && (
                <p className="unit-specialty duel-unit-specialty">{rightUnit.specialty}</p>
              )}
              {!!rightSelectedWeapons.length && (
                <div className="duel-weapon-stack">
                  {rightSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    const ammoInfo = getWeaponAmmoInfo('right', rightFactionId, rightUnit, weapon)
                    return (
                      <div key={`right-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
                        {ammoInfo.limited && (
                          <p className="duel-weapon-ammo">
                            {tx.ammo}: {ammoInfo.remaining}/{ammoInfo.max}
                          </p>
                        )}
                        <div className="weapon-stats-table duel-weapon-table">
                          <div className="weapon-stats-row duel-weapon-row head">
                            <span>{tx.weaponAtq}</span>
                            <span>{tx.weaponDist}</span>
                            <span>{tx.weaponImp}</span>
                            <span>{tx.weaponDamage}</span>
                            <span>{tx.weaponCrit}</span>
                            <span>{tx.weaponSkills}</span>
                          </div>
                          <div className="weapon-stats-row duel-weapon-row">
                            <span>{weapon.attacks}</span>
                            <span>{weapon.range || '-'}</span>
                            <span>{weapon.kind === 'melee' ? '3+' : weaponHasAnyPrefix(weapon, DIRECT_PREFIXES) ? '-' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.map((a) => getAbilityLabel(a, lang)).join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => {
                              const binding = getAbilityConditionBinding('right', note.raw)
                              return (
                                <div key={note.raw || note.label} className="duel-ability-note-item">
                                  <div>
                                    <strong>{note.label}:</strong> {note.description}
                                  </div>
                                  {binding && (
                                    <label className="duel-ability-check">
                                      <input
                                        type="checkbox"
                                        checked={binding.checked}
                                        onChange={(event) => binding.setChecked(event.target.checked)}
                                      />
                                      <span>{binding.label}</span>
                                    </label>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )}
          <label className="field">
            <span>{tx.coverType}</span>
            <select value={rightCoverType} onChange={(event) => setRightCoverType(event.target.value)}>
              {coverTypeOptions.map((option) => (
                <option key={`right-cover-${option}`} value={option}>
                  {option === 'none' ? tx.coverNone : option === 'partial' ? tx.coverPartial : tx.coverHeight}
                </option>
              ))}
            </select>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={defenderCounterattack}
              disabled={!canCounterByMode}
              onChange={(event) => setDefenderCounterattack(event.target.checked)}
            />
            <span>{tx.counterattack}</span>
          </label>
        </article>
      </div>

      <div className="duel-actions reveal">
        <button
          type="button"
          className="primary"
          onClick={handleResolve}
          disabled={
            !leftUnit ||
            !rightUnit ||
            !leftSelectedWeapons.length ||
            ((attackType === 'melee' && parseSpeedValue(rightUnit) > parseSpeedValue(leftUnit) || isCounterattackEnabled) &&
              !rightSelectedWeapons.length) ||
            isResolving
          }
        >
          {isResolving ? `${tx.resolve}...` : tx.resolve}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleFlip}
          disabled={!leftUnit || !rightUnit || isResolving}
        >
          {tx.flip}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleReset}
          disabled={isResolving}
        >
          {tx.reset}
        </button>
      </div>

      <article className="duel-log reveal">
        <div className="duel-log-head">
          <h3>{tx.combatLog}</h3>
        </div>
        {!logEntries.length && <p className="battle-empty">{tx.emptyLog}</p>}
        {logEntries.length > 0 && (
          <div className="duel-log-list">
            {logEntries.map((entry) => {
              const isCounterattackEntry = entry.key.includes('counter')
              const attackerUnitName = String(entry.resultState?.attacker?.name || '-')
                .toLocaleLowerCase(lang === 'en' ? 'en-US' : 'es-ES')
              const defenderUnitName = String(entry.resultState?.defender?.name || '-')
                .toLocaleLowerCase(lang === 'en' ? 'en-US' : 'es-ES')
              const primaryRole = isCounterattackEntry ? tx.defender : tx.attacker
              const primaryUnitName = isCounterattackEntry ? defenderUnitName : attackerUnitName
              const primaryLabelClass = isCounterattackEntry
                ? 'duel-log-line-label duel-log-line-label-defender'
                : 'duel-log-line-label duel-log-line-label-attacker'
              const secondaryRole = isCounterattackEntry ? tx.attacker : tx.defender
              const secondaryUnitName = isCounterattackEntry ? attackerUnitName : defenderUnitName
              const secondaryLabelClass = isCounterattackEntry
                ? 'duel-log-line-label duel-log-line-label-attacker'
                : 'duel-log-line-label duel-log-line-label-defender'
              return (
                <article key={entry.key} className="duel-log-entry">
                <div className="duel-log-line">
                  <span className={primaryLabelClass}>
                    <span>{primaryRole}</span>{' '}
                    <span className="duel-log-line-label-unit">{primaryUnitName}</span>
                    {isCounterattackEntry && <span>{` (${tx.counterattack})`}</span>}
                  </span>
                  <div className="duel-dice">
                    {!!entry.attackCountDice?.length && (
                      <>
                        <span className="duel-log-copy-note">
                          {lang === 'en' ? 'Attack count' : 'Ataques'}
                        </span>
                        {entry.attackCountDice.map((die, index) => (
                          <span
                            key={`${entry.key}-attack-count-${index}`}
                            className="duel-die duel-die-attack duel-die-count"
                            title={die.dieType}
                          >
                            <span className="duel-die-count-value">{die.value}</span>
                            <span className="duel-die-count-type">{die.dieType}</span>
                          </span>
                        ))}
                      </>
                    )}
                    {!!entry.attackDice?.length && (
                      <span className="duel-log-copy-note">
                        {lang === 'en' ? 'Hit rolls' : 'Tiradas de impacto'}
                      </span>
                    )}
                    {entry.attackDice?.map((die, index) => (
                      <span
                        key={`${entry.key}-attacker-${index}`}
                        className={`duel-die ${
                          die.tone === 'charge'
                            ? 'duel-die-charge'
                            : die.tone === 'count'
                              ? 'duel-die-tag'
                            : die.outcome === 'fail'
                              ? 'duel-die-fail-gray'
                              : die.outcome === 'crit'
                                ? 'duel-die-attack duel-die-crit'
                                : 'duel-die-attack'
                        }`}
                      >
                        {die.value}
                      </span>
                    ))}
                    <span className="duel-log-copy">{entry.attackerLine}</span>
                    {!!entry.abilityLine && (
                      <span className="duel-log-copy duel-log-ability-line">{entry.abilityLine}</span>
                    )}
                  </div>
                </div>
                {!!entry.abilityDetails?.length && entry.abilityDetails.map((detail, detailIndex) => (
                  <div key={`${entry.key}-ability-detail-${detailIndex}`} className="duel-log-line">
                    <span className="duel-log-line-label duel-log-line-label-ability">{lang === 'en' ? 'Ability' : 'Habilidad'}</span>
                    <div className="duel-dice">
                      {detail.dice?.map((die, dieIndex) => (
                        <span
                          key={`${entry.key}-ability-die-${detailIndex}-${dieIndex}`}
                          className={`duel-die ${
                            die.outcome === 'fail'
                              ? 'duel-die-fail-gray'
                              : die.outcome === 'crit'
                                ? 'duel-die-attack duel-die-crit'
                                : 'duel-die-attack'
                          }`}
                        >
                          {die.value}
                        </span>
                      ))}
                      <span className="duel-log-copy duel-log-ability-line">{detail.text}</span>
                    </div>
                  </div>
                ))}
                {(entry.defenseDice?.length || entry.defenderLine) && (
                  <div className="duel-log-line">
                    <span className={secondaryLabelClass}>
                      <span>{secondaryRole}</span>{' '}
                      <span className="duel-log-line-label-unit">{secondaryUnitName}</span>
                    </span>
                    <div className="duel-dice">
                      {entry.defenseDice?.map((die, index) => (
                        <span
                          key={`${entry.key}-defender-${index}`}
                          className={`duel-die ${die.blocked ? 'duel-die-defense' : 'duel-die-fail-gray'} ${Number(die.value) === 6 ? 'duel-die-crit' : ''}`}
                        >
                          {die.value}
                        </span>
                      ))}
                      {entry.defenderSave ? (
                        <span className="duel-log-copy">
                          <span>{entry.defenderLead}</span>
                          <span className="duel-log-save-threshold">{entry.defenderSave}</span>
                          {!!entry.defenderCover && (
                            <span className="duel-log-cover-tag"> · {entry.defenderCover}</span>
                          )}
                          <span>{entry.defenderTail}</span>
                        </span>
                      ) : (
                        <span className="duel-log-copy">{entry.defenderLine}</span>
                      )}
                    </div>
                  </div>
                )}
                {!entry.hideResult && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label">{tx.result}</span>
                    <div className="duel-dice duel-result-block">
                      <p className="duel-log-copy duel-log-copy-result">
                        <span>{`${entry.resultState.attacker.name}: `}</span>
                        {entry.resultState.attacker.defeated ? (
                          <span className="duel-log-defeated">{lang === 'en' ? 'The unit has been defeated.' : 'La unidad ha sido derrotada.'}</span>
                        ) : (
                          <>
                            <span>{lang === 'en' ? 'ends with ' : 'se queda con '}</span>
                            <span className="duel-log-hp-remaining">{entry.resultState.attacker.hp} {tx.hp}</span>
                            <span>.</span>
                          </>
                        )}
                      </p>
                      <p className="duel-log-copy duel-log-copy-result">
                        <span>{`${entry.resultState.defender.name}: `}</span>
                        {entry.resultState.defender.defeated ? (
                          <span className="duel-log-defeated">{lang === 'en' ? 'The unit has been defeated.' : 'La unidad ha sido derrotada.'}</span>
                        ) : (
                          <>
                            <span>{lang === 'en' ? 'ends with ' : 'se queda con '}</span>
                            <span className="duel-log-hp-remaining">{entry.resultState.defender.hp} {tx.hp}</span>
                            <span>.</span>
                          </>
                        )}
                      </p>
                      {!!entry.resultState.selfDamage && (
                        <p className="duel-log-copy duel-log-copy-note">
                          {lang === 'en'
                            ? `Self-damage to attacker: ${entry.resultState.selfDamage}.`
                            : `Autodaño del atacante: ${entry.resultState.selfDamage}.`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                </article>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )
}

export default Batalla
