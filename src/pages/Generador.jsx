import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import { doctrineCatalog } from '../data/doctrines/doctrineCatalog.js'
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
  getFactionSkillDescriptionForMode,
  getUnitSpecialtyForMode,
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

const getFactionPassiveSelectionMode = (faction) => {
  if (faction?.seleccion_habilidades === 'multiple') return 'multiple'
  if (faction?.seleccion_habilidades === 'individual') return 'individual'
  return 'grupo'
}

const getFactionAbilityOptions = (faction) =>
  Array.isArray(faction?.habilidades_faccion) ? faction.habilidades_faccion : []

const getFactionAbilitySelectionLimit = (faction) =>
  getFactionPassiveSelectionMode(faction) === 'multiple' ? 3 : 1

const sanitizeFactionAbilityIds = (faction, skillIds) => {
  if (getFactionPassiveSelectionMode(faction) === 'grupo') return []
  const options = getFactionAbilityOptions(faction)
  const availableIds = new Set(options.map((skill) => skill.id))
  const uniqueIds = []
  ;(Array.isArray(skillIds) ? skillIds : []).forEach((skillId) => {
    if (!availableIds.has(skillId) || uniqueIds.includes(skillId)) return
    uniqueIds.push(skillId)
  })
  return uniqueIds.slice(0, getFactionAbilitySelectionLimit(faction))
}

const buildFactionAbilitySelection = (faction, skillIds) => {
  const mode = getFactionPassiveSelectionMode(faction)
  if (mode === 'grupo') return null

  const options = getFactionAbilityOptions(faction)
  const abilityById = new Map(options.map((skill) => [skill.id, skill]))
  const safeIds = sanitizeFactionAbilityIds(faction, skillIds)
  const habilidades = safeIds.map((skillId) => abilityById.get(skillId)).filter(Boolean)
  if (!habilidades.length) return null

  return {
    id: safeIds.join('|'),
    nombre: habilidades.map((skill) => skill.nombre).join(' · '),
    habilidades,
    tipo: mode,
    coste_total: habilidades.reduce((sum, skill) => sum + toNumber(skill.coste), 0),
  }
}

const getFactionSelectionCost = (selection) =>
  Array.isArray(selection?.habilidades)
    ? selection.habilidades.reduce((sum, skill) => sum + toNumber(skill?.coste), 0)
    : 0

const localizeDoctrineEntries = (lang) =>
  doctrineCatalog.map((doctrine) => ({
    id: doctrine.id,
    nombre: doctrine.nombre?.[lang] || doctrine.nombre?.es || doctrine.id,
    descripcion: doctrine.descripcion?.[lang] || doctrine.descripcion?.es || '',
    coste: toNumber(doctrine.coste),
    imageSrc: doctrine.images?.[lang] || doctrine.images?.es || '',
  }))

const sanitizeDoctrineIds = (doctrines, doctrineIds) => {
  const availableIds = new Set((Array.isArray(doctrines) ? doctrines : []).map((doctrine) => doctrine.id))
  const uniqueIds = []
  ;(Array.isArray(doctrineIds) ? doctrineIds : []).forEach((doctrineId) => {
    if (!availableIds.has(doctrineId) || uniqueIds.includes(doctrineId)) return
    uniqueIds.push(doctrineId)
  })
  return uniqueIds
}

const getDoctrineTotal = (doctrines) =>
  (Array.isArray(doctrines) ? doctrines : []).reduce((sum, doctrine) => sum + toNumber(doctrine?.coste), 0)

const buildMultipleFactionAbilitySelections = (faction) => {
  const options = getFactionAbilityOptions(faction)
  const selections = []

  for (let i = 0; i < options.length; i += 1) {
    selections.push(buildFactionAbilitySelection(faction, [options[i].id]))
    for (let j = i + 1; j < options.length; j += 1) {
      selections.push(buildFactionAbilitySelection(faction, [options[i].id, options[j].id]))
      for (let k = j + 1; k < options.length; k += 1) {
        selections.push(buildFactionAbilitySelection(faction, [options[i].id, options[j].id, options[k].id]))
      }
    }
  }

  return selections.filter(Boolean)
}

const getRandomFactionSelectionCandidates = (faction, target) => {
  if (!faction) return [null]

  const mode = getFactionPassiveSelectionMode(faction)
  const allSelections =
    mode === 'multiple'
      ? buildMultipleFactionAbilitySelections(faction)
      : getFactionPassiveSelections(faction)

  const affordableSelections = allSelections.filter((selection) => getFactionSelectionCost(selection) < target)
  const baseSelections = affordableSelections.length ? affordableSelections : allSelections

  return [null, ...baseSelections]
}

