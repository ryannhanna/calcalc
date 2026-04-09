'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import FitbitSync, { saveFitbitAuth, getFitbitAuth } from '../../components/FitbitSync';

export default function LogPage() {
  return (
    <Suspense>
      <LogPageInner />
    </Suspense>
  );
}

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fitbitError, setFitbitError] = useState('');
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

  // Handle Fitbit OAuth redirect — store token from query params then clean URL
  useEffect(() => {
    const token = searchParams.get('fitbit_token');
    const refresh = searchParams.get('fitbit_refresh');
    const expiresIn = searchParams.get('fitbit_expires_in');
    const error = searchParams.get('fitbit_error');

    if (token && refresh && expiresIn) {
      saveFitbitAuth({
        accessToken: token,
        refreshToken: refresh,
        expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000,
      });
      // Clean query params from URL without re-render
      window.history.replaceState({}, '', '/log');
    }

    if (error) {
      setFitbitError(
        error === 'access_denied'
          ? 'Fitbit access was denied.'
          : error === 'not_configured'
          ? 'Fitbit is not configured — add your Client ID to environment variables.'
          : 'Fitbit connection failed.'
      );
      window.history.replaceState({}, '', '/log');
    }
  }, [searchParams]);

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            All weeks — past and future. Edit any week at any time.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FitbitSync
            settings={settings}
            entries={entries}
            onSynced={(updated) => setEntries(updated)}
          />
          <button
            onClick={scrollToToday}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Jump to Today
          </button>
        </div>
      </div>

      {fitbitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{fitbitError}</span>
          <button onClick={() => setFitbitError('')} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

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
