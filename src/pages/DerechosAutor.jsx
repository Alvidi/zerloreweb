import { useMemo } from 'react'
import { marked } from 'marked'
import legalMd from '../data/spanish/legal.md?raw'
import legalEnMd from '../data/english/legal.md?raw'
import { useI18n } from '../i18n/I18nContext.jsx'

function DerechosAutor() {
  const { lang, t } = useI18n()
  const activeMarkdown = lang === 'en' ? legalEnMd : legalMd
  const html = useMemo(() => marked(activeMarkdown), [activeMarkdown])

  return (
    <section className="section legal-page reveal" id="derechos-de-autor">
      <div className="section-head reveal">
        <p className="eyebrow">{t('legal.eyebrow')}</p>
        <h2>{t('legal.title')}</h2>
        <p>{t('legal.intro')}</p>
      </div>
      <article
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}

export default DerechosAutor
