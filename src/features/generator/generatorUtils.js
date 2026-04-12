export const factionImages = {
  alianza: new URL('../../images/faccion/alianza.svg', import.meta.url).href,
  legionarios_crisol: new URL('../../images/faccion/legionarios_crisol.svg', import.meta.url).href,
  salvajes: new URL('../../images/faccion/salvajes.svg', import.meta.url).href,
  vacio: new URL('../../images/faccion/vacio.svg', import.meta.url).href,
  rebeldes: new URL('../../images/faccion/rebeldes.svg', import.meta.url).href,
  tecnotumbas: new URL('../../images/faccion/tecnotumbas.svg', import.meta.url).href,
  enjambre: new URL('../../images/faccion/enjambre.svg', import.meta.url).href,
  federacion: new URL('../../images/faccion/federacion.svg', import.meta.url).href,
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

const normalizeWeapon = (weapon, tipo) => ({
  id: slugify(weapon.nombre || weapon.id || `${tipo}-${Math.random()}`),
  nombre: weapon.nombre || weapon.id || 'Arma',
  tipo,
  ataques: weapon.ataques ?? weapon.atq ?? '-',
  distancia: weapon.distancia ?? null,
  impactos: weapon.impactos ? String(weapon.impactos).replace(/^\+?(\d+)\+?$/, '$1+') : null,
  danio: weapon.danio ?? weapon.danio_base ?? '-',
  danio_critico: weapon.danio_critico ?? weapon.critico ?? '-',
  habilidades: weapon.habilidades_arma || weapon.habilidades || [],
  valor_extra: toNumber(weapon.valor_extra ?? 0),
})

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
  const nameEntry = entries.find(([key]) => key !== 'id' && key !== 'descripcion') || []
  return nameEntry[1] || nameEntry[0] || ''
}

const normalizeFactionAbility = (item, idx, factionId) => {
  const nombre = getFactionAbilityName(item) || 'Habilidad'
  return {
    id: item?.id || `${factionId}-passive-${idx + 1}-${slugify(nombre || idx)}`,
    nombre,
    descripcion: item?.descripcion || '',
  }
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
  const text = `${unit.especialidad || ''} ${unit.perfil?.especialidad || ''}`.toLowerCase()
  if (text.includes('dos armas') || text.includes('2 armas')) return 2
  return 1
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
    especialidad: perfil.especialidad ?? unit.especialidad ?? '-',
    valor_base: toNumber(perfil.valor ?? unit.valor_base ?? unit.valor ?? 0),
    armas_disparo: disparo,
    armas_melee: melee,
    max_armas_disparo: getMaxDisparo({ ...unit, perfil }),
  }
}

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

  const unidades = (data.unidades || []).map(normalizeUnit)

  return {
    id: factionId,
    nombre: faccion.nombre || `Facción ${index + 1}`,
    estilo: faccion.estilo_juego || faccion.estilo || '',
    habilidades_faccion: habilidades,
    grupos_habilidades_faccion: gruposHabilidades,
    unidades,
  }
}

export const getWeaponById = (list, id) => list.find((weapon) => weapon.id === id)

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

const shuffle = (list) => {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

const buildRandomSelection = (unit) => {
  const shooting = []
  if (unit.armas_disparo.length > 0) {
    const slots = Math.min(unit.max_armas_disparo, unit.armas_disparo.length)
    for (let i = 0; i < slots; i += 1) {
      shooting.push(randomPick(unit.armas_disparo))
    }
  }
  const melee = unit.armas_melee.length > 0 ? randomPick(unit.armas_melee) : null
  return { shooting, melee }
}

const buildRandomSquadLoadouts = (unit, squadSize) => {
  const size = clampSquadSize(squadSize, unit)
  const shootingOptions = unit.armas_disparo
  const meleeOptions = unit.armas_melee
  const slots = Math.min(unit.max_armas_disparo, shootingOptions.length)

  const shootingPools = Array.from({ length: slots }, (_, slotIndex) => {
    const pool = shuffle(shootingOptions)
    return pool.map((weapon, idx) => pool[(idx + slotIndex) % pool.length])
  })
  const meleePool = shuffle(meleeOptions)

  return Array.from({ length: size }, (_, miniIndex) => {
    const shooting = slots
      ? Array.from({ length: slots }, (_, slotIndex) => {
          const pool = shootingPools[slotIndex]
          return pool[miniIndex % pool.length]
        })
      : []
    const melee = meleeOptions.length ? meleePool[miniIndex % meleePool.length] : null
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
  let best = { units: [], total: 0 }

  for (let i = 0; i < iterations; i += 1) {
    let total = 0
    const units = []
    let guard = 0

    while (guard < 80) {
      guard += 1
      const unit = randomPick(pool)
      const squadSize =
        gameMode === 'escuadra'
          ? randomPick(
              Array.from(
                { length: Math.max(1, unit.escuadra_max - unit.escuadra_min + 1) },
                (_, idx) => unit.escuadra_min + idx,
              ),
            )
          : 1
      const selection = buildRandomSelection(unit)
      const perMiniLoadouts =
        gameMode === 'escuadra' ? buildRandomSquadLoadouts(unit, squadSize) : null
      const cost = computeUnitTotal(unit, selection.shooting, selection.melee, squadSize, perMiniLoadouts, gameMode)
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
        total += cost
        if (total === target) break
      }
    }

    if (total > best.total) {
      best = { units, total }
      if (total === target) break
    }
  }

  const normalizedUnits = gameMode === 'escuadra' ? mergeSquads(best.units) : best.units
  const normalizedTotal = normalizedUnits.reduce((sum, unit) => sum + unit.total, 0)
  return { faction, units: normalizedUnits, total: normalizedTotal }
}
