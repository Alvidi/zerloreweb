import { useNavigate } from 'react-router-dom'
import escaramuzaImg from '../images/imagen1.webp'
import escaramuzaImg2 from '../images/imagen2.webp'
import escaramuzaImg3 from '../images/imagen3.webp'
import { useI18n } from '../i18n/I18nContext.jsx'

function Home() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const whatsappUrl = 'https://wa.me/'

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
              <button className="primary">{t('home.hero.start')}</button>
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
        <div className="hero-actions cta-actions reveal">
          <a
            className="primary whatsapp-button"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0 11.94 11.94 0 0 0 0 11.88c0 2.1.54 4.14 1.56 5.94L0 24l6.33-1.62a12.1 12.1 0 0 0 5.73 1.44h.06A11.94 11.94 0 0 0 24 11.94c0-3.18-1.26-6.18-3.48-8.46ZM12.12 21.78h-.06a9.87 9.87 0 0 1-5.04-1.38l-.36-.24-3.78.96 1.02-3.66-.24-.36a9.93 9.93 0 0 1-1.56-5.28A9.9 9.9 0 0 1 12.06 1.98c2.64 0 5.1 1.02 6.96 2.88a9.8 9.8 0 0 1 2.88 6.96 9.92 9.92 0 0 1-9.78 9.96Zm5.46-7.44c-.3-.18-1.74-.84-2.04-.96-.24-.12-.42-.18-.6.12s-.66.84-.84 1.02c-.18.18-.3.18-.6.06-.3-.18-1.26-.48-2.4-1.5a8.82 8.82 0 0 1-1.62-1.98c-.18-.3 0-.48.12-.6.12-.12.3-.3.42-.48s.18-.3.3-.48c.06-.18 0-.36-.06-.48-.06-.18-.6-1.5-.84-2.04-.18-.54-.42-.48-.6-.48h-.54a1.03 1.03 0 0 0-.78.36c-.3.3-1.02 1.02-1.02 2.46s1.08 2.82 1.2 3c.18.18 2.1 3.18 5.04 4.44.72.3 1.32.54 1.74.66.72.24 1.38.18 1.92.12.6-.12 1.74-.72 1.98-1.38.24-.72.24-1.32.18-1.44-.06-.12-.24-.18-.54-.36Z" />
            </svg>
            <span>{t('home.join.button')}</span>
          </a>
        </div>
      </section>
    </>
  )
}

export default Home
