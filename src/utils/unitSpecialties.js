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
    en: { name: 'Guard', description: 'Once per turn, when an allied unit within 6" or less suffers damage, this unit may take up to 2 points of that damage instead.' },
  },
  {
    es: { name: 'Certero', description: 'Si esta unidad no se ha movido durante esta activación, mejora en 1 la Precisión de sus ataques a distancia (por ejemplo, de 4+ a 3+).' },
    en: { name: 'Accurate', description: 'If this unit has not moved during this activation, improve the Precision of its ranged attacks by 1 (for example, from 4+ to 3+).' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga contra una unidad, gana +1 dado de ataque CaC durante ese combate.' },
    en: { name: 'Brutal Charge', description: 'When this unit makes a charge against a unit, it gains +1 melee attack die for that combat.' },
  },
  {
    es: { name: 'Resistente', description: 'La primera vez cada turno que esta unidad reciba daño, reduce ese daño en 1D3.' },
    en: { name: 'Resilient', description: 'The first time each turn this unit suffers damage, reduce that damage by 1D3.' },
  },
  {
    es: { name: 'Tirador', description: 'Cuando esta unidad realiza la acción Disparar, repite sus tiradas fallidas de precisión.' },
    en: { name: 'Shooter', description: 'When this unit takes the Shoot action, re-roll its failed precision rolls.' },
  },
  {
    es: { name: 'Berserker', description: 'Las unidades enemigas que ataquen a esta unidad en CaC fallan sus ataques con resultados naturales de 1, 2 o 3.' },
    en: { name: 'Berserker', description: 'Enemy units attacking this unit in melee miss on natural results of 1, 2, or 3.' },
  },
  {
    es: { name: 'Soporte', description: 'En su activación, en lugar de actuar, puede curar a una unidad aliada a 6" o menos: esa unidad recupera 1D3 Vidas perdidas.' },
    en: { name: 'Support', description: 'During its activation, instead of acting, it may heal an allied unit within 6" or less: that unit recovers 1D3 lost Wounds.' },
  },
  {
    es: { name: 'Preparado', description: 'La primera vez cada turno que esta unidad sea atacada a distancia, tras resolver el ataque puede disparar de inmediato con su arma a distancia contra el atacante, si está en alcance y línea de visión. No consume acción.' },
    en: { name: 'Ready', description: 'The first time each turn this unit is attacked at range, after resolving the attack it may immediately shoot with its ranged weapon against the attacker, if it is in range and line of sight. This does not use an action.' },
  },
  {
    es: { name: 'Capturador', description: 'Esta unidad cuenta como el doble de su Valor al controlar o disputar puestos de mando.' },
    en: { name: 'Captor', description: 'This unit counts as double its Value when controlling or contesting command posts.' },
  },
  {
    es: { name: 'Contragolpe', description: 'La primera vez cada turno que esta unidad sea atacada en cuerpo a cuerpo —aunque no sea su activación—, responde de inmediato con un ataque cuerpo a cuerpo gratuito contra el atacante. No consume acción.' },
    en: { name: 'Counterstrike', description: 'The first time each turn this unit is attacked in melee — even if it is not its activation — it immediately responds with a free melee attack against the attacker. This does not use an action.' },
  },
  {
    es: { name: 'Bloqueo de refuerzos', description: 'Mientras esta unidad esté a 3" o menos de un puesto de mando enemigo, ese puesto de mando no puede desplegar refuerzos.' },
    en: { name: 'Reinforcement Blockade', description: 'While this unit is within 3" or less of an enemy command post, that command post cannot deploy reinforcements.' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede ser desplegada a 9" de un puesto de mando aliado.' },
    en: { name: 'Vanguard', description: 'May be deployed within 9" of an allied command post.' },
  },
  {
    es: { name: 'Vuelo', description: 'Esta unidad ignora terreno y obstáculos durante el movimiento, y puede ascender diagonalmente sin coste adicional. No puede acabar su movimiento sobre otras miniaturas o zonas donde no pueda sostenerse.' },
    en: { name: 'Flight', description: 'This unit ignores terrain and obstacles during movement, and may climb diagonally at no additional cost. It cannot end its movement on top of other miniatures or in places where it cannot support itself.' },
  },
  {
    es: { name: 'Porrazo', description: 'En su activación, esta unidad puede realizar la acción Destrabarse sin efectuar el chequeo. Puede hacerlo aunque esté trabada con una unidad con Anclado.' },
    en: { name: 'Shove', description: 'During its activation, this unit may take the Disengage action without making the roll. It may do so even while locked with a unit that has Anchored.' },
  },
  {
    es: { name: 'Terror', description: 'Las unidades enemigas a 12" o menos de esta unidad no pueden disparar a esta unidad.' },
    en: { name: 'Terror', description: 'Enemy units within 12" or less of this unit cannot shoot at this unit.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
    en: { name: 'Anchored', description: 'Enemy units locked with this unit cannot take the Disengage action.' },
  },
  {
    es: { name: '¡Boom!', description: 'Cuando esta unidad muere, explota afectando a las unidades a 6" de ella, infligiendo 1D6 de daño.' },
    en: { name: 'Boom!', description: 'When this unit dies, it explodes, affecting units within 6" of it and inflicting 1D6 damage.' },
  },
  {
    es: { name: 'Cobertura móvil', description: 'Las unidades aliadas a 3" o menos de esta unidad cuentan como en cobertura contra ataques de Disparo.' },
    en: { name: 'Mobile Cover', description: 'Allied units within 3" or less of this unit count as being in cover against Shoot attacks.' },
  },
  {
    es: { name: 'Atropello', description: 'Durante su carga, si traba a una unidad enemiga dicha unidad recibe automáticamente 1D3 de daño.' },
    en: { name: 'Trample', description: 'During its charge, if it locks an enemy unit, that unit automatically suffers 1D3 damage.' },
  },
  {
    es: { name: 'Atrincherado', description: 'No puede moverse. Bloquea los refuerzos aliados en el puesto en el que sea desplegada.' },
    en: { name: 'Entrenched', description: 'Cannot move. Blocks allied reinforcements at the post where it is deployed.' },
  },
  {
    es: { name: 'Avance complicado', description: 'Puede moverse un máximo de 3", pero reduce en -2 el ataque total.' },
    en: { name: 'Difficult Advance', description: 'May move a maximum of 3", but reduces its total attack by -2.' },
  },
]

const buildSpecialtyLookup = (specialties) => {
  const lookup = new Map()
  specialties.forEach((specialty) => {
    ;['es', 'en'].forEach((lang) => {
      const localized = specialty[lang]
      lookup.set(normalizeKey(localized.name), specialty)
      lookup.set(normalizeKey(localized.description), specialty)
    })
  })
  return lookup
}

const UNIT_SPECIALTY_LOOKUP = buildSpecialtyLookup(UNIT_SPECIALTIES)

export const getUnitSpecialtyEntry = (value) => {
  const key = normalizeKey(value)
  return key ? UNIT_SPECIALTY_LOOKUP.get(key) || null : null
}

export const getUnitSpecialtyName = (value, lang = 'es') =>
  getUnitSpecialtyEntry(value)?.[lang]?.name || ''

export const getUnitSpecialtyDescription = (value, lang = 'es') =>
  getUnitSpecialtyEntry(value)?.[lang]?.description || ''

export const resolveUnitSpecialtyDescription = (value, lang = 'es') =>
  getUnitSpecialtyDescription(value, lang) || String(value || '').trim()

export const UNIT_SPECIALTIES_LIST = UNIT_SPECIALTIES
