import catalogo from '../../data/catalog/catalogo.json'
import heroesData from '../../data/catalog/heroes.json'

export const UNIDADES = catalogo.unidades

/** Héroes de ejército: cada lista lleva al menos uno y se eligen antes que el resto. */
export const HEROES = heroesData.heroes

const BY_ID = new Map([...HEROES, ...UNIDADES].map((unidad) => [unidad.id, unidad]))

export const getUnidad = (unidadId) => BY_ID.get(unidadId) || null

export const isHeroe = (unidadId) => String(unidadId || '').startsWith('heroe-')

/**
 * Entrada plana que consume la ficha: perfil, habilidad y las 2 armas.
 * Cada tipo de unidad tiene un único perfil — ya no hay sets de armas.
 */
export const buildUnitEntry = (unidadId) => {
  const unidad = getUnidad(unidadId)
  if (!unidad) return null

  return {
    kind: isHeroe(unidad.id) ? 'heroe' : 'unidad',
    unidadId: unidad.id,
    nombre: unidad.nombre,
    clase: unidad.nombre,
    rol: unidad.rol || '',
    habilidad: unidad.habilidad,
    // Los Héroes traen la redacción de su habilidad de ejército en el propio perfil.
    habilidadDescripcion: unidad.habilidad_descripcion || '',
    perfil: unidad.perfil,
    armas: unidad.armas,
  }
}

/**
 * Valor de una unidad del ejército. Las escuadras se montan en mesa, así que
 * aquí cada miniatura suma su propio Valor.
 */
export const getEntryValue = (entry) => Number(entry?.perfil?.valor) || 0
