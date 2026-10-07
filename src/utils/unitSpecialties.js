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
    es: { name: 'Atrincherado', description: 'Mientras esta unidad esté en cobertura, mejora en 1 la Precisión de sus ataques a distancia.' },
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
    es: { name: 'Brinco', description: 'Esta unidad puede ascender en diagonal al moverse, sin necesidad de tocar la base del obstáculo. No puede terminar su movimiento sobre otras miniaturas ni en lugares donde no pueda sostenerse.' },
  },
  {
    es: { name: 'Emplazado', description: 'Si esta unidad no se ha movido durante esta activación, gana +1 dado en sus ataques a distancia.' },
  },
  {
    es: { name: 'Poder mental', description: 'Ignora cualquier cobertura en la que esté la unidad objetivo. También puede atacar sin línea de visión, pero en ese caso debe tirar un dado: si saca 1, 2 o 3, esta unidad recibe 1D3 de daño directo.' },
  },
  {
    es: { name: 'Regeneración', description: 'Si esta unidad muere, regresa a la Reserva con todas sus Vidas y lista para volver a ser desplegada.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
  },
  {
    es: { name: 'Transporte', description: 'Durante la fase de despliegue, una unidad aliada puede desplegarse desde la Reserva en contacto con este vehículo, igual que si fuera un puesto de mando. Solo una unidad por turno, y nunca Vehículos, Monstruos, Artillería ni Titanes.' },
  },
  {
    es: { name: 'Fuego de apoyo', description: 'Esta unidad puede realizar la acción Disparar a otra unidad, aunque esté trabada en combate cuerpo a cuerpo.' },
  },
  {
    es: { name: 'Fuego indirecto', description: 'Esta unidad puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Distancia y el objetivo no esté en cobertura. Esta unidad no puede moverse.' },
  },
  {
    es: { name: 'Superioridad', description: 'Solo puede cargar contra otro Titán y ser trabada por otro Titán. Si otro tipo de unidad la carga, esta procede de manera normal con su carga y ataque, y a continuación se retira 1" de ella.' },
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
