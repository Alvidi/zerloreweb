import { useNavigate } from 'react-router-dom'
import escaramuzaImg from '../images/webimagen/imagen1.webp'
import escaramuzaImg2 from '../images/webimagen/imagen2.webp'
import escaramuzaImg3 from '../images/webimagen/image3.webp'
import { useI18n } from '../i18n/I18nContext.jsx'

function Home() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const discordUrl = 'https://discord.gg/6ZMGUUTRQT'

  return (
    <>
      <header className="hero" id="landing">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow reveal">{t('home.hero.eyebrow')}</p>
            <h1 className="reveal">ZEROLORE</h1>
            <p className="lead reveal">
              {t('home.hero.lead1')}
              <br />
              {t('home.hero.lead2')}
              <br />
              {t('home.hero.lead3')}
            </p>
            <div className="hero-actions reveal">
              <button className="primary" onClick={() => navigate('/reglamento?mode=quick')}>
                {t('home.hero.start')}
              </button>
              <button className="ghost" onClick={() => navigate('/reglamento')}>
                {t('home.hero.rules')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="escalas">
        <div className="section-head reveal">
          <p className="eyebrow">{t('home.scales.eyebrow')}</p>
          <h2>{t('home.scales.title')}</h2>
        </div>
        <div className="grid-three reveal">
          <article className="card card-scale-feature">
            <div className="card-scale-media" style={{ backgroundImage: `url(${escaramuzaImg})` }} />
            <div className="card-scale-content">
              <h3>{t('home.cards.easyTitle')}</h3>
              <p>
                {t('home.cards.easyText1')}
                <br />
                <br />
                {t('home.cards.easyText2')}
                <br />
                {t('home.cards.easyText3')}
                <br />
                {t('home.cards.easyText4')}
                <br />
                <br />
                {t('home.cards.easyText5')}
                <br />
                {t('home.cards.easyText6')}
              </p>
            </div>
          </article>
          <article className="card card-scale-feature card-scale-feature--reverse">
            <div className="card-scale-media" style={{ backgroundImage: `url(${escaramuzaImg2})` }} />
            <div className="card-scale-content">
              <h3>{t('home.cards.battleTitle')}</h3>
              <p>
                {t('home.cards.battleText1')} <strong>{t('home.cards.battleMode1')}</strong>
                <br />
                <br />
                {t('home.cards.battleText2')} <strong>{t('home.cards.battleMode2')}</strong>
                <br />
                <br />
                {t('home.cards.battleText3')}
              </p>
            </div>
          </article>
          <article className="card card-scale-feature">
            <div
              className="card-scale-media"
              style={{ backgroundImage: `url(${escaramuzaImg3})`, backgroundPosition: '58% -140px', backgroundSize: '118%' }}
            />
            <div className="card-scale-content">
              <h3>{t('home.cards.storiesTitle')}</h3>
              <p>
                {t('home.cards.storiesText1')}
                <br />
                <br />
                {t('home.cards.storiesText2')}
                <br />
                <br />
                {t('home.cards.storiesText3')}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="section cta" id="contacto">
        <div className="section-head reveal">
          <p className="eyebrow">{t('home.join.eyebrow')}</p>
          <h2>{t('home.join.title')}</h2>
          <p>{t('home.join.subtitle')}</p>
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
                <span>{t('home.join.button')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
