/**
 * Profile-based personal_info resolution.
 *
 * When a resume is bound to a profile (profileCodename/profileId), personal_info
 * is NOT stored as a resume section. It is resolved from the profile at render
 * time — export and public share are the only resolution points.
 *
 * This module is NOT importable from src/lib/ai/** or src/app/api/ai/**
 * (enforced by security-boundary.test.ts). AI never sees profile data.
 */
import { profileRepository } from '@/lib/db/repositories/profile.repository';
import { buildPersonalInfoContent } from '@/lib/profile/prefill';
import type { PersonalInfoContent } from '@/types/resume';

export async function resolvePersonalInfoContent(resume: {
  userId: string;
  profileCodename?: string | null;
}): Promise<PersonalInfoContent | null> {
  if (!resume.profileCodename) return null;
  const profile = await profileRepository.findByCodename(resume.userId, resume.profileCodename);
  if (!profile) return null;
  return buildPersonalInfoContent(profile.data as Record<string, unknown>) as PersonalInfoContent;
}

export async function injectResolvedPersonalInfo<T extends { sections: any[]; language?: string; profileCodename?: string | null; userId: string }>(resume: T): Promise<T> {
  const content = await resolvePersonalInfoContent(resume);
  if (!content) return resume;
  const virtualSection = {
    id: 'profile:resolved',
    resumeId: (resume as any).id,
    type: 'personal_info',
    title: resume.language === 'en' ? 'Personal Info' : '个人信息',
    sortOrder: -1,
    visible: true,
    content,
    profileManaged: true,
  } as any;
  return { ...resume, sections: [virtualSection, ...resume.sections] };
}
