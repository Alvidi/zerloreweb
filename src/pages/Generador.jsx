import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'
import UnitConfigurator from '../features/generator/components/UnitConfigurator.jsx'
import CustomSelect from '../features/generator/components/CustomSelect.jsx'
import UnitTypeBadge from '../features/generator/components/UnitTypeBadge.jsx'
import { exportGeneratorPdf } from '../features/generator/exportGeneratorPdf.js'
import {
  applyPassiveGroupEffectsToFaction,
  buildArmyUnitDisplayNames,
  clampSquadSize,
  computeUnitTotal,
  factionImages,
  generateArmyByValue,
  isFactionData,
  isUnitTypeAllowedInGameMode,
  localizeArmyUnits,
  normalizeFaction,
  selectionHasWeaponLimitError,
  toNumber,
} from '../features/generator/generatorUtils.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })
const preferredEraOrder = ['future', 'past']
const preferredUnitTypeOrder = ['linea', 'elite', 'heroe', 'vehiculo', 'titan']

const getUnitEraTokens = (unit) => (Array.isArray(unit?.eras) ? unit.eras.map((era) => era.token).filter(Boolean) : [])
const normalizeTypeOrderKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const getUnitTypeOrder = (type) => {
  const normalized = normalizeTypeOrderKey(type)
  const match = preferredUnitTypeOrder.findIndex((entry) => normalized.includes(entry))
  return match === -1 ? preferredUnitTypeOrder.length : match
}

const sortUnitTypes = (types) =>
  [...types].sort((a, b) => {
    const orderDiff = getUnitTypeOrder(a) - getUnitTypeOrder(b)
    if (orderDiff !== 0) return orderDiff
    return String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' })
  })

const sortUnitsByType = (units) =>
  [...units].sort((a, b) => {
    const orderDiff = getUnitTypeOrder(a?.tipo) - getUnitTypeOrder(b?.tipo)
    if (orderDiff !== 0) return orderDiff
    return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
  })

const getFirstPassiveGroupId = (faction) => faction?.grupos_habilidades_faccion?.[0]?.id || ''
const sanitizePassiveGroupId = (faction, passiveGroupId) => {
  const groups = Array.isArray(faction?.grupos_habilidades_faccion) ? faction.grupos_habilidades_faccion : []
  if (!groups.length) return ''
  if (!passiveGroupId) return ''
  return groups.some((group) => group.id === passiveGroupId) ? passiveGroupId : ''
}
const cleanPassiveGroupName = (value) => String(value || '').replace(/^\s*\d+\.\s*/, '').trim()
const getPassiveGroupDisplayName = (group, t, fallbackIndex = 0) =>
  cleanPassiveGroupName(group?.nombre) || `${t('generator.defaultPassiveSet')} ${fallbackIndex + 1}`

const unitMatchesEraFilters = (unit, filters) => {
  if (!filters?.size) return true
  const unitEraTokens = getUnitEraTokens(unit)
  return unitEraTokens.some((token) => filters.has(token))
}

const getOrderedEraTokens = (units) => {
  const present = new Set()
  ;(units || []).forEach((unit) => {
    getUnitEraTokens(unit).forEach((token) => present.add(token))
  })
  return preferredEraOrder.filter((token) => present.has(token))
}

const PASSIVE_GROUP_ICON_PATHS = [
  'M12 4.5l4 3v5.3c0 3.1-1.7 5.8-4 6.7-2.3-.9-4-3.6-4-6.7V7.5l4-3z',
  'M12 4.5l6 6-6 9-6-9 6-6zm0 3.2-2.8 2.8L12 15l2.8-4.5L12 7.7z',
  'M6.5 15.5 12 4.5l5.5 11H6.5zm5.5-6.8-1.8 3.8h3.6L12 8.7z',
  'M12 5.2c3.5 0 6.3 2.6 6.3 5.8S15.5 16.8 12 19c-3.5-2.2-6.3-4.8-6.3-8S8.5 5.2 12 5.2zm0 3.1c-1.7 0-3.2 1.2-3.2 2.8 0 1.4 1.2 2.8 3.2 4.2 2-1.4 3.2-2.8 3.2-4.2 0-1.6-1.5-2.8-3.2-2.8z',
  'M7 6.2h10v3.4h-2.8v8.2H9.8V9.6H7V6.2zm4.1 3.4v5.1h1.8V9.6h-1.8z',
  'M12 4.6 14 8.7l4.5.6-3.2 3.1.8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.2-3.1 4.5-.6 2-4.1z',
  'M6.2 9.2 12 4.8l5.8 4.4v7.6H6.2V9.2zm3 1.5v3.1h5.6v-3.1L12 8.5l-2.8 2.2z',
  'M12 5.1c4 0 6.9 2.8 6.9 6.9S16 18.9 12 18.9 5.1 16 5.1 12 8 5.1 12 5.1zm0 3.1a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z',
]

