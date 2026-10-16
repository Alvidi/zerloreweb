const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_SPECIALTIES = [
  {
    es: { name: 'Poca pericia', description: 'Esta unidad no tiene habilidad especial.' },
  },
  {
    es: { name: 'Atrincherado', description: 'Mientras esta unidad esté en cobertura, mejora en 1 la Precisión de sus ataques a distancia.' },
  },
  {
    es: { name: 'Empujón', description: 'Después de resolver los ataques cuerpo a cuerpo, si el objetivo sobrevive, puedes alejarlo hasta 3" en línea recta desde los Infantes, siempre que haya espacio.' },
  },
  {
    es: { name: 'Contra-disparo', description: 'Una vez por turno, cuando la primera unidad enemiga le dispara y sobrevive, puede dispararle de vuelta si la tiene a su alcance y en línea de visión. Este disparo no gana el dado extra de Pesada.' },
  },
  {
    es: { name: 'Cadena', description: 'Ocupa toda la activación. Una unidad enemiga a 6" o menos es arrastrada hasta el contacto y recibe su ataque cuerpo a cuerpo. Después, el Paladín se separa 1".' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede desplegarse a 9" de un puesto de mando aliado. Esta unidad no puede formar parte de una escuadra.' },
  },
  {
    es: { name: 'Brinco', description: 'Esta unidad puede ascender en diagonal al moverse, sin necesidad de tocar la base del obstáculo. No puede terminar su movimiento sobre otras miniaturas ni en lugares donde no pueda sostenerse.' },
  },
  {
    es: { name: 'Furia creciente', description: 'Gana 1 dado de ataque por cada Vida que haya perdido, con un máximo de +3.' },
  },
  {
    es: { name: 'Transporte', description: 'Durante la fase de despliegue, una unidad aliada puede desplegarse desde la Reserva en contacto con este vehículo, igual que si fuera un puesto de mando. Solo una unidad en la partida, y nunca unidades de rol Pesado ni Fuego pesado.' },
  },
  {
    es: { name: 'Arma secundaria', description: 'Puede disparar dos veces en su activación, a la misma o a distinta unidad. El segundo disparo usa 1D3 ataques en lugar de 1D6.' },
  },
  {
    es: { name: 'Arsenal', description: 'Puede disparar dos veces en su activación, a la misma o a distinta unidad.' },
  },
  {
    es: { name: 'Fuego indirecto', description: 'Esta unidad puede atacar a objetivos sin línea de visión directa, siempre que estén dentro de su Alcance, salvo que el objetivo esté dentro o debajo de escenografía de bloqueo. Esta unidad no puede moverse.' },
  },
  {
    es: { name: 'Fuego de apoyo', description: 'Una vez por turno, cuando otra unidad aliada situada a 6" o menos dispare durante su activación, esta unidad puede abrir fuego contra el mismo objetivo, siempre que esté a su alcance y en línea de visión. Puede hacerlo aunque ya se haya activado.' },
  },
  {
    es: { name: 'Escuadras', description: 'El Capitán se despliega con una escuadra de un solo tipo de unidad y pasa a ser un integrante más, con el mismo perfil. En cada fase de despliegue puede unirse a la escuadra una miniatura más de ese tipo.' },
  },
  {
    es: { name: 'Curación', description: 'Ocupa toda la activación. Una unidad aliada a 3" o menos recupera 1 Vida. No puede curarse a sí misma.' },
  },
  {
    es: { name: 'Telequinesis', description: 'Ocupa toda la activación y mueve una unidad enemiga a 12" o menos hasta 3". No puede dejarla a menos de 1" de otra unidad.' },
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

export const getUnitSpecialtyDescription = (value) =>
  getUnitSpecialtyEntry(value)?.es?.description || ''

export const resolveUnitSpecialtyDescription = (value) =>
  getUnitSpecialtyDescription(value) || String(value || '').trim()
