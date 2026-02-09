'use client';

import { X, Users, Handshake, FileText, Receipt, Briefcase, ClipboardList } from 'lucide-react';
import { useTabsStore } from '@/lib/stores/tabs-store';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  tabType: 'new-client' | 'new-deal' | 'new-invoice' | 'new-mission' | 'new-quote' | 'new-brief';
  tabTitle: string;
}

const createOptions: CreateOption[] = [
  {
    id: 'client',
    label: 'Client',
    description: 'Ajouter un nouveau client ou entreprise',
    icon: <Users className="w-6 h-6" />,
    path: '/clients/new',
    tabType: 'new-client',
    tabTitle: 'Nouveau client',
  },
  {
    id: 'deal',
    label: 'Deal',
    description: 'Creer une nouvelle opportunite commerciale',
    icon: <Handshake className="w-6 h-6" />,
    path: '/deals/new',
    tabType: 'new-deal',
    tabTitle: 'Nouveau deal',
  },
  {
    id: 'quote',
    label: 'Devis',
    description: 'Rediger un devis pour un client',
    icon: <FileText className="w-6 h-6" />,
    path: '/quotes/new',
    tabType: 'new-quote',
    tabTitle: 'Nouveau devis',
  },
  {
    id: 'invoice',
    label: 'Facture',
    description: 'Creer une nouvelle facture',
    icon: <Receipt className="w-6 h-6" />,
    path: '/invoices/new',
    tabType: 'new-invoice',
    tabTitle: 'Nouvelle facture',
  },
  {
    id: 'mission',
    label: 'Mission',
    description: 'Demarrer une nouvelle mission',
    icon: <Briefcase className="w-6 h-6" />,
    path: '/missions/new',
    tabType: 'new-mission',
    tabTitle: 'Nouvelle mission',
  },
  {
    id: 'brief',
    label: 'Brief',
    description: 'Creer un questionnaire client',
    icon: <ClipboardList className="w-6 h-6" />,
    path: '/briefs/new',
    tabType: 'new-brief',
    tabTitle: 'Nouveau brief',
  },
];

export function CreateModal({ isOpen, onClose }: CreateModalProps) {
  const { openTab } = useTabsStore();

  const handleSelect = (option: CreateOption) => {
    openTab(
      {
        type: option.tabType,
        path: option.path,
        title: option.tabTitle,
      },
      true
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Que voulez-vous creer ?
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          {createOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option)}
              className="flex flex-col items-start gap-2 p-4 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all group"
            >
              <div className="p-2 bg-white rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                {option.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 text-center">
            Ou utilisez le chat pour creer avec l'IA
          </p>
        </div>
      </div>
    </div>
  );
}
