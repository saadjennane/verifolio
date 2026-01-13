'use client';

import { useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { getBriefTheme, type BriefThemeColor } from '@/lib/briefs/themes';
import { BriefThemeSelectorCompact } from './BriefThemeSelector';

interface NewBriefTemplateWizardProps {
  onComplete: (data: {
    name: string;
    description: string;
    useAI: boolean;
    aiPrompt?: string;
    themeColor: BriefThemeColor;
    showLogo: boolean;
    showBriefReminder: boolean;
  }) => void;
  onCancel: () => void;
  isCreating?: boolean;
}

type Step = 'info' | 'method';

export function NewBriefTemplateWizard({
  onComplete,
  onCancel,
  isCreating = false,
}: NewBriefTemplateWizardProps) {
  const [step, setStep] = useState<Step>('info');

  // Step 1: Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Method
  const [method, setMethod] = useState<'blank' | 'ai'>('blank');
  const [aiPrompt, setAiPrompt] = useState('');

  // Design options
  const [themeColor, setThemeColor] = useState<BriefThemeColor>('blue');
  const [showLogo, setShowLogo] = useState(true);
  const [showBriefReminder, setShowBriefReminder] = useState(true);

  const theme = getBriefTheme(themeColor);

  const canProceedStep1 = name.trim().length > 0;
  const canCreate = method === 'blank' || (method === 'ai' && aiPrompt.trim().length > 0);

  const handleNext = () => {
    if (step === 'info' && canProceedStep1) {
      setStep('method');
    }
  };

  const handleBack = () => {
    if (step === 'method') {
      setStep('info');
    }
  };

  const handleCreate = () => {
    onComplete({
      name: name.trim(),
      description: description.trim(),
      useAI: method === 'ai',
      aiPrompt: method === 'ai' ? aiPrompt.trim() : undefined,
      themeColor,
      showLogo,
      showBriefReminder,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header with progress */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Nouveau template de brief</h2>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'info'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {step === 'info' ? '1' : '✓'}
              </div>
              <span className={`text-sm ${step === 'info' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                Informations
              </span>
            </div>
            <div className="w-8 h-0.5 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === 'method'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
              <span className={`text-sm ${step === 'method' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                Methode
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Info */}
          {step === 'info' && (
            <div className="space-y-5">
              <div>
                <Input
                  label="Nom du template"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Brief evenementiel, Brief site web..."
                  autoFocus
                />
              </div>

              <div>
                <Textarea
                  label="Description (optionnel)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Decrivez brievement l'usage de ce template..."
                  rows={3}
                />
              </div>

              {/* Design options */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Options du formulaire</h4>

                <div className="space-y-4">
                  {/* Theme color */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Couleur</label>
                    <BriefThemeSelectorCompact
                      selectedColor={themeColor}
                      onColorChange={setThemeColor}
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Afficher mon logo</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showBriefReminder}
                        onChange={(e) => setShowBriefReminder(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm text-gray-700">Inclure un rappel du brief</span>
                        <p className="text-xs text-gray-500">
                          Affiche le contexte du deal en haut du formulaire (si renseigne)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Comment souhaitez-vous demarrer votre template ?
              </p>

              {/* Blank option */}
              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'blank'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="blank"
                    checked={method === 'blank'}
                    onChange={() => setMethod('blank')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium text-gray-900">Page blanche</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Commencez avec un template vide et ajoutez vos questions manuellement.
                    </p>
                  </div>
                </div>
              </label>

              {/* AI option */}
              <label
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  method === 'ai'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="ai"
                    checked={method === 'ai'}
                    onChange={() => setMethod('ai')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-medium text-gray-900">Assistance IA</span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Beta
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Decrivez votre besoin et l'IA generera une base de questions.
                    </p>
                  </div>
                </div>
              </label>

              {/* AI prompt input */}
              {method === 'ai' && (
                <div className="mt-4 pl-7">
                  <Textarea
                    label="Decrivez votre brief"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ex: Je dois organiser un evenement d'entreprise pour 200 personnes. J'ai besoin de connaitre le budget, les dates souhaitees, le type d'evenement, les contraintes alimentaires..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Plus vous etes precis, meilleures seront les suggestions.
                  </p>
                </div>
              )}

              {/* Preview what will be created */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Resume</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="font-medium">{name}</span>
                  </div>
                  {description && (
                    <p className="text-gray-500 pl-5">{description}</p>
                  )}
                  <div className="pl-5 pt-1 space-y-0.5">
                    {showLogo && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Logo affiche
                      </div>
                    )}
                    {showBriefReminder && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Rappel du brief inclus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          {step === 'info' ? (
            <>
              <Button variant="secondary" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={handleNext} disabled={!canProceedStep1}>
                Suivant
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleBack}>
                Precedent
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!canCreate}
                loading={isCreating}
              >
                {method === 'ai' ? 'Generer avec l\'IA' : 'Creer le template'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewBriefTemplateWizard;
