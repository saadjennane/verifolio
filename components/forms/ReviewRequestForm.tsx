'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button, Select, Textarea } from '@/components/ui';

interface MissionInvoice {
  id: string;
  numero: string;
  status: string;
  total_ttc: number;
  deleted_at: string | null;
}

interface DeliveryNote {
  id: string;
  status: string;
  sent_at: string | null;
}

interface Mission {
  id: string;
  title: string;
  status: string;
  client_id: string;
  deal_id: string | null;
  client: {
    id: string;
    nom: string;
  };
  invoices: MissionInvoice[];
  delivery_notes: DeliveryNote[];
  has_po: boolean;
}

interface Contact {
  id: string;
  nom: string;
  email: string | null;
  role: string | null;
}

interface ReviewRequest {
  id: string;
  client_id: string;
  mission_id: string | null;
  title: string;
  custom_message: string | null;
}

interface RatingCriterion {
  id: string;
  label: string;
  order: number;
}

interface ReviewTemplate {
  id: string;
  name: string;
  description: string | null;
  rating_criteria: RatingCriterion[];
  text_placeholder: string;
  is_default: boolean;
}

interface ReviewRequestFormProps {
  reviewRequest?: ReviewRequest;
  onSuccess?: (request: ReviewRequest) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

type Step = 'mission' | 'contacts' | 'message' | 'done';

export function ReviewRequestForm({ reviewRequest, onSuccess, onCancel, embedded }: ReviewRequestFormProps) {
  const router = useRouter();
  const isEditing = !!reviewRequest;

  // Step state
  const [step, setStep] = useState<Step>('mission');

  // Data
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);

