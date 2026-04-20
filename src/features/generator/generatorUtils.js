export const factionImages = {
  alianza: new URL('../../images/faccion/alianza.svg', import.meta.url).href,
  paladines: new URL('../../images/faccion/paladines.svg', import.meta.url).href,
  salvajes: new URL('../../images/faccion/salvajes.svg', import.meta.url).href,
  vacio: new URL('../../images/faccion/vacio.svg', import.meta.url).href,
  misticos: new URL('../../images/faccion/misticos.svg', import.meta.url).href,
  segadores: new URL('../../images/faccion/segadores.svg', import.meta.url).href,
  enjambre: new URL('../../images/faccion/enjambre.svg', import.meta.url).href,
  imperio: new URL('../../images/faccion/imperio.svg', import.meta.url).href,
  tecnocratas: new URL('../../images/faccion/tecnocratas.svg', import.meta.url).href,
}

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const isFactionData = (data) => data && data.faccion && Array.isArray(data.unidades)

const normalizeSquadBounds = (minRaw, maxRaw) => {
  const min = toNumber(minRaw)
  const max = toNumber(maxRaw)
  const safeMin = min > 0 ? min : 1
  const safeMax = max >= safeMin ? max : safeMin
  return { min: safeMin, max: safeMax }
}

export const clampSquadSize = (value, unit) => {
  const next = toNumber(value)
  const min = unit?.escuadra_min ?? 1
  const max = unit?.escuadra_max ?? min
  if (!Number.isFinite(next)) return min
  return Math.min(max, Math.max(min, next))
}

