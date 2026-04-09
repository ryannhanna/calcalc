'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings, syncWeeksToToday } from '../../lib/storage';
import { buildWeekSummaries, buildMonthSummaries } from '../../lib/calculations';
import { UserSettings, WeeklyEntry } from '../../lib/types';
import ProgressChart from '../../components/ProgressChart';
import { WeeklySummaryTable, MonthlySummaryTable } from '../../components/SummaryTable';

export default function SummaryPage() {
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

  const weekSummaries = buildWeekSummaries(entries, settings);
  const monthSummaries = buildMonthSummaries(weekSummaries, settings.weeklyGoal);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your progress over time — weekly and monthly breakdowns.
        </p>
      </div>

      {/* Charts */}
      <ProgressChart summaries={weekSummaries} unit={settings.unit} />

      {/* Weekly table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Weekly Breakdown
        </h2>
        <WeeklySummaryTable summaries={weekSummaries} unit={settings.unit} />
      </div>

      {/* Monthly table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Monthly Breakdown
        </h2>
        <MonthlySummaryTable summaries={monthSummaries} unit={settings.unit} />
      </div>
    </div>
  );
}
