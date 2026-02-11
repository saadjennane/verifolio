'use client';

import { useEffect, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
} from 'lucide-react';
import type { TipTapContent } from '@/lib/notes/types';

interface NoteEditorProps {
  content: TipTapContent;
  onChange: (content: TipTapContent) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function NoteEditor({
  content,
  onChange,
  placeholder = 'Commencez à écrire...',
  autoFocus = false,
  readOnly = false,
}: NoteEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
    ],
    content,
    editable: !readOnly,
    immediatelyRender: false,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as TipTapContent);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[200px] animate-pulse bg-gray-50 rounded-lg" />
    );
  }

  return (
    <div className="note-editor border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Gras"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italique"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Barré"
          >
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Titre 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Titre 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Titre 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Liste à puces"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Liste numérotée"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 mx-1" />

          {/* Other */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Citation"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Bloc de code"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>

          {/* Link */}
          <div className="relative">
            <ToolbarButton
              onClick={() => {
                if (editor.isActive('link')) {
                  removeLink();
                } else {
                  setShowLinkInput(!showLinkInput);
                }
              }}
              active={editor.isActive('link')}
              title={editor.isActive('link') ? 'Supprimer le lien' : 'Ajouter un lien'}
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            {showLinkInput && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLink();
                    }
                    if (e.key === 'Escape') {
                      setShowLinkInput(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={addLink}
                  className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Bubble Menu */}
      {editor && !readOnly && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-1 p-1 bg-gray-900 rounded-lg shadow-lg">
            <BubbleButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
            >
              <Bold className="w-4 h-4" />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
            >
              <Italic className="w-4 h-4" />
            </BubbleButton>
            <BubbleButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
            >
              <Strikethrough className="w-4 h-4" />
            </BubbleButton>
          </div>
        </BubbleMenu>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Styles */}
      <style jsx global>{`
        .note-editor .ProseMirror {
          min-height: 200px;
        }

        .note-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .note-editor .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          color: #6b7280;
        }

        .note-editor .ProseMirror pre {
          background: #f3f4f6;
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
        }

        .note-editor .ProseMirror code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }

        .note-editor .ProseMirror pre code {
          background: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded transition-colors
        ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Bubble Button
// ============================================================================

interface BubbleButtonProps {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}

function BubbleButton({ onClick, active, children }: BubbleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        p-1.5 rounded transition-colors
        ${active ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}
      `}
    >
      {children}
    </button>
  );
}
