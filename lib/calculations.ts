import { UserSettings, WeeklyEntry, WeekSummary, MonthSummary, MacroTargets } from './types';
import { format, parseISO } from 'date-fns';

// ─── Base TDEE (Katch-McArdle × 1.5 activity multiplier) ─────────────────────

export function calcBaseTDEE(settings: UserSettings): number {
  const { unit, startingWeight, bodyFatPercent, bfCalculatorEnabled } = settings;
  const bf = bodyFatPercent;
  if (unit === 'lb') {
    const leanMass = startingWeight * ((100 - bf) / 100);
    return (370 + 9.8 * leanMass) * 1.5;
  } else {
    const leanMass = startingWeight * ((100 - bf) / 100);
    return (370 + 21.6 * leanMass) * 1.5;
  }
}

// TDEE from a specific weight (used for adaptive calcs)
export function calcTDEEFromWeight(weight: number, bf: number, unit: 'lb' | 'kg'): number {
  if (unit === 'lb') {
    const leanMass = weight * ((100 - bf) / 100);
    return (370 + 9.8 * leanMass) * 1.5;
  } else {
    const leanMass = weight * ((100 - bf) / 100);
    return (370 + 21.6 * leanMass) * 1.5;
  }
}

// ─── Daily deficit / surplus ──────────────────────────────────────────────────

export function calcDailyDeficit(weeklyGoal: number, unit: 'lb' | 'kg'): number {
  // Returns negative for deficit (weight loss), positive for surplus (gain)
  if (unit === 'lb') {
    return (weeklyGoal * 3500) / 7;
  } else {
    return (weeklyGoal * 7700) / 7;
  }
}

// ─── Target daily calories ────────────────────────────────────────────────────

export function calcTargetCalories(tdee: number, dailyDeficit: number): number {
  return tdee + dailyDeficit;
}

// ─── Macro targets ────────────────────────────────────────────────────────────

export function calcMacros(
  targetCals: number,
  weightLbs: number
): MacroTargets {
  const protein = weightLbs * 1.0;
  const proteinMin = Math.round(weightLbs * 0.8);
  const proteinMax = Math.round(weightLbs * 1.2);

  const fat = (0.22 * targetCals) / 9;
  const fatMin = Math.round((0.15 * targetCals) / 9);
  const fatMax = Math.round((0.3 * targetCals) / 9);

  const carbs = (targetCals - protein * 4 - fat * 9) / 4;
  const carbsMin = Math.round(carbs * 0.8);
  const carbsMax = Math.round(carbs * 1.2);

  return {
    protein: Math.round(protein),
    proteinMin,
    proteinMax,
    fat: Math.round(fat),
    fatMin,
    fatMax,
    carbs: Math.round(carbs),
    carbsMin,
    carbsMax,
  };
}

// ─── US Navy body fat % ───────────────────────────────────────────────────────

export function calcNavyBF(
  gender: 'Male' | 'Female',
  measurementUnit: 'inch' | 'cm',
  height: number,
  waist: number,
  neck: number,
  hip?: number
): number | null {
  if (!height || !waist || !neck) return null;
  if (gender === 'Female' && !hip) return null;

  if (gender === 'Male') {
    if (measurementUnit === 'inch') {
      return 86.01 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
    } else {
      return 86.01 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 30.3;
    }
  } else {
    if (measurementUnit === 'inch') {
      return (
        163.205 * Math.log10(waist + hip! - neck) -
        97.684 * Math.log10(height) -
        78.387
      );
    } else {
      return (
        163.205 * Math.log10(waist + hip! - neck) -
        97.684 * Math.log10(height) -
        29.669
      );
    }
  }
}

// ─── Weekly averages ──────────────────────────────────────────────────────────

export function avgNonNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function countNonNull(values: (number | null)[]): number {
  return values.filter((v) => v !== null && v !== undefined).length;
}

// ─── Adaptive TDEE ────────────────────────────────────────────────────────────
// Mirrors the AX column logic from the spreadsheet.
// For each week, if next week has calorie data, estimate TDEE as:
//   avg_cals_next + ((-weight_diff_current * cals_per_unit) / days_logged_next)
// Then keep a cumulative average across all estimated weeks.

