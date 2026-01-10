import Link from 'next/link';
import { ClientForm } from '@/components/forms/ClientForm';

export default function NewClientPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/clients" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux clients
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouveau client</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ClientForm />
        </div>
      </div>
    </div>
  );
}
