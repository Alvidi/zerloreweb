import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import FactionAbilityFichaCard from '../features/generator/components/FactionAbilityFichaCard.jsx'
import { getAbilityDescription, getAbilityLabel } from '../utils/abilities.js'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'
import CustomSelect from '../features/generator/components/CustomSelect.jsx'
import {
  getFactionAbilityIllustrationSrc,
} from '../features/generator/factionAbilityBadges.js'
import { getUnitTypeBadgeSrc } from '../features/generator/unitTypeBadges.js'
import abilityIconSrc from '../images/units_icons/hability.png'
import {
  applyPassiveGroupEffectsToFaction,
  buildArmyUnitDisplayNames,
  clampSquadSize,
  computeUnitTotal,
  formatSpeedValue,
  factionImages,
  generateArmyByValue,
  getFactionSkillDescriptionForMode,
  getFixedUnitLoadout,
  getUnitSpecialtyLabelForMode,
  isFactionData,
  isUnitTypeAllowedInGameMode,
  getUnitTypeToken,
  normalizeFaction,
} from '../features/generator/generatorUtils.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })
const factionSheetTemplates = {
  orden: new URL('../images/fichas/ficha_orden.webp', import.meta.url).href,
  caos: new URL('../images/fichas/ficha_caos.webp', import.meta.url).href,
  legado: new URL('../images/fichas/ficha_legado.webp', import.meta.url).href,
}
const preferredUnitTypeOrder = ['line', 'elite', 'hero', 'vehicle', 'monster', 'titan']
const MAX_UNIT_IMAGE_SIDE = 1600
const IMAGE_CROP_ASPECT_RATIO = 686 / 473
const IMAGE_CROP_VIEWPORT_WIDTH = 360
const IMAGE_CROP_VIEWPORT_HEIGHT = Math.round(IMAGE_CROP_VIEWPORT_WIDTH / IMAGE_CROP_ASPECT_RATIO)
const FICHA_CARD_W = 1537
const FICHA_CARD_H = 1023
const EXPORT_PAGE_W = 1240
const EXPORT_PAGE_H = 1754
const EXPORT_PAGE_PAD_X = 56
const EXPORT_PAGE_PAD_Y = 52
const EXPORT_PAGE_GAP = 28
const EXPORT_RASTER_SCALE = 2

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const loadImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.crossOrigin = 'anonymous'
    image.src = dataUrl
  })

const clampCropOffsets = ({ offsetX, offsetY, zoom, imageWidth, imageHeight }) => {
  if (!imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0 }
  }

  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const scaledWidth = imageWidth * baseScale * zoom
  const scaledHeight = imageHeight * baseScale * zoom
  const maxOffsetX = Math.max(0, (scaledWidth - IMAGE_CROP_VIEWPORT_WIDTH) / 2)
  const maxOffsetY = Math.max(0, (scaledHeight - IMAGE_CROP_VIEWPORT_HEIGHT) / 2)

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  }
}

const createCroppedImageDataUrl = async (sourceDataUrl, cropState) => {
  const image = await loadImageFromDataUrl(sourceDataUrl)
  const imageWidth = image.naturalWidth || image.width || 1
  const imageHeight = image.naturalHeight || image.height || 1
  const baseScale = Math.max(IMAGE_CROP_VIEWPORT_WIDTH / imageWidth, IMAGE_CROP_VIEWPORT_HEIGHT / imageHeight)
  const scale = baseScale * cropState.zoom
  const outputWidth = MAX_UNIT_IMAGE_SIDE
  const outputHeight = Math.round(outputWidth / IMAGE_CROP_ASPECT_RATIO)
  const outputScale = outputWidth / IMAGE_CROP_VIEWPORT_WIDTH
  const drawWidth = imageWidth * scale * outputScale
  const drawHeight = imageHeight * scale * outputScale
  const drawX = (outputWidth - drawWidth) / 2 + cropState.offsetX * outputScale
  const drawY = (outputHeight - drawHeight) / 2 + cropState.offsetY * outputScale

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context unavailable')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, outputWidth, outputHeight)
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)

  return canvas.toDataURL('image/png')
}

const chunkItems = (items, size) => {
  if (!Array.isArray(items) || size <= 0) return []
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const waitForElementImages = async (element) => {
  if (!element) return
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => resolve()
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
    })
  }))
}

const waitForPrintReady = async (elements = []) => {
  if (document.fonts?.ready) await document.fonts.ready
  for (const element of elements) {
    await waitForElementImages(element)
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const createArmyPdfFileName = (factionName = '') => {
  const slug = String(factionName || 'ejercito')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `zerolore-${slug || 'ejercito'}.pdf`
}

const renderExportPageCanvas = async (cardCanvases, scale = EXPORT_RASTER_SCALE) => {
  const pageCanvas = document.createElement('canvas')
  pageCanvas.width = EXPORT_PAGE_W * scale
  pageCanvas.height = EXPORT_PAGE_H * scale
  const ctx = pageCanvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#f8f5ed'
  ctx.fillRect(0, 0, EXPORT_PAGE_W, EXPORT_PAGE_H)

  const slotHeight = (EXPORT_PAGE_H - (EXPORT_PAGE_PAD_Y * 2) - EXPORT_PAGE_GAP) / 2
  const maxCardWidth = EXPORT_PAGE_W - EXPORT_PAGE_PAD_X * 2
  const maxCardHeight = slotHeight
  const cardScale = Math.min(maxCardWidth / FICHA_CARD_W, maxCardHeight / FICHA_CARD_H)
  const cardWidth = Math.round(FICHA_CARD_W * cardScale)
  const cardHeight = Math.round(FICHA_CARD_H * cardScale)
  const cardX = Math.round((EXPORT_PAGE_W - cardWidth) / 2)

  cardCanvases.forEach((cardCanvas, index) => {
    const slotY = EXPORT_PAGE_PAD_Y + index * (slotHeight + EXPORT_PAGE_GAP)
    const cardY = Math.round(slotY + (slotHeight - cardHeight) / 2)
    ctx.drawImage(cardCanvas, cardX, cardY, cardWidth, cardHeight)
  })

  return pageCanvas
}

const getUnitEraTokens = (unit) => (Array.isArray(unit?.eras) ? unit.eras.map((era) => era.token).filter(Boolean) : [])

const getUnitTypeOrder = (type) => {
  const token = getUnitTypeToken(type)
  const match = preferredUnitTypeOrder.indexOf(token)
  return match === -1 ? preferredUnitTypeOrder.length : match
}

const sortUnitsByType = (units) =>
  [...units].sort((a, b) => {
    const orderDiff = getUnitTypeOrder(a?.tipo) - getUnitTypeOrder(b?.tipo)
    if (orderDiff !== 0) return orderDiff
    return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es', { sensitivity: 'base' })
  })

const getFactionPassiveSelectionMode = (faction) => {
  if (faction?.seleccion_habilidades === 'grupo') return 'grupo'
  if (faction?.seleccion_habilidades === 'group') return 'grupo'
  return 'individual'
}

const getFactionAbilityOptions = (faction) =>
  Array.isArray(faction?.habilidades_faccion) ? faction.habilidades_faccion : []

const getFactionAbilitySelectionLimit = (faction) =>
  Math.min(1, getFactionAbilityOptions(faction).length || 1)

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
    coste_total: 0,
  }
}

const getFactionPassiveSelections = (faction) => {
  if (!faction) return []
  if (getFactionPassiveSelectionMode(faction) !== 'grupo') {
    return getFactionAbilityOptions(faction).map((skill) => ({
      id: skill.id,
      nombre: skill.nombre,
      habilidades: [skill],
      tipo: getFactionPassiveSelectionMode(faction),
      coste_total: 0,
    }))
  }
  return Array.isArray(faction.grupos_habilidades_faccion) ? faction.grupos_habilidades_faccion : []
}
const getFirstPassiveGroupId = (faction) =>
  getFactionPassiveSelectionMode(faction) === 'grupo' ? getFactionPassiveSelections(faction)?.[0]?.id || '' : ''
