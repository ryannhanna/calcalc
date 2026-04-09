'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSettings,
  syncWeeks,
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
  const todayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = getSettings();
    if (!s) {
      router.push('/setup');
      return;
    }
    setSettings(s);
    const synced = syncWeeks(s);
    setEntries(synced);
    setLoading(false);
  }, [router]);

  // Scroll to current week on first load
  useEffect(() => {
    if (!loading && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

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

  function scrollToToday() {
    todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All weeks — past and future. Edit any week at any time.
          </p>
        </div>
        <button
          onClick={scrollToToday}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Jump to Today
        </button>
      </div>

      {entries.map((entry, i) => {
        const summary = summaries[i];
        const isCurrentWeek = entry.weekStartDate === currentWeekStart;
        const isFuture = entry.weekStartDate > currentWeekStart;
        const todayDayIndex = isCurrentWeek ? getTodayDayIndex(entry.weekStartDate) : -1;
        const prevAvgWeight =
          i === 0
            ? settings.startingWeight
            : avgNonNull(entries[i - 1].weights);

        return (
          <div key={entry.weekStartDate} ref={isCurrentWeek ? todayRef : undefined}>
            {/* Divider between past and future */}
            {isFuture && entry.weekStartDate === entries.find(e => e.weekStartDate > currentWeekStart)?.weekStartDate && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Upcoming weeks
                </span>
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>
            )}
            <WeekCard
              entry={entry}
              weekNumber={i + 1}
              weeklyGoal={settings.weeklyGoal}
              settings={settings}
              prevAvgWeight={prevAvgWeight}
              todayDayIndex={todayDayIndex}
              tdee={summary.tdee}
              isCurrent={isCurrentWeek}
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
          </div>
        );
      })}
    </div>
  );
}