export function calcAdaptiveTDEEs(
  entries: WeeklyEntry[],
  settings: UserSettings
): (number | null)[] {
  const { unit, startingWeight, bodyFatPercent } = settings;
  const calsPerUnit = unit === 'lb' ? 3500 : 7700;
  const baseTDEE = calcTDEEFromWeight(startingWeight, bodyFatPercent, unit);

  const n = entries.length;
  const tdees: (number | null)[] = new Array(n).fill(null);

  // Precompute per-week avg weight and avg calories and days logged
  const avgWeights: (number | null)[] = entries.map((e) => avgNonNull(e.weights));
  const avgCals: (number | null)[] = entries.map((e) => avgNonNull(e.calories));
  const daysLogged: number[] = entries.map((e) => countNonNull(e.calories));

  // Running sum of estimated TDEEs for cumulative average
  let tdeeSum = 0;
  let tdeeCount = 0;

  for (let i = 0; i < n; i++) {
    const hasThisWeek = avgWeights[i] !== null || avgCals[i] !== null;
    const hasNextWeek = i + 1 < n && avgCals[i + 1] !== null && daysLogged[i + 1] > 0;

    if (!hasThisWeek) {
      // No data this week — use base TDEE or last computed
      tdees[i] = tdeeCount > 0 ? tdeeSum / tdeeCount : baseTDEE;
      continue;
    }

    // Weight differential: avg_weight_this_week - avg_weight_previous_week (or starting weight)
    const prevAvgWeight = i === 0 ? startingWeight : avgWeights[i - 1] ?? startingWeight;
    const weightDiff = avgWeights[i] !== null ? avgWeights[i]! - prevAvgWeight : 0;

    if (hasNextWeek) {
      const nextAvgCals = avgCals[i + 1]!;
      const nextDays = daysLogged[i + 1];
      const estimated = nextAvgCals + ((-weightDiff * calsPerUnit) / nextDays);

      if (i === 0) {
        tdees[0] = estimated;
        tdeeSum += estimated;
        tdeeCount++;
      } else {
        // Cumulative average: (estimated + sum of previous) / week_count
        tdeeSum += estimated;
        tdeeCount++;
        tdees[i] = tdeeSum / tdeeCount;
      }
    } else {
      // No next week data — use base TDEE formula if first week, else last TDEE
      tdees[i] = tdeeCount > 0 ? tdeeSum / tdeeCount : baseTDEE;
    }
  }

  return tdees;
}

// ─── Week summaries ───────────────────────────────────────────────────────────

export function buildWeekSummaries(
  entries: WeeklyEntry[],
  settings: UserSettings
): WeekSummary[] {
  const adaptiveTDEEs = calcAdaptiveTDEEs(entries, settings);

  return entries.map((entry, i) => {
    const avgWeight = avgNonNull(entry.weights);
    const avgCalories = avgNonNull(entry.calories);

    let weightChange: number | null = null;
    if (avgWeight !== null) {
      const prevAvg =
        i === 0
          ? settings.startingWeight
          : avgNonNull(entries[i - 1].weights) ?? settings.startingWeight;
      weightChange = avgWeight - prevAvg;
    }

    let bfPercent: number | null = null;
    if (
      settings.bfCalculatorEnabled &&
      entry.waist &&
      entry.neck &&
      settings.height
    ) {
      bfPercent = calcNavyBF(
        settings.gender,
        settings.measurementUnit,
        settings.height,
        entry.waist,
        entry.neck,
        entry.hip
      );
    }

    return {
      weekStartDate: entry.weekStartDate,
      weekNumber: i + 1,
      avgWeight,
      avgCalories,
      weightChange,
      tdee: adaptiveTDEEs[i],
      bfPercent,
    };
  });
}

// ─── Month summaries ──────────────────────────────────────────────────────────

export function buildMonthSummaries(
  summaries: WeekSummary[],
  weeklyGoal: number
): MonthSummary[] {
  const monthMap = new Map<string, number>();

  for (const s of summaries) {
    if (s.weightChange === null) continue;
    const month = format(parseISO(s.weekStartDate), 'MMM-yy');
    monthMap.set(month, (monthMap.get(month) ?? 0) + s.weightChange);
  }

  return Array.from(monthMap.entries()).map(([month, actual]) => ({
    month,
    actualWeightChange: actual,
    goalWeightChange: weeklyGoal * 4, // ~4 weeks per month
  }));
}

// ─── Current TDEE (for dashboard) ────────────────────────────────────────────
// Returns the most recent adaptive TDEE, or base TDEE if no data yet.

export function getCurrentTDEE(
  entries: WeeklyEntry[],
  settings: UserSettings
): number {
  if (entries.length === 0) return calcBaseTDEE(settings);
  const tdees = calcAdaptiveTDEEs(entries, settings);
  // Find the most recent non-null TDEE
  for (let i = tdees.length - 1; i >= 0; i--) {
    if (tdees[i] !== null) return tdees[i]!;
  }
  return calcBaseTDEE(settings);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function weightInLbs(weight: number, unit: 'lb' | 'kg'): number {
  return unit === 'lb' ? weight : weight * 2.20462;
}
