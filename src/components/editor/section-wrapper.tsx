'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GripVertical, X, Eye, EyeOff, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useEditorStore } from '@/stores/editor-store';
import { useResumeStore } from '@/stores/resume-store';
import { useDragHandle } from './dnd/sortable-section';
import { buildPersonalInfoContent } from '@/lib/profile/prefill';
import type { ResumeSection, SectionContent } from '@/types/resume';
import { PersonalInfoSection } from './sections/personal-info';
import { SummarySection } from './sections/summary';
import { WorkExperienceSection } from './sections/work-experience';
import { EducationSection } from './sections/education';
import { SkillsSection } from './sections/skills';
import { ProjectsSection } from './sections/projects';
import { CertificationsSection } from './sections/certifications';
import { LanguagesSection } from './sections/languages';
import { CustomSection } from './sections/custom-section';
import { GitHubSection } from './sections/github';
import { QrCodesSection } from './sections/qr-codes';

interface SectionWrapperProps {
  section: ResumeSection;
  onUpdate: (content: Partial<SectionContent>) => void;
  onRemove: () => void;
}

const sectionComponents: Record<string, React.ComponentType<{ section: ResumeSection; onUpdate: (content: any) => void }>> = {
  personal_info: PersonalInfoSection,
  summary: SummarySection,
  work_experience: WorkExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  projects: ProjectsSection,
  certifications: CertificationsSection,
  languages: LanguagesSection,
  github: GitHubSection,
  qr_codes: QrCodesSection,
  custom: CustomSection,
};

export function SectionWrapper({ section, onUpdate, onRemove }: SectionWrapperProps) {
  const t = useTranslations('editor');
  const { selectedSectionId, selectSection, showAiChat, toggleAiChat } = useEditorStore();
  const { currentResume, toggleSectionVisibility, updateSectionTitle } = useResumeStore();
  const { attributes, listeners } = useDragHandle();
  const isSelected = selectedSectionId === section.id;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== section.title) {
      updateSectionTitle(section.id, trimmed);
    } else {
      setRenameValue(section.title);
    }
    setIsRenaming(false);
  };

  const SectionComponent = sectionComponents[section.type];
  const isRenamable = section.type !== 'personal_info';
  const isPersonalInfo = section.type === 'personal_info';
  const boundProfile = currentResume?.profileId && currentResume?.profileCodename ? currentResume.profileCodename : null;

  // Profile picker state
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);
  const [profileList, setProfileList] = useState<{ id: string; codename: string }[]>([]);

  useEffect(() => {
    if (!profilePickerOpen || !isPersonalInfo) return;
    const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
    fetch('/api/profile/codenames', {
      headers: {
        'Content-Type': 'application/json',
        ...(fingerprint ? { 'x-fingerprint': fingerprint } : {}),
      },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProfileList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [profilePickerOpen, isPersonalInfo]);

  const handleSelectProfile = async (codename: string | null) => {
    setProfilePickerOpen(false);

    if (!codename) {
      useResumeStore.setState((s) => ({
        currentResume: s.currentResume ? { ...s.currentResume, profileCodename: null, profileId: null } : null,
        isDirty: true,
      }));
      useResumeStore.getState()._scheduleSave();
      onUpdate({
        fullName: '', jobTitle: '', email: '', phone: '', location: '',
        age: '', gender: '', politicalStatus: '', ethnicity: '', hometown: '',
        maritalStatus: '', yearsOfExperience: '', educationLevel: '',
        wechat: '', website: '', linkedin: '', github: '', avatar: '',
      });
      return;
    }

    const entry = profileList.find((p) => p.codename === codename);
    if (!entry) return;

    const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
    try {
      const res = await fetch(`/api/profile/${entry.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-profile-ui': '1',
          ...(fingerprint ? { 'x-fingerprint': fingerprint } : {}),
        },
      });
      if (res.ok) {
        const profile = await res.json();
        const content = buildPersonalInfoContent(profile.data as Record<string, unknown>);
        onUpdate(content);

        useResumeStore.setState((s) => ({
          currentResume: s.currentResume ? { ...s.currentResume, profileCodename: codename, profileId: entry.id } : null,
          isDirty: true,
        }));
        useResumeStore.getState()._scheduleSave();
      }
    } catch (err) {
      console.error('Failed to apply profile:', err);
    }
  };

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-all duration-200 dark:bg-zinc-900 ${
        isSelected ? 'border-brand shadow-brand-muted/50 dark:shadow-brand/20' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      } ${!section.visible ? 'opacity-50' : ''}`}
      onClick={() => selectSection(section.id)}
    >
      <div className="flex flex-row items-center justify-between border-b border-zinc-100 px-3 py-2.5 md:px-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <GripVertical
            className="h-4 w-4 cursor-grab text-zinc-300 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(section.title); setIsRenaming(false); }
              }}
              className="h-6 w-32 rounded border border-brand bg-transparent px-1 text-sm font-semibold text-zinc-700 outline-none dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className={`text-sm font-semibold text-zinc-700 dark:text-zinc-200 ${isRenamable ? 'cursor-text rounded px-1 -mx-1 hover:bg-zinc-100 dark:hover:bg-zinc-700' : ''}`}
              onDoubleClick={isRenamable ? (e) => { e.stopPropagation(); setRenameValue(section.title); setIsRenaming(true); } : undefined}
            >
              {section.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isPersonalInfo && (
            <Popover open={profilePickerOpen} onOpenChange={setProfilePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 cursor-pointer gap-1 px-2 text-xs ${boundProfile ? 'text-brand' : 'text-zinc-400 hover:text-zinc-600'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <User className="h-3.5 w-3.5" />
                  {boundProfile ? (
                    <span className="font-mono">@{boundProfile}</span>
                  ) : (
                    <span>{t('selectProfile')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-48 p-0"
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500">{t('selectProfile')}</p>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {profileList.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-zinc-400">{t('noProfile')}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`w-full cursor-pointer px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${!boundProfile ? 'bg-brand-muted text-brand' : 'text-zinc-700 dark:text-zinc-300'}`}
                        onClick={() => handleSelectProfile(null)}
                      >
                        <span className="text-xs text-zinc-400">{t('noProfile')}</span>
                      </button>
                      <div className="my-0.5 border-t border-zinc-100 dark:border-zinc-800" />
                      {profileList.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`w-full cursor-pointer px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                            boundProfile === p.codename
                              ? 'bg-brand-muted font-medium text-brand'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                          onClick={() => handleSelectProfile(p.codename)}
                        >
                          <span className="font-mono text-xs">@{p.codename}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0 text-brand hover:text-brand disabled:cursor-not-allowed disabled:text-zinc-300 dark:disabled:text-zinc-600"
            title={isPersonalInfo ? t('aiDisabledForPII') : t('aiPolish')}
            disabled={isPersonalInfo}
            onClick={(e) => {
              e.stopPropagation();
              if (!showAiChat) toggleAiChat();
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionVisibility(section.id);
            }}
          >
            {section.visible ? (
              <Eye className="h-3.5 w-3.5 text-zinc-400" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0 text-zinc-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        {!section.content || typeof section.content !== 'object' ? (
          <p className="text-sm text-red-400">{t('invalidSectionContent')}</p>
        ) : SectionComponent ? (
          <SectionComponent section={section} onUpdate={onUpdate} />
        ) : (
          <p className="text-sm text-zinc-400">Unknown section type: {section.type}</p>
        )}
      </div>
    </div>
  );
}
