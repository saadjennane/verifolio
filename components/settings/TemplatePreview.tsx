'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { TemplateConfig } from '@/lib/types/settings';
import { renderDocumentHtml } from '@/lib/pdf/renderDocumentHtml';
import { buildClientRenderContext, type TemplateContextData } from '@/lib/render/clientRenderContext';

export interface ZoneClickInfo {
  zone: string;
  x: number;
  y: number;
}

interface TemplatePreviewProps {
  config: TemplateConfig;
  templateContext: TemplateContextData | null;
  onZoneClick: (info: ZoneClickInfo | null) => void;
  onSave: () => void;
  saving: boolean;
}

const ZOOM_LEVELS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0];
const DEFAULT_ZOOM_INDEX = 2; // 0.55

export function TemplatePreview({ config, templateContext, onZoneClick, onSave, saving }: TemplatePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState('297mm');
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const zoomPercent = Math.round(zoom * 100);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, []);

  // Auto-adjust iframe height to content
  const adjustIframeHeight = useCallback(() => {
    if (iframeRef.current?.contentDocument?.body) {
      const height = iframeRef.current.contentDocument.body.scrollHeight;
      setIframeHeight(`${height}px`);
    }
  }, []);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'zone-click') {
        onZoneClick({
          zone: e.data.zone,
          x: e.data.x,
          y: e.data.y,
        });
      }
      if (e.data?.type === 'zone-deselect') {
        onZoneClick(null);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onZoneClick]);

  // Build render context from template context data
  const renderContext = useMemo(() => {
    if (!templateContext) return null;
    try {
      return buildClientRenderContext(templateContext);
    } catch (err) {
      console.error('Error building render context:', err);
      setError('Erreur lors de la préparation du contexte');
      return null;
    }
  }, [templateContext]);

  // Generate HTML instantly when config or context changes (no debounce needed!)
  const htmlContent = useMemo(() => {
    if (!renderContext) return '';
    try {
      setError(null);
      return renderDocumentHtml(renderContext, config);
    } catch (err) {
      console.error('Error rendering HTML:', err);
      setError(err instanceof Error ? err.message : 'Erreur de rendu');
      return '';
    }
  }, [config, renderContext]);

  // Re-adjust iframe height when content changes
  useEffect(() => {
    // Small delay to let iframe update its content
    const timer = setTimeout(adjustIframeHeight, 50);
    return () => clearTimeout(timer);
  }, [htmlContent, adjustIframeHeight]);

  const loading = !templateContext;

  return (
    <div className="h-full flex flex-col bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      {/* Preview Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Aperçu du document</span>
        <div className="flex items-center gap-3">
          {/* Save button */}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom arrière"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded min-w-[48px] transition-colors"
              title="Réinitialiser le zoom"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Zoom avant"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Scaled A4 Preview */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative mx-auto origin-top" style={{ width: '210mm' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10" style={{ minHeight: '297mm' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10" style={{ minHeight: '297mm' }}>
              <div className="text-center p-4">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-gray-600">{error}</p>
              </div>
            </div>
          )}
          {htmlContent && !error && (
            <div
              className="bg-white shadow-lg transition-transform duration-150"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                width: '210mm',
                minHeight: '297mm',
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                className="w-full border-0"
                style={{ height: iframeHeight, minHeight: '297mm' }}
                title="Aperçu du template"
                sandbox="allow-same-origin allow-scripts"
                onLoad={adjustIframeHeight}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
