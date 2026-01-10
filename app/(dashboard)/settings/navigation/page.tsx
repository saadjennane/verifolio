'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { NavigationTab } from '@/lib/navigation';

export default function NavigationSettingsPage() {
  const [tabs, setTabs] = useState<NavigationTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const res = await fetch('/api/navigation/preferences');
      if (!res.ok) throw new Error('Failed to load preferences');

      const data = await res.json();
      setTabs(data.tabs || []);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const tab_orders = tabs.map((tab, index) => ({
        tab_key: tab.tab_key,
        order: index,
      }));

      const res = await fetch('/api/navigation/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab_orders }),
      });

      if (!res.ok) throw new Error('Failed to save order');

      alert('Ordre sauvegardé ! Rechargez la page pour voir les changements.');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(tabKey: string, currentVisibility: boolean) {
    try {
      const res = await fetch('/api/navigation/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab_key: tabKey,
          is_visible: !currentVisibility,
        }),
      });

      if (!res.ok) throw new Error('Failed to toggle visibility');

      // Mettre à jour localement
      setTabs(
        tabs.map((tab) =>
          tab.tab_key === tabKey ? { ...tab, is_visible: !currentVisibility } : tab
        )
      );
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Erreur lors de la modification');
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newTabs = [...tabs];
    const draggedTab = newTabs[draggedIndex];

    // Retirer l'élément traîné
    newTabs.splice(draggedIndex, 1);

    // Insérer à la nouvelle position
    newTabs.splice(index, 0, draggedTab);

    setTabs(newTabs);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function moveUp(index: number) {
    if (index === 0) return;

    const newTabs = [...tabs];
    const temp = newTabs[index - 1];
    newTabs[index - 1] = newTabs[index];
    newTabs[index] = temp;

    setTabs(newTabs);
  }

  function moveDown(index: number) {
    if (index === tabs.length - 1) return;

    const newTabs = [...tabs];
    const temp = newTabs[index + 1];
    newTabs[index + 1] = newTabs[index];
    newTabs[index] = temp;

    setTabs(newTabs);
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Personnaliser la navigation</h1>
        <p className="text-sm text-gray-600">
          Réorganisez les onglets de la sidebar par glisser-déposer ou avec les flèches.
          Masquez les onglets que vous n'utilisez pas.
        </p>
      </div>

      <Card>
        <div className="p-6">
          <div className="space-y-2 mb-6">
            {tabs.map((tab, index) => (
              <div
                key={tab.tab_key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 bg-white border rounded-lg
                  transition-all cursor-move hover:border-blue-400
                  ${draggedIndex === index ? 'opacity-50 border-blue-500' : 'border-gray-200'}
                `}
              >
                {/* Drag handle */}
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>

                {/* Label */}
                <div className="flex-1 font-medium text-sm">{tab.label}</div>

                {/* Path */}
                <div className="text-xs text-gray-500 hidden sm:block">{tab.path}</div>

                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisibility(tab.tab_key, tab.is_visible)}
                  className={`px-2 py-1 text-xs rounded ${
                    tab.is_visible
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.is_visible ? 'Visible' : 'Masqué'}
                </button>

                {/* Move buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le haut"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === tabs.length - 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le bas"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {tabs.filter((t) => t.is_visible).length} onglets visibles sur {tabs.length}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadPreferences}>
                Réinitialiser
              </Button>
              <Button onClick={saveOrder} loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-sm text-blue-900 mb-2">💡 Astuce</h3>
        <p className="text-sm text-blue-700">
          Après avoir enregistré vos préférences, rechargez la page (F5) pour voir la nouvelle
          organisation de votre sidebar.
        </p>
      </div>
    </div>
  );
}
