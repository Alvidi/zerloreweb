const getScatterDirectionIcon = (direction) => {
  const icons = {
    N: '↑',
    NE: '↗',
    SE: '↘',
    S: '↓',
    SW: '↙',
    NW: '↖',
  }
  return icons[String(direction || '').toUpperCase()] || '↑'
}

const extractFactionAbilityName = (text, lang) => {
  const raw = String(text || '').trim()
  if (!raw) return ''

  const activePattern = lang === 'en'
    ? /^(.*?)\s+active\s*:/i
    : /^(.*?)\s+activ[oa]\s*:/i
  const activeMatch = raw.match(activePattern)
  if (activeMatch?.[1]) return activeMatch[1].trim()

  const colonIndex = raw.indexOf(':')
  if (colonIndex > 0) return raw.slice(0, colonIndex).trim()
  return ''
}

const getFactionAbilityHeading = (details, lang) => {
  const names = Array.from(
    new Set(
      (details || [])
        .map((detail) => extractFactionAbilityName(detail?.text, lang))
        .filter(Boolean),
    ),
  )
  if (!names.length) return ''
  return ` (${names.join(', ')})`
}

const getEntryStageLabel = (entry, tx) => {
  if (entry.key.startsWith('charge-roll-')) return tx.chargeStep
  if (entry.key.includes('heroic-fall')) return tx.counterattack
  if (entry.key.includes('counter')) return tx.counterattack
  return tx.attackStep
}

const normalizeLogToken = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const isPreDefenseAttackerEffect = (detail) => {
  const normalized = normalizeLogToken(detail?.text)
  return (
    normalized.startsWith('asaltante')
    || normalized.startsWith('raider')
    || normalized.startsWith('ataque critico')
    || normalized.startsWith('critical attack')
    || normalized.startsWith('disparo parabolico')
    || normalized.startsWith('parabolic shot')
    || normalized.startsWith('ignora coberturas')
    || normalized.startsWith('ignore cover')
  )
}

