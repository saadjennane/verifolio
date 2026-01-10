'use client';

import Image from 'next/image';

interface VerifolioHeaderProps {
  photoUrl: string | null;
  displayName: string;
  title: string | null;
  bio: string | null;
  cta1Label: string | null;
  cta1Url: string | null;
  cta2Label: string | null;
  cta2Url: string | null;
}

export function VerifolioHeader({
  photoUrl,
  displayName,
  title,
  bio,
  cta1Label,
  cta1Url,
  cta2Label,
  cta2Url,
}: VerifolioHeaderProps) {
  const hasCta1 = cta1Label && cta1Url;
  const hasCta2 = cta2Label && cta2Url;

  return (
    <header className="text-center py-12 px-4">
      {/* Photo/Logo */}
      {photoUrl && (
        <div className="mb-6">
          <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden ring-4 ring-white shadow-lg">
            <Image
              src={photoUrl}
              alt={displayName}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Nom */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {displayName}
      </h1>

      {/* Titre */}
      {title && (
        <p className="text-lg text-gray-600 mb-3">
          {title}
        </p>
      )}

      {/* Bio */}
      {bio && (
        <p className="text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
          {bio}
        </p>
      )}

      {/* CTAs */}
      {(hasCta1 || hasCta2) && (
        <div className="flex flex-wrap justify-center gap-3">
          {hasCta1 && (
            <a
              href={cta1Url}
              target={cta1Url.startsWith('mailto:') ? undefined : '_blank'}
              rel={cta1Url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {cta1Label}
            </a>
          )}
          {hasCta2 && (
            <a
              href={cta2Url}
              target={cta2Url.startsWith('mailto:') ? undefined : '_blank'}
              rel={cta2Url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className="inline-flex items-center px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {cta2Label}
            </a>
          )}
        </div>
      )}
    </header>
  );
}
