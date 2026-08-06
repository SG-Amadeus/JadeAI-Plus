'use client';

import { useTranslations } from 'next-intl';
import { Plus, Briefcase, FolderGit2, GraduationCap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExperienceCard } from './experience-card';
import type { ExperienceEntry, SaveState } from '@/hooks/use-experiences';

interface ExperienceListProps {
  experiences: ExperienceEntry[];
  saveStates: Record<string, SaveState>;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onBlur: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (type: 'work' | 'project' | 'internship') => void;
}

const DEFAULT_WORK_DATA = {
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  technologies: [],
  highlights: [],
  notes: '',
};

const DEFAULT_INTERNSHIP_DATA = {
  company: '',
  position: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  technologies: [],
  highlights: [],
  notes: '',
};

const DEFAULT_PROJECT_DATA = {
  name: '',
  url: '',
  startDate: '',
  endDate: '',
  description: '',
  technologies: [],
  highlights: [],
  notes: '',
};

export function ExperienceList({
  experiences,
  saveStates,
  onUpdate,
  onBlur,
  onDelete,
  onAdd,
}: ExperienceListProps) {
  const t = useTranslations('experiences');

  const workExperiences = experiences.filter((e) => e.type === 'work');
  const internshipExperiences = experiences.filter((e) => e.type === 'internship');
  const projectExperiences = experiences.filter((e) => e.type === 'project');

  const renderTab = (items: ExperienceEntry[], type: 'work' | 'project' | 'internship', emptyTitle: string, emptyHint: string, addLabel: string) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 py-12 dark:border-zinc-700">
          <div className="mb-3 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
            {type === 'internship' ? (
              <GraduationCap className="h-6 w-6 text-zinc-400" />
            ) : type === 'work' ? (
              <Briefcase className="h-6 w-6 text-zinc-400" />
            ) : (
              <FolderGit2 className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <p className="text-sm font-medium text-zinc-500">{emptyTitle}</p>
          <p className="mt-1 text-xs text-zinc-400">{emptyHint}</p>
        </div>
      ) : (
        items.map((exp) => (
          <ExperienceCard
            key={exp.id}
            id={exp.id}
            type={exp.type}
            data={exp.data as Record<string, unknown>}
            saveState={saveStates[exp.id] || 'idle'}
            onUpdate={(data) => onUpdate(exp.id, data)}
            onBlur={() => onBlur(exp.id)}
            onDelete={() => onDelete(exp.id)}
          />
        ))
      )}
      <Button
        variant="outline"
        className="w-full cursor-pointer gap-2 border-dashed py-3 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
        onClick={() => onAdd(type)}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );

  return (
    <Tabs defaultValue="work">
      <TabsList className="mb-6">
        <TabsTrigger value="work" className="cursor-pointer">
          {t('tabWork')} ({workExperiences.length})
        </TabsTrigger>
        <TabsTrigger value="internship" className="cursor-pointer">
          {t('tabInternship')} ({internshipExperiences.length})
        </TabsTrigger>
        <TabsTrigger value="project" className="cursor-pointer">
          {t('tabProjects')} ({projectExperiences.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="work">
        {renderTab(workExperiences, 'work', t('emptyWork'), t('emptyWorkHint'), t('addWork'))}
      </TabsContent>

      <TabsContent value="internship">
        {renderTab(internshipExperiences, 'internship', t('emptyInternship'), t('emptyInternshipHint'), t('addInternship'))}
      </TabsContent>

      <TabsContent value="project">
        {renderTab(projectExperiences, 'project', t('emptyProjects'), t('emptyProjectsHint'), t('addProject'))}
      </TabsContent>
    </Tabs>
  );
}

export { DEFAULT_WORK_DATA, DEFAULT_INTERNSHIP_DATA, DEFAULT_PROJECT_DATA };
