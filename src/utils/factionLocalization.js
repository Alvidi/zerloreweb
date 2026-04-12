const getModuleData = (module) => module?.default || module || null

const isObject = (value) => value && typeof value === 'object'

const getSkillNameKey = (skill) => Object.keys(skill || {}).find((key) => key !== 'id' && key !== 'descripcion')

const mergeSkillTranslation = (esSkill, enSkill) => {
  const base = isObject(esSkill) ? { ...esSkill } : {}
  if (!isObject(enSkill)) return base

  const esNameKey = getSkillNameKey(esSkill)
  const enNameKey = getSkillNameKey(enSkill)
  if (esNameKey && enNameKey && enSkill[enNameKey]) {
    base[esNameKey] = enSkill[enNameKey]
  }
  if (enSkill.descripcion) {
    base.descripcion = enSkill.descripcion
  }
  return base
}

const mergeWeaponsTranslation = (esWeapons, enWeapons) =>
  (Array.isArray(esWeapons) ? esWeapons : []).map((weapon, index) => ({
    ...weapon,
    nombre: enWeapons?.[index]?.nombre || weapon?.nombre || '',
  }))

const mergeUnitsTranslation = (esUnits, enUnits) =>
  (Array.isArray(esUnits) ? esUnits : []).map((unit, index) => {
    const translated = enUnits?.[index]
    return {
      ...unit,
      nombre_unidad: translated?.nombre_unidad || unit?.nombre_unidad || '',
      clase: translated?.clase || unit?.clase || '',
      perfil: {
        ...(unit?.perfil || {}),
        especialidad: translated?.perfil?.especialidad ?? unit?.perfil?.especialidad ?? '-',
      },
      armas: {
        ...(unit?.armas || {}),
        disparo: mergeWeaponsTranslation(unit?.armas?.disparo, translated?.armas?.disparo),
        cuerpo_a_cuerpo: mergeWeaponsTranslation(unit?.armas?.cuerpo_a_cuerpo, translated?.armas?.cuerpo_a_cuerpo),
      },
    }
  })

const mergePassiveGroupTranslation = (esGroup, enGroup) => {
  const base = isObject(esGroup) ? { ...esGroup } : {}
  if (!isObject(enGroup)) return base

  if (enGroup.id) {
    base.id = enGroup.id
  }
  if (enGroup.nombre) {
    base.nombre = enGroup.nombre
  }
  return base
}

export const mergeFactionLanguageData = ({ esData, enData, lang }) => {
  if (lang !== 'en') return esData || enData || null
  if (!esData) return enData || null
  if (!enData) return esData

  const esFaction = isObject(esData.faccion) ? esData.faccion : {}
  const enFaction = isObject(enData.faccion) ? enData.faccion : {}
  const esSkills = Array.isArray(esFaction.habilidades_faccion) ? esFaction.habilidades_faccion : []
  const enSkills = Array.isArray(enFaction.habilidades_faccion) ? enFaction.habilidades_faccion : []
  const esPassiveGroups = Array.isArray(esFaction.grupos_habilidades_faccion) ? esFaction.grupos_habilidades_faccion : []
  const enPassiveGroups = Array.isArray(enFaction.grupos_habilidades_faccion) ? enFaction.grupos_habilidades_faccion : []

  return {
    ...esData,
    faccion: {
      ...esFaction,
      nombre: enFaction.nombre || esFaction.nombre || '',
      estilo_juego: enFaction.estilo_juego || esFaction.estilo_juego || '',
      habilidades_faccion: esSkills.map((skill, index) => mergeSkillTranslation(skill, enSkills[index])),
      grupos_habilidades_faccion: esPassiveGroups.map((group, index) =>
        mergePassiveGroupTranslation(group, enPassiveGroups[index])),
    },
    unidades: mergeUnitsTranslation(esData.unidades, enData.unidades),
  }
}

export const buildLocalizedFactionEntries = (factionModules, lang) => {
  const esByBase = new Map()
  const enByBase = new Map()

  Object.entries(factionModules).forEach(([path, module]) => {
    const filename = path.split('/').pop() || ''
    if (filename.endsWith('.en.json')) {
      enByBase.set(filename.replace('.en.json', ''), getModuleData(module))
    } else if (filename.endsWith('.json')) {
      esByBase.set(filename.replace('.json', ''), getModuleData(module))
    }
  })

  const bases = Array.from(new Set([...esByBase.keys(), ...enByBase.keys()])).sort()
  return bases
    .map((base) => {
      const data = mergeFactionLanguageData({
        esData: esByBase.get(base),
        enData: enByBase.get(base),
        lang,
      })
      return data ? { base, data } : null
    })
    .filter(Boolean)
}
