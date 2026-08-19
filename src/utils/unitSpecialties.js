const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_SPECIALTIES = [
  {
    es: { name: 'Guardia', description: 'Una vez por turno, cuando una unidad aliada a 6" o menos reciba daño, esta unidad puede recibir hasta 2 puntos de ese daño en su lugar.' },
  },
  {
    es: { name: 'Certero', description: 'Si esta unidad no se ha movido durante esta activación, mejora en 1 la Precisión de sus ataques a distancia (por ejemplo, de 4+ a 3+).' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga contra una unidad, gana +1 dado de ataque CaC durante ese combate.' },
  },
  {
    es: { name: 'Resistente', description: 'La primera vez cada turno que esta unidad reciba daño, reduce ese daño en 1D3.' },
  },
  {
    es: { name: 'Tirador', description: 'Cuando esta unidad realiza la acción Disparar, repite sus tiradas fallidas de precisión.' },
  },
  {
    es: { name: 'Berserker', description: 'Las unidades enemigas que ataquen a esta unidad en CaC fallan sus ataques con resultados naturales de 1, 2 o 3.' },
  },
  {
    es: { name: 'Soporte', description: 'En su activación, en lugar de actuar, puede curar a una unidad aliada a 6" o menos: esa unidad recupera 1D3 Vidas perdidas.' },
  },
  {
    es: { name: 'Preparado', description: 'La primera vez cada turno que esta unidad sea atacada a distancia, tras resolver el ataque puede disparar de inmediato con su arma a distancia contra el atacante, si está en alcance y línea de visión. No consume acción.' },
  },
  {
    es: { name: 'Capturador', description: 'Esta unidad cuenta como el doble de su Valor al controlar o disputar puestos de mando.' },
  },
  {
    es: { name: 'Contragolpe', description: 'La primera vez cada turno que esta unidad sea atacada en cuerpo a cuerpo —aunque no sea su activación—, responde de inmediato con un ataque cuerpo a cuerpo gratuito contra el atacante. No consume acción.' },
  },
  {
    es: { name: 'Bloqueo de refuerzos', description: 'Mientras esta unidad esté a 3" o menos de un puesto de mando enemigo, ese puesto de mando no puede desplegar refuerzos.' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede ser desplegada a 9" de un puesto de mando aliado.' },
  },
  {
    es: { name: 'Vuelo', description: 'Esta unidad ignora terreno y obstáculos durante el movimiento, y puede ascender diagonalmente sin coste adicional. No puede acabar su movimiento sobre otras miniaturas o zonas donde no pueda sostenerse.' },
  },
  {
    es: { name: 'Porrazo', description: 'En su activación, esta unidad puede realizar la acción Destrabarse sin efectuar el chequeo. Puede hacerlo aunque esté trabada con una unidad con Anclado.' },
  },
  {
    es: { name: 'Terror', description: 'Las unidades enemigas a 12" o menos de esta unidad no pueden disparar a esta unidad.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
  },
  {
    es: { name: '¡Boom!', description: 'Cuando esta unidad muere, explota afectando a las unidades a 6" de ella, infligiendo 1D6 de daño.' },
  },
  {
    es: { name: 'Cobertura móvil', description: 'Las unidades aliadas a 3" o menos de esta unidad cuentan como en cobertura contra ataques de Disparo.' },
  },
  {
    es: { name: 'Atropello', description: 'Durante su carga, si traba a una unidad enemiga dicha unidad recibe automáticamente 1D3 de daño.' },
  },
  {
    es: { name: 'Atrincherado', description: 'No puede moverse. Bloquea los refuerzos aliados en el puesto en el que sea desplegada.' },
  },
  {
    es: { name: 'Avance complicado', description: 'Puede moverse un máximo de 3", pero reduce en -2 el ataque total.' },
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
