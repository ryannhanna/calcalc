export type WeightUnit = 'lb' | 'kg';
export type MeasurementUnit = 'inch' | 'cm';
export type Gender = 'Male' | 'Female';

export interface UserSettings {
  unit: WeightUnit;
  measurementUnit: MeasurementUnit;
  startingDate: string; // ISO date string (YYYY-MM-DD)
  startingWeight: number;
  bodyFatPercent: number;
  weeklyGoal: number; // negative = deficit (e.g. -3 lbs/wk), positive = surplus
  bfCalculatorEnabled: boolean;
  gender: Gender;
  height: number; // in measurementUnit
}

export interface WeeklyEntry {
  weekStartDate: string; // ISO date of first day of this week
  weights: (number | null)[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  calories: (number | null)[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  waist?: number;
  neck?: number;
  hip?: number;
}

export interface WeekSummary {
  weekStartDate: string;
  weekNumber: number;
  avgWeight: number | null;
  avgCalories: number | null;
  weightChange: number | null; // vs previous week (or starting weight for week 1)
  tdee: number | null;
  bfPercent: number | null;
}

export interface MonthSummary {
  month: string; // e.g. "Jan-25"
  actualWeightChange: number;
  goalWeightChange: number;
}

export interface MacroTargets {
  protein: number;
  proteinMin: number;
  proteinMax: number;
  fat: number;
  fatMin: number;
  fatMax: number;
  carbs: number;
  carbsMin: number;
  carbsMax: number;
}
