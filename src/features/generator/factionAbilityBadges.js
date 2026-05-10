import atrincheramiento from '../../images/faction_passives/atrincheramiento.png'
import fuegoCoordinado from '../../images/faction_passives/fuego-coordinado.png'
import repliegueTactico from '../../images/faction_passives/repliegue-tactico.png'
import artilleriaDeApoyo from '../../images/faction_passives/artilleria-de-apoyo.png'
import formacionDeAsalto from '../../images/faction_passives/formacion-de-asalto.png'
import contraofensiva from '../../images/faction_passives/contraofensiva.png'

const normalizeFactionAbilityAssetKey = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const factionAbilityBadgeById = {
  atrincheramiento,
  'fuego-coordinado': fuegoCoordinado,
  'repliegue-tactico': repliegueTactico,
  'artilleria-de-apoyo': artilleriaDeApoyo,
  'formacion-de-asalto': formacionDeAsalto,
  contraofensiva,
}

const factionAbilityIllustrationById = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../images/habilities/order/*.png', {
      eager: true,
      import: 'default',
    }),
  ).map(([filePath, src]) => {
    const fileName = filePath.split('/').pop() || ''
    return [normalizeFactionAbilityAssetKey(fileName), src]
  }),
)

export const getFactionAbilityBadgeSrc = (id) => factionAbilityBadgeById[id] || ''
export const getFactionAbilityIllustrationSrc = (id, name = '') =>
  factionAbilityIllustrationById[normalizeFactionAbilityAssetKey(id)]
  || factionAbilityIllustrationById[normalizeFactionAbilityAssetKey(name)]
  || ''
