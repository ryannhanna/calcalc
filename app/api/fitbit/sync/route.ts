import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken, startDate, unit } = await req.json();

  if (!accessToken || !startDate) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
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

    // Read the raw unit field from Fitbit profile so we can detect it exactly
    const rawWeightUnit: string = profileData?.user?.weightUnit ?? 'UNKNOWN';

    // Fitbit returns 'en_US' for lbs, anything else (METRIC, en_GB, etc.) is kg
    const fitbitIsLbs = rawWeightUnit === 'en_US';

    const rawWeights: { dateTime: string; value: string }[] = weightData['body-weight'] ?? [];

    const weights = rawWeights.map((item) => {
      const raw = parseFloat(item.value);
      let converted = raw;
      if (!fitbitIsLbs && unit === 'lb') {
        converted = raw * 2.20462; // kg → lb
      } else if (fitbitIsLbs && unit === 'kg') {
        converted = raw / 2.20462; // lb → kg
      }
      return { dateTime: item.dateTime, value: String(parseFloat(converted.toFixed(1))) };
    });

    return NextResponse.json({
      calories: calData['foods-log-caloriesIn'] ?? [],
      weights,
      // Include for debugging — remove once unit issue is confirmed fixed
      _debug: { fitbitWeightUnit: rawWeightUnit, fitbitIsLbs, appUnit: unit },
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