  // Selection state
  const [selectedMissionId, setSelectedMissionId] = useState(reviewRequest?.mission_id || '');
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null); // null = page blanche
  const [customMessage, setCustomMessage] = useState(reviewRequest?.custom_message || '');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdRequest, setCreatedRequest] = useState<ReviewRequest | null>(null);

  // Derived data
  const selectedMission = missions.find((m) => m.id === selectedMissionId);

  // Load missions and templates on mount
  useEffect(() => {
    loadMissions();
    loadTemplates();
  }, []);

  // Load contacts when mission changes
  useEffect(() => {
    if (selectedMissionId && selectedMission?.client_id) {
      loadContacts(selectedMission.client_id);
    } else {
      setContacts([]);
      setSelectedContactIds(new Set());
    }
  }, [selectedMissionId, selectedMission?.client_id]);

  async function loadMissions() {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Load missions with client, invoices and delivery notes
      const { data, error } = await supabase
        .from('missions')
        .select(`
          id, title, status, client_id, deal_id,
          client:clients(id, nom),
          mission_invoices:mission_invoices(
            invoice:invoices(id, numero, status, total_ttc, deleted_at)
          ),
          delivery_notes(id, status, sent_at)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading missions:', error);
      } else {
        // Get deal IDs to check for PO documents
        const dealIds = (data || [])
          .map((m: { deal_id: string | null }) => m.deal_id)
          .filter((id): id is string => id !== null);

        // Load PO documents for all deals in one query
        let poByDeal: Record<string, boolean> = {};
        if (dealIds.length > 0) {
          const { data: poData } = await supabase
            .from('entity_documents')
            .select('entity_id')
            .eq('entity_type', 'DEAL')
            .eq('doc_kind', 'PO')
            .in('entity_id', dealIds);

          if (poData) {
            poByDeal = poData.reduce((acc, doc) => {
              acc[doc.entity_id] = true;
              return acc;
            }, {} as Record<string, boolean>);
          }
        }

        // Transform data to handle Supabase's response format
        const formattedMissions = (data || []).map((m: unknown) => {
          const mission = m as {
            id: string;
            title: string;
            status: string;
            client_id: string;
            deal_id: string | null;
            client: { id: string; nom: string } | { id: string; nom: string }[];
            mission_invoices: Array<{ invoice: MissionInvoice | MissionInvoice[] | null }>;
            delivery_notes: DeliveryNote[];
          };
          const client = Array.isArray(mission.client) ? mission.client[0] : mission.client;

          // Extract invoices from mission_invoices
          const invoices: MissionInvoice[] = [];
          for (const mi of mission.mission_invoices || []) {
            const inv = Array.isArray(mi.invoice) ? mi.invoice[0] : mi.invoice;
            if (inv && !inv.deleted_at) {
              invoices.push(inv);
            }
          }

          return {
            id: mission.id,
            title: mission.title,
            status: mission.status,
            client_id: mission.client_id,
            deal_id: mission.deal_id,
            client: client || { id: '', nom: '' },
            invoices,
            delivery_notes: mission.delivery_notes || [],
            has_po: mission.deal_id ? !!poByDeal[mission.deal_id] : false,
          };
        });
        setMissions(formattedMissions);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadContacts(clientId: string) {
    try {
      const supabase = createClient();

      // Contacts are linked to clients via client_contacts junction table
      const { data, error } = await supabase
        .from('client_contacts')
        .select(`
          contact:contacts(id, nom, email),
          role
        `)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error loading contacts:', error);
      } else {
        // Transform data to handle Supabase's response format
        const contactsWithEmail: Contact[] = [];
        for (const cc of data || []) {
          const row = cc as { contact: { id: string; nom: string; email: string | null } | { id: string; nom: string; email: string | null }[] | null; role: string | null };
          const contact = Array.isArray(row.contact) ? row.contact[0] : row.contact;
          if (contact?.email) {
            contactsWithEmail.push({
              id: contact.id,
              nom: contact.nom,
              email: contact.email,
              role: row.role,
            });
          }
        }

        setContacts(contactsWithEmail);

        // Auto-select all contacts with email
        if (contactsWithEmail.length > 0) {
          setSelectedContactIds(new Set(contactsWithEmail.map((c) => c.id)));
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }

  async function loadTemplates() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('review_templates')
        .select('id, name, description, rating_criteria, text_placeholder, is_default')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading templates:', error);
      } else {
        setTemplates((data || []) as ReviewTemplate[]);

        // Auto-select default template if exists
        const defaultTemplate = (data || []).find((t: ReviewTemplate) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  const handleNextStep = () => {
    if (step === 'mission' && selectedMissionId) {
      setStep('contacts');
    } else if (step === 'contacts' && selectedContactIds.size > 0) {
      setStep('message');
    }
  };

  const handlePrevStep = () => {
    if (step === 'contacts') {
      setStep('mission');
    } else if (step === 'message') {
      setStep('contacts');
    }
  };

  const toggleContact = (contactId: string) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedContactIds(newSet);
  };

  const handleCreate = async () => {
    if (!selectedMissionId || selectedContactIds.size === 0) return;

    setIsCreating(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const title = `Demande d'avis - ${selectedMission?.title || 'Mission'}`;

      // Get selected contacts emails
      const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id));
      const recipientEmails = selectedContacts.map(c => c.email).filter(Boolean);

      const requestData = {
        user_id: user?.id,
        client_id: selectedMission?.client_id,
        mission_id: selectedMissionId,
        invoice_id: null,
        template_id: selectedTemplateId,
        title,
        custom_message: customMessage.trim() || null,
        status: 'pending',
        public_token: crypto.randomUUID().replace(/-/g, ''),
      };

      let savedRequest: ReviewRequest | null = null;

      if (isEditing && reviewRequest) {
        const { data, error } = await supabase
          .from('review_requests')
          .update({
            mission_id: selectedMissionId,
            custom_message: customMessage.trim() || null,
          })
          .eq('id', reviewRequest.id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Erreur lors de la mise à jour');
        }
        savedRequest = data as ReviewRequest;
      } else {
        const { data, error } = await supabase
          .from('review_requests')
          .insert(requestData)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Erreur lors de la création');
        }
        savedRequest = data as ReviewRequest;

        // Create recipients
        if (savedRequest && recipientEmails.length > 0) {
          const recipients = selectedContacts.map(contact => ({
            review_request_id: savedRequest!.id,
            email: contact.email,
            contact_id: contact.id,
            status: 'sent',
          }));

          await supabase.from('review_request_recipients').insert(recipients);
        }
      }

      setCreatedRequest(savedRequest);
      setStep('done');

      if (onSuccess && savedRequest) {
        onSuccess(savedRequest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Progress indicator
  const steps = ['mission', 'contacts', 'message'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="space-y-6">
      {/* Progress */}
      {step !== 'done' && (
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => {
            const isActive = step === s;
            const isPast = currentStepIndex > idx;
            const labels = ['Mission', 'Contacts', 'Message'];

            return (
              <div key={s} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isPast
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {labels[idx]}
                  </span>
                </div>
                {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-200" />}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step: Mission */}
      {step === 'mission' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">1. Choisir la mission</h3>
            <p className="text-sm text-gray-500">
              Sélectionnez la mission pour laquelle vous souhaitez demander un avis.
            </p>
          </div>

          {missions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">Aucune mission disponible.</p>
              <Button variant="secondary" onClick={() => router.push('/missions')}>
                Voir les missions
              </Button>
            </div>
          ) : (
            <>
              <Select
                label="Mission"
                value={selectedMissionId}
                onChange={(e) => setSelectedMissionId(e.target.value)}
                options={[
                  { value: '', label: 'Sélectionnez une mission...' },
                  ...missions.map((m) => ({
                    value: m.id,
                    label: `${m.title}`,
                  })),
                ]}
              />

              {selectedMission && (
                <div className="space-y-3">
                  {/* Client info */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Client</p>
                        <p className="text-sm text-gray-600">{selectedMission.client.nom}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mission billing info */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">Informations de facturation</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Bon de commande */}
                      <div className="flex items-center gap-2">
                        {selectedMission.has_po ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={selectedMission.has_po ? 'text-gray-900' : 'text-gray-400'}>
                          Bon de commande
                        </span>
                      </div>

                      {/* Bon de livraison */}
                      <div className="flex items-center gap-2">
                        {selectedMission.delivery_notes.some(dn => dn.status === 'SENT') ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={selectedMission.delivery_notes.some(dn => dn.status === 'SENT') ? 'text-gray-900' : 'text-gray-400'}>
                          Bon de livraison
                        </span>
                      </div>

                      {/* Facture */}
                      <div className="flex items-center gap-2">
                        {selectedMission.invoices.length > 0 ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={selectedMission.invoices.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                          {selectedMission.invoices.length > 0
                            ? `Facturé (${selectedMission.invoices.reduce((sum, inv) => sum + inv.total_ttc, 0).toLocaleString('fr-FR')} €)`
                            : 'Non facturé'}
                        </span>
                      </div>

                      {/* Paiement */}
                      <div className="flex items-center gap-2">
                        {selectedMission.invoices.some(inv => inv.status === 'payee') ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={selectedMission.invoices.some(inv => inv.status === 'payee') ? 'text-gray-900' : 'text-gray-400'}>
                          {selectedMission.invoices.some(inv => inv.status === 'payee') ? 'Payé' : 'Non payé'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={handleCancel}>
              Annuler
            </Button>
            <Button onClick={handleNextStep} disabled={!selectedMissionId}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Step: Contacts */}
      {step === 'contacts' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">2. Sélectionner les destinataires</h3>
            <p className="text-sm text-gray-500">
              Choisissez les contacts qui recevront la demande d'avis.
            </p>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">Aucun contact avec email pour ce client.</p>
              <p className="text-sm text-gray-400">
                Ajoutez des contacts avec adresse email au client pour pouvoir envoyer des demandes d'avis.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedContactIds.has(contact.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{contact.nom}</span>
                      {contact.role && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {contact.role}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{contact.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={handlePrevStep}>
              Précédent
            </Button>
            <Button onClick={handleNextStep} disabled={selectedContactIds.size === 0}>
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Step: Message */}
      {step === 'message' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">3. Template et message</h3>
            <p className="text-sm text-gray-500">
              Choisissez un template ou commencez avec une page blanche.
            </p>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mission:</span>
              <span className="font-medium text-gray-900">{selectedMission?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Client:</span>
              <span className="font-medium text-gray-900">{selectedMission?.client.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Destinataires:</span>
              <span className="font-medium text-gray-900">{selectedContactIds.size} contact(s)</span>
            </div>
          </div>

          {/* Template selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <div className="space-y-2">
              {/* Blank page option */}
              <label
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplateId === null
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={selectedTemplateId === null}
                  onChange={() => {
                    setSelectedTemplateId(null);
                    setCustomMessage('');
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${
                    selectedTemplateId === null
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">Page blanche</span>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Commencer avec un message vide
                  </p>
                </div>
              </label>

              {/* Templates */}
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplateId === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplateId === template.id}
                    onChange={() => setSelectedTemplateId(template.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 ${
                      selectedTemplateId === template.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{template.name}</span>
                      {template.is_default && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Par défaut
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                    )}
                    {/* Show rating criteria */}
                    {template.rating_criteria.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.rating_criteria.map((criterion) => (
                          <span
                            key={criterion.id}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                          >
                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {criterion.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Textarea
            label="Message personnalisé"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Ajoutez un message personnalisé pour accompagner votre demande d'avis..."
            rows={5}
          />

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>Info:</strong> La demande sera envoyée par email aux contacts sélectionnés.
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={handlePrevStep}>
              Précédent
            </Button>
            <Button onClick={handleCreate} loading={isCreating}>
              Envoyer la demande
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && createdRequest && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Demande envoyée</h3>
          <p className="text-gray-600 mb-6">
            Votre demande d'avis a été envoyée à {selectedContactIds.size} contact(s).
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push('/reviews')}>
              Voir les demandes
            </Button>
            <Button variant="secondary" onClick={() => {
              setStep('mission');
              setSelectedMissionId('');
              setSelectedContactIds(new Set());
              setCustomMessage('');
              setCreatedRequest(null);
            }}>
              Nouvelle demande
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
