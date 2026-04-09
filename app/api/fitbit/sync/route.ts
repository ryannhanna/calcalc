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
      // Accept-Language: en_US = lbs, en_GB = kg
      fetch(
        `https://api.fitbit.com/1/user/-/body/weight/date/${startDate}/${today}.json`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Accept-Language': unit === 'lb' ? 'en_US' : 'en_GB' } }
      ),
    ]);

    if (calRes.status === 401 || weightRes.status === 401) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!calRes.ok || !weightRes.ok) {
      return NextResponse.json({ error: 'fitbit_api_error' }, { status: 502 });
    }

    const [calData, weightData] = await Promise.all([calRes.json(), weightRes.json()]);

    return NextResponse.json({
      calories: calData['foods-log-caloriesIn'] ?? [],
      weights: weightData['body-weight'] ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
