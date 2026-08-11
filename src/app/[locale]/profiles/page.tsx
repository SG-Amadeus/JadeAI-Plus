'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfiles } from '@/hooks/use-profiles';
import { ProfileList } from '@/components/profiles/profile-list';
import { ProfileFormDialog } from '@/components/profiles/profile-form-dialog';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const SUB_NAV = [
  { href: '/dashboard', label: 'dashboard.nav' },
  { href: '/profiles', label: 'profiles.nav' },
  { href: '/experiences', label: 'experiences.nav' },
  { href: '/templates', label: 'templates.nav' },
  { href: '/interview', label: 'interview.nav' },
];

type Profile = { id: string; codename: string; data: Record<string, unknown> };

export default function ProfilesPage() {
  const t = useTranslations('profiles');
  const ct = useTranslations('common');
  const gt = useTranslations();
  const pathname = usePathname();
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
        <Button
          onClick={() => { setEditingProfile(null); setDialogOpen(true); }}
          className="cursor-pointer gap-2 bg-brand hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Content */}
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

      <ProfileFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingProfile(null); }}
        onSave={editingProfile ? handleUpdate : handleCreate}
        initial={editingProfile || undefined}
      />
    </div>
  );
}
