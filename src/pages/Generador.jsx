import { useEffect, useMemo, useState, useTransition } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'
import UnitConfigurator from '../features/generator/components/UnitConfigurator.jsx'
import CustomSelect from '../features/generator/components/CustomSelect.jsx'
import UnitTypeBadge from '../features/generator/components/UnitTypeBadge.jsx'
import { exportGeneratorPdf } from '../features/generator/exportGeneratorPdf.js'
import {
  buildArmyUnitDisplayNames,
  clampSquadSize,
  computeUnitTotal,
  factionImages,
  generateArmyByValue,
  isFactionData,
  isUnitTypeAllowedInGameMode,
  localizeArmyUnits,
  normalizeFaction,
  toNumber,
} from '../features/generator/generatorUtils.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })

function GameModeIcon({ mode }) {
  if (mode === 'escuadra') {
    return (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <circle className="game-mode-icon-stroke" cx="15" cy="15" r="5" />
        <circle className="game-mode-icon-stroke" cx="49" cy="15" r="5" />
        <path className="game-mode-icon-stroke" d="M8 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <path className="game-mode-icon-stroke" d="M42 33c0-5.4 3.2-8.5 7-8.5s7 3.1 7 8.5" />
        <circle className="game-mode-icon-stroke" cx="32" cy="10" r="7" />
        <path className="game-mode-icon-stroke" d="M22 35c0-7.6 4.8-12 10-12s10 4.4 10 12" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 64 40" aria-hidden="true">
      <circle className="game-mode-icon-stroke" cx="32" cy="11" r="7" />
      <path className="game-mode-icon-stroke" d="M22 34c0-8 5.5-13 10-13s10 5 10 13" />
    </svg>
  )
}

function GameModePicker({ value, onChange, t }) {
  const options = [
    { value: 'escaramuza', label: t('generator.skirmish') },
    { value: 'escuadra', label: t('generator.squad') },
  ]

  return (
    <div className="field field-game-mode">
      <span>{t('generator.gameMode')}</span>
      <div className="game-mode-picker" role="radiogroup" aria-label={t('generator.gameMode')}>
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={`game-mode-card${isActive ? ' active' : ''}`}
              onClick={() => onChange(option.value)}
              role="radio"
              aria-checked={isActive}
            >
              <span className="game-mode-card-icon">
                <GameModeIcon mode={option.value} />
              </span>
              <span className="game-mode-card-label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Generador() {
  const { t, lang } = useI18n()
  const [, startTransition] = useTransition()
  const factions = useMemo(() => {
    return buildLocalizedFactionEntries(factionModules, lang)
      .filter((item) => item && isFactionData(item.data))
      .map((item, index) => normalizeFaction(item.data, index, item.base))
  }, [lang])

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
  const selectedFactionIdSafe = useMemo(() => {
    if (!factions.length) return ''
    return factions.some((faction) => faction.id === selectedFactionId) ? selectedFactionId : factions[0].id
  }, [factions, selectedFactionId])
  const armyFactionIdSafe = useMemo(() => {
    if (!armyFactionId || !factions.length) return ''
    return factions.some((faction) => faction.id === armyFactionId) ? armyFactionId : factions[0].id
  }, [factions, armyFactionId])
  const randomFactionIdSafe = useMemo(() => {
    if (!factions.length) return 'random'
    return randomFactionId === 'random' || factions.some((faction) => faction.id === randomFactionId)
      ? randomFactionId
      : 'random'
  }, [factions, randomFactionId])

  const selectedFaction = factions.find((faction) => faction.id === selectedFactionIdSafe) || null
  const armyFaction = factions.find((faction) => faction.id === armyFactionIdSafe) || selectedFaction
  const availableUnitTypes = useMemo(() => {
    if (!selectedFaction?.unidades?.length) return []
    const types = new Set(
      selectedFaction.unidades
        .filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))
        .map((unit) => unit.tipo),
    )
    return Array.from(types)
  }, [selectedFaction, gameMode])
  const randomFaction = randomFactionIdSafe === 'random'
    ? null
    : factions.find((faction) => faction.id === randomFactionIdSafe)
  const availableUnitTypesRandom = useMemo(() => {
    if (randomFaction) {
      return Array.from(
        new Set(
          randomFaction.unidades
            .filter((unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode))
            .map((unit) => unit.tipo),
        ),
      )
    }
    const types = new Set()
    factions.forEach((faction) => {
      faction.unidades.forEach((unit) => {
        if (isUnitTypeAllowedInGameMode(unit.tipo, gameMode)) {
          types.add(unit.tipo)
        }
      })
    })
    return Array.from(types)
  }, [randomFaction, factions, gameMode])

  const activeManualFilters = useMemo(() => {
    if (!availableUnitTypes.length) return new Set()
    if (unitTypeFiltersManual.size) {
      const sanitized = new Set(
        [...unitTypeFiltersManual].filter((type) => availableUnitTypes.includes(type)),
      )
      return sanitized.size ? sanitized : new Set(availableUnitTypes)
    }
    return new Set(availableUnitTypes)
  }, [availableUnitTypes, unitTypeFiltersManual])

  const activeRandomFilters = useMemo(() => {
    if (!availableUnitTypesRandom.length) return new Set()
    if (unitTypeFiltersRandom.size) {
      const sanitized = new Set(
        [...unitTypeFiltersRandom].filter((type) => availableUnitTypesRandom.includes(type)),
      )
      return sanitized.size ? sanitized : new Set(availableUnitTypesRandom)
    }
    return new Set(availableUnitTypesRandom)
  }, [availableUnitTypesRandom, unitTypeFiltersRandom])

  const localizedArmyUnits = useMemo(() => localizeArmyUnits(armyUnits, armyFaction), [armyUnits, armyFaction])
  const totalValue = localizedArmyUnits.reduce((total, unit) => total + unit.total, 0)
  const armyUnitDisplayNames = useMemo(() => buildArmyUnitDisplayNames(localizedArmyUnits), [localizedArmyUnits])
  const visibleManualUnits = useMemo(() => {
    if (!selectedFaction?.unidades?.length) return []
    return selectedFaction.unidades.filter(
      (unit) => isUnitTypeAllowedInGameMode(unit.tipo, gameMode) && activeManualFilters.has(unit.tipo),
    )
  }, [selectedFaction, activeManualFilters, gameMode])

  useEffect(() => {
    if (typeof Image === 'undefined') return
    Object.values(factionImages).forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    const payload = JSON.stringify({
      units: armyUnits,
      factionId: armyFactionIdSafe,
    })
    window.localStorage.setItem('zerolore_army_v1', payload)
  }, [armyUnits, armyFactionIdSafe])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const hasOpenModal = Boolean(activeUnit)
    const previousOverflow = document.body.style.overflow
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activeUnit])

  const handleFactionChange = (event) => {
    const next = event.target.value
    const nextFaction = factions.find((faction) => faction.id === next)
    const nextTypes = nextFaction ? Array.from(new Set(nextFaction.unidades.map((unit) => unit.tipo))) : []
    startTransition(() => {
      setSelectedFactionId(next)
      setUnitTypeFiltersManual(new Set(nextTypes))
      setArmyUnits([])
      setArmyFactionId(next)
    })
  }

  const handleRandomFactionChange = (next) => {
    const nextFaction = next === 'random' ? null : factions.find((faction) => faction.id === next)
    const nextTypes = nextFaction
      ? Array.from(new Set(nextFaction.unidades.map((unit) => unit.tipo)))
      : Array.from(
        new Set(
          factions.flatMap((faction) => faction.unidades.map((unit) => unit.tipo)),
        ),
      )
    setRandomFactionId(next)
    setUnitTypeFiltersRandom(new Set(nextTypes))
  }

  const handleToggleUnitTypeManual = (type) => {
    setUnitTypeFiltersManual((prev) => {
      const next = prev.size ? new Set(prev) : new Set(availableUnitTypes)
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
      const next = prev.size ? new Set(prev) : new Set(availableUnitTypesRandom)
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

  const handleAddUnit = (unit, shooting, melee, squadSize, perMiniLoadouts, imageDataUrl = '') => {
    const clampedSize = gameMode === 'escuadra' ? clampSquadSize(squadSize, unit) : 1
    const total = computeUnitTotal(unit, shooting, melee, clampedSize, perMiniLoadouts, gameMode)
    const entry = {
      uid: `${unit.id}-${Date.now()}-${Math.random()}`,
      base: unit,
      shooting,
      melee,
      squadSize: clampedSize,
      perMiniLoadouts,
      imageDataUrl,
      total,
    }
    setArmyUnits((prev) => [...prev, entry])
    setArmyFactionId(selectedFactionIdSafe)
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
      randomFactionIdSafe === 'random'
        ? factions[Math.floor(Math.random() * factions.length)]
        : factions.find((item) => item.id === randomFactionIdSafe)
    const target = toNumber(targetValue)
    const result = generateArmyByValue(
      faction,
      target,
      gameMode,
      activeRandomFilters.size ? activeRandomFilters : null,
    )
    setArmyUnits(result.units)
    setArmyFactionId(result.faction?.id || '')
  }

  const exportPdf = () =>
    exportGeneratorPdf({
      armyUnits: localizedArmyUnits,
      armyFaction,
      totalValue,
      gameMode,
      t,
      lang,
    })

  return (
    <section className="section generator-page reveal" id="generador">
      <div className="section-head reveal">
        <p className="eyebrow">{t('generator.eyebrow')}</p>
        <h2>{t('generator.title')}</h2>
        <p>{t('generator.subtitle')}</p>
      </div>

      <div className="generator-layout reveal">
        <div className="generator-main">
          <div className="mode-switch">
            <button
              className={mode === 'manual' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('manual')}
            >
              {t('generator.modeCreate')}
            </button>
            <button
              className={mode === 'random' ? 'mode-button active' : 'mode-button'}
              type="button"
              onClick={() => setMode('random')}
            >
              {t('generator.modeRandom')}
            </button>
          </div>

          {mode === 'manual' && (
            <div className="manual-panel">
              <GameModePicker value={gameMode} onChange={setGameMode} t={t} />
              <div className="field">
                <span>{t('generator.faction')}</span>
                <CustomSelect
                  t={t}
                  value={selectedFactionIdSafe}
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
                      {factionImages[selectedFaction.id] && (
                        <img src={factionImages[selectedFaction.id]} alt={selectedFaction.nombre} />
                      )}
                      <h3>{selectedFaction.nombre}</h3>
                    </div>
                    <p className="faction-description">{selectedFaction.estilo}</p>
                    {selectedFaction.habilidades_faccion.length > 0 && (
                      <div className="faction-passives">
                        <p className="faction-passives-title">{t('generator.passives')}</p>
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
                          checked={activeManualFilters.has(type)}
                          onChange={() => handleToggleUnitTypeManual(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="unit-list">
                    {visibleManualUnits.map((unit) => (
                      <article className="unit-card" key={unit.id}>
                        <div>
                          <div className="unit-card-header">
                            <h4>{unit.nombre}</h4>
                            <button type="button" className="ghost tiny" onClick={() => handleOpenConfigurator(unit)}>
                              {gameMode === 'escuadra' ? t('generator.createSquad') : t('generator.configure')}
                            </button>
                          </div>
                          <p className="unit-meta">
                            <UnitTypeBadge type={unit.tipo} /> ·{' '}
                            <span className="unit-value">{unit.valor_base} {t('generator.valueUnit')}</span>
                          </p>
                          <div className="unit-stats-table">
                            <div className="unit-stats-row head">
                              <span>{t('generator.mov')}</span>
                              <span>{t('generator.vidas')}</span>
                              <span>{t('generator.salv')}</span>
                              <span>{t('generator.vel')}</span>
                              {gameMode === 'escuadra' ? <span>{t('generator.squadCap')}</span> : null}
                            </div>
                            <div className="unit-stats-row">
                              <span>{unit.movimiento}</span>
                              <span>{unit.vidas}</span>
                              <span>{unit.salvacion}</span>
                              <span>{unit.velocidad}</span>
                              {gameMode === 'escuadra' ? (
                                <span>
                                  {unit.escuadra_min === unit.escuadra_max
                                    ? '-'
                                    : `${unit.escuadra_min}-${unit.escuadra_max}`}
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
              <GameModePicker value={gameMode} onChange={setGameMode} t={t} />
              <label className="field">
                {t('generator.targetValue')}
                <input
                  type="number"
                  min="0"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </label>
              <div className="field">
                <span>{t('generator.faction')}</span>
                <CustomSelect
                  t={t}
                  value={randomFactionIdSafe}
                  onChange={handleRandomFactionChange}
                  options={[
                    { value: 'random', label: t('generator.randomFaction') },
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
                      checked={activeRandomFilters.has(type)}
                      onChange={() => handleToggleUnitTypeRandom(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              <button type="button" className="primary" onClick={handleGenerateRandom}>
                {t('generator.generate')}
              </button>
            </div>
          )}
        </div>

        <aside className="army-panel">
          <div className="army-header">
            <div>
              <p className="eyebrow">{t('generator.currentArmy')}</p>
              <h3>{armyFaction?.nombre || t('generator.noFaction')}</h3>
            </div>
            <span className="army-total">{totalValue} {t('generator.valueUnit')}</span>
          </div>

          <div className="army-actions">
            <button type="button" className="ghost small" onClick={handleReset}>
              {t('generator.resetArmy')}
            </button>
            <button type="button" className="ghost small" onClick={exportPdf} disabled={!localizedArmyUnits.length}>
              {t('generator.downloadPdf')}
            </button>
          </div>

          {localizedArmyUnits.length === 0 && (
            <p className="empty-state">{t('generator.noUnitsYet')}</p>
          )}

          <div className="army-list">
            {localizedArmyUnits.map((unit) => (
              <article className="army-unit" key={unit.uid}>
                <div className="army-unit-header">
                  <div>
                    <h4>{armyUnitDisplayNames.get(unit.uid) || unit.base.nombre}</h4>
                    <p>
                      <UnitTypeBadge type={unit.base.tipo} />
                      {gameMode === 'escuadra' ? ` · ${t('generator.size')} ${unit.squadSize || 1}` : ''}
                      {unit.perMiniLoadouts?.length ? ` · ${t('generator.squadLabel')}` : ''}
                    </p>
                  </div>
                  <span>{unit.total} {t('generator.valueUnit')}</span>
                </div>
                <div className="army-weapons">
                  {unit.perMiniLoadouts?.length ? (
                    <div>
                      <strong>{t('generator.weapons')}:</strong>
                      <div className="mini-loadout-list">
                        {unit.perMiniLoadouts.map((loadout, index) => {
                          return (
                            <div key={`loadout-${unit.uid}-${index}`} className="mini-loadout-item">
                              <div className="mini-loadout-label">{t('generator.unit')} {index + 1}</div>
                              <div>
                                <strong>{t('generator.shooting')}:</strong>{' '}
                                {(loadout.shooting || []).map((weapon) => weapon.nombre).join(', ') || '—'}
                              </div>
                              <div>
                                <strong>{t('generator.melee')}:</strong> {loadout.melee?.nombre || '—'}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : unit.shooting.length > 0 ? (
                    <div>
                      <strong>{t('generator.shooting')}:</strong> {unit.shooting.map((weapon) => weapon.nombre).join(', ')}
                    </div>
                  ) : null}
                  {!unit.perMiniLoadouts?.length && unit.melee && (
                    <div>
                      <strong>{t('generator.melee')}:</strong> {unit.melee.nombre}
                    </div>
                  )}
                </div>
                <div className="army-unit-actions">
                  <button type="button" className="ghost tiny" onClick={() => handleEditUnit(unit)}>
                    {t('generator.edit')}
                  </button>
                  <button type="button" className="ghost tiny" onClick={() => handleRemoveUnit(unit.uid)}>
                    {t('generator.delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>

      {activeUnit && (
        <UnitConfigurator
          t={t}
          lang={lang}
          unit={activeUnit.base || activeUnit}
          selected={activeUnit.shooting || activeUnit.melee ? activeUnit : null}
          gameMode={gameMode}
          onClose={() => setActiveUnit(null)}
          onConfirm={(unit, shooting, melee, editingUid, nextSquadSize, nextPerMini, nextImageDataUrl) => {
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
                        imageDataUrl: nextImageDataUrl || '',
                        total: computeUnitTotal(unit, shooting, melee, clampedSize, nextPerMini, gameMode),
                      }
                    : entry,
                ),
              )
              setActiveUnit(null)
              return
            }
            handleAddUnit(unit, shooting, melee, nextSquadSize || 1, nextPerMini, nextImageDataUrl)
          }}
        />
      )}
    </section>
  )
}

export default Generador
