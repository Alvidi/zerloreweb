const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_SPECIALTIES = [
  {
    es: { name: 'Capturador', description: 'Esta unidad cuenta como el doble de su Valor al controlar o disputar puestos de mando.' },
  },
  {
    es: { name: 'Certero', description: 'Si esta unidad no se ha movido durante esta activación, mejora en 1 la Precisión de sus ataques a distancia (por ejemplo, de 4+ a 3+).' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga, gana +1 dado de ataque CaC durante ese combate.' },
  },
  {
    es: { name: 'Resistente', description: 'La primera vez cada turno que esta unidad reciba daño, reduce ese daño en 1D3.' },
  },
  {
    es: { name: 'Soporte', description: 'En su activación, en lugar de actuar, puede curar a una unidad aliada a 6" o menos: esa unidad recupera 1D3 Vidas perdidas.' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede desplegarse a 9" de un puesto de mando aliado.' },
  },
  {
    es: { name: 'Vuelo', description: 'Esta unidad ignora terreno y obstáculos durante el movimiento y puede ascender diagonalmente sin coste adicional. No puede acabar su movimiento sobre otras miniaturas o zonas donde no pueda sostenerse.' },
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
    es: { name: 'Berserker', description: 'Las unidades enemigas que ataquen a esta unidad en CaC fallan con resultados naturales de 1, 2 o 3.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
  },
  {
    es: { name: 'Atropello', description: 'Durante su carga, si traba a una unidad enemiga, esa unidad recibe automáticamente 1D3 de daño.' },
  },
  {
    es: { name: 'Cobertura móvil', description: 'Las unidades aliadas a 3" o menos de esta unidad cuentan como en cobertura contra ataques a distancia.' },
  },
  {
    es: { name: 'Atrincherado', description: 'Esta unidad no puede moverse.' },
  },
  {
    es: { name: 'Terror', description: 'Las unidades enemigas a 12" o menos de esta unidad no pueden dispararle.' },
  },
  {
    es: { name: 'Refuerzos', description: 'Durante la fase de despliegue, esta unidad funciona como un puesto de mando para su propia escuadra: puede recibir una miniatura de su tipo desde la Reserva, colocada en coherencia con la escuadra. La escuadra nunca puede superar su número máximo de miniaturas.' },
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
