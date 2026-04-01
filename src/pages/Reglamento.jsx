import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import reglamentoMd from '../data/spanish/reglamento.md?raw'
import reglamentoEnMd from '../data/english/rulebook.md?raw'
import misionesMd from '../data/spanish/misiones.md?raw'
import misionesEnMd from '../data/english/missions.md?raw'
import zeroLoreLogo from '../images/zeroloreLogoToken.png'
import damage1Token from '../images/tokens/damage-1-red.svg'
import damage3Token from '../images/tokens/damage-3-red.svg'
import damage5Token from '../images/tokens/damage-5-red.svg'
import damage10Token from '../images/tokens/damage-10-red.svg'
import explosiveArea3Token from '../images/tokens/explosive-area-3in.svg'
import stateReadyToken from '../images/tokens/preparado-blue.svg'
import stateRetreatToken from '../images/tokens/retirada-blue.svg'
import meleeToken from '../images/tokens/cuerpo-a-cuerpo-orange.svg'
import objectiveToken from '../images/tokens/objetivo-orange.svg'
import conquestBlueToken from '../images/tokens/conquista-blue.svg'
import conquestRedToken from '../images/tokens/conquista-red.svg'
import outOfControlToken from '../images/tokens/descontrolado-jaws-orange.svg'
import activationToken from '../images/tokens/activacion-gray.svg'
import { useI18n } from '../i18n/I18nContext.jsx'

const RULES_MODES = ['rules', 'missions', 'tokens']
const TOKEN_LIMIT = 20
const ZEROLORE_LOGO_ASPECT = 624 / 388
const DOCTRINE_TOKEN_DIAMETER_MM = 32

const DOCTRINE_ICON_PATHS = {
  garrotazo: ['M5 19L19 5', 'M7 7L10 10', 'M14 14L17 17'],
  apuntado: ['M12 3V6', 'M12 18V21', 'M3 12H6', 'M18 12H21'],
  frenesi: ['M4 12H20', 'M14 6L20 12L14 18'],
  'agilidad-en-combate': ['M5 16L10 11L13 14L19 8', 'M16 8H19V11'],
  'nuestra-es-la-victoria': ['M12 4L14 9L20 9L15 13L17 19L12 15L7 19L9 13L4 9L10 9Z'],
  'reaccion-inmediata': ['M5 12H13', 'M10 8L14 12L10 16', 'M11 6H19', 'M16 2L20 6L16 10'],
  'mas-que-cargado': ['M6 12L10 16L18 8', 'M6 7L10 11L18 3'],
  'una-nueva-oportunidad': ['M17 7V3L21 7L17 11V7H9A4 4 0 0 0 9 15H11', 'M7 17V21L3 17L7 13V17H15A4 4 0 0 0 15 9H13'],
  'combate-a-muerte': ['M7 6L17 18', 'M17 6L7 18', 'M9 4L7 6L5 4', 'M15 20L17 18L19 20'],
}

const DOCTRINE_ICON_LABELS = {
  garrotazo: { es: 'GARROTAZO', en: 'BLUDGEON' },
  apuntado: { es: 'APUNTADO', en: 'AIMED SHOT' },
  frenesi: { es: 'FRENESI', en: 'FRENZY' },
  'agilidad-en-combate': { es: 'AGILIDAD COMBATE', en: 'COMBAT AGILITY' },
  'nuestra-es-la-victoria': { es: 'NUESTRA VICTORIA', en: 'VICTORY IS OURS' },
  'reaccion-inmediata': { es: 'REACCION INMEDIATA', en: 'IMMEDIATE REACTION' },
  'mas-que-cargado': { es: 'MAS QUE CARGADO', en: 'FULLY CHARGED' },
  'una-nueva-oportunidad': { es: 'NUEVA OPORTUNIDAD', en: 'ONE MORE CHANCE' },
  'combate-a-muerte': { es: 'COMBATE A MUERTE', en: 'FIGHT TO THE DEATH' },
}

const DOCTRINE_ICON_TRANSFORMS = {
  default: { tx: 4.95, ty: 5.35, scale: 0.58 },
  'reaccion-inmediata': { tx: 4.75, ty: 6.45, scale: 0.56 },
  'mas-que-cargado': { tx: 4.9, ty: 6.3, scale: 0.56 },
}

