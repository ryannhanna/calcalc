import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken, startDate, unit } = await req.json();

  if (!accessToken || !startDate) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    // Fetch profile, calories, and weight in parallel
    const [profileRes, calRes, weightRes] = await Promise.all([
      fetch('https://api.fitbit.com/1/user/-/profile.json', { headers }),
      fetch(
        `https://api.fitbit.com/1/user/-/foods/log/caloriesIn/date/${startDate}/${today}.json`,
        { headers }
      ),
      fetch(
        `https://api.fitbit.com/1/user/-/body/weight/date/${startDate}/${today}.json`,
        { headers }
      ),
    ]);

    if (profileRes.status === 401 || calRes.status === 401 || weightRes.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!profileRes.ok || !calRes.ok || !weightRes.ok) {
      return NextResponse.json({ error: 'fitbit_api_error' }, { status: 502 });
    }

    const [profileData, calData, weightData] = await Promise.all([
      profileRes.json(),
      calRes.json(),
      weightRes.json(),
    ]);

    // Determine what unit Fitbit is actually returning based on user's Fitbit account setting
    // weightUnit in profile is 'en_US' (lbs) or 'METRIC' (kg)
    const fitbitWeightUnit: 'lb' | 'kg' =
      profileData?.user?.weightUnit === 'en_US' ? 'lb' : 'kg';

    const rawWeights: { dateTime: string; value: string }[] = weightData['body-weight'] ?? [];

    // Convert from Fitbit's unit to the app's unit
    const weights = rawWeights.map((item) => {
      const raw = parseFloat(item.value);
      let converted = raw;
      if (fitbitWeightUnit === 'kg' && unit === 'lb') {
        converted = raw * 2.20462; // kg → lb
      } else if (fitbitWeightUnit === 'lb' && unit === 'kg') {
        converted = raw / 2.20462; // lb → kg
      }
      return { dateTime: item.dateTime, value: String(parseFloat(converted.toFixed(1))) };
    });

    return NextResponse.json({
      calories: calData['foods-log-caloriesIn'] ?? [],
      weights,
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
