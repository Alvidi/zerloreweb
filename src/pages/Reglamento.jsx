import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import reglamentoMd from '../data/spanish/reglamento.md?raw'
import reglamentoEnMd from '../data/english/rulebook.md?raw'
import misionesMd from '../data/spanish/misiones.md?raw'
import misionesEnMd from '../data/english/missions.md?raw'
import legadoData from '../data/factions/jsonFaccionesES/legado.json'
import legadoEnData from '../data/factions/jsonFaccionesEN/legado.en.json'
import caosData from '../data/factions/jsonFaccionesES/caos.json'
import caosEnData from '../data/factions/jsonFaccionesEN/caos.en.json'
import UnitFichaCard from '../features/generator/components/UnitFichaCard.jsx'
import { normalizeFaction } from '../features/generator/generatorUtils.js'
import zeroLoreLogo from '../images/zeroloreLogoToken.png'
import damage1Token from '../images/tokens/damage-1-red.svg'
import damage3Token from '../images/tokens/damage-3-red.svg'
import damage5Token from '../images/tokens/damage-5-red.svg'
import damage10Token from '../images/tokens/damage-10-red.svg'
import stateReadyToken from '../images/tokens/preparado-blue.svg'
import stateRetreatToken from '../images/tokens/retirada-blue.svg'
import conquestBlueToken from '../images/tokens/conquista-blue.svg'
import conquestGreenToken from '../images/tokens/conquista-green.svg'
import conquestRedToken from '../images/tokens/conquista-red.svg'
import conquestYellowToken from '../images/tokens/conquista-yellow.svg'
import activationToken from '../images/tokens/activacion-gray.svg'
import activationGreenToken from '../images/tokens/activacion-green.svg'
import miniatureVsSquadImage from '../images/webimagen/imagen_1.webp'
import measurementImage from '../images/webimagen/imagen_2.webp'
import climbingImage from '../images/webimagen/imagen_3.webp'
import lineOfSightImage from '../images/webimagen/imagen_4.webp'
import sprintImage from '../images/webimagen/imagen_5.webp'
import activationOverviewImage from '../images/webimagen/imagen_7.webp'
import turnStructureImage from '../images/webimagen/imagen_8.webp'
import commandPostControlImage from '../images/webimagen/imagen_9.webp'
import rangedAttackSequenceImage from '../images/webimagen/imagen_10.webp'
import lockedUnitsImage from '../images/webimagen/imagen_11.webp'
import squadMeleeImage from '../images/webimagen/imagen_12.webp'
import coverImage from '../images/webimagen/imagen_13.webp'
import vehicleMonsterMeleeImage from '../images/webimagen/imagen_14.webp'
import rulesHeaderImage from '../images/webimagen/cabecera2.webp'
import grandBattle4pExposedMap from '../images/maps/gran-batalla-4p-cuarteles-expuestos.svg'
import grandBattle4pCornersMap from '../images/maps/gran-batalla-4p-esquinas.svg'
import grandBattle4pWideMap from '../images/maps/gran-batalla-4p-72x48.svg'
import totalWarCenterMap from '../images/maps/guerra-total-4p-centro.svg'
import totalWarCornersMap from '../images/maps/guerra-total-4p-esquinas.svg'
import totalWarExposedMap from '../images/maps/guerra-total-4p-expuestos.svg'
import grandBattle4pExposedMapEn from '../images/maps/gran-batalla-4p-cuarteles-expuestos.en.svg'
import grandBattle4pCornersMapEn from '../images/maps/gran-batalla-4p-esquinas.en.svg'
import grandBattle4pWideMapEn from '../images/maps/gran-batalla-4p-72x48.en.svg'
import totalWarCenterMapEn from '../images/maps/guerra-total-4p-centro.en.svg'
import totalWarCornersMapEn from '../images/maps/guerra-total-4p-esquinas.en.svg'
import totalWarExposedMapEn from '../images/maps/guerra-total-4p-expuestos.en.svg'
import unitTypeLineIcon from '../images/units_icons/line.png'
import unitTypeEliteIcon from '../images/units_icons/elite.png'
import unitTypeVehicleIcon from '../images/units_icons/vehicle.png'
import unitTypeMonsterIcon from '../images/units_icons/monster.png'
import unitTypeHeroIcon from '../images/units_icons/hero.png'
import unitTypeLinePastIcon from '../images/units_icons/past/line.png'
import unitTypeElitePastIcon from '../images/units_icons/past/elite.png'
import unitTypeVehiclePastIcon from '../images/units_icons/past/vehicle.png'
import unitTypeHeroPastIcon from '../images/units_icons/past/hero.png'
import { useI18n } from '../i18n/I18nContext.jsx'

const RULES_MODES = ['rules', 'missions', 'tokens']
const TOKEN_LIMIT = 20
const ZEROLORE_LOGO_ASPECT = 624 / 388
const RULES_UNIT_PROFILE_SLOT_SRC = 'rules-unit-profile-slot'
const RULES_HERO_PROFILE_SLOT_SRC = 'rules-hero-profile-slot'

const normalizeHeadingText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const RULES_PDF_KEEP_WITH_NEXT_TAGS = new Set(['H1', 'H2', 'H3'])
const getRulesAssetPlaceholders = (lang = 'es') => {
  const en = lang === 'en'
  return {
    activationImage: activationOverviewImage,
    climbingImage,
    commandPostControlImage,
    coverImage,
    lineOfSightImage,
    lockedUnitsImage,
    measurementImage,
    miniatureVsSquadImage,
    rangedAttackSequenceImage,
    grandBattle4pExposedMap: en ? grandBattle4pExposedMapEn : grandBattle4pExposedMap,
    grandBattle4pCornersMap: en ? grandBattle4pCornersMapEn : grandBattle4pCornersMap,
    grandBattle4pWideMap: en ? grandBattle4pWideMapEn : grandBattle4pWideMap,
    totalWarCenterMap: en ? totalWarCenterMapEn : totalWarCenterMap,
    totalWarCornersMap: en ? totalWarCornersMapEn : totalWarCornersMap,
    totalWarExposedMap: en ? totalWarExposedMapEn : totalWarExposedMap,
    sprintImage,
    squadMeleeImage,
    turnStructureImage,
    vehicleMonsterMeleeImage,
    unitProfileImage: RULES_UNIT_PROFILE_SLOT_SRC,
    heroProfileImage: RULES_HERO_PROFILE_SLOT_SRC,
  }
}

const RULES_UNIT_TYPE_ICONS = [
  { id: 'line', imageSrc: unitTypeLineIcon, pastImageSrc: unitTypeLinePastIcon, labelEs: 'Línea', labelEn: 'Line', sectionHeadings: ['1 unidades de linea', '1 line units'] },
  { id: 'elite', imageSrc: unitTypeEliteIcon, pastImageSrc: unitTypeElitePastIcon, labelEs: 'Élite', labelEn: 'Elite', sectionHeadings: ['2 unidades de elite', '2 elite units'] },
  { id: 'vehicle', imageSrc: unitTypeVehicleIcon, pastImageSrc: unitTypeVehiclePastIcon, labelEs: 'Vehículo', labelEn: 'Vehicle', sectionHeadings: ['3 vehiculos', '3 vehicles'] },
  { id: 'monster', imageSrc: unitTypeMonsterIcon, labelEs: 'Monstruo', labelEn: 'Monster', sectionHeadings: ['4 monstruos', '4 monsters'] },
  { id: 'hero', imageSrc: unitTypeHeroIcon, pastImageSrc: unitTypeHeroPastIcon, labelEs: 'Héroe', labelEn: 'Hero', sectionHeadings: ['5 heroes', '5 heroes'] },
]

const RULES_EXAMPLE_FACTIONS = {
  es: {
    legado: normalizeFaction(legadoData, 0, 'legado'),
    caos: normalizeFaction(caosData, 1, 'caos'),
  },
  en: {
    legado: normalizeFaction(legadoEnData, 0, 'legado'),
    caos: normalizeFaction(caosEnData, 1, 'caos'),
  },
}

const getRulesExampleFactionSet = (lang = 'es') => RULES_EXAMPLE_FACTIONS[lang] || RULES_EXAMPLE_FACTIONS.es

const getRulesExampleUnit = (lang = 'es') => {
  const units = getRulesExampleFactionSet(lang).legado.unidades || []
  const preferredName = lang === 'en' ? 'Eternal Guardians' : 'Guardianes Eternos'
  return units.find((unit) => unit.nombre === preferredName) || units[0]
}

