import { useMemo, useEffect, useRef, useState } from 'react'
import reglamentoHtml from '../data/reglamento.html?raw'

function Reglamento() {
  const contentRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('')

  const { renderedHtml, tocItems } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { renderedHtml: reglamentoHtml, tocItems: [] }
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(reglamentoHtml, 'text/html')
    const bodyHtml = doc.body ? doc.body.innerHTML : reglamentoHtml
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
    const toc = headings
      .map((heading, index) => {
        const level = Number(heading.tagName.replace('H', ''))
        const title = heading.textContent?.trim() || `Seccion ${index + 1}`
        let id = heading.getAttribute('id')
        if (!id) {
          id = `section-${index + 1}`
          heading.setAttribute('id', id)
        }
        return { id, title, level }
      })
      .filter((item) => item.title)
    return { renderedHtml: bodyHtml, tocItems: toc }
  }, [])

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
        <p className="eyebrow">Reglamento</p>
        <h2>Un sistema rapido, brutal y cinematografico.</h2>
        <p>
          ZeroLore utiliza un sistema de activaciones alternas y combate simultaneo para mantener la tension en cada segundo.
        </p>
      </div>
      <div className="rules-topbar reveal">
        <a className="primary rules-download" href="/reglamento.pdf" download>
          Descargar PDF
        </a>
      </div>
      <div className="rules-layout">
        <aside className="rules-toc reveal">
          <div className="rules-toc-header">
            <h3>Indice</h3>
          </div>
          <div className="rules-toc-search">
            <input
              type="text"
              placeholder="Buscar en el reglamento..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="rules-toc-meta">
              <span className="rules-search-count">
                {searchTerm ? `${filteredToc.length} resultados` : 'Indice completo'}
              </span>
              {searchTerm && (
                <button type="button" className="ghost tiny" onClick={() => setSearchTerm('')}>
                  Limpiar
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
            {!filteredToc.length && <li className="rules-toc-empty">Sin coincidencias</li>}
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
    </section>
  )
}

export default Reglamento
