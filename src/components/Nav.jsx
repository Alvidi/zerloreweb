import { Link } from 'react-router-dom'
import zeroloreLogo from '../images/zeroloreLogo.svg'
import { useI18n } from '../i18n/I18nContext.jsx'

function Nav() {
  const { lang, setLang, t } = useI18n()

  return (
    <nav className="nav">
      <Link className="logo" to="/">
        <span className="logo-box" aria-hidden="true">
          <img src={zeroloreLogo} alt="" className="logo-mark" />
        </span>
        <span>ZeroLore</span>
      </Link>
      <div className="nav-links">
        <Link to="/">{t('nav.home')}</Link>
        <Link to="/reglamento">{t('nav.rules')}</Link>
        <Link to="/generador">{t('nav.generator')}</Link>
      </div>
      <div className="lang-switch" aria-label="Language switch">
        <button type="button" className={`lang-btn ${lang === 'es' ? 'active' : ''}`} onClick={() => setLang('es')}>
          ES
        </button>
        <button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
          EN
        </button>
      </div>
    </nav>
  )
}

export default Nav