const renderAbilityGroups = ({
  details,
  labelClass,
  label,
  unitName,
  entryKey,
}) => {
  if (!details?.length) return null

  return (
    <div className="duel-log-line">
      <span className={labelClass}>
        <span>{label}</span>
        {!!unitName && (
          <>
            {' '}
            <span className="duel-log-line-label-unit">{unitName}</span>
          </>
        )}
      </span>
      <div className="duel-dice">
        {details.map((detail, detailIndex) => (
          <div key={`${entryKey}-${label}-${detailIndex}`} className="duel-ability-detail-group">
            {detail.dice?.map((die, dieIndex) => (
              <span
                key={`${entryKey}-${label}-die-${detailIndex}-${dieIndex}`}
                className={`duel-die ${
                  die.tone === 'count'
                    ? 'duel-die-tag'
                    : die.kind === 'scatter'
                      ? 'duel-die-scatter'
                      : die.outcome === 'fail'
                        ? 'duel-die-fail-gray'
                        : die.outcome === 'crit'
                          ? 'duel-die-attack duel-die-crit'
                          : 'duel-die-attack'
                }`}
                title={die.value}
              >
                {die.kind === 'scatter' ? (
                  <span className="duel-die-scatter-symbol">
                    {die.scatterBullseye ? '◎' : getScatterDirectionIcon(die.scatterDirection)}
                  </span>
                ) : (
                  die.value
                )}
              </span>
            ))}
            <span className="duel-log-copy duel-log-ability-line">{detail.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const renderSectionHeader = ({ title, unitName, className = 'duel-log-line-label' }) => (
  <div className="duel-log-line">
    <span className={className}>
      <span>{title}</span>
      {!!unitName && (
        <>
          <span> </span>
          <span className="duel-log-line-label-unit">{unitName}</span>
        </>
      )}
    </span>
  </div>
)

function BattleCombatLog({ logEntries, tx, lang }) {
  return (
    <article className="duel-log reveal">
      <div className="duel-log-head">
        <h3>{tx.combatLog}</h3>
      </div>
      {!logEntries.length && <p className="battle-empty">{tx.emptyLog}</p>}
      {logEntries.length > 0 && (
        <div className="duel-log-list">
          {logEntries.map((entry) => {
            const isChargeRollEntry = entry.key.startsWith('charge-roll-')
            const attackerHpBefore = Number(entry.resultState?.attacker?.hpBefore)
            const attackerHpAfter = Number(entry.resultState?.attacker?.hp)
            const showSelfDamageTransition = Number(entry.resultState?.selfDamage) > 0
              && Number.isFinite(attackerHpBefore)
              && Number.isFinite(attackerHpAfter)
            const attackerUnitName = String(entry.resultState?.attacker?.name || '-')
            const defenderUnitName = String(entry.resultState?.defender?.name || '-')
            const primaryUnitName = attackerUnitName
            const secondaryUnitName = defenderUnitName
            const preAttackDetails = entry.preAttackDetails || []
            const fallbackPreAttackConditionDetails = preAttackDetails.filter((detail) => detail.source === 'condition')
            const fallbackPreAttackFactionAbilityDetails = preAttackDetails.filter((detail) => detail.source === 'faction')
            const fallbackPreAttackWeaponAbilityDetails = preAttackDetails.filter(
              (detail) => detail.source !== 'condition' && detail.source !== 'faction',
            )
            const abilityDetails = entry.abilityDetails || []
            const fallbackWeaponAbilityDetails = abilityDetails.filter((detail) => detail.source !== 'faction')
            const fallbackFactionAbilityDetails = abilityDetails.filter((detail) => detail.source === 'faction')
            const preAttackConditionDetails = entry.conditionDetails || fallbackPreAttackConditionDetails
            const preAttackTrueWeaponAbilityDetails = entry.preWeaponAbilityDetails || fallbackPreAttackWeaponAbilityDetails
            const preAttackFactionAbilityDetails = entry.preFactionAbilityDetails || fallbackPreAttackFactionAbilityDetails
            const rawWeaponAbilityDetails = entry.weaponAbilityDetails || fallbackWeaponAbilityDetails
            const attackerResolvedWeaponAbilityDetails = rawWeaponAbilityDetails.filter(
              (detail) => !isPreDefenseAttackerEffect(detail),
            )
            const defenderIncomingEffectDetails = rawWeaponAbilityDetails.filter(isPreDefenseAttackerEffect)
            const attackerFactionAbilityDetails = entry.attackerFactionAbilityDetails
              || fallbackFactionAbilityDetails.filter((detail) => detail.owner !== 'defender')
            const defenderFactionAbilityDetails = entry.defenderFactionAbilityDetails
              || fallbackFactionAbilityDetails.filter((detail) => detail.owner === 'defender')
            const attackerPreFactionAbilityDetails = attackerFactionAbilityDetails.filter(
              (detail) => detail.phase !== 'post' && detail.phase !== 'result',
            )
            const attackerPostFactionAbilityDetails = attackerFactionAbilityDetails.filter(
              (detail) => detail.phase === 'post',
            )
            const attackerWeaponAbilityDetails = [
              ...preAttackTrueWeaponAbilityDetails,
              ...attackerResolvedWeaponAbilityDetails,
            ]
            const attackerCombinedFactionAbilityDetails = [
              ...preAttackFactionAbilityDetails,
              ...attackerPreFactionAbilityDetails,
            ]
            const coverDetails = entry.coverDetails || (
              entry.coverLine
                ? [{
                  text: entry.coverLine,
                  dice: [],
                  label: entry.coverLabel || tx.coverType,
                  unitName: entry.coverUnitName || secondaryUnitName,
                }]
                : []
            )
            const attackerCoverDetails = entry.attackerCoverDetails || []
            const hasDefenderContent = (
              defenderIncomingEffectDetails.length > 0
              || coverDetails.length > 0
              || defenderFactionAbilityDetails.length > 0
              || Boolean(entry.defenseDice?.length)
              || Boolean(entry.defenderLine)
              || Boolean(entry.defenderSave)
            )
            const defenderFactionAbilityHeading = getFactionAbilityHeading(defenderFactionAbilityDetails, lang)
            const stageLabel = getEntryStageLabel(entry, tx)
            return (
              <article key={entry.key} className="duel-log-entry">
                <div className="duel-log-entry-top">
                  <span className="duel-log-stage-pill">
                    <span>{stageLabel}</span>
                  </span>
                  {!isChargeRollEntry && (
                    <span className="duel-log-versus">
                      <span>{attackerUnitName}</span>
                      <span>{tx.logVersus}</span>
                      <span>{defenderUnitName}</span>
                    </span>
                  )}
                </div>
                <div className="duel-log-subsection duel-log-subsection-attacker">
                  {renderSectionHeader({
                    title: tx.attacker.toUpperCase(),
                    unitName: primaryUnitName,
                    className: 'duel-log-line-label duel-log-line-label-attacker',
                  })}
                  {renderAbilityGroups({
                    details: attackerWeaponAbilityDetails,
                    labelClass: 'duel-log-line-label duel-log-line-label-ability',
                    label: tx.weaponAbilityLog,
                    unitName: '',
                    entryKey: `${entry.key}-attacker-weapon`,
                  })}
                  {renderAbilityGroups({
                    details: attackerCombinedFactionAbilityDetails,
                    labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                    label: tx.factionAbilityLog,
                    unitName: '',
                    entryKey: `${entry.key}-attacker-faction`,
                  })}
                  {renderAbilityGroups({
                    details: preAttackConditionDetails,
                    labelClass: 'duel-log-line-label',
                    label: tx.coverType,
                    unitName: '',
                    entryKey: `${entry.key}-pre-condition`,
                  })}
                  {renderAbilityGroups({
                    details: attackerCoverDetails,
                    labelClass: 'duel-log-line-label',
                    label: tx.coverType,
                    unitName: '',
                    entryKey: `${entry.key}-attacker-cover`,
                  })}
                  {!entry.hidePrimaryLine && (
                    <div className="duel-log-line">
                      <span className="duel-log-line-label">{lang === 'en' ? 'ROLLS' : 'TIRADAS'}</span>
                      <div className="duel-dice">
                        {!!entry.attackCountDice?.length && (
                          <>
                            <span className="duel-log-copy-note">
                              {lang === 'en' ? 'Attack count' : 'Ataques'}
                            </span>
                            {entry.attackCountDice.map((die, index) => (
                              <span
                                key={`${entry.key}-attack-count-${index}`}
                                className="duel-die duel-die-attack duel-die-count"
                                title={die.dieType}
                              >
                                <span className="duel-die-count-value">{die.value}</span>
                                <span className="duel-die-count-type">{die.dieType}</span>
                              </span>
                            ))}
                          </>
                        )}
                        {!!entry.attackDice?.length && (
                          <span className="duel-log-copy-note">
                            {isChargeRollEntry ? tx.chargeRollsLabel : lang === 'en' ? 'Attack rolls' : 'Tiradas de ataque'}
                          </span>
                        )}
                        {entry.attackDice?.map((die, index) => (
                          <span
                            key={`${entry.key}-attacker-${index}`}
                            className={`duel-die ${
                              die.tone === 'charge'
                                ? 'duel-die-charge'
                                : die.tone === 'count'
                                  ? 'duel-die-tag'
                                  : die.outcome === 'fail'
                                    ? 'duel-die-fail-gray'
                                    : die.outcome === 'crit'
                                      ? 'duel-die-attack duel-die-crit'
                                      : 'duel-die-attack'
                            }`}
                          >
                            {die.value}
                          </span>
                        ))}
                        {!!entry.hitThresholdDice?.length && (
                          <>
                            <span className="duel-log-copy-note">
                              {lang === 'en' ? 'Hits' : 'Impactos'}
                            </span>
                            {entry.hitThresholdDice.map((die, index) => (
                              <span
                                key={`${entry.key}-hit-threshold-${index}`}
                                className="duel-die duel-die-attack duel-die-count"
                                title={die.dieType}
                              >
                                <span className="duel-die-count-value">{die.value}</span>
                                <span className="duel-die-count-type">{die.dieType}</span>
                              </span>
                            ))}
                          </>
                        )}
                        <span className="duel-log-copy">{entry.attackerLine}</span>
                        {!!entry.abilityLine && (
                          <span className="duel-log-copy duel-log-ability-line">{entry.abilityLine}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {renderAbilityGroups({
                    details: attackerPostFactionAbilityDetails,
                    labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                    label: tx.factionAbilityLog,
                    unitName: '',
                    entryKey: `${entry.key}-attacker-faction-post`,
                  })}
                </div>
                {hasDefenderContent && (
                  <div className="duel-log-subsection duel-log-subsection-defender">
                  {renderSectionHeader({
                    title: tx.defender.toUpperCase(),
                    unitName: secondaryUnitName,
                    className: 'duel-log-line-label duel-log-line-label-defender',
                  })}
                  {renderAbilityGroups({
                    details: defenderIncomingEffectDetails,
                    labelClass: 'duel-log-line-label duel-log-line-label-ability',
                    label: tx.weaponAbilityLog,
                    unitName: '',
                    entryKey: `${entry.key}-incoming-effects`,
                  })}
                  {coverDetails.map((detail, detailIndex) => renderAbilityGroups({
                    details: [{ text: detail.text, dice: detail.dice || [] }],
                    labelClass: 'duel-log-line-label',
                    label: detail.label,
                    unitName: '',
                    entryKey: `${entry.key}-cover-${detailIndex}`,
                  }))}
                  {renderAbilityGroups({
                    details: defenderFactionAbilityDetails,
                    labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                    label: `${tx.factionAbilityLog}${defenderFactionAbilityHeading}`,
                    unitName: '',
                    entryKey: `${entry.key}-faction-defender`,
                  })}
                  {(entry.defenseDice?.length || entry.defenderLine || entry.defenderSave) && (
                    <div className="duel-log-line">
                      <span className="duel-log-line-label">{lang === 'en' ? 'ROLLS' : 'TIRADAS'}</span>
                      <div className="duel-dice">
                      {entry.defenseDice?.map((die, index) => (
                        <span
                          key={`${entry.key}-defender-${index}`}
                          className={`duel-die ${die.blocked ? 'duel-die-defense' : 'duel-die-fail-gray'} ${Number(die.value) === 6 ? 'duel-die-crit' : ''}`}
                        >
                          {die.value}
                        </span>
                      ))}
                      {entry.defenderSave ? (
                        <span className="duel-log-copy">
                          <span>{entry.defenderLead}</span>
                          <span className="duel-log-cover-tag">{lang === 'en' ? 'Save:' : 'salvación:'}</span>
                          <span className="duel-log-save-threshold"> {entry.defenderSave}</span>
                          <span>{entry.defenderTailPrefix || entry.defenderTail}</span>
                          {!!entry.defenderMitigationInline && (
                            <span className="duel-log-mitigation-note">{entry.defenderMitigationInline}</span>
                          )}
                          <span>{entry.defenderTailPrefix ? entry.defenderTailSuffix : ''}</span>
                          {!!entry.defenderMitigationNote && (
                            <span className="duel-log-mitigation-note"> · {entry.defenderMitigationNote}</span>
                          )}
                        </span>
                      ) : (
                        <span className="duel-log-copy">
                          <span>{entry.defenderLinePrefix || entry.defenderLine}</span>
                          {!!entry.defenderMitigationInline && (
                            <span className="duel-log-mitigation-note">{entry.defenderMitigationInline}</span>
                          )}
                          <span>{entry.defenderLinePrefix ? entry.defenderLineSuffix : ''}</span>
                          {!!entry.defenderMitigationNote && (
                            <span className="duel-log-mitigation-note"> · {entry.defenderMitigationNote}</span>
                          )}
                        </span>
                      )}
                      </div>
                    </div>
                  )}
                  </div>
                )}
                {!entry.hideResult && (
                  <div className="duel-log-subsection duel-log-subsection-result">
                    <div className="duel-log-line">
                      <span className="duel-log-line-label">{tx.result}</span>
                      <div className="duel-dice duel-result-block">
                      <p className="duel-log-copy duel-log-copy-result">
                        {lang === 'en'
                          ? `${attackerUnitName} deals ${entry.damageValue || 0} damage to ${defenderUnitName}.`
                          : `${attackerUnitName} hace ${entry.damageValue || 0} de daño a ${defenderUnitName}.`}
                      </p>
                      <p className="duel-log-copy duel-log-copy-result">
                        <span>{`${entry.resultState.attacker.name}: `}</span>
                        {entry.resultState.attacker.defeated ? (
                          <span className="duel-log-defeated">{lang === 'en' ? 'The unit has been defeated.' : 'La unidad ha sido derrotada.'}</span>
                        ) : (
                          <>
                            <span>{lang === 'en' ? 'ends with ' : 'se queda con '}</span>
                            <span className="duel-log-hp-remaining">{entry.resultState.attacker.hp} {tx.hp}</span>
                            {showSelfDamageTransition && (
                              <span>{lang === 'en'
                                ? ` (${attackerHpBefore} -> ${attackerHpAfter} HP)`
                                : ` (${attackerHpBefore} -> ${attackerHpAfter} vidas)`}</span>
                            )}
                            <span>.</span>
                          </>
                        )}
                      </p>
                      <p className="duel-log-copy duel-log-copy-result">
                        <span>{`${entry.resultState.defender.name}: `}</span>
                        {entry.resultState.defender.defeated ? (
                          <span className="duel-log-defeated">{lang === 'en' ? 'The unit has been defeated.' : 'La unidad ha sido derrotada.'}</span>
                        ) : (
                          <>
                            <span>{lang === 'en' ? 'ends with ' : 'se queda con '}</span>
                            <span className="duel-log-hp-remaining">{entry.resultState.defender.hp} {tx.hp}</span>
                            <span>.</span>
                          </>
                        )}
                      </p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </article>
  )
}

export default BattleCombatLog
