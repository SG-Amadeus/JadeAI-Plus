'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/use-profiles';
import { ProfileList } from '@/components/profiles/profile-list';
import { ProfileFormDialog } from '@/components/profiles/profile-form-dialog';
import { useRouter } from '@/i18n/routing';

type Profile = { id: string; codename: string; data: Record<string, unknown> };

export default function ProfilesPage() {
  const t = useTranslations('profiles');
  const ct = useTranslations('common');
  const router = useRouter();
  const { profiles, isLoading, fetchProfiles, createProfile, updateProfile, deleteProfile } = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleCreate = async (data: { codename: string; data: Record<string, unknown> }) => {
    return await createProfile(data);
  };

  const handleUpdate = async (data: { codename: string; data: Record<string, unknown> }) => {
    if (!editingProfile) return;
    const result = await updateProfile(editingProfile.id, data);
    if (result && !(result as any).error) setEditingProfile(null);
    return result;
  };

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
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-foreground sm:text-4xl">
                {t('title')}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-500 sm:text-base">
                {t('subtitle')}
              </p>

              {/* Security badge */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                <Shield className="h-3.5 w-3.5" />
                {t('securityBadge')}
              </div>
            </div>

            <Button
              onClick={() => { setEditingProfile(null); setDialogOpen(true); }}
              size="lg"
              className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover sm:self-end"
            >
              <Plus className="h-5 w-5" />
              {t('create')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-[300px] shrink-0 rounded-2xl sm:w-[340px]" />
            ))}
          </div>
        ) : (
          <ProfileList
            profiles={profiles}
            onEdit={(profile) => { setEditingProfile(profile); setDialogOpen(true); }}
            onDelete={(id) => {
              if (confirm(ct('delete') + '?')) deleteProfile(id);
            }}
          />
        )}
      </div>

      <ProfileFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingProfile(null); }}
        onSave={editingProfile ? handleUpdate : handleCreate}
        initial={editingProfile || undefined}
      />
    </div>
  );
}
