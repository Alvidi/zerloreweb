import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import reglamentoHtml from '../data/spanish/ZEROLORE - REGLAMENTO avanzado 2eb087d94b33800ea112ed9327b7e9c8.html?raw'
import reglamentoEnHtml from '../data/english/ZEROLORE_ADVANCED_RULEBOOK_EN.html?raw'
import reglamentoRapidoHtml from '../data/spanish/ZEROLORE-REGLAMENTO-juego-rapido-313087d94b3380dc9c0ffd50e9ba8d50.html?raw'
import reglamentoRapidoEnHtml from '../data/english/ZEROLORE_QUICK_PLAY_RULEBOOK_EN.html?raw'
import asedioHtml from '../data/spanish/Asedio 320087d94b33802b9914e615a0ad68e0.html?raw'
import asedioEnHtml from '../data/english/ZEROLORE_SIEGE_MODE_EN.html?raw'
import eliminacionHtml from '../data/spanish/Eliminacion-320087d94b338070ba22cc624381d70e.html?raw'
import eliminacionEnHtml from '../data/english/ZEROLORE_ELIMINATION_MODE_EN.html?raw'
import conquistaHtml from '../data/spanish/Conquista 320087d94b338056b052fa01c020e33d.html?raw'
import conquistaEnHtml from '../data/english/ZEROLORE_CONQUEST_MODE_EN.html?raw'
import zeroLoreLogo from '../images/zeroloreLogoToken.png'
import damage1Token from '../images/tokens/-1.webp'
import damage3Token from '../images/tokens/-3.webp'
import damage5Token from '../images/tokens/-5.webp'
import damage10Token from '../images/tokens/-10.webp'
import { useI18n } from '../i18n/I18nContext.jsx'

const RULES_MODES = ['quick', 'advanced', 'conquest', 'siege', 'elimination', 'tokens']
const TOKEN_LIMIT = 20
const ZEROLORE_LOGO_ASPECT = 624 / 388

const TOKEN_DEFINITIONS = [
  { id: 'damage_1', category: 'damage', labelKey: 'rules.tokens.types.damage1', diameterMm: 32, previewSize: 'medium', imageSrc: damage1Token },
  { id: 'damage_3', category: 'damage', labelKey: 'rules.tokens.types.damage3', diameterMm: 32, previewSize: 'medium', imageSrc: damage3Token },
  { id: 'damage_5', category: 'damage', labelKey: 'rules.tokens.types.damage5', diameterMm: 32, previewSize: 'medium', imageSrc: damage5Token },
  { id: 'damage_10', category: 'damage', labelKey: 'rules.tokens.types.damage10', diameterMm: 32, previewSize: 'medium', imageSrc: damage10Token },
  { id: 'command_circle_3', category: 'command', shape: 'circle', labelKey: 'rules.tokens.types.commandCircle3', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_square_3', category: 'command', shape: 'square', labelKey: 'rules.tokens.types.commandSquare3', diameterMm: 76.2, previewSize: 'large', imageSrc: '' },
  { id: 'command_circle_6', category: 'command', shape: 'circle', labelKey: 'rules.tokens.types.commandCircle6', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
  { id: 'command_square_6', category: 'command', shape: 'square', labelKey: 'rules.tokens.types.commandSquare6', diameterMm: 152.4, previewSize: 'xlarge', imageSrc: '' },
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
  const modeParam = searchParams.get('mode')
  const rulesMode = RULES_MODES.includes(modeParam) ? modeParam : 'quick'
  const isTokensMode = rulesMode === 'tokens'
  const tokenOptions = useMemo(
    () =>
      TOKEN_DEFINITIONS.map((token) => ({
        ...token,
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
      { id: 'quick', label: t('rules.modeQuick') },
      { id: 'advanced', label: t('rules.modeAdvanced') },
      { id: 'conquest', label: t('rules.modeConquest') },
      { id: 'siege', label: t('rules.modeSiege') },
      { id: 'elimination', label: t('rules.modeElimination') },
      { id: 'tokens', label: t('rules.modeTokens') },
    ],
    [t],
  )
  const rulesHtml = useMemo(() => {
    if (isTokensMode) {
      return ''
    }
    if (rulesMode === 'siege') {
      return lang === 'en' ? asedioEnHtml : asedioHtml
    }
    if (rulesMode === 'elimination') {
      return lang === 'en' ? eliminacionEnHtml : eliminacionHtml
    }
    if (rulesMode === 'conquest') {
      return lang === 'en' ? conquistaEnHtml : conquistaHtml
    }
    if (rulesMode === 'quick') {
      return lang === 'en' ? reglamentoRapidoEnHtml : reglamentoRapidoHtml
    }
    return lang === 'en' ? reglamentoEnHtml : reglamentoHtml
  }, [lang, rulesMode, isTokensMode])

  const { renderedHtml, tocItems } = useMemo(() => {
    if (isTokensMode) {
      return { renderedHtml: '', tocItems: [] }
    }
    if (typeof window === 'undefined') {
      return { renderedHtml: rulesHtml, tocItems: [] }
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
    const bodyHtml = doc.body ? doc.body.innerHTML : rulesHtml
    return { renderedHtml: bodyHtml, tocItems: toc }
  }, [t, rulesHtml, isTokensMode])

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
    nextParams.set('mode', nextMode)
    setSearchParams(nextParams, { replace: true })
  }

  const setTokenCount = (tokenId, value) => {
    setTokenCounts((prev) => ({
      ...prev,
      [tokenId]: clampTokenCount(value),
    }))
  }

  const loadImageAsDataUrl = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width))
        canvas.height = Math.max(1, Math.round(img.height))
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = src
    })

  const generateTokensPdf = async () => {
    const selectedTokens = tokenOptions
      .flatMap((token) => Array.from({ length: tokenCounts[token.id] || 0 }, () => token))
      .sort((a, b) => b.diameterMm - a.diameterMm)

    if (!selectedTokens.length) return

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 10
    const gap = 4
    const tokenCellPadding = 6
    const maxX = pageWidth - margin
    const maxY = pageHeight - margin
    const accentColor = [255, 143, 69]
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

      if (token.category === 'damage') {
        const damageTokenImage = tokenImageDataById[token.id]
        if (damageTokenImage) {
          doc.addImage(
            damageTokenImage,
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
      }

      doc.setFillColor(12, 13, 18)
      doc.setDrawColor(...accentColor)
      doc.setLineWidth(1.9)
      const borderGrow = 0.7
      if (token.category === 'command' && token.shape === 'square') {
        const side = token.diameterMm + borderGrow * 2
        doc.roundedRect(centerX - side / 2, centerY - side / 2, side, side, 3.8, 3.8, 'FD')
      } else {
        doc.circle(centerX, centerY, radius + borderGrow, 'FD')
      }

      if (token.category === 'command') {
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
  }

  return (
    <section className="section rules-page" id="reglamento">
      <div className="section-head reveal">
        <p className="eyebrow">{t('rules.eyebrow')}</p>
        <h2>{t('rules.title')}</h2>
        <p>
          {t('rules.intro')}
        </p>
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
                    className={`rules-token-preview ${token.category} ${token.previewSize} ${token.imageSrc ? 'has-image' : ''} ${token.category === 'command' ? `command-${token.shape || 'circle'}` : ''}`}
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
            <button type="button" className="primary" onClick={generateTokensPdf} disabled={!totalTokenCount}>
              {t('rules.tokens.generatePdf')}
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
            <div
              className="rules-html reveal"
              ref={contentRef}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
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
