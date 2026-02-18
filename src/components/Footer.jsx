import { useI18n } from '../i18n/I18nContext.jsx'

function Footer() {
  const { t } = useI18n()

  return (
    <footer className="footer">
      <div>ZeroLore © 2026</div>
      <div>{t('footer.tagline')}</div>
    </footer>
  )
}

export default Footer
