const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_SPECIALTIES = [
  {
    es: { name: 'Alimañas', description: 'Esta unidad no tiene habilidad especial.' },
  },
  {
    es: { name: 'Fuego de contención', description: 'Cuando un enemigo le declara una carga, puede dispararle antes de que se mueva.' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga, gana +1 dado de ataque CaC durante ese combate.' },
  },
  {
    es: { name: 'Resistente', description: 'La primera vez cada turno que esta unidad reciba daño, reduce ese daño en 1D3.' },
  },
  {
    es: { name: 'Berserker', description: 'Las unidades enemigas que ataquen a esta unidad en CaC fallan con resultados naturales de 1, 2 o 3.' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede desplegarse a 9" de un puesto de mando aliado. No puede ir con Comandantes.' },
  },
  {
    es: { name: 'Carga larga', description: 'Al realizar la acción Cargar, esta unidad puede desplazarse 3" adicionales.' },
  },
  {
    es: { name: 'Emplazado', description: 'Si esta unidad no se ha movido durante esta activación, gana +1 dado en sus ataques a distancia.' },
  },
  {
    es: { name: 'Mente abierta', description: 'Los ataques de esta unidad ignoran la cobertura del objetivo.' },
  },
  {
    es: { name: 'Regeneración', description: 'Al final de cada turno, si esta unidad sigue en el campo de batalla, recupera 1D3 Vidas perdidas.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
  },
  {
    es: { name: 'Atropello', description: 'Durante su carga, si traba a una unidad enemiga, esa unidad recibe automáticamente 1D3 de daño.' },
  },
  {
    es: { name: 'Fuego de apoyo', description: 'Esta unidad puede realizar la acción Disparar aunque esté trabada en combate cuerpo a cuerpo.' },
  },
  {
    es: { name: 'Atrincherado', description: 'Esta unidad no puede moverse.' },
  },
  {
    es: { name: 'Superioridad', description: 'Solo puede cargar contra otro Titán, y solo otro Titán puede trabarlo. Si le carga una unidad de otro tipo, esa unidad resuelve su carga y su ataque con normalidad y a continuación se retira 1" del Titán.' },
  },
  {
    es: { name: 'Refuerzos', description: 'Durante la fase de despliegue, esta unidad puede recibir una miniatura de su tipo desde la Reserva, siempre que no esté trabada en CaC, colocada en coherencia con la escuadra. La escuadra nunca puede superar su número máximo de miniaturas.' },
  },
]

const buildSpecialtyLookup = (specialties) => {
  const lookup = new Map()
  specialties.forEach((specialty) => {
    lookup.set(normalizeKey(specialty.es.name), specialty)
    lookup.set(normalizeKey(specialty.es.description), specialty)
  })
  return lookup
}

const UNIT_SPECIALTY_LOOKUP = buildSpecialtyLookup(UNIT_SPECIALTIES)

export const getUnitSpecialtyEntry = (value) => {
  const key = normalizeKey(value)
  return key ? UNIT_SPECIALTY_LOOKUP.get(key) || null : null
}

export const getUnitSpecialtyName = (value) =>
  getUnitSpecialtyEntry(value)?.es?.name || ''

export const getUnitSpecialtyDescription = (value) =>
  getUnitSpecialtyEntry(value)?.es?.description || ''

export const resolveUnitSpecialtyDescription = (value) =>
  getUnitSpecialtyDescription(value) || String(value || '').trim()

export const UNIT_SPECIALTIES_LIST = UNIT_SPECIALTIES
