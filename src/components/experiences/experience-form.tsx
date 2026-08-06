'use client';

import { useTranslations } from 'next-intl';
import { EditableText } from '@/components/editor/fields/editable-text';
import { EditableDate } from '@/components/editor/fields/editable-date';
import { EditableRichText } from '@/components/editor/fields/editable-rich-text';
import { EditableList } from '@/components/editor/fields/editable-list';
import { FieldWrapper } from '@/components/editor/fields/field-wrapper';
import type { LibraryWorkItem, LibraryProjectItem } from '@/types/experience';

interface WorkFormProps {
  value: LibraryWorkItem;
  onChange: (data: Partial<LibraryWorkItem>) => void;
  onBlur?: () => void;
}

export function WorkExperienceForm({ value, onChange, onBlur }: WorkFormProps) {
  const tf = useTranslations('editor.fields');
  const te = useTranslations('experiences');

  const handleDateChange = (field: 'startDate' | 'endDate', v: string) => {
    if (field === 'endDate') {
      onChange({ endDate: v || null, current: !v } as any);
    } else {
      onChange({ [field]: v } as any);
    }
  };

  return (
    <div className="space-y-3" onBlur={onBlur}>
      <FieldWrapper>
        <EditableText label={tf('company')} value={value.company || ''} onChange={(v) => onChange({ company: v })} />
        <EditableText label={tf('position')} value={value.position || ''} onChange={(v) => onChange({ position: v })} />
      </FieldWrapper>
      <FieldWrapper>
        <EditableDate label={tf('startDate')} value={value.startDate || ''} onChange={(v) => handleDateChange('startDate', v)} />
        <EditableDate label={tf('endDate')} value={value.endDate || ''} onChange={(v) => handleDateChange('endDate', v)} />
      </FieldWrapper>
      <EditableRichText label={tf('description')} value={value.description || ''} onChange={(v) => onChange({ description: v })} rows={4} />
      <EditableList label={tf('technologies')} items={value.technologies || []} onChange={(v) => onChange({ technologies: v })} />
      <EditableList label={tf('highlights')} items={value.highlights || []} onChange={(v) => onChange({ highlights: v })} />
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <EditableRichText label={te('notes')} value={value.notes || ''} onChange={(v) => onChange({ notes: v })} rows={3} placeholder={te('notesHint')} />
        <p className="mt-1 text-xs text-zinc-400">{te('notesHint')}</p>
      </div>
    </div>
  );
}

interface ProjectFormProps {
  value: LibraryProjectItem;
  onChange: (data: Partial<LibraryProjectItem>) => void;
  onBlur?: () => void;
}

export function ProjectExperienceForm({ value, onChange, onBlur }: ProjectFormProps) {
  const tf = useTranslations('editor.fields');
  const te = useTranslations('experiences');

  return (
    <div className="space-y-3" onBlur={onBlur}>
      <FieldWrapper>
        <EditableText label={tf('projectName')} value={value.name || ''} onChange={(v) => onChange({ name: v })} />
        <EditableText label={tf('website')} value={value.url || ''} onChange={(v) => onChange({ url: v })} />
      </FieldWrapper>
      <FieldWrapper>
        <EditableDate label={tf('startDate')} value={value.startDate || ''} onChange={(v) => onChange({ startDate: v })} />
        <EditableDate label={tf('endDate')} value={value.endDate || ''} onChange={(v) => onChange({ endDate: v })} />
      </FieldWrapper>
      <EditableRichText label={tf('description')} value={value.description || ''} onChange={(v) => onChange({ description: v })} rows={4} />
      <EditableList label={tf('technologies')} items={value.technologies || []} onChange={(v) => onChange({ technologies: v })} />
      <EditableList label={tf('highlights')} items={value.highlights || []} onChange={(v) => onChange({ highlights: v })} />
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <EditableRichText label={te('notes')} value={value.notes || ''} onChange={(v) => onChange({ notes: v })} rows={3} placeholder={te('notesHint')} />
        <p className="mt-1 text-xs text-zinc-400">{te('notesHint')}</p>
      </div>
    </div>
  );
}
