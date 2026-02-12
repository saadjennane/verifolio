import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { storeCalendarTokens } from '@/lib/calendar/google-calendar';

// GET /api/calendar/auth/callback - OAuth callback from Google
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings?calendar_error=' + encodeURIComponent(error), request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?calendar_error=no_code', request.url)
      );
    }

    // Verify state (optional but recommended)
    if (state && user) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.userId !== user.id) {
          console.error('State userId mismatch');
          return NextResponse.redirect(
            new URL('/settings?calendar_error=invalid_state', request.url)
          );
        }
      } catch {
        console.error('Failed to parse state');
      }
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/settings?calendar_error=not_configured', request.url)
      );
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/settings?calendar_error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Calculate expires_at
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store tokens
    const stored = await storeCalendarTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt ?? undefined,
      scope: tokens.scope,
    });

    if (!stored) {
      return NextResponse.redirect(
        new URL('/settings?calendar_error=storage_failed', request.url)
      );
    }

    // Success - redirect to settings page
    return NextResponse.redirect(
      new URL('/settings?calendar_connected=true', request.url)
    );
  } catch (error) {
    console.error('Error in GET /api/calendar/auth/callback:', error);
    return NextResponse.redirect(
      new URL('/settings?calendar_error=server_error', request.url)
    );
  }
}
