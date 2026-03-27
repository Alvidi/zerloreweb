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
        <span>{label}</span>{' '}
        <span className="duel-log-line-label-unit">{unitName}</span>
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
            const isCounterattackEntry = entry.key.includes('counter')
            const isChargeRollEntry = entry.key.startsWith('charge-roll-')
            const attackerSide = entry.attackerSide === 'right' ? 'right' : 'left'
            const attackerIsLeft = attackerSide === 'left'
            const attackerHpBefore = Number(entry.resultState?.attacker?.hpBefore)
            const attackerHpAfter = Number(entry.resultState?.attacker?.hp)
            const showSelfDamageTransition = Number(entry.resultState?.selfDamage) > 0
              && Number.isFinite(attackerHpBefore)
              && Number.isFinite(attackerHpAfter)
            const attackerUnitName = String(entry.resultState?.attacker?.name || '-')
              .toLocaleLowerCase(lang === 'en' ? 'en-US' : 'es-ES')
            const defenderUnitName = String(entry.resultState?.defender?.name || '-')
              .toLocaleLowerCase(lang === 'en' ? 'en-US' : 'es-ES')
            const primaryRole = isChargeRollEntry ? tx.chargeStep : attackerIsLeft ? tx.attacker : tx.defender
            const primaryUnitName = attackerUnitName
            const primaryLabelClass = isChargeRollEntry
              ? 'duel-log-line-label duel-log-line-label-faction-ability'
              : attackerIsLeft
                ? 'duel-log-line-label duel-log-line-label-attacker'
                : 'duel-log-line-label duel-log-line-label-defender'
            const secondaryRole = attackerIsLeft ? tx.defender : tx.attacker
            const secondaryUnitName = defenderUnitName
            const secondaryLabelClass = attackerIsLeft
              ? 'duel-log-line-label duel-log-line-label-defender'
              : 'duel-log-line-label duel-log-line-label-attacker'
            const preAttackWeaponAbilityDetails = (entry.preAttackDetails || []).filter((detail) => detail.source !== 'faction')
            const preAttackFactionAbilityDetails = (entry.preAttackDetails || []).filter((detail) => detail.source === 'faction')
            const weaponAbilityDetails = (entry.abilityDetails || []).filter((detail) => detail.source !== 'faction')
            const factionAbilityDetails = (entry.abilityDetails || []).filter((detail) => detail.source === 'faction')
            const attackerFactionAbilityDetails = factionAbilityDetails.filter((detail) => detail.owner !== 'defender')
            const defenderFactionAbilityDetails = factionAbilityDetails.filter((detail) => detail.owner === 'defender')
            const attackerFactionAbilityHeading = getFactionAbilityHeading(attackerFactionAbilityDetails, lang)
            const defenderFactionAbilityHeading = getFactionAbilityHeading(defenderFactionAbilityDetails, lang)
            return (
              <article key={entry.key} className="duel-log-entry">
                {!!entry.specialtyLine && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label">{tx.unitSpecialty}</span>
                    <div className="duel-dice">
                      <span className="duel-log-copy">{entry.specialtyLine}</span>
                    </div>
                  </div>
                )}
                {renderAbilityGroups({
                  details: preAttackWeaponAbilityDetails,
                  labelClass: 'duel-log-line-label duel-log-line-label-ability',
                  label: tx.weaponAbilityLog,
                  unitName: primaryUnitName,
                  entryKey: `${entry.key}-pre-weapon`,
                })}
                {renderAbilityGroups({
                  details: preAttackFactionAbilityDetails,
                  labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                  label: tx.factionAbilityLog,
                  unitName: primaryUnitName,
                  entryKey: `${entry.key}-pre-faction`,
                })}
                {!entry.hidePrimaryLine && (
                  <div className="duel-log-line">
                    <span className={primaryLabelClass}>
                      <span>{primaryRole}</span>{' '}
                      <span className="duel-log-line-label-unit">{primaryUnitName}</span>
                      {isCounterattackEntry && <span>{` (${tx.counterattack})`}</span>}
                    </span>
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
                  details: weaponAbilityDetails,
                  labelClass: 'duel-log-line-label duel-log-line-label-ability',
                  label: tx.weaponAbilityLog,
                  unitName: primaryUnitName,
                  entryKey: `${entry.key}-weapon`,
                })}
                {renderAbilityGroups({
                  details: attackerFactionAbilityDetails,
                  labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                  label: `${tx.factionAbilityLog}${attackerFactionAbilityHeading}`,
                  unitName: primaryUnitName,
                  entryKey: `${entry.key}-faction-attacker`,
                })}
                {renderAbilityGroups({
                  details: defenderFactionAbilityDetails,
                  labelClass: 'duel-log-line-label duel-log-line-label-faction-ability',
                  label: `${tx.factionAbilityLog}${defenderFactionAbilityHeading}`,
                  unitName: secondaryUnitName,
                  entryKey: `${entry.key}-faction-defender`,
                })}
                {!!entry.coverLine && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label">
                      <span>{tx.coverAndSave}</span>{' '}
                      <span className="duel-log-line-label-unit">{secondaryUnitName}</span>
                    </span>
                    <div className="duel-dice">
                      <span className="duel-log-copy">{entry.coverLine}</span>
                    </div>
                  </div>
                )}
                {(entry.defenseDice?.length || entry.defenderLine || entry.defenderSave) && (
                  <div className="duel-log-line">
                    <span className={secondaryLabelClass}>
                      <span>{secondaryRole}</span>{' '}
                      <span className="duel-log-line-label-unit">{secondaryUnitName}</span>
                    </span>
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
                          <span className="duel-log-save-threshold">{entry.defenderSave}</span>
                          {!!entry.defenderCover && (
                            <span className="duel-log-cover-tag"> · {entry.defenderCover}</span>
                          )}
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
                {!!entry.damageDetails?.length && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label duel-log-line-label-damage">
                      <span>{tx.damage}</span>{' '}
                      <span className="duel-log-line-label-unit">{primaryUnitName}</span>
                    </span>
                    <div className="duel-dice">
                      {entry.damageDetails.map((detail, detailIndex) => (
                        <div key={`${entry.key}-damage-detail-${detailIndex}`} className="duel-ability-detail-group">
                          {detail.dice?.map((die, dieIndex) => (
                            <span
                              key={`${entry.key}-damage-die-${detailIndex}-${dieIndex}`}
                              className={`duel-die ${
                                die.outcome === 'crit'
                                  ? 'duel-die-attack duel-die-crit'
                                  : 'duel-die-attack'
                              }`}
                            >
                              {die.value}
                            </span>
                          ))}
                          <span className="duel-log-copy duel-log-ability-line">{detail.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!entry.hideResult && (
                  <div className="duel-log-line">
                    <span className="duel-log-line-label">{tx.result}</span>
                    <div className="duel-dice duel-result-block">
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
