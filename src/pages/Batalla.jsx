import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { formatAbilityLabel, getAbilityDescription } from '../utils/abilities.js'
import { parseThreshold, resolveAttack } from '../utils/battleEngine.js'

const factionModules = import.meta.glob('../data/*.json', { eager: true })

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

const isFactionData = (data) => data && data.faccion && Array.isArray(data.unidades)

const normalizeWeapon = (weapon, kind) => ({
  id: slugify(weapon.nombre || `${kind}-${Math.random().toString(36).slice(2, 8)}`),
  name: weapon.nombre || 'Arma',
  kind,
  attacks: weapon.ataques ?? weapon.atq ?? '1D',
  range: weapon.distancia ?? '-',
  hit: weapon.impactos ?? null,
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
  return {
    id: unit.id || slugify(unit.nombre_unidad || `unidad-${index + 1}`),
    name: unit.nombre_unidad || `Unidad ${index + 1}`,
    type: unit.clase || 'Línea',
    movement: profile.movimiento ?? unit.movimiento ?? '-',
    hp: Math.max(1, toNumber(profile.vidas, 1)),
    saveLabel: profile.salvacion ?? unit.salvacion ?? `+${parseThreshold(profile.salvacion ?? '+4', 4)}`,
    save: parseThreshold(profile.salvacion ?? '+4', 4),
    speed: profile.velocidad ?? unit.velocidad ?? '-',
    valueBase: toNumber(profile.valor ?? unit.valor_base ?? unit.valor ?? 0),
    specialty: profile.especialidad ?? unit.especialidad ?? '-',
    maxRangedWeapons: getMaxRangedWeapons(unit, profile),
    weapons: [
      ...(unit.armas?.disparo || []).map((weapon) => normalizeWeapon(weapon, 'ranged')),
      ...(unit.armas?.cuerpo_a_cuerpo || []).map((weapon) => normalizeWeapon(weapon, 'melee')),
    ],
  }
}

const normalizeFaction = (data, baseId, index) => ({
  id: baseId || slugify(data.faccion?.nombre || `faccion-${index + 1}`),
  name: data.faccion?.nombre || `Facción ${index + 1}`,
  units: (data.unidades || []).map(normalizeUnit),
})

const factionImages = {
  alianza: new URL('../images/alianza.webp', import.meta.url).href,
  legionarios_crisol: new URL('../images/legionarios_crisol.webp', import.meta.url).href,
  salvajes: new URL('../images/salvajes.webp', import.meta.url).href,
  vacio: new URL('../images/vacio.webp', import.meta.url).href,
  rebeldes: new URL('../images/rebeldes.webp', import.meta.url).href,
  tecnotumbas: new URL('../images/tecnotumbas.webp', import.meta.url).href,
  enjambre: new URL('../images/enjambre.webp', import.meta.url).href,
  federacion: new URL('../images/federacion.webp', import.meta.url).href,
  tecnocratas: new URL('../images/tecnocratas.webp', import.meta.url).href,
}

const makeHpKey = (side, unitId) => `${side}:${unitId || 'none'}`
const buildHpValues = (maxHp) => Array.from({ length: Math.max(0, maxHp) }, (_, index) => maxHp - index)
const attackTypeOptions = ['ranged', 'melee', 'charge']
const coverTypeOptions = ['none', 'partial', 'height', 'total']
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
  if (PARABOLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return 'noLineOfSight'
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
    noLineOfSight: weapons.some((weapon) => weaponHasAnyPrefix(weapon, PARABOLIC_PREFIXES)),
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
const makeAmmoKey = (side, unitId, weaponId) => `${side}:${unitId || 'none'}:${weaponId || 'none'}`
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
          coverTotal: 'Total cover',
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
          reset: 'Reset',
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
          coverTotal: 'Cobertura total',
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
          reset: 'Reset',
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
    const esByBase = new Map()
    const enByBase = new Map()

    Object.entries(factionModules).forEach(([path, module]) => {
      const filename = path.split('/').pop() || ''
      if (filename.endsWith('.en.json')) {
        enByBase.set(filename.replace('.en.json', ''), module)
      } else if (filename.endsWith('.json')) {
        esByBase.set(filename.replace('.json', ''), module)
      }
    })

    return Array.from(esByBase.keys())
      .sort()
      .map((base, index) => {
        const selectedModule = lang === 'en' && enByBase.has(base) ? enByBase.get(base) : esByBase.get(base)
        const data = selectedModule?.default || selectedModule
        if (!isFactionData(data)) return null
        return normalizeFaction(data, base, index)
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
  const [ammoMap] = useState({})
  const [logEntries, setLogEntries] = useState([])
  const [isResolving, setIsResolving] = useState(false)
  const [defenderCounterattack, setDefenderCounterattack] = useState(true)
  const timersRef = useRef([])
  const resolveRunRef = useRef(0)
  const mode = resolveMode(attackType)
  const isMeleeResolution = mode === 'melee'
  const isCounterattackEnabled = isMeleeResolution && defenderCounterattack

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
  const getWeaponAmmoInfo = (side, unit, weapon, pendingSpend = {}) => {
    const maxAmmo = getLimitedAmmoMax(weapon)
    if (!maxAmmo && maxAmmo !== 0) {
      return { limited: false, max: null, used: 0, remaining: null, key: null }
    }
    const key = makeAmmoKey(side, unit?.id, weapon?.id)
    const used = Math.max(0, (ammoMap[key] || 0) + (pendingSpend[key] || 0))
    const remaining = Math.max(0, maxAmmo - used)
    return { limited: true, max: maxAmmo, used, remaining, key }
  }

  const leftHpKey = makeHpKey('L', leftUnit?.id)
  const rightHpKey = makeHpKey('R', rightUnit?.id)

  const leftHp = hpMap[leftHpKey] ?? leftUnit?.hp ?? 0
  const rightHp = hpMap[rightHpKey] ?? rightUnit?.hp ?? 0

  const setUnitHp = (side, unit, rawValue) => {
    if (!unit) return
    const key = makeHpKey(side, unit.id)
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
        label: formatAbilityLabel(ability),
        description: getAbilityDescription(ability, lang),
      }))
      .filter((item) => item.label)

  const buildCombatEntry = ({
    key,
    title,
    attackerName,
    defenderName,
    weaponName,
    attackerHp,
    defenderHp,
    result,
  }) => {
    const attackerFinalHp = result.attackerAfter?.hp ?? attackerHp ?? 0
    const defenderFinalHp = result.defenderAfter?.hp ?? defenderHp ?? 0

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
    const attackDice = (result.hitEntries || [])
      .filter((entry) => Number.isFinite(entry.roll))
      .map((entry) => ({ value: entry.roll, outcome: entry.outcome }))
    const defenseDice = (result.saveRolls || [])
      .filter((roll) => Number.isFinite(roll))
      .map((roll) => ({ value: roll, blocked: roll >= result.saveThreshold }))
    const appliedAbilityRules = (result.rulesApplied || []).filter((rule) => isAbilityRule(rule))
    const attackerSummary = result.hasDirect
      ? lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (automatic hits): ${result.totals.hits} hits and ${result.totals.crits} crits.`
        : `${attackerName} ataca con ${weaponName} (impactos automáticos): ${result.totals.hits} impactos y ${result.totals.crits} críticos.`
      : lang === 'en'
        ? `${attackerName} attacks with ${weaponName} (hits on ${result.hitThreshold}+): ${result.totals.hits} hits and ${result.totals.crits} crits.`
        : `${attackerName} ataca con ${weaponName} (impacta con ${result.hitThreshold}+): ${result.totals.hits} impactos y ${result.totals.crits} críticos.`
    const abilityLine = appliedAbilityRules.length
      ? lang === 'en'
        ? `Applied abilities: ${appliedAbilityRules.join(', ')}.`
        : `Habilidades aplicadas: ${appliedAbilityRules.join(', ')}.`
      : ''

    return {
      key,
      title,
      subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
      attackerLine: attackerSummary,
      abilityLine,
      defenderLine: lang === 'en'
        ? `${defenderName} defends (${result.saveThreshold}+): blocks ${blockedTotal} and takes ${result.totals.damage} damage.`
        : `${defenderName} defiende (${result.saveThreshold}+): bloquea ${blockedTotal} y recibe ${result.totals.damage} de daño.`,
      attackDice,
      defenseDice,
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
    attackDice,
    defenseDice: [],
    hideResult,
    resultState: {
      attacker: { name: attackerName, hp: attackerHp, defeated: attackerHp <= 0 },
      defender: { name: defenderName, hp: defenderHp, defeated: defenderHp <= 0 },
      selfDamage,
    },
  })

  const handleResolve = () => {
    if (isResolving) return
    if (!leftUnit || !rightUnit || !leftSelectedWeapons.length) return
    const rightStartsMelee = attackType === 'melee' && parseSpeedValue(rightUnit) > parseSpeedValue(leftUnit)
    const needsRightWeapons = rightStartsMelee || isCounterattackEnabled
    if (needsRightWeapons && !rightSelectedWeapons.length) return

    let nextLeftHp = leftHp
    let nextRightHp = rightHp
    const entries = []
    const pendingAmmoSpend = {}

    const runAttack = ({ attackerSide, weapon, stepLabel, index }) => {
      const defenderSide = attackerSide === 'left' ? 'right' : 'left'
      const attackerUnit = attackerSide === 'left' ? leftUnit : rightUnit
      const defenderUnit = defenderSide === 'left' ? leftUnit : rightUnit
      if (!attackerUnit || !defenderUnit) return

      const attackerHpBefore = attackerSide === 'left' ? nextLeftHp : nextRightHp
      const defenderHpBefore = defenderSide === 'left' ? nextLeftHp : nextRightHp
      if (attackerHpBefore <= 0 || defenderHpBefore <= 0) return

      const ammoInfo = getWeaponAmmoInfo(attackerSide, attackerUnit, weapon, pendingAmmoSpend)
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

      if (ammoInfo.limited) {
        pendingAmmoSpend[ammoInfo.key] = (pendingAmmoSpend[ammoInfo.key] || 0) + 1
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
          defenderPrepared: false,
          attackerMoved,
          halfRange,
          attackerEngaged: false,
          hasLineOfSight: !noLineOfSight,
          afterDash,
        },
      })

      if (attackerSide === 'left') {
        nextLeftHp = attackResult.attackerAfter?.hp ?? nextLeftHp
        nextRightHp = attackResult.blocked ? nextRightHp : attackResult.defenderAfter.hp
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
          weaponName: weapon.name,
          attackerHp: attackerSide === 'left' ? nextLeftHp : nextRightHp,
          defenderHp: defenderSide === 'left' ? nextLeftHp : nextRightHp,
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
    }

    playLog(entries)
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
            {leftWeaponSlots > 1 ? (
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
                      onChange={(event) => setUnitHp('L', leftUnit, event.target.value)}
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
                    const ammoInfo = getWeaponAmmoInfo('left', leftUnit, weapon)
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
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.join(', ') : '-'}</span>
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
          {!leftWeapons.length && <p className="battle-empty">{tx.noWeapons}</p>}

          <label className="field">
            <span>{tx.coverType}</span>
            <select value={leftCoverType} onChange={(event) => setLeftCoverType(event.target.value)}>
              {coverTypeOptions.map((option) => (
                <option key={`left-cover-${option}`} value={option}>
                  {option === 'none'
                    ? tx.coverNone
                    : option === 'partial'
                      ? tx.coverPartial
                      : option === 'height'
                        ? tx.coverHeight
                        : tx.coverTotal}
                </option>
              ))}
            </select>
          </label>

        </article>

        <article className="duel-panel defender-panel reveal">
          <h3>{tx.defender}</h3>
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
            {rightWeaponSlots > 1 ? (
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
                      onChange={(event) => setUnitHp('R', rightUnit, event.target.value)}
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
                    const ammoInfo = getWeaponAmmoInfo('right', rightUnit, weapon)
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
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.join(', ') : '-'}</span>
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
          {!rightWeapons.length && <p className="battle-empty">{tx.noWeapons}</p>}

          <label className="field">
            <span>{tx.coverType}</span>
            <select value={rightCoverType} onChange={(event) => setRightCoverType(event.target.value)}>
              {coverTypeOptions.map((option) => (
                <option key={`right-cover-${option}`} value={option}>
                  {option === 'none'
                    ? tx.coverNone
                    : option === 'partial'
                      ? tx.coverPartial
                      : option === 'height'
                        ? tx.coverHeight
                        : tx.coverTotal}
                </option>
              ))}
            </select>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={defenderCounterattack}
              disabled={!isMeleeResolution}
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
              const primaryLabel = isCounterattackEntry ? `${tx.defender} (${tx.counterattack})` : tx.attacker
              const primaryLabelClass = isCounterattackEntry
                ? 'duel-log-line-label duel-log-line-label-defender'
                : 'duel-log-line-label duel-log-line-label-attacker'
              const secondaryLabel = isCounterattackEntry ? tx.attacker : tx.defender
              const secondaryLabelClass = isCounterattackEntry
                ? 'duel-log-line-label duel-log-line-label-attacker'
                : 'duel-log-line-label duel-log-line-label-defender'
              return (
                <article key={entry.key} className="duel-log-entry">
                <div className="duel-log-line">
                  <span className={primaryLabelClass}>{primaryLabel}</span>
                  <div className="duel-dice">
                    {entry.attackDice?.map((die, index) => (
                      <span
                        key={`${entry.key}-attacker-${index}`}
                        className={`duel-die ${
                          die.tone === 'charge'
                            ? 'duel-die-charge'
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
                      <span className="duel-log-copy duel-log-copy-note duel-log-ability-line">{entry.abilityLine}</span>
                    )}
                  </div>
                </div>
                {(entry.defenseDice?.length || entry.defenderLine) && (
                  <div className="duel-log-line">
                    <span className={secondaryLabelClass}>{secondaryLabel}</span>
                    <div className="duel-dice">
                      {entry.defenseDice?.map((die, index) => (
                        <span
                          key={`${entry.key}-defender-${index}`}
                          className={`duel-die ${die.blocked ? 'duel-die-defense' : 'duel-die-fail-gray'}`}
                        >
                          {die.value}
                        </span>
                      ))}
                      <span className="duel-log-copy">{entry.defenderLine}</span>
                    </div>
                  </div>
                )}
                {!entry.hideResult && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label">{tx.result}</span>
                    <div className="duel-dice duel-result-block">
                      <p className="duel-log-copy duel-log-copy-result">
                        <span>{lang === 'en' ? `Attacker (${entry.resultState.attacker.name}): ` : `Atacante (${entry.resultState.attacker.name}): `}</span>
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
                        <span>{lang === 'en' ? `Defender (${entry.resultState.defender.name}): ` : `Defensor (${entry.resultState.defender.name}): `}</span>
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
