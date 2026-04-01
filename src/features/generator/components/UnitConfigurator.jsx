import { createPortal } from 'react-dom'
import { useMemo, useRef, useState } from 'react'
import { getAbilityDescription, getAbilityLabel } from '../../../utils/abilities.js'
import {
  clampSquadSize,
  computeUnitTotal,
  getWeaponById,
} from '../generatorUtils.js'
import CustomSelect from './CustomSelect.jsx'

export default function UnitConfigurator({ unit, selected, onClose, onConfirm, gameMode, t, lang }) {
  const imageInputRef = useRef(null)
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
  const [unitImage, setUnitImage] = useState(selected?.imageDataUrl || '')
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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUnitImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const renderWeaponStats = (weapon) => {
    if (!weapon) return null
    const abilityNotes = (weapon.habilidades || [])
      .map((ability) => ({
        label: getAbilityLabel(ability, lang),
        description: getAbilityDescription(ability, lang),
        raw: ability,
      }))
      .filter((item) => item.label)

    return (
      <div>
        <div className="weapon-stats-table">
          <div className="weapon-stats-row head">
            <span>{t('generator.weaponAtq')}</span>
            <span>{t('generator.weaponDist')}</span>
            <span>{t('generator.weaponImp')}</span>
            <span>{t('generator.weaponDamage')}</span>
            <span>{t('generator.weaponCrit')}</span>
            <span>{t('generator.weaponSkills')}</span>
            <span>{t('generator.weaponValue')}</span>
          </div>
          <div className="weapon-stats-row">
            <span>{weapon.ataques}</span>
            <span>{weapon.distancia || '-'}</span>
            <span>{weapon.impactos || '-'}</span>
            <span>{weapon.danio}</span>
            <span>{weapon.danio_critico}</span>
            <span className="weapon-tags">
              {weapon.habilidades?.length
                ? weapon.habilidades.map((ability) => getAbilityLabel(ability, lang)).join(', ')
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
                {note.description || t('generator.pendingDescription')}
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

  const content = (
    <div className="unit-modal">
      <div className="unit-modal-card">
        <div className="unit-modal-header">
          <div>
            <p className="eyebrow">{gameMode === 'escuadra' ? t('generator.createSquad') : t('generator.configureUnit')}</p>
            <h3>{unit.nombre}</h3>
          </div>
          <button className="ghost tiny" type="button" onClick={onClose}>
            {t('generator.close')}
          </button>
        </div>
        <div className="unit-modal-body">
          {gameMode !== 'escuadra' && (
            <div className="unit-image-field">
              <div className="field">
                <span>
                  {t('generator.unitImage')} <em className="field-inline-note">{t('generator.optional')}</em>
                </span>
              </div>
              <div className="unit-image-controls">
                {unitImage ? (
                  <img className="unit-image-preview" src={unitImage} alt={unit.nombre} />
                ) : (
                  <div className="unit-image-preview unit-image-preview-empty" />
                )}
                <div className="unit-image-actions">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="unit-image-input"
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    {unitImage ? t('generator.changeImage') : t('generator.addImage')}
                  </button>
                  {unitImage && (
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() => setUnitImage('')}
                    >
                      {t('generator.removeImage')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {gameMode === 'escuadra' && (
            <label className="field">
              {t('generator.squadSize')}
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
            <p className="field-label">{t('generator.perMiniCustomize')}</p>
          )}
          {gameMode !== 'escuadra' && unit.armas_disparo.length > 0 && (
            <div className="field-group">
              <p className="field-label field-label-accent">{t('generator.shootingWeapons')}</p>
              {shootingSelection.map((value, index) => {
                const weapon = getWeaponById(unit.armas_disparo, value)
                return (
                  <div className="weapon-select" key={`shooting-${index}`}>
                    <div className="field">
                      <span>{t('generator.selection')} {index + 1}</span>
                      <CustomSelect
                        t={t}
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
                <span className="field-label-accent field-label-accent-lower">{t('generator.meleeWeapon')}</span>
                <CustomSelect
                  t={t}
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
              <p className="field-label">{t('generator.squadLabel')} ({t('generator.size').toLowerCase()} {squadSize})</p>
              {perMiniSelections.map((mini, index) => (
                <div className="mini-row" key={`mini-${index}`}>
                  <div className="mini-row-title">{t('generator.unit')} {index + 1}</div>
                  {(unit.armas_disparo.length ? shootingSelection : []).map((_, slotIndex) => (
                    <div className="field" key={`mini-${index}-shoot-${slotIndex}`}>
                      <div className="field">
                        <span>{t('generator.shooting')} {slotIndex + 1}</span>
                        <CustomSelect
                          t={t}
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
                        <span>{t('generator.melee')}</span>
                        <CustomSelect
                          t={t}
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
          <span className="unit-total">{t('generator.totalUnit')}: {total} {t('generator.valueUnit')}</span>
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
                unitImage,
              )
            }
          >
            {t('generator.confirm')}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}
