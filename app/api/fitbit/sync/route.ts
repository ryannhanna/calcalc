import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken, startDate, unit } = await req.json();

  if (!accessToken || !startDate) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const [calRes, weightRes] = await Promise.all([
      fetch(
        `https://api.fitbit.com/1/user/-/foods/log/caloriesIn/date/${startDate}/${today}.json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      // Always fetch weight in metric (kg) — we convert on the server before returning
      fetch(
        `https://api.fitbit.com/1/user/-/body/weight/date/${startDate}/${today}.json`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Accept-Language': 'en_GB' } }
      ),
    ]);

    if (calRes.status === 401 || weightRes.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!calRes.ok || !weightRes.ok) {
      return NextResponse.json({ error: 'fitbit_api_error' }, { status: 502 });
    }

    const [calData, weightData] = await Promise.all([calRes.json(), weightRes.json()]);

    // Convert weights from kg (always returned by en_GB) to app unit
    const rawWeights: { dateTime: string; value: string }[] = weightData['body-weight'] ?? [];
    const weights = rawWeights.map((item) => ({
      dateTime: item.dateTime,
      value: unit === 'lb'
        ? String(parseFloat((parseFloat(item.value) * 2.20462).toFixed(1)))
        : item.value,
    }));

    return NextResponse.json({
      calories: calData['foods-log-caloriesIn'] ?? [],
      weights,
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
