'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select } from '@/components/ui';
import type { BriefTemplate } from '@/lib/briefs/types';

interface Deal {
  id: string;
  title: string;
  client: {
    id: string;
    nom: string;
  };
}

interface CreatedBrief {
  id: string;
  title: string;
  public_token: string | null;
}

// Steps
type Step = 'deal' | 'template' | 'done';

export default function NewBriefPage() {
  const router = useRouter();

  // Data
  const [deals, setDeals] = useState<Deal[]>([]);
  const [templates, setTemplates] = useState<BriefTemplate[]>([]);

  // Selection state
  const [selectedDealId, setSelectedDealId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // UI state
  const [step, setStep] = useState<Step>('deal');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdBrief, setCreatedBrief] = useState<CreatedBrief | null>(null);

  // Derived data
  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  // Load deals and templates on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [dealsRes, templatesRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/briefs/templates'),
        ]);

        const [dealsData, templatesData] = await Promise.all([
          dealsRes.json(),
          templatesRes.json(),
        ]);

        setDeals(dealsData.data || []);
        setTemplates(templatesData.data || []);

        // Auto-select default template if one exists
        const defaultTemplate = (templatesData.data || []).find(
          (t: BriefTemplate) => t.is_default
        );
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      } catch {
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleNextStep = () => {
    if (step === 'deal' && selectedDealId) {
      setStep('template');
    }
  };

  const handlePrevStep = () => {
    if (step === 'template') {
      setStep('deal');
    }
  };

  const handleCreate = async () => {
    if (!selectedDealId || !selectedTemplateId) return;

    setIsCreating(true);
    setError('');

    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: selectedDealId,
          template_id: selectedTemplateId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur de creation');
        return;
      }

      setCreatedBrief(data.data);
      setStep('done');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTemplate = () => {
    // Navigate to template creation (within settings or dedicated page)
    router.push('/settings?tab=briefs');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau brief</h1>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="flex items-center gap-2 mb-8">
            {['deal', 'template'].map((s, idx) => {
              const isActive = step === s;
              const isPast = (step === 'template' && s === 'deal');

              return (
                <div key={s} className="flex items-center gap-2">
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
                  {idx < 1 && <div className="w-12 h-0.5 bg-gray-200" />}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step: Deal */}
        {step === 'deal' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Choisir le deal</h2>
            <p className="text-sm text-gray-500 mb-4">
              Le brief sera lie a ce deal et au client associe.
            </p>

            {deals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Aucun deal disponible.</p>
                <Button variant="secondary" onClick={() => router.push('/deals/new')}>
                  Creer un deal
                </Button>
              </div>
            ) : (
              <>
                <Select
                  label="Deal"
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  options={[
                    { value: '', label: 'Selectionnez un deal...' },
                    ...deals.map((d) => ({
                      value: d.id,
                      label: `${d.title} - ${d.client.nom}`,
                    })),
                  ]}
                />

                {selectedDeal && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Client:</strong> {selectedDeal.client.nom}
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={handleNextStep} disabled={!selectedDealId}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Step: Template */}
        {step === 'template' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Choisir le template</h2>
            <p className="text-sm text-gray-500 mb-4">
              Les questions du template seront copiees dans votre brief.
            </p>

            {templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Aucun template disponible.</p>
                <Button variant="secondary" onClick={handleCreateTemplate}>
                  Creer un template
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
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
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
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
                            Par defaut
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={handlePrevStep}>
                Precedent
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!selectedTemplateId}
                loading={isCreating}
              >
                Creer le brief
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && createdBrief && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Brief cree</h2>
            <p className="text-gray-600 mb-6">
              Votre brief &quot;{createdBrief.title}&quot; a ete cree avec succes.
              Vous pouvez maintenant le personnaliser et l&apos;envoyer a votre client.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push(`/briefs/${createdBrief.id}`)}>
                Ouvrir l&apos;editeur
              </Button>
              <Button variant="secondary" onClick={() => router.push('/documents')}>
                Retour aux documents
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