const normalizeTextValue = (value, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const parseFactionSkillCostFromName = (value) => {
  const match = String(value || '').match(/-\s*(\d+)\s*(?:valor|value)\b/i)
  if (!match) return 0
  return toNumber(match[1])
}

const stripFactionSkillCostFromName = (value) =>
  String(value || '')
    .replace(/\s*-\s*\d+\s*(?:valor|value)\b\s*$/i, '')
    .trim()

const getWeaponLimitFromAbilities = (abilities) => {
  if (!Array.isArray(abilities)) return null
  for (const raw of abilities) {
    const match = String(raw || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/(?:arma limitada|municion limitada|weapon limited|limited weapon|limited ammo)\s*\(?\s*(\d+)\s*\)?/)
    if (match) {
      const parsed = Number.parseInt(match[1], 10)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }
  return null
}

const stripWeaponLimitAbilities = (abilities) =>
  (Array.isArray(abilities) ? abilities : []).filter((raw) => {
    const normalized = String(raw || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    return !/(?:arma limitada|municion limitada|weapon limited|limited weapon|limited ammo)\s*\(?\s*\d+\s*\)?/.test(normalized)
  })

export const getWeaponLimit = (weapon) => {
  const raw = weapon?.limitacion ?? weapon?.limite ?? weapon?.weapon_limit
  const parsed = Number.isFinite(Number(raw)) ? Number(raw) : null
  if (parsed && parsed > 0) return parsed
  return getWeaponLimitFromAbilities(weapon?.habilidades || weapon?.habilidades_arma || null)
}

const normalizeWeapon = (weapon, tipo) => {
  const rawAbilities = weapon.habilidades_arma || weapon.habilidades || []
  const limit = getWeaponLimit({
    ...weapon,
    habilidades: rawAbilities,
    habilidades_arma: rawAbilities,
  })

  return {
  id: slugify(weapon.nombre || weapon.id || `${tipo}-${Math.random()}`),
  nombre: weapon.nombre || weapon.id || 'Arma',
  tipo,
  ataques: weapon.ataques ?? weapon.atq ?? '-',
  distancia: weapon.distancia ?? null,
  impactos: weapon.impactos ? String(weapon.impactos).replace(/^\+?(\d+)\+?$/, '$1+') : null,
  danio: weapon.danio ?? weapon.danio_base ?? '-',
  danio_critico: weapon.danio_critico ?? weapon.critico ?? '-',
  habilidades: stripWeaponLimitAbilities(rawAbilities),
  limite: limit,
  limitacion: limit,
  valor_extra: toNumber(weapon.valor_extra ?? 0),
  }
}

export const getUnitTypeToken = (type) => {
  const normalized = String(type || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('linea') || normalized.includes('line')) return 'line'
  if (normalized.includes('elite')) return 'elite'
  if (normalized.includes('vehiculo') || normalized.includes('vehicle')) return 'vehicle'
  if (normalized.includes('monstruo') || normalized.includes('monster')) return 'monster'
  if (normalized.includes('heroe') || normalized.includes('hero')) return 'hero'
  if (normalized.includes('titan') || normalized.includes('titante')) return 'titan'
  return 'line'
}

const isVehicleType = (type) => getUnitTypeToken(type) === 'vehicle'

const passiveAllowsVehicleDualWeapons = (passiveGroup) => {
  const habilidades = Array.isArray(passiveGroup?.habilidades) ? passiveGroup.habilidades : []
  return habilidades.some((skill) => {
    const id = String(skill?.id || '').toLowerCase()
    const nombre = String(skill?.nombre || '').toLowerCase()
    const descripcion = [
      skill?.descripcion,
      skill?.descripcion_escaramuza,
      skill?.descripcion_escuadra,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    return id === 'potencia-blindada'
      || nombre.includes('potencia blindada')
      || nombre.includes('armored power')
      || (
        (descripcion.includes('veh') || descripcion.includes('vehicle'))
        && (descripcion.includes('dos armas') || descripcion.includes('two ranged weapons'))
      )
  })
}

export const isUnitTypeAllowedInGameMode = (type, gameMode) => {
  if (gameMode !== 'escaramuza') return true
  const normalized = String(type || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return !normalized.includes('vehiculo') && !normalized.includes('vehicle') && !normalized.includes('titan')
}

const getEraToken = (value) => {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (!normalized) return ''
  if (normalized.includes('futuro') || normalized.includes('future')) return 'future'
  if (normalized.includes('pasado') || normalized.includes('past')) return 'past'
  return ''
}

const splitEraValues = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
  const raw = String(value || '').trim()
  if (!raw) return []

  return raw
    .split(/\s*(?:,|\/|\+| y | and |&)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeEraEntries = (value) => {
  const seen = new Set()
  return splitEraValues(value)
    .map((label) => ({
      label,
      token: getEraToken(label) || 'neutral',
    }))
    .filter((entry) => {
      const key = `${entry.token}:${entry.label.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const getFactionAbilityName = (item) => {
  const entries = Object.entries(item || {})
  const nameEntry = entries.find(([key]) =>
    key !== 'id'
    && key !== 'descripcion'
    && key !== 'descripcion_escaramuza'
    && key !== 'descripcion_escuadra'
    && key !== 'coste'
    && key !== 'cost'
    && key !== 'valor'
    && key !== 'valor_habilidad') || []
  return nameEntry[1] || nameEntry[0] || ''
}

const normalizeFactionAbility = (item, idx, factionId) => {
  const rawNombre = getFactionAbilityName(item) || 'Habilidad'
  const nombre = stripFactionSkillCostFromName(rawNombre) || 'Habilidad'
  const descripcion = normalizeTextValue(item?.descripcion, '')
  const descripcionEscaramuza = normalizeTextValue(item?.descripcion_escaramuza ?? descripcion, descripcion)
  const descripcionEscuadra = normalizeTextValue(item?.descripcion_escuadra ?? descripcionEscaramuza, descripcionEscaramuza)
  const coste = toNumber(item?.coste ?? item?.cost ?? item?.valor_habilidad ?? item?.valor ?? parseFactionSkillCostFromName(rawNombre))
  return {
    id: item?.id || `${factionId}-passive-${idx + 1}-${slugify(nombre || idx)}`,
    nombre,
    descripcion: descripcionEscaramuza || descripcionEscuadra || descripcion,
    descripcion_escaramuza: descripcionEscaramuza,
    descripcion_escuadra: descripcionEscuadra,
    coste,
  }
}

export const getFactionSkillDescriptionForMode = (skill, gameMode = 'escaramuza') => {
  if (!skill) return '-'
  if (gameMode === 'escuadra') {
    return normalizeTextValue(skill.descripcion_escuadra ?? skill.descripcion ?? skill.descripcion_escaramuza, '-')
  }
  return normalizeTextValue(skill.descripcion_escaramuza ?? skill.descripcion ?? skill.descripcion_escuadra, '-')
}

const normalizeFactionPassiveGroups = (rawGroups, abilities, factionId) => {
  const abilityLookup = new Map()
  abilities.forEach((ability) => {
    abilityLookup.set(ability.id, ability)
    abilityLookup.set(slugify(ability.nombre), ability)
  })

  const normalizedGroups = (Array.isArray(rawGroups) ? rawGroups : [])
    .map((group, index) => {
      const rawSkills = Array.isArray(group?.habilidades) ? group.habilidades : []
      const habilidades = rawSkills
        .map((entry) => {
          if (typeof entry === 'string') {
            return abilityLookup.get(entry) || abilityLookup.get(slugify(entry)) || null
          }
          if (entry && typeof entry === 'object') {
            const entryId = entry.id || slugify(getFactionAbilityName(entry))
            return abilityLookup.get(entryId) || normalizeFactionAbility(entry, index, factionId)
          }
          return null
        })
        .filter(Boolean)

      if (!habilidades.length) return null

      return {
        id: group?.id || `${factionId}-passive-group-${index + 1}`,
        nombre: group?.nombre || '',
        habilidades,
      }
    })
    .filter(Boolean)

  if (normalizedGroups.length) return normalizedGroups
  if (!abilities.length) return []

  return [
    {
      id: `${factionId}-passive-group-1`,
      nombre: '',
      habilidades: abilities,
    },
  ]
}

const getMaxDisparo = (unit) => {
  const explicit = unit.max_armas_disparo ?? unit.maxArmasDisparo ?? unit.perfil?.max_armas_disparo
  if (explicit) return explicit
  const text = [
    unit.especialidad,
    unit.especialidad_escaramuza,
    unit.especialidad_escuadra,
    unit.perfil?.especialidad,
    unit.perfil?.especialidad_escaramuza,
    unit.perfil?.especialidad_escuadra,
  ]
    .join(' ')
    .toLowerCase()
  if (text.includes('dos armas') || text.includes('2 armas')) return 2
  return 1
}

export const getUnitSpecialtyForMode = (unit, gameMode = 'escaramuza') => {
  if (!unit) return '-'
  if (gameMode === 'escuadra') {
    return normalizeTextValue(unit.especialidad_escuadra ?? unit.especialidad ?? unit.especialidad_escaramuza, '-')
  }
  return normalizeTextValue(unit.especialidad_escaramuza ?? unit.especialidad ?? unit.especialidad_escuadra, '-')
}

const normalizeUnit = (unit, index) => {
  const perfil = unit.perfil || {}
  const armas = unit.armas || {}
  const squadBounds = normalizeSquadBounds(
    perfil.escuadra?.min ?? unit.escuadra_min ?? unit.escuadra?.min,
    perfil.escuadra?.max ?? unit.escuadra_max ?? unit.escuadra?.max,
  )
  const disparo = (armas.disparo || unit.armas_disparo || []).map((weapon) =>
    normalizeWeapon(weapon, 'disparo'),
  )
  const melee = (armas.cuerpo_a_cuerpo || unit.armas_melee || []).map((weapon) =>
    normalizeWeapon(weapon, 'melee'),
  )
  const especialidad = normalizeTextValue(perfil.especialidad ?? unit.especialidad, '-')
  const especialidadEscaramuza = normalizeTextValue(
    perfil.especialidad_escaramuza ?? unit.especialidad_escaramuza ?? perfil.especialidad ?? unit.especialidad,
    especialidad,
  )
  const especialidadEscuadra = normalizeTextValue(
    perfil.especialidad_escuadra ?? unit.especialidad_escuadra ?? perfil.especialidad ?? unit.especialidad,
    especialidadEscaramuza,
  )

  return {
    id: unit.id || slugify(unit.nombre_unidad || unit.nombre || `${index}`),
    nombre: unit.nombre_unidad || unit.nombre || `Unidad ${index + 1}`,
    tipo: unit.clase || unit.tipo || 'Línea',
    eras: normalizeEraEntries(unit.era || unit.zona_temporal || unit.periodo || unit.timeline || ''),
    movimiento: perfil.movimiento ?? unit.movimiento ?? '-',
    vidas: perfil.vidas ?? unit.vidas ?? '-',
    salvacion: String(perfil.salvacion ?? unit.salvacion ?? '-').replace(/^\+?(\d+)\+?$/, '$1+'),
    velocidad: perfil.velocidad ?? unit.velocidad ?? '-',
    escuadra_min: squadBounds.min,
    escuadra_max: squadBounds.max,
    especialidad: especialidadEscaramuza || especialidadEscuadra || especialidad,
    especialidad_escaramuza: especialidadEscaramuza,
    especialidad_escuadra: especialidadEscuadra,
    valor_base: toNumber(perfil.valor ?? unit.valor_base ?? unit.valor ?? 0),
    armas_disparo: disparo,
    armas_melee: melee,
    max_armas_disparo: getMaxDisparo({ ...unit, perfil }),
  }
}

const normalizeUnitsWithDefaultEra = (units, defaultEra = '') =>
  (Array.isArray(units) ? units : []).map((unit) =>
    (unit && typeof unit === 'object' && !Array.isArray(unit) && defaultEra && !unit.era
      ? { ...unit, era: defaultEra }
      : unit))

export const normalizeFaction = (data, index, baseId = '') => {
  const faccion = data.faccion || {}
  const factionId = data.id || baseId || slugify(faccion.nombre || `faccion-${index}`)
  const habilidades = Array.isArray(faccion.habilidades_faccion)
    ? faccion.habilidades_faccion.map((item, idx) => normalizeFactionAbility(item, idx, factionId))
    : []
  const gruposHabilidades = normalizeFactionPassiveGroups(
    faccion.grupos_habilidades_faccion,
    habilidades,
    factionId,
  )

  const unidadesBase = Array.isArray(data.unidades) ? data.unidades : []
  const unidadesFuturo = normalizeUnitsWithDefaultEra(
    data.unidades_futuro ?? data.unidadesFuture ?? data.future_units ?? [],
    'Futuro',
  )
  const unidadesPasado = normalizeUnitsWithDefaultEra(
    data.unidades_pasado ?? data.unidadesPast ?? data.past_units ?? [],
    'Pasado',
  )
  const unidades = [...unidadesBase, ...unidadesFuturo, ...unidadesPasado].map(normalizeUnit)

  return {
    id: factionId,
    nombre: faccion.nombre || `Facción ${index + 1}`,
    estilo: faccion.estilo_juego || faccion.estilo || '',
    seleccion_habilidades:
      faccion.seleccion_habilidades
      || (gruposHabilidades.length ? 'grupo' : 'individual'),
    habilidades_faccion: habilidades,
    grupos_habilidades_faccion: gruposHabilidades,
    unidades,
  }
}

export const applyPassiveGroupEffectsToFaction = (faction, passiveGroup) => {
  if (!faction) return faction
  if (!passiveAllowsVehicleDualWeapons(passiveGroup)) return faction

  return {
    ...faction,
    unidades: (faction.unidades || []).map((unit) =>
      isVehicleType(unit.tipo)
        ? {
            ...unit,
            max_armas_disparo: Math.max(2, unit.max_armas_disparo || 1),
          }
        : unit
    ),
  }
}

export const getWeaponById = (list, id) => list.find((weapon) => weapon.id === id)

export const getWeaponUsageKey = (weapon, type = '') => `${weapon?.tipo || type}:${weapon?.id || ''}`

const addWeaponCount = (counts, weapon, type = '') => {
  if (!weapon?.id) return
  const key = getWeaponUsageKey(weapon, type)
  counts.set(key, (counts.get(key) || 0) + 1)
}

const addWeaponsToCounts = (counts, weapons, type = '') => {
  ;(weapons || []).forEach((weapon) => addWeaponCount(counts, weapon, type))
}

export const getEntryWeaponCounts = (entry) => {
  const counts = new Map()
  if (!entry) return counts

  if (Array.isArray(entry.perMiniLoadouts) && entry.perMiniLoadouts.length) {
    entry.perMiniLoadouts.forEach((loadout) => {
      addWeaponsToCounts(counts, loadout.shooting, 'disparo')
      addWeaponCount(counts, loadout.melee, 'melee')
    })
    return counts
  }

  addWeaponsToCounts(counts, entry.shooting, 'disparo')
  addWeaponCount(counts, entry.melee, 'melee')
  return counts
}

export const getArmyWeaponCounts = (units = [], excludeUid = '') => {
  const counts = new Map()
  ;(units || []).forEach((entry) => {
    if (excludeUid && entry?.uid === excludeUid) return
    const entryCounts = getEntryWeaponCounts(entry)
    entryCounts.forEach((count, key) => {
      counts.set(key, (counts.get(key) || 0) + count)
    })
  })
  return counts
}

export const selectionHasWeaponLimitError = (entry, armyUnits = [], gameMode = 'escuadra', excludeUid = '') => {
  if (!entry) return false
  const entryCounts = getEntryWeaponCounts(entry)
  const armyCounts = gameMode === 'escaramuza' ? getArmyWeaponCounts(armyUnits, excludeUid) : new Map()
  const seen = new Set()
  const weapons = []

  if (Array.isArray(entry.perMiniLoadouts) && entry.perMiniLoadouts.length) {
    entry.perMiniLoadouts.forEach((loadout) => {
      ;(loadout.shooting || []).forEach((weapon) => weapons.push({ weapon, type: 'disparo' }))
      if (loadout.melee) weapons.push({ weapon: loadout.melee, type: 'melee' })
    })
  } else {
    ;(entry.shooting || []).forEach((weapon) => weapons.push({ weapon, type: 'disparo' }))
    if (entry.melee) weapons.push({ weapon: entry.melee, type: 'melee' })
  }

  return weapons.some(({ weapon, type }) => {
    const key = getWeaponUsageKey(weapon, type)
    if (seen.has(key)) return false
    seen.add(key)

    const limit = getWeaponLimit(weapon)
    if (!limit) return false

    const entryCount = entryCounts.get(key) || 0
    if (entryCount > limit) return true

    if (gameMode !== 'escaramuza') return false
    return (armyCounts.get(key) || 0) + entryCount > limit
  })
}

const sumWeaponCost = (weapons) => weapons.reduce((total, weapon) => total + (weapon?.valor_extra || 0), 0)

export const computeUnitTotal = (unit, shooting, melee, squadSize, perMiniLoadouts, gameMode = 'escuadra') => {
  const perMiniCost = (loadout) =>
    unit.valor_base + sumWeaponCost(loadout.shooting) + (loadout.melee?.valor_extra || 0)
  if (Array.isArray(perMiniLoadouts) && perMiniLoadouts.length) {
    return perMiniLoadouts.reduce((total, loadout) => total + perMiniCost(loadout), 0)
  }
  const perMini = perMiniCost({ shooting, melee })
  const clampedSize = gameMode === 'escuadra' ? clampSquadSize(squadSize, unit) : 1
  return perMini * Math.max(1, clampedSize || 1)
}

const randomPick = (list) => list[Math.floor(Math.random() * list.length)]

const weightedRandomPick = (list, getWeight) => {
  const weighted = list
    .map((item) => ({ item, weight: Math.max(0, Number(getWeight(item)) || 0) }))
    .filter((entry) => entry.weight > 0)

  if (!weighted.length) return randomPick(list)

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0)
  let threshold = Math.random() * totalWeight

  for (const entry of weighted) {
    threshold -= entry.weight
    if (threshold <= 0) return entry.item
  }

  return weighted[weighted.length - 1]?.item || randomPick(list)
}

const shuffle = (list) => {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const pickRandomWeaponWithLimits = (options, counts) => {
  if (!options.length) return null
  const available = options.filter((weapon) => {
    const limit = getWeaponLimit(weapon)
    if (!limit) return true
    return (counts.get(weapon.id) || 0) < limit
  })
  if (!available.length) return null
  const pick = randomPick(available)
  if (pick) {
    counts.set(pick.id, (counts.get(pick.id) || 0) + 1)
  }
  return pick
}

const buildRandomSelection = (unit, existingArmyCounts = null) => {
  const shooting = []
  const shootingCounts = new Map(existingArmyCounts?.shooting || [])
  if (unit.armas_disparo.length > 0) {
    const slots = Math.min(unit.max_armas_disparo, unit.armas_disparo.length)
    for (let i = 0; i < slots; i += 1) {
      const pick = pickRandomWeaponWithLimits(unit.armas_disparo, shootingCounts)
      if (!pick) return null
      shooting.push(pick)
    }
  }
  const meleeCounts = new Map(existingArmyCounts?.melee || [])
  const melee = unit.armas_melee.length > 0 ? pickRandomWeaponWithLimits(unit.armas_melee, meleeCounts) : null
  if (unit.armas_melee.length > 0 && !melee) return null
  return { shooting, melee }
}

const buildRandomSquadLoadouts = (unit, squadSize) => {
  const size = clampSquadSize(squadSize, unit)
  const shootingOptions = unit.armas_disparo
  const meleeOptions = unit.armas_melee
  const slots = Math.min(unit.max_armas_disparo, shootingOptions.length)

  const shootingCounts = new Map()
  const meleeCounts = new Map()

  return Array.from({ length: size }, () => {
    const shooting = slots
      ? Array.from({ length: slots }, () => {
          const pool = shuffle(shootingOptions)
          return pickRandomWeaponWithLimits(pool, shootingCounts)
        })
      : []
    const melee = meleeOptions.length
      ? pickRandomWeaponWithLimits(shuffle(meleeOptions), meleeCounts)
      : null
    if (shooting.some((weapon) => !weapon)) return null
    if (meleeOptions.length && !melee) return null
    return { shooting, melee }
  })
}

const getLoadoutSignature = (entry) => {
  if (entry.perMiniLoadouts?.length) {
    const miniSignatures = entry.perMiniLoadouts.map((loadout) => {
      const shooting = loadout.shooting.map((weapon) => weapon.id).join('|')
      const melee = loadout.melee?.id || ''
      return `${shooting}::${melee}`
    })
    return miniSignatures.sort().join('||')
  }
  const shooting = entry.shooting.map((weapon) => weapon.id).join('|')
  const melee = entry.melee?.id || ''
  return `${shooting}::${melee}`
}

const mergeSquads = (units) => {
  const merged = []
  const buckets = new Map()

  units.forEach((entry) => {
    const key = `${entry.base.id}::${getLoadoutSignature(entry)}`
    const existing = buckets.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      buckets.set(key, [entry])
    }
  })

  buckets.forEach((entries) => {
    const ordered = entries.slice().sort((a, b) => (a.squadSize || 0) - (b.squadSize || 0))
    let buffer = null

    ordered.forEach((entry) => {
      if (!buffer) {
        buffer = { ...entry, perMiniLoadouts: entry.perMiniLoadouts ? [...entry.perMiniLoadouts] : null }
        return
      }
      const combinedSize = (buffer.squadSize || 1) + (entry.squadSize || 1)
      if (combinedSize <= buffer.base.escuadra_max) {
        buffer.squadSize = combinedSize
        if (buffer.perMiniLoadouts && entry.perMiniLoadouts) {
          buffer.perMiniLoadouts = [...buffer.perMiniLoadouts, ...entry.perMiniLoadouts]
        }
      } else {
        const total = computeUnitTotal(
          buffer.base,
          buffer.shooting,
          buffer.melee,
          buffer.squadSize,
          buffer.perMiniLoadouts,
        )
        merged.push({ ...buffer, total })
        buffer = { ...entry, perMiniLoadouts: entry.perMiniLoadouts ? [...entry.perMiniLoadouts] : null }
      }
    })

    if (buffer) {
      const total = computeUnitTotal(
        buffer.base,
        buffer.shooting,
        buffer.melee,
        buffer.squadSize,
        buffer.perMiniLoadouts,
      )
      merged.push({ ...buffer, total })
    }
  })

  return merged
}

const getArmyRoleCounts = (units) =>
  units.reduce((counts, entry) => {
    const role = getUnitTypeToken(entry?.base?.tipo || entry?.tipo)
    counts[role] = (counts[role] || 0) + 1
    return counts
  }, {})

const getUnitSelectionWeight = (unit, currentUnits, gameMode) => {
  const role = getUnitTypeToken(unit?.tipo)
  const roleCounts = getArmyRoleCounts(currentUnits)
  const sameUnitCount = currentUnits.filter((entry) => entry?.base?.id === unit?.id).length

  let weight = 1

  switch (role) {
    case 'line':
      weight = roleCounts.line ? (roleCounts.line >= 2 ? 1.5 : 2.4) : 3.2
      break
    case 'elite':
      weight = roleCounts.elite ? 1.45 : 2.1
      break
    case 'hero':
      weight = roleCounts.hero ? 0.3 : 1.1
      break
    case 'vehicle':
      weight = gameMode === 'escuadra' ? (roleCounts.vehicle ? 0.55 : 1) : 0
      break
    case 'monster':
      weight = roleCounts.monster ? 0.6 : 1
      break
    case 'titan':
      weight = roleCounts.titan ? 0.05 : 0.35
      break
    default:
      weight = 1
      break
  }

  if (sameUnitCount >= 2) weight *= 0.35
  else if (sameUnitCount >= 1) weight *= 0.65

  return weight
}

const getArmyGenerationScore = (units, total, target, gameMode) => {
  const roleCounts = getArmyRoleCounts(units)
  const byBase = units.reduce((map, entry) => {
    const key = entry?.base?.id || entry?.uid
    map.set(key, (map.get(key) || 0) + 1)
    return map
  }, new Map())

  let score = target > 0 ? (total / target) * 100 : total

  if (units.length >= 2) score += 6
  if (roleCounts.line) score += 10
  if (roleCounts.line >= 2) score += 3
  if (roleCounts.elite) score += 5
  if (roleCounts.hero) score += 2

  if (gameMode === 'escuadra' && (roleCounts.vehicle || roleCounts.monster || roleCounts.titan)) {
    score += 3
  }

  if (!roleCounts.line) score -= 18
  if (units.length <= 1) score -= 10
  if ((roleCounts.hero || 0) > 1) score -= (roleCounts.hero - 1) * 4
  if ((roleCounts.titan || 0) > 1) score -= (roleCounts.titan - 1) * 8

  byBase.forEach((count) => {
    if (count > 2) {
      score -= (count - 2) * 3
    }
  })

  return score
}

export const buildArmyUnitDisplayNames = (units) => {
  const totals = new Map()
  units.forEach((unit) => {
    const key = unit.base?.id || unit.base?.nombre || unit.uid
    totals.set(key, (totals.get(key) || 0) + 1)
  })

  const seen = new Map()
  return new Map(
    units.map((unit) => {
      const key = unit.base?.id || unit.base?.nombre || unit.uid
      const name = unit.base?.nombre || 'Unidad'
      const currentIndex = (seen.get(key) || 0) + 1
      seen.set(key, currentIndex)
      const displayName =
        (totals.get(key) || 0) > 1 && currentIndex > 1 ? `${name} ${currentIndex}` : name
      return [unit.uid, displayName]
    }),
  )
}

const localizeWeaponList = (weapons, localizedBase, weaponKey) =>
  (weapons || []).map((weapon) => {
    const localized = (localizedBase?.[weaponKey] || []).find((entry) => entry.id === weapon?.id)
    return localized || weapon
  })

export const localizeArmyUnits = (units, faction) => {
  if (!Array.isArray(units) || !units.length) return []
  return units.map((unit) => {
    const localizedBase = faction?.unidades?.find((entry) => entry.id === unit?.base?.id) || unit.base
    const localizedShooting = localizeWeaponList(unit.shooting, localizedBase, 'armas_disparo')
    const localizedMelee = unit.melee
      ? (localizedBase?.armas_melee || []).find((entry) => entry.id === unit.melee.id) || unit.melee
      : null
    const localizedPerMiniLoadouts = Array.isArray(unit.perMiniLoadouts)
      ? unit.perMiniLoadouts.map((loadout) => ({
          shooting: localizeWeaponList(loadout.shooting, localizedBase, 'armas_disparo'),
          melee: loadout.melee
            ? (localizedBase?.armas_melee || []).find((entry) => entry.id === loadout.melee.id) || loadout.melee
            : null,
        }))
      : unit.perMiniLoadouts

    return {
      ...unit,
      base: localizedBase,
      shooting: localizedShooting,
      melee: localizedMelee,
      perMiniLoadouts: localizedPerMiniLoadouts,
    }
  })
}

export const generateArmyByValue = (faction, target, gameMode, unitTypeFilter = null) => {
  if (!faction || !faction.unidades.length) return { faction: null, units: [], total: 0 }
  const allowedUnits = faction.unidades.filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))
  const pool = unitTypeFilter && unitTypeFilter.size
    ? allowedUnits.filter((unit) => unitTypeFilter.has(unit.tipo))
    : allowedUnits
  if (!pool.length) return { faction, units: [], total: 0 }
  const iterations = 200
  let best = { units: [], total: 0, score: Number.NEGATIVE_INFINITY }

  for (let i = 0; i < iterations; i += 1) {
    let total = 0
    const units = []
    let guard = 0
    const armyShootingCounts = new Map()
    const armyMeleeCounts = new Map()

    while (guard < 80) {
      guard += 1
      const unit = weightedRandomPick(pool, (candidate) => getUnitSelectionWeight(candidate, units, gameMode))
      const squadSize =
        gameMode === 'escuadra'
          ? randomPick(
              Array.from(
                { length: Math.max(1, unit.escuadra_max - unit.escuadra_min + 1) },
                (_, idx) => unit.escuadra_min + idx,
              ),
            )
          : 1
      const selection = buildRandomSelection(
        unit,
        gameMode === 'escaramuza'
          ? { shooting: armyShootingCounts, melee: armyMeleeCounts }
          : null,
      )
      if (!selection) continue
      const perMiniLoadouts =
        gameMode === 'escuadra' ? buildRandomSquadLoadouts(unit, squadSize) : null
      if (gameMode === 'escuadra' && (!perMiniLoadouts || perMiniLoadouts.some((loadout) => !loadout))) continue
      const cost = computeUnitTotal(unit, selection.shooting, selection.melee, squadSize, perMiniLoadouts, gameMode)
      const candidateEntry = {
        shooting: selection.shooting,
        melee: selection.melee,
        perMiniLoadouts,
      }
      if (selectionHasWeaponLimitError(candidateEntry, units, gameMode)) continue
      if (total + cost <= target) {
        units.push({
          uid: `${unit.id}-${Date.now()}-${Math.random()}`,
          base: unit,
          shooting: selection.shooting,
          melee: selection.melee,
          squadSize,
          perMiniLoadouts,
          total: cost,
        })
        if (gameMode === 'escaramuza') {
          selection.shooting.forEach((weapon) => {
            armyShootingCounts.set(weapon.id, (armyShootingCounts.get(weapon.id) || 0) + 1)
          })
          if (selection.melee?.id) {
            armyMeleeCounts.set(selection.melee.id, (armyMeleeCounts.get(selection.melee.id) || 0) + 1)
          }
        }
        total += cost
        if (total === target) break
      }
    }

    const score = getArmyGenerationScore(units, total, target, gameMode)

    if (score > best.score || (score === best.score && total > best.total)) {
      best = { units, total, score }
      if (total === target && score >= 100) break
    }
  }

  const normalizedUnits = gameMode === 'escuadra' ? mergeSquads(best.units) : best.units
  const normalizedTotal = normalizedUnits.reduce((sum, unit) => sum + unit.total, 0)
  const normalizedScore = getArmyGenerationScore(normalizedUnits, normalizedTotal, target, gameMode)
  return { faction, units: normalizedUnits, total: normalizedTotal, score: normalizedScore }
}
