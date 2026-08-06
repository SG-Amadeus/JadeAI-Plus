'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from '@/i18n/routing';
import { useFingerprint } from '@/hooks/use-fingerprint';
import { useExperiences } from '@/hooks/use-experiences';
import { ExperienceList, DEFAULT_WORK_DATA, DEFAULT_INTERNSHIP_DATA, DEFAULT_PROJECT_DATA } from '@/components/experiences/experience-list';

export default function ExperiencesPage() {
  const t = useTranslations('experiences');
  const ct = useTranslations('common');
  const router = useRouter();
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
    <div className="min-h-[100dvh]">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-brand-muted/50 to-transparent pb-8 pt-12 dark:from-brand-muted/10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="cursor-pointer text-zinc-500 hover:text-zinc-700"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {ct('back')}
            </Button>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-foreground">
                {t('title')}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-500 sm:text-base">
                {t('subtitle')}
              </p>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="lg"
                  className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover sm:self-end"
                  suppressHydrationWarning
                >
                  <Library className="h-5 w-5" />
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
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
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
    </div>
  );
}
