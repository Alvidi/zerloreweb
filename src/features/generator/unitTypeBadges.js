// Iconos de clase (uno por clase, sin eras). Los ficheros que falten
// simplemente no producen badge.
const badgeModules = import.meta.glob('../../images/units_icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

// Algunos ficheros no se llaman igual que el token de su clase.
const FILENAME_ALIASES = {
  mosntruo: 'monstruo',
  extermiandor: 'exterminador',
  juggernait: 'juggernaut',
  armas_pesadas: 'armas-pesadas',
  'vehiculo ligero': 'vehiculo-ligero',
  'vehiculo pesado': 'vehiculo-pesado',
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
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (normalized.startsWith('milicia')) return 'milicia'
  if (normalized.startsWith('tirador')) return 'tirador'
  if (normalized.startsWith('choque')) return 'choque'
  if (normalized.startsWith('juggernaut')) return 'juggernaut'
  if (normalized.startsWith('exterminador')) return 'exterminador'
  if (normalized.startsWith('explorador')) return 'explorador'
  if (normalized.startsWith('asaltante')) return 'asaltante'
  if (normalized.startsWith('armas pesadas') || normalized.startsWith('armas-pesadas')) return 'armas-pesadas'
  if (normalized.startsWith('psiquico')) return 'psiquico'
  if (normalized.startsWith('demonio')) return 'demonio'
  if (normalized.startsWith('monstruo')) return 'monstruo'
  if (normalized.startsWith('vehiculo ligero') || normalized.startsWith('vehiculo-ligero')) return 'vehiculo-ligero'
  if (normalized.startsWith('vehiculo pesado') || normalized.startsWith('vehiculo-pesado')) return 'vehiculo-pesado'
  if (normalized.startsWith('vehiculo')) return 'vehiculo-ligero'
  if (normalized.startsWith('artilleria')) return 'artilleria'
  if (normalized.startsWith('titan')) return 'titan'
  if (normalized.startsWith('comandante')) return 'comandante'
  return ''
}

export const getUnitClassBadgeSrc = (value = '') => {
  const token = getUnitClassToken(value)
  if (!token) return ''
  return badgeByClass[token] || ''
}

export const hasUnitClassBadge = (value = '') => Boolean(getUnitClassBadgeSrc(value))
