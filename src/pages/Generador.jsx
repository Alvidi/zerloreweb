import { useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'

const factionModules = import.meta.glob('../data/**/*.json', { eager: true })

const factionImages = {
  'La Alianza': new URL('../images/alianza.webp', import.meta.url).href,
  'Legionarios del Crisol': new URL('../images/legionarios_crisol.webp', import.meta.url).href,
  Salvajes: new URL('../images/salvajes.webp', import.meta.url).href,
  'El Vacío': new URL('../images/vacio.webp', import.meta.url).href,
  Rebeldes: new URL('../images/rebeldes.webp', import.meta.url).href,
  TecnoTumbas: new URL('../images/tecnotumbas.webp', import.meta.url).href,
  'El Ejambre': new URL('../images/enjambre.webp', import.meta.url).href,
  'La Federación': new URL('../images/federacion.webp', import.meta.url).href,
  Tecnócratas: new URL('../images/tecnocratas.webp', import.meta.url).href,
}

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const isFactionData = (data) => data && data.faccion && Array.isArray(data.unidades)

const normalizeSquadBounds = (minRaw, maxRaw) => {
  const min = toNumber(minRaw)
  const max = toNumber(maxRaw)
  const safeMin = min > 0 ? min : 1
  const safeMax = max >= safeMin ? max : safeMin
  return { min: safeMin, max: safeMax }
}

const clampSquadSize = (value, unit) => {
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
  impactos: weapon.impactos ?? null,
  danio: weapon.danio ?? weapon.danio_base ?? '-',
  danio_critico: weapon.danio_critico ?? weapon.critico ?? '-',
  habilidades: weapon.habilidades_arma || weapon.habilidades || [],
  valor_extra: toNumber(weapon.valor_extra ?? 0),
})

const parseAbilityNumber = (raw) => {
  const text = String(raw || '')
  const plusMatch = text.match(/(\d+)\s*\+/)
  if (plusMatch) return `${plusMatch[1]}+`
  const signedMatch = text.match(/[+-]\s*\d+/)
  if (signedMatch) return signedMatch[0].replace(/\s+/g, '')
  const numMatch = text.match(/\d+/)
  return numMatch ? numMatch[0] : null
}

const ensureSigned = (value) => {
  if (!value) return 'X'
  if (value.startsWith('+') || value.startsWith('-')) return value
  if (value.endsWith('+')) return value
  return `+${value}`
}

const normalizeAntiValue = (value) => {
  if (!value) return 'X+'
  if (value.endsWith('+')) return value
  if (value.startsWith('+')) return `${value.slice(1)}+`
  if (value.startsWith('-')) return `${value}+`
  return `${value}+`
}

const normalizeLimitedValue = (value) => {
  if (!value) return 'X'
  if (value.endsWith('+')) return value.slice(0, -1)
  if (value.startsWith('+')) return value.slice(1)
  return value
}

const getAbilityDescription = (ability) => {
  if (!ability) return ''
  const raw = String(ability).trim()
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const value = parseAbilityNumber(raw)

  if (key.startsWith('asaltante')) {
    return `El objetivo pierde ${ensureSigned(value)} a su Salvación frente a ese ataque.`
  }
  if (key.startsWith('pesada')) {
    return 'Si se ha movido: +1 al valor de Impactos. Si no se ha movido: -1 al valor de Impactos.'
  }
  if (key.startsWith('ataque rapido')) {
    return `A mitad o menos del alcance, suma ${ensureSigned(value)} Ataques.`
  }
  if (key.startsWith('pistolero')) {
    return 'Puede disparar trabada, solo contra la unidad con la que combate cuerpo a cuerpo.'
  }
  if (key.startsWith('explosiva')) {
    return 'Afecta a un radio de 3” desde el punto de impacto.'
  }
  if (key.startsWith('ataque critico')) {
    return 'Los impactos críticos no pueden ser salvados.'
  }
  if (key.startsWith('impactos encadenados')) {
    return 'Cada ataque crítico genera un ataque adicional que se resuelve de forma normal.'
  }
  if (key.startsWith('precision')) {
    return 'Repite todas las tiradas fallidas de ataque.'
  }
  if (key.startsWith('anti')) {
    return `Contra el tipo indicado, los resultados de ${normalizeAntiValue(value)} son críticos.`
  }
  if (key.startsWith('ignora coberturas')) {
    return 'El objetivo no puede beneficiarse de ningún bono defensivo por cobertura parcial.'
  }
  if (key.startsWith('disparo parabolico')) {
    return 'Puede disparar sin línea de visión, siempre que el objetivo no esté cubierto.'
  }
  if (key.startsWith('inestable')) {
    return 'Tras atacar, tira 1D6: con 1-2, la unidad recibe el mismo daño que recibió el objetivo.'
  }
  if (key.startsWith('directo')) {
    return 'Impacta automáticamente, sin tirada de Impactos.'
  }
  if (key.startsWith('guerrilla')) {
    return 'Puede hacer una acción extra de disparo después de usar Carrera.'
  }
  if (key.startsWith('municion limitada')) {
    return `Tiene ${normalizeLimitedValue(value)} disparos limitados con esta arma.`
  }

  return ''
}