const sanitizePassiveGroupId = (faction, passiveGroupId) => {
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

const getPassiveSelectionCost = (selection) => {
  void selection
  return 0
}

const getVisibleUnitsForGeneratorContext = (faction, eraToken, mode) =>
  sortUnitsByType((faction?.unidades || []).filter((unit) => {
    const eraTokens = getUnitEraTokens(unit)
    const matchesEra = !eraTokens.length || eraTokens.includes(eraToken)
    return matchesEra && isUnitTypeAllowedInGameMode(unit.tipo, mode)
  }))

const getMinimumUnitCost = (units, mode) =>
  units.reduce((minimum, unit) => {
    const fixedLoadout = getFixedUnitLoadout(unit)
    const squadSize = mode === 'escuadra' ? clampSquadSize(unit.escuadra_min, unit) : 1
    const cost = computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, squadSize, null, mode)
    if (!Number.isFinite(cost) || cost <= 0) return minimum
    return Math.min(minimum, cost)
  }, Number.POSITIVE_INFINITY)

const getSquadFichaValue = (unit, mode, squadSize) =>
  mode === 'escuadra' ? String(clampSquadSize(squadSize ?? unit?.escuadra_min, unit)) : '-'

const getUnitFichaValue = (unit, mode, totalValue) =>
  mode === 'escuadra' ? unit?.valor_base : (totalValue ?? unit?.valor_base)

const randomizeList = (items) => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

const buildRandomPassiveCandidate = (faction, passiveOptions, target, mode, eraToken) => {
  const selectionMode = getFactionPassiveSelectionMode(faction)
  const options = randomizeList(passiveOptions || [])
  const candidateBudget = Math.max(0, Math.floor(target * (mode === 'escuadra' ? 0.28 : 0.24)))

  if (!options.length) {
    const units = getVisibleUnitsForGeneratorContext(faction, eraToken, mode)
    return { selection: null, skillIds: [], passiveGroupId: '', cost: 0, factionWithPassives: faction, units }
  }

  const makeCandidate = (selection, skillIds = [], passiveGroupId = '') => {
    const cost = getPassiveSelectionCost(selection)
    const factionWithPassives = applyPassiveGroupEffectsToFaction(faction, selection)
    const units = getVisibleUnitsForGeneratorContext(factionWithPassives, eraToken, mode)
    const minimumUnitCost = getMinimumUnitCost(units, mode)
    const leavesRoomForUnit = Number.isFinite(minimumUnitCost) && target - cost >= minimumUnitCost
    return { selection, skillIds, passiveGroupId, cost, factionWithPassives, units, leavesRoomForUnit }
  }

  if (selectionMode === 'multiple') {
    const limit = getFactionAbilitySelectionLimit(faction)
    const selectedIds = []
    let selectedCost = 0
    options.forEach((option) => {
      if (selectedIds.length >= limit) return
      const optionCost = getPassiveSelectionCost(option)
      if (optionCost <= 0) {
        selectedIds.push(option.id)
        return
      }
      if (selectedCost + optionCost <= candidateBudget || !selectedIds.length) {
        selectedIds.push(option.id)
        selectedCost += optionCost
      }
    })

    const selection = buildFactionAbilitySelection(faction, selectedIds)
    const candidate = makeCandidate(selection, selectedIds, '')
    if (candidate.leavesRoomForUnit) return candidate
  } else {
    const affordableOptions = options
      .map((option) => makeCandidate(option, [], option.id))
      .filter((candidate) => candidate.leavesRoomForUnit)
      .sort((left, right) => {
        const leftBudgetFit = left.cost <= candidateBudget ? 0 : 1
        const rightBudgetFit = right.cost <= candidateBudget ? 0 : 1
        return leftBudgetFit - rightBudgetFit || left.cost - right.cost
      })

    if (affordableOptions.length) {
      const focusedPool = affordableOptions.slice(0, Math.min(4, affordableOptions.length))
      return focusedPool[Math.floor(Math.random() * focusedPool.length)]
    }
  }

  const units = getVisibleUnitsForGeneratorContext(faction, eraToken, mode)
  return { selection: null, skillIds: [], passiveGroupId: '', cost: 0, factionWithPassives: faction, units }
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

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
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

function FactionSelectLabel({ label, iconSrc }) {
  return (
    <span className="faction-select-option-label">
      <span className="faction-select-option-icon" aria-hidden="true">
        {iconSrc ? <img src={iconSrc} alt="" /> : <span className="faction-select-option-fallback">?</span>}
      </span>
      <span>{label}</span>
    </span>
  )
}

function FactionAbilityIcon({ skill }) {
  const illustrationSrc = getFactionAbilityIllustrationSrc(skill?.id, skill?.nombre)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)

  return (
    <span
      className={`faction-ability-icon${illustrationSrc ? ' has-hover-preview' : ''}`}
      onMouseEnter={illustrationSrc ? () => setIsPreviewVisible(true) : undefined}
      onMouseLeave={illustrationSrc ? () => setIsPreviewVisible(false) : undefined}
    >
      <img src={abilityIconSrc} alt="" aria-hidden="true" />
      {illustrationSrc && isPreviewVisible ? (
        <span className="faction-ability-hover-preview" aria-hidden="true">
          <img src={illustrationSrc} alt="" loading="lazy" />
        </span>
      ) : null}
    </span>
  )
}

const getFactionSheetTemplateSrc = (factionId) => factionSheetTemplates[factionId] || factionSheetTemplates.orden

const getWeaponAbilityNotes = (weapons, lang) =>
  (Array.isArray(weapons) ? weapons : []).flatMap((weapon) =>
    (weapon.habilidades || [])
      .map((ability) => ({
        key: `${weapon.nombre}-${ability}`,
        label: getAbilityLabel(ability, lang),
        description: getAbilityDescription(ability, lang),
        weaponName: weapon.nombre,
      }))
      .filter((item) => item.label),
  )

function UnitSheetTable({ weapons, emptyLabel = '-', lang }) {
  const rows = Array.isArray(weapons) && weapons.length ? weapons : [{ nombre: emptyLabel, ataques: '-', distancia: '-', impactos: '-', danio: '-', danio_critico: '-', habilidades: [] }]

  return (
    <div className="unit-sheet-table">
      {rows.map((weapon, index) => (
        <div className="unit-sheet-table-row" key={`${weapon.nombre}-${index}`}>
          <span>{weapon.nombre}</span>
          <span>{weapon.ataques}</span>
          <span>{weapon.distancia || '-'}</span>
          <span>{weapon.impactos || '-'}</span>
          <span>{`${weapon.danio}/${weapon.danio_critico}`}</span>
          <span>
            {weapon.habilidades?.length
              ? weapon.habilidades.map((ability) => getAbilityLabel(ability, lang)).join(', ')
              : '-'}
          </span>
        </div>
      ))}
    </div>
  )
}

