'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { CompanySettings } from '@/components/settings/CompanySettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';
import { TemplateSettings } from '@/components/settings/TemplateSettings';
import { NavigationSettings } from '@/components/settings/NavigationSettings';
import { TrashSettings } from '@/components/settings/TrashSettings';
import { ReviewTemplatesSettings } from '@/components/settings/ReviewTemplatesSettings';
import { VerifolioSettings } from '@/components/settings/VerifolioSettings';
import { TaskTemplatesSettings } from '@/components/settings/TaskTemplatesSettings';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';

type SettingsTab = 'profile' | 'company' | 'email' | 'fields' | 'template' | 'task-templates' | 'reviews' | 'verifolio' | 'integrations' | 'navigation' | 'trash';

const validTabs: SettingsTab[] = ['profile', 'company', 'email', 'fields', 'template', 'task-templates', 'reviews', 'verifolio', 'integrations', 'navigation', 'trash'];

// Wrapper component to handle useSearchParams inside Suspense
function SettingsPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Lire le paramètre section de l'URL
  useEffect(() => {
    const section = searchParams.get('section');
    console.log('[SettingsPage] section param:', section, 'activeTab:', activeTab);
    if (section && validTabs.includes(section as SettingsTab)) {
      setActiveTab(section as SettingsTab);
    }
  }, [searchParams]);

  console.log('[SettingsPage] Rendering with activeTab:', activeTab);

  return (
    <div className="h-full overflow-auto p-6">
      <div className={activeTab === 'template' ? 'max-w-full' : 'max-w-4xl mx-auto'}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 mt-1">Configurez votre entreprise et vos documents</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mon profil
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Entreprise
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'email'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Emails
            </button>
            <button
              onClick={() => setActiveTab('fields')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fields'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Champs personnalisés
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'template'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Modèle de document
            </button>
            <button
              onClick={() => setActiveTab('task-templates')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'task-templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates tâches
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab('verifolio')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'verifolio'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Mon Verifolio
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'integrations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Intégrations
            </button>
            <button
              onClick={() => setActiveTab('navigation')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'navigation'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Navigation
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'trash'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Corbeille
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'email' && <EmailSettings />}
        {activeTab === 'fields' && <CustomFieldsSettings />}
        {activeTab === 'template' && <TemplateSettings />}
        {activeTab === 'task-templates' && <TaskTemplatesSettings />}
        {activeTab === 'reviews' && <ReviewTemplatesSettings />}
        {activeTab === 'verifolio' && <VerifolioSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'navigation' && <NavigationSettings />}
        {activeTab === 'trash' && <TrashSettings />}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function SettingsLoading() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPageContent />
    </Suspense>
  );
}
