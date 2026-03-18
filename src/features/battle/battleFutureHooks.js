import { clamp, toNumber } from './battleUtils.js'

// Keep future-facing knobs in one place so rule updates do not require rewiring Batalla.jsx.
export const sanitizeBattleUnitCount = (value, fallback = 1) =>
  clamp(Math.trunc(toNumber(value, fallback)), 1, 99)

// Placeholder extension point for future squad-size and specialty rules.
// Current release keeps neutral modifiers to avoid behavior changes.
export const buildFutureCombatConditions = ({
  attackerUnitCount = 1,
  defenderUnitCount = 1,
}) => ({
  attackerUnitCount: sanitizeBattleUnitCount(attackerUnitCount, 1),
  defenderUnitCount: sanitizeBattleUnitCount(defenderUnitCount, 1),
  specialtyRules: [],
})