const getRulesExampleHero = (lang = 'es') => {
  const units = getRulesExampleFactionSet(lang).caos.unidades || []
  const preferredName = lang === 'en' ? 'Demonic Cyborg' : 'cyborg demoniaco'
  return units.find((unit) => unit.nombre === preferredName) || units.find((unit) => {
    const normalizedType = String(unit.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalizedType.includes('hero') || normalizedType.includes('heroe')
  })
}

function RulesFichaSlot({ type, lang }) {
  if (type === 'unit') {
    const unit = getRulesExampleUnit(lang)
    if (!unit) return null
    return (
      <div className="rules-profile-image-row rules-ficha-card-example rules-ficha-card-example-unit">
        <UnitFichaCard
          unit={{
            ...unit,
            escuadra_display: `${unit.escuadra_min}/${unit.escuadra_max}`,
          }}
          factionId="legado"
          imageDataUrl=""
          gameMode="escaramuza"
          eraLabel={lang === 'en' ? 'Future' : 'Futuro'}
          lang={lang}
          showLayoutToolbar={false}
        />
      </div>
    )
  }

  if (type === 'hero') {
    const unit = getRulesExampleHero(lang)
    if (!unit) return null
    return (
      <div className="rules-profile-image-row rules-ficha-card-example rules-ficha-card-example-hero">
        <UnitFichaCard
          unit={unit}
          factionId="caos"
          imageDataUrl=""
          gameMode="escaramuza"
          eraLabel={lang === 'en' ? 'Future' : 'Futuro'}
          lang={lang}
          showLayoutToolbar={false}
        />
      </div>
    )
  }

  return null
}

const renderRulesHtmlWithFichaSlots = (html, lang) => {
  const slotPattern = /<div data-rules-ficha-slot="(unit|hero)"><\/div>/g
  const nodes = []
  let lastIndex = 0
  let match
  let index = 0

  while ((match = slotPattern.exec(html)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <div
          key={`rules-html-fragment-${index}`}
          className="rules-html-fragment"
          dangerouslySetInnerHTML={{ __html: html.slice(lastIndex, match.index) }}
        />,
      )
      index += 1
    }
    nodes.push(<RulesFichaSlot key={`rules-ficha-slot-${index}`} type={match[1]} lang={lang} />)
    index += 1
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < html.length) {
    nodes.push(
      <div
        key={`rules-html-fragment-${index}`}
        className="rules-html-fragment"
        dangerouslySetInnerHTML={{ __html: html.slice(lastIndex) }}
      />,
    )
  }

  return nodes
}

const isRulesPdfKeepWithNextNode = (node) =>
  node?.nodeType === 1 && RULES_PDF_KEEP_WITH_NEXT_TAGS.has(node.tagName)

const getSafeRulesPdfSplitCount = (nodes, candidateCount) => {
  if (candidateCount >= nodes.length) return candidateCount

  let safeCount = candidateCount
  while (safeCount > 1 && isRulesPdfKeepWithNextNode(nodes[safeCount - 1])) {
    safeCount -= 1
  }

  return safeCount
}

const replaceRulesAssetPlaceholders = (markdown, lang = 'es') =>
  Object.entries(getRulesAssetPlaceholders(lang)).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    markdown,
  )

