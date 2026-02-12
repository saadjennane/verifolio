'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function IntegrationsSettings() {
  const searchParams = useSearchParams();
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();

    // Check URL params for OAuth callback result
    const calendarConnectedParam = searchParams.get('calendar_connected');
    const calendarError = searchParams.get('calendar_error');

    if (calendarConnectedParam === 'true') {
      setMessage({ type: 'success', text: 'Google Calendar connecté avec succès !' });
      // Clean URL
      window.history.replaceState({}, '', '/settings?section=integrations');
    } else if (calendarError) {
      const errorMessages: Record<string, string> = {
        no_code: 'Code d\'autorisation manquant',
        invalid_state: 'Session invalide, veuillez réessayer',
        not_configured: 'Google OAuth non configuré sur le serveur',
        token_exchange_failed: 'Échec de l\'authentification Google',
        storage_failed: 'Erreur de sauvegarde des identifiants',
        server_error: 'Erreur serveur',
      };
      setMessage({ type: 'error', text: errorMessages[calendarError] || 'Erreur de connexion' });
      window.history.replaceState({}, '', '/settings?section=integrations');
    }
  }, [searchParams]);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch('/api/calendar/auth');
      if (res.ok) {
        const data = await res.json();
        setCalendarConnected(data.connected);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/calendar/auth/connect');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de connexion');
      }

      const { authUrl } = await res.json();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur de connexion',
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter Google Calendar ?')) {
      return;
    }

    setDisconnecting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/calendar/auth', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de déconnexion');
      }

      setCalendarConnected(false);
      setMessage({ type: 'success', text: 'Google Calendar déconnecté' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur de déconnexion',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Google Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : calendarConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  <Check className="w-3 h-3" />
                  Connecté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  Non connecté
                </span>
              )}
            </div>

            <p className="text-gray-600 text-sm mt-1">
              Synchronisez vos événements avec Google Calendar. Créez des événements depuis Verifolio
              et liez-les à vos missions, deals, clients et contacts.
            </p>

            {/* Features list */}
            <ul className="mt-3 space-y-1 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Créer des événements depuis Verifolio
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Lier les événements aux entités (missions, clients...)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Vue calendrier intégrée
              </li>
            </ul>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-3">
              {!loading && (
                <>
                  {calendarConnected ? (
                    <>
                      <Button
                        variant="secondary"
                        onClick={handleDisconnect}
                        loading={disconnecting}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Déconnecter
                      </Button>
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        Ouvrir Google Calendar
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  ) : (
                    <Button onClick={handleConnect} loading={connecting}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Connecter Google Calendar
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-1">Configuration requise</h4>
        <p className="text-sm text-blue-700">
          Pour utiliser l&apos;intégration Google Calendar, les variables d&apos;environnement suivantes doivent
          être configurées sur le serveur :
        </p>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>
            <code className="bg-blue-100 px-1 rounded">GOOGLE_CLIENT_ID</code>
          </li>
          <li>
            <code className="bg-blue-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code>
          </li>
          <li>
            <code className="bg-blue-100 px-1 rounded">GOOGLE_CALENDAR_REDIRECT_URI</code> (optionnel)
          </li>
        </ul>
      </div>
    </div>
  );
}