const hashPassiveId = (value) =>
  Array.from(String(value || '')).reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)

const getPassiveGroupIconStyle = (groupId) => {
  const hash = Math.abs(hashPassiveId(groupId))
  return {
    path: PASSIVE_GROUP_ICON_PATHS[hash % PASSIVE_GROUP_ICON_PATHS.length],
    hue: hash % 360,
    rotate: (hash % 24) - 12,
  }
}

function GameModeIcon({ mode }) {
  if (mode === 'escuadra') {
    return (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <circle className="game-mode-icon-stroke" cx="15" cy="15" r="5" />
        <circle className="game-mode-icon-stroke" cx="49" cy="15" r="5" />
        <path className="game-mode-icon-stroke" d="M8 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <path className="game-mode-icon-stroke" d="M42 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <circle className="game-mode-icon-stroke" cx="32" cy="10" r="7" />
        <path className="game-mode-icon-stroke" d="M22 35c0-7.6 4.8-12 10-12s10 4.4 10 12" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <circle className="game-mode-icon-stroke" cx="32" cy="11" r="7" />
      <path className="game-mode-icon-stroke" d="M22 34c0-8 5.5-13 10-13s10 5 10 13" />
    </svg>
  )
}

function GameModePicker({ value, onChange, t }) {
  const options = [
    { value: 'escaramuza', label: t('generator.skirmish') },
    { value: 'escuadra', label: t('generator.squad') },
  ]

  return (
    <div className="field field-game-mode">
      <span>{t('generator.gameMode')}</span>
      <div className="game-mode-picker" role="radiogroup" aria-label={t('generator.gameMode')}>
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={`game-mode-card${isActive ? ' active' : ''}`}
              onClick={() => onChange(option.value)}
              role="radio"
              aria-checked={isActive}
            >
              <span className="game-mode-card-icon">
                <GameModeIcon mode={option.value} />
              </span>
              <span className="game-mode-card-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PassiveGroupIcon({ groupId }) {
  const icon = getPassiveGroupIconStyle(groupId)

  return (
    <span
      className="passive-group-icon-shape"
      style={{
        '--passive-group-icon-hue': `${icon.hue}`,
        '--passive-group-icon-rotate': `${icon.rotate}deg`,
      }}
      aria-hidden="true"
    >
      <svg className="passive-group-icon-svg" viewBox="0 0 24 24">
        <path d="M12 2.8c5 0 9.2 4 9.2 9.2S17 21.2 12 21.2 2.8 17 2.8 12 7 2.8 12 2.8z" />
        <path d={icon.path} />
      </svg>
    </span>
  )
}

function FactionSelectLabel({ label, iconSrc, isRandom = false }) {
  return (
    <span className="faction-select-option-label">
      <span className={`faction-select-option-icon${isRandom ? ' random' : ''}`} aria-hidden="true">
        {iconSrc ? <img src={iconSrc} alt="" /> : <span className="faction-select-option-random-mark">?</span>}
      </span>
      <span>{label}</span>
    </span>
  )
}

function Generador() {
  const { t, lang } = useI18n()
  const [, startTransition] = useTransition()
  const factions = useMemo(() => {
    return buildLocalizedFactionEntries(factionModules, lang)
      .filter((item) => item && isFactionData(item.data))
      .map((item, index) => normalizeFaction(item.data, index, item.base))
  }, [lang])

  const [mode, setMode] = useState('manual')
  const [gameMode, setGameMode] = useState('escaramuza')
  const [selectedFactionId, setSelectedFactionId] = useState(factions[0]?.id || '')
  const getSavedArmy = () => {
    if (typeof window === 'undefined') return { units: [], factionId: '', passiveGroupId: '' }
    const saved = window.localStorage.getItem('zerolore_army_v1')
    if (!saved) return { units: [], factionId: '', passiveGroupId: '' }
    try {
      const parsed = JSON.parse(saved)
      if (parsed?.units && Array.isArray(parsed.units)) {
        return { units: parsed.units, factionId: parsed.factionId || '', passiveGroupId: parsed.passiveGroupId || '' }
      }
    } catch {
      // Ignore invalid cache
    }
    return { units: [], factionId: '', passiveGroupId: '' }
  }

  const initialSaved = getSavedArmy()
  const [armyFactionId, setArmyFactionId] = useState(initialSaved.factionId)
  const [armyPassiveGroupId, setArmyPassiveGroupId] = useState(initialSaved.passiveGroupId)
  const [armyUnits, setArmyUnits] = useState(initialSaved.units)
  const [selectedPassiveGroupId, setSelectedPassiveGroupId] = useState('')
  const [isPassiveModalOpen, setIsPassiveModalOpen] = useState(false)
  const [activeUnit, setActiveUnit] = useState(null)
  const [targetValue, setTargetValue] = useState(40)
  const [randomFactionId, setRandomFactionId] = useState('random')
  const [unitTypeFiltersManual, setUnitTypeFiltersManual] = useState(() => new Set())
  const [unitTypeFiltersRandom, setUnitTypeFiltersRandom] = useState(() => new Set())
  const [eraFiltersManual, setEraFiltersManual] = useState(() => new Set())
  const [eraFiltersRandom, setEraFiltersRandom] = useState(() => new Set())
  const getEraLabel = (token) => (token === 'future' ? t('generator.future') : t('generator.past'))
  const selectedFactionIdSafe = useMemo(() => {
    if (!factions.length) return ''
    return factions.some((faction) => faction.id === selectedFactionId) ? selectedFactionId : factions[0].id
  }, [factions, selectedFactionId])
  const armyFactionIdSafe = useMemo(() => {
    if (!armyFactionId || !factions.length) return ''
    return factions.some((faction) => faction.id === armyFactionId) ? armyFactionId : factions[0].id
  }, [factions, armyFactionId])
  const randomFactionIdSafe = useMemo(() => {
    if (!factions.length) return 'random'
    return randomFactionId === 'random' || factions.some((faction) => faction.id === randomFactionId)
      ? randomFactionId
      : 'random'
  }, [factions, randomFactionId])

  const selectedFaction = factions.find((faction) => faction.id === selectedFactionIdSafe) || null
  const armyFaction = factions.find((faction) => faction.id === armyFactionIdSafe) || null
  const factionSelectOptions = useMemo(
    () =>
      factions.map((faction) => ({
        value: faction.id,
        label: <FactionSelectLabel label={faction.nombre} iconSrc={factionImages[faction.id]} />,
      })),
    [factions],
  )
  const randomFactionSelectOptions = useMemo(
    () => [
      {
        value: 'random',
        label: <FactionSelectLabel label={t('generator.randomFaction')} isRandom />,
      },
      ...factions.map((faction) => ({
        value: faction.id,
        label: <FactionSelectLabel label={faction.nombre} iconSrc={factionImages[faction.id]} />,
      })),
    ],
    [factions, t],
  )
  const selectedPassiveGroupIdSafe = useMemo(
    () => sanitizePassiveGroupId(selectedFaction, selectedPassiveGroupId),
    [selectedFaction, selectedPassiveGroupId],
  )
  const selectedPassiveGroup = useMemo(
    () => selectedFaction?.grupos_habilidades_faccion?.find((group) => group.id === selectedPassiveGroupIdSafe) || null,
    [selectedFaction, selectedPassiveGroupIdSafe],
  )
  const selectedFactionWithPassives = useMemo(
    () => applyPassiveGroupEffectsToFaction(selectedFaction, selectedPassiveGroup),
    [selectedFaction, selectedPassiveGroup],
  )
  const armyPassiveGroupIdSafe = useMemo(
    () => sanitizePassiveGroupId(armyFaction, armyPassiveGroupId),
    [armyFaction, armyPassiveGroupId],
  )
  const armyPassiveGroup = useMemo(
    () => armyFaction?.grupos_habilidades_faccion?.find((group) => group.id === armyPassiveGroupIdSafe) || null,
    [armyFaction, armyPassiveGroupIdSafe],
  )
  const armyFactionWithPassives = useMemo(
    () => applyPassiveGroupEffectsToFaction(armyFaction, armyPassiveGroup),
    [armyFaction, armyPassiveGroup],
  )
  const armyFactionForPdf = useMemo(
    () =>
      armyFactionWithPassives
        ? {
            ...armyFactionWithPassives,
            selectedPassiveGroup: armyPassiveGroup,
          }
        : armyFactionWithPassives,
    [armyFactionWithPassives, armyPassiveGroup],
  )
  const availableUnitTypes = useMemo(() => {
    if (!selectedFactionWithPassives?.unidades?.length) return []
    const types = new Set(
      selectedFactionWithPassives.unidades
        .filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))
        .map((unit) => unit.tipo),
    )
    return sortUnitTypes(Array.from(types))
  }, [selectedFactionWithPassives, gameMode])
  const availableEraTokens = useMemo(() => {
    if (!selectedFactionWithPassives?.unidades?.length) return []
    return getOrderedEraTokens(
      selectedFactionWithPassives.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode)),
    )
  }, [selectedFactionWithPassives, gameMode])
  const randomFaction = randomFactionIdSafe === 'random'
    ? null
    : factions.find((faction) => faction.id === randomFactionIdSafe)
  const availableUnitTypesRandom = useMemo(() => {
    if (randomFaction) {
      return sortUnitTypes(Array.from(
        new Set(
          randomFaction.unidades
            .filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))
            .map((unit) => unit.tipo),
        ),
      ))
    }
    const types = new Set()
    factions.forEach((faction) => {
      faction.unidades.forEach((unit) => {
        if (isUnitTypeAllowedInGameMode(unit.tipo, gameMode)) {
          types.add(unit.tipo)
        }
      })
    })
    return sortUnitTypes(Array.from(types))
  }, [randomFaction, factions, gameMode])
  const availableEraTokensRandom = useMemo(() => {
    if (randomFaction) {
      return getOrderedEraTokens(
        randomFaction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode)),
      )
    }
    return getOrderedEraTokens(
      factions.flatMap((faction) =>
        faction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))),
    )
  }, [randomFaction, factions, gameMode])

  const activeManualFilters = useMemo(() => {
    if (!availableUnitTypes.length) return new Set()
    if (unitTypeFiltersManual.size) {
      const sanitized = new Set(
        [...unitTypeFiltersManual].filter((type) => availableUnitTypes.includes(type)),
      )
      return sanitized.size ? sanitized : new Set(availableUnitTypes)
    }
    return new Set(availableUnitTypes)
  }, [availableUnitTypes, unitTypeFiltersManual])
  const activeManualEraFilters = useMemo(() => {
    if (!availableEraTokens.length) return new Set()
    if (eraFiltersManual.size) {
      const sanitized = new Set([...eraFiltersManual].filter((token) => availableEraTokens.includes(token)))
      return sanitized.size ? sanitized : new Set(availableEraTokens)
    }
    return new Set(availableEraTokens)
  }, [availableEraTokens, eraFiltersManual])

  const activeRandomFilters = useMemo(() => {
    if (!availableUnitTypesRandom.length) return new Set()
    if (unitTypeFiltersRandom.size) {
      const sanitized = new Set(
        [...unitTypeFiltersRandom].filter((type) => availableUnitTypesRandom.includes(type)),
      )
      return sanitized.size ? sanitized : new Set(availableUnitTypesRandom)
    }
    return new Set(availableUnitTypesRandom)
  }, [availableUnitTypesRandom, unitTypeFiltersRandom])
  const activeRandomEraFilters = useMemo(() => {
    if (!availableEraTokensRandom.length) return new Set()
    if (eraFiltersRandom.size) {
      const sanitized = new Set([...eraFiltersRandom].filter((token) => availableEraTokensRandom.includes(token)))
      return sanitized.size ? sanitized : new Set(availableEraTokensRandom)
    }
    return new Set(availableEraTokensRandom)
  }, [availableEraTokensRandom, eraFiltersRandom])

  const localizedArmyUnits = useMemo(
    () => localizeArmyUnits(armyUnits, armyFactionWithPassives),
    [armyUnits, armyFactionWithPassives],
  )
  const currentArmyFaction = localizedArmyUnits.length ? armyFaction : mode === 'manual' ? selectedFaction : null
  const currentArmyPassiveGroup = localizedArmyUnits.length ? armyPassiveGroup : mode === 'manual' ? selectedPassiveGroup : null
  const totalValue = localizedArmyUnits.reduce((total, unit) => total + unit.total, 0)
  const armyUnitDisplayNames = useMemo(() => buildArmyUnitDisplayNames(localizedArmyUnits), [localizedArmyUnits])
  const visibleManualUnits = useMemo(() => {
    if (!selectedFactionWithPassives?.unidades?.length) return []
    return sortUnitsByType(selectedFactionWithPassives.unidades.filter(
      (unit) =>
        isUnitTypeAllowedInGameMode(unit.tipo, gameMode)
        && activeManualFilters.has(unit.tipo)
        && unitMatchesEraFilters(unit, activeManualEraFilters),
    ))
  }, [selectedFactionWithPassives, activeManualFilters, activeManualEraFilters, gameMode])

  useEffect(() => {
    if (typeof Image === 'undefined') return
    Object.values(factionImages).forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    const payload = JSON.stringify({
      units: armyUnits,
      factionId: armyFactionIdSafe,
      passiveGroupId: armyPassiveGroupIdSafe,
    })
    window.localStorage.setItem('zerolore_army_v1', payload)
  }, [armyUnits, armyFactionIdSafe, armyPassiveGroupIdSafe])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const hasOpenModal = Boolean(activeUnit) || isPassiveModalOpen
    const previousOverflow = document.body.style.overflow
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeUnit, isPassiveModalOpen])

  const handleFactionChange = (event) => {
    const next = event.target.value
    const nextFaction = factions.find((faction) => faction.id === next)
    const nextTypes = nextFaction ? Array.from(new Set(nextFaction.unidades.map((unit) => unit.tipo))) : []
    const nextEras = nextFaction
      ? getOrderedEraTokens(nextFaction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode)))
      : []
    const shouldResetArmy = armyUnits.length > 0 && armyFactionIdSafe && armyFactionIdSafe !== next
    startTransition(() => {
      setSelectedFactionId(next)
      setSelectedPassiveGroupId('')
      setIsPassiveModalOpen(false)
      setUnitTypeFiltersManual(new Set(nextTypes))
      setEraFiltersManual(new Set(nextEras))
      if (shouldResetArmy) {
        setArmyUnits([])
        setArmyFactionId(next)
        setArmyPassiveGroupId('')
      }
    })
  }

  const handleRandomFactionChange = (next) => {
    const nextFaction = next === 'random' ? null : factions.find((faction) => faction.id === next)
    const nextTypes = nextFaction
      ? Array.from(new Set(nextFaction.unidades.map((unit) => unit.tipo)))
      : Array.from(
        new Set(
          factions.flatMap((faction) => faction.unidades.map((unit) => unit.tipo)),
        ),
      )
    const nextEras = nextFaction
      ? getOrderedEraTokens(nextFaction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode)))
      : getOrderedEraTokens(
          factions.flatMap((faction) =>
            faction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))),
        )
    setRandomFactionId(next)
    setUnitTypeFiltersRandom(new Set(nextTypes))
    setEraFiltersRandom(new Set(nextEras))
  }

  const handleToggleUnitTypeManual = (type) => {
    setUnitTypeFiltersManual((prev) => {
      const next = prev.size ? new Set(prev) : new Set(availableUnitTypes)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleToggleUnitTypeRandom = (type) => {
    setUnitTypeFiltersRandom((prev) => {
      const next = prev.size ? new Set(prev) : new Set(availableUnitTypesRandom)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleToggleEraManual = (token) => {
    setEraFiltersManual((prev) => {
      const next = prev.size ? new Set(prev) : new Set(availableEraTokens)
      if (next.has(token)) next.delete(token)
      else next.add(token)
      return next
    })
  }

  const handleToggleEraRandom = (token) => {
    setEraFiltersRandom((prev) => {
      const next = prev.size ? new Set(prev) : new Set(availableEraTokensRandom)
      if (next.has(token)) next.delete(token)
      else next.add(token)
      return next
    })
  }

  const handleOpenConfigurator = (unit) => {
    setActiveUnit(unit)
  }

  const handleSelectPassiveGroup = (groupId) => {
    setSelectedPassiveGroupId(groupId)
    setIsPassiveModalOpen(false)
  }

  const handleAddUnit = (unit, shooting, melee, squadSize, perMiniLoadouts, imageDataUrl = '') => {
    const clampedSize = gameMode === 'escuadra' ? clampSquadSize(squadSize, unit) : 1
    const candidateEntry = {
      shooting,
      melee,
      perMiniLoadouts,
    }
    if (selectionHasWeaponLimitError(candidateEntry, armyUnits, gameMode)) return
    const total = computeUnitTotal(unit, shooting, melee, clampedSize, perMiniLoadouts, gameMode)
    const entry = {
      uid: `${unit.id}-${Date.now()}-${Math.random()}`,
      base: unit,
      shooting,
      melee,
      squadSize: clampedSize,
      perMiniLoadouts,
      imageDataUrl,
      total,
    }
    setArmyUnits((prev) =>
      prev.length && armyFactionIdSafe && armyFactionIdSafe !== selectedFactionIdSafe ? [entry] : [...prev, entry],
    )
    setArmyFactionId(selectedFactionIdSafe)
    setArmyPassiveGroupId(selectedPassiveGroupIdSafe)
    setActiveUnit(null)
  }

  const handleRemoveUnit = (uid) => {
    setArmyUnits((prev) => prev.filter((unit) => unit.uid !== uid))
  }

  const handleEditUnit = (unit) => {
    setActiveUnit(unit)
  }

  const handleReset = () => {
    setArmyUnits([])
    setArmyFactionId('')
    setArmyPassiveGroupId('')
    setSelectedPassiveGroupId('')
    setIsPassiveModalOpen(false)
  }

  const handleGenerateRandom = () => {
    if (!factions.length) return
    const filterFactionUnits = (faction) => {
      const factionWithPassives = applyPassiveGroupEffectsToFaction(
        faction,
        faction?.grupos_habilidades_faccion?.[0] || null,
      )
      return {
        ...factionWithPassives,
        unidades: factionWithPassives.unidades.filter(
        (unit) =>
          isUnitTypeAllowedInGameMode(unit.tipo, gameMode)
          && (!activeRandomFilters.size || activeRandomFilters.has(unit.tipo))
          && unitMatchesEraFilters(unit, activeRandomEraFilters),
        ),
      }
    }
    const factionPool =
      randomFactionIdSafe === 'random'
        ? factions.map(filterFactionUnits).filter((faction) => faction.unidades.length)
        : []
    const faction =
      randomFactionIdSafe === 'random'
        ? factionPool[Math.floor(Math.random() * factionPool.length)]
        : filterFactionUnits(factions.find((item) => item.id === randomFactionIdSafe))
    if (!faction?.unidades?.length) return
    const target = toNumber(targetValue)
    const result = generateArmyByValue(
      faction,
      target,
      gameMode,
      activeRandomFilters.size ? activeRandomFilters : null,
    )
    setArmyUnits(result.units)
    setArmyFactionId(result.faction?.id || '')
    setArmyPassiveGroupId(getFirstPassiveGroupId(result.faction))
  }

  const exportPdf = () =>
    exportGeneratorPdf({
      armyUnits: localizedArmyUnits,
      armyFaction: armyFactionForPdf,
      totalValue,
      gameMode,
      t,
      lang,
    })

  return (
    <section className="section generator-page reveal" id="generador">
      <div className="section-head reveal">
        <p className="eyebrow">{t('generator.eyebrow')}</p>
        <h2>{t('generator.title')}</h2>
        <p>{t('generator.subtitle')}</p>
      </div>

      <div className="generator-layout reveal">
        <div className="generator-main">
          <div className="mode-switch">
            <button
              className={mode === 'manual' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('manual')}
            >
              {t('generator.modeCreate')}
            </button>
            <button
              className={mode === 'random' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('random')}
            >
              {t('generator.modeRandom')}
            </button>
          </div>

          {mode === 'manual' && (
            <div className="manual-panel">
              <GameModePicker value={gameMode} onChange={setGameMode} t={t} />
              <div className="field">
                <span>{t('generator.faction')}</span>
                <CustomSelect
                  t={t}
                  value={selectedFactionIdSafe}
                  onChange={(next) => handleFactionChange({ target: { value: next } })}
                  options={factionSelectOptions}
                />
              </div>

              {selectedFaction && (
                <>
                  <div className="faction-summary">
                    <div className="faction-header">
                      {factionImages[selectedFaction.id] && (
                        <img src={factionImages[selectedFaction.id]} alt={selectedFaction.nombre} />
                      )}
                      <h3>{selectedFaction.nombre}</h3>
                    </div>
                    <p className="faction-description">{selectedFaction.estilo}</p>
                    {selectedFaction.grupos_habilidades_faccion.length > 0 && (
                      <div className="doctrine-panel">
                        <div className="doctrine-panel-header">
                          <p className="faction-passives-title">{t('generator.choosePassives')}</p>
                          <button
                            type="button"
                            className="ghost tiny passive-group-open-button"
                            onClick={() => setIsPassiveModalOpen(true)}
                            aria-label={t('generator.passiveModalTitle')}
                          >
                            {t('generator.select')}
                          </button>
                        </div>
                        {selectedPassiveGroup ? (
                          <div className="doctrine-item passive-group-current">
                            <div className="doctrine-item-main">
                              <span className="doctrine-icon-box passive-group-icon-box">
                                <PassiveGroupIcon groupId={selectedPassiveGroup.id} />
                              </span>
                              <div className="doctrine-content">
                                <p className="doctrine-name">
                                  {getPassiveGroupDisplayName(
                                    selectedPassiveGroup,
                                    t,
                                    Math.max(
                                      selectedFaction.grupos_habilidades_faccion.findIndex((group) => group.id === selectedPassiveGroup.id),
                                      0,
                                    ),
                                  )}
                                </p>
                                <p className="doctrine-description">
                                  {selectedPassiveGroup.habilidades.map((skill) => skill.nombre).join(' · ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="unit-type-filters">
                    {availableEraTokens.map((token) => (
                      <label key={token} className={`unit-type-filter unit-era-filter unit-era-filter-${token}`}>
                        <input
                          type="checkbox"
                          checked={activeManualEraFilters.has(token)}
                          onChange={() => handleToggleEraManual(token)}
                        />
                        <span>{getEraLabel(token)}</span>
                      </label>
                    ))}
                    {availableUnitTypes.map((type) => (
                      <label key={type} className="unit-type-filter">
                        <input
                          type="checkbox"
                          checked={activeManualFilters.has(type)}
                          onChange={() => handleToggleUnitTypeManual(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="unit-list">
                    {visibleManualUnits.map((unit) => (
                      <article className="unit-card" key={unit.id}>
                        <div>
                          <div className="unit-card-header">
                            <h4>{unit.nombre}</h4>
                            <button type="button" className="ghost tiny" onClick={() => handleOpenConfigurator(unit)}>
                              {gameMode === 'escuadra' ? t('generator.createSquad') : t('generator.configure')}
                            </button>
                          </div>
                          <p className="unit-meta">
                            <UnitTypeBadge type={unit.tipo} />
                            {' '}·{' '}
                            <span className="unit-value">{unit.valor_base} {t('generator.valueUnit')}</span>
                            {unit.eras?.length ? (
                              <>
                                {' '}·{' '}
                                <span className="unit-era-list">
                                  {unit.eras.map((era) => (
                                    <span key={`${unit.id}-${era.token}-${era.label}`} className={`unit-era-badge unit-era-${era.token}`}>
                                      {era.token === 'future' || era.token === 'past' ? getEraLabel(era.token) : era.label}
                                    </span>
                                  ))}
                                </span>
                              </>
                            ) : null}
                          </p>
                          <div className="unit-stats-table">
                            <div className="unit-stats-row head">
                              <span>{t('generator.mov')}</span>
                              <span>{t('generator.vidas')}</span>
                              <span>{t('generator.salv')}</span>
                              <span>{t('generator.vel')}</span>
                              {gameMode === 'escuadra' ? <span>{t('generator.squadCap')}</span> : null}
                            </div>
                            <div className="unit-stats-row">
                              <span>{unit.movimiento}</span>
                              <span>{unit.vidas}</span>
                              <span>{unit.salvacion}</span>
                              <span>{unit.velocidad}</span>
                              {gameMode === 'escuadra' ? (
                                <span>{`${unit.escuadra_min} / ${unit.escuadra_max}`}</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="unit-specialty">{unit.especialidad}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'random' && (
            <div className="random-panel">
              <GameModePicker value={gameMode} onChange={setGameMode} t={t} />
              <label className="field">
                {t('generator.targetValue')}
                <input
                  type="number"
                  min="0"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </label>
              <div className="field">
                <span>{t('generator.faction')}</span>
                <CustomSelect
                  t={t}
                  value={randomFactionIdSafe}
                  onChange={handleRandomFactionChange}
                  options={randomFactionSelectOptions}
                />
              </div>
              <div className="unit-type-filters">
                {availableEraTokensRandom.map((token) => (
                  <label key={`random-era-${token}`} className={`unit-type-filter unit-era-filter unit-era-filter-${token}`}>
                    <input
                      type="checkbox"
                      checked={activeRandomEraFilters.has(token)}
                      onChange={() => handleToggleEraRandom(token)}
                    />
                    <span>{getEraLabel(token)}</span>
                  </label>
                ))}
                {availableUnitTypesRandom.map((type) => (
                  <label key={`random-${type}`} className="unit-type-filter">
                    <input
                      type="checkbox"
                      checked={activeRandomFilters.has(type)}
                      onChange={() => handleToggleUnitTypeRandom(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="primary" onClick={handleGenerateRandom}>
                {t('generator.generate')}
              </button>
            </div>
          )}
        </div>

        <aside className="army-panel">
          <div className="army-header">
            <div>
              <p className="eyebrow">{t('generator.currentArmy')}</p>
              <h3>{currentArmyFaction?.nombre || t('generator.noFaction')}</h3>
            </div>
            <span className="army-total">{totalValue} {t('generator.valueUnit')}</span>
          </div>

          <div className="army-actions">
            <button type="button" className="ghost small" onClick={handleReset}>
              {t('generator.resetArmy')}
            </button>
            <button type="button" className="ghost small" onClick={exportPdf} disabled={!localizedArmyUnits.length}>
              {t('generator.downloadPdf')}
            </button>
          </div>

          {currentArmyPassiveGroup?.habilidades?.length ? (
            <div className="army-passive-group">
              <p className="faction-passives-title">{t('generator.selectedPassiveSet')}</p>
              {(() => {
                const groupIndex = Math.max(
                  currentArmyFaction?.grupos_habilidades_faccion?.findIndex((group) => group.id === currentArmyPassiveGroup.id) ?? 0,
                  0,
                )
                return (
                  <>
                    <strong className="army-passive-group-name">
                      {getPassiveGroupDisplayName(currentArmyPassiveGroup, t, groupIndex)}
                    </strong>
                    <ul>
                      {currentArmyPassiveGroup.habilidades.map((skill) => (
                        <li key={`army-passive-${skill.id}`}>
                          <strong>{skill.nombre}:</strong> {skill.descripcion}
                        </li>
                      ))}
                    </ul>
                  </>
                )
              })()}
            </div>
          ) : null}

          {localizedArmyUnits.length === 0 && (
            <p className="empty-state">{t('generator.noUnitsYet')}</p>
          )}

          <div className="army-list">
            {localizedArmyUnits.map((unit) => (
              <article className="army-unit" key={unit.uid}>
                <div className="army-unit-header">
                  <div>
                    <h4>{armyUnitDisplayNames.get(unit.uid) || unit.base.nombre}</h4>
                    <p>
                      <UnitTypeBadge type={unit.base.tipo} />
                      {gameMode === 'escuadra' ? ` · ${t('generator.size')} ${unit.squadSize || 1}` : ''}
                      {unit.perMiniLoadouts?.length ? ` · ${t('generator.squadLabel')}` : ''}
                    </p>
                  </div>
                  <span>{unit.total} {t('generator.valueUnit')}</span>
                </div>
                <div className="army-weapons">
                  {unit.perMiniLoadouts?.length ? (
                    <div>
                      <strong>{t('generator.weapons')}:</strong>
                      <div className="mini-loadout-list">
                        {unit.perMiniLoadouts.map((loadout, index) => {
                          return (
                            <div key={`loadout-${unit.uid}-${index}`} className="mini-loadout-item">
                              <div className="mini-loadout-label">{t('generator.unit')} {index + 1}</div>
                              <div>
                                <strong>{t('generator.shooting')}:</strong>{' '}
                                {(loadout.shooting || []).map((weapon) => weapon.nombre).join(', ') || '—'}
                              </div>
                              <div>
                                <strong>{t('generator.melee')}:</strong> {loadout.melee?.nombre || '—'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : unit.shooting.length > 0 ? (
                    <div>
                      <strong>{t('generator.shooting')}:</strong> {unit.shooting.map((weapon) => weapon.nombre).join(', ')}
                    </div>
                  ) : null}
                  {!unit.perMiniLoadouts?.length && unit.melee && (
                    <div>
                      <strong>{t('generator.melee')}:</strong> {unit.melee.nombre}
                    </div>
                  )}
                </div>
                <div className="army-unit-actions">
                  <button type="button" className="ghost tiny" onClick={() => handleEditUnit(unit)}>
                    {t('generator.edit')}
                  </button>
                  <button type="button" className="ghost tiny" onClick={() => handleRemoveUnit(unit.uid)}>
                    {t('generator.delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {activeUnit && (
        <UnitConfigurator
          t={t}
          lang={lang}
          unit={activeUnit.base || activeUnit}
          selected={activeUnit.shooting || activeUnit.melee ? activeUnit : null}
          armyUnits={armyUnits}
          gameMode={gameMode}
          onClose={() => setActiveUnit(null)}
          onConfirm={(unit, shooting, melee, editingUid, nextSquadSize, nextPerMini, nextImageDataUrl) => {
            if (editingUid) {
              const clampedSize = clampSquadSize(nextSquadSize, unit)
              const candidateEntry = {
                uid: editingUid,
                shooting,
                melee,
                perMiniLoadouts: nextPerMini,
              }
              if (selectionHasWeaponLimitError(candidateEntry, armyUnits, gameMode, editingUid)) return
              setArmyUnits((prev) =>
                prev.map((entry) =>
                  entry.uid === editingUid
                    ? {
                        ...entry,
                        base: unit,
                        shooting,
                        melee,
                        squadSize: clampedSize,
                        perMiniLoadouts: nextPerMini,
                        imageDataUrl: nextImageDataUrl || '',
                        total: computeUnitTotal(unit, shooting, melee, clampedSize, nextPerMini, gameMode),
                      }
                    : entry,
                ),
              )
              setActiveUnit(null)
              return
            }
            handleAddUnit(unit, shooting, melee, nextSquadSize || 1, nextPerMini, nextImageDataUrl)
          }}
        />
      )}

      {isPassiveModalOpen && selectedFaction && typeof document !== 'undefined'
        ? createPortal(
            <div className="unit-modal" role="dialog" aria-modal="true" onClick={() => setIsPassiveModalOpen(false)}>
              <div className="unit-modal-card doctrine-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="unit-modal-header">
                  <div>
                    <p className="eyebrow">{selectedFaction.nombre}</p>
                    <h3>{t('generator.passiveModalTitle')}</h3>
                  </div>
                  <button type="button" className="ghost small" onClick={() => setIsPassiveModalOpen(false)}>
                    {t('generator.close')}
                  </button>
                </div>

                <div className="unit-modal-body passive-group-list">
                  {selectedFaction.grupos_habilidades_faccion.length ? (
                    selectedFaction.grupos_habilidades_faccion.map((group, index) => {
                      const isActive = group.id === selectedPassiveGroupIdSafe
                      return (
                        <button
                          key={group.id}
                          type="button"
                          className={`passive-group-card${isActive ? ' active' : ''}`}
                          onClick={() => handleSelectPassiveGroup(group.id)}
                        >
                          <div className="passive-group-card-top">
                            <span className="doctrine-icon-box passive-group-icon-box">
                              <PassiveGroupIcon groupId={group.id} />
                            </span>
                            <div className="passive-group-heading">
                              <span className="passive-group-label">{t('generator.passiveSet')}</span>
                              <strong>{getPassiveGroupDisplayName(group, t, index)}</strong>
                            </div>
                          </div>
                          <ul>
                            {group.habilidades.map((skill) => (
                              <li key={skill.id}>
                                <strong>{skill.nombre}:</strong> {skill.descripcion}
                              </li>
                            ))}
                          </ul>
                        </button>
                      )
                    })
                  ) : (
                    <p className="empty-state">{t('generator.noPassiveSetsAvailable')}</p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

export default Generador
