'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Link2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { ResourceType, SendHistoryItem, ResourceAnalytics, TrackingEvent } from '@/lib/send/types';

// ============================================================================
// TYPES
// ============================================================================

interface SendHistoryProps {
  resourceType: ResourceType;
  resourceId: string;
  className?: string;
}

interface HistoryData {
  history: SendHistoryItem[];
  events: TrackingEvent[];
  analytics: ResourceAnalytics;
  public_link: {
    token: string;
    url: string;
    created_at: string;
    expires_at: string | null;
  } | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SendHistory({ resourceType, resourceId, className = '' }: SendHistoryProps) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/send/history?resource_type=${resourceType}&resource_id=${resourceId}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [resourceType, resourceId]);

  const handleCopyLink = async () => {
    if (data?.public_link?.url) {
      await navigator.clipboard.writeText(data.public_link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-20 bg-gray-100 rounded-lg" />
        <div className="h-32 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { history, analytics, public_link } = data;
  const hasBeenSent = history.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stats rapides */}
      {hasBeenSent && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Mail className="h-4 w-4 text-blue-500" />}
            label="Envoyé"
            value={analytics.total_sends.toString()}
          />
          <StatCard
            icon={<Eye className="h-4 w-4 text-green-500" />}
            label="Ouvert"
            value={analytics.total_opens.toString()}
          />
          <StatCard
            icon={<Download className="h-4 w-4 text-purple-500" />}
            label="PDF"
            value={analytics.pdf_downloads.toString()}
          />
        </div>
      )}

      {/* Lien public */}
      {public_link && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Link2 className="h-4 w-4" />
              Lien public
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-7 px-2"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <a
                href={public_link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-500 truncate font-mono">
            {public_link.url}
          </p>
        </div>
      )}

      {/* Historique des envois */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Historique</h4>
          <button
            onClick={fetchHistory}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg">
            Aucun envoi pour le moment
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

interface HistoryItemProps {
  item: SendHistoryItem;
}

function HistoryItem({ item }: HistoryItemProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', label: 'En attente' },
    sent: { icon: CheckCircle, color: 'text-green-500', label: 'Envoyé' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Échec' },
  };

  const config = statusConfig[item.status];
  const StatusIcon = config.icon;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
      <StatusIcon className={`h-5 w-5 ${config.color} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">
            {item.recipient_count} destinataire{item.recipient_count > 1 ? 's' : ''}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(item.sent_at)}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">
          {item.recipient_emails.slice(0, 2).join(', ')}
          {item.recipient_emails.length > 2 && ` +${item.recipient_emails.length - 2}`}
        </p>
        {item.status === 'failed' && item.error_message && (
          <p className="text-xs text-red-500 mt-1">{item.error_message}</p>
        )}
      </div>
    </div>
  );
}
