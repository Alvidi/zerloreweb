import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'

function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div>
        ZeroLore © {year}. {t('footer.madeBy')}.{' '}
        <Link className="footer-link" to="/derechos-de-autor">
          {t('footer.copyrightLink')}
        </Link>
        . {t('footer.rights')} {t('footer.tagline')}
      </div>
    </footer>
  )
}

export default Footer
