'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkExperienceForm, ProjectExperienceForm } from './experience-form';
import type { SaveState } from '@/hooks/use-experiences';

interface ExperienceCardProps {
  id: string;
  type: 'work' | 'project' | 'internship';
  data: Record<string, unknown>;
  saveState: SaveState;
  onUpdate: (data: Record<string, unknown>) => void;
  onBlur: () => void;
  onDelete: () => void;
}

export function ExperienceCard({ id: _id, type, data, saveState, onUpdate, onBlur, onDelete }: ExperienceCardProps) {
  const t = useTranslations('experiences');
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const title = type === 'work' || type === 'internship'
    ? [(data.company as string), (data.position as string)].filter(Boolean).join(' · ') || t('badgeWork')
    : (data.name as string) || t('badgeProject');

  const dateRange = [data.startDate as string, data.endDate as string].filter(Boolean).join(' — ') || null;
  const techs = (data.technologies as string[]) || [];

  const handleChange = useCallback((partial: Record<string, unknown>) => {
    onUpdate(partial);
  }, [onUpdate]);

  const handleDeleteClick = () => {
    if (deleteConfirm) {
      onDelete();
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  const saveLabel = (() => {
    switch (saveState) {
      case 'saving': return t('saving');
      case 'saved': return t('saved');
      case 'error': return t('saveFailed');
      default: return null;
    }
  })();

  return (
    <div className={`rounded-xl border bg-white transition-shadow dark:bg-zinc-900 ${
      expanded
        ? 'border-zinc-300 shadow-sm dark:border-zinc-600'
        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
    }`}>
      {/* Header — click to toggle */}
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
      >
        <Badge variant={type === 'work' ? 'default' : type === 'internship' ? 'outline' : 'secondary'} className={`shrink-0 text-xs ${type === 'internship' ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400' : ''}`}>
          {type === 'work' ? t('badgeWork') : type === 'internship' ? t('badgeInternship') : t('badgeProject')}
        </Badge>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {title}
          </div>
          {dateRange && (
            <div className="text-xs text-zinc-400">{dateRange}</div>
          )}
        </div>

        {techs.length > 0 && !expanded && (
          <div className="hidden gap-1 sm:flex">
            {techs.slice(0, 4).map((t, i) => (
              <span key={i} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                {t}
              </span>
            ))}
            {techs.length > 4 && (
              <span className="text-xs text-zinc-400">+{techs.length - 4}</span>
            )}
          </div>
        )}

        {saveLabel && (
          <span className={`shrink-0 text-xs ${
            saveState === 'error' ? 'text-red-500' : 'text-zinc-400'
          }`}>
            {saveLabel}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={`h-7 shrink-0 cursor-pointer px-2 text-xs ${
            deleteConfirm
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400'
              : 'text-zinc-400 hover:text-red-500'
          }`}
          onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          {deleteConfirm ? t('deleteConfirm') : ''}
        </Button>

        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          {type === 'work' || type === 'internship' ? (
            <WorkExperienceForm value={data as any} onChange={handleChange} onBlur={onBlur} />
          ) : (
            <ProjectExperienceForm value={data as any} onChange={handleChange} onBlur={onBlur} />
          )}
        </div>
      )}
    </div>
  );
}
