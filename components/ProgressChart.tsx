'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { WeekSummary } from '../lib/types';
import { format, parseISO } from 'date-fns';

interface Props {
  summaries: WeekSummary[];
  unit: 'lb' | 'kg';
}

export default function ProgressChart({ summaries, unit }: Props) {
  const data = summaries
    .filter((s) => s.avgWeight !== null || s.avgCalories !== null || s.tdee !== null)
    .map((s) => ({
      week: `W${s.weekNumber}`,
      date: format(parseISO(s.weekStartDate), 'MMM d'),
      weight: s.avgWeight !== null ? parseFloat(s.avgWeight.toFixed(1)) : null,
      calories: s.avgCalories !== null ? Math.round(s.avgCalories) : null,
      tdee: s.tdee !== null ? Math.round(s.tdee) : null,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
        No data yet — start logging to see your progress charts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weight chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Average Weekly Weight ({unit})
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              formatter={(v) => [`${v} ${unit}`, 'Avg Weight']}
              labelFormatter={(l) => `Week: ${l}`}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              name={`Weight (${unit})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Calories + TDEE chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Avg Daily Calories vs TDEE
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip
              formatter={(v, name) => [
                `${v?.toLocaleString()} cal`,
                name === 'calories' ? 'Avg Calories' : 'TDEE',
              ]}
              labelFormatter={(l) => `Week: ${l}`}
            />
            <Legend
              formatter={(value) => (value === 'calories' ? 'Avg Calories' : 'TDEE')}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="tdee"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
