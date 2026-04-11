import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import zeroloreLogo from '../images/zeroloreLogo.svg'
import { useI18n } from '../i18n/I18nContext.jsx'

function Nav() {
  const { lang, setLang, t } = useI18n()
  const location = useLocation()
  const [mobileMenuPath, setMobileMenuPath] = useState(null)
  const discordUrl = 'https://discord.gg/6ZMGUUTRQT'
  const youtubeUrl = 'https://www.youtube.com/@zeroloretmg'
  const instagramUrl = 'https://www.instagram.com/zeroloretmg?igsh=MTNreGZkbmlkYzlldg%3D%3D&utm_source=qr'
  const socialLinks = [
    {
      key: 'discord',
      url: discordUrl,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.317 4.369A19.791 19.791 0 0 0 15.396 2.8a.074.074 0 0 0-.078.037 13.877 13.877 0 0 0-.621 1.261 18.27 18.27 0 0 0-5.392 0 12.64 12.64 0 0 0-.63-1.26.077.077 0 0 0-.078-.038c-1.77.31-3.43.838-4.92 1.57a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.055 19.9 19.9 0 0 0 6.03 3.05.077.077 0 0 0 .084-.028 14.264 14.264 0 0 0 1.235-2.013.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.06 0a.073.073 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107 16.23 16.23 0 0 0 1.234 2.01.076.076 0 0 0 .084.03 19.876 19.876 0 0 0 6.03-3.05.077.077 0 0 0 .031-.054c.5-5.177-.838-9.67-3.548-13.66a.06.06 0 0 0-.031-.03ZM8.02 15.332c-1.182 0-2.155-1.085-2.155-2.418 0-1.334.955-2.419 2.155-2.419 1.21 0 2.173 1.095 2.155 2.419 0 1.333-.955 2.418-2.155 2.418Zm7.974 0c-1.182 0-2.155-1.085-2.155-2.418 0-1.334.955-2.419 2.155-2.419 1.21 0 2.173 1.095 2.155 2.419 0 1.333-.946 2.418-2.155 2.418Z" />
        </svg>
      ),
    },
    {
      key: 'youtube',
      url: youtubeUrl,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M23.498 6.186a2.96 2.96 0 0 0-2.084-2.096C19.521 3.5 12 3.5 12 3.5s-7.521 0-9.414.59A2.96 2.96 0 0 0 .502 6.186C0 8.094 0 12 0 12s0 3.906.502 5.814a2.96 2.96 0 0 0 2.084 2.096C4.479 20.5 12 20.5 12 20.5s7.521 0 9.414-.59a2.96 2.96 0 0 0 2.084-2.096C24 15.906 24 12 24 12s0-3.906-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
        </svg>
      ),
    },
    {
      key: 'instagram',
      url: instagramUrl,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 6.6A5.4 5.4 0 1 1 6.6 12 5.4 5.4 0 0 1 12 6.6Zm0 1.8A3.6 3.6 0 1 0 15.6 12 3.6 3.6 0 0 0 12 8.4Z" />
        </svg>
      ),
    },
  ]
  const isMobileMenuOpen = mobileMenuPath === location.pathname
  const closeMobileMenu = () => setMobileMenuPath(null)
  const toggleMobileMenu = () => {
    setMobileMenuPath((prevPath) => (prevPath === location.pathname ? null : location.pathname))
  }
  const handleMobileLangChange = (nextLang) => {
    setLang(nextLang)
    closeMobileMenu()
  }

  return (
    <nav className="nav" aria-label="Main navigation">
      <Link className="logo" to="/" onClick={closeMobileMenu}>
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
        {socialLinks.map((social) => (
          <a
            key={social.key}
            className="nav-social-link"
            href={social.url}
            target="_blank"
            rel="noreferrer"
            aria-label={t(`nav.${social.key}`)}
            title={t(`nav.${social.key}`)}
          >
            {social.icon}
          </a>
        ))}
      </div>
      <div className="lang-switch" aria-label="Language switch">
        <button type="button" className={`lang-btn ${lang === 'es' ? 'active' : ''}`} onClick={() => setLang('es')}>
          ES
        </button>
        <button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
          EN
        </button>
      </div>
      <button
        type="button"
        className={`nav-mobile-toggle ${isMobileMenuOpen ? 'open' : ''}`}
        aria-label={lang === 'en' ? 'Toggle navigation menu' : 'Abrir menú de navegación'}
        aria-expanded={isMobileMenuOpen}
        onClick={toggleMobileMenu}
      >
        <span className="nav-mobile-toggle-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <button
        type="button"
        className={`nav-mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        aria-label={lang === 'en' ? 'Close navigation menu' : 'Cerrar menú de navegación'}
        onClick={closeMobileMenu}
      />
      <div className={`nav-mobile-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-mobile-panel-links">
          <Link to="/" onClick={closeMobileMenu}>{t('nav.home')}</Link>
          <Link to="/reglamento" onClick={closeMobileMenu}>{t('nav.rules')}</Link>
          <Link to="/generador" onClick={closeMobileMenu}>{t('nav.generator')}</Link>
          <Link to="/batalla" onClick={closeMobileMenu}>{lang === 'en' ? 'Battle' : 'Batalla'}</Link>
          {socialLinks.map((social) => (
            <a
              key={social.key}
              className="nav-mobile-social"
              href={social.url}
              target="_blank"
              rel="noreferrer"
              aria-label={t(`nav.${social.key}`)}
              title={t(`nav.${social.key}`)}
              onClick={closeMobileMenu}
            >
              {social.icon}
              <span>{t(`nav.${social.key}`)}</span>
            </a>
          ))}
        </div>
        <div className="nav-mobile-lang" aria-label={lang === 'en' ? 'Language switch' : 'Selector de idioma'}>
          <button
            type="button"
            className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
            onClick={() => handleMobileLangChange('es')}
          >
            ES
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => handleMobileLangChange('en')}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Nav
