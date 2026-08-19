// Iconos de clase (uno por clase, sin eras). Los ficheros que falten
// simplemente no producen badge.
const badgeModules = import.meta.glob('../../images/units_icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

// El fichero de Monstruo está en disco como "mosntruo.png".
const FILENAME_ALIASES = {
  mosntruo: 'monstruo',
}

const badgeByClass = Object.entries(badgeModules).reduce((badges, [path, src]) => {
  const match = path.match(/units_icons\/([^/]+)\.png$/)
  if (!match) return badges
  const raw = match[1]
  badges[FILENAME_ALIASES[raw] || raw] = src
  return badges
}, {})

export const getUnitClassToken = (value = '') => {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

  if (normalized.startsWith('choque') || normalized.startsWith('shock')) return 'choque'
  if (normalized.startsWith('elite')) return 'elite'
  if (normalized.startsWith('especialista') || normalized.startsWith('specialist')) return 'especialista'
  if (normalized.startsWith('comando') || normalized.startsWith('commando')) return 'comando'
  if (normalized.startsWith('asaltante') || normalized.startsWith('raider')) return 'asaltante'
  if (normalized.startsWith('monstruo') || normalized.startsWith('monster')) return 'monstruo'
  if (normalized.startsWith('vehiculo') || normalized.startsWith('vehicle')) return 'vehiculo'
  if (normalized.startsWith('artilleria') || normalized.startsWith('artillery')) return 'artilleria'
  if (normalized.startsWith('heroe') || normalized.startsWith('hero')) return 'heroe'
  return ''
}

export const getUnitClassBadgeSrc = (value = '') => badgeByClass[getUnitClassToken(value)] || ''

export const hasUnitClassBadge = (value = '') => Boolean(getUnitClassBadgeSrc(value))
