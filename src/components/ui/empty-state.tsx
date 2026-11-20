import React from 'react';
import { LucideIcon, FolderGit2 } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'No data yet',
  description = 'There are no records to display at this time.',
  icon: Icon = FolderGit2,
  badge,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>
      {badge && (
        <span className="mt-4 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
          {badge}
        </span>
      )}
      <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#1e293b] transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
