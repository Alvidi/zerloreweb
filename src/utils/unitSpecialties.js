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
    es: { name: 'Bloqueo', description: 'Esta unidad bloquea el ataque gratuito de las cargas enemigas realizadas contra ella.' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga, gana +1 dado de ataque CaC durante ese ataque gratuito.' },
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
    es: { name: 'Poder mental', description: 'Ignora cualquier cobertura en la que esté la unidad objetivo. También puede atacar sin línea de visión, pero en ese caso debe tirar un dado: si saca 1, 2 o 3, esta unidad recibe 1D3 de daño directo.' },
  },
  {
    es: { name: 'Regeneración', description: 'Si una unidad Demonio muere, regresa a la Reserva con todas las Vidas y lista para volver a ser desplegada.' },
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
    es: { name: 'Fuego indirecto', description: 'Esta unidad puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Distancia y el objetivo no esté en cobertura. Esta unidad no puede moverse.' },
  },
  {
    es: { name: 'Superioridad', description: 'Solo puede cargar contra otro Titán, y solo otro Titán puede trabarlo. Si le carga una unidad de otro tipo, esa unidad resuelve su carga y su ataque con normalidad y a continuación se retira 1" del Titán.' },
  },
  {
    es: { name: 'Refuerzos', description: 'Durante la fase de despliegue, esta unidad puede recibir una miniatura del tipo que comande, desde la Reserva, siempre que no esté trabada en CaC, colocada en coherencia con la escuadra. La escuadra nunca puede superar su número máximo de miniaturas.' },
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
