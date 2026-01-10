'use client';

import type { ProposalComment } from '@/lib/types/proposals';
import { SectionComments } from './SectionComments';

interface SectionData {
  id: string;
  title: string;
  body: string;
  position: number;
}

interface ProposalSectionProps {
  section: SectionData;
  accentColor: string;
  token: string;
  comments: ProposalComment[];
  onCommentAdded: (comment: ProposalComment) => void;
}

/**
 * Render simple markdown-like formatting
 */
function renderBody(text: string): React.ReactNode {
  // Split by paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, idx) => {
    // Process inline formatting
    let content: React.ReactNode = para;

    // Bold: **text** or __text__
    const boldPattern = /\*\*(.+?)\*\*|__(.+?)__/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const str = para;
    const regex = new RegExp(boldPattern);

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`bold-${idx}-${match.index}`}>
          {match[1] || match[2]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (parts.length > 0) {
      if (lastIndex < str.length) {
        parts.push(str.slice(lastIndex));
      }
      content = parts;
    }

    // Handle line breaks within paragraph
    if (typeof content === 'string') {
      const lines = content.split('\n');
      if (lines.length > 1) {
        content = lines.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        ));
      }
    }

    return (
      <p key={idx} className="mb-4 last:mb-0">
        {content}
      </p>
    );
  });
}

export function ProposalSection({
  section,
  accentColor,
  token,
  comments,
  onCommentAdded,
}: ProposalSectionProps) {
  return (
    <div className="border-l-4 pl-6 py-4" style={{ borderColor: accentColor }}>
      <h2
        className="text-xl font-semibold mb-3"
        style={{ color: accentColor }}
      >
        {section.title}
      </h2>

      <div className="text-gray-700 leading-relaxed">
        {renderBody(section.body)}
      </div>

      {/* Comments */}
      <SectionComments
        sectionId={section.id}
        sectionTitle={section.title}
        comments={comments}
        token={token}
        accentColor={accentColor}
        onCommentAdded={onCommentAdded}
      />
    </div>
  );
}
