import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { marked } from 'marked'
import reglamentoMd from '../data/spanish/reglamento.md?raw'
import reglamentoEnMd from '../data/english/rulebook.md?raw'
import misionesMd from '../data/spanish/misiones.md?raw'
import misionesEnMd from '../data/english/missions.md?raw'
import { doctrineCatalog, DOCTRINE_TOKEN_DIAMETER_MM } from '../data/doctrines/doctrineCatalog.js'
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
import activationOrangeToken from '../images/tokens/activacion-orange.svg'
import miniatureVsSquadImage from '../images/webimagen/reglamento-miniatura-vs-escuadra.webp'
import lineOfSightImage from '../images/webimagen/reglamento-linea-de-vision.webp'
import sprintImage from '../images/webimagen/reglamento-carrera.webp'
import readyImage from '../images/webimagen/reglamento-preparado.webp'
import { useI18n } from '../i18n/I18nContext.jsx'

const RULES_MODES = ['rules', 'missions', 'tokens']
const TOKEN_LIMIT = 20
const ZEROLORE_LOGO_ASPECT = 624 / 388

const normalizeHeadingText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const RULES_PDF_KEEP_WITH_NEXT_TAGS = new Set(['H1', 'H2', 'H3'])
const RULES_ASSET_PLACEHOLDERS = {
  lineOfSightImage,
  miniatureVsSquadImage,
  sprintImage,
  readyImage,
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

const replaceRulesAssetPlaceholders = (markdown) =>
  Object.entries(RULES_ASSET_PLACEHOLDERS).reduce(
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
  { id: 'state_activation_orange', category: 'state', shape: 'circle', labelKey: 'rules.tokens.types.stateActivatedOrange', diameterMm: 32, previewSize: 'medium', imageSrc: activationOrangeToken },
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
  ...doctrineCatalog.map((doctrine) => ({
    id: `doctrine_${doctrine.id.replaceAll('-', '_')}`,
    category: 'doctrine',
    shape: 'circle',
    diameterMm: DOCTRINE_TOKEN_DIAMETER_MM,
    previewSize: 'medium',
    imageSrc: doctrine.images.es || '',
    imageSrcEs: doctrine.images.es || '',
    imageSrcEn: doctrine.images.en || '',
    labelEs: doctrine.tokenLabel.es,
    labelEn: doctrine.tokenLabel.en,
  })),
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
        label:
          token.category === 'doctrine'
            ? (lang === 'en' ? token.labelEn : token.labelEs) || token.labelEs || token.labelEn || ''
            : t(token.labelKey),
        primaryText:
          token.category === 'doctrine'
            ? (lang === 'en' ? token.labelEn : token.labelEs) || token.labelEs || token.labelEn || ''
            : token.primaryText || t(token.labelKey),
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
    return marked(replaceRulesAssetPlaceholders(activeMarkdown))
  }, [activeMarkdown, isTokensMode])
  const printCoverSectionLabel = rulesMode === 'missions' ? t('rules.modeMissions') : t('rules.modeRules')
  const printCoverCreditLabel = lang === 'en' ? 'by alvidi' : 'por alvidi'

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
        doctrineCatalog.forEach((doctrine) => {
          const item = doc.createElement('article')
          item.className = 'rules-doctrine-gallery-item'

          const imageWrap = doc.createElement('div')
          imageWrap.className = 'rules-doctrine-gallery-mark'

          const image = doc.createElement('img')
          image.className = 'rules-doctrine-gallery-image'
          image.src = doctrine.images[lang] || doctrine.images.es || ''
          image.alt = doctrine.nombre[lang] || doctrine.nombre.es || ''
          image.loading = 'lazy'

          const label = doc.createElement('p')
          label.className = 'rules-doctrine-gallery-label'
          label.textContent = doctrine.nombre[lang] || doctrine.nombre.es || ''

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
            label: t('rules.tokens.types.commandCircle6'),
            shapeClass: 'command-circle',
          },
          {
            label: t('rules.tokens.types.commandSquare6'),
            shapeClass: 'command-square',
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

        if (tokenParagraph?.parentNode) {
          const activationGallery = doc.createElement('div')
          activationGallery.className = 'rules-activation-gallery'

          ;[
            {
              label: t('rules.tokens.types.stateActivated'),
              imageSrc: activationToken,
            },
            {
              label: t('rules.tokens.types.stateActivatedOrange'),
              imageSrc: activationOrangeToken,
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
          {
            matcher: ['token de descontrol', 'out of control token'],
            label: t('rules.tokens.types.stateOutOfControl'),
            imageSrc: outOfControlToken,
          },
          {
            matcher: ['token de espada', 'sword token'],
            label: t('rules.tokens.types.stateMelee'),
            imageSrc: meleeToken,
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
          }
          .rules-pdf-sheet .rules-html p:has(> img:only-child),
          .rules-pdf-sheet .rules-html .image {
            width: fit-content;
            max-width: 100%;
            margin: 18px auto;
            padding: 14px;
            border: 1px solid #d7d7d7;
            border-radius: 0;
            background: #ffffff;
          }
          .rules-pdf-sheet .rules-html p:has(> img:only-child) img,
          .rules-pdf-sheet .rules-html .image img {
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
        doc.addPage()
        doc.addImage(
          sheetCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          contentWidthMm,
          Math.min(sheetHeightMm, contentHeightMm),
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
        const contentNodes = Array.from(rulesHtmlRoot?.childNodes || []).filter(
          (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
        )

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
          const isSquare = token.shape === 'square'
          const outerSize = token.diameterMm + borderGrow * 2

          doc.setFillColor(10, 12, 18)
          doc.setDrawColor(...commandPalette.accent)
          doc.setLineWidth(Math.max(1.6, token.diameterMm * 0.04))

          if (isSquare) {
            const outerRadius = Math.max(3.4, token.diameterMm * 0.08)
            doc.roundedRect(centerX - outerSize / 2, centerY - outerSize / 2, outerSize, outerSize, outerRadius, outerRadius, 'FD')
            if (commandPalette.showInteriorDetails) {
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
            }
          } else {
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
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
