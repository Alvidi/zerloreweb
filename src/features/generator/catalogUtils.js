import catalogo from '../../data/catalog/catalogo.json'

export const ROLES = catalogo.roles
export const VENTAJA_CLASE = catalogo.ventaja_clase
export const HEROES = catalogo.heroes
export const UNIDADES = catalogo.unidades

export const ROLE_IDS = ROLES.map((role) => role.id)
export const DEFAULT_ROLE_ID = 'equilibrado'

export const getRole = (roleId) => ROLES.find((role) => role.id === roleId) || ROLES[0]

export const getHero = (heroId) => HEROES.find((hero) => hero.id === heroId) || null

export const getUnidad = (unidadId) => UNIDADES.find((unidad) => unidad.id === unidadId) || null

/** Clases que no pueden jugarse en modo Escaramuza. */
const GRAND_BATTLE_ONLY = new Set(['monstruo', 'vehiculo', 'artilleria'])

export const isUnidadAllowedInGameMode = (unidadId, gameMode) =>
  gameMode !== 'escaramuza' || !GRAND_BATTLE_ONLY.has(unidadId)

export const getAvailableUnidades = (gameMode) =>
  UNIDADES.filter((unidad) => isUnidadAllowedInGameMode(unidad.id, gameMode))

/**
 * Combina una clase con el rol elegido y devuelve la entrada plana que
 * consume la ficha: nombre de rol, clase, perfil, habilidad y las 2 armas.
 */
export const buildUnitEntry = (unidadId, roleId = DEFAULT_ROLE_ID) => {
  const unidad = getUnidad(unidadId)
  if (!unidad) return null
  const role = unidad.roles[roleId] ? roleId : DEFAULT_ROLE_ID
  const roleData = unidad.roles[role]

  return {
    kind: 'unidad',
    unidadId: unidad.id,
    roleId: role,
    // El nombre de sabor del rol (Miliciano, Infiltrador…) queda guardado en
    // nombreRol pero de momento no se muestra: la unidad se identifica por su clase.
    nombre: unidad.clase,
    nombreRol: roleData.nombre,
    clase: unidad.clase,
    rol: getRole(role).nombre,
    habilidad: roleData.habilidad,
    perfil: unidad.perfil,
    fuerteContra: unidad.fuerte_contra || [],
    armas: roleData.armas,
  }
}

export const buildHeroEntry = (heroId) => {
  const hero = getHero(heroId)
  if (!hero) return null

  return {
    kind: 'heroe',
    heroId: hero.id,
    nombre: hero.nombre,
    clase: 'Héroe',
    rol: '',
    habilidad_faccion: hero.habilidad_faccion,
    perfil: hero.perfil,
    armas: hero.armas,
  }
}

export const clampSquadSize = (value, entry, gameMode) => {
  if (gameMode === 'escaramuza') return 1
  const min = entry?.perfil?.escuadra?.min ?? 1
  const max = entry?.perfil?.escuadra?.max ?? 1
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

/** Valor de una entrada del ejército: valor unitario × nº de miniaturas. */
export const getEntryValue = (entry, squadSize = 1, gameMode = 'escaramuza') => {
  const unitValue = Number(entry?.perfil?.valor) || 0
  if (gameMode === 'escaramuza') return unitValue
  return unitValue * (Number(squadSize) || 1)
}

export const getArmyTotalValue = (armyEntries = [], gameMode = 'escaramuza') =>
  armyEntries.reduce((total, item) => total + getEntryValue(item.entry, item.squadSize, gameMode), 0)

/** Bonificación de daño por ventaja de clase según el modo de juego. */
export const getVentajaClase = (gameMode = 'escaramuza') =>
  gameMode === 'escaramuza' ? VENTAJA_CLASE.escaramuza : VENTAJA_CLASE.gran_batalla
