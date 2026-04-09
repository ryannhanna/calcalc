'use client';

interface Props {
  tdee: number;
  targetCalories: number;
  dailyDeficit: number;
  unit: 'lb' | 'kg';
  weeklyGoal: number;
}

export default function TDEECard({ tdee, targetCalories, dailyDeficit, unit, weeklyGoal }: Props) {
  const isDeficit = weeklyGoal < 0;
  const absDeficit = Math.abs(Math.round(dailyDeficit));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Calorie Targets
      </h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estimated TDEE</span>
          <span className="text-lg font-bold text-gray-900">{Math.round(tdee).toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Daily {isDeficit ? 'Deficit' : 'Surplus'} (for {Math.abs(weeklyGoal)}{unit}/wk goal)
          </span>
          <span className={`text-base font-semibold ${isDeficit ? 'text-red-500' : 'text-green-500'}`}>
            {isDeficit ? '−' : '+'}{absDeficit}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Target Daily Calories</span>
          <span className="text-2xl font-bold text-blue-600">
            {Math.round(targetCalories).toLocaleString()}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        TDEE adapts weekly based on actual weight data logged.
      </p>
    </div>
  );
}
