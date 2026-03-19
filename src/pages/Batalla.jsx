import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { getAbilityLabel, getAbilityDescription } from '../utils/abilities.js'
import { resolveAttack } from '../utils/battleEngine.js'
import { buildLocalizedFactionEntries } from '../utils/factionLocalization.js'
import UnitTypeBadge from '../features/battle/components/UnitTypeBadge.jsx'
import BattleCombatLog from '../features/battle/components/BattleCombatLog.jsx'
import { getBattleTranslations } from '../features/battle/battleTranslations.js'
import { createBattleLogBuilders } from '../features/battle/battleLogEntries.js'
import {
  buildFactionAttackConditions,
  implementedFactionAbilityKeys,
  isFactionEffectEnabled,
} from '../features/battle/factionAbilities.js'
import { buildFutureCombatConditions } from '../features/battle/battleFutureHooks.js'
import {
  hasWeaponAbilityId,
  WEAPON_ABILITY_IDS,
} from '../features/battle/weaponAbilities.js'
import {
  attackTypeOptions,
  buildHpValues,
  buildWeaponSelection,
  CHARGE_DISTANCE_MAX,
  CHARGE_DISTANCE_MIN,
  chargeDistanceOptions,
  clamp,
  coverTypeOptions,
  factionImages,
  getConditionKeyForAbility,
  getConditionSupport,
  getLimitedAmmoMax,
  getWeaponSlotsForMode,
  isFactionData,
  makeAmmoKey,
  makeHpKey,
  normalizeFaction,
  pickRandomItem,
  pickRandomUnitForMode,
  pickRandomWeaponIdsForMode,
  pickWeaponIdsForMode,
  resolveMode,
  rollChargeDice,
  swapMapBySidePrefix,
  getUnitTypeToken,
  toNumber,
} from '../features/battle/battleUtils.js'

const factionModules = import.meta.glob(['../data/factions/jsonFaccionesES/*.json', '../data/factions/jsonFaccionesEN/*.en.json'], { eager: true })

