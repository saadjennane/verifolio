// Badges prédéfinis
export const PREDEFINED_BADGES = [
  { id: 'en_retard', label: 'EN RETARD', variant: 'red' as const, isAutomatic: true },
  { id: 'urgent', label: 'URGENT', variant: 'red' as const, isAutomatic: false },
  { id: 'important', label: 'IMPORTANT', variant: 'yellow' as const, isAutomatic: false },
  { id: 'attente_client', label: 'EN ATTENTE CLIENT', variant: 'blue' as const, isAutomatic: false },
  { id: 'relance', label: 'À RELANCER', variant: 'yellow' as const, isAutomatic: false },
  { id: 'bloque', label: 'BLOQUÉ', variant: 'red' as const, isAutomatic: false },
  { id: 'opportunite', label: 'OPPORTUNITÉ', variant: 'green' as const, isAutomatic: false },
] as const;

// Palette de couleurs pour les tags
export const TAG_COLORS = [
  { id: 'gray', label: 'Gris', hex: '#6B7280', className: 'bg-gray-200 text-gray-800' },
  { id: 'red', label: 'Rouge', hex: '#EF4444', className: 'bg-red-200 text-red-800' },
  { id: 'orange', label: 'Orange', hex: '#F97316', className: 'bg-orange-200 text-orange-800' },
  { id: 'yellow', label: 'Jaune', hex: '#F59E0B', className: 'bg-yellow-200 text-yellow-800' },
  { id: 'green', label: 'Vert', hex: '#10B981', className: 'bg-green-200 text-green-800' },
  { id: 'blue', label: 'Bleu', hex: '#3B82F6', className: 'bg-blue-200 text-blue-800' },
  { id: 'indigo', label: 'Indigo', hex: '#6366F1', className: 'bg-indigo-200 text-indigo-800' },
  { id: 'purple', label: 'Violet', hex: '#8B5CF6', className: 'bg-purple-200 text-purple-800' },
  { id: 'pink', label: 'Rose', hex: '#EC4899', className: 'bg-pink-200 text-pink-800' },
] as const;

export type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red';
export type TagColor = typeof TAG_COLORS[number]['id'];

export function getTagColorClass(colorId: string): string {
  const color = TAG_COLORS.find(c => c.id === colorId);
  return color?.className || TAG_COLORS[0].className;
}

export function getBadgeVariant(badgeId: string): BadgeVariant {
  const badge = PREDEFINED_BADGES.find(b => b.id === badgeId);
  return badge?.variant || 'gray';
}
