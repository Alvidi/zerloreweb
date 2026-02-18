import { useNavigate } from 'react-router-dom'
import escaramuzaImg from '../images/imagen1.webp'
import escaramuzaImg2 from '../images/imagen2.webp'
import escaramuzaImg3 from '../images/imagen3.webp'
import { useI18n } from '../i18n/I18nContext.jsx'

function Home() {
  const navigate = useNavigate()
  const { t } = useI18n()

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

      <section className="section contact" id="contacto">
        <div className="contact-grid reveal">
          <form className="contact-form">
            <label>
              {t('home.contact.name')}
              <input type="text" placeholder={t('home.contact.namePlaceholder')} />
            </label>
            <label>
              {t('home.contact.email')}
              <input type="email" placeholder={t('home.contact.emailPlaceholder')} />
            </label>
            <label>
              {t('home.contact.role')}
              <select>
                <option>{t('home.contact.rolePlaytester')}</option>
                <option>{t('home.contact.roleConcept')}</option>
                <option>{t('home.contact.roleNarrative')}</option>
                <option>{t('home.contact.roleOther')}</option>
              </select>
            </label>
            <label>
              {t('home.contact.message')}
              <textarea rows="4" placeholder={t('home.contact.messagePlaceholder')} />
            </label>
            <button className="primary" type="submit">
              {t('home.contact.submit')}
            </button>
          </form>
          <div className="contact-panel">
            <h3>{t('home.contact.channelsTitle')}</h3>
            <p>{t('home.contact.channelsText')}</p>
            <div className="contact-list">
              <div>
                <span>{t('home.contact.discord')}</span>
                <strong>{t('home.contact.discordChannel')}</strong>
              </div>
              <div>
                <span>{t('home.contact.newsletter')}</span>
                <strong>{t('home.contact.newsletterFrequency')}</strong>
              </div>
              <div>
                <span>{t('home.contact.playtest')}</span>
                <strong>{t('home.contact.playtestMode')}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
