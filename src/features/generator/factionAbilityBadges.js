const normalizeFactionAbilityAssetKey = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

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

export const factionAbilityBadgeById = factionAbilityIllustrationById
export const getFactionAbilityBadgeSrc = (id, name = '') =>
  factionAbilityBadgeById[normalizeFactionAbilityAssetKey(id)]
  || factionAbilityBadgeById[normalizeFactionAbilityAssetKey(name)]
  || ''
export const getFactionAbilityIllustrationSrc = (id, name = '') =>
  factionAbilityIllustrationById[normalizeFactionAbilityAssetKey(id)]
  || factionAbilityIllustrationById[normalizeFactionAbilityAssetKey(name)]
  || ''