const TOKEN_DEFINITIONS = [
  { id: 'damage_1', category: 'damage', labelKey: 'rules.tokens.types.damage1', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage1Token },
  { id: 'damage_3', category: 'damage', labelKey: 'rules.tokens.types.damage3', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage3Token },
  { id: 'damage_5', category: 'damage', labelKey: 'rules.tokens.types.damage5', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage5Token },
  { id: 'damage_10', category: 'damage', labelKey: 'rules.tokens.types.damage10', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage10Token },
  { id: 'state_ready', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateReady', diameterMm: 32, previewSize: 'medium', imageSrc: stateReadyToken },
  { id: 'state_activation', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateActivated', diameterMm: 32, previewSize: 'medium', imageSrc: activationToken },
  { id: 'state_activation_green', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateActivatedGreen', diameterMm: 32, previewSize: 'medium', imageSrc: activationGreenToken },
  { id: 'state_retreat', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateRetreat', diameterMm: 32, previewSize: 'medium', imageSrc: stateRetreatToken },
  { id: 'state_conquest_blue', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestBlue', diameterMm: 32, previewSize: 'medium', imageSrc: conquestBlueToken },
  { id: 'state_conquest_red', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestRed', diameterMm: 32, previewSize: 'medium', imageSrc: conquestRedToken },
  { id: 'state_conquest_green', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestGreen', diameterMm: 32, previewSize: 'medium', imageSrc: conquestGreenToken },
  { id: 'state_conquest_yellow', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestYellow', diameterMm: 32, previewSize: 'medium', imageSrc: conquestYellowToken },
  { id: 'command_circle_3', category: 'command', shape: 'circle', commandColor: 'orange', labelKey: 'rules.tokens.types.commandCircle3', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6', category: 'command', shape: 'circle', commandColor: 'orange', labelKey: 'rules.tokens.types.commandCircle6', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_3_blue', category: 'command', shape: 'circle', commandColor: 'blue', labelKey: 'rules.tokens.types.commandCircle3Blue', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6_blue', category: 'command', shape: 'circle', commandColor: 'blue', labelKey: 'rules.tokens.types.commandCircle6Blue', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_3_red', category: 'command', shape: 'circle', commandColor: 'red', labelKey: 'rules.tokens.types.commandCircle3Red', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6_red', category: 'command', shape: 'circle', commandColor: 'red', labelKey: 'rules.tokens.types.commandCircle6Red', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_3_green', category: 'command', shape: 'circle', commandColor: 'green', labelKey: 'rules.tokens.types.commandCircle3Green', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6_green', category: 'command', shape: 'circle', commandColor: 'green', labelKey: 'rules.tokens.types.commandCircle6Green', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_3_yellow', category: 'command', shape: 'circle', commandColor: 'yellow', labelKey: 'rules.tokens.types.commandCircle3Yellow', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6_yellow', category: 'command', shape: 'circle', commandColor: 'yellow', labelKey: 'rules.tokens.types.commandCircle6Yellow', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
]

const buildInitialTokenCounts = () => Object.fromEntries(TOKEN_DEFINITIONS.map((token) => [token.id, 0]))
const buildInitialTokenInputValues = () => Object.fromEntries(TOKEN_DEFINITIONS.map((token) => [token.id, '0']))
const clampTokenCount = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(TOKEN_LIMIT, parsed))
}
const normalizeTokenInputValue = (value) => {
  const digitsOnly = String(value || '').replace(/\D+/g, '')
  if (!digitsOnly) return ''
  return String(clampTokenCount(digitsOnly))
}

function Reglamento() {
  const { t, lang } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [tokenCounts, setTokenCounts] = useState(buildInitialTokenCounts)
  const [tokenInputValues, setTokenInputValues] = useState(buildInitialTokenInputValues)
  const [isGeneratingTokensPdf, setIsGeneratingTokensPdf] = useState(false)
  const [isGeneratingRulesPdf, setIsGeneratingRulesPdf] = useState(false)
  const [isSpecialtyTableOpen, setIsSpecialtyTableOpen] = useState(false)
  const modeParam = searchParams.get('mode')
  const rulesMode = RULES_MODES.includes(modeParam) ? modeParam : 'rules'
  const isTokensMode = rulesMode === 'tokens'
  const activeMarkdown = useMemo(() => {
    if (rulesMode === 'missions') {
      return lang === 'en' ? misionesEnMd : misionesMd
    }
    return lang === 'en' ? reglamentoEnMd : reglamentoMd
  }, [lang, rulesMode])
  const tokenOptions = useMemo(
    () =>
      TOKEN_DEFINITIONS.map((token) => ({
        ...token,
        imageSrc: token.imageSrc,
        label: t(token.labelKey),
        primaryText: token.primaryText || t(token.labelKey),
        secondaryText: token.secondaryKey ? t(token.secondaryKey) : '',
      })),
    [t],
  )
  const totalTokenCount = useMemo(
    () => tokenOptions.reduce((acc, token) => acc + (tokenCounts[token.id] || 0), 0),
    [tokenCounts, tokenOptions],
  )
  const modeOptions = useMemo(
    () => [
      { id: 'rules', label: t('rules.modeRules') },
      { id: 'missions', label: t('rules.modeMissions') },
      { id: 'tokens', label: t('rules.modeTokens') },
    ],
    [t],
  )
  const rulesHtml = useMemo(() => {
    if (isTokensMode) {
      return ''
    }
    return marked(replaceRulesAssetPlaceholders(activeMarkdown, lang))
  }, [activeMarkdown, isTokensMode, lang])
  const printCoverSectionLabel = rulesMode === 'missions' ? t('rules.modeMissions') : t('rules.modeRules')
  const printCoverCreditLabel = lang === 'en' ? 'by alvidi' : 'por alvidi'
  const shouldShowRulesHeader = rulesMode === 'rules'

  const { renderedHtml, tocItems, documentHeading } = useMemo(() => {
    if (isTokensMode) {
      return { renderedHtml: '', tocItems: [], documentHeading: null }
    }
    if (typeof window === 'undefined') {
      return { renderedHtml: rulesHtml, tocItems: [], documentHeading: null }
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(rulesHtml, 'text/html')
    // Wrap imported tables so wide rulebook tables never break the layout.
    Array.from(doc.querySelectorAll('table')).forEach((table) => {
      if (table.parentElement?.classList.contains('rules-table-scroll')) return
      const wrapper = doc.createElement('div')
      wrapper.className = 'rules-table-scroll'
      table.parentNode?.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })
    if (rulesMode === 'rules') {
      const specialtyHeading = Array.from(doc.querySelectorAll('h3')).find((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized === 'especialidad' || normalized === 'specialty'
      })

      if (specialtyHeading) {
        let sibling = specialtyHeading.nextElementSibling
        while (sibling && !/^H[1-3]$/.test(sibling.tagName)) {
          if (sibling.classList.contains('rules-table-scroll')) {
            const details = doc.createElement('section')
            details.className = `rules-specialty-details${isSpecialtyTableOpen ? ' is-open' : ''}`

            const summary = doc.createElement('button')
            summary.type = 'button'
            summary.className = 'rules-specialty-summary'
            summary.dataset.rulesSpecialtyToggle = 'true'
            summary.setAttribute('aria-expanded', String(isSpecialtyTableOpen))
            summary.textContent = lang === 'en' ? 'View specialty table' : 'Ver tabla de especialidades'

            const panel = doc.createElement('div')
            panel.className = 'rules-specialty-panel'

            sibling.parentNode?.insertBefore(details, sibling)
            details.appendChild(summary)
            details.appendChild(panel)
            panel.appendChild(sibling)
            break
          }
          sibling = sibling.nextElementSibling
        }
      }
    }
    Array.from(doc.querySelectorAll('img')).forEach((image) => {
      const src = image.getAttribute('src') || ''
      const slotTypeBySrc = {
        [RULES_UNIT_PROFILE_SLOT_SRC]: 'unit',
        [RULES_HERO_PROFILE_SLOT_SRC]: 'hero',
      }
      const slotType = slotTypeBySrc[src]
      if (!slotType) return

      const slot = doc.createElement('div')
      slot.dataset.rulesFichaSlot = slotType
      const paragraph = image.closest('p')
      if (paragraph) {
        paragraph.replaceWith(slot)
      } else {
        image.replaceWith(slot)
      }
    })
    if (rulesMode === 'rules') {
      const unitTypesHeading = Array.from(doc.querySelectorAll('h1, h2, h3')).find((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized === 'tipos de unidad' || normalized === 'unit types'
      })

      if (unitTypesHeading) {
        const gallery = doc.createElement('div')
        gallery.className = 'rules-unit-type-gallery'

        RULES_UNIT_TYPE_ICONS.forEach((unitType) => {
          const item = doc.createElement('article')
          item.className = 'rules-unit-type-gallery-item'

          const mark = doc.createElement('div')
          mark.className = `rules-unit-type-gallery-mark${unitType.pastImageSrc ? ' has-era-variants' : ''}`

          const image = doc.createElement('img')
          image.className = 'rules-unit-type-gallery-image'
          image.src = unitType.imageSrc
          image.alt = ''
          image.loading = 'lazy'
          mark.appendChild(image)

          if (unitType.pastImageSrc) {
            const pastImage = doc.createElement('img')
            pastImage.className = 'rules-unit-type-gallery-image'
            pastImage.src = unitType.pastImageSrc
            pastImage.alt = ''
            pastImage.loading = 'lazy'
            mark.appendChild(pastImage)
          }

          const label = doc.createElement('p')
          label.className = 'rules-unit-type-gallery-label'
          label.textContent = lang === 'en' ? unitType.labelEn : unitType.labelEs

          item.appendChild(mark)
          item.appendChild(label)
          gallery.appendChild(item)
        })

        let insertionTarget = unitTypesHeading
        let sibling = unitTypesHeading.nextElementSibling
        while (sibling && sibling.tagName === 'P') {
          insertionTarget = sibling
          sibling = sibling.nextElementSibling
        }

        insertionTarget.parentNode?.insertBefore(gallery, insertionTarget.nextSibling)
      }

      RULES_UNIT_TYPE_ICONS.forEach((unitType) => {
        const sectionHeading = Array.from(doc.querySelectorAll('h2, h3')).find((heading) =>
          unitType.sectionHeadings.includes(normalizeHeadingText(heading.textContent)),
        )
        if (!sectionHeading || sectionHeading.nextElementSibling?.classList.contains('rules-unit-type-section-badge')) return

        const badge = doc.createElement('div')
        badge.className = `rules-unit-type-section-badge unit-type-${unitType.id}`

        const mark = doc.createElement('div')
        mark.className = `rules-unit-type-section-mark${unitType.pastImageSrc ? ' has-era-variants' : ''}`

        const image = doc.createElement('img')
        image.className = 'rules-unit-type-section-image'
        image.src = unitType.imageSrc
        image.alt = ''
        image.loading = 'lazy'
        mark.appendChild(image)

        if (unitType.pastImageSrc) {
          const pastImage = doc.createElement('img')
          pastImage.className = 'rules-unit-type-section-image'
          pastImage.src = unitType.pastImageSrc
          pastImage.alt = ''
          pastImage.loading = 'lazy'
          mark.appendChild(pastImage)
        }

        const label = doc.createElement('span')
        label.className = 'rules-unit-type-section-label'
        label.textContent = lang === 'en' ? unitType.labelEn : unitType.labelEs

        badge.appendChild(mark)
        badge.appendChild(label)
        sectionHeading.parentNode?.insertBefore(badge, sectionHeading.nextSibling)
      })

      const commandHeadings = Array.from(doc.querySelectorAll('h1, h2, h3')).filter((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized === 'puestos de mando y despliegue' || normalized === 'command posts and deployment'
      })
      const commandHeading = commandHeadings.at(-1)
      if (commandHeading) {
        const gallery = doc.createElement('div')
        gallery.className = 'rules-command-gallery'

        ;[
          {
            label: t('rules.tokens.types.commandCircle3'),
            shapeClass: 'command-circle',
          },
          {
            label: t('rules.tokens.types.commandCircle6'),
            shapeClass: 'command-circle',
          },
        ].forEach((token) => {
          const item = doc.createElement('article')
          item.className = 'rules-command-gallery-item'

          const mark = doc.createElement('div')
          mark.className = 'rules-command-gallery-mark'

          const preview = doc.createElement('div')
          preview.className = `rules-token-preview command ${token.shapeClass}`

          const logoBox = doc.createElement('span')
          logoBox.className = 'rules-token-command-logo-box'

          const logo = doc.createElement('img')
          logo.className = 'rules-token-command-logo-mark'
          logo.src = zeroLoreLogo
          logo.alt = ''
          logo.loading = 'lazy'

          const label = doc.createElement('p')
          label.className = 'rules-command-gallery-label'
          label.textContent = token.label

          logoBox.appendChild(logo)
          preview.appendChild(logoBox)
          mark.appendChild(preview)
          item.appendChild(mark)
          item.appendChild(label)
          gallery.appendChild(item)
        })

        const paragraphs = []
        let sibling = commandHeading.nextElementSibling
        while (sibling && sibling.tagName === 'P') {
          paragraphs.push(sibling)
          sibling = sibling.nextElementSibling
        }

        const firstParagraph = paragraphs[0] || null
        if (firstParagraph?.parentNode) {
          firstParagraph.parentNode.insertBefore(gallery, firstParagraph.nextSibling)
        } else {
          commandHeading.parentNode?.insertBefore(gallery, commandHeading.nextSibling)
        }

        const flagParagraph = paragraphs[1] || null
        if (flagParagraph?.parentNode) {
          const flagGallery = doc.createElement('div')
          flagGallery.className = 'rules-flag-gallery'

          ;[
            {
              label: t('rules.tokens.types.stateConquestBlue'),
              imageSrc: conquestBlueToken,
            },
            {
              label: t('rules.tokens.types.stateConquestRed'),
              imageSrc: conquestRedToken,
            },
            {
              label: t('rules.tokens.types.stateConquestGreen'),
              imageSrc: conquestGreenToken,
            },
            {
              label: t('rules.tokens.types.stateConquestYellow'),
              imageSrc: conquestYellowToken,
            },
          ].forEach((token) => {
            const item = doc.createElement('article')
            item.className = 'rules-flag-gallery-item'

            const mark = doc.createElement('div')
            mark.className = 'rules-flag-gallery-mark'

            const image = doc.createElement('img')
            image.className = 'rules-flag-gallery-image'
            image.src = token.imageSrc
            image.alt = ''
            image.loading = 'lazy'

            const label = doc.createElement('p')
            label.className = 'rules-flag-gallery-label'
            label.textContent = token.label

            mark.appendChild(image)
            item.appendChild(mark)
            item.appendChild(label)
            flagGallery.appendChild(item)
          })

          flagParagraph.parentNode.insertBefore(flagGallery, flagParagraph.nextSibling)
        }
      }

      const activationHeadings = Array.from(doc.querySelectorAll('h1, h2, h3')).filter((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized.includes('fase de activaciones') || normalized.includes('activation phase')
      })
      const activationHeading = activationHeadings.at(-1)
      if (activationHeading) {
        const sectionNodes = []
        let sibling = activationHeading.nextElementSibling
        while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
          sectionNodes.push(sibling)
          sibling = sibling.nextElementSibling
        }

        const tokenParagraph = sectionNodes.find((node) => {
          if (node.tagName !== 'P') return false
          const paragraph = node
          const normalized = normalizeHeadingText(paragraph.textContent)
          return normalized.includes('token de activacion') || normalized.includes('activation token')
        })
        const imageParagraph = sectionNodes.find((node) => node.tagName === 'P' && node.querySelector('img'))

        if (tokenParagraph?.parentNode && !imageParagraph) {
          const activationGallery = doc.createElement('div')
          activationGallery.className = 'rules-activation-gallery'

          ;[
            {
              label: t('rules.tokens.types.stateActivated'),
              imageSrc: activationToken,
            },
            {
              label: t('rules.tokens.types.stateActivatedGreen'),
              imageSrc: activationGreenToken,
            },
          ].forEach((token) => {
            const item = doc.createElement('article')
            item.className = 'rules-activation-gallery-item'

            const mark = doc.createElement('div')
            mark.className = 'rules-activation-gallery-mark'

            const image = doc.createElement('img')
            image.className = 'rules-activation-gallery-image'
            image.src = token.imageSrc
            image.alt = ''
            image.loading = 'lazy'

            const label = doc.createElement('p')
            label.className = 'rules-activation-gallery-label'
            label.textContent = token.label

            mark.appendChild(image)
            item.appendChild(mark)
            item.appendChild(label)
            activationGallery.appendChild(item)
          })

          tokenParagraph.parentNode.insertBefore(activationGallery, tokenParagraph.nextSibling)
        }
      }

      const unitStatesHeadings = Array.from(doc.querySelectorAll('h1, h2, h3')).filter((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized.includes('estados de unidad') || normalized.includes('unit states')
      })
      const unitStatesHeading = unitStatesHeadings.at(-1)
      if (unitStatesHeading) {
        const sectionNodes = []
        let sibling = unitStatesHeading.nextElementSibling
        while (sibling && sibling.tagName !== 'H1') {
          sectionNodes.push(sibling)
          sibling = sibling.nextElementSibling
        }

        const stateTokenConfigs = [
          {
            matcher: ['token de escudo', 'shield token'],
            label: t('rules.tokens.types.stateReady'),
            imageSrc: stateReadyToken,
          },
          {
            matcher: ['token de retirada', 'retreat token'],
            label: t('rules.tokens.types.stateRetreat'),
            imageSrc: stateRetreatToken,
          },
        ]

        stateTokenConfigs.forEach((token) => {
          const tokenParagraph = sectionNodes.find((node) => {
            if (node.tagName !== 'P') return false
            const normalized = normalizeHeadingText(node.textContent)
            return token.matcher.some((value) => normalized.includes(value))
          })

          if (!tokenParagraph?.parentNode) return

          const stateGallery = doc.createElement('div')
          stateGallery.className = 'rules-state-gallery'

          const item = doc.createElement('article')
          item.className = 'rules-state-gallery-item'

          const mark = doc.createElement('div')
          mark.className = 'rules-state-gallery-mark'

          const image = doc.createElement('img')
          image.className = 'rules-state-gallery-image'
          image.src = token.imageSrc
          image.alt = ''
          image.loading = 'lazy'

          const label = doc.createElement('p')
          label.className = 'rules-state-gallery-label'
          label.textContent = token.label

          mark.appendChild(image)
          item.appendChild(mark)
          item.appendChild(label)
          stateGallery.appendChild(item)
          tokenParagraph.parentNode.insertBefore(stateGallery, tokenParagraph.nextSibling)
        })
      }

      const woundsHeadings = Array.from(doc.querySelectorAll('h1, h2, h3')).filter((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized === 'vidas' || normalized === 'wounds'
      })
      const woundsHeading = woundsHeadings.at(-1)
      if (woundsHeading) {
        const sectionNodes = []
        let sibling = woundsHeading.nextElementSibling
        while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
          sectionNodes.push(sibling)
          sibling = sibling.nextElementSibling
        }

        const tokenListItem = sectionNodes.find((node) => {
          if (node.tagName !== 'UL') return false
          return Array.from(node.querySelectorAll('li')).some((item) => {
            const normalized = normalizeHeadingText(item.textContent)
            return normalized.includes('tokens de dano') || normalized.includes('damage tokens')
          })
        })

        if (tokenListItem?.parentNode) {
          const damageGallery = doc.createElement('div')
          damageGallery.className = 'rules-damage-gallery'

          ;[
            { label: t('rules.tokens.types.damage1'), imageSrc: damage1Token },
            { label: t('rules.tokens.types.damage3'), imageSrc: damage3Token },
            { label: t('rules.tokens.types.damage5'), imageSrc: damage5Token },
            { label: t('rules.tokens.types.damage10'), imageSrc: damage10Token },
          ].forEach((token) => {
            const item = doc.createElement('article')
            item.className = 'rules-damage-gallery-item'

            const mark = doc.createElement('div')
            mark.className = 'rules-damage-gallery-mark'

            const image = doc.createElement('img')
            image.className = 'rules-damage-gallery-image'
            image.src = token.imageSrc
            image.alt = ''
            image.loading = 'lazy'

            const label = doc.createElement('p')
            label.className = 'rules-damage-gallery-label'
            label.textContent = token.label

            mark.appendChild(image)
            item.appendChild(mark)
            item.appendChild(label)
            damageGallery.appendChild(item)
          })

          tokenListItem.parentNode.insertBefore(damageGallery, tokenListItem.nextSibling)
        }
      }
    }
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
    const toc = headings
      .map((heading, index) => {
        const level = Number(heading.tagName.replace('H', ''))
        const title = heading.textContent?.trim() || `${t('rules.sectionFallback')} ${index + 1}`
        let id = heading.getAttribute('id')
        if (!id) {
          id = `section-${index + 1}`
          heading.setAttribute('id', id)
        }
        return { id, title, level }
      })
      .filter((item) => item.title)
    const firstHeading = doc.querySelector('h1')
    const documentHeading = rulesMode === 'missions'
      ? {
        id: 'mission-basic',
        title: t('rules.modeMissions'),
      }
      : firstHeading
        ? {
          id: firstHeading.getAttribute('id') || '',
          title: firstHeading.textContent?.trim() || '',
        }
        : null
    if (firstHeading && rulesMode !== 'missions') {
      firstHeading.remove()
    }
    const bodyHtml = doc.body ? doc.body.innerHTML : rulesHtml
    return { renderedHtml: bodyHtml, tocItems: toc, documentHeading }
  }, [t, lang, rulesHtml, isTokensMode, rulesMode, isSpecialtyTableOpen])

  useEffect(() => {
    if (!contentRef.current) return undefined

    const handleRulesClick = (event) => {
      const toggle = event.target.closest('[data-rules-specialty-toggle="true"]')
      if (!toggle || !contentRef.current?.contains(toggle)) return
      event.preventDefault()
      setIsSpecialtyTableOpen((current) => !current)
    }

    const currentContent = contentRef.current
    currentContent.addEventListener('click', handleRulesClick)
    return () => currentContent.removeEventListener('click', handleRulesClick)
  }, [renderedHtml])

  // Scroll spy para resaltar sección activa
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return

      const headings = contentRef.current.querySelectorAll('h1[id], h2[id], h3[id]')
      let currentSection = ''

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= 200 && rect.top >= -100) {
          currentSection = heading.getAttribute('id') || ''
        }
      })

      if (currentSection) {
        setActiveSection(currentSection)
      }
      setShowBackToTop(window.scrollY > 600)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial call

    return () => window.removeEventListener('scroll', handleScroll)
  }, [renderedHtml])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const filteredToc = useMemo(() => {
    if (!searchTerm.trim()) return tocItems
    const q = normalizeHeadingText(searchTerm)
    return tocItems.filter((item) => normalizeHeadingText(item.title).includes(q))
  }, [tocItems, searchTerm])

  const setMode = (nextMode) => {
    setSearchTerm('')
    setActiveSection('')
    const nextParams = new URLSearchParams(searchParams)
    if (nextMode === 'rules') {
      nextParams.delete('mode')
    } else {
      nextParams.set('mode', nextMode)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const setTokenCount = (tokenId, value) => {
    const normalizedValue = normalizeTokenInputValue(value)
    setTokenCounts((prev) => ({
      ...prev,
      [tokenId]: normalizedValue === '' ? 0 : clampTokenCount(normalizedValue),
    }))
    setTokenInputValues((prev) => ({
      ...prev,
      [tokenId]: normalizedValue,
    }))
  }

  const finalizeTokenInput = (tokenId) => {
    setTokenInputValues((prev) => ({
      ...prev,
      [tokenId]: String(tokenCounts[tokenId] || 0),
    }))
  }

  const loadImageAsDataUrl = (src, options = {}) =>
    new Promise((resolve, reject) => {
      const { rasterSizePx } = options
      const img = new Image()
      img.onload = () => {
        const sourceWidth = Math.max(1, Math.round(img.naturalWidth || img.width || 1))
        const sourceHeight = Math.max(1, Math.round(img.naturalHeight || img.height || 1))
        const maxSourceSide = Math.max(sourceWidth, sourceHeight)
        const scale = rasterSizePx && maxSourceSide > 0 ? rasterSizePx / maxSourceSide : 1
        const outputWidth = Math.max(1, Math.round(sourceWidth * scale))
        const outputHeight = Math.max(1, Math.round(sourceHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, outputWidth, outputHeight)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = src
    })

  const loadMonochromeImageAsDataUrl = (src, color = '#000000', options = {}) =>
    new Promise((resolve, reject) => {
      const { rasterSizePx } = options
      const img = new Image()
      img.onload = () => {
        const sourceWidth = Math.max(1, Math.round(img.naturalWidth || img.width || 1))
        const sourceHeight = Math.max(1, Math.round(img.naturalHeight || img.height || 1))
        const maxSourceSide = Math.max(sourceWidth, sourceHeight)
        const scale = rasterSizePx && maxSourceSide > 0 ? rasterSizePx / maxSourceSide : 1
        const outputWidth = Math.max(1, Math.round(sourceWidth * scale))
        const outputHeight = Math.max(1, Math.round(sourceHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.clearRect(0, 0, outputWidth, outputHeight)
        ctx.drawImage(img, 0, 0, outputWidth, outputHeight)
        ctx.globalCompositeOperation = 'source-in'
        ctx.fillStyle = color
        ctx.fillRect(0, 0, outputWidth, outputHeight)
        ctx.globalCompositeOperation = 'source-over'
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = src
    })

  const waitForImages = async (element) => {
    const images = Array.from(element.querySelectorAll('img'))
    await Promise.all(
      images.map((img) => {
        img.loading = 'eager'
        img.decoding = 'sync'
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve) => {
          const done = () => resolve()
          const timeoutId = window.setTimeout(done, 2500)
          const finish = () => {
            window.clearTimeout(timeoutId)
            done()
          }
          img.addEventListener('load', finish, { once: true })
          img.addEventListener('error', finish, { once: true })
        })
      }),
    )
  }

  const handleDownloadPdf = async () => {
    if (typeof window === 'undefined' || isTokensMode || isGeneratingRulesPdf) return

    let captureRoot = null
    setIsGeneratingRulesPdf(true)

    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const blackLogoDataUrl = await loadMonochromeImageAsDataUrl(zeroLoreLogo, '#000000', { rasterSizePx: 2200 }).catch(() => null)
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14
      const contentWidthMm = pageWidth - margin * 2
      const contentHeightMm = pageHeight - margin * 2
      const captureScale = 2

      captureRoot = document.createElement('div')
      captureRoot.setAttribute('aria-hidden', 'true')
      captureRoot.style.position = 'fixed'
      captureRoot.style.left = '-20000px'
      captureRoot.style.top = '0'
      captureRoot.style.width = '1040px'
      captureRoot.style.padding = '0'
      captureRoot.style.margin = '0'
      captureRoot.style.zIndex = '-1'
      captureRoot.style.background = '#ffffff'

      captureRoot.innerHTML = `
        <style>
          .rules-pdf-sheet {
            width: 1040px;
            background: #ffffff;
            color: #111111;
            padding: 34px 44px 40px;
            box-sizing: border-box;
            font-family: Georgia, "Times New Roman", serif;
          }
          .rules-pdf-sheet *,
          .rules-pdf-sheet *::before,
          .rules-pdf-sheet *::after {
            box-sizing: border-box;
          }
          .rules-pdf-sheet .rules-html {
            background: #ffffff;
            color: #111111;
            padding: 0;
            border: 0;
            box-shadow: none;
            line-height: 1.65;
            overflow: visible;
          }
          .rules-pdf-sheet .rules-html h1,
          .rules-pdf-sheet .rules-html h2,
          .rules-pdf-sheet .rules-html h3,
          .rules-pdf-sheet .rules-html p,
          .rules-pdf-sheet .rules-html li,
          .rules-pdf-sheet .rules-html th,
          .rules-pdf-sheet .rules-html td,
          .rules-pdf-sheet .rules-html strong,
          .rules-pdf-sheet .rules-html em,
          .rules-pdf-sheet .rules-html a,
          .rules-pdf-sheet .rules-html code {
            color: #111111;
            background: transparent;
          }
          .rules-pdf-sheet .rules-html h1,
          .rules-pdf-sheet .rules-html h2,
          .rules-pdf-sheet .rules-html h3,
          .rules-pdf-sheet .rules-html p,
          .rules-pdf-sheet .rules-html li,
          .rules-pdf-sheet .rules-html th,
          .rules-pdf-sheet .rules-html td,
          .rules-pdf-sheet .rules-html strong,
          .rules-pdf-sheet .rules-html em,
          .rules-pdf-sheet .rules-html a,
          .rules-pdf-sheet .rules-html span {
            word-break: normal;
            overflow-wrap: normal;
            hyphens: none;
          }
          .rules-pdf-sheet .rules-html h1 {
            margin: 38px 0 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid #cfcfcf;
            font-family: "Cinzel", Georgia, serif;
            font-size: 31px;
            line-height: 1.18;
          }
          .rules-pdf-sheet .rules-html h2 {
            margin: 30px 0 16px;
            font-family: "Cinzel", Georgia, serif;
            font-size: 23px;
            line-height: 1.22;
          }
          .rules-pdf-sheet .rules-html h3 {
            margin: 24px 0 14px;
            font-size: 18px;
            line-height: 1.24;
          }
          .rules-pdf-sheet .rules-html p,
          .rules-pdf-sheet .rules-html li {
            font-size: 15px;
            line-height: 1.62;
          }
          .rules-pdf-sheet .rules-html img,
          .rules-pdf-sheet .rules-html .image img {
            max-width: 100%;
            height: auto;
            object-fit: contain;
          }
          .rules-pdf-sheet .rules-html figure {
            margin: 0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .rules-pdf-sheet .rules-html .rules-map-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin: 14px 0 18px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .rules-pdf-sheet .rules-html .rules-map-grid figure {
            display: block;
            overflow: visible;
          }
          .rules-pdf-sheet .rules-html .rules-map-grid img {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 520px;
            object-fit: contain;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-map-grid figcaption {
            margin-top: 5px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #111111;
          }
          .rules-pdf-sheet .rules-html .rules-profile-image-row {
            width: 72%;
            max-width: 72%;
            margin: 18px 0 22px;
            transform: none;
            display: flex;
            justify-content: center;
            break-inside: avoid;
          }
          .rules-pdf-sheet .rules-html .rules-profile-image {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 960px;
            object-fit: contain;
          }
          .rules-pdf-sheet .rules-html .rules-hero-banner {
            position: relative;
            width: 100%;
            margin: 0 0 30px;
            overflow: hidden;
            border: 1px solid #d8c777;
            border-radius: 0;
            background: #08090d;
            break-inside: avoid;
          }
          .rules-pdf-sheet .rules-html .rules-hero-banner img {
            width: 100%;
            height: auto;
            display: block;
          }
          .rules-pdf-sheet .rules-html ul,
          .rules-pdf-sheet .rules-html ol {
            padding-left: 24px;
            margin: 12px 0;
          }
          .rules-pdf-sheet .rules-html .rules-table-scroll {
            overflow: visible;
            margin: 16px 0;
            border: 1px solid #d7d7d7;
            border-radius: 0;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-specialty-summary {
            display: none;
          }
          .rules-pdf-sheet .rules-html .rules-specialty-panel {
            display: block;
          }
          .rules-pdf-sheet .rules-html table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .rules-pdf-sheet .rules-html th,
          .rules-pdf-sheet .rules-html td {
            border: 1px solid #d7d7d7;
            padding: 8px 9px;
            vertical-align: top;
            font-size: 13px;
            line-height: 1.45;
          }
          .rules-pdf-sheet .rules-html th {
            background: #f2f2f2;
            font-weight: 700;
          }
          .rules-pdf-sheet .rules-html .rules-command-gallery {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 18px 0;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-command-gallery-item {
            display: grid;
            justify-items: center;
            gap: 10px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-command-gallery-mark .rules-token-preview {
            width: 86px;
            height: 86px;
          }
          .rules-pdf-sheet .rules-html .rules-command-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 10px;
            margin: 16px 0 22px;
            padding: 12px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery-item {
            display: grid;
            justify-items: center;
            gap: 7px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery-mark {
            width: 58px;
            height: 58px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery-image {
            display: block;
            width: 82%;
            height: 82%;
            object-fit: contain;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery-mark.has-era-variants .rules-unit-type-gallery-image {
            width: 48%;
            height: 48%;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-gallery-label {
            margin: 0;
            font-size: 10px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-section-badge {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            margin: 0 0 12px;
            padding: 0;
            break-inside: avoid;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-section-mark {
            width: 76px;
            height: 36px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-section-image {
            display: block;
            width: 34px;
            height: 34px;
            object-fit: contain;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-section-mark.has-era-variants .rules-unit-type-section-image {
            width: 34px;
            height: 34px;
          }
          .rules-pdf-sheet .rules-html .rules-unit-type-section-label {
            font-size: 10px;
            font-weight: 700;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-flag-gallery {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 14px 0 18px;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-flag-gallery-item {
            display: grid;
            justify-items: center;
            gap: 8px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-flag-gallery-mark {
            width: 72px;
          }
          .rules-pdf-sheet .rules-html .rules-flag-gallery-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .rules-pdf-sheet .rules-html .rules-flag-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-activation-gallery {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            margin: 14px 0 18px;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-activation-gallery-item {
            display: grid;
            justify-items: center;
            gap: 8px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-activation-gallery-mark {
            width: 72px;
          }
          .rules-pdf-sheet .rules-html .rules-activation-gallery-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .rules-pdf-sheet .rules-html .rules-activation-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-state-gallery {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 14px 0 18px;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-state-gallery-item {
            display: grid;
            justify-items: center;
            gap: 8px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-state-gallery-mark {
            width: 72px;
          }
          .rules-pdf-sheet .rules-html .rules-state-gallery-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .rules-pdf-sheet .rules-html .rules-state-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-damage-gallery {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
            margin: 14px 0 18px;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-damage-gallery-item {
            display: grid;
            justify-items: center;
            gap: 8px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-damage-gallery-mark {
            width: 60px;
          }
          .rules-pdf-sheet .rules-html .rules-damage-gallery-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .rules-pdf-sheet .rules-html .rules-damage-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-sheet .rules-html .rules-mission-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
            margin: 16px 0 8px;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card {
            display: grid;
            gap: 8px;
            padding: 10px 0 14px;
            border: 0;
            border-bottom: 1px solid #d7d7d7;
            border-radius: 0;
            background: transparent;
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: visible;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-badge {
            margin: 0;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #555555;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card .rules-mission-card-title {
            margin: 0;
            font-family: "Cinzel", Georgia, serif;
            font-size: 18px;
            line-height: 1.24;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card p {
            margin: 0;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-copy,
          .rules-pdf-sheet .rules-html .rules-mission-card-step,
          .rules-pdf-sheet .rules-html .rules-mission-card-flavor,
          .rules-pdf-sheet .rules-html .rules-mission-card-meta {
            hyphens: none;
            word-break: normal;
            overflow-wrap: normal;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-step {
            padding-top: 2px;
            color: #111111;
            font-size: 14px;
            line-height: 1.42;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-step strong {
            color: #111111;
            font-weight: 700;
            letter-spacing: 0;
            text-transform: none;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-summary {
            padding-bottom: 8px;
            border-bottom: 1px solid #d7d7d7;
            color: #111111;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-flavor {
            padding-top: 2px;
            border-top: 0;
            color: #444444;
            font-style: italic;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-meta {
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
          }
          .rules-pdf-sheet .rules-html .rules-mission-card-meta .rules-mission-card-meta-label {
            display: block;
            margin-bottom: 4px;
            font-size: 10px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }
          .rules-pdf-cover {
            position: relative;
            width: 1040px;
            min-height: 1450px;
            background: #ffffff;
            color: #111111;
            padding: 96px 90px 110px;
            box-sizing: border-box;
            display: grid;
            align-content: center;
            justify-items: center;
            text-align: center;
            gap: 18px;
            font-family: "Space Grotesk", Arial, sans-serif;
          }
          .rules-pdf-cover *,
          .rules-pdf-cover *::before,
          .rules-pdf-cover *::after {
            box-sizing: border-box;
          }
          .rules-pdf-cover-mark {
            width: 220px;
            height: auto;
          }
          .rules-pdf-cover-brand {
            margin: 0;
            font-family: "Cinzel", Georgia, serif;
            font-size: 56px;
            line-height: 1.08;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #000000;
          }
          .rules-pdf-cover-section {
            margin: 8px 0 0;
            font-family: "Cinzel", Georgia, serif;
            font-size: 26px;
            line-height: 1.12;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #111111;
          }
          .rules-pdf-cover-subtitle {
            margin: 6px 0 0;
            max-width: 520px;
            font-size: 16px;
            line-height: 1.6;
            color: #444444;
          }
          .rules-pdf-cover-credit {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 42px;
            margin: 0;
            text-align: center;
            font-family: "Cinzel", Georgia, serif;
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #666666;
          }
        </style>
        <div class="rules-pdf-cover">
          ${blackLogoDataUrl ? `<img class="rules-pdf-cover-mark" src="${blackLogoDataUrl}" alt="" />` : ''}
          <p class="rules-pdf-cover-brand">ZEROLORE</p>
          <p class="rules-pdf-cover-section">${printCoverSectionLabel}</p>
          <p class="rules-pdf-cover-credit">${printCoverCreditLabel}</p>
        </div>
        <div class="rules-pdf-sheet">
          <div class="rules-html">
            ${documentHeading ? `<h1>${escapeHtml(documentHeading.title)}</h1>` : ''}
            ${shouldShowRulesHeader ? `<div class="rules-hero-banner"><img src="${rulesHeaderImage}" alt="" /></div>` : ''}
            ${renderedHtml}
          </div>
        </div>
      `

      document.body.appendChild(captureRoot)
      const liveFichaSlots = Array.from(contentRef.current?.querySelectorAll('.rules-ficha-card-example') || [])
      captureRoot.querySelectorAll('[data-rules-ficha-slot]').forEach((slot, index) => {
        const liveSlot = liveFichaSlots[index]
        if (liveSlot) {
          slot.replaceWith(liveSlot.cloneNode(true))
        }
      })
      captureRoot.querySelectorAll('.rules-specialty-details').forEach((details) => {
        details.classList.add('is-open')
      })

      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      await waitForImages(captureRoot)

      const coverTarget = captureRoot.querySelector('.rules-pdf-cover')
      const coverCanvas = await html2canvas(coverTarget, {
        backgroundColor: '#ffffff',
        scale: captureScale,
        useCORS: true,
        windowWidth: coverTarget.scrollWidth,
      })
      doc.addImage(
        coverCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST',
      )

      const captureTarget = captureRoot.querySelector('.rules-pdf-sheet')
      const renderSheetToPdfPage = async (sheetElement) => {
        const sheetCanvas = await html2canvas(sheetElement, {
          backgroundColor: '#ffffff',
          scale: captureScale,
          useCORS: true,
          windowWidth: sheetElement.scrollWidth,
        })
        const sheetHeightMm = (sheetCanvas.height / sheetCanvas.width) * contentWidthMm
        const scaleToFit = Math.min(1, contentHeightMm / sheetHeightMm)
        const renderWidthMm = contentWidthMm * scaleToFit
        const renderHeightMm = sheetHeightMm * scaleToFit
        const renderX = margin + (contentWidthMm - renderWidthMm) / 2
        doc.addPage()
        doc.addImage(
          sheetCanvas.toDataURL('image/png'),
          'PNG',
          renderX,
          margin,
          renderWidthMm,
          renderHeightMm,
          undefined,
          'FAST',
        )
      }

      const findBestFittingCount = ({ totalCount, measureFits, getSafeCount }) => {
        if (totalCount <= 1) return totalCount

        let low = 1
        let high = totalCount
        let best = 1

        while (low <= high) {
          const mid = Math.floor((low + high) / 2)
          if (measureFits(mid)) {
            best = mid
            low = mid + 1
          } else {
            high = mid - 1
          }
        }

        return typeof getSafeCount === 'function' ? Math.max(1, getSafeCount(best)) : best
      }

      const normalizeRulesPdfNodes = (nodes) => {
        const normalized = []

        nodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('rules-map-grid')) {
            const figures = Array.from(node.children)
            for (let index = 0; index < figures.length; index += 2) {
              const row = node.cloneNode(false)
              row.dataset.rulesPdfMapRow = 'true'
              row.appendChild(figures[index].cloneNode(true))
              if (figures[index + 1]) {
                row.appendChild(figures[index + 1].cloneNode(true))
              }
              normalized.push(row)
            }
            return
          }

          normalized.push(node)
        })

        return normalized
      }

      if (rulesMode === 'missions' && captureTarget.querySelector('.rules-mission-grid')) {
        const rulesHtmlRoot = captureTarget.querySelector('.rules-html')
        const missionGrid = rulesHtmlRoot?.querySelector('.rules-mission-grid')
        const missionCards = Array.from(missionGrid?.children || [])

        if (rulesHtmlRoot && missionGrid && missionCards.length) {
          const introNodes = Array.from(rulesHtmlRoot.childNodes).filter((node) => node !== missionGrid)
          const pxPerMm = captureTarget.scrollWidth / contentWidthMm
          const maxSheetHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm) - 12)
          const builtSheets = []

          const buildMissionSheet = ({ includeIntro, cards }) => {
            const sheet = document.createElement('div')
            sheet.className = 'rules-pdf-sheet'

            const html = document.createElement('div')
            html.className = 'rules-html'

            if (includeIntro) {
              introNodes.forEach((node) => {
                html.appendChild(node.cloneNode(true))
              })
            }

            const grid = document.createElement('div')
            grid.className = 'rules-mission-grid'
            cards.forEach((card) => {
              grid.appendChild(card.cloneNode(true))
            })
            html.appendChild(grid)
            sheet.appendChild(html)
            return sheet
          }

          const measurementSheet = buildMissionSheet({ includeIntro: false, cards: [] })
          captureRoot.appendChild(measurementSheet)
          const measurementHtml = measurementSheet.querySelector('.rules-html')

          let remainingCards = [...missionCards]
          let includeIntro = true

          while (remainingCards.length) {
            const measureMissionFits = (count) => {
              const fragment = document.createDocumentFragment()
              const html = document.createElement('div')
              html.className = 'rules-html'

              if (includeIntro) {
                introNodes.forEach((node) => {
                  html.appendChild(node.cloneNode(true))
                })
              }

              const grid = document.createElement('div')
              grid.className = 'rules-mission-grid'
              remainingCards.slice(0, count).forEach((card) => {
                grid.appendChild(card.cloneNode(true))
              })
              html.appendChild(grid)
              fragment.appendChild(html)
              measurementHtml.replaceChildren(...fragment.childNodes)
              return measurementSheet.scrollHeight <= maxSheetHeightPx
            }

            const bestCount = findBestFittingCount({
              totalCount: remainingCards.length,
              measureFits: measureMissionFits,
            })
            const bestSheet = buildMissionSheet({ includeIntro, cards: remainingCards.slice(0, bestCount) })
            captureRoot.appendChild(bestSheet)
            builtSheets.push(bestSheet)
            remainingCards = remainingCards.slice(bestCount)
            includeIntro = false
          }

          measurementSheet.remove()

          for (const sheet of builtSheets) {
            await waitForImages(sheet)
            await renderSheetToPdfPage(sheet)
          }
        } else {
          await waitForImages(captureTarget)
          await renderSheetToPdfPage(captureTarget)
        }
      } else {
        const rulesHtmlRoot = captureTarget.querySelector('.rules-html')
        const contentNodes = normalizeRulesPdfNodes(Array.from(rulesHtmlRoot?.childNodes || []).filter(
          (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
        ))

        if (rulesHtmlRoot && contentNodes.length) {
          const pxPerMm = captureTarget.scrollWidth / contentWidthMm
          const maxSheetHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm) - 12)
          const builtSheets = []

          const buildRulesSheet = (nodes) => {
            const sheet = document.createElement('div')
            sheet.className = 'rules-pdf-sheet'

            const html = document.createElement('div')
            html.className = 'rules-html'
            nodes.forEach((node) => {
              html.appendChild(node.cloneNode(true))
            })

            sheet.appendChild(html)
            return sheet
          }

          const measurementSheet = buildRulesSheet([])
          captureRoot.appendChild(measurementSheet)
          const measurementHtml = measurementSheet.querySelector('.rules-html')

          let remainingNodes = [...contentNodes]

          while (remainingNodes.length) {
            const measureRulesFits = (count) => {
              measurementHtml.replaceChildren(...remainingNodes.slice(0, count).map((node) => node.cloneNode(true)))
              return measurementSheet.scrollHeight <= maxSheetHeightPx
            }

            const bestCount = findBestFittingCount({
              totalCount: remainingNodes.length,
              measureFits: measureRulesFits,
              getSafeCount: (count) => getSafeRulesPdfSplitCount(remainingNodes, count),
            })
            const bestSheet = buildRulesSheet(remainingNodes.slice(0, bestCount))
            captureRoot.appendChild(bestSheet)
            builtSheets.push(bestSheet)
            remainingNodes = remainingNodes.slice(bestCount)
          }

          measurementSheet.remove()

          for (const sheet of builtSheets) {
            await waitForImages(sheet)
            await renderSheetToPdfPage(sheet)
          }
        } else {
          await waitForImages(captureTarget)
          await renderSheetToPdfPage(captureTarget)
        }
      }

      const filename = lang === 'en'
        ? (rulesMode === 'missions' ? 'zerolore-missions-en.pdf' : 'zerolore-rulebook-en.pdf')
        : (rulesMode === 'missions' ? 'zerolore-misiones-es.pdf' : 'zerolore-reglamento-es.pdf')

      doc.save(filename)
    } finally {
      captureRoot?.remove()
      setIsGeneratingRulesPdf(false)
    }
  }

  const generateTokensPdf = async () => {
    if (isGeneratingTokensPdf) return

    const selectedTokens = tokenOptions
      .flatMap((token) => Array.from({ length: tokenCounts[token.id] || 0 }, () => token))
      .sort((a, b) => b.diameterMm - a.diameterMm)

    if (!selectedTokens.length) return
    setIsGeneratingTokensPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      const gap = 4
      const tokenCellPadding = 6
      const maxX = pageWidth - margin
      const maxY = pageHeight - margin
      const fallbackTextColor = [244, 244, 244]
      const logoDataUrl = await loadImageAsDataUrl(zeroLoreLogo).catch(() => null)
      const tokenImageDataById = Object.fromEntries(
        await Promise.all(
          tokenOptions.map(async (token) => {
            if (!token.imageSrc) return [token.id, null]
            return [token.id, await loadImageAsDataUrl(token.imageSrc).catch(() => null)]
          }),
        ),
      )

      let cursorX = margin
      let cursorY = margin
      let rowHeight = 0

      const drawCenteredText = (text, centerX, y, fontSize, fontStyle = 'bold') => {
        doc.setFont('helvetica', fontStyle)
        doc.setFontSize(fontSize)
        doc.text(text, centerX, y, { align: 'center' })
      }

      const getCommandPalette = (commandColor = 'orange') => {
        if (commandColor === 'blue') {
          return {
            accent: [86, 154, 255],
            outerGlow: [189, 223, 255],
            dashed: [170, 212, 255],
            centerFill: [18, 28, 48],
            showInteriorDetails: true,
          }
        }
        if (commandColor === 'red') {
          return {
            accent: [219, 78, 78],
            outerGlow: [255, 204, 204],
            dashed: [255, 182, 182],
            centerFill: [44, 18, 18],
            showInteriorDetails: true,
          }
        }
        if (commandColor === 'green') {
          return {
            accent: [73, 190, 106],
            outerGlow: [198, 246, 210],
            dashed: [170, 232, 187],
            centerFill: [16, 38, 24],
            showInteriorDetails: true,
          }
        }
        if (commandColor === 'yellow') {
          return {
            accent: [222, 178, 63],
            outerGlow: [255, 236, 174],
            dashed: [246, 216, 134],
            centerFill: [44, 34, 16],
            showInteriorDetails: true,
          }
        }
        return {
          accent: [170, 176, 188],
          outerGlow: [212, 216, 224],
          dashed: [188, 194, 203],
          centerFill: [22, 27, 38],
          showInteriorDetails: true,
        }
      }

      const drawTokenCell = (token, x, y, cellSize) => {
        const centerX = x + cellSize / 2
        const centerY = y + cellSize / 2
        const radius = token.diameterMm / 2

        doc.setLineWidth(0.35)
        doc.setDrawColor(172, 172, 172)
        doc.setLineDashPattern([1.3, 1.3], 0)
        doc.rect(x, y, cellSize, cellSize)
        doc.setLineDashPattern([], 0)
        doc.setFillColor(172, 172, 172)
        doc.rect(x - 0.6, y - 0.6, 1.2, 1.2, 'F')
        doc.rect(x + cellSize - 0.6, y - 0.6, 1.2, 1.2, 'F')
        doc.rect(x - 0.6, y + cellSize - 0.6, 1.2, 1.2, 'F')
        doc.rect(x + cellSize - 0.6, y + cellSize - 0.6, 1.2, 1.2, 'F')

        const tokenImage = tokenImageDataById[token.id]
        if (tokenImage) {
          doc.addImage(
            tokenImage,
            'PNG',
            centerX - radius,
            centerY - radius,
            token.diameterMm,
            token.diameterMm,
            undefined,
            'FAST',
          )
          return
        }

        if (token.category === 'command') {
          const commandPalette = getCommandPalette(token.commandColor)
          const borderGrow = 0.7

          doc.setFillColor(10, 12, 18)
          doc.setDrawColor(...commandPalette.accent)
          doc.setLineWidth(Math.max(1.6, token.diameterMm * 0.04))

          doc.circle(centerX, centerY, radius + borderGrow, 'FD')
          if (commandPalette.showInteriorDetails) {
            doc.setDrawColor(...commandPalette.outerGlow)
            doc.setLineWidth(Math.max(0.7, token.diameterMm * 0.012))
            doc.circle(centerX, centerY, token.diameterMm * 0.43, 'S')
            doc.setDrawColor(...commandPalette.dashed)
            doc.setLineWidth(Math.max(0.48, token.diameterMm * 0.009))
            doc.setLineDashPattern([1.1, 1.6], 0)
            doc.circle(centerX, centerY, token.diameterMm * 0.33, 'S')
            doc.setLineDashPattern([], 0)
            doc.setFillColor(...commandPalette.centerFill)
            doc.circle(centerX, centerY, token.diameterMm * 0.24, 'F')
          }

          const maxLogoW = Math.min(token.diameterMm * 0.72, 90)
          let logoW = Math.max(18, maxLogoW)
          let logoH = logoW / ZEROLORE_LOGO_ASPECT
          const maxLogoH = token.diameterMm * 0.5
          if (logoH > maxLogoH) {
            logoH = maxLogoH
            logoW = logoH * ZEROLORE_LOGO_ASPECT
          }
          if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', centerX - logoW / 2, centerY - logoH / 2, logoW, logoH)
          } else {
            doc.setTextColor(...fallbackTextColor)
            drawCenteredText('ZL', centerX, centerY + 2, Math.max(16, token.diameterMm * 0.26))
          }
        } else {
          doc.setFillColor(12, 13, 18)
          doc.setDrawColor(172, 172, 172)
          doc.setLineWidth(1.2)
          doc.circle(centerX, centerY, radius, 'FD')
          doc.setTextColor(...fallbackTextColor)
          drawCenteredText('?', centerX, centerY + Math.max(2, token.diameterMm * 0.07), Math.max(14, token.diameterMm * 0.36))
        }
      }

      selectedTokens.forEach((token) => {
        const cellSize = token.diameterMm + tokenCellPadding * 2
        if (cursorX + cellSize > maxX + 0.01) {
          cursorX = margin
          cursorY += rowHeight + gap
          rowHeight = 0
        }
        if (cursorY + cellSize > maxY + 0.01) {
          doc.addPage()
          cursorX = margin
          cursorY = margin
          rowHeight = 0
        }
        drawTokenCell(token, cursorX, cursorY, cellSize)
        cursorX += cellSize + gap
        rowHeight = Math.max(rowHeight, cellSize)
      })

      doc.save(lang === 'en' ? 'zerolore_tokens_en.pdf' : 'zerolore_tokens_es.pdf')
    } finally {
      setIsGeneratingTokensPdf(false)
    }
  }

  return (
    <section className="section rules-page" id="reglamento">
      <div className="section-head reveal">
        <p className="eyebrow">{t('rules.eyebrow')}</p>
        <h2>{t('rules.title')}</h2>
        <p>
          {t('rules.intro')}
        </p>
        <div className="rules-head-actions">
          <div className="rules-mode-switch" role="tablist" aria-label={t('rules.modeLabel')}>
            {modeOptions.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`ghost ${rulesMode === mode.id ? 'active' : ''}`}
                onClick={() => setMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {isTokensMode ? (
        <div className="rules-tokens reveal">
          <div className="rules-tokens-head">
            <h3>{t('rules.tokens.title')}</h3>
            <p>{t('rules.tokens.intro')}</p>
          </div>
          <div className="rules-tokens-grid">
            {tokenOptions.map((token) => (
              <article key={token.id} className="rules-token-card">
                <h4>{token.label}</h4>
                <div className="rules-token-preview-wrap" aria-hidden="true">
                  <div
                    className={`rules-token-preview ${token.category} ${token.previewSize} ${token.imageSrc ? 'has-image' : ''} ${token.category === 'command' ? `command-${token.shape || 'circle'} command-${token.commandColor || 'orange'}` : ''}`}
                    data-token-preview={token.id}
                  >
                    {token.imageSrc && (
                      <img className="rules-token-preview-image" src={token.imageSrc} alt="" />
                    )}
                    {token.category === 'command' && (
                      <>
                        <span className="rules-token-command-logo-box">
                          <img className="rules-token-command-logo-mark" src={zeroLoreLogo} alt="" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <label className="rules-token-input">
                  <span>{t('rules.tokens.quantity')}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={String(TOKEN_LIMIT)}
                    step="1"
                    value={tokenInputValues[token.id] ?? '0'}
                    onChange={(event) => setTokenCount(token.id, event.target.value)}
                    onBlur={() => finalizeTokenInput(token.id)}
                    onFocus={(event) => event.target.select()}
                    aria-label={`${token.label} ${t('rules.tokens.quantity')}`}
                  />
                </label>
              </article>
            ))}
          </div>
          <div className="rules-tokens-footer">
            <span>
              {t('rules.tokens.selected')}: {totalTokenCount}
            </span>
            <button
              type="button"
              className="primary"
              onClick={generateTokensPdf}
              disabled={!totalTokenCount || isGeneratingTokensPdf}
              aria-busy={isGeneratingTokensPdf}
            >
              {isGeneratingTokensPdf ? (
                <span className="rules-pdf-button-content">
                  <span className="rules-pdf-spinner" aria-hidden="true" />
                  {t('rules.tokens.generatingPdf')}
                </span>
              ) : (
                t('rules.tokens.generatePdf')
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="rules-layout">
          <aside className="rules-toc reveal">
            <div className="rules-toc-header">
              <h3>{t('rules.index')}</h3>
            </div>
            <div className="rules-toc-search">
              <input
                type="text"
                placeholder={t('rules.searchPlaceholder')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className="rules-toc-meta">
                <span className="rules-search-count">
                  {searchTerm ? `${filteredToc.length} ${t('rules.results')}` : t('rules.fullIndex')}
                </span>
                {searchTerm && (
                  <button type="button" className="ghost tiny" onClick={() => setSearchTerm('')}>
                    {t('rules.clear')}
                  </button>
                )}
              </div>
            </div>
            <div className="rules-toc-divider" />
            <ul>
              {filteredToc.map((item) => (
                <li key={item.id} className={`level-${item.level} ${activeSection === item.id ? 'active' : ''}`}>
                  <button type="button" onClick={() => scrollToSection(item.id)}>
                    {item.title}
                  </button>
                </li>
              ))}
              {!filteredToc.length && <li className="rules-toc-empty">{t('rules.noMatches')}</li>}
            </ul>
          </aside>
          <div className="rules-content">
            <div className="rules-print-cover" aria-hidden="true">
              <div className="rules-print-cover-inner">
                <img className="rules-print-cover-logo" src={zeroLoreLogo} alt="" />
                <p className="rules-print-cover-brand">ZeroLore</p>
                <h1 className="rules-print-cover-title">{printCoverSectionLabel}</h1>
                <p className="rules-print-cover-subtitle">{t('rules.title')}</p>
                <p className="rules-print-cover-credit">{printCoverCreditLabel}</p>
              </div>
            </div>
            <div className="rules-html reveal" ref={contentRef}>
              {documentHeading && (
                <>
                  <div className="rules-document-head">
                    <h1 id={documentHeading.id}>{documentHeading.title}</h1>
                    <button
                      type="button"
                      className="primary rules-download-button"
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingRulesPdf}
                      aria-busy={isGeneratingRulesPdf}
                    >
                      {isGeneratingRulesPdf ? (
                        <span className="rules-pdf-button-content">
                          <span className="rules-pdf-spinner" aria-hidden="true" />
                          {t('rules.generatingPdf')}
                        </span>
                      ) : (
                        t('rules.downloadPdf')
                      )}
                    </button>
                  </div>
                  {shouldShowRulesHeader && (
                    <div className="rules-hero-banner" aria-hidden="true">
                      <img src={rulesHeaderImage} alt="" loading="eager" />
                    </div>
                  )}
                </>
              )}
              {renderRulesHtmlWithFichaSlots(renderedHtml, lang)}
            </div>
          </div>
        </div>
      )}
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={t('rules.backToTop')}
          title={t('rules.backToTop')}
        >
          ↑
        </button>
      )}
    </section>
  )
}

export default Reglamento
