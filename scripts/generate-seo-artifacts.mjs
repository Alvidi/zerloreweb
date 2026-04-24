import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SEO_LANG,
  LOCALE_BY_LANG,
  ROUTE_PATHS,
  SITE_NAME,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_PATH,
  SOCIAL_IMAGE_WIDTH,
  buildRobotsTxt,
  buildSitemapXml,
  buildStructuredData,
  getMetaForPath,
  joinSiteUrl,
  normalizeSiteUrl,
} from '../src/seo/seoConfig.js'

const projectRoot = process.cwd()
const distDir = path.join(projectRoot, 'dist')
const baseHtmlPath = path.join(distDir, 'index.html')
const configuredSiteUrl = normalizeSiteUrl(
  process.env.VITE_SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL || '',
)

function ensureDistExists() {
  if (!fs.existsSync(baseHtmlPath)) {
    throw new Error(`Missing build output: ${baseHtmlPath}`)
  }
}

function setTitle(html, title) {
  if (/<title>.*<\/title>/.test(html)) {
    return html.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
  }
  return html.replace('</head>', `  <title>${title}</title>\n</head>`)
}

function setMetaTag(html, matcher, tag) {
  if (matcher.test(html)) {
    return html.replace(matcher, tag)
  }
  return html.replace('</head>', `  ${tag}\n</head>`)
}

function setMetaByName(html, name, content) {
  const tag = `<meta name="${name}" content="${content}" />`
  return setMetaTag(html, new RegExp(`<meta\\s+name="${name}"[^>]*>`, 'i'), tag)
}

function setMetaByProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${content}" />`
  return setMetaTag(html, new RegExp(`<meta\\s+property="${property}"[^>]*>`, 'i'), tag)
}

function setCanonical(html, canonicalUrl) {
  if (!canonicalUrl) return html
  const tag = `<link rel="canonical" href="${canonicalUrl}" />`
  return setMetaTag(html, /<link\s+rel="canonical"[^>]*>/i, tag)
}

function setStructuredData(html, jsonLd) {
  const tag = `<script type="application/ld+json" data-seo-jsonld="true">${jsonLd}</script>`
  return setMetaTag(html, /<script[^>]+data-seo-jsonld="true"[^>]*>.*?<\/script>/is, tag)
}

function buildNoScriptMarkup(meta, url) {
  return [
    '<noscript>',
    '  <main style="max-width:72rem;margin:0 auto;padding:2rem 1.25rem;font-family:system-ui,sans-serif;color:#f3f4f6;background:#0f1117;min-height:100vh;">',
    `    <h1 style="margin:0 0 1rem;font-size:2rem;">${meta.title}</h1>`,
    `    <p style="margin:0 0 1rem;line-height:1.6;">${meta.summary}</p>`,
    `    <p style="margin:0;"><a href="${url}" style="color:#f3f4f6;">${url}</a></p>`,
    '  </main>',
    '</noscript>',
  ].join('\n')
}

function createRouteHtml(pathname, sourceHtml, siteUrl) {
  const lang = DEFAULT_SEO_LANG
  const locale = LOCALE_BY_LANG[lang] || LOCALE_BY_LANG.en
  const alternateLocale = lang === 'es' ? LOCALE_BY_LANG.en : LOCALE_BY_LANG.es
  const meta = getMetaForPath(pathname, lang)
  const canonical = siteUrl ? joinSiteUrl(siteUrl, pathname) : ''
  const socialImage = siteUrl ? joinSiteUrl(siteUrl, SOCIAL_IMAGE_PATH) : SOCIAL_IMAGE_PATH
  const structuredData = JSON.stringify(buildStructuredData({ siteUrl, pathname, lang }))
  let html = sourceHtml

  html = setTitle(html, meta.title)
  html = setMetaByName(html, 'description', meta.description)
  html = setMetaByName(html, 'robots', 'index,follow')
  html = setMetaByProperty(html, 'og:type', 'website')
  html = setMetaByProperty(html, 'og:site_name', SITE_NAME)
  html = setMetaByProperty(html, 'og:locale', locale)
  html = setMetaByProperty(html, 'og:locale:alternate', alternateLocale)
  html = setMetaByProperty(html, 'og:title', meta.title)
  html = setMetaByProperty(html, 'og:description', meta.description)
  html = setMetaByProperty(html, 'og:image', socialImage)
  html = setMetaByProperty(html, 'og:image:width', SOCIAL_IMAGE_WIDTH)
  html = setMetaByProperty(html, 'og:image:height', SOCIAL_IMAGE_HEIGHT)
  html = setMetaByProperty(html, 'og:image:alt', SOCIAL_IMAGE_ALT)
  html = setMetaByName(html, 'twitter:card', 'summary_large_image')
  html = setMetaByName(html, 'twitter:title', meta.title)
  html = setMetaByName(html, 'twitter:description', meta.description)
  html = setMetaByName(html, 'twitter:image', socialImage)
  html = setMetaByName(html, 'twitter:image:alt', SOCIAL_IMAGE_ALT)
  html = setCanonical(html, canonical)
  if (canonical) {
    html = setMetaByProperty(html, 'og:url', canonical)
  }
  html = setStructuredData(html, structuredData)
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n${buildNoScriptMarkup(meta, canonical || pathname)}`,
  )

  return html
}

function writeRouteHtml(pathname, html) {
  const routeDir = pathname === '/' ? distDir : path.join(distDir, pathname.replace(/^\//, ''))
  fs.mkdirSync(routeDir, { recursive: true })
  fs.writeFileSync(path.join(routeDir, 'index.html'), html)
}

function main() {
  ensureDistExists()
  const sourceHtml = fs.readFileSync(baseHtmlPath, 'utf8')

  ROUTE_PATHS.forEach((pathname) => {
    const html = createRouteHtml(pathname, sourceHtml, configuredSiteUrl)
    writeRouteHtml(pathname, html)
  })

  fs.writeFileSync(path.join(distDir, 'robots.txt'), buildRobotsTxt(configuredSiteUrl))

  const sitemap = buildSitemapXml(configuredSiteUrl)
  if (sitemap) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap)
  }

  if (!configuredSiteUrl) {
    console.warn('[seo] Missing VITE_SITE_URL/URL. Generated route HTML without absolute canonicals and skipped sitemap.xml.')
  }
}

main()
