export const SITE_NAME = 'ZeroLore'
export const DEFAULT_SEO_LANG = 'es'
export const SOCIAL_IMAGE_PATH = '/images/zerolore-social.png'
export const SOCIAL_IMAGE_WIDTH = '1200'
export const SOCIAL_IMAGE_HEIGHT = '630'
export const SOCIAL_IMAGE_ALT = 'ZeroLore logo'

export const SEO_BY_LANG = {
  es: {
    '/': {
      title: 'ZeroLore | Wargame de Miniaturas',
      description:
        'ZeroLore es un wargame de miniaturas para crear partidas, facciones y escenarios propios.',
      summary:
        'Explora ZeroLore, consulta el reglamento y prepara tus ejercitos para partidas de escaramuza y gran batalla.',
      pageType: 'WebSite',
    },
    '/reglamento': {
      title: 'Reglamento | ZeroLore',
      description:
        'Consulta el reglamento de ZeroLore: sistema rapido, brutal y cinematografico para tus partidas.',
      summary:
        'Lee las reglas base, acciones, combate, estados, puestos de mando y habilidades estrategicas de ZeroLore.',
      pageType: 'Article',
    },
    '/generador': {
      title: 'Ejércitos | ZeroLore',
      description:
        'Explora facciones, unidades y habilidades de ZeroLore y descarga tu ejercito listo para imprimir.',
      summary:
        'Consulta unidades, habilidades de faccion y fichas listas para descargar en ZeroLore.',
      pageType: 'WebApplication',
    },
    '/derechos-de-autor': {
      title: 'Derechos de autor | ZeroLore',
      description:
        'Aviso legal de ZeroLore: derechos de autor, condiciones de uso y propiedad intelectual del proyecto.',
      summary:
        'Consulta las condiciones de uso, autoria y derechos de autor de ZeroLore.',
      pageType: 'WebPage',
    },
  },
  en: {
    '/': {
      title: 'ZeroLore | Miniatures Wargame',
      description:
        'ZeroLore is a miniatures wargame for building your own battles, factions, and scenarios.',
      summary:
        'Discover ZeroLore, read the rules, and prepare your armies for skirmish and grand battle matches.',
      pageType: 'WebSite',
    },
    '/reglamento': {
      title: 'Rules | ZeroLore',
      description:
        'Read the ZeroLore rules: a fast, brutal, and cinematic system for your tabletop matches.',
      summary:
        'Review the core rules, actions, combat, states, command posts, and strategic abilities for ZeroLore.',
      pageType: 'Article',
    },
    '/generador': {
      title: 'Armies | ZeroLore',
      description:
        'Explore ZeroLore factions, units, and abilities, then download your army ready to print.',
      summary:
        'Browse units, faction abilities, and downloadable army cards for ZeroLore.',
      pageType: 'WebApplication',
    },
    '/derechos-de-autor': {
      title: 'Copyright | ZeroLore',
      description:
        'ZeroLore legal notice: copyright, usage rights, and intellectual property for the project.',
      summary:
        'Review ZeroLore usage terms, authorship, and copyright information.',
      pageType: 'WebPage',
    },
  },
}

export const ROUTE_PATHS = ['/', '/reglamento', '/generador', '/derechos-de-autor']

export const LOCALE_BY_LANG = {
  es: 'es_ES',
  en: 'en_US',
}

export function normalizeSiteUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

export function joinSiteUrl(siteUrl, path) {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  if (!normalizedSiteUrl) return path
  if (!path || path === '/') return `${normalizedSiteUrl}/`
  return `${normalizedSiteUrl}${path}`
}

export function getMetaForPath(pathname, lang = DEFAULT_SEO_LANG) {
  const normalizedLang = lang === 'es' || lang === 'en' ? lang : DEFAULT_SEO_LANG
  const pack = SEO_BY_LANG[normalizedLang] || SEO_BY_LANG[DEFAULT_SEO_LANG]
  return pack[pathname] || pack['/']
}

export function buildStructuredData({ siteUrl, pathname, lang = DEFAULT_SEO_LANG }) {
  const meta = getMetaForPath(pathname, lang)
  const url = joinSiteUrl(siteUrl, pathname)
  const inLanguage = lang === 'es' ? 'es' : 'en'
  const sameAs = [
    'https://discord.gg/6ZMGUUTRQT',
    'https://www.youtube.com/@zeroloretmg',
  ]

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    inLanguage,
    description: meta.description,
  }

  const webpage = {
    '@context': 'https://schema.org',
    '@type': meta.pageType || 'WebPage',
    name: meta.title,
    description: meta.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: joinSiteUrl(siteUrl, '/'),
    },
    inLanguage,
  }

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: joinSiteUrl(siteUrl, '/'),
    logo: joinSiteUrl(siteUrl, '/images/zerolore-social.png'),
    sameAs,
  }

  return pathname === '/' ? [website, organization] : [webpage, organization]
}

export function buildRobotsTxt(siteUrl) {
  const lines = [
    'User-agent: *',
    'Allow: /',
  ]

  if (siteUrl) {
    lines.push(`Sitemap: ${joinSiteUrl(siteUrl, '/sitemap.xml')}`)
  }

  return `${lines.join('\n')}\n`
}

export function buildSitemapXml(siteUrl) {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl)
  if (!normalizedSiteUrl) return ''

  const urls = ROUTE_PATHS.map((pathname) => {
    const loc = joinSiteUrl(normalizedSiteUrl, pathname)
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
