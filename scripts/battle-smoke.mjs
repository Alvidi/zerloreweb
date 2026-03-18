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

  console.log('Battle smoke checks: OK')
}

run()