const scoreRandomArmyCandidate = ({ unitResult, selection, target }) => {
  const selectionCost = getFactionSelectionCost(selection)
  const total = (unitResult?.total || 0) + selectionCost
  let score = unitResult?.score || 0

  if (selection?.habilidades?.length) {
    score += Math.min(4, 1 + selection.habilidades.length)
  }

  if (target > 0) {
    score -= Math.max(0, target - total) * 0.08
  }

  return score
}

const getFactionPassiveSelections = (faction) => {
  if (!faction) return []
  if (getFactionPassiveSelectionMode(faction) !== 'grupo') {
    return getFactionAbilityOptions(faction).map((skill) => ({
      id: skill.id,
      nombre: skill.nombre,
      habilidades: [skill],
      tipo: getFactionPassiveSelectionMode(faction),
      coste_total: toNumber(skill.coste),
    }))
  }
  return Array.isArray(faction.grupos_habilidades_faccion) ? faction.grupos_habilidades_faccion : []
}
const getFirstPassiveGroupId = (faction) =>
  getFactionPassiveSelectionMode(faction) === 'grupo' ? getFactionPassiveSelections(faction)?.[0]?.id || '' : ''
const sanitizePassiveGroupId = (faction, passiveGroupId) => {
  if (getFactionPassiveSelectionMode(faction) === 'multiple') return ''
  const options = getFactionPassiveSelections(faction)
  if (!options.length) return ''
  if (!passiveGroupId) return ''
  return options.some((option) => option.id === passiveGroupId) ? passiveGroupId : ''
}
const cleanPassiveGroupName = (value) => String(value || '').replace(/^\s*\d+\.\s*/, '').trim()
const getPassiveGroupDisplayName = (group, t, fallbackIndex = 0) =>
  cleanPassiveGroupName(group?.nombre) || `${t('generator.defaultPassiveSet')} ${fallbackIndex + 1}`
const getPassiveSelectionDisplayName = (selection, faction, t, fallbackIndex = 0) =>
  getFactionPassiveSelectionMode(faction) !== 'grupo'
    ? String(selection?.nombre || '').trim() || `${t('generator.passive')} ${fallbackIndex + 1}`
    : getPassiveGroupDisplayName(selection, t, fallbackIndex)
const getPassiveSelectionLabelKey = (faction, singularKey, groupKey) =>
  getFactionPassiveSelectionMode(faction) === 'grupo' ? groupKey : singularKey

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

