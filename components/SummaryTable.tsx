'use client';

import { WeekSummary, MonthSummary } from '../lib/types';
import { format, parseISO } from 'date-fns';

interface WeeklySummaryTableProps {
  summaries: WeekSummary[];
  unit: 'lb' | 'kg';
}

export function WeeklySummaryTable({ summaries, unit }: WeeklySummaryTableProps) {
  const withData = summaries.filter(
    (s) => s.avgWeight !== null || s.avgCalories !== null
  );

  if (withData.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-6">
        No weekly data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Week</th>
            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Start</th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-3">
              Avg Wt ({unit})
            </th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-3">
              Wt Change
            </th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-3">Avg Cals</th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2">TDEE</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {withData.map((s) => (
            <tr key={s.weekStartDate}>
              <td className="py-2 pr-3 text-xs font-medium text-gray-700">W{s.weekNumber}</td>
              <td className="py-2 pr-3 text-xs text-gray-500">
                {format(parseISO(s.weekStartDate), 'MMM d')}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-900">
                {s.avgWeight !== null ? s.avgWeight.toFixed(1) : '—'}
              </td>
              <td className="py-2 pr-3 text-right">
                {s.weightChange !== null ? (
                  <span
                    className={`text-xs font-semibold ${
                      s.weightChange < 0
                        ? 'text-green-600'
                        : s.weightChange > 0
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {s.weightChange > 0 ? '+' : ''}
                    {s.weightChange.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-900">
                {s.avgCalories !== null ? Math.round(s.avgCalories).toLocaleString() : '—'}
              </td>
              <td className="py-2 text-right text-xs text-gray-900">
                {s.tdee !== null ? Math.round(s.tdee).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MonthlySummaryTableProps {
  summaries: MonthSummary[];
  unit: 'lb' | 'kg';
}

export function MonthlySummaryTable({ summaries, unit }: MonthlySummaryTableProps) {
  if (summaries.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-6">
        No monthly data yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3">Month</th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-3">
              Actual Change ({unit})
            </th>
            <th className="text-right text-xs font-medium text-gray-500 pb-2">
              Goal Change ({unit})
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {summaries.map((m) => (
            <tr key={m.month}>
              <td className="py-2 pr-3 text-xs font-medium text-gray-700">{m.month}</td>
              <td className="py-2 pr-3 text-right">
                <span
                  className={`text-xs font-semibold ${
                    m.actualWeightChange < 0
                      ? 'text-green-600'
                      : m.actualWeightChange > 0
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {m.actualWeightChange > 0 ? '+' : ''}
                  {m.actualWeightChange.toFixed(1)}
                </span>
              </td>
              <td className="py-2 text-right">
                <span
                  className={`text-xs font-semibold ${
                    m.goalWeightChange < 0 ? 'text-blue-600' : 'text-orange-500'
                  }`}
                >
                  {m.goalWeightChange > 0 ? '+' : ''}
                  {m.goalWeightChange.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
