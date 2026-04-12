import doctrinesEsRaw from './jsonDoctrinasES/doctrinas.json'
import doctrinesEnRaw from './jsonDoctrinasEN/doctrinas.en.json'

export const DOCTRINE_TOKEN_DIAMETER_MM = 32

const doctrineImageModules = import.meta.glob(
  ['../../images/tokens/doctrines/es/*.svg', '../../images/tokens/doctrines/en/*.svg'],
  { eager: true, import: 'default' },
)

const doctrineImageLookup = Object.entries(doctrineImageModules).reduce((lookup, [path, href]) => {
  const match = path.match(/\/(es|en)\/([^/]+)\.svg$/)
  if (!match) return lookup

  const [, lang, imageId] = match
  lookup.set(`${lang}:${imageId}`, href)
  return lookup
}, new Map())

const toDoctrineList = (rawCatalog) => (Array.isArray(rawCatalog?.doctrinas) ? rawCatalog.doctrinas : [])

const normalizeDoctrineEntry = (entry, index) => ({
  id: entry?.id || `doctrine-${index + 1}`,
  nombre: entry?.nombre || entry?.name || entry?.id || `Doctrine ${index + 1}`,
  tokenLabel: entry?.token_label || entry?.tokenLabel || '',
  imageId: entry?.image_id || entry?.imageId || entry?.id || `doctrine-${index + 1}`,
  order: Number.isFinite(Number(entry?.orden)) ? Number(entry.orden) : index,
})

const doctrineEntriesEs = toDoctrineList(doctrinesEsRaw).map(normalizeDoctrineEntry)
const doctrineEntriesEn = toDoctrineList(doctrinesEnRaw).map(normalizeDoctrineEntry)

const doctrineMapEs = new Map(doctrineEntriesEs.map((entry) => [entry.id, entry]))
const doctrineMapEn = new Map(doctrineEntriesEn.map((entry) => [entry.id, entry]))

const doctrineIds = Array.from(
  new Set([
    ...doctrineEntriesEs.map((entry) => entry.id),
    ...doctrineEntriesEn.map((entry) => entry.id),
  ]),
)

export const doctrineCatalog = doctrineIds
  .map((id, index) => {
    const doctrineEs = doctrineMapEs.get(id)
    const doctrineEn = doctrineMapEn.get(id)
    const baseDoctrine = doctrineEs || doctrineEn
    if (!baseDoctrine) return null

    const imageId = doctrineEs?.imageId || doctrineEn?.imageId || id
    const nombreEs = doctrineEs?.nombre || doctrineEn?.nombre || id
    const nombreEn = doctrineEn?.nombre || doctrineEs?.nombre || id

    return {
      id,
      order: doctrineEs?.order ?? doctrineEn?.order ?? index,
      nombre: {
        es: nombreEs,
        en: nombreEn,
      },
      tokenLabel: {
        es: doctrineEs?.tokenLabel || `Doctrina: ${nombreEs}`,
        en: doctrineEn?.tokenLabel || `Doctrine: ${nombreEn}`,
      },
      images: {
        es: doctrineImageLookup.get(`es:${imageId}`) || '',
        en: doctrineImageLookup.get(`en:${imageId}`) || '',
      },
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.order - b.order)
