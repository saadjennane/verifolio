'use client';

interface TaskProgressBarProps {
  total: number;
  completed: number;
  className?: string;
}

/**
 * Barre de progression des tâches
 * Couleur selon progression: rouge < 25%, jaune < 75%, vert >= 75%
 */
export function TaskProgressBar({ total, completed, className = '' }: TaskProgressBarProps) {
  if (total === 0) {
    return null;
  }

  const percent = Math.round((completed / total) * 100);

  // Couleur selon progression
  const getColorClass = () => {
    if (percent < 25) return 'bg-red-500';
    if (percent < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          {completed}/{total} terminée{completed !== 1 ? 's' : ''}
        </span>
        <span className={`font-medium ${
          percent < 25 ? 'text-red-600' :
          percent < 75 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass()} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
