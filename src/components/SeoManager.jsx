import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'

const SEO_BY_LANG = {
  es: {
    '/': {
      title: 'ZeroLore | Wargame de Miniaturas',
      description:
        'ZeroLore es un wargame de miniaturas donde construyes tus propias partidas, facciones e historias.',
    },
    '/reglamento': {
      title: 'Reglamento | ZeroLore',
      description:
        'Consulta el reglamento de ZeroLore: sistema rapido, brutal y cinematico para tus partidas.',
    },
    '/generador': {
      title: 'Generador de Ejercitos | ZeroLore',
      description:
        'Crea y ajusta tu ejercito de ZeroLore por valor, faccion y configuracion de unidades.',
    },
  },
  en: {
    '/': {
      title: 'ZeroLore | Miniatures Wargame',
      description:
        'ZeroLore is a miniatures wargame where you build your own games, factions, and stories.',
    },
    '/reglamento': {
      title: 'Rules | ZeroLore',
      description:
        'Read the ZeroLore rules: a fast, brutal, and cinematic system for your tabletop matches.',
    },
    '/generador': {
      title: 'Army Generator | ZeroLore',
      description:
        'Build and tune your ZeroLore army by target value, faction, and unit loadouts.',
    },
  },
}

const FALLBACK = {
  title: 'ZeroLore',
  description:
    'ZeroLore is a miniatures wargame where you build your own games, factions, and stories.',
}
const SOCIAL_IMAGE_PATH = '/images/zerolore-social.png'
const SOCIAL_IMAGE_WIDTH = '1200'
const SOCIAL_IMAGE_HEIGHT = '630'
const SOCIAL_IMAGE_ALT = 'ZeroLore logo'

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

function SeoManager() {
  const location = useLocation()
  const { lang } = useI18n()

  useEffect(() => {
    const pack = SEO_BY_LANG[lang] || SEO_BY_LANG.en
    const meta = pack[location.pathname] || pack['/'] || FALLBACK
    const origin = window.location.origin
    const canonical = `${origin}${location.pathname}`
    const socialImage = `${origin}${SOCIAL_IMAGE_PATH}`

    document.title = meta.title
    setMetaByName('description', meta.description)
    setMetaByName('robots', 'index,follow')
    setMetaByName('theme-color', '#0f1117')
    setMetaByProperty('og:type', 'website')
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
  }, [lang, location.pathname])

  return null
}

export default SeoManager
