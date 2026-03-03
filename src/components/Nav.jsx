import { Link } from 'react-router-dom'
import zeroloreLogo from '../images/zeroloreLogo.svg'
import { useI18n } from '../i18n/I18nContext.jsx'

function Nav() {
  const { lang, setLang, t } = useI18n()
  const whatsappUrl = 'https://chat.whatsapp.com/KQRhYqhV5yoF0EuhdAf4sh'

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
        <Link to="/batalla">{lang === 'en' ? 'Battle' : 'Batalla'}</Link>
        <a
          className="nav-whatsapp-link"
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t('nav.whatsapp')}
          title={t('nav.whatsapp')}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0 11.94 11.94 0 0 0 0 11.88c0 2.1.54 4.14 1.56 5.94L0 24l6.33-1.62a12.1 12.1 0 0 0 5.73 1.44h.06A11.94 11.94 0 0 0 24 11.94c0-3.18-1.26-6.18-3.48-8.46ZM12.12 21.78h-.06a9.87 9.87 0 0 1-5.04-1.38l-.36-.24-3.78.96 1.02-3.66-.24-.36a9.93 9.93 0 0 1-1.56-5.28A9.9 9.9 0 0 1 12.06 1.98c2.64 0 5.1 1.02 6.96 2.88a9.8 9.8 0 0 1 2.88 6.96 9.92 9.92 0 0 1-9.78 9.96Zm5.46-7.44c-.3-.18-1.74-.84-2.04-.96-.24-.12-.42-.18-.6.12s-.66.84-.84 1.02c-.18.18-.3.18-.6.06-.3-.18-1.26-.48-2.4-1.5a8.82 8.82 0 0 1-1.62-1.98c-.18-.3 0-.48.12-.6.12-.12.3-.3.42-.48s.18-.3.3-.48c.06-.18 0-.36-.06-.48-.06-.18-.6-1.5-.84-2.04-.18-.54-.42-.48-.6-.48h-.54a1.03 1.03 0 0 0-.78.36c-.3.3-1.02 1.02-1.02 2.46s1.08 2.82 1.2 3c.18.18 2.1 3.18 5.04 4.44.72.3 1.32.54 1.74.66.72.24 1.38.18 1.92.12.6-.12 1.74-.72 1.98-1.38.24-.72.24-1.32.18-1.44-.06-.12-.24-.18-.54-.36Z" />
          </svg>
        </a>
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
