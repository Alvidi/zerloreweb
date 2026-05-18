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
    es: { name: 'Soporte', description: 'Esta unidad puede gastar 2 acciones para elegir una unidad aliada a 6" o menos. Esa unidad recupera 1D3 Vidas perdidas.' },
    en: { name: 'Support', description: 'This unit may spend 2 actions to choose an allied unit within 6". That unit recovers 1D3 lost Wounds.' },
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
    es: { name: 'Anclado', description: 'Las unidades enemigas trabadas con esta unidad no pueden declarar Retirada.' },
    en: { name: 'Anchored', description: 'Enemy units locked with this unit cannot declare Retreat.' },
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
    es: { name: 'Certero', description: 'Si esta unidad no se mueve, gana 1 de Precisión en Disparo.' },
    en: { name: 'Accurate', description: 'If this unit does not move, it gains 1 Precision in Shooting.' },
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
    es: { name: 'Porrazo', description: 'Durante su activación, esta unidad puede gastar 1 acción para empujar 1" a una unidad enemiga trabada con ella, terminando el combate cuerpo a cuerpo. Porrazo ignora la habilidad Anclado.' },
    en: { name: 'Shove', description: 'During its activation, this unit may spend 1 action to push an enemy unit locked with it 1", ending the melee combat. Shove ignores Anchored.' },
  },
  {
    es: { name: 'Terror', description: 'Las unidades enemigas a 3" o menos de esta unidad no pueden usar Fichas de Mando para repetir tiradas.' },
    en: { name: 'Terror', description: 'Enemy units within 3" of this unit cannot use Command Tokens to reroll dice.' },
  },
  {
    es: { name: 'Tirador', description: 'Esta unidad puede utilizar dos acciones de ataque a distancia con distintas armas.' },
    en: { name: 'Shooter', description: 'This unit may use two ranged attack actions with different weapons.' },
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
    es: { name: 'Carga brutal', description: 'Cuando esta unidad realiza una Acometida contra una unidad, gana +1 dado de ataque CaC durante ese combate.' },
    en: { name: 'Brutal Charge', description: 'When this unit makes a Rush against a unit, it gains +1 melee attack die during that combat.' },
  },
  {
    es: { name: 'Boom!', description: 'Cuando esta unidad es destruida, explota afectando a todas las unidades a 6" de ella, que reciben 1D6 de daño.' },
    en: { name: 'Boom!', description: 'When this unit is destroyed, it explodes and affects all units within 6" of it, which suffer 1D6 damage.' },
  },
  {
    es: { name: 'Aplastamiento', description: 'Durante su movimiento o Acometida, si esta unidad pasa por encima de una unidad de Línea o Élite, dicha unidad es destruida automáticamente.' },
    en: { name: 'Crushing', description: 'During its movement or Rush, if this unit passes over a Line or Elite unit, that unit is destroyed automatically.' },
  },
  {
    es: { name: 'Mercenario', description: 'Esta unidad puede ser reactivada una segunda vez en el mismo turno gastando 1 Ficha de Mando. Recupera sus 2 acciones para esta segunda activación. Solo puede reactivarse una vez por turno.' },
    en: { name: 'Mercenary', description: 'This unit may be reactivated a second time in the same turn by spending 1 Command Token. It regains its 2 actions for this second activation. It can only be reactivated once per turn.' },
  },
  {
    es: { name: 'Portaestandarte', description: 'Las unidades aliadas a 6" de esta unidad no necesitan realizar chequeos por retirada.' },
    en: { name: 'Standard Bearer', description: 'Allied units within 6" of this unit do not need to make retreat checks.' },
  },
  {
    es: { name: 'Teletransporte', description: 'Esta unidad utiliza las reglas de teletransporte indicadas por su ficha o por su habilidad de facción.' },
    en: { name: 'Teleport', description: 'This unit uses the teleport rules listed on its profile or faction ability.' },
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
