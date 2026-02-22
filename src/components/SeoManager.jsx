import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext.jsx'

const SEO_BY_LANG = {
  es: {
    '/': {
      title: 'ZeroLore | Wargame de Miniaturas',
      description:
        'ZeroLore es un wargame de miniaturas donde construyes tus propias batallas, facciones e historias.',
    },
    '/reglamento': {
      title: 'Reglamento | ZeroLore',
      description:
        'Consulta el reglamento de ZeroLore: sistema rapido, brutal y cinematografico para tus partidas.',
    },
    '/generador': {
      title: 'Generador de Ejercitos | ZeroLore',
      description:
        'Crea y ajusta tu ejercito de ZeroLore por valor, faccion, doctrinas y configuracion de unidades.',
    },
  },
  en: {
    '/': {
      title: 'ZeroLore | Miniatures Wargame',
      description:
        'ZeroLore is a miniatures wargame where you build your own battles, factions, and stories.',
    },
    '/reglamento': {
      title: 'Rules | ZeroLore',
      description:
        'Read the ZeroLore rules: a fast, brutal, and cinematic system for your tabletop matches.',
    },
    '/generador': {
      title: 'Army Generator | ZeroLore',
      description:
        'Build and tune your ZeroLore army by target value, faction, doctrines, and unit loadouts.',
    },
  },
}

const FALLBACK = {
  title: 'ZeroLore',
  description:
    'ZeroLore is a miniatures wargame where you build your own battles, factions, and stories.',
}

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

    document.title = meta.title
    setMetaByName('description', meta.description)
    setMetaByName('robots', 'index,follow')
    setMetaByProperty('og:type', 'website')
    setMetaByProperty('og:title', meta.title)
    setMetaByProperty('og:description', meta.description)
    setMetaByProperty('og:url', canonical)
    setMetaByName('twitter:card', 'summary_large_image')
    setMetaByName('twitter:title', meta.title)
    setMetaByName('twitter:description', meta.description)
    setCanonical(canonical)
  }, [lang, location.pathname])

  return null
}

export default SeoManager
