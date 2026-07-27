const normalizeKey = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const UNIT_SPECIALTIES = [
  {
    es: { name: 'Soldado', description: 'Esta unidad no tiene ninguna especialidad.' },
    en: { name: 'Soldier', description: 'This unit has no specialty.' },
  },
  {
    es: { name: 'Resistente', description: 'La primera vez cada turno que esta unidad reciba daño, reduce ese daño en 1D3.' },
    en: { name: 'Resilient', description: 'The first time each turn this unit suffers damage, reduce that damage by 1D3.' },
  },
  {
    es: { name: 'Soporte', description: 'En su activación, en lugar de actuar, puede curar a una unidad aliada a 6" o menos: esa unidad recupera 1D3 Vidas perdidas.' },
    en: { name: 'Support', description: 'During its activation, instead of acting, it may heal an allied unit within 6": that unit recovers 1D3 lost Wounds.' },
  },
  {
    es: { name: 'Evasivo', description: 'La primera vez cada turno que esta unidad sea objetivo de un ataque de Disparo, puede moverse hasta 2" antes de resolver el ataque.' },
    en: { name: 'Evasive', description: 'The first time each turn this unit is targeted by a Shooting attack, it may move up to 2" before resolving the attack.' },
  },
  {
    es: { name: 'Guardia', description: 'Una vez por turno, cuando una unidad aliada a 6" o menos reciba daño, esta unidad puede recibir hasta 2 puntos de ese daño en su lugar.' },
    en: { name: 'Guard', description: 'Once per turn, when an allied unit within 6" suffers damage, this unit may suffer up to 2 points of that damage instead.' },
  },
  {
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden realizar la acción Destrabarse.' },
    en: { name: 'Anchored', description: 'Enemy units locked with this unit cannot perform the Disengage action.' },
  },
  {
    es: { name: 'Despiadado', description: 'Cuando esta unidad inflige daño en cuerpo a cuerpo, los impactos críticos infligen +1 daño crítico.' },
    en: { name: 'Ruthless', description: 'When this unit deals damage in melee, critical hits inflict +1 critical damage.' },
  },
  {
    es: { name: 'Berserker', description: 'Las unidades enemigas que ataquen a esta unidad en CaC fallan sus ataques con resultados naturales de 1, 2 o 3.' },
    en: { name: 'Berserker', description: 'Enemy units attacking this unit in melee miss on natural results of 1, 2, or 3.' },
  },
  {
    es: { name: 'Certero', description: 'Cuando esta unidad realiza una Maniobra, no empeora la Precisión de su ataque por haberse movido.' },
    en: { name: 'Accurate', description: 'When this unit performs a Maneuver, its attack does not worsen its Precision for having moved.' },
  },
  {
    es: { name: 'Bloqueo de refuerzos', description: 'Mientras esta unidad esté a 3" o menos de un puesto de mando enemigo, ese puesto de mando no puede desplegar refuerzos.' },
    en: { name: 'Reinforcement Blockade', description: 'While this unit is within 3" of an enemy command post, that command post cannot deploy reinforcements.' },
  },
  {
    es: { name: 'Asentado', description: 'Esta unidad no puede moverse y bloquea el despliegue de refuerzos en su puesto de mando. Si el jugador solo tiene 1 puesto de mando o CG, no puede ser desplegada.' },
    en: { name: 'Emplaced', description: 'This unit cannot move and blocks reinforcement deployment at its command post. If its player only has 1 command post or HQ, it cannot be deployed.' },
  },
  {
    es: { name: 'Capturador', description: 'Esta unidad cuenta como el doble de su Valor al controlar o disputar puestos de mando.' },
    en: { name: 'Captor', description: 'This unit counts as double its Value when controlling or contesting command posts.' },
  },
  {
    es: { name: 'Avanzadilla', description: 'Puede ser desplegada a 9" de un puesto de mando aliado.' },
    en: { name: 'Vanguard', description: 'It may be deployed within 9" of an allied command post.' },
  },
  {
    es: { name: 'Devorador', description: 'Cuando esta unidad destruye una unidad enemiga en CaC, recupera 1D3 Vidas perdidas.' },
    en: { name: 'Devourer', description: 'When this unit destroys an enemy unit in melee, it recovers 1D3 lost Wounds.' },
  },
  {
    es: { name: 'Porrazo', description: 'En su activación, esta unidad puede realizar la acción Destrabarse sin efectuar el chequeo. Puede hacerlo aunque esté trabada con una unidad con Anclado.' },
    en: { name: 'Shove', description: 'During its activation, this unit may perform the Disengage action without making the check. It may do so even while locked with a unit that has Anchored.' },
  },
  {
    es: { name: 'Terror', description: 'Las unidades enemigas a 3" o menos de esta unidad no pueden usar sus especialidades.' },
    en: { name: 'Terror', description: 'Enemy units within 3" of this unit cannot use their specialties.' },
  },
  {
    es: { name: 'Tirador', description: 'Cuando esta unidad realiza la acción Disparar, puede atacar una vez con cada una de sus armas a distancia, al mismo objetivo o a objetivos distintos.' },
    en: { name: 'Shooter', description: 'When this unit performs the Shoot action, it may attack once with each of its ranged weapons, at the same target or different targets.' },
  },
  {
    es: { name: 'Cobertura móvil', description: 'Las unidades aliadas a 3" o menos de esta unidad cuentan como en cobertura contra ataques de Disparo.' },
    en: { name: 'Mobile Cover', description: 'Allied units within 3" of this unit count as being in cover against Shooting attacks.' },
  },
  {
    es: { name: 'Volador', description: 'Esta unidad ignora terreno y obstáculos durante el movimiento, y puede ascender diagonalmente sin coste adicional. No puede acabar su movimiento sobre otras miniaturas.' },
    en: { name: 'Flying', description: 'This unit ignores terrain and obstacles during movement, and may climb diagonally at no additional cost. It cannot end its movement on top of other miniatures.' },
  },
  {
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una carga contra una unidad, gana +1 dado de ataque CaC durante ese combate.' },
    en: { name: 'Brutal Charge', description: 'When this unit charges a unit, it gains +1 melee attack die during that combat.' },
  },
  {
    es: { name: 'Descontrol', description: 'Si esta unidad llega al 50% de su vida, ataca a la unidad aliada o enemiga más cercana cuerpo a cuerpo, sumando 1D más de ataque. Si ya está trabada, continúa. Si no tiene ninguna unidad cercana, se mueve hacia ella.' },
    en: { name: 'Rampage', description: 'If this unit reaches 50% of its Wounds, it attacks the nearest allied or enemy unit in melee, adding 1D more to the attack. If already locked, it continues. If no unit is nearby, it moves toward the closest one.' },
  },
  {
    es: { name: 'Boom!', description: 'Cuando esta unidad muere explota afectando a unidades que estén a 6" de esta, infligiendo 1D6.' },
    en: { name: 'Boom!', description: 'When this unit dies, it explodes and affects units within 6" of it, inflicting 1D6.' },
  },
  {
    es: { name: 'Aplastamiento', description: 'Durante su carga, si traba a una unidad de Línea o Élite, dicha unidad recibe automáticamente 1D3 de daño.' },
    en: { name: 'Crushing', description: 'During its charge, if it locks a Line or Elite unit, that unit automatically suffers 1D3 damage.' },
  },
  {
    es: { name: 'Contragolpe', description: 'La primera vez cada turno que esta unidad sea atacada en cuerpo a cuerpo —aunque no sea su activación—, responde de inmediato con un ataque cuerpo a cuerpo gratuito contra el atacante. No consume acción.' },
    en: { name: 'Counter', description: 'The first time each turn this unit is attacked in melee — even if it is not its activation — it immediately responds with a free melee attack against the attacker. This does not use an action.' },
  },
  {
    es: { name: 'Preparado', description: 'La primera vez cada turno que esta unidad sea atacada a distancia, tras resolver el ataque puede disparar de inmediato con una de sus armas a distancia contra el atacante, si está en alcance y línea de visión. No consume acción.' },
    en: { name: 'Ready', description: 'The first time each turn this unit is targeted by a ranged attack, after resolving the attack it may immediately fire one of its ranged weapons at the attacker, if in range and line of sight. This does not use an action.' },
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
