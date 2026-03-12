import { useMemo, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import reglamentoHtml from '../data/spanish/ZEROLORE - REGLAMENTO avanzado 2eb087d94b33800ea112ed9327b7e9c8.html?raw'
import reglamentoEnHtml from '../data/english/ZEROLORE_ADVANCED_RULEBOOK_EN.html?raw'
import reglamentoRapidoHtml from '../data/spanish/ZEROLORE - REGLAMENTO juego rápido 313087d94b3380dc9c0ffd50e9ba8d50.html?raw'
import reglamentoRapidoEnHtml from '../data/english/ZEROLORE_QUICK_PLAY_RULEBOOK_EN.html?raw'
import asedioHtml from '../data/spanish/Asedio 320087d94b33802b9914e615a0ad68e0.html?raw'
import asedioEnHtml from '../data/english/ZEROLORE_SIEGE_MODE_EN.html?raw'
import eliminacionHtml from '../data/spanish/Eliminación 320087d94b338070ba22cc624381d70e.html?raw'
import eliminacionEnHtml from '../data/english/ZEROLORE_ELIMINATION_MODE_EN.html?raw'
import conquistaHtml from '../data/spanish/Conquista 320087d94b338056b052fa01c020e33d.html?raw'
import conquistaEnHtml from '../data/english/ZEROLORE_CONQUEST_MODE_EN.html?raw'
import { useI18n } from '../i18n/I18nContext.jsx'

const RULES_MODES = ['quick', 'advanced', 'conquest', 'siege', 'elimination']

function Reglamento() {
  const { t, lang } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const modeParam = searchParams.get('mode')
  const rulesMode = RULES_MODES.includes(modeParam) ? modeParam : 'quick'
  const modeOptions = useMemo(
    () => [
      { id: 'quick', label: t('rules.modeQuick') },
      { id: 'advanced', label: t('rules.modeAdvanced') },
      { id: 'conquest', label: t('rules.modeConquest') },
      { id: 'siege', label: t('rules.modeSiege') },
      { id: 'elimination', label: t('rules.modeElimination') },
    ],
    [t],
  )
  const rulesHtml = useMemo(() => {
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
  }, [lang, rulesMode])

  const { renderedHtml, tocItems } = useMemo(() => {
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
  }, [t, rulesHtml])

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
