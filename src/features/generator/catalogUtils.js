import catalogo from '../../data/catalog/catalogo.json'

export const UNIDADES = catalogo.unidades

export const getUnidad = (unidadId) => UNIDADES.find((unidad) => unidad.id === unidadId) || null

/**
 * Entrada plana que consume la ficha: perfil, habilidad y las 2 armas.
 * Cada tipo de unidad tiene un único perfil — ya no hay sets de armas.
 */
export const buildUnitEntry = (unidadId) => {
  const unidad = getUnidad(unidadId)
  if (!unidad) return null

  return {
    kind: 'unidad',
    unidadId: unidad.id,
    nombre: unidad.nombre,
    clase: unidad.nombre,
    habilidad: unidad.habilidad,
    perfil: unidad.perfil,
    fuerteContra: unidad.fuerte_contra || [],
    armas: unidad.armas,
  }
}

/**
 * Valor de una unidad del ejército. Las escuadras se montan en mesa, así que
 * aquí cada miniatura suma su propio Valor.
 */
export const getEntryValue = (entry) => Number(entry?.perfil?.valor) || 0

export const getArmyTotalValue = (armyEntries = []) =>
  armyEntries.reduce((total, item) => total + getEntryValue(item.entry), 0)
