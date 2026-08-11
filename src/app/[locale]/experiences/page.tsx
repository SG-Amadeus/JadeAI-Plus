'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { useExperiences } from '@/hooks/use-experiences';
import { ExperienceList, DEFAULT_WORK_DATA, DEFAULT_INTERNSHIP_DATA, DEFAULT_PROJECT_DATA } from '@/components/experiences/experience-list';

const SUB_NAV = [
  { href: '/dashboard', label: 'dashboard.nav' },
  { href: '/profiles', label: 'profiles.nav' },
  { href: '/experiences', label: 'experiences.nav' },
  { href: '/templates', label: 'templates.nav' },
  { href: '/interview', label: 'interview.nav' },
];

export default function ExperiencesPage() {
  const t = useTranslations('experiences');
  const gt = useTranslations();
  const pathname = usePathname();
  const { isLoading: fpLoading } = useFingerprint();
  const {
    experiences,
    isLoading,
    saveStates,
    fetchExperiences,
    createExperience,
    updateExperience,
    flushNow,
    removeExperience,
  } = useExperiences();

  useEffect(() => {
    if (!fpLoading) fetchExperiences();
  }, [fetchExperiences, fpLoading]);

  const handleAdd = useCallback(async (type: 'work' | 'project' | 'internship') => {
    const data = type === 'project' ? { ...DEFAULT_PROJECT_DATA } : { ...DEFAULT_WORK_DATA };
    await createExperience(type, data);
  }, [createExperience]);

  return (
    <div>
      {/* Sub-navigation */}
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        {SUB_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            {gt(item.label)}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-foreground">{t('title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">{t('subtitle')}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover" suppressHydrationWarning>
              <Library className="h-4 w-4" />
              {t('add')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <button
              type="button"
              className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => handleAdd('work')}
            >
              {t('addWork')}
            </button>
            <button
              type="button"
              className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => handleAdd('internship')}
            >
              {t('addInternship')}
            </button>
            <button
              type="button"
              className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => handleAdd('project')}
            >
              {t('addProject')}
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Content */}
      {(isLoading || fpLoading) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ExperienceList
          experiences={experiences}
          saveStates={saveStates}
          onUpdate={(id, data) => updateExperience(id, { data })}
          onBlur={(id) => flushNow(id)}
          onDelete={(id) => removeExperience(id)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
