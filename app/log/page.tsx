'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSettings,
  syncWeeksToToday,
  getCurrentWeekStartDate,
  getTodayDayIndex,
  updateDailyValue,
  updateEntry,
  saveEntries,
} from '../../lib/storage';
import { buildWeekSummaries, avgNonNull } from '../../lib/calculations';
import { UserSettings, WeeklyEntry } from '../../lib/types';
import WeekCard from '../../components/WeekCard';

export default function LogPage() {
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

  const summaries = buildWeekSummaries(entries, settings);
  const currentWeekStart = getCurrentWeekStartDate(settings);

  function handleWeightChange(weekStart: string, dayIndex: number, value: number | null) {
    const updated = updateDailyValue(entries, weekStart, 'weights', dayIndex, value);
    setEntries(updated);
    saveEntries(updated);
  }

  function handleCaloriesChange(weekStart: string, dayIndex: number, value: number | null) {
    const updated = updateDailyValue(entries, weekStart, 'calories', dayIndex, value);
    setEntries(updated);
    saveEntries(updated);
  }

  function handleMeasurementsChange(
    weekStart: string,
    field: 'waist' | 'neck' | 'hip',
    value: number | null
  ) {
    const updated = updateEntry(entries, weekStart, {
      [field]: value ?? undefined,
    });
    setEntries(updated);
    saveEntries(updated);
  }

  // Reverse so current week is at top
  const reversedEntries = [...entries].reverse();
  const reversedSummaries = [...summaries].reverse();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Enter your daily weight and calories. Missing days are excluded from averages.
        </p>
      </div>

      {reversedEntries.map((entry, ri) => {
        // Since we reversed, map back to original index
        const originalIndex = entries.length - 1 - ri;
        const summary = reversedSummaries[ri];
        const isCurrentWeek = entry.weekStartDate === currentWeekStart;
        const todayDayIndex = isCurrentWeek ? getTodayDayIndex(entry.weekStartDate) : -1;
        const prevAvgWeight =
          originalIndex === 0
            ? settings.startingWeight
            : avgNonNull(entries[originalIndex - 1].weights);

        return (
          <WeekCard
            key={entry.weekStartDate}
            entry={entry}
            weekNumber={originalIndex + 1}
            weeklyGoal={settings.weeklyGoal}
            settings={settings}
            prevAvgWeight={prevAvgWeight}
            todayDayIndex={todayDayIndex}
            tdee={summary.tdee}
            onWeightChange={(dayIndex, value) =>
              handleWeightChange(entry.weekStartDate, dayIndex, value)
            }
            onCaloriesChange={(dayIndex, value) =>
              handleCaloriesChange(entry.weekStartDate, dayIndex, value)
            }
            onMeasurementsChange={(field, value) =>
              handleMeasurementsChange(entry.weekStartDate, field, value)
            }
          />
        );
      })}
    </div>
  );
}
