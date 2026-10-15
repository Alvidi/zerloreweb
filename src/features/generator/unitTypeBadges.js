import { unitIconDataUrl } from '../cards/unitIcons.js'

/** Clase de una unidad a partir de su id o su nombre ("heroe-centinela" → "heroe"). */
export const getUnitClassToken = (value = '') => {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

  if (normalized.startsWith('milicia')) return 'milicia'
  if (normalized.startsWith('alimanas')) return 'alimanas'
  if (normalized.startsWith('hostigadores')) return 'hostigadores'
  if (normalized.startsWith('infantes')) return 'infantes'
  if (normalized.startsWith('bastion')) return 'bastion'
  if (normalized.startsWith('paladin')) return 'paladin'
  if (normalized.startsWith('explorador')) return 'explorador'
  if (normalized.startsWith('asaltante')) return 'asaltante'
  if (normalized.startsWith('armas pesadas') || normalized.startsWith('armas-pesadas')) return 'armas-pesadas'
  if (normalized.startsWith('psiquico')) return 'psiquico'
  if (normalized.startsWith('monstruo')) return 'monstruo'
  if (normalized.startsWith('vehiculo ligero') || normalized.startsWith('vehiculo-ligero')) return 'vehiculo-ligero'
  if (normalized.startsWith('vehiculo pesado') || normalized.startsWith('vehiculo-pesado')) return 'vehiculo-pesado'
  if (normalized.startsWith('artilleria')) return 'artilleria'
  if (normalized.startsWith('titan')) return 'titan'
  if (normalized.startsWith('capitan')) return 'capitan'
  if (normalized.startsWith('soporte')) return 'soporte'
  // Los Héroes comparten color e icono.
  if (normalized.startsWith('heroe')) return 'heroe'
  if (normalized.startsWith('equipamiento')) return 'equipamiento'
  return ''
}

/** Icono vectorial de la clase, como data URL para un <img>. */
export const getUnitClassBadgeSrc = (value = '') => {
  const token = getUnitClassToken(value)
  return token ? unitIconDataUrl(token) : ''
}
