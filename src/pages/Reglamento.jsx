import { useMemo, useEffect, useRef, useState } from 'react'
import reglamentoHtml from '../data/reglamento.html?raw'
import reglamentoEnHtml from '../data/reglamento.en.html?raw'
import { useI18n } from '../i18n/I18nContext.jsx'

function Reglamento() {
  const { t, lang } = useI18n()
  const contentRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const rulesHtml = lang === 'en' ? reglamentoEnHtml : reglamentoHtml

  const { renderedHtml, tocItems } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { renderedHtml: rulesHtml, tocItems: [] }
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(rulesHtml, 'text/html')
    const bodyHtml = doc.body ? doc.body.innerHTML : rulesHtml
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

  return (
    <section className="section rules-page" id="reglamento">
      <div className="section-head reveal">
        <p className="eyebrow">{t('rules.eyebrow')}</p>
        <h2>{t('rules.title')}</h2>
        <p>
          {t('rules.intro')}
        </p>
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
