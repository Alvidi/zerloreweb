import { useMemo, useState } from 'react'
import { ARMY_STYLES, TEMPLATE_BUDGETS, getArmyTemplates } from '../armyTemplates.js'
import { getUnitClassBadgeSrc } from '../unitTypeBadges.js'
import './ArmyTemplates.css'

export default function ArmyTemplates({ onApply, hasArmy, onViewUnit, onViewEquipment }) {
  const [styleId, setStyleId] = useState('balanced')
  const [budget, setBudget] = useState(70)
  const [proposalKey, setProposalKey] = useState('')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const proposals = useMemo(() => getArmyTemplates(styleId, budget), [styleId, budget])
  const proposal = proposals.find((candidate) => candidate.key === proposalKey) || proposals[0]
  const chooseStyle = (id) => { setStyleId(id); setProposalKey(''); setReplaceConfirmed(false) }
  const shuffle = () => {
    const alternatives = proposals.filter((candidate) => candidate.key !== proposal?.key)
    if (alternatives.length) setProposalKey(alternatives[Math.floor(Math.random() * alternatives.length)].key)
    setReplaceConfirmed(false)
  }
  const apply = () => {
    if (hasArmy && !replaceConfirmed) { setReplaceConfirmed(true); return }
    onApply(proposal)
  }
  return (
    <div className="army-templates">
      <div className="army-templates-heading">
        <div><p className="eyebrow">Empieza con una idea</p><h3>Un ejército con un plan.</h3><p>Tropas, equipo y un plan sencillo para tu primera batalla.</p></div>
        <label className="army-budget">Límite de Valor<select value={budget} onChange={(e) => { setBudget(Number(e.target.value)); setProposalKey(''); setReplaceConfirmed(false) }}>{TEMPLATE_BUDGETS.map((value) => <option key={value} value={value}>{value} de Valor</option>)}</select></label>
      </div>
      <div className="army-style-options" aria-label="Estilo de ejército">
        {ARMY_STYLES.map((style) => <button key={style.id} type="button" className={`army-style-option${styleId === style.id ? ' is-selected' : ''}`} aria-pressed={styleId === style.id} onClick={() => chooseStyle(style.id)}><img src={getUnitClassBadgeSrc(style.icon)} alt="" /><span><strong>{style.label}</strong><small>{style.description}</small></span></button>)}
      </div>
      {proposal ? (
        <div className="army-proposal">
          <div className="army-proposal-plan">
            <p className="army-template-label">Plantilla de inicio · editable</p>
            <h4>{proposal.name}</h4>
            <p>{proposal.plan}</p>
            <h5 className="army-equipment-heading">Cómo usar el equipo</h5>
            <p>{proposal.equipmentPlan}</p>
            <p className="army-template-note">Las cantidades son miniaturas, no escuadras. Sin ese modo, actúan individualmente. Si lo activáis, agrupa solo los perfiles que lo permiten y respeta su máximo.</p>
            <p className="army-template-note">Se despliegan desde la Reserva siguiendo el reglamento. El equipo es de un solo uso y lo puede utilizar cualquier unidad aliada.</p>
            <div className="army-template-actions">
              <button className="primary" type="button" onClick={apply}>{replaceConfirmed ? 'Sustituir ejército actual' : 'Usar este ejército'}</button>
              <button className="ghost" type="button" onClick={shuffle} disabled={proposals.length < 2}>Otra propuesta ↻</button>
            </div>
            {replaceConfirmed && <div className="army-template-replace" role="status"><p>Se sustituirán las miniaturas, sus imágenes y el Equipamiento del ejército actual.</p><button className="ghost" type="button" onClick={() => setReplaceConfirmed(false)}>Cancelar</button></div>}
          </div>
          <div className="army-proposal-list" aria-live="polite" aria-atomic="true">
            <div className="army-proposal-total"><span>Tu composición</span><strong>{proposal.total}<small> / {budget} Valor</small></strong></div>
            <div className="army-proposal-section-heading"><h5>Miniaturas</h5><span>{proposal.unitTotal} Valor</span></div>
            <ul>{proposal.units.map(({ unit, count }) => (
              <li key={unit.id}>
                <button type="button" className="army-proposal-entry" aria-label={`Ver ficha de ${unit.nombre}`} aria-haspopup="dialog" onClick={() => onViewUnit(unit.id)}>
                  <img src={getUnitClassBadgeSrc(unit.id)} alt="" />
                  <span className="army-proposal-count">{count} ×</span>
                  <span className="army-proposal-entry-name"><span>{unit.nombre}</span><small>Ver ficha</small></span>
                  <span className="army-proposal-cost">{Number(unit.perfil.valor) * count}</span>
                </button>
              </li>
            ))}</ul>
            <div className="army-proposal-section-heading army-proposal-equipment-heading"><h5>Equipamiento</h5><span>{proposal.equipmentTotal} Valor</span></div>
            <ul>{proposal.equipment.map(({ item, count }) => (
              <li key={item.id}>
                <button type="button" className="army-proposal-entry" aria-label={`Ver ficha de ${item.nombre}`} aria-haspopup="dialog" onClick={() => onViewEquipment(item)}>
                  <img src={getUnitClassBadgeSrc('equipamiento')} alt="" />
                  <span className="army-proposal-count">{count} ×</span>
                  <span className="army-proposal-entry-name"><span>{item.nombre}</span><small>Ver ficha</small></span>
                  <span className="army-proposal-cost">{Number(item.valor) * count}</span>
                </button>
              </li>
            ))}</ul>
            <p>{proposal.units.reduce((sum, { count }) => sum + count, 0)} miniaturas · 1 Héroe incluido · {proposal.equipment.reduce((sum, { count }) => sum + count, 0)} cartas{proposal.total < budget ? ` · ${budget - proposal.total} Valor disponible` : ''}</p>
          </div>
        </div>
      ) : <p role="status">No hay una plantilla válida con los costes actuales para este presupuesto. Puedes montar tu ejército desde Héroes y Unidades.</p>}
    </div>
  )
}
