import Link from 'next/link';
import { ReviewRequestForm } from '@/components/forms/ReviewRequestForm';

export default function NewReviewRequestPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href="/reviews" className="text-sm text-gray-500 hover:text-gray-700">
            ← Retour aux avis
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Nouvelle demande d'avis</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demandez un avis ou témoignage à un client après une mission réussie
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ReviewRequestForm />
        </div>
      </div>
    </div>
  );
}
