'use client';

import { useState } from 'react';
import { format, parseISO, addDays, differenceInCalendarDays } from 'date-fns';
import { UserSettings, WeeklyEntry } from '../lib/types';
import { saveEntries } from '../lib/storage';

const FITBIT_AUTH_KEY = 'fitbit_auth';
const FITBIT_SCOPES = 'nutrition weight';

interface FitbitAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms timestamp
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getFitbitAuth(): FitbitAuth | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(FITBIT_AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FitbitAuth;
  } catch {
    return null;
  }
}

export function saveFitbitAuth(auth: FitbitAuth) {
  localStorage.setItem(FITBIT_AUTH_KEY, JSON.stringify(auth));
}

export function clearFitbitAuth() {
  localStorage.removeItem(FITBIT_AUTH_KEY);
}

async function getValidToken(): Promise<string | null> {
  const auth = getFitbitAuth();
  if (!auth) return null;

  // Token still valid (with 60s buffer)
  if (Date.now() < auth.expiresAt - 60_000) return auth.accessToken;

  // Attempt refresh
  const res = await fetch('/api/fitbit/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  });

  if (!res.ok) {
    clearFitbitAuth();
    return null;
  }

  const data = await res.json();
  const newAuth: FitbitAuth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveFitbitAuth(newAuth);
  return newAuth.accessToken;
}

// ─── Fitbit API fetch helpers ─────────────────────────────────────────────────

async function fitbitGet(path: string, token: string) {
  const res = await fetch(`https://api.fitbit.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Fitbit API error: ${res.status}`);
  return res.json();
}

// ─── Sync logic ───────────────────────────────────────────────────────────────

async function syncFromFitbit(
  settings: UserSettings,
  entries: WeeklyEntry[]
): Promise<{ updated: WeeklyEntry[]; syncedDays: number }> {
  const token = await getValidToken();
  if (!token) throw new Error('Not connected to Fitbit');

  const startDate = settings.startingDate;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch calorie and weight time series in two requests
  const [calData, weightData] = await Promise.all([
    fitbitGet(
      `/1/user/-/foods/log/caloriesIn/date/${startDate}/${today}.json`,
      token
    ),
    fitbitGet(
      `/1/user/-/body/weight/date/${startDate}/${today}.json`,
      token
    ),
  ]);

  // Build lookup maps: date → value
  const calMap = new Map<string, number>();
  for (const item of calData['foods-log-caloriesIn'] ?? []) {
    const cal = parseInt(item.value, 10);
    if (cal > 0) calMap.set(item.dateTime, cal);
  }

  const weightMap = new Map<string, number>();
  for (const item of weightData['body-weight'] ?? []) {
    const w = parseFloat(item.value);
    if (w > 0) weightMap.set(item.dateTime, w);
  }

  // Apply to entries
  const startISO = parseISO(settings.startingDate);
  const updated = entries.map((entry) => {
    const weekStart = parseISO(entry.weekStartDate);
    const newWeights = [...entry.weights] as (number | null)[];
    const newCals = [...entry.calories] as (number | null)[];

    for (let d = 0; d < 7; d++) {
      const date = format(addDays(weekStart, d), 'yyyy-MM-dd');
      // Only fill dates from start date onward, not future
      if (date < settings.startingDate || date > today) continue;

      const fitbitCal = calMap.get(date);
      if (fitbitCal !== undefined) newCals[d] = fitbitCal;

      const fitbitWeight = weightMap.get(date);
      if (fitbitWeight !== undefined) {
        // Fitbit returns weight in the user's account unit (lbs or kg)
        newWeights[d] = fitbitWeight;
      }
    }

    return { ...entry, weights: newWeights, calories: newCals };
  });

  const syncedDays = calMap.size + weightMap.size;
  return { updated, syncedDays };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  settings: UserSettings;
  entries: WeeklyEntry[];
  onSynced: (updated: WeeklyEntry[]) => void;
}

type Status = 'idle' | 'syncing' | 'success' | 'error';

export default function FitbitSync({ settings, entries, onSynced }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const connected = !!getFitbitAuth();

  const clientId = process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID;

  function handleConnect() {
    if (!clientId) {
      setStatus('error');
      setMessage('Fitbit Client ID not configured. See setup instructions.');
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/fitbit/callback`);
    const scope = encodeURIComponent(FITBIT_SCOPES);
    window.location.href =
      `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  }

  async function handleSync() {
    setStatus('syncing');
    setMessage('');
    try {
      const { updated, syncedDays } = await syncFromFitbit(settings, entries);
      saveEntries(updated);
      onSynced(updated);
      setStatus('success');
      setMessage(`Synced ${calMap(syncedDays)} days from Fitbit`);
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Sync failed');
      if (err instanceof Error && err.message.includes('401')) clearFitbitAuth();
    }
  }

  function handleDisconnect() {
    clearFitbitAuth();
    setStatus('idle');
    setMessage('');
    window.location.reload();
  }

  // Helper to display count
  function calMap(n: number) {
    return n === 1 ? '1' : String(n);
  }

  if (!connected) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-lg border border-[#00B0B9] bg-white px-3 py-1.5 text-sm font-medium text-[#00B0B9] hover:bg-[#f0feff] transition-colors"
        >
          <FitbitIcon />
          Connect Fitbit
        </button>
        {status === 'error' && (
          <span className="text-xs text-red-600">{message}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleSync}
        disabled={status === 'syncing'}
        className="flex items-center gap-2 rounded-lg bg-[#00B0B9] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#009aa2] disabled:opacity-60 transition-colors"
      >
        <FitbitIcon white />
        {status === 'syncing' ? 'Syncing…' : 'Sync from Fitbit'}
      </button>
      <button
        onClick={handleDisconnect}
        className="text-xs text-gray-400 hover:text-gray-600 underline"
      >
        Disconnect
      </button>
      {status === 'success' && (
        <span className="text-xs text-green-600 font-medium">{message}</span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-600">{message}</span>
      )}
    </div>
  );
}

function FitbitIcon({ white }: { white?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={white ? 'white' : '#00B0B9'}>
      <circle cx="12" cy="4" r="2.5" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="20" r="2.5" />
      <circle cx="4" cy="8" r="2" />
      <circle cx="4" cy="16" r="2" />
      <circle cx="20" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
    </svg>
  );
}
