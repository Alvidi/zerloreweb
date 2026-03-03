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
const resolveMode = (attackType) => (attackType === 'ranged' ? 'ranged' : 'melee')
const getWeaponSlotsForMode = (unit, mode, weaponCount) => {
  if (!weaponCount) return 0
  if (mode !== 'ranged') return 1
  return Math.max(1, Math.min(toNumber(unit?.maxRangedWeapons, 1), weaponCount))
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
const formatHitRoll = (entry) => {
  if (entry?.roll == null) return 'AUTO'
  if (entry.rerolled) return `${entry.initialRoll}>${entry.roll}`
  return String(entry.roll)
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
          coverType: 'Cover',
          coverNone: 'No cover',
          coverPartial: 'Partial cover',
          coverHeight: 'High cover',
          coverTotal: 'Total cover',
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
          attackStep: 'Attack',
          counterStep: 'Counter',
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
          coverType: 'Cobertura',
          coverNone: 'Sin cobertura',
          coverPartial: 'Cobertura parcial',
          coverHeight: 'Cobertura de altura',
          coverTotal: 'Cobertura total',
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
          attackStep: 'Ataque',
          counterStep: 'Contra',
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
  const [hpMap, setHpMap] = useState({})
  const [logEntries, setLogEntries] = useState([])
  const [isResolving, setIsResolving] = useState(false)
  const timersRef = useRef([])
  const mode = resolveMode(attackType)

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

  const leftPrimaryWeaponId = leftSelectedWeapons[0]?.id || ''
  const rightPrimaryWeaponId = rightSelectedWeapons[0]?.id || ''

  const leftHpKey = makeHpKey('L', leftUnit?.id)
  const rightHpKey = makeHpKey('R', rightUnit?.id)

  const leftHp = hpMap[leftHpKey] ?? leftUnit?.hp ?? 0
  const rightHp = hpMap[rightHpKey] ?? rightUnit?.hp ?? 0

  const setUnitHp = (side, unit, rawValue) => {
    if (!unit) return
    const key = makeHpKey(side, unit.id)
    const next = clamp(toNumber(rawValue, unit.hp), 1, unit.hp)
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
    clearTimers()
    setLogEntries([])
    setIsResolving(true)

    entries.forEach((entry, index) => {
      const timer = setTimeout(() => {
        setLogEntries((prev) => [...prev, entry])
      }, 260 * (index + 1))
      timersRef.current.push(timer)
    })

    const finish = setTimeout(() => {
      setIsResolving(false)
    }, 260 * (entries.length + 1))
    timersRef.current.push(finish)
  }

  const currentModeLabel = attackType === 'charge' ? tx.charge : mode === 'ranged' ? tx.ranged : tx.melee
  const buildAbilityNotes = (weapon) =>
    (weapon?.abilities || [])
      .map((ability) => ({
        raw: ability,
        label: formatAbilityLabel(ability),
        description: getAbilityDescription(ability, lang),
      }))
      .filter((item) => item.label)

  const buildCombatEntry = ({ key, title, attackerName, defenderName, weaponName, result }) => {
    if (result.blocked) {
      return {
        key,
        title,
        subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
        blockedReason: result.blockedReason || tx.blocked,
      }
    }

    const hitDice = (result.hitEntries || []).map(formatHitRoll)
    const saveDice = (result.saveRolls || []).map((roll) => String(roll))

    return {
      key,
      title,
      subtitle: `${attackerName} · ${weaponName} · ${currentModeLabel}`,
      hitLabel: `${tx.attackRoll} (${result.hitThreshold}+)`,
      hitDice: hitDice.length ? hitDice : ['-'],
      saveLabel: `${tx.saveRoll} ${defenderName} (${result.saveThreshold}+)`,
      saveDice: saveDice.length ? saveDice : ['-'],
      outcome: `${tx.damage}: ${result.totals.damage} · ${defenderName}: ${result.defenderAfter.hp}`,
    }
  }

  const handleResolve = () => {
    if (!leftUnit || !rightUnit || !leftSelectedWeapons.length || !rightSelectedWeapons.length) return

    let nextLeftHp = leftHp
    let nextRightHp = rightHp
    const entries = []

    leftSelectedWeapons.forEach((weapon, index) => {
      if (nextLeftHp <= 0 || nextRightHp <= 0) return
      const attackResult = resolveAttack({
        attacker: {
          id: 'left',
          name: leftUnit.name,
          hp: nextLeftHp,
          maxHp: leftUnit.hp,
        },
        defender: {
          id: 'right',
          name: rightUnit.name,
          hp: nextRightHp,
          maxHp: rightUnit.hp,
          type: rightUnit.type,
          save: rightUnit.save,
        },
        weapon,
        mode,
        conditions: {
          coverType: rightCoverType,
          defenderPrepared: false,
        },
      })

      nextLeftHp = attackResult.attackerAfter?.hp ?? nextLeftHp
      nextRightHp = attackResult.blocked ? nextRightHp : attackResult.defenderAfter.hp

      entries.push(
        buildCombatEntry({
          key: `attack-${weapon.id}-${index}`,
          title: leftSelectedWeapons.length > 1 ? `${tx.attackStep} ${index + 1}` : tx.attackStep,
          attackerName: leftUnit.name,
          defenderName: rightUnit.name,
          weaponName: weapon.name,
          result: attackResult,
        }),
      )
    })

    if (nextLeftHp > 0 && nextRightHp > 0) {
      rightSelectedWeapons.forEach((weapon, index) => {
        if (nextLeftHp <= 0 || nextRightHp <= 0) return
        const counterResult = resolveAttack({
          attacker: {
            id: 'right',
            name: rightUnit.name,
            hp: nextRightHp,
            maxHp: rightUnit.hp,
          },
          defender: {
            id: 'left',
            name: leftUnit.name,
            hp: nextLeftHp,
            maxHp: leftUnit.hp,
            type: leftUnit.type,
            save: leftUnit.save,
          },
          weapon,
          mode,
          conditions: {
            coverType: leftCoverType,
            defenderPrepared: false,
          },
        })

        nextRightHp = counterResult.attackerAfter?.hp ?? nextRightHp
        nextLeftHp = counterResult.blocked ? nextLeftHp : counterResult.defenderAfter.hp

        entries.push(
          buildCombatEntry({
            key: `counter-${weapon.id}-${index}`,
            title: rightSelectedWeapons.length > 1 ? `${tx.counterStep} ${index + 1}` : tx.counterStep,
            attackerName: rightUnit.name,
            defenderName: leftUnit.name,
            weaponName: weapon.name,
            result: counterResult,
          }),
        )
      })
    }

    setHpMap((prev) => ({
      ...prev,
      [leftHpKey]: Math.max(0, nextLeftHp),
      [rightHpKey]: Math.max(0, nextRightHp),
    }))

    playLog(entries)
  }

  const handleReset = () => {
    setAttackType('ranged')
    setLeftCoverType('none')
    setRightCoverType('none')
    setHpMap({})
    setLogEntries([])
    setIsResolving(false)
    clearTimers()
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
                  <div className="duel-unit-divider" aria-hidden="true" />
                  {leftSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    return (
                      <div key={`left-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
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
                            <span>{weapon.kind === 'melee' ? '3+' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => (
                              <div key={note.raw || note.label}>
                                <strong>{note.label}:</strong> {note.description}
                              </div>
                            ))}
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
                  <div className="duel-unit-divider" aria-hidden="true" />
                  {rightSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    return (
                      <div key={`right-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
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
                            <span>{weapon.kind === 'melee' ? '3+' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => (
                              <div key={note.raw || note.label}>
                                <strong>{note.label}:</strong> {note.description}
                              </div>
                            ))}
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
        </article>
      </div>

      <div className="duel-actions reveal">
        <button
          type="button"
          className="primary"
          onClick={handleResolve}
          disabled={!leftUnit || !rightUnit || !leftSelectedWeapons.length || !rightSelectedWeapons.length || isResolving}
        >
          {isResolving ? `${tx.resolve}...` : tx.resolve}
        </button>
        <button type="button" className="ghost" onClick={handleReset}>
          {tx.reset}
        </button>
      </div>

      <article className="duel-log reveal">
        <div className="duel-log-head">
          <h3>{tx.combatLog}</h3>
          {!!logEntries.length && <span>{logEntries.length} {tx.steps}</span>}
        </div>
        {!logEntries.length && <p className="battle-empty">{tx.emptyLog}</p>}
        {logEntries.length > 0 && (
          <div className="duel-log-list">
            {logEntries.map((entry) => (
              <article key={entry.key} className="duel-log-card">
                <div className="duel-log-card-head">
                  <strong>{entry.title}</strong>
                  <span>{entry.subtitle}</span>
                </div>
                {entry.blockedReason && <p className="duel-log-blocked">{entry.blockedReason}</p>}
                {!entry.blockedReason && (
                  <>
                    <div className="duel-log-row">
                      <span>{entry.hitLabel}</span>
                      <div className="duel-dice">
                        {entry.hitDice.map((die, index) => (
                          <span key={`${entry.key}-hit-${index}`} className="duel-die">{die}</span>
                        ))}
                      </div>
                    </div>
                    <div className="duel-log-row">
                      <span>{entry.saveLabel}</span>
                      <div className="duel-dice">
                        {entry.saveDice.map((die, index) => (
                          <span key={`${entry.key}-save-${index}`} className="duel-die">{die}</span>
                        ))}
                      </div>
                    </div>
                    <p className="duel-log-outcome">{entry.outcome}</p>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}

export default Batalla