function Batalla() {
  const { lang } = useI18n()
  const tx = useMemo(() => getBattleTranslations(lang), [lang])

  const factions = useMemo(() => {
    return buildLocalizedFactionEntries(factionModules, lang)
      .map((item, index) => {
        if (!isFactionData(item.data)) return null
        return normalizeFaction(item.data, item.base, index)
      })
      .filter(Boolean)
  }, [lang])

  const [left, setLeft] = useState({ factionId: '', unitId: '', weaponIds: [] })
  const [right, setRight] = useState({ factionId: '', unitId: '', weaponIds: [] })
  const [leftFactionAbilityState, setLeftFactionAbilityState] = useState({})
  const [rightFactionAbilityState, setRightFactionAbilityState] = useState({})
  const [attackType, setAttackType] = useState('ranged')
  const [leftCoverType, setLeftCoverType] = useState('none')
  const [rightCoverType, setRightCoverType] = useState('none')
  const [leftMoved, setLeftMoved] = useState(false)
  const [rightMoved, setRightMoved] = useState(false)
  const [leftHalfRange, setLeftHalfRange] = useState(false)
  const [rightHalfRange, setRightHalfRange] = useState(false)
  const [leftAfterDash, setLeftAfterDash] = useState(false)
  const [rightAfterDash, setRightAfterDash] = useState(false)
  const [chargeDistance, setChargeDistance] = useState(7)
  const [hpMap, setHpMap] = useState({})
  const [ammoMap, setAmmoMap] = useState({})
  const [logEntries, setLogEntries] = useState([])
  const [isResolving, setIsResolving] = useState(false)
  const [defenderCounterattack, setDefenderCounterattack] = useState(true)
  const [leftUnitCount, setLeftUnitCount] = useState(1)
  const [rightUnitCount, setRightUnitCount] = useState(1)
  const timersRef = useRef([])
  const resolveRunRef = useRef(0)
  const mode = resolveMode(attackType)
  const canCounterByMode = mode === 'melee' || attackType === 'ranged'
  const isCounterattackEnabled = canCounterByMode && defenderCounterattack

  const factionById = useMemo(() => new Map(factions.map((faction) => [faction.id, faction])), [factions])

  const leftFactionId = left.factionId && factionById.has(left.factionId) ? left.factionId : factions[0]?.id || ''
  const rightFactionId = right.factionId && factionById.has(right.factionId) ? right.factionId : factions[0]?.id || ''

  const leftFaction = factionById.get(leftFactionId) || null
  const rightFaction = factionById.get(rightFactionId) || null
  const leftFactionAbilities = leftFaction?.abilities || []
  const rightFactionAbilities = rightFaction?.abilities || []
  const leftImplementedFactionAbilities = leftFactionAbilities.filter((ability) => implementedFactionAbilityKeys.has(ability.effectKey))
  const rightImplementedFactionAbilities = rightFactionAbilities.filter((ability) =>
    implementedFactionAbilityKeys.has(ability.effectKey),
  )

  const leftUnitId =
    left.unitId && leftFaction?.units.some((unit) => unit.id === left.unitId) ? left.unitId : leftFaction?.units[0]?.id || ''
  const rightUnitId =
    right.unitId && rightFaction?.units.some((unit) => unit.id === right.unitId) ? right.unitId : rightFaction?.units[0]?.id || ''

  const leftUnit = leftFaction?.units.find((unit) => unit.id === leftUnitId) || null
  const rightUnit = rightFaction?.units.find((unit) => unit.id === rightUnitId) || null
  const unitCanUseCover = (unit) => {
    const typeToken = getUnitTypeToken(unit?.type)
    return typeToken !== 'vehicle' && typeToken !== 'monster' && typeToken !== 'titan'
  }
  const leftCanUseCover = unitCanUseCover(leftUnit)
  const rightCanUseCover = unitCanUseCover(rightUnit)
  const leftWeapons = leftUnit?.weapons.filter((weapon) => weapon.kind === mode) || []
  const rightWeapons = rightUnit?.weapons.filter((weapon) => weapon.kind === mode) || []
  const leftWeaponSlots = getWeaponSlotsForMode(leftUnit, mode, leftWeapons.length)
  const rightWeaponSlots = getWeaponSlotsForMode(rightUnit, mode, rightWeapons.length)

  const safeLeftWeaponIds = buildWeaponSelection(
    left.weaponIds?.slice(0, leftWeaponSlots).length ? left.weaponIds : pickWeaponIdsForMode(leftUnit, mode),
    leftWeapons,
    leftWeaponSlots,
  )
  const safeRightWeaponIds = buildWeaponSelection(
    right.weaponIds?.slice(0, rightWeaponSlots).length ? right.weaponIds : pickWeaponIdsForMode(rightUnit, mode),
    rightWeapons,
    rightWeaponSlots,
  )

  const leftSelectedWeapons = safeLeftWeaponIds
    .map((weaponId) => leftWeapons.find((weapon) => weapon.id === weaponId))
    .filter(Boolean)
  const rightSelectedWeapons = safeRightWeaponIds
    .map((weaponId) => rightWeapons.find((weapon) => weapon.id === weaponId))
    .filter(Boolean)
  const leftConditionSupport = getConditionSupport(leftSelectedWeapons, mode)
  const rightConditionSupport = getConditionSupport(rightSelectedWeapons, mode)

  const leftPrimaryWeaponId = leftSelectedWeapons[0]?.id || ''
  const rightPrimaryWeaponId = rightSelectedWeapons[0]?.id || ''
  const getWeaponAmmoInfo = (side, factionId, unit, weapon, pendingSpend = {}) => {
    const maxAmmo = getLimitedAmmoMax(weapon)
    if (!maxAmmo && maxAmmo !== 0) {
      return { limited: false, max: null, used: 0, remaining: null, key: null }
    }
    const key = makeAmmoKey(side, factionId, unit?.id, weapon?.id)
    const used = Math.max(0, (ammoMap[key] || 0) + (pendingSpend[key] || 0))
    const remaining = Math.max(0, maxAmmo - used)
    return { limited: true, max: maxAmmo, used, remaining, key }
  }

  const leftHpKey = makeHpKey('L', leftFactionId, leftUnit?.id)
  const rightHpKey = makeHpKey('R', rightFactionId, rightUnit?.id)

  const getSquadCountMax = (unit) => Math.max(1, toNumber(unit?.squadMax, 1))
  const clampSquadCount = (value, unit) => {
    const raw = Math.max(1, toNumber(value, 1))
    return clamp(raw, 1, getSquadCountMax(unit))
  }
  const getSquadHpPoolMax = (unit, unitCount) => {
    if (!unit) return 0
    const perUnitHp = Math.max(1, toNumber(unit.hp, 1))
    return perUnitHp * clampSquadCount(unitCount, unit)
  }
  const sanitizeSquadHp = (rawHp, unit, unitCount) => {
    const maxHp = getSquadHpPoolMax(unit, unitCount)
    return clamp(toNumber(rawHp, maxHp), 0, maxHp)
  }
  const leftHpMax = getSquadHpPoolMax(leftUnit, leftUnitCount)
  const rightHpMax = getSquadHpPoolMax(rightUnit, rightUnitCount)
  const leftHp = sanitizeSquadHp(hpMap[leftHpKey], leftUnit, leftUnitCount)
  const rightHp = sanitizeSquadHp(hpMap[rightHpKey], rightUnit, rightUnitCount)
  const getAliveSquadCount = (poolHp, unit, fallbackCount = 1) => {
    if (!unit) return 0
    const perUnitHp = Math.max(1, toNumber(unit.hp, 1))
    const aliveByHp = Math.ceil(Math.max(0, toNumber(poolHp, 0)) / perUnitHp)
    return Math.min(clampSquadCount(fallbackCount, unit), Math.max(0, aliveByHp))
  }
  const buildUnitCountOptions = (unit) => {
    const max = getSquadCountMax(unit)
    const options = []
    for (let value = 1; value <= max; value += 1) {
      options.push(value)
    }
    return options
  }
  const scaleAttackExpression = (rawAttacks, multiplier) => {
    const safeMultiplier = Math.max(1, toNumber(multiplier, 1))
    const raw = String(rawAttacks || '1D').trim()
    if (safeMultiplier === 1 || !raw) return raw || '1D'

    const diceMatch = raw.match(/^(\d*)d(\d+)?([+-]\d+)?$/i)
    if (diceMatch) {
      const baseCount = Math.max(1, toNumber(diceMatch[1] || 1, 1))
      const baseSides = diceMatch[2] || ''
      const baseModifier = toNumber(diceMatch[3] || 0, 0)
      const nextCount = baseCount * safeMultiplier
      const nextModifier = baseModifier * safeMultiplier
      const diceCore = baseSides ? `${nextCount}D${baseSides}` : `${nextCount}D`
      if (!nextModifier) return diceCore
      return `${diceCore}${nextModifier > 0 ? `+${nextModifier}` : nextModifier}`
    }

    const asFlat = Number(raw)
    if (Number.isFinite(asFlat)) return `${asFlat * safeMultiplier}`
    return raw
  }

  const setUnitHp = (side, factionId, unit, unitCount, rawValue) => {
    if (!unit) return
    const key = makeHpKey(side, factionId, unit.id)
    const next = sanitizeSquadHp(rawValue, unit, unitCount)
    setHpMap((prev) => ({ ...prev, [key]: next }))
  }

  const setWeaponAtSlot = (side, slotIndex, weaponId, availableWeapons, slots, activeIds) => {
    const setSide = side === 'left' ? setLeft : setRight
    setSide((prev) => {
      const nextIds = buildWeaponSelection(activeIds, availableWeapons, slots)
      if (slotIndex >= 0 && slotIndex < nextIds.length) {
        nextIds[slotIndex] = weaponId
      }
      return { ...prev, weaponIds: nextIds }
    })
  }

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(
    () => () => {
      clearTimers()
    },
    [],
  )

  const playLog = (entries) => {
    const runId = resolveRunRef.current + 1
    resolveRunRef.current = runId
    clearTimers()
    setLogEntries([])
    if (!entries.length) {
      setIsResolving(false)
      return
    }
    setIsResolving(true)
    const stepMs = entries.length > 8 ? 160 : 230

    entries.forEach((entry, index) => {
      const timer = setTimeout(() => {
        if (resolveRunRef.current !== runId) return
        setLogEntries((prev) => [...prev, entry])
      }, stepMs * (index + 1))
      timersRef.current.push(timer)
    })

    const totalMs = stepMs * (entries.length + 1)
    const finish = setTimeout(() => {
      if (resolveRunRef.current !== runId) return
      setIsResolving(false)
    }, totalMs)
    timersRef.current.push(finish)

    const safety = setTimeout(() => {
      if (resolveRunRef.current !== runId) return
      setIsResolving(false)
      clearTimers()
    }, totalMs + 1200)
    timersRef.current.push(safety)
  }

  const currentModeLabel = attackType === 'charge' ? tx.charge : mode === 'ranged' ? tx.ranged : tx.melee
  const setFactionAbilityEnabled = (side, abilityId, enabled) => {
    if (!abilityId) return
    if (side === 'left') {
      setLeftFactionAbilityState((prev) => ({ ...prev, [abilityId]: enabled }))
      return
    }
    setRightFactionAbilityState((prev) => ({ ...prev, [abilityId]: enabled }))
  }
  const getAbilityConditionBinding = (side, rawAbility) => {
    const key = getConditionKeyForAbility(rawAbility)
    if (!key) return null
    const support = side === 'left' ? leftConditionSupport : rightConditionSupport
    if (!support[key]) return null

    if (side === 'left') {
      if (key === 'moved') return { checked: leftMoved, setChecked: setLeftMoved, label: tx.moved }
      if (key === 'halfRange') return { checked: leftHalfRange, setChecked: setLeftHalfRange, label: tx.halfRange }
      if (key === 'afterDash') return { checked: leftAfterDash, setChecked: setLeftAfterDash, label: tx.afterDash }
      return null
    }

    if (key === 'moved') return { checked: rightMoved, setChecked: setRightMoved, label: tx.moved }
    if (key === 'halfRange') return { checked: rightHalfRange, setChecked: setRightHalfRange, label: tx.halfRange }
    if (key === 'afterDash') return { checked: rightAfterDash, setChecked: setRightAfterDash, label: tx.afterDash }
    return null
  }
  const buildAbilityNotes = (weapon) =>
    (weapon?.abilities || [])
      .map((ability) => ({
        raw: ability,
        label: getAbilityLabel(ability, lang),
        description: getAbilityDescription(ability, lang),
      }))
      .filter((item) => item.label)
  const { buildCombatEntry, buildStatusEntry } = useMemo(
    () => createBattleLogBuilders({ lang, tx, currentModeLabel }),
    [lang, tx, currentModeLabel],
  )

  const handleFlip = () => {
    if (isResolving) return
    if (!leftUnit || !rightUnit) return

    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])

    const nextLeft = {
      factionId: rightFactionId,
      unitId: rightUnitId,
      weaponIds: [...safeRightWeaponIds],
    }
    const nextRight = {
      factionId: leftFactionId,
      unitId: leftUnitId,
      weaponIds: [...safeLeftWeaponIds],
    }

    setLeft(nextLeft)
    setRight(nextRight)
    setLeftFactionAbilityState(rightFactionAbilityState)
    setRightFactionAbilityState(leftFactionAbilityState)

    setLeftCoverType(rightCoverType)
    setRightCoverType(leftCoverType)
    setLeftMoved(rightMoved)
    setRightMoved(leftMoved)
    setLeftHalfRange(rightHalfRange)
    setRightHalfRange(leftHalfRange)
    setLeftAfterDash(rightAfterDash)
    setRightAfterDash(leftAfterDash)
    const nextLeftUnitCount = clampSquadCount(rightUnitCount, rightUnit)
    const nextRightUnitCount = clampSquadCount(leftUnitCount, leftUnit)
    setLeftUnitCount(nextLeftUnitCount)
    setRightUnitCount(nextRightUnitCount)

    setHpMap((prev) => swapMapBySidePrefix(prev, 'L', 'R'))
    setAmmoMap((prev) => swapMapBySidePrefix(prev, 'left', 'right'))
  }

  const handleResolve = () => {
    if (isResolving) return
    if (!leftUnit || !rightUnit || !leftSelectedWeapons.length) return
    const needsRightWeapons = isCounterattackEnabled
    if (needsRightWeapons && !rightSelectedWeapons.length) return

    // Every resolve starts a fresh simulation and replaces prior results.
    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])
    setAmmoMap({})

    const leftCountAtStart = clampSquadCount(leftUnitCount, leftUnit)
    const rightCountAtStart = clampSquadCount(rightUnitCount, rightUnit)
    let nextLeftHp = sanitizeSquadHp(leftHp, leftUnit, leftCountAtStart)
    let nextRightHp = sanitizeSquadHp(rightHp, rightUnit, rightCountAtStart)
    const leftMaxHpPool = Math.max(1, getSquadHpPoolMax(leftUnit, leftCountAtStart))
    const rightMaxHpPool = Math.max(1, getSquadHpPoolMax(rightUnit, rightCountAtStart))
    const entries = []
    const pendingAmmoSpend = {}
    let rangedCounterReady = false
    let rangedCounterForcedByFaction = false
    const heroicFallUsedBySide = { left: false, right: false }
    const crucibleGloryUsedBySide = { left: false, right: false }
    const combatProtocolsUsedBySide = { left: false, right: false }

    const isFactionAbilityEnabledBySide = (side, effectKey) => {
      const abilities = side === 'left' ? leftFaction?.abilities : rightFaction?.abilities
      const stateMap = side === 'left' ? leftFactionAbilityState : rightFactionAbilityState
      return isFactionEffectEnabled({ abilities, stateMap, effectKey })
    }

    const runAttack = ({
      attackerSide,
      weapon,
      stepLabel,
      index,
      allowDestroyedAttacker = false,
      extraFactionAbilityDetails = [],
    }) => {
      const defenderSide = attackerSide === 'left' ? 'right' : 'left'
      const attackerUnit = attackerSide === 'left' ? leftUnit : rightUnit
      const defenderUnit = defenderSide === 'left' ? leftUnit : rightUnit
      const attackerFaction = attackerSide === 'left' ? leftFaction : rightFaction
      const defenderFaction = defenderSide === 'left' ? leftFaction : rightFaction
      const attackerFactionAbilityState = attackerSide === 'left' ? leftFactionAbilityState : rightFactionAbilityState
      const defenderFactionAbilityState = defenderSide === 'left' ? leftFactionAbilityState : rightFactionAbilityState
      if (!attackerUnit || !defenderUnit) return

      const attackerHpBefore = attackerSide === 'left' ? nextLeftHp : nextRightHp
      const defenderHpBefore = defenderSide === 'left' ? nextLeftHp : nextRightHp
      if ((!allowDestroyedAttacker && attackerHpBefore <= 0) || defenderHpBefore <= 0) return
      const attackerAliveCount = attackerSide === 'left'
        ? getAliveSquadCount(attackerHpBefore, attackerUnit, leftCountAtStart)
        : getAliveSquadCount(attackerHpBefore, attackerUnit, rightCountAtStart)
      const defenderAliveCount = defenderSide === 'left'
        ? getAliveSquadCount(defenderHpBefore, defenderUnit, leftCountAtStart)
        : getAliveSquadCount(defenderHpBefore, defenderUnit, rightCountAtStart)
      if (attackerAliveCount <= 0 || defenderAliveCount <= 0) return

      const attackerFactionId = attackerSide === 'left' ? leftFactionId : rightFactionId
      const ammoInfo = getWeaponAmmoInfo(attackerSide, attackerFactionId, attackerUnit, weapon, pendingAmmoSpend)
      if (ammoInfo.limited && ammoInfo.remaining <= 0) {
        entries.push(
          buildStatusEntry({
            key: `${stepLabel}-${weapon.id}-${index}-no-ammo`,
            attackerSide,
            attackerName: attackerUnit.name,
            defenderName: defenderUnit.name,
            attackerHp: attackerHpBefore,
            defenderHp: defenderHpBefore,
            attackerLine:
              lang === 'en'
                ? `${attackerUnit.name} cannot use ${weapon.name}: ${tx.outOfAmmo}.`
                : `${attackerUnit.name} no puede usar ${weapon.name}: ${tx.outOfAmmo}.`,
            defenderLine:
              lang === 'en'
                ? `${defenderUnit.name} receives no damage in this step.`
                : `${defenderUnit.name} no recibe daño en este paso.`,
          }),
        )
        return
      }

      const attackerSupport = attackerSide === 'left' ? leftConditionSupport : rightConditionSupport
      const attackerMoved = attackerSupport.moved
        ? attackerSide === 'left'
          ? leftMoved
          : rightMoved
        : false
      const halfRange = attackerSupport.halfRange
        ? attackerSide === 'left'
          ? leftHalfRange
          : rightHalfRange
        : false
      const afterDash = attackerSupport.afterDash
        ? attackerSide === 'left'
          ? leftAfterDash
          : rightAfterDash
        : false
      const defenderCoverType = defenderSide === 'left'
        ? (leftCanUseCover ? leftCoverType : 'none')
        : (rightCanUseCover ? rightCoverType : 'none')
      const factionConditions = buildFactionAttackConditions({
        attackerAbilities: attackerFaction?.abilities,
        attackerState: attackerFactionAbilityState,
        defenderAbilities: defenderFaction?.abilities,
        defenderState: defenderFactionAbilityState,
        mode,
      })
      if (
        mode === 'melee'
        && factionConditions.attackerWildUncontrolledFury
        && !(attackType === 'charge' && attackerSide === 'left' && stepLabel === 'charge-attack')
      ) {
        factionConditions.attackerWildUncontrolledFury = false
      }
      if (mode === 'ranged' && factionConditions.attackerTechnocratsCombatProtocols && combatProtocolsUsedBySide[attackerSide]) {
        factionConditions.attackerTechnocratsCombatProtocols = false
      }
      if (mode === 'ranged' && factionConditions.defenderCrucibleGlory && crucibleGloryUsedBySide[defenderSide]) {
        factionConditions.defenderCrucibleGlory = false
      }
      const futureConditions = buildFutureCombatConditions({
        attackerUnitCount: attackerAliveCount,
        defenderUnitCount: defenderAliveCount,
      })

      const combatWeapon = {
        ...weapon,
        attacks: scaleAttackExpression(weapon.attacks, attackerAliveCount),
      }

      const attackResult = resolveAttack({
        attacker: {
          id: attackerSide,
          name: attackerUnit.name,
          hp: attackerHpBefore,
          maxHp: attackerSide === 'left' ? leftMaxHpPool : rightMaxHpPool,
        },
        defender: {
          id: defenderSide,
          name: defenderUnit.name,
          hp: defenderHpBefore,
          maxHp: defenderSide === 'left' ? leftMaxHpPool : rightMaxHpPool,
          type: defenderUnit.type,
          save: defenderUnit.save,
        },
        weapon: combatWeapon,
        mode,
        conditions: {
          coverType: defenderCoverType,
          defenderPrepared: mode === 'ranged' && defenderSide === 'right',
          attackerMoved,
          halfRange,
          attackerEngaged: false,
          hasLineOfSight: true,
          afterDash,
          ...factionConditions,
          ...futureConditions,
        },
      })

      if (ammoInfo.limited && !attackResult.blocked) {
        pendingAmmoSpend[ammoInfo.key] = (pendingAmmoSpend[ammoInfo.key] || 0) + 1
      }

      if (attackerSide === 'left') {
        nextLeftHp = attackResult.attackerAfter?.hp ?? nextLeftHp
        nextRightHp = attackResult.blocked ? nextRightHp : attackResult.defenderAfter.hp
        if (attackType === 'ranged' && attackResult.canCounter) {
          rangedCounterReady = true
          if (factionConditions.defenderRebelFeint) {
            rangedCounterForcedByFaction = true
          }
        }
      } else {
        nextRightHp = attackResult.attackerAfter?.hp ?? nextRightHp
        nextLeftHp = attackResult.blocked ? nextLeftHp : attackResult.defenderAfter.hp
      }
      if (!attackResult.blocked && mode === 'ranged' && Number(attackResult.totals?.preventedDamage) > 0) {
        crucibleGloryUsedBySide[defenderSide] = true
      }
      if (!attackResult.blocked && mode === 'ranged' && factionConditions.attackerTechnocratsCombatProtocols) {
        combatProtocolsUsedBySide[attackerSide] = true
      }

      entries.push(
        buildCombatEntry({
          key: `${stepLabel}-${weapon.id}-${index}`,
          title: '',
          attackerSide,
          attackerName: attackerUnit.name,
          defenderName: defenderUnit.name,
          weapon: combatWeapon,
          attackerHpBefore,
          defenderHpBefore,
          result: attackResult,
          extraFactionAbilityDetails,
        }),
      )

      const defenderDestroyed = !attackResult.blocked && (attackResult.defenderAfter?.hp || 0) <= 0
      const canUseHeroicFall = defenderDestroyed
        && !heroicFallUsedBySide[defenderSide]
        && isFactionAbilityEnabledBySide(defenderSide, 'crucible_heroic_fall')

      if (!canUseHeroicFall) return
      heroicFallUsedBySide[defenderSide] = true

      const heroicWeapon = (defenderSide === 'left' ? leftSelectedWeapons : rightSelectedWeapons)[0]
      const targetHpAfterKill = attackerSide === 'left' ? nextLeftHp : nextRightHp
      if (!heroicWeapon || targetHpAfterKill <= 0) return

      const heroicAttackerHp = defenderSide === 'left' ? nextLeftHp : nextRightHp
      const heroicDefenderHp = attackerSide === 'left' ? nextLeftHp : nextRightHp

      entries.push(
        buildStatusEntry({
          key: `${stepLabel}-heroic-fall-${defenderSide}-${index}`,
          attackerSide: defenderSide,
          attackerName: defenderUnit.name,
          defenderName: attackerUnit.name,
          attackerHp: heroicAttackerHp,
          defenderHp: heroicDefenderHp,
          attackerLine: '',
          defenderLine: '',
          hidePrimaryLine: true,
          abilityDetails: [{
            text:
              lang === 'en'
                ? `Heroic fall active: ${defenderUnit.name} performs a free counterattack before being removed.`
                : `Caída heroica activa: ${defenderUnit.name} realiza un contraataque gratuito antes de ser retirada.`,
            dice: [],
            source: 'faction',
            owner: 'attacker',
          }],
          hideResult: true,
        }),
      )

      runAttack({
        attackerSide: defenderSide,
        weapon: heroicWeapon,
        stepLabel: `${stepLabel}-heroic-fall`,
        index,
        allowDestroyedAttacker: true,
      })
    }

    const runWeaponsForSide = (side, stepLabel, options = {}) => {
      const { extraFactionAbilityDetails = [] } = options
      const selectedWeapons = side === 'left' ? leftSelectedWeapons : rightSelectedWeapons
      selectedWeapons.forEach((weapon, index) => {
        runAttack({
          attackerSide: side,
          weapon,
          stepLabel,
          index,
          extraFactionAbilityDetails: index === 0 ? extraFactionAbilityDetails : [],
        })
      })
    }

    if (attackType === 'charge') {
      const distanceToTarget = clamp(toNumber(chargeDistance, 7), CHARGE_DISTANCE_MIN, CHARGE_DISTANCE_MAX)
      const chargeRoll = rollChargeDice()
      const chargeSuccess = chargeRoll.total >= distanceToTarget

      entries.push(
        buildStatusEntry({
          key: `charge-roll-${chargeRoll.first}-${chargeRoll.second}`,
          attackerSide: 'left',
          attackerName: leftUnit.name,
          defenderName: rightUnit.name,
          attackerHp: nextLeftHp,
          defenderHp: nextRightHp,
          attackerLine:
            lang === 'en'
              ? `${tx.chargeRoll}: ${chargeRoll.total} (${chargeRoll.first}+${chargeRoll.second}) vs ${distanceToTarget}. ${
                chargeSuccess ? 'Charge was successful.' : 'Charge failed.'
              }`
              : `${tx.chargeRoll}: ${chargeRoll.total} (${chargeRoll.first}+${chargeRoll.second}) frente a ${distanceToTarget}. ${
                chargeSuccess ? 'La carga fue un éxito.' : 'La carga ha fallado.'
              }`,
          defenderLine: '',
          attackDice: [
            { value: chargeRoll.first, outcome: chargeSuccess ? 'hit' : 'fail', tone: 'charge' },
            { value: chargeRoll.second, outcome: chargeSuccess ? 'hit' : 'fail', tone: 'charge' },
          ],
          hideResult: true,
        }),
      )

      if (chargeSuccess) {
        runWeaponsForSide('left', 'charge-attack')
        if (isCounterattackEnabled && nextLeftHp > 0 && nextRightHp > 0) {
          runWeaponsForSide('right', 'charge-counter')
        }
      }
    } else if (attackType === 'melee') {
      runWeaponsForSide('left', 'melee-attack')
      if (isCounterattackEnabled && nextLeftHp > 0 && nextRightHp > 0) {
        runWeaponsForSide('right', 'melee-counter')
      }
    } else {
      runWeaponsForSide('left', 'attack')
      if ((isCounterattackEnabled || rangedCounterForcedByFaction) && rangedCounterReady && nextLeftHp > 0 && nextRightHp > 0) {
        const fintaCounterDetails = rangedCounterForcedByFaction
          ? [{
            text:
              lang === 'en'
                ? 'Feint active: this unit performs a free ranged response.'
                : 'Finta activa: esta unidad realiza un disparo de respuesta gratuito.',
            dice: [],
            source: 'faction',
            owner: 'attacker',
          }]
          : []
        runWeaponsForSide('right', 'ranged-counter', { extraFactionAbilityDetails: fintaCounterDetails })
      }
    }

    if (Object.keys(pendingAmmoSpend).length > 0) {
      setAmmoMap((prev) => {
        const next = { ...prev }
        for (const [key, spend] of Object.entries(pendingAmmoSpend)) {
          next[key] = (next[key] || 0) + spend
        }
        return next
      })
    }

    playLog(entries)
  }

  const handleRandomizeSide = (side) => {
    if (isResolving || !factions.length) return

    clearTimers()
    resolveRunRef.current += 1
    setIsResolving(false)
    setLogEntries([])
    setAmmoMap({})

    const randomFaction = pickRandomItem(factions)
    if (!randomFaction) return
    const randomUnit = pickRandomUnitForMode(randomFaction, mode)
    if (!randomUnit) return
    const randomBool = () => Math.random() < 0.5
    const randomFactionAbilityState = Object.fromEntries(
      (randomFaction.abilities || [])
        .filter((ability) => implementedFactionAbilityKeys.has(ability.effectKey))
        .map((ability) => [ability.id, randomBool()]),
    )
    const randomCoverType = pickRandomItem(coverTypeOptions) || 'none'
    const randomUnitCanUseCover = unitCanUseCover(randomUnit)
    const modeWeapons = (randomUnit.weapons || []).filter((weapon) => weapon.kind === mode)
    const weaponSlots = getWeaponSlotsForMode(randomUnit, mode, modeWeapons.length)
    const randomWeaponIds = buildWeaponSelection(
      pickRandomWeaponIdsForMode(randomUnit, mode),
      modeWeapons,
      weaponSlots,
    )
    const randomSelectedWeapons = randomWeaponIds
      .map((weaponId) => modeWeapons.find((weapon) => weapon.id === weaponId))
      .filter(Boolean)
    const randomConditionSupport = getConditionSupport(randomSelectedWeapons, mode)
    const countOptions = buildUnitCountOptions(randomUnit)
    const nextUnitCount = pickRandomItem(countOptions) || 1
    const nextHpMax = getSquadHpPoolMax(randomUnit, nextUnitCount)
    const hpOptions = buildHpValues(nextHpMax)
    const nextHp = pickRandomItem(hpOptions) || nextHpMax
    const nextSelection = {
      factionId: randomFaction.id,
      unitId: randomUnit.id,
      weaponIds: randomWeaponIds,
    }
    setDefenderCounterattack(randomBool())
    if (side === 'left') {
      setLeft(nextSelection)
      setLeftFactionAbilityState(randomFactionAbilityState)
      setLeftUnitCount(nextUnitCount)
      setLeftCoverType(randomUnitCanUseCover ? randomCoverType : 'none')
      setLeftMoved(randomConditionSupport.moved ? randomBool() : false)
      setLeftHalfRange(randomConditionSupport.halfRange ? randomBool() : false)
      setLeftAfterDash(randomConditionSupport.afterDash ? randomBool() : false)
      const nextHpKey = makeHpKey('L', nextSelection.factionId, nextSelection.unitId)
      setHpMap((prev) => ({ ...prev, [nextHpKey]: nextHp }))
    } else {
      setRight(nextSelection)
      setRightFactionAbilityState(randomFactionAbilityState)
      setRightUnitCount(nextUnitCount)
      setRightCoverType(randomUnitCanUseCover ? randomCoverType : 'none')
      setRightMoved(randomConditionSupport.moved ? randomBool() : false)
      setRightHalfRange(randomConditionSupport.halfRange ? randomBool() : false)
      setRightAfterDash(randomConditionSupport.afterDash ? randomBool() : false)
      const nextHpKey = makeHpKey('R', nextSelection.factionId, nextSelection.unitId)
      setHpMap((prev) => ({ ...prev, [nextHpKey]: nextHp }))
    }
  }

  return (
    <section className="section battle-page" id="batalla">
      <div className="section-head reveal">
        <p className="eyebrow">{tx.eyebrow}</p>
        <h2>{tx.title}</h2>
        <p>{tx.subtitle}</p>
      </div>

      <div className="duel-attack-type reveal">
        <span>{tx.attackType}</span>
        <div className="duel-attack-type-actions">
          {attackTypeOptions.map((type) => {
            const label = type === 'charge' ? tx.charge : type === 'ranged' ? tx.ranged : tx.melee
            const isActive = type === attackType
            return (
              <button
                key={type}
                type="button"
                className={isActive ? 'duel-attack-type-btn active' : 'duel-attack-type-btn'}
                onClick={() => setAttackType(type)}
              >
                {label}
              </button>
            )
          })}
        </div>
        {attackType === 'charge' && (
          <label className="field duel-charge-distance">
            <span>{tx.chargeDistance}</span>
            <select
              value={chargeDistance}
              onChange={(event) =>
                setChargeDistance(clamp(toNumber(event.target.value, 7), CHARGE_DISTANCE_MIN, CHARGE_DISTANCE_MAX))
              }
            >
              {chargeDistanceOptions.map((distance) => (
                <option key={`charge-distance-${distance}`} value={distance}>
                  {distance}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="battle-duel-grid">
        <article className="duel-panel attacker-panel reveal">
          <h3>{tx.attacker}</h3>
          <button
            type="button"
            className="ghost duel-panel-random"
            onClick={() => handleRandomizeSide('left')}
            disabled={!factions.length || isResolving}
          >
            {tx.random}
          </button>
          <label className="field">
            <span>{tx.faction}</span>
            <div className="duel-faction-select">
              {factionImages[leftFactionId] && <img src={factionImages[leftFactionId]} alt={leftFaction?.name || ''} />}
              <select
                value={leftFactionId}
                onChange={(event) => {
                  const faction = factionById.get(event.target.value)
                  setLeft({
                    factionId: event.target.value,
                    unitId: faction?.units[0]?.id || '',
                    weaponIds: pickWeaponIdsForMode(faction?.units[0], mode),
                  })
                  setLeftFactionAbilityState({})
                  setLeftUnitCount(1)
                }}
              >
                {factions.map((faction) => (
                  <option key={faction.id} value={faction.id}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>{tx.unit}</span>
            <select
              value={leftUnitId}
              onChange={(event) =>
                setLeft((prev) => {
                  const unit = leftFaction?.units.find((item) => item.id === event.target.value)
                  setLeftUnitCount(1)
                  return {
                    ...prev,
                    unitId: event.target.value,
                    weaponIds: pickWeaponIdsForMode(unit, mode),
                  }
                })}
              disabled={!leftFaction}
            >
              {leftFaction?.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tx.unitsCount}</span>
            <select
              value={clampSquadCount(leftUnitCount, leftUnit)}
              onChange={(event) => setLeftUnitCount(clampSquadCount(event.target.value, leftUnit))}
            >
              {buildUnitCountOptions(leftUnit).map((value) => (
                <option key={`left-units-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{leftWeaponSlots > 1 ? tx.weapons : tx.weapon}</span>
            {!leftWeapons.length ? (
              <p className="battle-empty">{tx.noWeapons}</p>
            ) : leftWeaponSlots > 1 ? (
              <div className="duel-weapon-multi">
                {Array.from({ length: leftWeaponSlots }).map((_, slotIndex) => (
                  <label key={`left-slot-${slotIndex}`} className="field duel-weapon-slot">
                    <span>{tx.weapon} {slotIndex + 1}</span>
                    <select
                      value={safeLeftWeaponIds[slotIndex] || ''}
                      onChange={(event) =>
                        setWeaponAtSlot('left', slotIndex, event.target.value, leftWeapons, leftWeaponSlots, safeLeftWeaponIds)}
                      disabled={!leftWeapons.length}
                    >
                      {leftWeapons.map((weapon) => (
                        <option key={weapon.id} value={weapon.id}>
                          {weapon.name} · {weapon.attacks}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={leftPrimaryWeaponId}
                onChange={(event) => setLeft((prev) => ({ ...prev, weaponIds: [event.target.value] }))}
                disabled={!leftWeapons.length}
              >
                {leftWeapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.name} · {weapon.attacks}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="duel-unit-divider" aria-hidden="true" />

          {leftUnit && (
            <article className="duel-unit-card">
              <div className="unit-card-header">
                <h4>{leftUnit.name}</h4>
              </div>
              <p className="unit-meta">
                <UnitTypeBadge type={leftUnit.type} />
                {' '}· <span className="unit-value">{leftUnit.valueBase} {tx.valueUnit}</span>
              </p>
              <div className="unit-stats-table">
                <div className="unit-stats-row head">
                  <span>{tx.mov}</span>
                  <span>{tx.vidas}</span>
                  <span>{tx.salv}</span>
                  <span>{tx.vel}</span>
                </div>
                <div className="unit-stats-row">
                  <span>{leftUnit.movement}</span>
                  <span>
                    <select
                      className="duel-hp-select"
                      value={leftHp}
                      onChange={(event) => setUnitHp('L', leftFactionId, leftUnit, leftUnitCount, event.target.value)}
                    >
                      {leftHp <= 0 && <option value={0}>KO</option>}
                      {buildHpValues(leftHpMax).map((value) => (
                        <option key={`left-hp-${value}`} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>{leftUnit.saveLabel}</span>
                  <span>{leftUnit.speed}</span>
                </div>
              </div>
              {leftUnit.specialty && leftUnit.specialty !== '-' && (
                <p className="unit-specialty duel-unit-specialty">{leftUnit.specialty}</p>
              )}
              {!!leftSelectedWeapons.length && (
                <div className="duel-weapon-stack">
                  {leftSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    const ammoInfo = getWeaponAmmoInfo('left', leftFactionId, leftUnit, weapon)
                    return (
                      <div key={`left-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
                        {ammoInfo.limited && (
                          <p className="duel-weapon-ammo">
                            {tx.ammo}: {ammoInfo.remaining}/{ammoInfo.max}
                          </p>
                        )}
                        <div className="weapon-stats-table duel-weapon-table">
                          <div className="weapon-stats-row duel-weapon-row head">
                            <span>{tx.weaponAtq}</span>
                            <span>{tx.weaponDist}</span>
                            <span>{tx.weaponImp}</span>
                            <span>{tx.weaponDamage}</span>
                            <span>{tx.weaponCrit}</span>
                            <span>{tx.weaponSkills}</span>
                          </div>
                          <div className="weapon-stats-row duel-weapon-row">
                            <span>{weapon.attacks}</span>
                            <span>{weapon.range || '-'}</span>
                            <span>{weapon.kind === 'melee' ? '3+' : hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.direct) ? '-' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.map((a) => getAbilityLabel(a, lang)).join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => {
                              const binding = getAbilityConditionBinding('left', note.raw)
                              return (
                                <div key={note.raw || note.label} className="duel-ability-note-item">
                                  <div>
                                    <strong>{note.label}:</strong> {note.description}
                                  </div>
                                  {binding && (
                                    <label className="duel-ability-check">
                                      <input
                                        type="checkbox"
                                        checked={binding.checked}
                                        onChange={(event) => binding.setChecked(event.target.checked)}
                                      />
                                      <span>{binding.label}</span>
                                    </label>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )}
          {leftCanUseCover && (
            <label className="field">
              <span>{tx.coverType}</span>
              <select value={leftCoverType} onChange={(event) => setLeftCoverType(event.target.value)}>
                {coverTypeOptions.map((option) => (
                  <option key={`left-cover-${option}`} value={option}>
                    {option === 'none' ? tx.coverNone : option === 'partial' ? tx.coverPartial : tx.coverHeight}
                  </option>
                ))}
              </select>
            </label>
          )}
          <section className="duel-faction-abilities">
            <span className="duel-faction-abilities-title">{tx.factionAbilities}</span>
            {!leftImplementedFactionAbilities.length && <p className="battle-empty">{tx.noFactionAbilities}</p>}
            {leftImplementedFactionAbilities.map((ability) => (
              <label key={ability.id} className="duel-faction-ability">
                <input
                  type="checkbox"
                  checked={Boolean(leftFactionAbilityState[ability.id])}
                  onChange={(event) => setFactionAbilityEnabled('left', ability.id, event.target.checked)}
                />
                <span className="duel-faction-ability-copy">
                  <strong>{ability.name || '-'}</strong>
                </span>
              </label>
            ))}
          </section>

        </article>

        <article className="duel-panel defender-panel reveal">
          <h3>{tx.defender}</h3>
          <button
            type="button"
            className="ghost duel-panel-random"
            onClick={() => handleRandomizeSide('right')}
            disabled={!factions.length || isResolving}
          >
            {tx.random}
          </button>
          <label className="field">
            <span>{tx.faction}</span>
            <div className="duel-faction-select">
              {factionImages[rightFactionId] && <img src={factionImages[rightFactionId]} alt={rightFaction?.name || ''} />}
              <select
                value={rightFactionId}
                onChange={(event) => {
                  const faction = factionById.get(event.target.value)
                  setRight({
                    factionId: event.target.value,
                    unitId: faction?.units[0]?.id || '',
                    weaponIds: pickWeaponIdsForMode(faction?.units[0], mode),
                  })
                  setRightFactionAbilityState({})
                  setRightUnitCount(1)
                }}
              >
                {factions.map((faction) => (
                  <option key={faction.id} value={faction.id}>
                    {faction.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            <span>{tx.unit}</span>
            <select
              value={rightUnitId}
              onChange={(event) =>
                setRight((prev) => {
                  const unit = rightFaction?.units.find((item) => item.id === event.target.value)
                  setRightUnitCount(1)
                  return {
                    ...prev,
                    unitId: event.target.value,
                    weaponIds: pickWeaponIdsForMode(unit, mode),
                  }
                })}
              disabled={!rightFaction}
            >
              {rightFaction?.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{tx.unitsCount}</span>
            <select
              value={clampSquadCount(rightUnitCount, rightUnit)}
              onChange={(event) => setRightUnitCount(clampSquadCount(event.target.value, rightUnit))}
            >
              {buildUnitCountOptions(rightUnit).map((value) => (
                <option key={`right-units-${value}`} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{rightWeaponSlots > 1 ? tx.weapons : tx.weapon}</span>
            {!rightWeapons.length ? (
              <p className="battle-empty">{tx.noWeapons}</p>
            ) : rightWeaponSlots > 1 ? (
              <div className="duel-weapon-multi">
                {Array.from({ length: rightWeaponSlots }).map((_, slotIndex) => (
                  <label key={`right-slot-${slotIndex}`} className="field duel-weapon-slot">
                    <span>{tx.weapon} {slotIndex + 1}</span>
                    <select
                      value={safeRightWeaponIds[slotIndex] || ''}
                      onChange={(event) =>
                        setWeaponAtSlot('right', slotIndex, event.target.value, rightWeapons, rightWeaponSlots, safeRightWeaponIds)}
                      disabled={!rightWeapons.length}
                    >
                      {rightWeapons.map((weapon) => (
                        <option key={weapon.id} value={weapon.id}>
                          {weapon.name} · {weapon.attacks}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : (
              <select
                value={rightPrimaryWeaponId}
                onChange={(event) => setRight((prev) => ({ ...prev, weaponIds: [event.target.value] }))}
                disabled={!rightWeapons.length}
              >
                {rightWeapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.name} · {weapon.attacks}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="duel-unit-divider" aria-hidden="true" />

          {rightUnit && (
            <article className="duel-unit-card">
              <div className="unit-card-header">
                <h4>{rightUnit.name}</h4>
              </div>
              <p className="unit-meta">
                <UnitTypeBadge type={rightUnit.type} />
                {' '}· <span className="unit-value">{rightUnit.valueBase} {tx.valueUnit}</span>
              </p>
              <div className="unit-stats-table">
                <div className="unit-stats-row head">
                  <span>{tx.mov}</span>
                  <span>{tx.vidas}</span>
                  <span>{tx.salv}</span>
                  <span>{tx.vel}</span>
                </div>
                <div className="unit-stats-row">
                  <span>{rightUnit.movement}</span>
                  <span>
                    <select
                      className="duel-hp-select"
                      value={rightHp}
                      onChange={(event) => setUnitHp('R', rightFactionId, rightUnit, rightUnitCount, event.target.value)}
                    >
                      {rightHp <= 0 && <option value={0}>KO</option>}
                      {buildHpValues(rightHpMax).map((value) => (
                        <option key={`right-hp-${value}`} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>{rightUnit.saveLabel}</span>
                  <span>{rightUnit.speed}</span>
                </div>
              </div>
              {rightUnit.specialty && rightUnit.specialty !== '-' && (
                <p className="unit-specialty duel-unit-specialty">{rightUnit.specialty}</p>
              )}
              {!!rightSelectedWeapons.length && (
                <div className="duel-weapon-stack">
                  {rightSelectedWeapons.map((weapon, index) => {
                    const notes = buildAbilityNotes(weapon)
                    const ammoInfo = getWeaponAmmoInfo('right', rightFactionId, rightUnit, weapon)
                    return (
                      <div key={`right-weapon-${weapon.id}-${index}`} className="duel-weapon-entry">
                        <p className="duel-weapon-entry-title">{tx.weapon} {index + 1}: {weapon.name}</p>
                        {ammoInfo.limited && (
                          <p className="duel-weapon-ammo">
                            {tx.ammo}: {ammoInfo.remaining}/{ammoInfo.max}
                          </p>
                        )}
                        <div className="weapon-stats-table duel-weapon-table">
                          <div className="weapon-stats-row duel-weapon-row head">
                            <span>{tx.weaponAtq}</span>
                            <span>{tx.weaponDist}</span>
                            <span>{tx.weaponImp}</span>
                            <span>{tx.weaponDamage}</span>
                            <span>{tx.weaponCrit}</span>
                            <span>{tx.weaponSkills}</span>
                          </div>
                          <div className="weapon-stats-row duel-weapon-row">
                            <span>{weapon.attacks}</span>
                            <span>{weapon.range || '-'}</span>
                            <span>{weapon.kind === 'melee' ? '3+' : hasWeaponAbilityId(weapon, WEAPON_ABILITY_IDS.direct) ? '-' : weapon.hit || '-'}</span>
                            <span>{weapon.damage}</span>
                            <span>{weapon.critDamage}</span>
                            <span className="weapon-tags">{weapon.abilities.length ? weapon.abilities.map((a) => getAbilityLabel(a, lang)).join(', ') : '-'}</span>
                          </div>
                        </div>
                        {notes.length > 0 && (
                          <div className="weapon-ability-notes duel-weapon-notes">
                            {notes.map((note) => {
                              const binding = getAbilityConditionBinding('right', note.raw)
                              return (
                                <div key={note.raw || note.label} className="duel-ability-note-item">
                                  <div>
                                    <strong>{note.label}:</strong> {note.description}
                                  </div>
                                  {binding && (
                                    <label className="duel-ability-check">
                                      <input
                                        type="checkbox"
                                        checked={binding.checked}
                                        onChange={(event) => binding.setChecked(event.target.checked)}
                                      />
                                      <span>{binding.label}</span>
                                    </label>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          )}
          {rightCanUseCover && (
            <label className="field">
              <span>{tx.coverType}</span>
              <select value={rightCoverType} onChange={(event) => setRightCoverType(event.target.value)}>
                {coverTypeOptions.map((option) => (
                  <option key={`right-cover-${option}`} value={option}>
                    {option === 'none' ? tx.coverNone : option === 'partial' ? tx.coverPartial : tx.coverHeight}
                  </option>
                ))}
              </select>
            </label>
          )}
          <section className="duel-faction-abilities">
            <span className="duel-faction-abilities-title">{tx.factionAbilities}</span>
            {!rightImplementedFactionAbilities.length && <p className="battle-empty">{tx.noFactionAbilities}</p>}
            {rightImplementedFactionAbilities.map((ability) => (
              <label key={ability.id} className="duel-faction-ability">
                <input
                  type="checkbox"
                  checked={Boolean(rightFactionAbilityState[ability.id])}
                  onChange={(event) => setFactionAbilityEnabled('right', ability.id, event.target.checked)}
                />
                <span className="duel-faction-ability-copy">
                  <strong>{ability.name || '-'}</strong>
                </span>
              </label>
            ))}
          </section>
          <div className="duel-counter-divider" aria-hidden="true" />

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={defenderCounterattack}
              disabled={!canCounterByMode}
              onChange={(event) => setDefenderCounterattack(event.target.checked)}
            />
            <span>{tx.counterattack}</span>
          </label>
        </article>
      </div>

      <div className="duel-actions reveal">
        <button
          type="button"
          className="primary"
          onClick={handleResolve}
          disabled={
            !leftUnit ||
            !rightUnit ||
            !leftSelectedWeapons.length ||
            (isCounterattackEnabled && !rightSelectedWeapons.length) ||
            isResolving
          }
        >
          {isResolving ? `${tx.resolve}...` : tx.resolve}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={handleFlip}
          disabled={!leftUnit || !rightUnit || isResolving}
        >
          {tx.flip}
        </button>
      </div>

      <BattleCombatLog logEntries={logEntries} tx={tx} lang={lang} />
    </section>
  )
}

export default Batalla
