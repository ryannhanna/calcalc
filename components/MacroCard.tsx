'use client';

import { MacroTargets } from '../lib/types';

interface Props {
  macros: MacroTargets;
  targetCalories: number;
}

function MacroRow({
  label,
  grams,
  min,
  max,
  cals,
  color,
}: {
  label: string;
  grams: number;
  min: number;
  max: number;
  cals: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-base font-bold text-gray-900 ml-2">{grams}g</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400">
            Range: {min}–{max}g
          </span>
          <span className="text-xs text-gray-400">{Math.round(cals)} cal</span>
        </div>
      </div>
    </div>
  );
}

export default function MacroCard({ macros, targetCalories }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Daily Macros
      </h2>

      <div className="space-y-4">
        <MacroRow
          label="Protein"
          grams={macros.protein}
          min={macros.proteinMin}
          max={macros.proteinMax}
          cals={macros.protein * 4}
          color="bg-blue-500"
        />
        <MacroRow
          label="Fat"
          grams={macros.fat}
          min={macros.fatMin}
          max={macros.fatMax}
          cals={macros.fat * 9}
          color="bg-yellow-400"
        />
        <MacroRow
          label="Carbs"
          grams={macros.carbs}
          min={macros.carbsMin}
          max={macros.carbsMax}
          cals={macros.carbs * 4}
          color="bg-green-500"
        />
      </div>

      <div className="border-t border-gray-100 mt-4 pt-3">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Total target</span>
          <span>{Math.round(targetCalories).toLocaleString()} cal</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Hit total calories first; stay within macro ranges.
        </p>
      </div>
    </div>
  );
}
