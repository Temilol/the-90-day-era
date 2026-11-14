import type { EraState } from './types'

/** Water is stored in millilitres and shown in the person's chosen unit. */
export type WaterUnit = 'oz' | 'ml'
const ML_PER_OZ = 29.5735

export const WATER_DEFAULTS: Record<WaterUnit, { goal: number; glass: number; bottle: number; step: number }> = {
  oz: { goal: 64, glass: 8, bottle: 24, step: 1 },
  ml: { goal: 2000, glass: 250, bottle: 750, step: 50 },
}

export const toMl = (amount: number, unit: WaterUnit) => (unit === 'oz' ? amount * ML_PER_OZ : amount)
/** A whole number in the chosen unit, for display. */
export const fromMl = (ml: number, unit: WaterUnit) => Math.round(unit === 'oz' ? ml / ML_PER_OZ : ml)

export interface WaterSettings { unit: WaterUnit; goalMl: number; glassMl: number; bottleMl: number; nudges: boolean }
export function waterSettings(profile: EraState['profile']): WaterSettings {
  const unit: WaterUnit = profile.waterUnit === 'ml' ? 'ml' : 'oz'
  const d = WATER_DEFAULTS[unit]
  return {
    unit,
    goalMl: profile.waterGoal && profile.waterGoal > 0 ? profile.waterGoal : toMl(d.goal, unit),
    glassMl: toMl(d.glass, unit),
    bottleMl: profile.waterBottle && profile.waterBottle > 0 ? profile.waterBottle : toMl(d.bottle, unit),
    nudges: profile.waterNudges !== false,
  }
}

/** Half a millilitre of slack, so eight 8 oz glasses always reach a 64 oz goal despite rounding. */
export const goalMet = (waterMl: number | undefined, goalMl: number) => (waterMl ?? 0) + 0.5 >= goalMl

/** Goal and bottle carried over to a new unit as tidy numbers (whole ounces, or steps of 50 ml). */
export function convertWaterSettings(profile: EraState['profile'], to: WaterUnit): Pick<EraState['profile'], 'waterUnit' | 'waterGoal' | 'waterBottle'> {
  const cur = waterSettings(profile)
  const tidy = (ml: number) => { const step = WATER_DEFAULTS[to].step; return toMl(Math.max(step, Math.round(fromMlExact(ml, to) / step) * step), to) }
  return { waterUnit: to, waterGoal: tidy(cur.goalMl), waterBottle: tidy(cur.bottleMl) }
}
const fromMlExact = (ml: number, unit: WaterUnit) => (unit === 'oz' ? ml / ML_PER_OZ : ml)
