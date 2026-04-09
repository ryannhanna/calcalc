'use client';

import { format, parseISO, addDays } from 'date-fns';
import { WeeklyEntry, UserSettings } from '../lib/types';
import { avgNonNull, calcNavyBF } from '../lib/calculations';

interface Props {
  entry: WeeklyEntry;
  weekNumber: number;
  weeklyGoal: number;
  settings: UserSettings;
  prevAvgWeight: number | null; // previous week's avg weight (or starting weight for w1)
  todayDayIndex: number; // -1 if today is not in this week
  tdee: number | null;
  isCurrent?: boolean;
  onWeightChange: (dayIndex: number, value: number | null) => void;
  onCaloriesChange: (dayIndex: number, value: number | null) => void;
  onMeasurementsChange: (field: 'waist' | 'neck' | 'hip', value: number | null) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekCard({
  entry,
  weekNumber,
  settings,
  prevAvgWeight,
  todayDayIndex,
  tdee,
  isCurrent = false,
  onWeightChange,
  onCaloriesChange,
  onMeasurementsChange,
}: Props) {
  const startDate = parseISO(entry.weekStartDate);
  const endDate = addDays(startDate, 6);

  const avgWeight = avgNonNull(entry.weights);
  const avgCals = avgNonNull(entry.calories);

  const weightChange =
    avgWeight !== null && prevAvgWeight !== null ? avgWeight - prevAvgWeight : null;

  const bfPercent =
    settings.bfCalculatorEnabled && entry.waist && entry.neck && settings.height
      ? calcNavyBF(
          settings.gender,
          settings.measurementUnit,
          settings.height,
          entry.waist,
          entry.neck,
          entry.hip
        )
      : null;

  const inputBase =
    'w-full rounded border border-gray-200 bg-gray-50 px-1 py-1 text-center text-xs text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400';
  const todayInputBase =
    'w-full rounded border border-blue-300 bg-blue-50 px-1 py-1 text-center text-xs text-blue-900 font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isCurrent ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Week {weekNumber}
          </span>
          {isCurrent && (
            <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Current
            </span>
          )}
          <span className="text-sm text-gray-600 ml-2">
            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {weightChange !== null && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                weightChange < 0
                  ? 'bg-green-100 text-green-700'
                  : weightChange > 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {weightChange > 0 ? '+' : ''}
              {weightChange.toFixed(1)} {settings.unit}
            </span>
          )}
          {tdee !== null && (
            <span className="text-gray-400">TDEE: {Math.round(tdee)}</span>
          )}
        </div>
      </div>

      {/* Day grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <td className="text-xs text-gray-400 pr-2 py-1 whitespace-nowrap w-16">Stat</td>
              {DAY_LABELS.map((d, i) => (
                <th
                  key={d}
                  className={`text-center text-xs font-medium pb-1 ${
                    i === todayDayIndex ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <div>{d}</div>
                  <div className="text-gray-400 font-normal text-[10px]">
                    {format(addDays(startDate, i), 'M/d')}
                  </div>
                </th>
              ))}
              <th className="text-center text-xs font-medium text-gray-500 pb-1">Avg</th>
            </tr>
          </thead>
          <tbody>
            {/* Weight row */}
            <tr>
              <td className="text-xs text-gray-500 pr-2 py-1 whitespace-nowrap">
                Wt ({settings.unit})
              </td>
              {entry.weights.map((w, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    type="number"
                    step="0.1"
                    className={i === todayDayIndex ? todayInputBase : inputBase}
                    value={w ?? ''}
                    onChange={(e) =>
                      onWeightChange(i, e.target.value === '' ? null : parseFloat(e.target.value))
                    }
                    placeholder="—"
                  />
                </td>
              ))}
              <td className="text-center text-xs font-semibold text-gray-700 px-1">
                {avgWeight !== null ? avgWeight.toFixed(1) : '—'}
              </td>
            </tr>
            {/* Calories row */}
            <tr>
              <td className="text-xs text-gray-500 pr-2 py-1 whitespace-nowrap">Cals</td>
              {entry.calories.map((c, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    type="number"
                    step="1"
                    className={i === todayDayIndex ? todayInputBase : inputBase}
                    value={c ?? ''}
                    onChange={(e) =>
                      onCaloriesChange(
                        i,
                        e.target.value === '' ? null : parseInt(e.target.value, 10)
                      )
                    }
                    placeholder="—"
                  />
                </td>
              ))}
              <td className="text-center text-xs font-semibold text-gray-700 px-1">
                {avgCals !== null ? Math.round(avgCals).toLocaleString() : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Optional BF% measurements */}
      {settings.bfCalculatorEnabled && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">
              Measurements ({settings.measurementUnit}):
            </span>
            {(['waist', 'neck', ...(settings.gender === 'Female' ? ['hip'] : [])] as const).map(
              (field) => (
                <div key={field} className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 capitalize">{field}</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-center text-xs text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none"
                    value={entry[field as keyof WeeklyEntry] as number ?? ''}
                    onChange={(e) =>
                      onMeasurementsChange(
                        field as 'waist' | 'neck' | 'hip',
                        e.target.value === '' ? null : parseFloat(e.target.value)
                      )
                    }
                    placeholder="—"
                  />
                </div>
              )
            )}
            {bfPercent !== null && (
              <span className="text-xs font-semibold text-blue-600 ml-auto">
                BF: {Math.round(bfPercent)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
