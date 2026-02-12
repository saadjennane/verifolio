import { createClient } from '@/lib/supabase/server';
import type {
  GoogleCalendarEvent,
  GoogleCalendarListResponse,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from './types';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ============================================================================
// Token Management
// ============================================================================

interface CalendarTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

/**
 * Get stored calendar tokens for current user
 */
export async function getCalendarTokens(): Promise<CalendarTokens | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;

  return data;
}

/**
 * Store calendar tokens for current user
 */
export async function storeCalendarTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
}): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('google_calendar_tokens')
    .upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expires_at || null,
      scope: tokens.scope || null,
    }, { onConflict: 'user_id' });

  return !error;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: string;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text());
      return null;
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Store the new tokens
    await storeCalendarTokens({
      access_token: data.access_token,
      expires_at: expiresAt,
    });

    return {
      access_token: data.access_token,
      expires_at: expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getCalendarTokens();
  if (!tokens) return null;

  // Check if token is expired (with 5 minute buffer)
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - bufferMs < now.getTime()) {
      // Token is expired or about to expire, refresh it
      if (tokens.refresh_token) {
        const refreshed = await refreshAccessToken(tokens.refresh_token);
        if (refreshed) {
          return refreshed.access_token;
        }
      }
      return null;
    }
  }

  return tokens.access_token;
}

// ============================================================================
// Calendar API Calls
// ============================================================================

/**
 * List events from Google Calendar
 */
export async function listEvents(options: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<GoogleCalendarListResponse | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const calendarId = options.calendarId || 'primary';
  const params = new URLSearchParams();

  if (options.timeMin) params.set('timeMin', options.timeMin);
  if (options.timeMax) params.set('timeMax', options.timeMax);
  if (options.maxResults) params.set('maxResults', options.maxResults.toString());
  if (options.pageToken) params.set('pageToken', options.pageToken);
  params.set('singleEvents', 'true');
  params.set('orderBy', 'startTime');

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('Failed to list events:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error listing events:', error);
    return null;
  }
}

/**
 * Get a single event from Google Calendar
 */
export async function getEvent(
  eventId: string,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('Failed to get event:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}

/**
 * Create a new event in Google Calendar
 */
export async function createEvent(
  payload: Omit<CreateCalendarEventPayload, 'mission_id' | 'deal_id' | 'client_id' | 'supplier_id' | 'contact_id'>,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const eventData = {
    summary: payload.summary,
    description: payload.description,
    location: payload.location,
    start: payload.start,
    end: payload.end,
    attendees: payload.attendees,
  };

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      console.error('Failed to create event:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

/**
 * Update an existing event in Google Calendar
 */
export async function updateEvent(
  eventId: string,
  payload: UpdateCalendarEventPayload,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    // First get the current event to merge with updates
    const currentEvent = await getEvent(eventId, calendarId);
    if (!currentEvent) return null;

    const eventData = {
      ...currentEvent,
      ...payload,
    };

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      console.error('Failed to update event:', await response.text());
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error updating event:', error);
    return null;
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteEvent(
  eventId: string,
  calendarId = 'primary'
): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.ok || response.status === 404;
  } catch (error) {
    console.error('Error deleting event:', error);
    return false;
  }
}

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Check if user has connected Google Calendar
 */
export async function isCalendarConnected(): Promise<boolean> {
  const tokens = await getCalendarTokens();
  return !!tokens;
}

/**
 * Disconnect Google Calendar (remove tokens)
 */
export async function disconnectCalendar(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', user.id);

  return !error;
}
