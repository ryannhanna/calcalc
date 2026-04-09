import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/log?fitbit_error=access_denied', req.url));
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/log?fitbit_error=not_configured', req.url));
  }

  const redirectUri = `${req.nextUrl.origin}/api/fitbit/callback`;

  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL('/log?fitbit_error=token_exchange_failed', req.url));
  }

  const data = await response.json();

  // Pass tokens back to client via query params — client will store in localStorage
  const redirectUrl = new URL('/log', req.url);
  redirectUrl.searchParams.set('fitbit_token', data.access_token);
  redirectUrl.searchParams.set('fitbit_refresh', data.refresh_token);
  redirectUrl.searchParams.set('fitbit_expires_in', String(data.expires_in));

  return NextResponse.redirect(redirectUrl);
}
