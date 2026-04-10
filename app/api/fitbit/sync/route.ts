import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken, startDate, unit } = await req.json();

  if (!accessToken || !startDate) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const [calRes, weightRes] = await Promise.all([
      fetch(
        `https://api.fitbit.com/1/user/-/foods/log/caloriesIn/date/${startDate}/${today}.json`,
        { headers }
      ),
      fetch(
        `https://api.fitbit.com/1/user/-/body/weight/date/${startDate}/${today}.json`,
        { headers }
      ),
    ]);

    if (calRes.status === 401 || weightRes.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!calRes.ok || !weightRes.ok) {
      return NextResponse.json({ error: 'fitbit_api_error' }, { status: 502 });
    }

    const [calData, weightData] = await Promise.all([calRes.json(), weightRes.json()]);

    // The Fitbit body weight time series always returns kg regardless of profile/account
    // settings — profile weightUnit field is unreliable for this endpoint.
    // So we always convert from kg to the app's unit.
    const rawWeights: { dateTime: string; value: string }[] = weightData['body-weight'] ?? [];

    const weights = rawWeights.map((item) => {
      const kg = parseFloat(item.value);
      // Fitbit body weight time series always returns kg.
      // Default to lbs conversion unless the app is explicitly set to kg.
      const converted = unit === 'kg' ? kg : kg * 2.20462;
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
