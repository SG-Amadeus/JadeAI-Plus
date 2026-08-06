'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Pencil, Trash2, FileText, LayoutTemplate, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function maskValue(val: unknown): string {
  const s = String(val ?? '');
  if (!s) return '';
  if (s.includes('@')) {
    const [name, domain] = s.split('@');
    return name.slice(0, 1) + '***' + '@' + domain;
  }
  if (/^\d{11}$/.test(s)) return s.slice(0, 3) + '****' + s.slice(-4);
  if (s.length > 3) return s.slice(0, 1) + '*'.repeat(Math.min(s.length - 1, 5));
  return s;
}

function parseProfileData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return data as Record<string, unknown>;
}

interface Profile {
  id: string;
  codename: string;
  data: Record<string, unknown>;
}

interface Props {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onDelete: (id: string) => void;
}

const QUICK_FIELDS = ['email', 'phone', 'jobTitle'] as const;

export function ProfileList({ profiles, onEdit, onDelete }: Props) {
  const t = useTranslations('profiles');
  const router = useRouter();
  const [creatingCodename, setCreatingCodename] = useState<string | null>(null);

  const handleCreateResume = async (profile: Profile) => {
    setCreatingCodename(profile.codename);
    try {
      const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (fingerprint) headers['x-fingerprint'] = fingerprint;

      const data = parseProfileData(profile.data);
      const fullName = (data.fullName as string) || '';
      const title = fullName ? `${fullName} 的简历` : `${profile.codename} 的简历`;

      const res = await fetch('/api/resume', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, profileCodename: profile.codename }),
      });
      if (res.ok) {
        const resume = await res.json();
        router.push(`/editor/${resume.id}`);
      }
    } catch (err) {
      console.error('Failed to create resume from profile:', err);
    } finally {
      setCreatingCodename(null);
    }
  };

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 py-20 dark:border-zinc-700">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted">
          <Shield className="h-8 w-8 text-brand" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{t('emptyTitle')}</h3>
        <p className="mt-2 max-w-md text-center text-sm text-zinc-500">{t('emptyHint')}</p>
        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => router.push('/templates')}
            variant="outline"
            className="cursor-pointer gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            {t('browseTemplates')}
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover"
          >
            <FileText className="h-4 w-4" />
            {t('goToDashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horizontal scroll for many profiles */}
      <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory scrollbar-thin">
        {profiles.map((profile) => {
          const data = parseProfileData(profile.data);
          const fullName = (data.fullName as string) || '';
          const avatar = data.avatar as string | undefined;

          return (
            <div
              key={profile.id}
              className="group relative flex w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-zinc-700 dark:bg-zinc-900 sm:w-[340px]"
            >
              {/* Top accent bar */}
              <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-brand to-brand-hover" />

              <div className="flex flex-1 flex-col p-6">
                {/* Avatar + Codename */}
                <div className="flex items-start gap-4">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={profile.codename}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-brand-muted"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-muted text-2xl font-bold text-brand">
                      {profile.codename.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      @{profile.codename}
                    </h3>
                    {fullName && (
                      <p className="mt-0.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {fullName}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {QUICK_FIELDS.map((key) => {
                        const val = data[key] as string | undefined;
                        if (!val) return null;
                        return (
                          <span
                            key={key}
                            className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {key === 'jobTitle' ? val : maskValue(val)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-zinc-100 dark:border-zinc-800" />

                {/* Action buttons */}
                <div className="mt-auto space-y-2">
                  <Button
                    onClick={() => handleCreateResume(profile)}
                    disabled={creatingCodename === profile.codename}
                    className="w-full cursor-pointer gap-2 bg-brand hover:bg-brand-hover"
                  >
                    {creatingCodename === profile.codename ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {t('createResumeWith')}
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/templates')}
                      className="flex-1 cursor-pointer gap-1.5 text-xs"
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      {t('browseTemplates')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 p-0"
                      onClick={() => onEdit(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 shrink-0 p-0 text-red-500 hover:text-red-600"
                      onClick={() => onDelete(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions footer */}
      {profiles.length > 0 && (
        <div className="flex justify-center gap-3 pt-2">
          <Button
            onClick={() => router.push('/templates')}
            variant="outline"
            className="cursor-pointer gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            {t('browseTemplates')}
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover"
          >
            <FileText className="h-4 w-4" />
            {t('goToDashboard')}
          </Button>
        </div>
      )}
    </div>
  );
}
