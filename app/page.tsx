'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays } from 'date-fns';
import {
  getSettings,
  syncWeeksToToday,
  getCurrentWeekStartDate,
  getTodayDayIndex,
  updateDailyValue,
  saveEntries,
} from '../lib/storage';
import {
  getCurrentTDEE,
  calcDailyDeficit,
  calcTargetCalories,
  calcMacros,
  weightInLbs,
} from '../lib/calculations';
import { UserSettings, WeeklyEntry } from '../lib/types';
import TDEECard from '../components/TDEECard';
import MacroCard from '../components/MacroCard';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSettings();
    if (!s) {
      router.push('/setup');
      return;
    }
    setSettings(s);
    const synced = syncWeeksToToday(s);
    setEntries(synced);
    setLoading(false);
  }, [router]);

  if (loading || !settings) return null;

  const currentWeekStart = getCurrentWeekStartDate(settings);
  const currentEntry = entries.find((e) => e.weekStartDate === currentWeekStart);
  const todayIndex = getTodayDayIndex(currentWeekStart);

  const tdee = getCurrentTDEE(entries, settings);
  const dailyDeficit = calcDailyDeficit(settings.weeklyGoal, settings.unit);
  const targetCals = calcTargetCalories(tdee, dailyDeficit);
  const weightForMacros = weightInLbs(settings.startingWeight, settings.unit);
  const macros = calcMacros(targetCals, weightForMacros);

  function handleDailyUpdate(
    field: 'weights' | 'calories',
    dayIndex: number,
    rawValue: string
  ) {
    const value = rawValue === '' ? null : parseFloat(rawValue);
    if (value !== null && isNaN(value)) return;
    const updated = updateDailyValue(entries, currentWeekStart, field, dayIndex, value);
    setEntries(updated);
    saveEntries(updated);
  }

  const todayWeight = todayIndex >= 0 ? currentEntry?.weights[todayIndex] : null;
  const todayCals = todayIndex >= 0 ? currentEntry?.calories[todayIndex] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Today quick-entry */}
      {todayIndex >= 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">
            Today — {DAY_LABELS[todayIndex]},{' '}
            {format(addDays(parseISO(currentWeekStart), todayIndex), 'MMM d')}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Weight ({settings.unit}s)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={todayWeight ?? ''}
                onChange={(e) => handleDailyUpdate('weights', todayIndex, e.target.value)}
                placeholder="e.g. 180.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                Calories eaten
              </label>
              <input
                type="number"
                step="1"
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={todayCals ?? ''}
                onChange={(e) => handleDailyUpdate('calories', todayIndex, e.target.value)}
                placeholder={`Target: ${Math.round(targetCals)}`}
              />
            </div>
          </div>
          {todayCals !== null && todayCals !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  todayCals <= targetCals
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {todayCals <= targetCals
                  ? `${Math.round(targetCals - todayCals)} cal under target`
                  : `${Math.round(todayCals - targetCals)} cal over target`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TDEE + Macros */}
      <TDEECard
        tdee={tdee}
        targetCalories={targetCals}
        dailyDeficit={dailyDeficit}
        unit={settings.unit}
        weeklyGoal={settings.weeklyGoal}
      />
      <MacroCard macros={macros} targetCalories={targetCals} />

      {/* Current week summary */}
      {currentEntry && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              This Week
            </h2>
            <span className="text-xs text-gray-400">
              {format(parseISO(currentWeekStart), 'MMM d')} –{' '}
              {format(addDays(parseISO(currentWeekStart), 6), 'MMM d')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {DAY_LABELS.map((d, i) => (
                    <th
                      key={d}
                      className={`text-center pb-2 font-medium ${
                        i === todayIndex ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="text-center pb-2 font-medium text-gray-500">Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {currentEntry.weights.map((w, i) => (
                    <td key={i} className="text-center py-1">
                      <span
                        className={`text-sm font-medium ${
                          w !== null ? 'text-gray-900' : 'text-gray-300'
                        } ${i === todayIndex ? 'text-blue-600' : ''}`}
                      >
                        {w !== null ? w : '—'}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-1">
                    {(() => {
                      const valid = currentEntry.weights.filter((w): w is number => w !== null);
                      return valid.length > 0 ? (
                        <span className="text-sm font-semibold text-gray-700">
                          {(valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      );
                    })()}
                  </td>
                </tr>
                <tr className="border-t border-gray-50">
                  {currentEntry.calories.map((c, i) => (
                    <td key={i} className="text-center py-1">
                      <span
                        className={`text-xs ${
                          c !== null ? 'text-gray-700' : 'text-gray-300'
                        } ${i === todayIndex ? 'text-blue-600' : ''}`}
                      >
                        {c !== null ? c.toLocaleString() : '—'}
                      </span>
                    </td>
                  ))}
                  <td className="text-center py-1">
                    {(() => {
                      const valid = currentEntry.calories.filter((c): c is number => c !== null);
                      return valid.length > 0 ? (
                        <span className="text-xs font-semibold text-gray-700">
                          {Math.round(valid.reduce((a, b) => a + b, 0) / valid.length).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      );
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>Row 1: Weight ({settings.unit})</span>
            <span>Row 2: Calories</span>
          </div>
        </div>
      )}
    </div>
  );
}