const getExclusiveEraSelection = (availableTokens, currentSelection) => {
  if (!availableTokens.length) return new Set()
  const firstMatchingToken = [...(currentSelection || [])].find((token) => availableTokens.includes(token))
  return new Set([firstMatchingToken || availableTokens[0]])
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

function EraWorldSwitch({ tokens, activeTokens, onToggle, getLabel, title }) {
  if (!tokens?.length) return null

  return (
    <div className="field field-era-worlds">
      <div className="era-world-switch" role="group" aria-label={title}>
        {tokens.map((token) => {
          const isActive = activeTokens.has(token)
          return (
            <button
              key={token}
              type="button"
              className={`era-world-button era-world-button-${token}${isActive ? ' active' : ''}`}
              onClick={() => onToggle(token)}
              aria-pressed={isActive}
            >
              {getLabel(token)}
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

function DoctrineIcon({ doctrine }) {
  if (doctrine?.imageSrc) {
    return <img src={doctrine.imageSrc} alt="" />
  }

  return (
    <svg className="doctrine-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 18 7v10l-6 3.5L6 17V7l6-3.5z" />
      <path d="M9.2 11.8 11 13.6l3.8-4" />
    </svg>
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
    if (typeof window === 'undefined') {
      return { units: [], factionId: '', passiveGroupId: '', factionSkillIds: [], doctrineIds: [] }
    }
    const saved = window.localStorage.getItem('zerolore_army_v1')
    if (!saved) return { units: [], factionId: '', passiveGroupId: '', factionSkillIds: [], doctrineIds: [] }
    try {
      const parsed = JSON.parse(saved)
      if (parsed?.units && Array.isArray(parsed.units)) {
        const doctrineIds = (
          Array.isArray(parsed.doctrineIds)
            ? parsed.doctrineIds
            : Array.isArray(parsed.doctrines)
              ? parsed.doctrines.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean)
              : []
        )
        return {
          units: parsed.units,
          factionId: parsed.factionId || '',
          passiveGroupId: parsed.passiveGroupId || '',
          factionSkillIds: Array.isArray(parsed.factionSkillIds) ? parsed.factionSkillIds : [],
          doctrineIds,
        }
      }
    } catch {
      // Ignore invalid cache
    }
    return { units: [], factionId: '', passiveGroupId: '', factionSkillIds: [], doctrineIds: [] }
  }

  const initialSaved = getSavedArmy()
  const [armyFactionId, setArmyFactionId] = useState(initialSaved.factionId)
  const [armyPassiveGroupId, setArmyPassiveGroupId] = useState(initialSaved.passiveGroupId)
  const [armyFactionSkillIds, setArmyFactionSkillIds] = useState(initialSaved.factionSkillIds)
  const [armyDoctrineIds, setArmyDoctrineIds] = useState(initialSaved.doctrineIds)
  const [armyUnits, setArmyUnits] = useState(initialSaved.units)
  const [selectedPassiveGroupId, setSelectedPassiveGroupId] = useState('')
  const [selectedFactionSkillIds, setSelectedFactionSkillIds] = useState([])
  const [selectedDoctrineIds, setSelectedDoctrineIds] = useState(initialSaved.doctrineIds)
  const [isPassiveModalOpen, setIsPassiveModalOpen] = useState(false)
  const [isDoctrineModalOpen, setIsDoctrineModalOpen] = useState(false)
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
  const localizedDoctrines = useMemo(() => localizeDoctrineEntries(lang), [lang])
  const doctrineById = useMemo(
    () => new Map(localizedDoctrines.map((doctrine) => [doctrine.id, doctrine])),
    [localizedDoctrines],
  )
  const selectedPassiveOptions = useMemo(() => getFactionPassiveSelections(selectedFaction), [selectedFaction])
  const armyPassiveOptions = useMemo(() => getFactionPassiveSelections(armyFaction), [armyFaction])
  const selectedFactionSkillIdsSafe = useMemo(
    () => sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds),
    [selectedFaction, selectedFactionSkillIds],
  )
  const armyFactionSkillIdsSafe = useMemo(
    () => sanitizeFactionAbilityIds(armyFaction, armyFactionSkillIds),
    [armyFaction, armyFactionSkillIds],
  )
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
    () => selectedPassiveOptions.find((group) => group.id === selectedPassiveGroupIdSafe) || null,
    [selectedPassiveOptions, selectedPassiveGroupIdSafe],
  )
  const selectedFactionSelection = useMemo(
    () =>
      getFactionPassiveSelectionMode(selectedFaction) === 'multiple'
        ? buildFactionAbilitySelection(selectedFaction, selectedFactionSkillIdsSafe)
        : selectedPassiveGroup,
    [selectedFaction, selectedFactionSkillIdsSafe, selectedPassiveGroup],
  )
  const selectedFactionWithPassives = useMemo(
    () => applyPassiveGroupEffectsToFaction(selectedFaction, selectedFactionSelection),
    [selectedFaction, selectedFactionSelection],
  )
  const armyPassiveGroupIdSafe = useMemo(
    () => sanitizePassiveGroupId(armyFaction, armyPassiveGroupId),
    [armyFaction, armyPassiveGroupId],
  )
  const armyPassiveGroup = useMemo(
    () => armyPassiveOptions.find((group) => group.id === armyPassiveGroupIdSafe) || null,
    [armyPassiveOptions, armyPassiveGroupIdSafe],
  )
  const armyFactionSelection = useMemo(
    () =>
      getFactionPassiveSelectionMode(armyFaction) === 'multiple'
        ? buildFactionAbilitySelection(armyFaction, armyFactionSkillIdsSafe)
        : armyPassiveGroup,
    [armyFaction, armyFactionSkillIdsSafe, armyPassiveGroup],
  )
  const armyFactionWithPassives = useMemo(
    () => applyPassiveGroupEffectsToFaction(armyFaction, armyFactionSelection),
    [armyFaction, armyFactionSelection],
  )
  const selectedDoctrineIdsSafe = useMemo(
    () => sanitizeDoctrineIds(localizedDoctrines, selectedDoctrineIds),
    [localizedDoctrines, selectedDoctrineIds],
  )
  const armyDoctrineIdsSafe = useMemo(
    () => sanitizeDoctrineIds(localizedDoctrines, armyDoctrineIds),
    [localizedDoctrines, armyDoctrineIds],
  )
  const selectedDoctrines = useMemo(
    () => selectedDoctrineIdsSafe.map((doctrineId) => doctrineById.get(doctrineId)).filter(Boolean),
    [doctrineById, selectedDoctrineIdsSafe],
  )
  const armyDoctrines = useMemo(
    () => armyDoctrineIdsSafe.map((doctrineId) => doctrineById.get(doctrineId)).filter(Boolean),
    [armyDoctrineIdsSafe, doctrineById],
  )
  const manualCurrentSelection = useMemo(() => {
    if (getFactionPassiveSelectionMode(selectedFaction) !== 'multiple') return selectedFactionSelection
    const currentIds = sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds)
    const selectedOptions = selectedPassiveOptions.filter((group) => currentIds.includes(group.id))
    const habilidades = selectedOptions.map((group) => group.habilidades?.[0]).filter(Boolean)
    if (!habilidades.length) return null
    return {
      id: currentIds.join('|'),
      nombre: habilidades.map((skill) => skill.nombre).join(' · '),
      habilidades,
      tipo: 'multiple',
      coste_total: habilidades.reduce((sum, skill) => sum + toNumber(skill.coste), 0),
    }
  }, [selectedFaction, selectedFactionSelection, selectedFactionSkillIds, selectedPassiveOptions])
  const currentArmyFaction = mode === 'manual' ? selectedFaction : armyFaction
  const currentArmySelection = mode === 'manual' ? manualCurrentSelection : armyFactionSelection
  const currentArmyDoctrines = mode === 'manual' ? selectedDoctrines : armyDoctrines
  const currentArmyFactionWithPassives = mode === 'manual' ? selectedFactionWithPassives : armyFactionWithPassives
  const activeArmyFactionForPdf = useMemo(
    () =>
      currentArmyFactionWithPassives
        ? {
            ...currentArmyFactionWithPassives,
            selectedPassiveGroup: currentArmySelection,
          }
        : currentArmyFactionWithPassives,
    [currentArmyFactionWithPassives, currentArmySelection],
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
    return getExclusiveEraSelection(availableEraTokens, eraFiltersManual)
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
    return getExclusiveEraSelection(availableEraTokensRandom, eraFiltersRandom)
  }, [availableEraTokensRandom, eraFiltersRandom])

  const localizedArmyUnits = useMemo(
    () => localizeArmyUnits(armyUnits, currentArmyFactionWithPassives),
    [armyUnits, currentArmyFactionWithPassives],
  )
  const factionAbilityTotal = useMemo(() => getFactionSelectionCost(currentArmySelection), [currentArmySelection])
  const doctrineTotal = useMemo(() => getDoctrineTotal(currentArmyDoctrines), [currentArmyDoctrines])
  const totalValue = localizedArmyUnits.reduce((total, unit) => total + unit.total, 0) + factionAbilityTotal + doctrineTotal
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
      factionSkillIds: armyFactionSkillIdsSafe,
      doctrineIds: armyDoctrineIdsSafe,
    })
    window.localStorage.setItem('zerolore_army_v1', payload)
  }, [armyUnits, armyFactionIdSafe, armyPassiveGroupIdSafe, armyFactionSkillIdsSafe, armyDoctrineIdsSafe])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const hasOpenModal = Boolean(activeUnit) || isPassiveModalOpen || isDoctrineModalOpen
    const previousOverflow = document.body.style.overflow
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeUnit, isPassiveModalOpen, isDoctrineModalOpen])

  const handleFactionChange = (event) => {
    const next = event.target.value
    const nextFaction = factions.find((faction) => faction.id === next)
    const nextTypes = nextFaction ? Array.from(new Set(nextFaction.unidades.map((unit) => unit.tipo))) : []
    const nextEras = nextFaction
      ? getOrderedEraTokens(nextFaction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode)))
      : []
    const nextPassiveGroupId = getFirstPassiveGroupId(nextFaction)
    const nextFactionSkillIds = []
    const shouldResetArmy = armyUnits.length > 0 && armyFactionIdSafe && armyFactionIdSafe !== next
    startTransition(() => {
      setSelectedFactionId(next)
      setSelectedPassiveGroupId(nextPassiveGroupId)
      setSelectedFactionSkillIds(nextFactionSkillIds)
      setIsPassiveModalOpen(false)
      setIsDoctrineModalOpen(false)
      setUnitTypeFiltersManual(new Set(nextTypes))
      setEraFiltersManual(getExclusiveEraSelection(nextEras, nextEras))
      if (shouldResetArmy) {
        setArmyUnits([])
        setArmyFactionId(next)
        setArmyPassiveGroupId(nextPassiveGroupId)
        setArmyFactionSkillIds(nextFactionSkillIds)
        setArmyDoctrineIds(selectedDoctrineIdsSafe)
      } else if (!armyUnits.length || !armyFactionIdSafe || armyFactionIdSafe === next) {
        setArmyFactionId(next)
        setArmyPassiveGroupId(nextPassiveGroupId)
        setArmyFactionSkillIds(nextFactionSkillIds)
        setArmyDoctrineIds(selectedDoctrineIdsSafe)
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
    setEraFiltersRandom(getExclusiveEraSelection(nextEras, nextEras))
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
    if (!availableEraTokens.includes(token)) return
    setEraFiltersManual(new Set([token]))
  }

  const handleToggleEraRandom = (token) => {
    if (!availableEraTokensRandom.includes(token)) return
    setEraFiltersRandom(new Set([token]))
  }

  const handleOpenConfigurator = (unit) => {
    setActiveUnit(unit)
  }

  const handleSelectPassiveGroup = (groupId) => {
    setSelectedPassiveGroupId(groupId)
    if (!armyUnits.length || !armyFactionIdSafe || armyFactionIdSafe === selectedFactionIdSafe) {
      setArmyFactionId(selectedFactionIdSafe)
      setArmyPassiveGroupId(groupId)
      setArmyFactionSkillIds([])
    }
    setIsPassiveModalOpen(false)
  }

  const handleToggleFactionSkill = (skillId) => {
    setSelectedFactionSkillIds((prev) => {
      const currentIds = sanitizeFactionAbilityIds(selectedFaction, prev)
      const nextIds = (() => {
        if (currentIds.includes(skillId)) {
          return currentIds.filter((id) => id !== skillId)
        }
        if (currentIds.length >= getFactionAbilitySelectionLimit(selectedFaction)) {
          return currentIds
        }
        return [...currentIds, skillId]
      })()

      if (!armyUnits.length || !armyFactionIdSafe || armyFactionIdSafe === selectedFactionIdSafe) {
        setArmyFactionId(selectedFactionIdSafe)
        setArmyPassiveGroupId('')
        setArmyFactionSkillIds(nextIds)
      }

      return nextIds
    })
  }

  const handleRemoveArmyFactionSkill = (skillId) => {
    setArmyFactionSkillIds((prev) => {
      const currentIds = sanitizeFactionAbilityIds(armyFaction, prev)
      const nextIds = currentIds.filter((id) => id !== skillId)

      if (mode === 'manual' && selectedFactionIdSafe === armyFactionIdSafe) {
        setSelectedFactionSkillIds(nextIds)
      }

      return nextIds
    })
  }

  const handleAddDoctrine = (doctrineId) => {
    setSelectedDoctrineIds((prev) => {
      const currentIds = sanitizeDoctrineIds(localizedDoctrines, prev)
      if (currentIds.includes(doctrineId)) return currentIds
      const nextIds = [...currentIds, doctrineId]

      if (!armyUnits.length || !armyFactionIdSafe || armyFactionIdSafe === selectedFactionIdSafe) {
        setArmyFactionId(selectedFactionIdSafe)
        setArmyDoctrineIds(nextIds)
      }

      return nextIds
    })
    setIsDoctrineModalOpen(false)
  }

  const handleRemoveSelectedDoctrine = (doctrineId) => {
    setSelectedDoctrineIds((prev) => {
      const nextIds = sanitizeDoctrineIds(localizedDoctrines, prev).filter((id) => id !== doctrineId)

      if (!armyUnits.length || !armyFactionIdSafe || armyFactionIdSafe === selectedFactionIdSafe) {
        setArmyFactionId(selectedFactionIdSafe)
        setArmyDoctrineIds(nextIds)
      }

      return nextIds
    })
  }

  const handleRemoveArmyDoctrine = (doctrineId) => {
    setArmyDoctrineIds((prev) => {
      const nextIds = sanitizeDoctrineIds(localizedDoctrines, prev).filter((id) => id !== doctrineId)

      if (mode === 'manual' && selectedFactionIdSafe === armyFactionIdSafe) {
        setSelectedDoctrineIds(nextIds)
      }

      return nextIds
    })
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
    setArmyFactionSkillIds(selectedFactionSkillIdsSafe)
    setArmyDoctrineIds(selectedDoctrineIdsSafe)
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
    setArmyFactionSkillIds([])
    setSelectedFactionSkillIds([])
    setArmyDoctrineIds([])
    setSelectedDoctrineIds([])
    setIsPassiveModalOpen(false)
    setIsDoctrineModalOpen(false)
  }

  const handleGenerateRandom = () => {
    if (!factions.length) return
    const target = toNumber(targetValue)
    if (target <= 0) return

    const buildBestFactionCandidate = (baseFaction) => {
      if (!baseFaction) return null

      const selectionCandidates = getRandomFactionSelectionCandidates(baseFaction, target)
      let bestCandidate = null

      selectionCandidates.forEach((selection) => {
        const selectionCost = getFactionSelectionCost(selection)
        const remainingTarget = Math.max(0, target - selectionCost)
        const factionWithPassives = applyPassiveGroupEffectsToFaction(baseFaction, selection)
        const filteredFaction = {
          ...factionWithPassives,
          unidades: factionWithPassives.unidades.filter(
            (unit) =>
              isUnitTypeAllowedInGameMode(unit.tipo, gameMode)
              && (!activeRandomFilters.size || activeRandomFilters.has(unit.tipo))
              && unitMatchesEraFilters(unit, activeRandomEraFilters),
          ),
        }

        if (!filteredFaction.unidades.length) return

        const unitResult = generateArmyByValue(
          filteredFaction,
          remainingTarget,
          gameMode,
          activeRandomFilters.size ? activeRandomFilters : null,
        )

        const score = scoreRandomArmyCandidate({
          unitResult,
          selection,
          target,
        })

        if (!bestCandidate || score > bestCandidate.score) {
          bestCandidate = {
            faction: baseFaction,
            generatedFaction: filteredFaction,
            selection,
            unitResult,
            score,
          }
        }
      })

      return bestCandidate
    }

    const factionCandidates = (
      randomFactionIdSafe === 'random'
        ? factions
        : [factions.find((item) => item.id === randomFactionIdSafe)].filter(Boolean)
    )
      .map(buildBestFactionCandidate)
      .filter((candidate) => candidate?.unitResult?.units?.length)

    if (!factionCandidates.length) return

    const rankedCandidates = [...factionCandidates].sort((a, b) => b.score - a.score)
    const shortlistedCandidates = rankedCandidates.slice(0, Math.min(3, rankedCandidates.length))
    const chosenCandidate = shortlistedCandidates[Math.floor(Math.random() * shortlistedCandidates.length)]
    const chosenMode = getFactionPassiveSelectionMode(chosenCandidate.faction)

    setArmyUnits(chosenCandidate.unitResult.units)
    setArmyFactionId(chosenCandidate.faction?.id || '')
    setArmyPassiveGroupId(chosenMode === 'multiple' ? '' : chosenCandidate.selection?.id || '')
    setArmyFactionSkillIds(
      chosenMode === 'multiple'
        ? (chosenCandidate.selection?.habilidades || []).map((skill) => skill.id)
        : [],
    )
    setArmyDoctrineIds([])
  }

  const exportPdf = () =>
    exportGeneratorPdf({
      armyUnits: localizedArmyUnits,
      armyFaction: activeArmyFactionForPdf,
      doctrines: currentArmyDoctrines,
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
                    {selectedPassiveOptions.length > 0 && (
	                        <div className="doctrine-panel">
	                          <div className="doctrine-panel-header">
	                            <div className="faction-passives-heading">
	                              <p className="faction-passives-title">{t('generator.choosePassives')}</p>
	                            </div>
	                            <button
	                              type="button"
	                              className="ghost tiny passive-group-open-button"
                            onClick={() => setIsPassiveModalOpen(true)}
                            aria-label={t('generator.passiveModalTitle')}
                          >
                            {t('generator.select')}
                          </button>
                        </div>
                        {(getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? manualCurrentSelection : selectedFactionSelection)?.habilidades?.length ? (
                          <div className="doctrine-item passive-group-current">
                            <div className="doctrine-item-main">
                              {getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? (
                                <div className="selected-passive-skill-list selected-passive-skill-list-compact">
                                  {(manualCurrentSelection || selectedFactionSelection).habilidades.map((skill) => (
                                    <div
                                      key={`selected-passive-${skill.id}`}
                                      className="selected-passive-skill-item selected-passive-skill-item-compact selected-choice-row"
                                    >
                                      <div className="doctrine-item-main">
                                        <span className="doctrine-icon-box passive-group-icon-box" aria-hidden="true">
                                          <PassiveGroupIcon groupId={skill.id} />
                                        </span>
                                        <span className="selected-passive-skill-name">{skill.nombre}</span>
                                      </div>
                                      <button
                                        type="button"
                                        className="selected-choice-remove"
                                        onClick={() => handleToggleFactionSkill(skill.id)}
                                        aria-label={`${t('generator.delete')}: ${skill.nombre}`}
                                      >
                                        X
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  <span className="doctrine-icon-box passive-group-icon-box" aria-hidden="true">
                                    <PassiveGroupIcon
                                      groupId={(getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? manualCurrentSelection : selectedFactionSelection).id}
                                    />
                                  </span>
                                  <div className="doctrine-content">
                                    <p className="doctrine-name doctrine-name-plain">
                                      {getPassiveSelectionDisplayName(
                                        (getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? manualCurrentSelection : selectedFactionSelection),
                                        selectedFaction,
                                        t,
                                        Math.max(
                                          selectedPassiveOptions.findIndex((group) => group.id === (getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? manualCurrentSelection : selectedFactionSelection).id),
                                          0,
                                        ),
                                      )}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
	                          </div>
                        ) : getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? (
                          <p className="doctrine-description">{t('generator.noPassivesAdded')}</p>
                        ) : null}
                      </div>
                    )}
                    <div className="doctrine-panel">
                      <div className="doctrine-panel-header">
                        <div className="faction-passives-heading">
                          <p className="faction-passives-title">{t('generator.chooseDoctrines')}</p>
                        </div>
                        <button
                          type="button"
                          className="ghost tiny passive-group-open-button"
                          onClick={() => setIsDoctrineModalOpen(true)}
                          aria-label={t('generator.doctrineModalTitle')}
                        >
                          {t('generator.select')}
                        </button>
                      </div>
                      {selectedDoctrines.length ? (
                        <div className="doctrine-item passive-group-current">
                          <div className="doctrine-item-main">
                            <div className="selected-passive-skill-list selected-passive-skill-list-compact">
                              {selectedDoctrines.map((doctrine) => (
                                <div
                                  key={`selected-doctrine-${doctrine.id}`}
                                  className="selected-passive-skill-item selected-passive-skill-item-compact selected-choice-row"
                                >
                                  <div className="doctrine-item-main">
                                    <span className="selected-doctrine-token" aria-hidden="true">
                                      <DoctrineIcon doctrine={doctrine} />
                                    </span>
                                    <span className="selected-passive-skill-name">{doctrine.nombre}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="selected-choice-remove"
                                    onClick={() => handleRemoveSelectedDoctrine(doctrine.id)}
                                    aria-label={`${t('generator.delete')}: ${doctrine.nombre}`}
                                  >
                                    X
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="empty-state">{t('generator.noDoctrinesAdded')}</p>
                      )}
                    </div>
                  </div>
                  <EraWorldSwitch
                    tokens={availableEraTokens}
                    activeTokens={activeManualEraFilters}
                    onToggle={handleToggleEraManual}
                    getLabel={getEraLabel}
                    title={t('generator.era')}
                  />
                  <div className="unit-type-filters">
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
                          <p className="unit-specialty">{getUnitSpecialtyForMode(unit, gameMode)}</p>
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
              <EraWorldSwitch
                tokens={availableEraTokensRandom}
                activeTokens={activeRandomEraFilters}
                onToggle={handleToggleEraRandom}
                getLabel={getEraLabel}
                title={t('generator.era')}
              />
              <div className="unit-type-filters">
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

          {currentArmySelection?.habilidades?.length ? (
            <div className="army-passive-group">
              {(() => {
                const isMultipleSelection = getFactionPassiveSelectionMode(currentArmyFaction) === 'multiple'
	                return (
	                  <>
                      <div className="army-passive-card-list">
                        {currentArmySelection.habilidades.map((skill) => (
                          <article key={`army-passive-${skill.id}`} className="army-unit army-passive-card">
                            <div className="army-unit-header army-passive-card-header">
                              <div className="army-passive-card-title-wrap">
                                <span className="doctrine-icon-box passive-group-icon-box" aria-hidden="true">
                                  <PassiveGroupIcon groupId={skill.id} />
                                </span>
                                <div>
                                  <h4>{skill.nombre}</h4>
                                  <p className="army-passive-card-kicker">
                                    {(isMultipleSelection ? t('generator.passive') : t('generator.passives')).toLowerCase()}
                                  </p>
                                </div>
                              </div>
                              {skill.coste ? (
                                <span className="army-passive-skill-cost">
                                  {skill.coste} {t('generator.valueUnit')}
                                </span>
                              ) : null}
                            </div>
                            <div className="army-weapons army-passive-card-body">
                              {getFactionSkillDescriptionForMode(skill, gameMode)}
                            </div>
                            <div className="army-unit-actions">
                              <button
                                type="button"
                                className="ghost tiny"
                                onClick={() => handleRemoveArmyFactionSkill(skill.id)}
                                aria-label={`${t('generator.remove')}: ${skill.nombre}`}
                              >
                                {t('generator.delete')}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                  </>
                )
              })()}
            </div>
          ) : null}

          {currentArmyDoctrines.length ? (
            <div className="army-passive-group">
              <div className="army-passive-card-list">
                {currentArmyDoctrines.map((doctrine) => (
                  <article key={`army-doctrine-${doctrine.id}`} className="army-unit army-passive-card">
                    <div className="army-unit-header army-passive-card-header">
                      <div className="army-passive-card-title-wrap">
                        <span className="doctrine-icon-box" aria-hidden="true">
                          <DoctrineIcon doctrine={doctrine} />
                        </span>
                        <div>
                          <h4>{doctrine.nombre}</h4>
                          <p className="army-passive-card-kicker">{t('generator.doctrines').toLowerCase()}</p>
                        </div>
                      </div>
                      {doctrine.coste ? (
                        <span className="army-passive-skill-cost">
                          {doctrine.coste} {t('generator.valueUnit')}
                        </span>
                      ) : null}
                    </div>
                    <div className="army-weapons army-passive-card-body">{doctrine.descripcion}</div>
                    <div className="army-unit-actions">
                      <button
                        type="button"
                        className="ghost tiny"
                        onClick={() =>
                          mode === 'manual'
                            ? handleRemoveSelectedDoctrine(doctrine.id)
                            : handleRemoveArmyDoctrine(doctrine.id)}
                        aria-label={`${t('generator.delete')}: ${doctrine.nombre}`}
                      >
                        {t('generator.delete')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
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
	                    {getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? (
	                      <p className="unit-modal-subtitle">{t('generator.maxFactionAbilities')}</p>
	                    ) : null}
	                  </div>
	                  <button type="button" className="ghost small" onClick={() => setIsPassiveModalOpen(false)}>
	                    {t('generator.close')}
	                  </button>
                </div>

                <div className="unit-modal-body passive-group-list">
                  {selectedPassiveOptions.length ? (
                    selectedPassiveOptions.map((group, index) => {
                      const currentMultipleIds = sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds)
                      const isActive = getFactionPassiveSelectionMode(selectedFaction) === 'multiple'
                        ? currentMultipleIds.includes(group.id)
                        : group.id === selectedPassiveGroupIdSafe
                      return (
                        <button
                          key={group.id}
                          type="button"
                          className={`passive-group-card${isActive ? ' active' : ''}`}
                          onClick={() =>
                            getFactionPassiveSelectionMode(selectedFaction) === 'multiple'
                              ? handleToggleFactionSkill(group.id)
                              : handleSelectPassiveGroup(group.id)}
                        >
                          <div className="passive-group-card-top">
                            <span className="doctrine-icon-box passive-group-icon-box">
                              <PassiveGroupIcon groupId={group.id} />
                            </span>
                            <div className="passive-group-heading">
                              {getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? (
                                <strong>
                                  {getPassiveSelectionDisplayName(group, selectedFaction, t, index)}
                                  {group.coste_total ? ` · ${group.coste_total} ${t('generator.valueUnit')}` : ''}
                                </strong>
                              ) : (
                                <>
                                  <span className="passive-group-label">
                                    {t(getPassiveSelectionLabelKey(selectedFaction, 'generator.passive', 'generator.passiveSet'))}
                                  </span>
                                  <strong>{getPassiveSelectionDisplayName(group, selectedFaction, t, index)}</strong>
                                </>
                              )}
                            </div>
                            {getFactionPassiveSelectionMode(selectedFaction) !== 'multiple' && group.coste_total ? (
                              <span className="passive-group-cost">{group.coste_total} {t('generator.valueUnit')}</span>
                            ) : null}
                          </div>
                          {getFactionPassiveSelectionMode(selectedFaction) === 'multiple' ? (
                            <p className="passive-group-description">
                              {getFactionSkillDescriptionForMode(group.habilidades[0], gameMode)}
                            </p>
                          ) : (
                            <ul>
                              {group.habilidades.map((skill) => (
                                <li key={skill.id}>
                                  <strong>
                                    {skill.nombre}
                                    {skill.coste ? ` · ${skill.coste} ${t('generator.valueUnit')}` : ''}:
                                  </strong>{' '}
                                  {getFactionSkillDescriptionForMode(skill, gameMode)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <p className="empty-state">
                      {t(getPassiveSelectionLabelKey(selectedFaction, 'generator.noPassivesAvailable', 'generator.noPassiveSetsAvailable'))}
                    </p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isDoctrineModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <DoctrinePickerModal
              doctrines={localizedDoctrines}
              selectedIds={new Set(selectedDoctrineIdsSafe)}
              t={t}
              onClose={() => setIsDoctrineModalOpen(false)}
              onSelect={handleAddDoctrine}
            />,
            document.body,
          )
        : null}
    </section>
  )
}

function DoctrinePickerModal({ doctrines, selectedIds, t, onClose, onSelect }) {
  const availableDoctrines = doctrines.filter((doctrine) => !selectedIds.has(doctrine.id))

  return (
    <div className="unit-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="unit-modal-card doctrine-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="unit-modal-header">
          <div>
            <p className="eyebrow">{t('generator.doctrines')}</p>
            <h3>{t('generator.doctrineModalTitle')}</h3>
          </div>
          <button type="button" className="ghost small" onClick={onClose}>
            {t('generator.close')}
          </button>
        </div>
        <div className="unit-modal-body passive-group-list">
          {availableDoctrines.length ? (
            availableDoctrines.map((doctrine) => (
              <button
                key={doctrine.id}
                type="button"
                className="passive-group-card doctrine-picker-card"
                onClick={() => onSelect(doctrine.id)}
              >
                <div className="passive-group-card-top">
                  <span className="doctrine-icon-box" aria-hidden="true">
                    <DoctrineIcon doctrine={doctrine} />
                  </span>
                  <div className="passive-group-heading">
                    <strong>{doctrine.nombre}</strong>
                  </div>
                  {doctrine.coste ? (
                    <span className="passive-group-cost">{doctrine.coste} {t('generator.valueUnit')}</span>
                  ) : null}
                </div>
                <p className="passive-group-description">{doctrine.descripcion}</p>
              </button>
            ))
          ) : (
            <p className="empty-state">{t('generator.noDoctrinesAvailable')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Generador
