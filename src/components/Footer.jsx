import { useI18n } from '../i18n/I18nContext.jsx'

function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div>ZeroLore © {year}. {t('footer.madeBy')}</div>
      <div>{t('footer.tagline')}</div>
    </footer>
  )
}

export default Footer
