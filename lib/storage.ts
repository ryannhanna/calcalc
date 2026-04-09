'use client';

import { UserSettings, WeeklyEntry } from './types';
import { parseISO, addDays, format, differenceInCalendarDays } from 'date-fns';

const SETTINGS_KEY = 'fitness_settings';
const ENTRIES_KEY = 'fitness_weekly_entries';

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getSettings(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSettings;
  } catch {
    return null;
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── Weekly entries ───────────────────────────────────────────────────────────

export function getEntries(): WeeklyEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(ENTRIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WeeklyEntry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: WeeklyEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

// ─── Ensure weeks exist up to today ──────────────────────────────────────────
// Given the starting date from settings, generate all week entries from week 1
// through the week containing today.

export function syncWeeksToToday(settings: UserSettings): WeeklyEntry[] {
  const existing = getEntries();
  const startDate = parseISO(settings.startingDate);
  const today = new Date();

  // How many weeks have elapsed since start?
  const daysDiff = differenceInCalendarDays(today, startDate);
  const weeksNeeded = Math.max(1, Math.floor(daysDiff / 7) + 1);

  const entryMap = new Map<string, WeeklyEntry>(
    existing.map((e) => [e.weekStartDate, e])
  );

  const updated: WeeklyEntry[] = [];
  for (let i = 0; i < weeksNeeded; i++) {
    const weekStart = format(addDays(startDate, i * 7), 'yyyy-MM-dd');
    updated.push(
      entryMap.get(weekStart) ?? {
        weekStartDate: weekStart,
        weights: [null, null, null, null, null, null, null],
        calories: [null, null, null, null, null, null, null],
      }
    );
  }

  saveEntries(updated);
  return updated;
}

// ─── Day-index helper ─────────────────────────────────────────────────────────
// Given a weekStartDate and today, return which day index (0-6) corresponds to today.

export function getTodayDayIndex(weekStartDate: string): number {
  const today = new Date();
  const start = parseISO(weekStartDate);
  const diff = differenceInCalendarDays(today, start);
  return diff >= 0 && diff <= 6 ? diff : -1;
}

// Returns ISO string for the current week's start date given settings
export function getCurrentWeekStartDate(settings: UserSettings): string {
  const startDate = parseISO(settings.startingDate);
  const today = new Date();
  const daysDiff = differenceInCalendarDays(today, startDate);
  const weekIndex = Math.max(0, Math.floor(daysDiff / 7));
  return format(addDays(startDate, weekIndex * 7), 'yyyy-MM-dd');
}

export function updateEntry(
  entries: WeeklyEntry[],
  weekStartDate: string,
  updates: Partial<WeeklyEntry>
): WeeklyEntry[] {
  const idx = entries.findIndex((e) => e.weekStartDate === weekStartDate);
  if (idx === -1) return entries;
  const updated = [...entries];
  updated[idx] = { ...updated[idx], ...updates };
  return updated;
}

export function updateDailyValue(
  entries: WeeklyEntry[],
  weekStartDate: string,
  field: 'weights' | 'calories',
  dayIndex: number,
  value: number | null
): WeeklyEntry[] {
  const idx = entries.findIndex((e) => e.weekStartDate === weekStartDate);
  if (idx === -1) return entries;
  const updated = [...entries];
  const arr = [...(updated[idx][field] as (number | null)[])];
  arr[dayIndex] = value;
  updated[idx] = { ...updated[idx], [field]: arr };
  return updated;
}