function UnitSheetPreview({ unit, factionId, gameMode, draftTotal, imageDataUrl, fixedLoadout, t, lang }) {
  const templateSrc = getFactionSheetTemplateSrc(factionId)
  const factionLogoSrc = factionImages[factionId]
  const abilityNotes = getWeaponAbilityNotes(
    [...fixedLoadout.shooting, ...(fixedLoadout.meleeList || [])],
    lang,
  )
  const statValues = [
    unit.movimiento,
    unit.vidas,
    unit.salvacion,
    formatSpeedValue(unit.velocidad),
    gameMode === 'escuadra' ? `${unit.escuadra_min}-${unit.escuadra_max}` : '1',
  ]

  return (
    <div className="unit-sheet-preview-wrapper">
      <div className="unit-sheet-preview">
        <img className="unit-sheet-template" src={templateSrc} alt="" aria-hidden="true" />
        {factionLogoSrc ? (
          <div className="unit-sheet-slot unit-sheet-faction-mark" aria-hidden="true">
            <img src={factionLogoSrc} alt="" />
          </div>
        ) : (
          <div className="unit-sheet-slot unit-sheet-faction-mark unit-sheet-faction-mark-fallback" aria-hidden="true">
            ?
          </div>
        )}
        <div className="unit-sheet-slot unit-sheet-name">{unit.nombre}</div>
        <div className="unit-sheet-slot unit-sheet-type">{unit.tipo}</div>
        <div className="unit-sheet-slot unit-sheet-value">{draftTotal}</div>
        <div className="unit-sheet-slot unit-sheet-image-frame">
          <img
            className={`unit-sheet-image${imageDataUrl ? '' : ' fallback'}`}
            src={imageDataUrl || getUnitTypeBadgeSrc(unit.tipo, unit.eras)}
            alt={unit.nombre}
          />
        </div>
        <div className="unit-sheet-slot unit-sheet-stats">
          {statValues.map((value, index) => (
            <span key={`${unit.id}-sheet-stat-${index}`}>{value}</span>
          ))}
        </div>
        <div className="unit-sheet-slot unit-sheet-specialty">{getUnitSpecialtyLabelForMode(unit, gameMode, lang)}</div>
        <div className="unit-sheet-slot unit-sheet-shooting">
          <UnitSheetTable weapons={fixedLoadout.shooting} lang={lang} />
        </div>
        <div className="unit-sheet-slot unit-sheet-melee">
          <UnitSheetTable weapons={fixedLoadout.meleeList || []} lang={lang} />
        </div>
        <div className="unit-sheet-slot unit-sheet-abilities">
          {abilityNotes.length ? (
            abilityNotes.map((note) => (
              <p key={note.key}>
                <strong>{note.weaponName} · {note.label}:</strong> {note.description || t('generator.pendingDescription')}
              </p>
            ))
          ) : (
            <p>{t('generator.noWeaponsAvailable')}</p>
          )}
        </div>
      </div>
    </div>
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
  const [gameMode, setGameMode] = useState('escaramuza')
  const [selectedFactionId, setSelectedFactionId] = useState(factions[0]?.id || '')
  const [selectedEra, setSelectedEra] = useState('future')
  const [manualUnitDrafts, setManualUnitDrafts] = useState({})
  const [selectedPassiveGroupId, setSelectedPassiveGroupId] = useState('')
  const [selectedFactionSkillIds, setSelectedFactionSkillIds] = useState([])
  const [isArmyPrintPreviewOpen, setIsArmyPrintPreviewOpen] = useState(false)
  const [armyDownloadError, setArmyDownloadError] = useState('')
  const [isRandomArmyModalOpen, setIsRandomArmyModalOpen] = useState(false)
  const [randomArmyTargetValue, setRandomArmyTargetValue] = useState('')
  const [randomArmyError, setRandomArmyError] = useState('')
  const [pendingSquadUnitId, setPendingSquadUnitId] = useState('')
  const [pendingSquadSize, setPendingSquadSize] = useState(1)
  const [openManualUnitId, setOpenManualUnitId] = useState('')
  const [openArmyUnitUid, setOpenArmyUnitUid] = useState('')
  const [openFactionAbilityGroupId, setOpenFactionAbilityGroupId] = useState('')
  const [openArmyAbilityId, setOpenArmyAbilityId] = useState('')
  const [activeGeneratorSection, setActiveGeneratorSection] = useState('units')
  const [imageCropDraft, setImageCropDraft] = useState(null)
  const [selectedArmyUnitSelections, setSelectedArmyUnitSelections] = useState([])
  const armySheetRefs = useRef(new Map())
  const armyCardRefs = useRef(new Map())
  const armyExportStageRef = useRef(null)
  const armyUnitSelectionCounterRef = useRef(0)
  const getEraLabel = useCallback((token) => (token === 'future' ? t('generator.future') : t('generator.past')), [t])
  const selectedFactionIdSafe = useMemo(() => {
    if (!factions.length) return ''
    return factions.some((faction) => faction.id === selectedFactionId) ? selectedFactionId : factions[0].id
  }, [factions, selectedFactionId])

  const selectedFaction = factions.find((faction) => faction.id === selectedFactionIdSafe) || null
  const selectedPassiveOptions = useMemo(() => getFactionPassiveSelections(selectedFaction), [selectedFaction])
  const selectedFactionSkillIdsSafe = useMemo(
    () => sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds),
    [selectedFaction, selectedFactionSkillIds],
  )
  const factionSelectOptions = useMemo(
    () =>
      factions.map((faction) => ({
        value: faction.id,
        label: <FactionSelectLabel label={faction.nombre} iconSrc={factionImages[faction.id]} />,
      })),
    [factions],
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
  const manualCurrentSelection = selectedFactionSelection
  const availableEraTokens = useMemo(() => {
    const tokens = new Set(
      (selectedFactionWithPassives?.unidades || [])
        .flatMap((unit) => getUnitEraTokens(unit))
        .filter((token) => token === 'future' || token === 'past'),
    )

    return ['future', 'past'].filter((token) => tokens.has(token))
  }, [selectedFactionWithPassives])
  const visibleManualUnits = useMemo(() => {
    if (!selectedFactionWithPassives?.unidades?.length) return []
    return getVisibleUnitsForGeneratorContext(selectedFactionWithPassives, selectedEra, gameMode)
  }, [selectedFactionWithPassives, gameMode, selectedEra])

  const getManualUnitDraft = (unit) => {
    const draft = manualUnitDrafts[unit.id] || {}
    return {
      squadSize: gameMode === 'escuadra' ? clampSquadSize(draft.squadSize ?? unit.escuadra_min, unit) : 1,
    }
  }

  const exportUnits = useMemo(
    () =>
      visibleManualUnits.map((unit) => {
        const draft = manualUnitDrafts[unit.id] || {}
        const squadSize = gameMode === 'escuadra' ? clampSquadSize(draft.squadSize ?? unit.escuadra_min, unit) : 1
        const fixedLoadout = getFixedUnitLoadout(unit)
        const total = computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, squadSize, null, gameMode)
        return {
          uid: unit.id,
          base: unit,
          shooting: fixedLoadout.shooting,
          meleeList: fixedLoadout.meleeList,
          melee: fixedLoadout.melee,
          squadSize,
          perMiniLoadouts: null,
          imageDataUrl: '',
          total,
        }
      }),
    [visibleManualUnits, manualUnitDrafts, gameMode],
  )
  const selectedAbilityRows = useMemo(
    () => manualCurrentSelection?.habilidades || selectedFactionSelection?.habilidades || [],
    [manualCurrentSelection, selectedFactionSelection],
  )
  useEffect(() => {
    if (selectedAbilityRows.length) setArmyDownloadError('')
  }, [selectedAbilityRows.length])
  const abilityExportPages = useMemo(() => chunkItems(selectedAbilityRows, 2), [selectedAbilityRows])
  const selectedArmyUnits = useMemo(() => {
    const unitsById = new Map(exportUnits.map((unit) => [unit.uid, unit]))
    return selectedArmyUnitSelections
      .map((selection) => {
        const unit = unitsById.get(selection.unitId)
        if (!unit) return null
        return {
          ...unit,
          ...selection,
          uid: selection.selectionId,
          sourceUid: unit.uid,
          imageDataUrl: selection.imageDataUrl || '',
          squadSize: selection.squadSize ?? unit.squadSize,
          total: computeUnitTotal(
            unit.base,
            unit.shooting,
            unit.melee,
            selection.squadSize ?? unit.squadSize,
            unit.perMiniLoadouts,
            gameMode,
          ),
        }
      })
      .filter(Boolean)
  }, [exportUnits, selectedArmyUnitSelections, gameMode])
  const exportUnitDisplayNames = useMemo(() => buildArmyUnitDisplayNames(selectedArmyUnits), [selectedArmyUnits])
  const currentAbilityTotalValue = useMemo(
    () => 0,
    [],
  )
  const currentArmyTotalValue = useMemo(
    () => selectedArmyUnits.reduce((sum, unit) => sum + Number(unit?.total || 0), 0) + currentAbilityTotalValue,
    [selectedArmyUnits, currentAbilityTotalValue],
  )
  const armyExportPages = useMemo(() => chunkItems(selectedArmyUnits, 2), [selectedArmyUnits])

  const updateArmyUnitSelection = (selectionId, nextPatch) => {
    setSelectedArmyUnitSelections((current) =>
      current.map((selection) => (selection.selectionId === selectionId ? { ...selection, ...nextPatch } : selection)),
    )
  }

  const handleArmyUnitImageChange = (entry, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    readFileAsDataUrl(file)
      .then(async (sourceDataUrl) => {
        if (!sourceDataUrl) return
        const image = await loadImageFromDataUrl(sourceDataUrl)
        const imageWidth = image.naturalWidth || image.width || 1
        const imageHeight = image.naturalHeight || image.height || 1
        setImageCropDraft({
          selectionId: entry.uid,
          unitName: exportUnitDisplayNames.get(entry.uid) || entry.base.nombre,
          sourceDataUrl,
          imageWidth,
          imageHeight,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        })
      })
      .catch(() => {})
    event.target.value = ''
  }

  const handleImageCropZoomChange = (nextZoom) => {
    setImageCropDraft((prev) => {
      if (!prev) return prev
      const zoom = Math.min(3, Math.max(1, Number(nextZoom) || 1))
      const nextOffsets = clampCropOffsets({
        offsetX: prev.offsetX,
        offsetY: prev.offsetY,
        zoom,
        imageWidth: prev.imageWidth,
        imageHeight: prev.imageHeight,
      })
      return {
        ...prev,
        zoom,
        ...nextOffsets,
      }
    })
  }

  const handleImageCropPointerDown = (event) => {
    if (!imageCropDraft) return
    event.preventDefault()

    const startX = event.clientX
    const startY = event.clientY
    const startOffsetX = imageCropDraft.offsetX
    const startOffsetY = imageCropDraft.offsetY

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      setImageCropDraft((prev) => {
        if (!prev) return prev
        const nextOffsets = clampCropOffsets({
          offsetX: startOffsetX + deltaX,
          offsetY: startOffsetY + deltaY,
          zoom: prev.zoom,
          imageWidth: prev.imageWidth,
          imageHeight: prev.imageHeight,
        })
        return {
          ...prev,
          ...nextOffsets,
        }
      })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleCancelImageCrop = () => {
    setImageCropDraft(null)
  }

  const handleConfirmImageCrop = () => {
    if (!imageCropDraft) return
    createCroppedImageDataUrl(imageCropDraft.sourceDataUrl, imageCropDraft)
      .then((result) => {
        updateArmyUnitSelection(imageCropDraft.selectionId, { imageDataUrl: result })
        setImageCropDraft(null)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (typeof Image === 'undefined') return
    ;[...Object.values(factionImages), ...Object.values(factionSheetTemplates)].forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    if (!selectedFaction) return
    if (getFactionPassiveSelectionMode(selectedFaction) !== 'grupo') return
    if (selectedPassiveGroupIdSafe) return
    const fallbackGroupId = getFirstPassiveGroupId(selectedFaction)
    if (fallbackGroupId) {
      const timeoutId = window.setTimeout(() => setSelectedPassiveGroupId(fallbackGroupId), 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [selectedFaction, selectedPassiveGroupIdSafe])

  useEffect(() => {
    if (!availableEraTokens.length) return
    if (availableEraTokens.includes(selectedEra)) return
    const timeoutId = window.setTimeout(() => setSelectedEra(availableEraTokens[0]), 0)
    return () => window.clearTimeout(timeoutId)
  }, [availableEraTokens, selectedEra])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const hasOpenModal = Boolean(imageCropDraft || isRandomArmyModalOpen || pendingSquadUnitId)
    const previousOverflow = document.body.style.overflow
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [imageCropDraft, isRandomArmyModalOpen, pendingSquadUnitId])

  useEffect(() => {
    if (!isArmyPrintPreviewOpen) return undefined

    const preparePreview = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const sheetNodes = []
      abilityExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`ability-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      armyExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`page-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      await waitForPrintReady(sheetNodes)
    }

    preparePreview().catch(() => {})

    return undefined
  }, [isArmyPrintPreviewOpen, abilityExportPages, armyExportPages])

  useEffect(() => {
    if (!isArmyPrintPreviewOpen || !armyExportStageRef.current) return undefined

    let cancelled = false

    const renderArmyPdf = async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const sheetNodes = []
      abilityExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`ability-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      armyExportPages.forEach((_, pageIndex) => {
        const pageNode = armySheetRefs.current.get(`page-${pageIndex}`)
        if (pageNode) sheetNodes.push(pageNode)
      })
      await waitForPrintReady(sheetNodes)

      if (cancelled || !armyExportStageRef.current) return

      const { jsPDF } = await import('jspdf')
      const capturedPageCanvases = []
      const captureCardCanvas = async (cardKey) => {
        const cardRef = armyCardRefs.current.get(cardKey)
        const canvas = await cardRef?.captureAsCanvas?.()
        if (!canvas) throw new Error(`Missing export card capture: ${cardKey}`)
        return canvas
      }

      for (const [pageIndex, pageEntries] of abilityExportPages.entries()) {
        const cardCanvases = await Promise.all(pageEntries.map((skill, cardIndex) =>
          captureCardCanvas(`ability-${pageIndex}-${skill.id || skill.nombre || cardIndex}`),
        ))
        capturedPageCanvases.push(await renderExportPageCanvas(cardCanvases))
      }

      for (const [pageIndex, pageEntries] of armyExportPages.entries()) {
        const cardCanvases = await Promise.all(pageEntries.map((entry, cardIndex) =>
          captureCardCanvas(`unit-${pageIndex}-${entry.uid || cardIndex}`),
        ))
        capturedPageCanvases.push(await renderExportPageCanvas(cardCanvases))
      }

      if (!capturedPageCanvases.length) {
        if (!cancelled) setIsArmyPrintPreviewOpen(false)
        return
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      capturedPageCanvases.forEach((canvas, index) => {
        if (index > 0) doc.addPage()
        doc.addImage(canvas, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      })

      doc.save(createArmyPdfFileName(selectedFaction?.nombre || 'ZeroLore'))
      if (!cancelled) {
        setIsArmyPrintPreviewOpen(false)
      }
    }

    renderArmyPdf().catch((error) => {
      console.error('[generator] Army PDF export failed', error)
      if (!cancelled) {
        setIsArmyPrintPreviewOpen(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [isArmyPrintPreviewOpen, abilityExportPages, armyExportPages, selectedFaction, gameMode, lang, exportUnitDisplayNames, getEraLabel])

  const handleFactionChange = (event) => {
    const next = event.target.value
    const nextFaction = factions.find((faction) => faction.id === next)
    const nextPassiveGroupId = getFactionPassiveSelectionMode(nextFaction) === 'grupo' ? getFirstPassiveGroupId(nextFaction) : ''
    const nextFactionSkillIds = []
    startTransition(() => {
      setSelectedFactionId(next)
      setSelectedPassiveGroupId(nextPassiveGroupId)
      setSelectedFactionSkillIds(nextFactionSkillIds)
      setOpenManualUnitId('')
      setOpenArmyUnitUid('')
      setOpenFactionAbilityGroupId('')
      setOpenArmyAbilityId('')
      setPendingSquadUnitId('')
      setSelectedArmyUnitSelections([])
      setManualUnitDrafts({})
      setArmyDownloadError('')
    })
  }

  const handleGameModeChange = (nextMode) => {
    setGameMode(nextMode)
    setOpenManualUnitId('')
    setOpenArmyUnitUid('')
    setOpenFactionAbilityGroupId('')
    setOpenArmyAbilityId('')
    setPendingSquadUnitId('')
    setSelectedArmyUnitSelections([])
  }

  const addArmyUnitSelection = (unitId, squadSize) => {
    armyUnitSelectionCounterRef.current += 1
    const selectionId = `${unitId}::${armyUnitSelectionCounterRef.current}`
    setSelectedArmyUnitSelections((current) => [...current, { selectionId, unitId, squadSize }])
  }

  const handleAddArmyUnit = (unitId) => {
    const unitEntry = exportUnits.find((entry) => entry.uid === unitId)
    if (!unitEntry) return
    if (gameMode !== 'escuadra') {
      addArmyUnitSelection(unitId, 1)
      return
    }
    const min = clampSquadSize(unitEntry.base.escuadra_min, unitEntry.base)
    const max = clampSquadSize(unitEntry.base.escuadra_max, unitEntry.base)
    if (min === max) {
      addArmyUnitSelection(unitId, min)
      return
    }
    setPendingSquadUnitId(unitId)
    setPendingSquadSize(clampSquadSize(unitEntry.squadSize ?? min, unitEntry.base))
  }

  const handleCloseSquadSizeModal = () => {
    setPendingSquadUnitId('')
  }

  const handleConfirmSquadSize = () => {
    if (!pendingSquadUnitId) return
    const unitEntry = exportUnits.find((entry) => entry.uid === pendingSquadUnitId)
    if (!unitEntry) return
    addArmyUnitSelection(pendingSquadUnitId, clampSquadSize(pendingSquadSize, unitEntry.base))
    setPendingSquadUnitId('')
  }

  const handleRemoveArmyUnit = (selectionId) => {
    setSelectedArmyUnitSelections((current) => current.filter((selection) => selection.selectionId !== selectionId))
  }

  const handleAddArmyPassive = (groupId) => {
    if (!selectedFaction) return
    if (getFactionPassiveSelectionMode(selectedFaction) === 'multiple') {
      const currentIds = sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds)
      if (currentIds.includes(groupId) || currentIds.length >= getFactionAbilitySelectionLimit(selectedFaction)) return
      setSelectedFactionSkillIds([...currentIds, groupId])
      setSelectedPassiveGroupId('')
    } else {
      setSelectedPassiveGroupId(groupId)
      setSelectedFactionSkillIds([])
    }
    setArmyDownloadError('')
  }

  const handleRemoveArmyPassive = (groupId) => {
    if (!selectedFaction) return
    if (getFactionPassiveSelectionMode(selectedFaction) === 'multiple') {
      setSelectedFactionSkillIds((current) => current.filter((id) => id !== groupId))
      return
    }
    void groupId
    setSelectedPassiveGroupId('')
  }

  const handleResetCurrentArmy = () => {
    setSelectedArmyUnitSelections([])
    setSelectedFactionSkillIds([])
    setSelectedPassiveGroupId(getFactionPassiveSelectionMode(selectedFaction) === 'grupo' ? getFirstPassiveGroupId(selectedFaction) : '')
    setArmyDownloadError('')
  }

  const createArmyUnitSelection = (unitId, patch = {}) => {
    armyUnitSelectionCounterRef.current += 1
    return {
      selectionId: `${unitId}::${armyUnitSelectionCounterRef.current}`,
      unitId,
      ...patch,
    }
  }

  const handleOpenRandomArmyModal = () => {
    setRandomArmyTargetValue(String(currentArmyTotalValue || (gameMode === 'escuadra' ? 100 : 50)))
    setRandomArmyError('')
    setIsRandomArmyModalOpen(true)
  }

  const handleCloseRandomArmyModal = () => {
    setIsRandomArmyModalOpen(false)
    setRandomArmyError('')
  }

  const handleGenerateRandomArmy = (event) => {
    event.preventDefault()
    const target = Number(randomArmyTargetValue)
    if (!Number.isFinite(target) || target <= 0) {
      setRandomArmyError(t('generator.randomArmyInvalidValue'))
      return
    }

    let bestResult = null
    const attempts = 18
    for (let index = 0; index < attempts; index += 1) {
      const passiveCandidate = buildRandomPassiveCandidate(selectedFaction, selectedPassiveOptions, target, gameMode, selectedEra)
      const unitTarget = Math.max(0, Math.floor(target - passiveCandidate.cost))
      if (unitTarget <= 0 || !passiveCandidate.units.length) continue

      const randomFactionSource = passiveCandidate.factionWithPassives
        ? {
            ...passiveCandidate.factionWithPassives,
            unidades: passiveCandidate.units,
          }
        : null
      const result = generateArmyByValue(randomFactionSource, unitTarget, gameMode)
      if (!result.units.length) continue

      const total = result.total + passiveCandidate.cost
      const passiveScore = passiveCandidate.selection ? Math.min(12, Math.max(3, passiveCandidate.cost || 3)) : 0
      const score = total + passiveScore + (result.score || 0) / 10
      if (!bestResult || score > bestResult.score) {
        bestResult = { ...result, passiveCandidate, total, score }
      }
    }

    if (!bestResult?.units?.length) {
      setRandomArmyError(t('generator.randomArmyNoResult'))
      return
    }

    const selectionMode = getFactionPassiveSelectionMode(selectedFaction)
    if (selectionMode === 'multiple') {
      setSelectedFactionSkillIds(bestResult.passiveCandidate.skillIds || [])
      setSelectedPassiveGroupId('')
    } else {
      setSelectedFactionSkillIds([])
      setSelectedPassiveGroupId(bestResult.passiveCandidate.passiveGroupId || getFirstPassiveGroupId(selectedFaction))
    }
    setSelectedArmyUnitSelections(
      bestResult.units
        .filter((entry) => entry?.base?.id)
        .map((entry) => createArmyUnitSelection(entry.base.id, { squadSize: entry.squadSize })),
    )
    setActiveGeneratorSection('army')
    setIsRandomArmyModalOpen(false)
    setRandomArmyError('')
  }

  useEffect(() => {
    const availableIds = new Set(exportUnits.map((unit) => unit.uid))
    const timeoutId = window.setTimeout(() => {
      setSelectedArmyUnitSelections((current) => current.filter((selection) => availableIds.has(selection.unitId)))
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [exportUnits])

  const setArmySheetRef = (pageKey, node) => {
    if (!pageKey) return
    if (node) armySheetRefs.current.set(pageKey, node)
    else armySheetRefs.current.delete(pageKey)
  }

  const setArmyCardRef = (cardKey, node) => {
    if (!cardKey) return
    if (node) armyCardRefs.current.set(cardKey, node)
    else armyCardRefs.current.delete(cardKey)
  }

  const handleDownloadArmyPdf = () => {
    if ((!selectedArmyUnits.length && !selectedAbilityRows.length) || isArmyPrintPreviewOpen) return
    if (selectedPassiveOptions.length && !selectedAbilityRows.length) {
      setArmyDownloadError(t('generator.missingFactionAbility'))
      return
    }
    if (typeof window === 'undefined') return
    setArmyDownloadError('')
    setIsArmyPrintPreviewOpen(true)
  }

  return (
    <section className="section generator-page reveal" id="generador">
      <div className="section-head reveal">
        <p className="eyebrow">{t('generator.eyebrow')}</p>
        <h2>{t('generator.title')}</h2>
        <p>{t('generator.subtitle')}</p>
      </div>

      <div className="generator-layout reveal">
        <div className="generator-main">
          <div className="manual-panel">
            <GameModePicker value={gameMode} onChange={handleGameModeChange} t={t} />
            <div className="field">
              <span>{t('generator.faction')}</span>
              <CustomSelect
                t={t}
                value={selectedFactionIdSafe}
                onChange={(next) => handleFactionChange({ target: { value: next } })}
                options={factionSelectOptions}
              />
            </div>
            {availableEraTokens.length ? (
              <div className="field field-era-worlds">
                <span>{t('generator.era')}</span>
                <div className="era-world-switch" role="radiogroup" aria-label={t('generator.era')}>
                  {availableEraTokens.map((eraToken) => (
                    <button
                      key={eraToken}
                      type="button"
                      role="radio"
                      aria-checked={selectedEra === eraToken}
                      className={`era-world-button era-world-button-${eraToken}${selectedEra === eraToken ? ' active' : ''}`}
                      onClick={() => setSelectedEra(eraToken)}
                    >
                      {getEraLabel(eraToken)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedFaction && (
              <>
                <div className="faction-summary">
                  <div className="faction-header">
                    {factionImages[selectedFaction.id] ? (
                      <img src={factionImages[selectedFaction.id]} alt={selectedFaction.nombre} />
                    ) : (
                      <span className="faction-header-fallback" aria-hidden="true">?</span>
                    )}
                    <h3>{selectedFaction.nombre}</h3>
                  </div>
                  <p className="faction-description">{selectedFaction.estilo}</p>
                </div>
                <div className="generator-section-tabs" role="tablist" aria-label={t('generator.sectionTabs')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeGeneratorSection === 'units'}
                    className={`generator-section-tab${activeGeneratorSection === 'units' ? ' active' : ''}`}
                    onClick={() => setActiveGeneratorSection('units')}
                  >
                    {t('generator.factionUnits')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeGeneratorSection === 'passives'}
                    className={`generator-section-tab${activeGeneratorSection === 'passives' ? ' active' : ''}`}
                    onClick={() => setActiveGeneratorSection('passives')}
                  >
                    {t('generator.passives')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeGeneratorSection === 'army'}
                    className={`generator-section-tab generator-section-tab-army${activeGeneratorSection === 'army' ? ' active' : ''}`}
                    onClick={() => setActiveGeneratorSection('army')}
                  >
                    <span>{t('generator.currentArmy')}:</span>
                    <span className="generator-section-tab-count">{currentArmyTotalValue} {t('generator.valueUnit')}</span>
                  </button>
                </div>
                {activeGeneratorSection === 'passives' && selectedPassiveOptions.length > 0 && (
                  <div className="generator-subsection generator-listing-field">
                    <div className="generator-listing-head">
                      <span className="generator-listing-note">{t('generator.requiredFactionAbility')}</span>
                    </div>
                    <div className="passive-group-list passive-group-list-inline unit-list">
                      {selectedPassiveOptions.map((group, index) => {
                        const currentMultipleIds = sanitizeFactionAbilityIds(selectedFaction, selectedFactionSkillIds)
                        const factionAbilityLimit = getFactionAbilitySelectionLimit(selectedFaction)
                        const isActive = getFactionPassiveSelectionMode(selectedFaction) === 'multiple'
                          ? currentMultipleIds.includes(group.id)
                          : group.id === selectedPassiveGroupIdSafe
                        const isDisabled = getFactionPassiveSelectionMode(selectedFaction) === 'multiple'
                          && !isActive
                          && currentMultipleIds.length >= factionAbilityLimit

                        return (
                          <article
                            key={group.id}
                            className={`unit-card passive-group-card${isActive ? ' active' : ''}${isDisabled ? ' is-disabled' : ''}`}
                          >
                            <div className="unit-card-header">
                              <div className="unit-card-summary">
                                <span className="unit-card-thumb-wrap passive-group-thumb-wrap" aria-hidden="true">
                                  <span className="unit-card-thumb-frame passive-group-thumb-frame">
                                    <span className="unit-card-thumb-canvas passive-group-thumb-canvas">
                                      <FactionAbilityIcon skill={group.habilidades?.[0] || { id: group.id }} factionId={selectedFaction?.id} />
                                    </span>
                                  </span>
                                </span>
                                <div className="passive-group-heading unit-card-heading">
                                  <div className="unit-card-title-row">
                                    <h4>{getPassiveSelectionDisplayName(group, selectedFaction, t, index)}</h4>
                                  </div>
                                  <div className="passive-group-kind">
                                    {t(getPassiveSelectionLabelKey(selectedFaction, 'generator.passive', 'generator.passiveSet'))}
                                  </div>
                                </div>
                              </div>
                              <div className="unit-card-header-actions">
                                <button
                                  type="button"
                                  className="ghost small"
                                  onClick={() => setOpenFactionAbilityGroupId(group.id)}
                                >
                                  {t('generator.viewCard')}
                                </button>
                                <button
                                  type="button"
                                  className="ghost small"
                                  disabled={isDisabled || isActive}
                                  onClick={() => handleAddArmyPassive(group.id)}
                                >
                                  {t('generator.add')}
                                </button>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}
                {activeGeneratorSection === 'units' ? (
                <div className="generator-subsection generator-listing-field">
                  <div className="unit-list">
                  {visibleManualUnits.map((unit) => {
                    const draft = getManualUnitDraft(unit)
                    const fixedLoadout = getFixedUnitLoadout(unit)
                    const draftTotal = computeUnitTotal(unit, fixedLoadout.shooting, fixedLoadout.melee, draft.squadSize, null, gameMode)
                    const displayValue = gameMode === 'escuadra' ? unit.valor_base : draftTotal
                    return (
                      <article className="unit-card" key={unit.id}>
                        <div className="unit-card-header">
                          <div className="unit-card-summary">
                            <span className="unit-card-thumb-wrap" aria-hidden="true">
                              <span className="unit-card-thumb-frame">
                                <span className="unit-card-thumb-canvas">
                                  <img
                                    className="unit-card-thumb fallback"
                                    src={getUnitTypeBadgeSrc(unit.tipo, unit.eras)}
                                    alt=""
                                  />
                                </span>
                              </span>
                            </span>
                            <div className="unit-card-heading">
                              <div className="unit-card-title-row">
                                <h4>{unit.nombre}</h4>
                              </div>
                              <div className={`unit-card-type unit-type-${getUnitTypeToken(unit.tipo)}`}>{unit.tipo}</div>
                              <div className="unit-card-inline-value">{displayValue} {t('generator.valueUnit')}</div>
                            </div>
                          </div>
                          <div className="unit-card-header-actions">
                            <button
                              type="button"
                              className="ghost small"
                              onClick={() => setOpenManualUnitId(unit.id)}
                            >
                              {t('generator.viewCard')}
                            </button>
                            <button
                              type="button"
                              className="ghost small"
                              onClick={() => handleAddArmyUnit(unit.id)}
                            >
                              {t('generator.add')}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  </div>
                </div>
                ) : null}
                {activeGeneratorSection === 'army' ? (
                  <div id="current-army-panel" className="generator-subsection generator-listing-field army-inline-panel">
                    <div className="army-inline-head">
                      <div>
                        <p className="army-inline-total">
                          <span className="generator-listing-label">{t('generator.currentArmy')}:</span>{' '}
                          {currentArmyTotalValue} {t('generator.valueUnit')}
                        </p>
                      </div>
                    </div>
                    {selectedArmyUnits.length ? (
                      <div className="army-modal-section">
                        <p className="army-modal-section-label">{t('generator.factionUnits')}</p>
                        <div className="army-list army-list-compact">
                          {selectedArmyUnits.map((entry) => (
                            <article key={`current-unit-${entry.uid}`} className="unit-card army-unit">
                              <div className="unit-card-header army-unit-header">
                                <div className="unit-card-summary army-unit-summary">
                                  <div className="unit-card-thumb-wrap army-unit-image-wrap">
                                    <img
                                      className={`unit-card-thumb army-unit-thumb${entry.imageDataUrl ? '' : ' fallback'}`}
                                      src={entry.imageDataUrl || getUnitTypeBadgeSrc(entry.base.tipo, entry.base.eras)}
                                      alt={entry.base.nombre}
                                    />
                                    <input
                                      id={`army-unit-image-${entry.uid}`}
                                      type="file"
                                      accept="image/*"
                                      className="unit-image-input"
                                      onChange={(event) => handleArmyUnitImageChange(entry, event)}
                                    />
                                    {entry.imageDataUrl ? (
                                      <button
                                        type="button"
                                        className="unit-image-clear"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          updateArmyUnitSelection(entry.uid, { imageDataUrl: '' })
                                        }}
                                        aria-label={t('generator.removeImage')}
                                        title={t('generator.removeImage')}
                                      >
                                        ×
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="unit-card-heading">
                                    <div className="unit-card-title-row">
                                      <h4>{exportUnitDisplayNames.get(entry.uid) || entry.base.nombre}</h4>
                                    </div>
                                    <div className={`unit-card-type unit-type-${getUnitTypeToken(entry.base.tipo)}`}>{entry.base.tipo}</div>
                                    <div className="unit-card-inline-value">{entry.total} {t('generator.valueUnit')}</div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions army-unit-actions">
                                  <label
                                    htmlFor={`army-unit-image-${entry.uid}`}
                                    className="ghost small army-unit-image-button"
                                  >
                                    {entry.imageDataUrl ? t('generator.changeImage') : t('generator.addImage')}
                                  </label>
                                  <button
                                    type="button"
                                    className="ghost small"
                                    onClick={() => setOpenArmyUnitUid(entry.uid)}
                                  >
                                    {t('generator.viewCard')}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost small"
                                    onClick={() => handleRemoveArmyUnit(entry.uid)}
                                  >
                                    {t('generator.delete')}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedAbilityRows.length ? (
                      <div className="army-modal-section">
                        <p className="army-modal-section-label">{t('generator.passives')}</p>
                        <div className="army-list army-list-compact">
                          {selectedAbilityRows.map((skill) => (
                            <article key={`current-passive-${skill.id || skill.nombre}`} className="unit-card army-unit">
                              <div className="unit-card-header army-unit-header">
                                <div className="unit-card-summary army-unit-summary">
                                  <span className="unit-card-thumb-wrap army-unit-image-wrap" aria-hidden="true">
                                    <img className="unit-card-thumb army-unit-thumb fallback" src={abilityIconSrc} alt="" />
                                  </span>
                                  <div className="unit-card-heading">
                                    <div className="unit-card-title-row">
                                      <h4>{skill.nombre || skill.id}</h4>
                                    </div>
                                    <div className="unit-card-type">{t('generator.passive')}</div>
                                  </div>
                                </div>
                                <div className="unit-card-header-actions army-unit-actions">
                                  <button
                                    type="button"
                                    className="ghost small"
                                    onClick={() => setOpenArmyAbilityId(skill.id || skill.nombre)}
                                  >
                                    {t('generator.viewCard')}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost small"
                                    onClick={() => handleRemoveArmyPassive(skill.id)}
                                  >
                                    {t('generator.delete')}
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {!selectedAbilityRows.length && !selectedArmyUnits.length ? (
                      <p className="empty-state">{t('generator.noUnitsYet')}</p>
                    ) : null}
                    <div className="army-actions">
                      <button
                        type="button"
                        className="primary small"
                        onClick={handleDownloadArmyPdf}
                        disabled={(!selectedArmyUnits.length && !selectedAbilityRows.length) || isArmyPrintPreviewOpen}
                        aria-busy={isArmyPrintPreviewOpen ? 'true' : 'false'}
                      >
                        {isArmyPrintPreviewOpen ? <SpinnerIcon /> : null}
                        <span>{isArmyPrintPreviewOpen ? t('generator.preparingPdf') : t('generator.downloadArmy')}</span>
                      </button>
                      <button type="button" className="ghost small" onClick={handleResetCurrentArmy}>
                        {t('generator.resetArmy')}
                      </button>
                      <button type="button" className="ghost small" onClick={handleOpenRandomArmyModal}>
                        {t('generator.randomArmy')}
                      </button>
                    </div>
                    {armyDownloadError ? (
                      <p className="random-army-error" role="alert" aria-live="polite">
                        {armyDownloadError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {isRandomArmyModalOpen && typeof document !== 'undefined' ? createPortal(
                  <div
                    className="unit-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('generator.randomArmy')}
                    onClick={handleCloseRandomArmyModal}
                  >
                    <form className="unit-modal-card random-army-modal-card" onSubmit={handleGenerateRandomArmy} onClick={(event) => event.stopPropagation()}>
                      <div className="unit-modal-header">
                        <div>
                          <p className="eyebrow">{t('generator.randomArmyEyebrow')}</p>
                          <h3>{t('generator.randomArmyTitle')}</h3>
                          <p className="unit-modal-subtitle">
                            {t('generator.randomArmySubtitle')}
                          </p>
                        </div>
                        <button type="button" className="ghost tiny" onClick={handleCloseRandomArmyModal}>
                          {t('generator.close')}
                        </button>
                      </div>
                      <div className="unit-modal-body">
                        <div className="random-army-context">
                          <span>{selectedFaction?.nombre || t('generator.noFaction')}</span>
                          <span>{getEraLabel(selectedEra)}</span>
                          <span>{gameMode === 'escuadra' ? t('generator.squad') : t('generator.skirmish')}</span>
                        </div>
                        <label className="field">
                          <span>{t('generator.randomArmyValueLabel')}</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={randomArmyTargetValue}
                            onChange={(event) => {
                              setRandomArmyTargetValue(event.target.value)
                              setRandomArmyError('')
                            }}
                            autoFocus
                          />
                        </label>
                        <p className="random-army-note">
                          {t('generator.randomArmyNote')}
                        </p>
                        {randomArmyError ? <p className="random-army-error">{randomArmyError}</p> : null}
                      </div>
                      <div className="unit-modal-footer">
                        <button type="button" className="ghost small" onClick={handleCloseRandomArmyModal}>
                          {t('generator.cancel')}
                        </button>
                        <button type="submit" className="primary small">
                          {t('generator.randomArmyGenerate')}
                        </button>
                      </div>
                    </form>
                  </div>,
                  document.body,
                ) : null}

                {pendingSquadUnitId && typeof document !== 'undefined' ? (() => {
                  const unitEntry = exportUnits.find((entry) => entry.uid === pendingSquadUnitId)
                  if (!unitEntry) return null
                  const min = clampSquadSize(unitEntry.base.escuadra_min, unitEntry.base)
                  const max = clampSquadSize(unitEntry.base.escuadra_max, unitEntry.base)
                  const sizeOptions = Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index)
                  const fixedLoadout = getFixedUnitLoadout(unitEntry.base)
                  const selectedSquadValue = computeUnitTotal(
                    unitEntry.base,
                    fixedLoadout.shooting,
                    fixedLoadout.melee,
                    clampSquadSize(pendingSquadSize, unitEntry.base),
                    null,
                    gameMode,
                  )

                  return createPortal(
                    <div
                      className="unit-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={t('generator.squadSize')}
                      onClick={handleCloseSquadSizeModal}
                    >
                      <div className="unit-modal-card squad-size-modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="unit-modal-header">
                          <div>
                            <p className="eyebrow">{t('generator.squadLabel')}</p>
                            <h3>{unitEntry.base.nombre}</h3>
                            <p className="unit-modal-subtitle">
                              {t('generator.squadSizeModalSubtitle').replace('{min}', String(min)).replace('{max}', String(max))}
                            </p>
                          </div>
                          <button type="button" className="ghost tiny" onClick={handleCloseSquadSizeModal}>
                            {t('generator.close')}
                          </button>
                        </div>
                        <div className="squad-size-options" role="radiogroup" aria-label={t('generator.squadSize')}>
                          {sizeOptions.map((size) => (
                            <button
                              type="button"
                              key={`squad-size-${unitEntry.uid}-${size}`}
                              className={`squad-size-option${pendingSquadSize === size ? ' active' : ''}`}
                              aria-pressed={pendingSquadSize === size}
                              onClick={() => setPendingSquadSize(size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        <p className="squad-size-total-preview">
                          <span>{selectedSquadValue}</span> {t('generator.valueUnit')}
                        </p>
                        <div className="unit-modal-footer">
                          <button type="button" className="ghost small" onClick={handleCloseSquadSizeModal}>
                            {t('generator.cancel')}
                          </button>
                          <button type="button" className="primary small" onClick={handleConfirmSquadSize}>
                            {t('generator.add')}
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                })() : null}

                {/* Modal de vista previa de ficha */}
                {openManualUnitId || openArmyUnitUid ? (() => {
                  const previewEntry = openArmyUnitUid ? selectedArmyUnits.find((entry) => entry.uid === openArmyUnitUid) : null
                  const previewUnit = previewEntry?.base || visibleManualUnits.find((u) => u.id === openManualUnitId)
                  if (!previewUnit) return null
                  const previewDraft = getManualUnitDraft(previewUnit)
                  const previewLoadout = previewEntry || getFixedUnitLoadout(previewUnit)
                  const previewTotal = previewEntry?.total || computeUnitTotal(
                    previewUnit,
                    previewLoadout.shooting,
                    previewLoadout.melee,
                    previewDraft.squadSize,
                    null,
                    gameMode,
                  )
                  const previewValue = getUnitFichaValue(previewUnit, gameMode, previewTotal)
                  const previewDisplayName = previewEntry
                    ? exportUnitDisplayNames.get(previewEntry.uid) || previewUnit.nombre
                    : previewUnit.nombre
                  const previewEraTokens = getUnitEraTokens(previewUnit)
                  const previewEraLabel = previewEraTokens.length ? previewEraTokens.map((token) => getEraLabel(token)).join(' / ') : ''
                  const closePreview = () => {
                    setOpenManualUnitId('')
                    setOpenArmyUnitUid('')
                  }
                  return typeof document !== 'undefined' ? createPortal(
                    <div
                      className="unit-preview-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={previewDisplayName}
                      onClick={closePreview}
                    >
                      <div className="unit-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="unit-preview-modal-bar">
                          <div className="unit-preview-modal-actions">
                            <button
                              type="button"
                              className="ghost small"
                              onClick={closePreview}
                              aria-label={t('generator.close')}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="unit-preview-modal-card">
                          <UnitFichaCard
                            unit={{
                              ...previewUnit,
                              nombre: previewDisplayName,
                              armas_disparo: previewLoadout.shooting,
                              armas_melee: previewLoadout.meleeList || [],
                              valor_base: previewValue,
                              escuadra_display: previewEntry
                                ? getSquadFichaValue(previewUnit, gameMode, previewEntry.squadSize ?? previewDraft.squadSize)
                                : undefined,
                            }}
                            factionId={selectedFaction?.id}
                            imageDataUrl={previewEntry?.imageDataUrl || ''}
                            gameMode={gameMode}
                            eraLabel={previewEraLabel}
                            lang={lang}
                          />
                        </div>
                      </div>
                    </div>,
                    document.body,
                  ) : null
                })() : null}
                {openFactionAbilityGroupId || openArmyAbilityId ? (() => {
                  const previewArmyAbility = openArmyAbilityId
                    ? selectedAbilityRows.find((skill) => (skill.id || skill.nombre) === openArmyAbilityId)
                    : null
                  const previewGroup = openFactionAbilityGroupId
                    ? selectedPassiveOptions.find((group) => group.id === openFactionAbilityGroupId)
                    : null
                  const previewAbilities = previewArmyAbility
                    ? [previewArmyAbility]
                    : Array.isArray(previewGroup?.habilidades) ? previewGroup.habilidades : []
                  const previewAbilityLabel = previewArmyAbility?.nombre
                    || (previewGroup ? getPassiveSelectionDisplayName(previewGroup, selectedFaction, t) : '')
                  if (!previewAbilities.length) return null
                  const closeAbilityPreview = () => {
                    setOpenFactionAbilityGroupId('')
                    setOpenArmyAbilityId('')
                  }

                  return typeof document !== 'undefined' ? createPortal(
                    <div
                      className="unit-preview-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label={previewAbilityLabel}
                      onClick={closeAbilityPreview}
                    >
                      <div className="unit-preview-modal-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="unit-preview-modal-bar">
                          <div className="unit-preview-modal-actions">
                            <button
                              type="button"
                              className="ghost small"
                              onClick={closeAbilityPreview}
                              aria-label={t('generator.close')}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="unit-preview-modal-card ability-preview-modal-card-list">
                          {previewAbilities.map((skill) => (
                            <FactionAbilityFichaCard
                              key={`preview-ability-ficha-${skill.id || skill.nombre}`}
                              ability={skill}
                              factionId={selectedFaction?.id}
                              gameMode={gameMode}
                              description={getFactionSkillDescriptionForMode(skill, gameMode)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>,
                    document.body,
                  ) : null
                })() : null}
              </>
            )}
          </div>
        </div>
      </div>
      {isArmyPrintPreviewOpen ? (
        <div ref={armyExportStageRef} className="army-export-stage army-export-stage-hidden" aria-hidden="true">
          {abilityExportPages
            ? abilityExportPages.map((pageEntries, pageIndex) => (
                <div
                  key={`ability-export-page-${pageIndex}`}
                  ref={(node) => setArmySheetRef(`ability-${pageIndex}`, node)}
                  className="army-export-sheet army-export-sheet-cards"
                >
                  {pageEntries.map((skill, cardIndex) => {
                    const cardKey = `ability-${pageIndex}-${skill.id || skill.nombre || cardIndex}`
                    return (
                    <div key={`ability-export-${skill.id || skill.nombre || cardIndex}`} className="army-export-sheet-slot">
                      <div className="army-export-card-host">
                        <FactionAbilityFichaCard
                          ref={(node) => setArmyCardRef(cardKey, node)}
                          ability={skill}
                          factionId={selectedFaction?.id}
                          gameMode={gameMode}
                          description={getFactionSkillDescriptionForMode(skill, gameMode)}
                        />
                      </div>
                    </div>
                    )
                  })}
                </div>
              ))
            : null}
          {armyExportPages
            ? armyExportPages.map((pageEntries, pageIndex) => (
                <div
                  key={`army-export-page-${pageIndex}`}
                  ref={(node) => setArmySheetRef(`page-${pageIndex}`, node)}
                  className="army-export-sheet army-export-sheet-cards"
                >
                  {pageEntries.map((entry, cardIndex) => {
                    const cardKey = `unit-${pageIndex}-${entry.uid || cardIndex}`
                    const displayName = exportUnitDisplayNames.get(entry.uid) || entry.base.nombre
                    const unitEraTokens = getUnitEraTokens(entry.base)
                    const unitEraLabel = unitEraTokens.length
                      ? unitEraTokens.map((token) => getEraLabel(token)).join(' / ')
                      : ''

                    return (
                      <div key={`army-export-${entry.uid}`} className="army-export-sheet-slot" data-army-export-slot={entry.uid}>
                        <div className="army-export-card-host">
                          <UnitFichaCard
                            ref={(node) => setArmyCardRef(cardKey, node)}
                            unit={{
                              ...entry.base,
                              nombre: displayName,
                              armas_disparo: entry.shooting,
                              armas_melee: entry.meleeList || [],
                              valor_base: getUnitFichaValue(entry.base, gameMode, entry.total),
                              escuadra_display: getSquadFichaValue(entry.base, gameMode, entry.squadSize),
                            }}
                            factionId={selectedFaction?.id}
                            imageDataUrl={entry.imageDataUrl}
                            gameMode={gameMode}
                            eraLabel={unitEraLabel}
                            lang={lang}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            : null}
        </div>
      ) : null}
      {imageCropDraft && typeof document !== 'undefined'
        ? createPortal(
            <div className="unit-modal" role="dialog" aria-modal="true" onClick={handleCancelImageCrop}>
              <div className="unit-modal-card image-crop-modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="unit-modal-header">
                  <div>
                    <p className="eyebrow">{imageCropDraft.unitName}</p>
                    <h3>{t('generator.cropImageTitle')}</h3>
                    <p className="unit-modal-subtitle">{t('generator.cropImageHint')}</p>
                  </div>
                  <button type="button" className="ghost small" onClick={handleCancelImageCrop}>
                    {t('generator.close')}
                  </button>
                </div>
                <div className="unit-modal-body image-crop-modal-body">
                  <div
                    className="image-crop-stage"
                    onPointerDown={handleImageCropPointerDown}
                    role="presentation"
                    style={{
                      width: `${IMAGE_CROP_VIEWPORT_WIDTH}px`,
                      height: `${IMAGE_CROP_VIEWPORT_HEIGHT}px`,
                    }}
                  >
                    <img
                      src={imageCropDraft.sourceDataUrl}
                      alt={imageCropDraft.unitName}
                      className="image-crop-stage-image"
                      draggable="false"
                      style={{
                        width: `${imageCropDraft.imageWidth}px`,
                        height: `${imageCropDraft.imageHeight}px`,
                        transform: `translate(calc(-50% + ${imageCropDraft.offsetX}px), calc(-50% + ${imageCropDraft.offsetY}px)) scale(${Math.max(
                          IMAGE_CROP_VIEWPORT_WIDTH / imageCropDraft.imageWidth,
                          IMAGE_CROP_VIEWPORT_HEIGHT / imageCropDraft.imageHeight,
                        ) * imageCropDraft.zoom})`,
                      }}
                    />
                    <div className="image-crop-frame" aria-hidden="true" />
                  </div>
                  <label className="field image-crop-zoom-field">
                    <span>{t('generator.zoom')}</span>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={imageCropDraft.zoom}
                      onChange={(event) => handleImageCropZoomChange(event.target.value)}
                    />
                  </label>
                  <div className="image-crop-actions">
                    <button type="button" className="ghost small" onClick={handleCancelImageCrop}>
                      {t('generator.cancel')}
                    </button>
                    <button type="button" className="primary" onClick={handleConfirmImageCrop}>
                      {t('generator.confirmCropImage')}
                    </button>
                  </div>
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
