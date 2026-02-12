'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { EntityAutocomplete, type EntityOption } from '@/components/ui/EntityAutocomplete';
import type { CalendarEntityType, EventPrefillContext, CreateCalendarEventPayload } from '@/lib/calendar/types';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  // Optional: pre-fill from an entity
  fromEntity?: {
    type: CalendarEntityType;
    id: string;
  };
}

// Helper to format date for datetime-local input
function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

// Helper to add hours to a date
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function CalendarEventModal({
  isOpen,
  onClose,
  onCreated,
  fromEntity,
}: CalendarEventModalProps) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');

  // Entity links
  const [showLinks, setShowLinks] = useState(false);
  const [missionId, setMissionId] = useState('');
  const [dealId, setDealId] = useState('');
  const [clientId, setClientId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [contactId, setContactId] = useState('');

  // Attendees (simplified - just emails)
  const [attendeesInput, setAttendeesInput] = useState('');

  // Entity options
  const [missions, setMissions] = useState<EntityOption[]>([]);
  const [deals, setDeals] = useState<EntityOption[]>([]);
  const [clients, setClients] = useState<EntityOption[]>([]);
  const [suppliers, setSuppliers] = useState<EntityOption[]>([]);
  const [contacts, setContacts] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingPrefill, setLoadingPrefill] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set default dates (now to now + 1 hour)
      const now = new Date();
      // Round to next 30 minutes
      now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
      setStartDateTime(toDateTimeLocal(now));
      setEndDateTime(toDateTimeLocal(addHours(now, 1)));

      // Reset other fields
      setTitle('');
      setDescription('');
      setLocation('');
      setMissionId('');
      setDealId('');
      setClientId('');
      setSupplierId('');
      setContactId('');
      setAttendeesInput('');
      setError('');
      setShowLinks(!!fromEntity);

      // Load entities
      loadEntities();

      // Load pre-fill if from entity
      if (fromEntity) {
        loadPrefillContext(fromEntity.type, fromEntity.id);
      }
    }
  }, [isOpen, fromEntity]);

  const loadEntities = async () => {
    setLoadingEntities(true);
    try {
      const [missionsRes, dealsRes, clientsRes, contactsRes] = await Promise.all([
        fetch('/api/missions?status=actives'),
        fetch('/api/deals?status=actifs'),
        fetch('/api/clients'),
        fetch('/api/contacts'),
      ]);

      const [missionsData, dealsData, clientsData, contactsData] = await Promise.all([
        missionsRes.ok ? missionsRes.json() : { missions: [] },
        dealsRes.ok ? dealsRes.json() : { deals: [] },
        clientsRes.ok ? clientsRes.json() : { data: [] },
        contactsRes.ok ? contactsRes.json() : { contacts: [] },
      ]);

      // Process missions
      setMissions(
        (missionsData.missions || []).map((m: { id: string; title: string }) => ({
          id: m.id,
          label: m.title,
        }))
      );

      // Process deals
      setDeals(
        (dealsData.deals || []).map((d: { id: string; nom: string }) => ({
          id: d.id,
          label: d.nom,
        }))
      );

      // Process clients and suppliers
      const allCompanies = clientsData.data || [];
      setClients(
        allCompanies
          .filter((c: { is_client: boolean }) => c.is_client)
          .map((c: { id: string; nom: string }) => ({
            id: c.id,
            label: c.nom,
          }))
      );
      setSuppliers(
        allCompanies
          .filter((c: { is_supplier: boolean }) => c.is_supplier)
          .map((c: { id: string; nom: string }) => ({
            id: c.id,
            label: c.nom,
          }))
      );

      // Process contacts
      setContacts(
        (contactsData.contacts || []).map((c: { id: string; nom: string; prenom: string }) => ({
          id: c.id,
          label: `${c.prenom} ${c.nom}`.trim(),
        }))
      );
    } catch (err) {
      console.error('Error loading entities:', err);
    } finally {
      setLoadingEntities(false);
    }
  };

  const loadPrefillContext = async (type: CalendarEntityType, id: string) => {
    setLoadingPrefill(true);
    try {
      const res = await fetch(`/api/calendar/prefill?entity_type=${type}&entity_id=${id}`);
      if (!res.ok) return;

      const { context }: { context: EventPrefillContext } = await res.json();

      if (context.suggestedTitle) {
        setTitle(context.suggestedTitle);
      }

      if (context.suggestedLinks) {
        if (context.suggestedLinks.mission_id) setMissionId(context.suggestedLinks.mission_id);
        if (context.suggestedLinks.deal_id) setDealId(context.suggestedLinks.deal_id);
        if (context.suggestedLinks.client_id) setClientId(context.suggestedLinks.client_id);
        if (context.suggestedLinks.supplier_id) setSupplierId(context.suggestedLinks.supplier_id);
        if (context.suggestedLinks.contact_id) setContactId(context.suggestedLinks.contact_id);
      }

      if (context.suggestedAttendees && context.suggestedAttendees.length > 0) {
        setAttendeesInput(context.suggestedAttendees.map(a => a.email).join(', '));
      }
    } catch (err) {
      console.error('Error loading prefill context:', err);
    } finally {
      setLoadingPrefill(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!startDateTime || !endDateTime) {
      setError('Les dates de debut et fin sont requises');
      return;
    }

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (endDate <= startDate) {
      setError('La date de fin doit etre apres la date de debut');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Parse attendees
      const attendees = attendeesInput
        .split(/[,;]/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'))
        .map(email => ({ email }));

      const payload: CreateCalendarEventPayload = {
        summary: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        attendees: attendees.length > 0 ? attendees : undefined,
        mission_id: missionId || undefined,
        deal_id: dealId || undefined,
        client_id: clientId || undefined,
        supplier_id: supplierId || undefined,
        contact_id: contactId || undefined,
      };

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la creation');
      }

      onCreated?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyLink = missionId || dealId || clientId || supplierId || contactId;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Nouvel evenement
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <Input
            label="Titre *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reunion client, Point projet..."
            required
            autoFocus
          />

          {/* Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Debut *
              </label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => {
                  setStartDateTime(e.target.value);
                  // Auto-update end time if it's before start
                  if (e.target.value && endDateTime && e.target.value >= endDateTime) {
                    const newEnd = addHours(new Date(e.target.value), 1);
                    setEndDateTime(toDateTimeLocal(newEnd));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fin *
              </label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                min={startDateTime}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Lieu
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bureau, Visio, Adresse..."
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Participants
            </label>
            <Input
              value={attendeesInput}
              onChange={(e) => setAttendeesInput(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Emails separes par des virgules
            </p>
          </div>

          {/* Description */}
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details de la reunion..."
            rows={2}
          />

          {/* Entity Links (collapsible) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setShowLinks(!showLinks)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lier a des entites Verifolio
                </span>
                {hasAnyLink && (
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {[missionId, dealId, clientId, supplierId, contactId].filter(Boolean).length}
                  </span>
                )}
              </div>
              {showLinks ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showLinks && (
              <div className="p-3 pt-0 space-y-3 border-t border-gray-200 dark:border-gray-700">
                <EntityAutocomplete
                  label="Mission"
                  value={missionId}
                  onChange={setMissionId}
                  options={missions}
                  placeholder="Rechercher une mission..."
                  loading={loadingEntities}
                />

                <EntityAutocomplete
                  label="Deal"
                  value={dealId}
                  onChange={setDealId}
                  options={deals}
                  placeholder="Rechercher un deal..."
                  loading={loadingEntities}
                />

                <EntityAutocomplete
                  label="Client"
                  value={clientId}
                  onChange={setClientId}
                  options={clients}
                  placeholder="Rechercher un client..."
                  loading={loadingEntities}
                />

                <EntityAutocomplete
                  label="Fournisseur"
                  value={supplierId}
                  onChange={setSupplierId}
                  options={suppliers}
                  placeholder="Rechercher un fournisseur..."
                  loading={loadingEntities}
                />

                <EntityAutocomplete
                  label="Contact"
                  value={contactId}
                  onChange={setContactId}
                  options={contacts}
                  placeholder="Rechercher un contact..."
                  loading={loadingEntities}
                />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" loading={saving || loadingPrefill}>
              Creer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