const buildDoctrineTokenImage = (id, locale = 'es') => {
  const paths = DOCTRINE_ICON_PATHS[id]
  if (!paths) return ''
  const iconTransform = DOCTRINE_ICON_TRANSFORMS[id] || DOCTRINE_ICON_TRANSFORMS.default
  const labelSet = DOCTRINE_ICON_LABELS[id] || {}
  const label = labelSet[locale] || labelSet.es || ''
  const labelFontSize = label.length > 16 ? 1.52 : label.length > 13 ? 1.72 : 1.92
  const labelLetterSpacing = label.length > 16 ? 0.03 : label.length > 13 ? 0.07 : 0.11
  const pathMarkup = paths
    .map((d) => `<path d="${d}" fill="none" stroke="#f4f4f4" stroke-width="0.62" stroke-linecap="round" stroke-linejoin="round" />`)
    .join('')
  const extraMarkup = id === 'apuntado'
    ? '<circle cx="12" cy="12" r="7" fill="none" stroke="#f4f4f4" stroke-width="0.62" /><circle cx="12" cy="12" r="1.05" fill="#f4f4f4" />'
    : ''
  const labelMarkup = label
    ? `<text fill="#ffe7cc" font-size="${labelFontSize}" font-family="Arial, sans-serif" font-weight="500" letter-spacing="${labelLetterSpacing}"><textPath href="#arc" startOffset="50%" text-anchor="middle">${label}</textPath></text>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 24 24"><defs><radialGradient id="bgGlow" cx="50%" cy="50%" r="56%"><stop offset="0%" stop-color="#3b1f12"/><stop offset="58%" stop-color="#24140d"/><stop offset="100%" stop-color="#140d0a"/></radialGradient><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffd6a4"/><stop offset="52%" stop-color="#ff9b52"/><stop offset="100%" stop-color="#d15c26"/></linearGradient><radialGradient id="coreGrad" cx="50%" cy="45%" r="62%"><stop offset="0%" stop-color="#ffe5c7"/><stop offset="44%" stop-color="#ffb46a"/><stop offset="100%" stop-color="#cc5b2d"/></radialGradient><path id="arc" d="M4.35 12.45A7.65 7.65 0 0 1 19.65 12.45" /></defs><circle cx="12" cy="12" r="11" fill="url(#bgGlow)" /><circle cx="12" cy="12" r="10.4" fill="none" stroke="#ffe9cc" stroke-opacity="0.2" stroke-width="0.14" /><circle cx="12" cy="12" r="9.45" fill="none" stroke="url(#ringGrad)" stroke-width="0.66" /><circle cx="12" cy="12" r="8.8" fill="none" stroke="#ffd4a8" stroke-opacity="0.34" stroke-width="0.16" /><circle cx="12" cy="12" r="7.25" fill="none" stroke="#ffd4a8" stroke-opacity="0.24" stroke-width="0.11" stroke-dasharray="0.22 0.34" /><circle cx="12" cy="12" r="5.75" fill="url(#coreGrad)" fill-opacity="0.24" /><circle cx="12" cy="12" r="4.2" fill="#ffe9cc" fill-opacity="0.08" />${labelMarkup}<g transform="translate(${iconTransform.tx} ${iconTransform.ty}) scale(${iconTransform.scale})">${extraMarkup}${pathMarkup}</g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const DOCTRINE_TOKENS = [
  { id: 'garrotazo', labelKey: 'rules.tokens.types.doctrineGarrotazo' },
  { id: 'apuntado', labelKey: 'rules.tokens.types.doctrineApuntado' },
  { id: 'frenesi', labelKey: 'rules.tokens.types.doctrineFrenesi' },
  { id: 'agilidad-en-combate', labelKey: 'rules.tokens.types.doctrineAgilidadEnCombate' },
  { id: 'nuestra-es-la-victoria', labelKey: 'rules.tokens.types.doctrineNuestraEsLaVictoria' },
  { id: 'reaccion-inmediata', labelKey: 'rules.tokens.types.doctrineReaccionInmediata' },
  { id: 'mas-que-cargado', labelKey: 'rules.tokens.types.doctrineMasQueCargado' },
  { id: 'una-nueva-oportunidad', labelKey: 'rules.tokens.types.doctrineUnaNuevaOportunidad' },
  { id: 'combate-a-muerte', labelKey: 'rules.tokens.types.doctrineCombateAMuerte' },
]

const DOCTRINE_GALLERY_LABELS = {
  garrotazo: { es: 'Garrotazo', en: 'Clubbing Blow' },
  apuntado: { es: 'Apuntado', en: 'Aimed Shot' },
  frenesi: { es: 'Frenesí', en: 'Frenzy' },
  'agilidad-en-combate': { es: 'Agilidad en combate', en: 'Combat Agility' },
  'nuestra-es-la-victoria': { es: 'Nuestra es la victoria', en: 'Ours is the Victory' },
  'reaccion-inmediata': { es: 'Reacción inmediata', en: 'Immediate Reaction' },
  'mas-que-cargado': { es: 'Más que cargado', en: 'Overcharged' },
  'una-nueva-oportunidad': { es: 'Una nueva oportunidad', en: 'Second Chance' },
  'combate-a-muerte': { es: 'Combate a muerte', en: 'Fight to the Death' },
}

const normalizeHeadingText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const TOKEN_DEFINITIONS = [
  { id: 'damage_1', category: 'damage', labelKey: 'rules.tokens.types.damage1', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage1Token },
  { id: 'damage_3', category: 'damage', labelKey: 'rules.tokens.types.damage3', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage3Token },
  { id: 'damage_5', category: 'damage', labelKey: 'rules.tokens.types.damage5', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage5Token },
  { id: 'damage_10', category: 'damage', labelKey: 'rules.tokens.types.damage10', diameterMm: 21.25, previewSize: 'medium', imageSrc: damage10Token },
  { id: 'state_ready', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateReady', diameterMm: 32, previewSize: 'medium', imageSrc: stateReadyToken },
  { id: 'state_activation', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateActivated', diameterMm: 32, previewSize: 'medium', imageSrc: activationToken },
  { id: 'state_retreat', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateRetreat', diameterMm: 32, previewSize: 'medium', imageSrc: stateRetreatToken },
  { id: 'state_out_of_control', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateOutOfControl', diameterMm: 32, previewSize: 'medium', imageSrc: outOfControlToken },
  { id: 'state_melee', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateMelee', diameterMm: 32, previewSize: 'medium', imageSrc: meleeToken },
  { id: 'state_objective', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateObjective', diameterMm: 32, previewSize: 'medium', imageSrc: objectiveToken },
  { id: 'state_conquest_blue', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestBlue', diameterMm: 32, previewSize: 'medium', imageSrc: conquestBlueToken },
  { id: 'state_conquest_red', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateConquestRed', diameterMm: 32, previewSize: 'medium', imageSrc: conquestRedToken },
  { id: 'explosive_area_3', category: 'template', shape: 'circle', labelKey: 'rules.tokens.types.explosiveArea3', diameterMm: 76.2, previewSize: 'large', imageSrc: explosiveArea3Token },
  { id: 'command_circle_6', category: 'command', shape: 'circle', commandColor: 'orange', labelKey: 'rules.tokens.types.commandCircle6', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_square_6', category: 'command', shape: 'square', commandColor: 'orange', labelKey: 'rules.tokens.types.commandSquare6', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_6_blue', category: 'command', shape: 'circle', commandColor: 'blue', labelKey: 'rules.tokens.types.commandCircle6Blue', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_square_6_blue', category: 'command', shape: 'square', commandColor: 'blue', labelKey: 'rules.tokens.types.commandSquare6Blue', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_circle_6_red', category: 'command', shape: 'circle', commandColor: 'red', labelKey: 'rules.tokens.types.commandCircle6Red', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_square_6_red', category: 'command', shape: 'square', commandColor: 'red', labelKey: 'rules.tokens.types.commandSquare6Red', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  ...DOCTRINE_TOKENS.map((token) => ({
    id: `doctrine_${token.id.replaceAll('-', '_')}`,
    category: 'doctrine',
    shape: 'circle',
    labelKey: token.labelKey,
    diameterMm: DOCTRINE_TOKEN_DIAMETER_MM,
    previewSize: 'medium',
    imageSrc: buildDoctrineTokenImage(token.id, 'es'),
    imageSrcEs: buildDoctrineTokenImage(token.id, 'es'),
    imageSrcEn: buildDoctrineTokenImage(token.id, 'en'),
  })),
]

const buildInitialTokenCounts = () => Object.fromEntries(TOKEN_DEFINITIONS.map((token) => [token.id, 0]))
const clampTokenCount = (value) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(TOKEN_LIMIT, parsed))
}

function Reglamento() {
  const { t, lang } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [tokenCounts, setTokenCounts] = useState(buildInitialTokenCounts)
  const [isGeneratingTokensPdf, setIsGeneratingTokensPdf] = useState(false)
  const [isGeneratingRulesPdf, setIsGeneratingRulesPdf] = useState(false)
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
        imageSrc:
          token.category === 'doctrine'
            ? (lang === 'en' ? token.imageSrcEn : token.imageSrcEs) || token.imageSrc
            : token.imageSrc,
        label: t(token.labelKey),
        primaryText: token.primaryText || t(token.labelKey),
        secondaryText: token.secondaryKey ? t(token.secondaryKey) : '',
      })),
    [t, lang],
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
    return marked(activeMarkdown)
  }, [activeMarkdown, isTokensMode])
  const printCoverSectionLabel = rulesMode === 'missions' ? t('rules.modeMissions') : t('rules.modeRules')

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
      const doctrineHeadings = Array.from(doc.querySelectorAll('h1, h2, h3')).filter((heading) => {
        const normalized = normalizeHeadingText(heading.textContent)
        return normalized === 'doctrinas de mando' || normalized === 'command doctrines'
      })
      const doctrineHeading = doctrineHeadings.at(-1)
      if (doctrineHeading) {
        const gallery = doc.createElement('div')
        gallery.className = 'rules-doctrine-gallery'
        DOCTRINE_TOKENS.forEach((token) => {
          const item = doc.createElement('article')
          item.className = 'rules-doctrine-gallery-item'

          const imageWrap = doc.createElement('div')
          imageWrap.className = 'rules-doctrine-gallery-mark'

          const image = doc.createElement('img')
          image.className = 'rules-doctrine-gallery-image'
          image.src = buildDoctrineTokenImage(token.id, lang === 'en' ? 'en' : 'es')
          image.alt = DOCTRINE_GALLERY_LABELS[token.id]?.[lang] || DOCTRINE_GALLERY_LABELS[token.id]?.es || ''
          image.loading = 'lazy'

          const label = doc.createElement('p')
          label.className = 'rules-doctrine-gallery-label'
          label.textContent = DOCTRINE_GALLERY_LABELS[token.id]?.[lang] || DOCTRINE_GALLERY_LABELS[token.id]?.es || ''

          imageWrap.appendChild(image)
          item.appendChild(imageWrap)
          item.appendChild(label)
          gallery.appendChild(item)
        })

        let insertionTarget = doctrineHeading.nextElementSibling
        while (insertionTarget && insertionTarget.tagName !== 'H3') {
          insertionTarget = insertionTarget.nextElementSibling
        }
        if (insertionTarget) {
          insertionTarget.parentNode?.insertBefore(gallery, insertionTarget)
        } else {
          doctrineHeading.parentNode?.insertBefore(gallery, doctrineHeading.nextSibling)
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
    const documentHeading = firstHeading
      ? {
        id: firstHeading.getAttribute('id') || '',
        title: firstHeading.textContent?.trim() || '',
      }
      : null
    if (firstHeading) {
      firstHeading.remove()
    }
    const bodyHtml = doc.body ? doc.body.innerHTML : rulesHtml
    return { renderedHtml: bodyHtml, tocItems: toc, documentHeading }
  }, [t, rulesHtml, isTokensMode, rulesMode, lang])

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
    const q = searchTerm.trim().toLowerCase()
    return tocItems.filter((item) => item.title.toLowerCase().includes(q))
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
    setTokenCounts((prev) => ({
      ...prev,
      [tokenId]: clampTokenCount(value),
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
          .rules-pdf-sheet .rules-html h1 {
            margin: 36px 0 14px;
            padding-bottom: 8px;
            border-bottom: 1px solid #cfcfcf;
            font-family: "Cinzel", Georgia, serif;
            font-size: 31px;
            line-height: 1.18;
          }
          .rules-pdf-sheet .rules-html h2 {
            margin: 28px 0 12px;
            font-family: "Cinzel", Georgia, serif;
            font-size: 23px;
            line-height: 1.22;
          }
          .rules-pdf-sheet .rules-html h3 {
            margin: 22px 0 10px;
            font-size: 18px;
            line-height: 1.24;
          }
          .rules-pdf-sheet .rules-html p,
          .rules-pdf-sheet .rules-html li {
            font-size: 15px;
            line-height: 1.62;
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
          .rules-pdf-sheet .rules-html .rules-doctrine-gallery {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin: 18px 0;
            padding: 14px;
            border: 1px solid #d7d7d7;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html .rules-doctrine-gallery-item {
            display: grid;
            justify-items: center;
            gap: 8px;
            text-align: center;
          }
          .rules-pdf-sheet .rules-html .rules-doctrine-gallery-mark {
            width: 70px;
          }
          .rules-pdf-sheet .rules-html .rules-doctrine-gallery-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .rules-pdf-sheet .rules-html .rules-doctrine-gallery-label {
            margin: 0;
            font-size: 11px;
            line-height: 1.25;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .rules-pdf-cover {
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
        </style>
        <div class="rules-pdf-cover">
          ${blackLogoDataUrl ? `<img class="rules-pdf-cover-mark" src="${blackLogoDataUrl}" alt="" />` : ''}
          <p class="rules-pdf-cover-brand">ZEROLORE</p>
          <p class="rules-pdf-cover-section">${printCoverSectionLabel}</p>
        </div>
        <div class="rules-pdf-sheet">
          <div class="rules-html">${renderedHtml}</div>
        </div>
      `

      document.body.appendChild(captureRoot)

      if (document.fonts?.ready) {
        await document.fonts.ready
      }
      await waitForImages(captureRoot)

      const coverTarget = captureRoot.querySelector('.rules-pdf-cover')
      const coverCanvas = await html2canvas(coverTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
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
      const canvas = await html2canvas(captureTarget, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowWidth: captureTarget.scrollWidth,
      })

      const pxPerMm = canvas.width / contentWidthMm
      const sliceHeightPx = Math.max(1, Math.floor(contentHeightMm * pxPerMm))
      let offsetY = 0

      while (offsetY < canvas.height) {
        doc.addPage()
        const currentSliceHeightPx = Math.min(sliceHeightPx, canvas.height - offsetY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = currentSliceHeightPx
        const sliceCtx = sliceCanvas.getContext('2d')
        sliceCtx.fillStyle = '#ffffff'
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        sliceCtx.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          currentSliceHeightPx,
          0,
          0,
          canvas.width,
          currentSliceHeightPx,
        )
        const sliceHeightMm = currentSliceHeightPx / pxPerMm
        doc.addImage(
          sliceCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          contentWidthMm,
          sliceHeightMm,
          undefined,
          'FAST',
        )
        offsetY += currentSliceHeightPx
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
            const renderOptions = token.category === 'doctrine' ? { rasterSizePx: 1400 } : undefined
            return [token.id, await loadImageAsDataUrl(token.imageSrc, renderOptions).catch(() => null)]
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
          }
        }
        if (commandColor === 'red') {
          return {
            accent: [219, 78, 78],
            outerGlow: [255, 204, 204],
            dashed: [255, 182, 182],
            centerFill: [44, 18, 18],
          }
        }
        return {
          accent: [255, 143, 69],
          outerGlow: [255, 205, 160],
          dashed: [255, 203, 156],
          centerFill: [22, 27, 38],
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
          const isSquare = token.shape === 'square'
          const outerSize = token.diameterMm + borderGrow * 2

          doc.setFillColor(10, 12, 18)
          doc.setDrawColor(...commandPalette.accent)
          doc.setLineWidth(Math.max(1.6, token.diameterMm * 0.04))

          if (isSquare) {
            const outerRadius = Math.max(3.4, token.diameterMm * 0.08)
            doc.roundedRect(centerX - outerSize / 2, centerY - outerSize / 2, outerSize, outerSize, outerRadius, outerRadius, 'FD')
            const innerSize = token.diameterMm * 0.86
            const innerRadius = Math.max(2.8, token.diameterMm * 0.065)
            doc.setDrawColor(...commandPalette.outerGlow)
            doc.setLineWidth(Math.max(0.7, token.diameterMm * 0.012))
            doc.roundedRect(centerX - innerSize / 2, centerY - innerSize / 2, innerSize, innerSize, innerRadius, innerRadius, 'S')
            const dashSize = token.diameterMm * 0.66
            const dashRadius = Math.max(2.2, token.diameterMm * 0.05)
            doc.setDrawColor(...commandPalette.dashed)
            doc.setLineWidth(Math.max(0.48, token.diameterMm * 0.009))
            doc.setLineDashPattern([1.1, 1.6], 0)
            doc.roundedRect(centerX - dashSize / 2, centerY - dashSize / 2, dashSize, dashSize, dashRadius, dashRadius, 'S')
            doc.setLineDashPattern([], 0)
            doc.setFillColor(...commandPalette.centerFill)
            doc.roundedRect(centerX - token.diameterMm * 0.26, centerY - token.diameterMm * 0.17, token.diameterMm * 0.52, token.diameterMm * 0.34, Math.max(1.6, token.diameterMm * 0.03), Math.max(1.6, token.diameterMm * 0.03), 'F')
          } else {
            doc.circle(centerX, centerY, radius + borderGrow, 'FD')
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
                    min={0}
                    max={TOKEN_LIMIT}
                    value={tokenCounts[token.id] || 0}
                    onChange={(event) => setTokenCount(token.id, event.target.value)}
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
              </div>
            </div>
            <div className="rules-html reveal" ref={contentRef}>
              {documentHeading && (
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
              )}
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
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
