'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';

interface EmailSettingsData {
  email_sender_name: string;
  email_reply_to: string;
  display_name: string;
  email: string;
}

export function EmailSettings() {
  const [settings, setSettings] = useState<EmailSettingsData>({
    email_sender_name: '',
    email_reply_to: '',
    display_name: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      console.log('[EmailSettings] Fetching company settings...');
      const res = await fetch('/api/settings/company', { credentials: 'include' });
      console.log('[EmailSettings] Response status:', res.status);
      if (!res.ok) {
        setError(`Erreur API: ${res.status}`);
        return;
      }
      const json = await res.json();
      console.log('[EmailSettings] Response data:', json);
      if (json.data) {
        setSettings({
          email_sender_name: json.data.email_sender_name || '',
          email_reply_to: json.data.email_reply_to || '',
          display_name: json.data.display_name || '',
          email: json.data.email || '',
        });
      } else if (json.error) {
        setError(json.error);
      }
      // Si data est null, on garde les valeurs par défaut (pas d'erreur)
    } catch (err) {
      console.error('Erreur chargement settings:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_sender_name: settings.email_sender_name || null,
          email_reply_to: settings.email_reply_to || null,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Paramètres enregistrés' });
      } else {
        setMessage({ type: 'error', text: json.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setSaving(false);
    }
  }

  // Compute preview values
  const senderName = settings.email_sender_name || settings.display_name || 'Votre entreprise';
  const replyTo = settings.email_reply_to || settings.email || 'votre@email.com';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Erreur de chargement</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              Vérifiez que la migration 081_email_settings.sql a été exécutée sur Supabase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Comment fonctionnent les emails ?</p>
            <p>
              Les emails sont envoyés depuis <strong>documents@verifolio.pro</strong> mais affichent votre nom.
              Quand vos clients répondent, le message arrive directement dans votre boîte mail.
            </p>
          </div>
        </div>
      </div>

      {/* Sender Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Expéditeur</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'expéditeur
            </label>
            <input
              type="text"
              value={settings.email_sender_name}
              onChange={e => setSettings(prev => ({ ...prev, email_sender_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={settings.display_name || 'Votre entreprise'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Le nom qui apparaît dans la boîte de réception de vos clients. Par défaut : le nom de votre entreprise.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de réponse (Reply-To)
            </label>
            <input
              type="email"
              value={settings.email_reply_to}
              onChange={e => setSettings(prev => ({ ...prev, email_reply_to: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={settings.email || 'contact@exemple.com'}
            />
            <p className="text-xs text-gray-500 mt-1">
              L'adresse qui reçoit les réponses de vos clients. Par défaut : l'email de votre entreprise.
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Aperçu</h2>

        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          <div className="space-y-2">
            <div className="flex">
              <span className="text-gray-500 w-20">De :</span>
              <span className="text-gray-900">{senderName} via Verifolio &lt;documents@verifolio.pro&gt;</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-20">Répondre à :</span>
              <span className="text-gray-900">{replyTo}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-20">Objet :</span>
              <span className="text-gray-900">[Verifolio] Proposition – Client Exemple</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Vos clients verront "<strong>{senderName} via Verifolio</strong>" comme expéditeur et pourront répondre directement à <strong>{replyTo}</strong>.
        </p>
      </div>

      {/* Subject Formats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Format des sujets</h2>
        <p className="text-sm text-gray-500 mb-4">
          Les sujets des emails suivent un format standard pour une meilleure organisation.
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-500">Proposition</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">[Verifolio] Proposition – {'{client}'}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-500">Devis</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">[Verifolio] Devis – {'{client}'}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-500">Facture</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">[Verifolio] Facture {'{numero}'} – {'{client}'}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-500">Brief</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">[Verifolio] Brief projet – {'{client}'}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-500">Témoignage</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700">[Verifolio] Votre témoignage – {'{votre_nom}'}</code>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Signature des emails</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tous les emails envoyés incluent cette signature en bas du message.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
          <p className="text-sm text-gray-700 font-medium">{senderName}</p>
          <p className="text-xs text-gray-500 mt-1">
            Envoyé via Verifolio<br />
            <span className="text-blue-600">https://verifolio.pro</span>
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
