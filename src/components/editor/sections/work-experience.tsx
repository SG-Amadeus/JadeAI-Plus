'use client';

import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EditableText } from '../fields/editable-text';
import { EditableDate } from '../fields/editable-date';
import { EditableRichText } from '../fields/editable-rich-text';
import { EditableList } from '../fields/editable-list';
import { FieldWrapper } from '../fields/field-wrapper';
import { generateId } from '@/lib/utils';
import type { ResumeSection, WorkExperienceContent, WorkExperienceItem, WorkProject } from '@/types/resume';

interface Props {
  section: ResumeSection;
  onUpdate: (content: Partial<WorkExperienceContent>) => void;
}

export function WorkExperienceSection({ section, onUpdate }: Props) {
  const t = useTranslations('editor.fields');
  const content = section.content as WorkExperienceContent;
  const items = Array.isArray(content.items) ? content.items : [];

  const addItem = () => {
    const newItem: WorkExperienceItem = {
      id: generateId(),
      company: '',
      position: '',
      department: '',
      location: '',
      startDate: '',
      endDate: null,
      current: false,
      description: '',
      technologies: [],
      highlights: [],
      projects: [],
    };
    onUpdate({ items: [...items, newItem] } as any);
  };

  const updateItem = (index: number, data: Partial<WorkExperienceItem>) => {
    const updated = items.map((item, i) => (i === index ? { ...item, ...data } : item));
    onUpdate({ items: updated } as any);
  };

  const removeItem = (index: number) => {
    onUpdate({ items: items.filter((_, i) => i !== index) } as any);
  };

  const addProject = (itemIndex: number) => {
    const item = items[itemIndex];
    const projects = [...(item.projects || []), { id: generateId(), name: '', highlights: [] } as WorkProject];
    updateItem(itemIndex, { projects });
  };

  const updateProject = (itemIndex: number, projectIndex: number, data: Partial<WorkProject>) => {
    const item = items[itemIndex];
    const projects = (item.projects || []).map((p, i) => (i === projectIndex ? { ...p, ...data } : p));
    updateItem(itemIndex, { projects });
  };

  const removeProject = (itemIndex: number, projectIndex: number) => {
    const item = items[itemIndex];
    const projects = (item.projects || []).filter((_, i) => i !== projectIndex);
    updateItem(itemIndex, { projects });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id || `we-${index}`}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">#{index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer p-1 text-zinc-400 hover:text-red-500"
                onClick={() => removeItem(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <FieldWrapper>
              <EditableText label={t('company')} value={item.company} onChange={(v) => updateItem(index, { company: v })} />
              <EditableText label={t('position')} value={item.position} onChange={(v) => updateItem(index, { position: v })} />
            </FieldWrapper>
            <FieldWrapper>
              <EditableText label={t('department')} value={item.department || ''} onChange={(v) => updateItem(index, { department: v })} />
              <div />
            </FieldWrapper>
            <FieldWrapper>
              <EditableDate label={t('startDate')} value={item.startDate} onChange={(v) => updateItem(index, { startDate: v })} />
              <EditableDate label={t('endDate')} value={item.endDate || ''} onChange={(v) => updateItem(index, { endDate: v || null, current: !v })} />
            </FieldWrapper>
            <EditableRichText label={t('description')} value={item.description} onChange={(v) => updateItem(index, { description: v })} />
            <EditableList label={t('technologies')} items={item.technologies || []} onChange={(v) => updateItem(index, { technologies: v })} />
            <EditableList label={t('highlights')} items={item.highlights} onChange={(v) => updateItem(index, { highlights: v })} />

            {/* Nested projects */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">{t('projects') || 'Projects'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 cursor-pointer gap-1 text-xs text-zinc-400 hover:text-blue-500"
                  onClick={() => addProject(index)}
                >
                  <Plus className="h-3 w-3" />
                  {t('addProject') || 'Add Project'}
                </Button>
              </div>
              {(item.projects || []).map((project, pIndex) => (
                <div key={project.id || `proj-${pIndex}`} className="rounded-md border border-zinc-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Project #{pIndex + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 cursor-pointer p-1 text-zinc-400 hover:text-red-500"
                      onClick={() => removeProject(index, pIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <EditableText label={t('projectName') || 'Name'} value={project.name} onChange={(v) => updateProject(index, pIndex, { name: v })} />
                    <EditableList label={t('highlights')} items={project.highlights} onChange={(v) => updateProject(index, pIndex, { highlights: v })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full cursor-pointer gap-1">
        <Plus className="h-3.5 w-3.5" />
        {t('addItem')}
      </Button>
    </div>
  );
}
