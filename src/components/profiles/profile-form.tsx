'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProfileEducationItem } from '@/types/profile';
import { generateId } from '@/lib/utils';

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        // Fill white background before drawing (prevents black bars from EXIF rotation)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ProfileFormData {
  codename: string;
  data: Record<string, unknown>;
}

interface Props {
  initial?: { codename: string; data: Record<string, unknown> };
  onSubmit: (data: ProfileFormData) => void;
  isLoading?: boolean;
}

const FIELDS: { key: string; labelKey: string; type?: string }[] = [
  { key: 'fullName', labelKey: 'fullName' },
  { key: 'jobTitle', labelKey: 'jobTitle' },
  { key: 'email', labelKey: 'email' },
  { key: 'phone', labelKey: 'phone' },
  { key: 'wechat', labelKey: 'wechat' },
  { key: 'location', labelKey: 'location' },
  { key: 'website', labelKey: 'website' },
  { key: 'linkedin', labelKey: 'linkedin' },
  { key: 'github', labelKey: 'github' },
  { key: 'age', labelKey: 'age' },
  { key: 'gender', labelKey: 'gender' },
  { key: 'politicalStatus', labelKey: 'politicalStatus' },
  { key: 'ethnicity', labelKey: 'ethnicity' },
  { key: 'hometown', labelKey: 'hometown' },
  { key: 'maritalStatus', labelKey: 'maritalStatus' },
  { key: 'yearsOfExperience', labelKey: 'yearsOfExperience' },
  { key: 'educationLevel', labelKey: 'educationLevel' },
];

const SELECT_FIELDS: Record<string, string> = {
  gender: 'genderOptions',
  politicalStatus: 'politicalStatusOptions',
  ethnicity: 'ethnicityOptions',
  maritalStatus: 'maritalStatusOptions',
  educationLevel: 'educationLevelOptions',
};

export function ProfileForm({ initial, onSubmit, isLoading }: Props) {
  const t = useTranslations('profiles');
  const tf = useTranslations('editor.fields');
  const [codename, setCodename] = useState(initial?.codename || '');
  const [formData, setFormData] = useState<Record<string, unknown>>(initial?.data || {});
  const [avatar, setAvatar] = useState<string>(initial?.data?.avatar as string || '');
  const [education, setEducation] = useState<ProfileEducationItem[]>(
    Array.isArray(initial?.data?.education) ? initial.data.education as ProfileEducationItem[] : []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codename.trim()) return;
    const data = { ...formData };
    if (avatar) data.avatar = avatar;
    data.education = education;
    onSubmit({ codename: codename.trim().toLowerCase().replace(/\s+/g, '-'), data });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 600);
      setAvatar(dataUrl);
    } catch { /* ignore */ }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div>
        <Label htmlFor="profile-codename">{t('codename')} *</Label>
        <Input
          id="profile-codename"
          name="profile-codename"
          value={codename}
          onChange={(e) => setCodename(e.target.value)}
          placeholder="my-profile"
          required
          disabled={!!initial}
          autoComplete="off"
          className="font-mono"
        />
        <p className="mt-1 text-xs text-zinc-400">{t('codenameHint')}</p>
      </div>

      <div>
        <Label>{t('avatar')}</Label>
        <div className="mt-1 flex items-center gap-3">
          {avatar ? (
            <div className="relative">
              <img src={avatar} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
              <button
                type="button"
                className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                onClick={() => setAvatar('')}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, labelKey }) => {
          const selectOptionsKey = SELECT_FIELDS[key];
          if (selectOptionsKey) {
            const options = (tf(selectOptionsKey as any) as string).split(',').map((s: string) => s.trim());
            return (
              <div key={key}>
                <Label htmlFor={`pf-${key}`}>{t(labelKey)}</Label>
                <Select
                  value={(formData[key] as string) || ''}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, [key]: v }))}
                >
                  <SelectTrigger id={`pf-${key}`}>
                    <SelectValue placeholder={t(labelKey)} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt: string) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }
          return (
            <div key={key}>
              <Label htmlFor={`pf-${key}`}>{t(labelKey)}</Label>
              <Input
                id={`pf-${key}`}
                value={(formData[key] as string) || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">{t('educationHistory')}</Label>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-brand hover:text-brand-hover"
            onClick={() => setEducation((prev) => [...prev, { id: generateId(), institution: '', degree: '', field: '', startDate: '', endDate: '' }])}
          >
            <Plus className="h-3.5 w-3.5" />
            {tf('addItem')}
          </button>
        </div>
        {education.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-zinc-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">#{idx + 1}</span>
              <button
                type="button"
                className="text-zinc-400 hover:text-red-500"
                onClick={() => setEducation((prev) => prev.filter((e) => e.id !== item.id))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`edu-${item.id}-institution`}>{tf('institution')}</Label>
                <Input
                  id={`edu-${item.id}-institution`}
                  value={item.institution}
                  onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, institution: e.target.value } : ed))}
                />
              </div>
              <div>
                <Label htmlFor={`edu-${item.id}-degree`}>{tf('degree')}</Label>
                <Input
                  id={`edu-${item.id}-degree`}
                  value={item.degree}
                  onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, degree: e.target.value } : ed))}
                />
              </div>
              <div>
                <Label htmlFor={`edu-${item.id}-field`}>{tf('field')}</Label>
                <Input
                  id={`edu-${item.id}-field`}
                  value={item.field}
                  onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, field: e.target.value } : ed))}
                />
              </div>
              <div>
                <Label htmlFor={`edu-${item.id}-gpa`}>{tf('gpa')}</Label>
                <div className="flex gap-2">
                  <Input
                    id={`edu-${item.id}-gpa`}
                    value={item.gpa || ''}
                    className="w-20 shrink-0"
                    onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, gpa: e.target.value } : ed))}
                  />
                  <Input
                    id={`edu-${item.id}-desc`}
                    value={item.description || ''}
                    placeholder={t('educationDescriptionHint')}
                    onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, description: e.target.value } : ed))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`edu-${item.id}-start`}>{tf('startDate')}</Label>
                <Input
                  id={`edu-${item.id}-start`}
                  type="month"
                  value={item.startDate}
                  onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, startDate: e.target.value } : ed))}
                />
              </div>
              <div>
                <Label htmlFor={`edu-${item.id}-end`}>{tf('endDate')}</Label>
                <Input
                  id={`edu-${item.id}-end`}
                  type="month"
                  value={item.endDate}
                  onChange={(e) => setEducation((prev) => prev.map((ed) => ed.id === item.id ? { ...ed, endDate: e.target.value } : ed))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !codename.trim()} className="cursor-pointer bg-brand hover:bg-brand-hover">
          {isLoading ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}
