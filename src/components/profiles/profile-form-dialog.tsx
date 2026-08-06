'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProfileForm } from './profile-form';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { codename: string; data: Record<string, unknown> }) => Promise<any>;
  initial?: { codename: string; data: Record<string, unknown> };
}

export function ProfileFormDialog({ open, onClose, onSave, initial }: Props) {
  const t = useTranslations('profiles');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) setError('');
  }, [open]);

  const handleSubmit = async (data: { codename: string; data: Record<string, unknown> }) => {
    setIsSaving(true);
    setError('');
    try {
      const result = await onSave(data);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editTitle') : t('createTitle')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <ProfileForm initial={initial} onSubmit={handleSubmit} isLoading={isSaving} />
      </DialogContent>
    </Dialog>
  );
}
