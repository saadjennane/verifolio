'use client';

import { ClientForm } from '@/components/forms/ClientForm';
import type { Client } from '@/lib/supabase/types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

export function ClientFormModal({ isOpen, onClose, onSuccess }: ClientFormModalProps) {
  if (!isOpen) return null;

  const handleSuccess = (client: Client) => {
    onSuccess(client);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Créer un nouveau client
        </h2>
        <ClientForm
          onSuccess={handleSuccess}
          onCancel={onClose}
          embedded
        />
      </div>
    </div>
  );
}
