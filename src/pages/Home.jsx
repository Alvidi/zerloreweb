import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import homeEsMd from '../data/spanish/home.md?raw'
import homeEnMd from '../data/english/home.md?raw'
import { parseHomeContent } from '../utils/homeContent.js'

function Home() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  const discordUrl = 'https://discord.gg/6ZMGUUTRQT'
  const pillars = [
    'agnostic',
    'free',
    'fast',
    'universe',
    'scale',
    'factions',
  ]
  const content = useMemo(() => parseHomeContent(lang === 'en' ? homeEnMd : homeEsMd), [lang])

  return (
    <>
      <header className="hero" id="landing">
        <div className="hero-grid">
          <div className="hero-copy hero-copy-home">
            <p className="eyebrow reveal">{content.hero.eyebrow}</p>
            <h1 className="reveal">{content.hero.title}</h1>
            <p className="lead reveal">
              {content.hero.subtitle}
            </p>
            <div className="hero-actions reveal">
              <button className="primary" onClick={() => navigate('/reglamento')}>
                {content.hero.primary_cta}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="section home-pillars" id="pilares">
        <div className="home-pillars-grid reveal">
          {pillars.map((pillarKey, index) => (
            <article key={pillarKey} className="card home-pillar-card">
              <span className="home-pillar-index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{content.pillars[pillarKey]?.title || ''}</h3>
              <p>{content.pillars[pillarKey]?.body || ''}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-toolkit" id="explorar">
        <div className="home-toolkit-panel reveal">
          <div className="home-toolkit-copy">
            <p className="eyebrow">{content.toolkit.eyebrow}</p>
            <h2>{content.toolkit.title}</h2>
            <p>{content.toolkit.body}</p>
          </div>
          <div className="hero-actions cta-actions">
            <button className="primary" onClick={() => navigate('/generador')}>
              {content.toolkit.cta}
            </button>
          </div>
        </div>
      </section>

      <section className="section cta" id="contacto">
        <div className="section-head reveal">
          <p className="eyebrow">{content.join.eyebrow}</p>
          <h2>{content.join.title}</h2>
          <p>{content.join.subtitle}</p>
        </div>
        <div className="cta-grid reveal">
          <div className="cta-side">
            <div className="hero-actions cta-actions">
              <a
                className="primary discord-button"
                href={discordUrl}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M20.317 4.369A19.791 19.791 0 0 0 15.396 2.8a.074.074 0 0 0-.078.037 13.877 13.877 0 0 0-.621 1.261 18.27 18.27 0 0 0-5.392 0 12.64 12.64 0 0 0-.63-1.26.077.077 0 0 0-.078-.038c-1.77.31-3.43.838-4.92 1.57a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.055 19.9 19.9 0 0 0 6.03 3.05.077.077 0 0 0 .084-.028 14.264 14.264 0 0 0 1.235-2.013.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.06 0a.073.073 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107 16.23 16.23 0 0 0 1.234 2.01.076.076 0 0 0 .084.03 19.876 19.876 0 0 0 6.03-3.05.077.077 0 0 0 .031-.054c.5-5.177-.838-9.67-3.548-13.66a.06.06 0 0 0-.031-.03ZM8.02 15.332c-1.182 0-2.155-1.085-2.155-2.418 0-1.334.955-2.419 2.155-2.419 1.21 0 2.173 1.095 2.155 2.419 0 1.333-.955 2.418-2.155 2.418Zm7.974 0c-1.182 0-2.155-1.085-2.155-2.418 0-1.334.955-2.419 2.155-2.419 1.21 0 2.173 1.095 2.155 2.419 0 1.333-.946 2.418-2.155 2.418Z" />
                </svg>
                <span>{content.join.button}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