const formatAbilityLabel = (label) => {
  const raw = String(label || '').trim()
  if (!raw) return ''
  return raw
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
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
    movimiento: perfil.movimiento ?? unit.movimiento ?? '-',
    vidas: perfil.vidas ?? unit.vidas ?? '-',
    salvacion: perfil.salvacion ?? unit.salvacion ?? '-',
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

const normalizeFaction = (data, index) => {
  const faccion = data.faccion || {}
  const habilidades = Array.isArray(faccion.habilidades_faccion)
    ? faccion.habilidades_faccion.map((item, idx) => {
      const entries = Object.entries(item || {})
      const nameEntry = entries.find(([key]) => key !== 'descripcion') || []
      return {
        id: `${index}-${idx}`,
        nombre: nameEntry[1] || nameEntry[0] || 'Habilidad',
        descripcion: item.descripcion || '',
      }
    })
    : []

  const unidades = (data.unidades || []).map(normalizeUnit)

  return {
    id: data.id || slugify(faccion.nombre || `faccion-${index}`),
    nombre: faccion.nombre || `Facción ${index + 1}`,
    estilo: faccion.estilo_juego || faccion.estilo || '',
    habilidades_faccion: habilidades,
    unidades,
  }
}

const getWeaponById = (list, id) => list.find((weapon) => weapon.id === id)

const sumWeaponCost = (weapons) => weapons.reduce((total, weapon) => total + (weapon?.valor_extra || 0), 0)

const computeUnitTotal = (unit, shooting, melee, squadSize, perMiniLoadouts, gameMode = 'escuadra') => {
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

const generateArmyByValue = (faction, target, gameMode, unitTypeFilter = null) => {
  if (!faction || !faction.unidades.length) return { faction: null, units: [], total: 0 }
  const pool = unitTypeFilter && unitTypeFilter.size
    ? faction.unidades.filter((unit) => unitTypeFilter.has(unit.tipo))
    : faction.unidades
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

function Generador() {
  const factions = useMemo(() => {
    return Object.values(factionModules)
      .map((module) => module.default || module)
      .filter(isFactionData)
      .map(normalizeFaction)
  }, [])

  const [mode, setMode] = useState('manual')
  const [gameMode, setGameMode] = useState('escaramuza')
  const [selectedFactionId, setSelectedFactionId] = useState(factions[0]?.id || '')
  const getSavedArmy = () => {
    if (typeof window === 'undefined') return { units: [], factionId: '' }
    const saved = window.localStorage.getItem('zerolore_army_v1')
    if (!saved) return { units: [], factionId: '' }
    try {
      const parsed = JSON.parse(saved)
      if (parsed?.units && Array.isArray(parsed.units)) {
        return { units: parsed.units, factionId: parsed.factionId || '' }
      }
    } catch {
      // Ignore invalid cache
    }
    return { units: [], factionId: '' }
  }

  const initialSaved = getSavedArmy()
  const [armyFactionId, setArmyFactionId] = useState(initialSaved.factionId)
  const [armyUnits, setArmyUnits] = useState(initialSaved.units)
  const [activeUnit, setActiveUnit] = useState(null)
  const [targetValue, setTargetValue] = useState(40)
  const [randomFactionId, setRandomFactionId] = useState('random')
  const [unitTypeFiltersManual, setUnitTypeFiltersManual] = useState(() => new Set())
  const [unitTypeFiltersRandom, setUnitTypeFiltersRandom] = useState(() => new Set())

  const selectedFaction = factions.find((faction) => faction.id === selectedFactionId) || null
  const armyFaction = factions.find((faction) => faction.id === armyFactionId) || selectedFaction
  const availableUnitTypes = useMemo(() => {
    if (!selectedFaction?.unidades?.length) return []
    const types = new Set(selectedFaction.unidades.map((unit) => unit.tipo))
    return Array.from(types)
  }, [selectedFaction])
  const randomFaction = randomFactionId === 'random'
    ? null
    : factions.find((faction) => faction.id === randomFactionId)
  const availableUnitTypesRandom = useMemo(() => {
    if (randomFaction) {
      return Array.from(new Set(randomFaction.unidades.map((unit) => unit.tipo)))
    }
    const types = new Set()
    factions.forEach((faction) => {
      faction.unidades.forEach((unit) => types.add(unit.tipo))
    })
    return Array.from(types)
  }, [randomFaction, factions, randomFactionId])

  const totalValue = armyUnits.reduce((total, unit) => total + unit.total, 0)

  useEffect(() => {
    const payload = JSON.stringify({ units: armyUnits, factionId: armyFactionId })
    window.localStorage.setItem('zerolore_army_v1', payload)
  }, [armyUnits, armyFactionId])

  const handleFactionChange = (event) => {
    const next = event.target.value
    setSelectedFactionId(next)
    setArmyUnits([])
    setArmyFactionId(next)
  }

  useEffect(() => {
    if (!availableUnitTypes.length) {
      setUnitTypeFiltersManual(new Set())
      return
    }
    setUnitTypeFiltersManual(new Set(availableUnitTypes))
  }, [availableUnitTypes])

  useEffect(() => {
    if (!availableUnitTypesRandom.length) {
      setUnitTypeFiltersRandom(new Set())
      return
    }
    setUnitTypeFiltersRandom(new Set(availableUnitTypesRandom))
  }, [availableUnitTypesRandom])

  const handleToggleUnitTypeManual = (type) => {
    setUnitTypeFiltersManual((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleToggleUnitTypeRandom = (type) => {
    setUnitTypeFiltersRandom((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleOpenConfigurator = (unit) => {
    setActiveUnit(unit)
  }

  const handleAddUnit = (unit, shooting, melee, squadSize, perMiniLoadouts) => {
    const clampedSize = gameMode === 'escuadra' ? clampSquadSize(squadSize, unit) : 1
    const total = computeUnitTotal(unit, shooting, melee, clampedSize, perMiniLoadouts, gameMode)
    const entry = {
      uid: `${unit.id}-${Date.now()}-${Math.random()}`,
      base: unit,
      shooting,
      melee,
      squadSize: clampedSize,
      perMiniLoadouts,
      total,
    }
    setArmyUnits((prev) => [...prev, entry])
    setArmyFactionId(selectedFactionId)
    setActiveUnit(null)
  }

  const handleRemoveUnit = (uid) => {
    setArmyUnits((prev) => prev.filter((unit) => unit.uid !== uid))
  }

  const handleEditUnit = (unit) => {
    setActiveUnit(unit)
  }

  const handleReset = () => {
    setArmyUnits([])
    setArmyFactionId('')
  }

  const handleGenerateRandom = () => {
    if (!factions.length) return
    const faction =
      randomFactionId === 'random'
        ? randomPick(factions)
        : factions.find((item) => item.id === randomFactionId)
    const target = toNumber(targetValue)
    const result = generateArmyByValue(
      faction,
      target,
      gameMode,
      unitTypeFiltersRandom.size ? unitTypeFiltersRandom : null,
    )
    setArmyUnits(result.units)
    setArmyFactionId(result.faction?.id || '')
  }

  const loadImageAsDataUrl = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = src
    })

  const exportPdf = async () => {
    if (!armyUnits.length) return
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12
    const usableWidth = pageWidth - margin * 2
    let y = margin

    const ensureSpace = (height) => {
      if (y + height > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    const getLineHeight = (fontSize, multiplier = 1.2) => {
      doc.setFontSize(fontSize)
      return doc.getTextDimensions('Mg').h * multiplier
    }

    const drawSectionTitle = (text, bold = false) => {
      ensureSpace(10)
      doc.setFontSize(12)
      doc.setTextColor(20)
      doc.setFont(bold ? 'helvetica' : 'helvetica', bold ? 'bold' : 'normal')
      doc.text(text, margin, y)
      doc.setFont('helvetica', 'normal')
      y += 6
      doc.setDrawColor(200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4
    }

    const drawTextBlock = (text, fontSize = 9, width = usableWidth) => {
      doc.setFontSize(fontSize)
      doc.setTextColor(40)
      const lines = doc.splitTextToSize(text, width)
      const lineHeight = getLineHeight(fontSize)
      lines.forEach((line) => {
        ensureSpace(lineHeight)
        doc.text(line, margin, y)
        y += lineHeight
      })
    }

    const drawBulletItem = (title, description, fontSize = 9) => {
      const lineHeight = getLineHeight(fontSize)
      ensureSpace(lineHeight)
      doc.setFontSize(fontSize)
      doc.setTextColor(40)
      doc.setFont('helvetica', 'bold')
      doc.text(`• ${title}`, margin, y)
      doc.setFont('helvetica', 'normal')
      y += lineHeight
      if (!description) return
      const lines = doc.splitTextToSize(description, usableWidth - 6)
      lines.forEach((line) => {
        ensureSpace(lineHeight)
        doc.text(line, margin + 6, y)
        y += lineHeight
      })
    }

    const drawTable = ({
      columns,
      rows,
      columnWidths,
      compact = false,
      headerFill = [240, 246, 255],
      rowFill = [252, 252, 252],
    }) => {
      const baseRowHeight = compact ? 5.2 : 6.5
      const headerHeight = compact ? 5.5 : 6.8
      ensureSpace(headerHeight + 4)
      let x = margin
      doc.setFillColor(...headerFill)
      doc.rect(margin, y, usableWidth, headerHeight, 'F')
      doc.setDrawColor(210)
      doc.rect(margin, y, usableWidth, headerHeight)
      doc.setFontSize(compact ? 7.6 : 8.4)
      doc.setTextColor(20)
      columns.forEach((label, idx) => {
        const width = columnWidths[idx]
        doc.text(label, x + 2, y + (compact ? 3.9 : 4.5))
        x += width
      })
      y += headerHeight

      rows.forEach((row, rowIndex) => {
        const rowLines = row.map((cell, idx) => {
          const width = columnWidths[idx] - 4
          const text = String(cell ?? '–')
          doc.setFontSize(compact ? 7.8 : 8.6)
          return doc.splitTextToSize(text, width)
        })
        const lineHeight = getLineHeight(compact ? 7.8 : 8.6, 1.1)
        const rowHeight = Math.max(baseRowHeight, Math.max(...rowLines.map((lines) => lines.length)) * lineHeight + 1)
        ensureSpace(rowHeight + 2)
        doc.setDrawColor(225)
        if (rowIndex % 2 === 0) {
          doc.setFillColor(...rowFill)
          doc.rect(margin, y, usableWidth, rowHeight, 'F')
        }
        doc.rect(margin, y, usableWidth, rowHeight)
        let cx = margin
        row.forEach((cell, idx) => {
          const width = columnWidths[idx]
          const lines = rowLines[idx]
          doc.setFontSize(compact ? 7.8 : 8.6)
          doc.setTextColor(40)
          lines.forEach((line, lineIndex) => {
            doc.text(line, cx + 2, y + 4 + lineIndex * lineHeight, { maxWidth: width - 4 })
          })
          cx += width
        })
        y += rowHeight
      })

      y += 4
    }

    const drawStatsTable = (unit) => {
      const columnWidths = [18, 18, 18, 18, 26, usableWidth - (18 + 18 + 18 + 18 + 26)]
      const headerHeight = 7
      const baseRowHeight = 6.5
      const especialidad = String(unit.base.especialidad || '-')
      doc.setFontSize(8.5)
      const specialLines = doc.splitTextToSize(especialidad, columnWidths[5] - 4)
      const rowHeight = Math.max(baseRowHeight, specialLines.length * 4.2 + 2)

      ensureSpace(headerHeight + rowHeight + 6)
      let x = margin
      doc.setFillColor(240, 246, 255)
      doc.rect(margin, y, usableWidth, headerHeight, 'F')
      doc.setDrawColor(210)
      doc.rect(margin, y, usableWidth, headerHeight)
      doc.setFontSize(8)
      doc.setTextColor(20)
      const columns = ['Mov', 'Vidas', 'Salv', 'Vel', 'Escuadra', 'Especialidad']
      columns.forEach((label, idx) => {
        const width = columnWidths[idx]
        doc.text(label, x + 2, y + 4.5)
        x += width
      })
      y += headerHeight

      ensureSpace(rowHeight + 2)
      doc.setDrawColor(225)
      doc.rect(margin, y, usableWidth, rowHeight)
      doc.setFontSize(8.5)
      doc.setTextColor(40)
      let cx = margin
      const cells = [
        unit.base.movimiento,
        unit.base.vidas,
        unit.base.salvacion,
        unit.base.velocidad,
        unit.squadSize || 1,
        specialLines,
      ]
      cells.forEach((cell, idx) => {
        const width = columnWidths[idx]
        if (idx === 5 && Array.isArray(cell)) {
          cell.forEach((line, lineIndex) => {
            doc.text(line, cx + 2, y + 4.6 + lineIndex * 4.2, { maxWidth: width - 4 })
          })
        } else {
          doc.text(String(cell ?? '-'), cx + 2, y + 4.6, { maxWidth: width - 4 })
        }
        cx += width
      })
      y += rowHeight + 4
    }

    const drawSubheader = (text, fill) => {
      ensureSpace(7)
      doc.setFillColor(...fill)
      doc.rect(margin, y, usableWidth, 6.5, 'F')
      doc.setFontSize(9.5)
      doc.setTextColor(20)
      doc.text(text, margin + 2, y + 4.6)
      y += 7.5
    }

    const logoSource = armyFaction?.nombre ? factionImages[armyFaction.nombre] : null
    const logoDataUrl = logoSource ? await loadImageAsDataUrl(logoSource).catch(() => null) : null
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, y - 2, 16, 16)
    }
    doc.setFontSize(18)
    doc.setTextColor(10)
    const headerX = margin + (logoDataUrl ? 20 : 0)
    const headerText = `ROSTER – ${armyFaction?.nombre || 'Ejército'}`
    doc.text(headerText, headerX, y + 6)
    y += 12
    doc.setFontSize(10)
    doc.setTextColor(50)
    if (logoDataUrl) {
      y = Math.max(y, margin + 18)
    }
    const headerMeta = `Facción: ${armyFaction?.nombre || '—'} | Puntos/Valor: ${totalValue}`
    const metaLines = doc.splitTextToSize(headerMeta, usableWidth)
    const metaLineHeight = getLineHeight(10)
    metaLines.forEach((line) => {
      ensureSpace(metaLineHeight)
      doc.text(line, headerX, y)
      y += metaLineHeight
    })
    y += 2
    if (armyFaction?.habilidades_faccion?.length) {
      drawSectionTitle('Doctrinas / Habilidades de facción', true)
      armyFaction.habilidades_faccion.slice(0, 6).forEach((habilidad) => {
        drawBulletItem(habilidad.nombre, habilidad.descripcion, 9)
      })
      y += 2
    }

    drawSectionTitle('Unidades')

    armyUnits.forEach((unit, unitIndex) => {
      ensureSpace(50)
      if (y > pageHeight - margin - 60) {
        doc.addPage()
        y = margin
      }
      y += 2
      doc.setFontSize(13)
      doc.setTextColor(20)
      const isSquad = gameMode === 'escuadra' && unit.squadSize > 1
      const squadLabel = isSquad ? `Escuadra ${unitIndex + 1}: ` : ''
      const squadCount = isSquad ? ` x${unit.squadSize || 1}` : ''
      doc.text(`${squadLabel}${unit.base.nombre}${squadCount} (${unit.base.tipo})`, margin, y)
      doc.setFontSize(9.5)
      doc.setTextColor(60)
      doc.text(`${unit.total} valor`, pageWidth - margin - 25, y)
      y += 6

      drawStatsTable(unit)

      const buildGroupedWeapons = (loadouts, listKey) => {
        const counts = new Map()
        const weaponsByName = new Map()
        loadouts.forEach((loadout) => {
          const value = loadout[listKey]
          const list = Array.isArray(value) ? value : value ? [value] : []
          list.forEach((weapon) => {
            const name = weapon?.nombre || '–'
            counts.set(name, (counts.get(name) || 0) + 1)
            if (weapon && !weaponsByName.has(name)) {
              weaponsByName.set(name, weapon)
            }
          })
        })
        return Array.from(counts.entries()).map(([name, count]) => ({
          name,
          count,
          weapon: weaponsByName.get(name) || null,
        }))
      }

      const drawWeaponTable = (title, weapons) => {
        if (!weapons.length) {
          drawSubheader(title, [255, 240, 244])
          drawTextBlock('Sin armas disponibles.', 8.6)
          y += 2
          return
        }
        drawSubheader(title, [255, 240, 244])
        drawTable({
          columns: ['Arma', 'Atq', 'Dist', 'Imp', 'Daño / Crít', 'Habilidades', '+Valor'],
          rows: weapons.map((weapon) => [
            weapon.nombre,
            weapon.ataques,
            weapon.distancia || '–',
            weapon.impactos || '–',
            `${weapon.danio} / ${weapon.danio_critico}`,
            (weapon.habilidades || [])
              .filter(Boolean)
              .join(', ')
              .slice(0, 120),
            weapon.valor_extra ?? 0,
          ]),
          columnWidths: [
            usableWidth * 0.3,
            14,
            16,
            14,
            24,
            usableWidth * 0.24,
            usableWidth * 0.1,
          ],
          compact: true,
          headerFill: [232, 239, 250],
          rowFill: [252, 252, 252],
        })
      }

      if (unit.shooting.length || unit.melee) {
        if (isSquad && unit.perMiniLoadouts?.length) {
          const shootingGroups = buildGroupedWeapons(unit.perMiniLoadouts, 'shooting')
          const meleeGroups = buildGroupedWeapons(unit.perMiniLoadouts, 'melee')
          const shootingRows = shootingGroups
            .map((group) => {
              const weapon = group.weapon
              if (!weapon) return null
              return { ...weapon, nombre: `${weapon.nombre} x${group.count}` }
            })
            .filter(Boolean)
          const meleeRows = meleeGroups
            .map((group) => {
              const weapon = group.weapon
              if (!weapon) return null
              return { ...weapon, nombre: `${weapon.nombre} x${group.count}` }
            })
            .filter(Boolean)
          drawWeaponTable('DISPARO', shootingRows)
          if (meleeRows.length) drawWeaponTable('CUERPO A CUERPO', meleeRows)
        } else {
          drawWeaponTable('DISPARO', unit.shooting)
          if (unit.melee) drawWeaponTable('CUERPO A CUERPO', [unit.melee])
        }
      }
      y += 4

    })

    ensureSpace(10)
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(`Valor total: ${totalValue} valor`, margin, y)

    const totalPages = doc.getNumberOfPages()
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page)
      doc.setFontSize(8)
      doc.setTextColor(90)
      doc.text(`${armyFaction?.nombre || 'Ejército'} – ${armyFaction?.nombre || 'Facción'}`, margin, pageHeight - 6)
      doc.text(`Página ${page} / ${totalPages}`, pageWidth - margin - 25, pageHeight - 6)
    }

    doc.save(`zerolore_${armyFaction?.nombre || 'ejercito'}.pdf`)
  }

  return (
    <section className="section generator-page" id="generador">
      <div className="section-head">
        <p className="eyebrow">Generador de ejércitos</p>
        <h2>Construye tu roster.</h2>
        <p>Elige facción, configura unidades y genera listas por valor objetivo.</p>
      </div>

      <div className="generator-layout">
        <div className="generator-main">
          <div className="mode-switch">
            <button
              className={mode === 'manual' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('manual')}
            >
              Crear Ejército
            </button>
            <button
              className={mode === 'random' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('random')}
            >
              Aleatorio
            </button>
          </div>

          {factions.length === 0 && (
            <p className="empty-state">No hay facciones cargadas todavía.</p>
          )}

          {mode === 'manual' && (
            <div className="manual-panel">
              <div className="field">
                <span>Modo de juego</span>
                <CustomSelect
                  value={gameMode}
                  onChange={setGameMode}
                  options={[
                    { value: 'escaramuza', label: 'Escaramuza' },
                    { value: 'escuadra', label: 'Escuadra' },
                  ]}
                />
              </div>
              <div className="field">
                <span>Facción</span>
                <CustomSelect
                  value={selectedFactionId}
                  onChange={(next) => handleFactionChange({ target: { value: next } })}
                  options={factions.map((faction) => ({
                    value: faction.id,
                    label: faction.nombre,
                  }))}
                />
              </div>

              {selectedFaction && (
                <>
                  <div className="faction-summary">
                    <div className="faction-header">
                      {factionImages[selectedFaction.nombre] && (
                        <img src={factionImages[selectedFaction.nombre]} alt={selectedFaction.nombre} />
                      )}
                      <h3>{selectedFaction.nombre}</h3>
                    </div>
                    <p className="faction-description">{selectedFaction.estilo}</p>
                    {selectedFaction.habilidades_faccion.length > 0 && (
                      <div className="faction-passives">
                        <p className="faction-passives-title">Pasivas de facción</p>
                        <ul>
                          {selectedFaction.habilidades_faccion.map((skill) => (
                            <li key={skill.id}>
                              <strong>{skill.nombre}:</strong> {skill.descripcion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="unit-type-filters">
                    {availableUnitTypes.map((type) => (
                      <label key={type} className="unit-type-filter">
                        <input
                          type="checkbox"
                          checked={unitTypeFiltersManual.has(type)}
                          onChange={() => handleToggleUnitTypeManual(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="unit-list">
                    {selectedFaction.unidades
                      .filter((unit) => unitTypeFiltersManual.has(unit.tipo))
                      .map((unit) => (
                      <article className="unit-card" key={unit.id}>
                        <div>
                          <div className="unit-card-header">
                            <h4>{unit.nombre}</h4>
                            <button type="button" className="ghost tiny" onClick={() => handleOpenConfigurator(unit)}>
                              {gameMode === 'escuadra' ? 'Crear escuadra' : 'Configurar'}
                            </button>
                          </div>
                          <p className="unit-meta">
                            {unit.tipo} · <span className="unit-value">{unit.valor_base} valor</span>
                          </p>
                          <div className="unit-stats-table">
                            <div className="unit-stats-row head">
                              <span>Mov</span>
                              <span>Vidas</span>
                              <span>Salv</span>
                              <span>Vel</span>
                              {gameMode === 'escuadra' ? <span>Cap. escuadra</span> : null}
                            </div>
                            <div className="unit-stats-row">
                              <span>{unit.movimiento}</span>
                              <span>{unit.vidas}</span>
                              <span>{unit.salvacion}</span>
                              <span>{unit.velocidad}</span>
                              {gameMode === 'escuadra' ? (
                                <span>
                                  {unit.escuadra_min}-{unit.escuadra_max}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <p className="unit-specialty">{unit.especialidad}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'random' && (
            <div className="random-panel">
              <div className="field">
                <span>Modo de juego</span>
                <CustomSelect
                  value={gameMode}
                  onChange={setGameMode}
                  options={[
                    { value: 'escaramuza', label: 'Escaramuza' },
                    { value: 'escuadra', label: 'Escuadra' },
                  ]}
                />
              </div>
              <label className="field">
                Valor objetivo
                <input
                  type="number"
                  min="0"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </label>
              <div className="field">
                <span>Facción</span>
                <CustomSelect
                  value={randomFactionId}
                  onChange={setRandomFactionId}
                  options={[
                    { value: 'random', label: 'Aleatoria' },
                    ...factions.map((faction) => ({
                      value: faction.id,
                      label: faction.nombre,
                    })),
                  ]}
                />
              </div>
              <div className="unit-type-filters">
                {availableUnitTypesRandom.map((type) => (
                  <label key={`random-${type}`} className="unit-type-filter">
                    <input
                      type="checkbox"
                      checked={unitTypeFiltersRandom.has(type)}
                      onChange={() => handleToggleUnitTypeRandom(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
                <button type="button" className="primary" onClick={handleGenerateRandom}>
                  Generar
                </button>
            </div>
          )}
        </div>

        <aside className="army-panel">
          <div className="army-header">
            <div>
              <p className="eyebrow">Ejército actual</p>
              <h3>{armyFaction?.nombre || 'Sin facción'}</h3>
            </div>
            <span className="army-total">{totalValue} valor</span>
          </div>

          <div className="army-actions">
            <button type="button" className="ghost small" onClick={handleReset}>
              Resetear ejército
            </button>
            <button type="button" className="ghost small" onClick={exportPdf} disabled={!armyUnits.length}>
              Descargar PDF
            </button>
          </div>

          {armyUnits.length === 0 && (
            <p className="empty-state">No hay unidades añadidas aún.</p>
          )}

          <div className="army-list">
            {armyUnits.map((unit) => (
              <article className="army-unit" key={unit.uid}>
                <div className="army-unit-header">
                  <div>
                    <h4>{unit.base.nombre}</h4>
                    <p>
                      {unit.base.tipo}
                      {gameMode === 'escuadra' ? ` · Tamaño ${unit.squadSize || 1}` : ''}
                  {unit.perMiniLoadouts?.length ? ' · Escuadra' : ''}
                    </p>
                  </div>
                  <span>{unit.total} valor</span>
                </div>
                <div className="army-weapons">
                  {unit.perMiniLoadouts?.length ? (
                    <div>
                      <strong>Armas:</strong>
                      <div className="mini-loadout-list">
                        {unit.perMiniLoadouts.map((loadout, index) => {
                          return (
                            <div key={`loadout-${unit.uid}-${index}`} className="mini-loadout-item">
                              <div className="mini-loadout-label">Unidad {index + 1}</div>
                              <div>
                                <strong>Disparo:</strong>{' '}
                                {(loadout.shooting || []).map((weapon) => weapon.nombre).join(', ') || '—'}
                              </div>
                              <div>
                                <strong>Melee:</strong> {loadout.melee?.nombre || '—'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : unit.shooting.length > 0 ? (
                    <div>
                      <strong>Disparo:</strong> {unit.shooting.map((weapon) => weapon.nombre).join(', ')}
                    </div>
                  ) : null}
                  {!unit.perMiniLoadouts?.length && unit.melee && (
                    <div>
                      <strong>Melee:</strong> {unit.melee.nombre}
                    </div>
                  )}
                </div>
                <div className="army-unit-actions">
                  <button type="button" className="ghost tiny" onClick={() => handleEditUnit(unit)}>
                    Editar
                  </button>
                  <button type="button" className="ghost tiny" onClick={() => handleRemoveUnit(unit.uid)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {activeUnit && (
        <UnitConfigurator
          unit={activeUnit.base || activeUnit}
          selected={activeUnit.shooting || activeUnit.melee ? activeUnit : null}
          gameMode={gameMode}
          onClose={() => setActiveUnit(null)}
          onConfirm={(unit, shooting, melee, editingUid, nextSquadSize, nextPerMini) => {
            if (editingUid) {
              const clampedSize = clampSquadSize(nextSquadSize, unit)
              setArmyUnits((prev) =>
                prev.map((entry) =>
                  entry.uid === editingUid
                    ? {
                        ...entry,
                        base: unit,
                        shooting,
                        melee,
                        squadSize: clampedSize,
                        perMiniLoadouts: nextPerMini,
                        total: computeUnitTotal(unit, shooting, melee, clampedSize, nextPerMini, gameMode),
                      }
                    : entry,
                ),
              )
              setActiveUnit(null)
              return
            }
            handleAddUnit(unit, shooting, melee, nextSquadSize || 1, nextPerMini)
          }}
        />
      )}
    </section>
  )
}

function UnitConfigurator({ unit, selected, onClose, onConfirm, gameMode }) {
  const initialShooting = useMemo(() => {
    if (!unit.armas_disparo.length) return []
    const first = unit.armas_disparo[0]
    const second = unit.armas_disparo[1] || unit.armas_disparo[0]
    return unit.max_armas_disparo > 1 ? [first.id, second.id] : [first.id]
  }, [unit])

  const initialMeleeSelection = selected?.melee?.id || unit.armas_melee[0]?.id || ''
  const initialSquadSize = gameMode === 'escuadra'
    ? clampSquadSize(selected?.squadSize ?? unit.escuadra_min, unit)
    : 1

  const createBaseSelection = (shootingIds, meleeId) => ({
    shootingIds: [...shootingIds],
    meleeId,
  })

  const normalizePerMiniSelections = (list, size, baseFactory) => {
    if (size <= 0) return []
    if (list.length === size) return list
    if (list.length < size) {
      return [...list, ...Array.from({ length: size - list.length }, baseFactory)]
    }
    return list.slice(0, size)
  }

  const [shootingSelection, setShootingSelection] = useState(
    selected?.shooting?.length ? selected.shooting.map((weapon) => weapon.id) : initialShooting,
  )
  const [meleeSelection, setMeleeSelection] = useState(initialMeleeSelection)
  const [squadSize, setSquadSize] = useState(initialSquadSize)
  const [perMiniSelections, setPerMiniSelections] = useState(() => {
    if (gameMode !== 'escuadra') return []
    const selectedLoadouts = selected?.perMiniLoadouts?.map((loadout) => ({
      shootingIds: loadout.shooting.map((weapon) => weapon.id),
      meleeId: loadout.melee?.id || '',
    })) || []
    return normalizePerMiniSelections(
      selectedLoadouts,
      initialSquadSize,
      () => createBaseSelection(initialShooting, initialMeleeSelection),
    )
  })
  const squadOptions = useMemo(() => {
    if (gameMode !== 'escuadra') return []
    const length = Math.max(1, unit.escuadra_max - unit.escuadra_min + 1)
    return Array.from({ length }, (_, idx) => unit.escuadra_min + idx)
  }, [gameMode, unit])

  const selectedShooting = shootingSelection
    .map((id) => getWeaponById(unit.armas_disparo, id))
    .filter(Boolean)
  const selectedMelee = getWeaponById(unit.armas_melee, meleeSelection)

  const perMiniLoadouts = gameMode === 'escuadra'
    ? perMiniSelections.map((sel) => ({
        shooting: sel.shootingIds
          .map((id) => getWeaponById(unit.armas_disparo, id))
          .filter(Boolean),
        melee: getWeaponById(unit.armas_melee, sel.meleeId),
      }))
    : null

  const total = computeUnitTotal(
    unit,
    selectedShooting,
    selectedMelee,
    squadSize,
    perMiniLoadouts,
    gameMode,
  )

  const handleSquadSizeChange = (size) => {
    setSquadSize(size)
    if (gameMode !== 'escuadra') return
    setPerMiniSelections((prev) =>
      normalizePerMiniSelections(
        [...prev],
        size,
        () => createBaseSelection(shootingSelection, meleeSelection),
      ),
    )
  }

  const renderWeaponStats = (weapon) => {
    if (!weapon) return null
    const abilityNotes = (weapon.habilidades || [])
      .map((ability) => ({
        label: formatAbilityLabel(ability),
        description: getAbilityDescription(ability),
        raw: ability,
      }))
      .filter((item) => item.label)

    return (
      <div>
        <div className="weapon-stats-table">
          <div className="weapon-stats-row head">
            <span>Atq</span>
            <span>Dist</span>
            <span>Imp</span>
            <span>Daño</span>
            <span>Crítico</span>
            <span>Habilidades</span>
            <span>+Valor</span>
          </div>
          <div className="weapon-stats-row">
            <span>{weapon.ataques}</span>
            <span>{weapon.distancia || '-'}</span>
            <span>{weapon.impactos || '-'}</span>
            <span>{weapon.danio}</span>
            <span>{weapon.danio_critico}</span>
            <span className="weapon-tags">
              {weapon.habilidades?.length
                ? weapon.habilidades.map((ability) => formatAbilityLabel(ability)).join(', ')
                : '-'}
            </span>
            <span>{weapon.valor_extra > 0 ? `+${weapon.valor_extra}` : '0'}</span>
          </div>
        </div>
        {abilityNotes.length > 0 && (
          <div className="weapon-ability-notes">
            {abilityNotes.map((note) => (
              <div key={note.raw || note.label}>
                <strong>{note.label}:</strong>{' '}
                {note.description || 'Descripción pendiente.'}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }


  const handleShootingChange = (index, value) => {
    setShootingSelection((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div className="unit-modal">
      <div className="unit-modal-card">
        <div className="unit-modal-header">
          <div>
            <p className="eyebrow">{gameMode === 'escuadra' ? 'Crear escuadra' : 'Configurar unidad'}</p>
            <h3>{unit.nombre}</h3>
          </div>
          <button className="ghost tiny" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="unit-modal-body">
          {gameMode === 'escuadra' && (
            <label className="field">
              Tamaño de escuadra
              <div className="squad-size-buttons">
                {squadOptions.map((size) => (
                  <button
                    key={`squad-size-${size}`}
                    type="button"
                    className={`ghost small ${size === squadSize ? 'active' : ''}`}
                    onClick={() => handleSquadSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </label>
          )}
          {gameMode === 'escuadra' && (
            <p className="field-label">Personaliza cada mini según el tamaño elegido.</p>
          )}
          {gameMode !== 'escuadra' && unit.armas_disparo.length > 0 && (
            <div className="field-group">
              <p className="field-label">Armas de disparo</p>
              {shootingSelection.map((value, index) => {
                const weapon = getWeaponById(unit.armas_disparo, value)
                return (
                  <div className="weapon-select" key={`shooting-${index}`}>
                    <div className="field">
                      <span>Selección {index + 1}</span>
                      <CustomSelect
                        value={value}
                        onChange={(next) => handleShootingChange(index, next)}
                        options={unit.armas_disparo.map((option) => ({
                          value: option.id,
                          label: `${option.nombre} (+${option.valor_extra})`,
                        }))}
                      />
                    </div>
                    {renderWeaponStats(weapon)}
                  </div>
                )
              })}
            </div>
          )}

          {gameMode !== 'escuadra' && unit.armas_melee.length > 0 && (
            <div className="weapon-select">
              <div className="field">
                <span>Arma cuerpo a cuerpo</span>
                <CustomSelect
                  value={meleeSelection}
                  onChange={setMeleeSelection}
                  options={unit.armas_melee.map((weapon) => ({
                    value: weapon.id,
                    label: `${weapon.nombre} (+${weapon.valor_extra})`,
                  }))}
                />
              </div>
              {renderWeaponStats(selectedMelee)}
            </div>
          )}

          {gameMode === 'escuadra' && (
            <div className="mini-customizer">
              <p className="field-label">Escuadra (tamaño {squadSize})</p>
              {perMiniSelections.map((mini, index) => (
                <div className="mini-row" key={`mini-${index}`}>
                  <div className="mini-row-title">Unidad {index + 1}</div>
                  {(unit.armas_disparo.length ? shootingSelection : []).map((_, slotIndex) => (
                    <div className="field" key={`mini-${index}-shoot-${slotIndex}`}>
                      <div className="field">
                        <span>Disparo {slotIndex + 1}</span>
                        <CustomSelect
                          value={mini.shootingIds[slotIndex] || shootingSelection[slotIndex]}
                          onChange={(nextValue) =>
                            setPerMiniSelections((prev) => {
                              const next = [...prev]
                              const current = { ...next[index] }
                              const ids = [...(current.shootingIds || shootingSelection)]
                              ids[slotIndex] = nextValue
                              current.shootingIds = ids
                              next[index] = current
                              return next
                            })
                          }
                          options={unit.armas_disparo.map((weapon) => ({
                            value: weapon.id,
                            label: `${weapon.nombre} (+${weapon.valor_extra})`,
                          }))}
                        />
                      </div>
                      {renderWeaponStats(
                        getWeaponById(
                          unit.armas_disparo,
                          mini.shootingIds[slotIndex] || shootingSelection[slotIndex],
                        ),
                      )}
                    </div>
                  ))}
                  {unit.armas_melee.length > 0 && (
                    <div className="field">
                      <div className="field">
                        <span>Melee</span>
                        <CustomSelect
                          value={mini.meleeId || meleeSelection}
                          onChange={(nextValue) =>
                            setPerMiniSelections((prev) => {
                              const next = [...prev]
                              const current = { ...next[index] }
                              current.meleeId = nextValue
                              next[index] = current
                              return next
                            })
                          }
                          options={unit.armas_melee.map((weapon) => ({
                            value: weapon.id,
                            label: `${weapon.nombre} (+${weapon.valor_extra})`,
                          }))}
                        />
                      </div>
                      {renderWeaponStats(getWeaponById(unit.armas_melee, mini.meleeId || meleeSelection))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="unit-modal-footer">
          <span className="unit-total">Total unidad: {total} valor</span>
          <button
            type="button"
            className="primary"
            onClick={() =>
              onConfirm(
                unit,
                selectedShooting,
                selectedMelee,
                selected?.uid,
                squadSize,
                perMiniLoadouts,
              )
            }
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomSelect({ value, onChange, options, disabled = false }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) || options[0]

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (next) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className={`custom-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || options.length === 0}
      >
        <span>{selected?.label || 'Seleccionar'}</span>
      </button>
      {open && options.length > 0 && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option${option.value === value ? ' active' : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Generador
