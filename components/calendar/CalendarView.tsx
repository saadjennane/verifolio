'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { CalendarEventModal } from './CalendarEventModal';
import { useTabsStore } from '@/lib/stores/tabs-store';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  // Verifolio enrichment
  verifolioLinks?: {
    mission?: { id: string; title: string };
    deal?: { id: string; nom: string };
    client?: { id: string; nom: string };
    supplier?: { id: string; nom: string };
    contact?: { id: string; nom: string; prenom: string };
  };
}

// Helper functions
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is first day
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function CalendarView() {
  const { openTab } = useTabsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'day') {
      const start = new Date(today);
      const end = addDays(today, 1);
      return { start, end };
    } else if (viewMode === 'week') {
      const start = startOfWeek(today);
      const end = addDays(start, 7);
      return { start, end };
    } else {
      const start = startOfMonth(today);
      const end = addDays(endOfMonth(today), 1);
      return { start, end };
    }
  }, [currentDate, viewMode]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/calendar/auth');
        if (res.ok) {
          const data = await res.json();
          setConnected(data.connected);
        }
      } catch {
        setConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Fetch events
  useEffect(() => {
    if (connected === false) {
      setLoading(false);
      return;
    }
    if (connected === null) return;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          timeMin: dateRange.start.toISOString(),
          timeMax: dateRange.end.toISOString(),
          maxResults: '100',
        });

        const res = await fetch(`/api/calendar/events?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erreur de chargement');
        }

        const data = await res.json();
        setEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [connected, dateRange]);

  // Navigation
  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const delta = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);

    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + delta);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + delta * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + delta);
    }

    setCurrentDate(newDate);
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '');
      return isSameDay(eventStart, day);
    });
  };

  // Format header based on view mode
  const formatHeader = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      }
      return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekStart.getFullYear()}`;
    } else {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  // Not connected view
  if (connected === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Connectez Google Calendar
        </h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Pour voir vos événements et en créer de nouveaux, connectez votre compte Google Calendar
          dans les paramètres.
        </p>
        <Button
          onClick={() => openTab({
            type: 'settings',
            path: '/settings?section=integrations',
            title: 'Paramètres',
            icon: 'settings',
          })}
        >
          <Settings className="w-4 h-4 mr-2" />
          Aller aux paramètres
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('today')}
              className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Current period */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {formatHeader()}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {mode === 'day' ? 'Jour' : mode === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          {/* New event button */}
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvel événement
          </Button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            getEventsForDay={getEventsForDay}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            currentDate={currentDate}
            events={events}
            getEventsForDay={getEventsForDay}
          />
        ) : (
          <DayView currentDate={currentDate} events={getEventsForDay(currentDate)} />
        )}
      </div>

      {/* Event modal */}
      <CalendarEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          // Refresh events
          setLoading(true);
          fetch(`/api/calendar/events?timeMin=${dateRange.start.toISOString()}&timeMax=${dateRange.end.toISOString()}`)
            .then((res) => res.json())
            .then((data) => setEvents(data.events || []))
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  getEventsForDay,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (day: Date) => CalendarEvent[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate days to display
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get first Monday before or on month start
  let calendarStart = startOfWeek(monthStart);

  // Generate 6 weeks of days
  const weeks: Date[][] = [];
  let current = calendarStart;

  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, today);
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`min-h-[100px] border-b border-r border-gray-200 dark:border-gray-700 p-1 ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isCurrentMonth
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {day.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <a
                      key={event.id}
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded truncate hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    >
                      {event.start.dateTime && (
                        <span className="font-medium">
                          {formatTime(event.start.dateTime)}{' '}
                        </span>
                      )}
                      {event.summary}
                    </a>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  getEventsForDay,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (day: Date) => CalendarEvent[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={i}
              className={`py-3 text-center border-r border-gray-200 dark:border-gray-700 ${
                isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {WEEKDAYS[i]}
              </div>
              <div
                className={`text-lg font-semibold mt-1 ${
                  isToday ? 'text-blue-600' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Events for each day */}
      <div className="flex-1 grid grid-cols-7 overflow-auto">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={i}
              className={`border-r border-gray-200 dark:border-gray-700 p-2 space-y-2 ${
                isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              {dayEvents.map((event) => (
                <a
                  key={event.id}
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  <div className="text-xs font-medium">
                    {event.start.dateTime
                      ? `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime || '')}`
                      : 'Journée entière'}
                  </div>
                  <div className="text-sm font-semibold truncate">{event.summary}</div>
                  {event.location && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                      {event.location}
                    </div>
                  )}
                </a>
              ))}
              {dayEvents.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">
                  Aucun événement
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  currentDate,
  events,
}: {
  currentDate: Date;
  events: CalendarEvent[];
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const currentHour = today.getHours();

  return (
    <div className="h-full overflow-auto">
      <div className="min-h-full">
        {hours.map((hour) => {
          const hourEvents = events.filter((event) => {
            if (!event.start.dateTime) return hour === 0; // All-day events at top
            const eventHour = new Date(event.start.dateTime).getHours();
            return eventHour === hour;
          });

          const isPast = isToday && hour < currentHour;
          const isCurrent = isToday && hour === currentHour;

          return (
            <div
              key={hour}
              className={`flex border-b border-gray-200 dark:border-gray-700 min-h-[60px] ${
                isPast ? 'bg-gray-50 dark:bg-gray-800/30' : ''
              } ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
            >
              {/* Hour label */}
              <div className="w-16 flex-shrink-0 pr-2 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* Events */}
              <div className="flex-1 py-1 px-2 space-y-1 border-l border-gray-200 dark:border-gray-700">
                {hourEvents.map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {event.start.dateTime
                          ? `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime || '')}`
                          : 'Journée entière'}
                      </span>
                    </div>
                    <div className="font-semibold">{event.summary}</div>
                    {event.location && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {event.location}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
