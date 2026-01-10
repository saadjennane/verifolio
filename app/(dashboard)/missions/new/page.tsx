import Link from 'next/link';
import { MissionForm } from '@/components/forms/MissionForm';

export default function NewMissionPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/missions" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux missions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouvelle mission</h1>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <MissionForm />
        </div>
      </div>
    </div>
  );
}
