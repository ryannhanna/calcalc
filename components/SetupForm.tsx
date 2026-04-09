'use client';

import { useState } from 'react';
import { UserSettings } from '../lib/types';
import { saveSettings } from '../lib/storage';
import { format } from 'date-fns';

interface Props {
  existing?: UserSettings | null;
  onComplete: (settings: UserSettings) => void;
}

const defaultSettings: UserSettings = {
  unit: 'lb',
  measurementUnit: 'inch',
  startingDate: format(new Date(), 'yyyy-MM-dd'),
  startingWeight: 0,
  bodyFatPercent: 0,
  weeklyGoal: -1,
  bfCalculatorEnabled: false,
  gender: 'Male',
  height: 0,
};

export default function SetupForm({ existing, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<UserSettings>(existing ?? defaultSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!form.startingWeight || form.startingWeight <= 0)
      errs.startingWeight = 'Enter a valid weight';
    if (!form.bodyFatPercent || form.bodyFatPercent <= 0 || form.bodyFatPercent >= 100)
      errs.bodyFatPercent = 'Enter body fat % between 1–99';
    if (!form.startingDate) errs.startingDate = 'Select a starting date';
    if (form.weeklyGoal === 0) errs.weeklyGoal = 'Enter a weekly goal (non-zero)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3() {
    if (!form.bfCalculatorEnabled) return true;
    const errs: Record<string, string> = {};
    if (!form.height || form.height <= 0) errs.height = 'Enter your height';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  }

  function handleSubmit() {
    saveSettings(form);
    onComplete(form);
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-xs text-red-600 mt-1';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Fitness Tracker Setup</h1>
          <p className="text-sm text-gray-500 mt-1">Step {step} of 3</p>
          <div className="flex gap-2 justify-center mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Your Body Stats</h2>

              <div>
                <label className={labelClass}>Starting Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.startingDate}
                  onChange={(e) => set('startingDate', e.target.value)}
                />
                {errors.startingDate && <p className={errorClass}>{errors.startingDate}</p>}
              </div>

              <div>
                <label className={labelClass}>Current Weight ({form.unit}s)</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={form.startingWeight || ''}
                  onChange={(e) => set('startingWeight', parseFloat(e.target.value) || 0)}
                  placeholder={`e.g. ${form.unit === 'lb' ? '180' : '82'}`}
                />
                {errors.startingWeight && <p className={errorClass}>{errors.startingWeight}</p>}
              </div>

              <div>
                <label className={labelClass}>Estimated Body Fat %</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={form.bodyFatPercent || ''}
                  onChange={(e) => set('bodyFatPercent', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 20"
                />
                {errors.bodyFatPercent && <p className={errorClass}>{errors.bodyFatPercent}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  Weekly Goal ({form.unit}s/week — negative = lose, positive = gain)
                </label>
                <input
                  type="number"
                  step="0.5"
                  className={inputClass}
                  value={form.weeklyGoal || ''}
                  onChange={(e) => set('weeklyGoal', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. -1 to lose 1 lb/week"
                />
                {errors.weeklyGoal && <p className={errorClass}>{errors.weeklyGoal}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Safe range: -2 to +2 {form.unit}s/week
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Unit Preferences</h2>

              <div>
                <label className={labelClass}>Weight Unit</label>
                <div className="flex gap-3">
                  {(['lb', 'kg'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => set('unit', u)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.unit === u
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {u === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Measurement Unit (for body measurements)</label>
                <div className="flex gap-3">
                  {(['inch', 'cm'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => set('measurementUnit', u)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.measurementUnit === u
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {u === 'inch' ? 'Inches (in)' : 'Centimeters (cm)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Gender (for BF% calculation)</label>
                <div className="flex gap-3">
                  {(['Male', 'Female'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => set('gender', g)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.gender === g
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Body Fat % Calculator{' '}
                <span className="text-sm font-normal text-gray-500">(Optional)</span>
              </h2>
              <p className="text-sm text-gray-600">
                Enable this to track body measurements and automatically calculate your body fat %
                using the US Navy formula each week.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => set('bfCalculatorEnabled', !form.bfCalculatorEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.bfCalculatorEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      form.bfCalculatorEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">
                  {form.bfCalculatorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {form.bfCalculatorEnabled && (
                <div>
                  <label className={labelClass}>
                    Your Height ({form.measurementUnit === 'inch' ? 'inches' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={inputClass}
                    value={form.height || ''}
                    onChange={(e) => set('height', parseFloat(e.target.value) || 0)}
                    placeholder={form.measurementUnit === 'inch' ? 'e.g. 70' : 'e.g. 178'}
                  />
                  {errors.height && <p className={errorClass}>{errors.height}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    You will enter waist, neck{form.gender === 'Female' ? ', and hip' : ''}{' '}
                    measurements each week in the Log.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {step === 3 ? 'Finish Setup' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
