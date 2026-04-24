import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'
import {
  SITE_NAME,
  LOCALE_BY_LANG,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_PATH,
  SOCIAL_IMAGE_WIDTH,
  buildStructuredData,
  getMetaForPath,
  joinSiteUrl,
  normalizeSiteUrl,
} from '../seo/seoConfig.js'

function setMetaByName(name, content) {
  let node = document.head.querySelector(`meta[name="${name}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', name)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function setMetaByProperty(property, content) {
  let node = document.head.querySelector(`meta[property="${property}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('property', property)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function setCanonical(url) {
  let node = document.head.querySelector('link[rel="canonical"]')
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', 'canonical')
    document.head.appendChild(node)
  }
  node.setAttribute('href', url)
}

function setStructuredData(documents) {
  let node = document.head.querySelector('script[data-seo-jsonld="true"]')
  if (!node) {
    node = document.createElement('script')
    node.setAttribute('type', 'application/ld+json')
    node.setAttribute('data-seo-jsonld', 'true')
    document.head.appendChild(node)
  }
  node.textContent = JSON.stringify(documents)
}

function SeoManager() {
  const location = useLocation()
  const { lang } = useI18n()

  useEffect(() => {
    const meta = getMetaForPath(location.pathname, lang)
    const configuredSiteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL)
    const runtimeSiteUrl = configuredSiteUrl || window.location.origin
    const canonical = joinSiteUrl(runtimeSiteUrl, location.pathname)
    const socialImage = joinSiteUrl(runtimeSiteUrl, SOCIAL_IMAGE_PATH)
    const locale = LOCALE_BY_LANG[lang] || LOCALE_BY_LANG.en
    const alternateLocale = lang === 'es' ? LOCALE_BY_LANG.en : LOCALE_BY_LANG.es

    document.title = meta.title
    setMetaByName('description', meta.description)
    setMetaByName('robots', 'index,follow')
    setMetaByName('theme-color', '#0f1117')
    setMetaByProperty('og:site_name', SITE_NAME)
    setMetaByProperty('og:type', 'website')
    setMetaByProperty('og:locale', locale)
    setMetaByProperty('og:locale:alternate', alternateLocale)
    setMetaByProperty('og:title', meta.title)
    setMetaByProperty('og:description', meta.description)
    setMetaByProperty('og:url', canonical)
    setMetaByProperty('og:image', socialImage)
    setMetaByProperty('og:image:width', SOCIAL_IMAGE_WIDTH)
    setMetaByProperty('og:image:height', SOCIAL_IMAGE_HEIGHT)
    setMetaByProperty('og:image:alt', SOCIAL_IMAGE_ALT)
    setMetaByName('twitter:card', 'summary_large_image')
    setMetaByName('twitter:title', meta.title)
    setMetaByName('twitter:description', meta.description)
    setMetaByName('twitter:image', socialImage)
    setMetaByName('twitter:image:alt', SOCIAL_IMAGE_ALT)
    setCanonical(canonical)
    setStructuredData(buildStructuredData({ siteUrl: runtimeSiteUrl, pathname: location.pathname, lang }))
  }, [lang, location.pathname])

  return null
}

export default SeoManager
