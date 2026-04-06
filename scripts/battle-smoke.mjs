import { resolveAttack } from '../src/utils/battleEngine.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const withFixedRandom = (sequence, run) => {
  const original = Math.random
  let index = 0
  Math.random = () => {
    if (index < sequence.length) {
      const value = sequence[index]
      index += 1
      return value
    }
    return 0.5
  }
  try {
    return run()
  } finally {
    Math.random = original
  }
}

const makeBaseArgs = () => ({
  attacker: { id: 'left', name: 'Attacker', hp: 5, maxHp: 5 },
  defender: { id: 'right', name: 'Defender', hp: 6, maxHp: 6, type: 'linea', save: 4 },
  weapon: { name: 'Test Weapon', attacks: '2', hit: '4+', damage: '1', critDamage: '2', abilities: [] },
  mode: 'ranged',
  conditions: {
    coverType: 'none',
    defenderPrepared: false,
    attackerMoved: false,
    halfRange: false,
    attackerEngaged: false,
    hasLineOfSight: true,
    afterDash: false,
  },
})

const run = () => {
  const baseResult = withFixedRandom([0.95, 0.2, 0.3], () => resolveAttack(makeBaseArgs()))
  assert(!baseResult.blocked, 'Base ranged attack should not be blocked')
  assert(Number.isFinite(baseResult.totals?.damage), 'Base attack must compute damage')
  assert(baseResult.attackerAfter.hp >= 0 && baseResult.attackerAfter.hp <= 5, 'Attacker HP out of range')
  assert(baseResult.defenderAfter.hp >= 0 && baseResult.defenderAfter.hp <= 6, 'Defender HP out of range')

  const blockedLoS = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, hasLineOfSight: false },
  })
  assert(blockedLoS.blocked, 'Ranged attack without LoS should be blocked')

  const parabolicBullseye = withFixedRandom([0.9, 0.95], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: {
        name: 'Mortar',
        attacks: '1',
        hit: '4+',
        damage: '1',
        critDamage: '2',
        abilities: ['Disparo parabólico'],
      },
      conditions: { ...makeBaseArgs().conditions, hasLineOfSight: false, coverType: 'partial' },
    }),
  )
  assert(!parabolicBullseye.blocked, 'Parabolic shot should work without LoS')
  assert(parabolicBullseye.parabolicScatter?.bullseye === true, 'Parabolic shot should record bullseye on 5-6')
  assert(Number.isFinite(parabolicBullseye.hitEntries?.[0]?.roll), 'Bullseye parabolic shot should still roll to hit')
  assert(parabolicBullseye.saveDiceCount === 0, 'Bullseye parabolic shot should deny Save rolls')

  const parabolicMiss = withFixedRandom([0.1, 0.95, 0.95], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: {
        name: 'Mortar',
        attacks: '1',
        hit: '4+',
        damage: '1',
        critDamage: '2',
        abilities: ['Disparo parabólico'],
      },
      conditions: { ...makeBaseArgs().conditions, hasLineOfSight: false, coverType: 'partial' },
    }),
  )
  assert(parabolicMiss.parabolicScatter?.bullseye === false, 'Parabolic shot should record precision miss on 1-4')
  assert(parabolicMiss.saveDiceCount === 1, 'Precision miss should keep the normal Save roll')
  assert(parabolicMiss.saveThreshold === 3, 'Precision miss should keep defender cover modifiers intact')

  const noResistance = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, defenderMartialResistance: false },
  })
  const withResistance = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, defenderMartialResistance: true },
  })
  assert(
    withResistance.hitThreshold === Math.min(7, noResistance.hitThreshold + 1),
    'Martial resistance should increase required hit value by 1 (capped)',
  )

  const rerollResult = withFixedRandom([0.1, 0.95, 0.2], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: { name: 'Reroll', attacks: '1', hit: '4+', damage: '1', critDamage: '2', abilities: [] },
      conditions: { ...makeBaseArgs().conditions, attackerRerollFailedHits: true },
    }),
  )
  assert(rerollResult.hitEntries?.[0]?.rerolled === true, 'Target in sight should reroll failed hit rolls')

  const voidEyesWithPartialCover = withFixedRandom([0.1, 0.95], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: { name: 'Void Rifle', attacks: '1', hit: '4+', damage: '1', critDamage: '2', abilities: [] },
      conditions: {
        ...makeBaseArgs().conditions,
        coverType: 'partial',
        attackerVoidEyesBeyond: true,
      },
    }),
  )
  assert(
    voidEyesWithPartialCover.hitEntries?.[0]?.rerolled === true,
    'Eyes from beyond should reroll failed hit rolls against partial cover',
  )
  assert(
    String(voidEyesWithPartialCover.hitEntries?.[0]?.rerollSource || '').includes('eyes_beyond'),
    'Eyes from beyond reroll source should be explicit',
  )

  const voidEyesWithoutPartialCover = withFixedRandom([0.1], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: { name: 'Void Rifle', attacks: '1', hit: '4+', damage: '1', critDamage: '2', abilities: [] },
      conditions: {
        ...makeBaseArgs().conditions,
        coverType: 'none',
        attackerVoidEyesBeyond: true,
      },
    }),
  )
  assert(
    voidEyesWithoutPartialCover.hitEntries?.[0]?.rerolled === false,
    'Eyes from beyond should not reroll when defender is not in partial cover',
  )

  const voracityResult = withFixedRandom([0.95, 0.1], () =>
    resolveAttack({
      attacker: { id: 'left', name: 'Swarm', hp: 4, maxHp: 5 },
      defender: { id: 'right', name: 'Victim', hp: 1, maxHp: 1, type: 'linea', save: 6 },
      weapon: { name: 'Claws', attacks: '1', hit: '3+', damage: '2', critDamage: '2', abilities: [] },
      mode: 'melee',
      conditions: {
        coverType: 'none',
        attackerVoracity: true,
      },
    }),
  )
  assert(voracityResult.defenderAfter.destroyed, 'Voracity test should destroy defender')
  assert(voracityResult.attackerAfter.hp === 5, 'Voracity should heal attacker by 1 HP when possible')

  const crucibleGloryResult = withFixedRandom([0.95, 0.1], () =>
    resolveAttack({
      attacker: { id: 'left', name: 'Shooter', hp: 5, maxHp: 5 },
      defender: { id: 'right', name: 'Crucible', hp: 5, maxHp: 5, type: 'linea', save: 7 },
      weapon: { name: 'Rifle', attacks: '1', hit: '4+', damage: '2', critDamage: '2', abilities: [] },
      mode: 'ranged',
      conditions: {
        coverType: 'none',
        hasLineOfSight: true,
        attackerEngaged: false,
        defenderCrucibleGlory: true,
      },
    }),
  )
  assert(crucibleGloryResult.totals.preventedDamage === 1, 'Crucible glory should prevent 1 ranged damage')
  assert(crucibleGloryResult.totals.damage === 1, 'Crucible glory should reduce final ranged damage by 1')

  const sacredVowResult = withFixedRandom([0.1, 0.95], () =>
    resolveAttack({
      attacker: { id: 'left', name: 'Crucible Melee', hp: 4, maxHp: 4 },
      defender: { id: 'right', name: 'Target', hp: 4, maxHp: 4, type: 'linea', save: 7 },
      weapon: { name: 'Blade', attacks: '1', hit: '3+', damage: '1', critDamage: '2', abilities: [] },
      mode: 'melee',
      conditions: {
        coverType: 'none',
        attackerCrucibleSacredVow: true,
      },
    }),
  )
  assert(sacredVowResult.hitEntries?.[0]?.rerolled === true, 'Sacred vow should reroll one failed melee die')
  assert(sacredVowResult.hitEntries?.[0]?.rerollSource === 'sacred_vow', 'Sacred vow reroll source should be explicit')

  const meleeBaseResult = resolveAttack({
    attacker: { id: 'left', name: 'Melee Attacker', hp: 4, maxHp: 4 },
    defender: { id: 'right', name: 'Melee Defender', hp: 4, maxHp: 4, type: 'linea', save: 4 },
    weapon: { name: 'Blade', attacks: '2', hit: '3+', damage: '1', critDamage: '2', abilities: [] },
    mode: 'melee',
    conditions: {
      coverType: 'none',
      attackerCoverType: 'none',
    },
  })
  const meleePartialCoverResult = resolveAttack({
    attacker: { id: 'left', name: 'Melee Attacker', hp: 4, maxHp: 4 },
    defender: { id: 'right', name: 'Melee Defender', hp: 4, maxHp: 4, type: 'linea', save: 4 },
    weapon: { name: 'Blade', attacks: '2', hit: '3+', damage: '1', critDamage: '2', abilities: [] },
    mode: 'melee',
    conditions: {
      coverType: 'partial',
      attackerCoverType: 'none',
    },
  })
  assert(
    meleePartialCoverResult.totals.attackDiceCount === Math.max(0, meleeBaseResult.totals.attackDiceCount - 1),
    'Partial cover in melee should remove 1 attack die',
  )

  const antiMatchesElite = withFixedRandom([0.7, 0.7], () =>
    resolveAttack({
      attacker: { id: 'left', name: 'Anti Attacker', hp: 4, maxHp: 4 },
      defender: { id: 'right', name: 'Elite Target', hp: 6, maxHp: 6, type: 'elite', save: 7 },
      weapon: { name: 'Crusher Bite', attacks: '2', hit: '3+', damage: '3', critDamage: '4', abilities: ['Anti 5+ (Élite)'] },
      mode: 'melee',
      conditions: {
        coverType: 'none',
      },
    }),
  )
  assert(antiMatchesElite.totals.crits === 2, 'Anti should convert matching 5+ results into crits against the right target type')
  assert(antiMatchesElite.totals.hits === 0, 'Anti should not leave matching converted results as normal hits')

  const antiDoesNotMatchLine = withFixedRandom([0.7, 0.7], () =>
    resolveAttack({
      attacker: { id: 'left', name: 'Anti Attacker', hp: 4, maxHp: 4 },
      defender: { id: 'right', name: 'Line Target', hp: 6, maxHp: 6, type: 'linea', save: 7 },
      weapon: { name: 'Crusher Bite', attacks: '2', hit: '3+', damage: '3', critDamage: '4', abilities: ['Anti 5+ (Élite)'] },
      mode: 'melee',
      conditions: {
        coverType: 'none',
      },
    }),
  )
  assert(antiDoesNotMatchLine.totals.crits === 0, 'Anti should not trigger against the wrong target type')
  assert(antiDoesNotMatchLine.totals.hits === 2, 'Non-matching Anti results should remain normal hits')

  const criticalAttackResult = withFixedRandom([0.95, 0.7, 0.95], () =>
    resolveAttack({
      ...makeBaseArgs(),
      weapon: {
        name: 'Critical Blade',
        attacks: '2',
        hit: '4+',
        damage: '1',
        critDamage: '2',
        abilities: ['Ataque crítico'],
      },
    }),
  )
  assert(criticalAttackResult.totals.crits === 1, 'Critical attack test should produce one crit')
  assert(criticalAttackResult.totals.hits === 1, 'Critical attack test should produce one normal hit')
  assert(criticalAttackResult.saveDiceCount === 1, 'Critical hits should not generate Save rolls')
  assert(criticalAttackResult.totals.blockedCrits === 0, 'Critical attack should prevent blocking crits with saves')

  const feintCounterResult = withFixedRandom([0.95, 0.1], () =>
    resolveAttack({
      ...makeBaseArgs(),
      conditions: {
        ...makeBaseArgs().conditions,
        defenderPrepared: false,
        defenderRebelFeint: true,
      },
    }),
  )
  assert(feintCounterResult.canCounter === true, 'Feint should allow a ranged response without prepared state')

  const noProtocols = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, attackerTechnocratsCombatProtocols: false },
  })
  const withProtocols = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, attackerTechnocratsCombatProtocols: true },
  })
  assert(
    withProtocols.hitThreshold === Math.max(2, noProtocols.hitThreshold - 1),
    'Combat protocols should reduce required hit value by 1 (capped)',
  )

  const baseFederation = resolveAttack(makeBaseArgs())
  const entrenchedFederation = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, attackerFederationEntrenchment: true, attackerMoved: false },
  })
  assert(
    entrenchedFederation.totals.attackDiceCount === baseFederation.totals.attackDiceCount + 1,
    'Entrenchment should add +1 ranged attack die when attacker did not move',
  )

  const movedEntrenchedFederation = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, attackerFederationEntrenchment: true, attackerMoved: true },
  })
  assert(
    movedEntrenchedFederation.totals.attackDiceCount === baseFederation.totals.attackDiceCount,
    'Entrenchment should not add attack die when attacker moved',
  )

  const furyFederation = resolveAttack({
    ...makeBaseArgs(),
    conditions: { ...makeBaseArgs().conditions, attackerFederationFuryOfTheFallen: true },
  })
  assert(
    furyFederation.totals.attackDiceCount === baseFederation.totals.attackDiceCount + 1,
    'Fury of the Fallen should add +1 attack die',
  )

  console.log('Battle smoke checks: OK')
}

run()
