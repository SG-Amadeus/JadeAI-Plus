import type { EducationContent, PersonalInfoContent } from '@/types/resume';
import type { ProfileEducationItem } from '@/types/profile';
import { generateId } from '@/lib/utils';

export function buildPersonalInfoContent(profileData: Record<string, unknown>): PersonalInfoContent {
  return {
    fullName: String(profileData.fullName ?? ''),
    jobTitle: String(profileData.jobTitle ?? ''),
    email: String(profileData.email ?? ''),
    phone: String(profileData.phone ?? ''),
    location: String(profileData.location ?? ''),
    age: profileData.age != null ? String(profileData.age) : undefined,
    gender: profileData.gender != null ? String(profileData.gender) : undefined,
    politicalStatus: profileData.politicalStatus != null ? String(profileData.politicalStatus) : undefined,
    ethnicity: profileData.ethnicity != null ? String(profileData.ethnicity) : undefined,
    hometown: profileData.hometown != null ? String(profileData.hometown) : undefined,
    maritalStatus: profileData.maritalStatus != null ? String(profileData.maritalStatus) : undefined,
    yearsOfExperience: profileData.yearsOfExperience != null ? String(profileData.yearsOfExperience) : undefined,
    educationLevel: profileData.educationLevel != null ? String(profileData.educationLevel) : undefined,
    wechat: profileData.wechat != null ? String(profileData.wechat) : undefined,
    website: profileData.website != null ? String(profileData.website) : undefined,
    linkedin: profileData.linkedin != null ? String(profileData.linkedin) : undefined,
    github: profileData.github != null ? String(profileData.github) : undefined,
    customLinks: Array.isArray(profileData.customLinks) ? profileData.customLinks : undefined,
    avatar: profileData.avatar != null ? String(profileData.avatar) : undefined,
  };
}

export function buildEducationContent(profileData: Record<string, unknown>): EducationContent {
  const raw = profileData.education;
  if (!Array.isArray(raw)) return { items: [] };

  const items = raw
    .filter((entry): entry is Record<string, unknown> => entry != null && typeof entry === 'object')
    .map((entry) => {
      const item: ProfileEducationItem = {
        id: generateId(),
        institution: String(entry.institution ?? ''),
        degree: String(entry.degree ?? ''),
        field: String(entry.field ?? ''),
        startDate: String(entry.startDate ?? ''),
        endDate: String(entry.endDate ?? ''),
      };
      if (entry.location) item.location = String(entry.location);
      if (entry.gpa != null) item.gpa = String(entry.gpa);
      if (entry.description) item.description = String(entry.description);
      return item;
    })
    .filter((item) => item.institution || item.degree || item.field);

  return {
    items: items.map(({ id, institution, degree, field, location, startDate, endDate, gpa, description }) => ({
      id,
      institution,
      degree,
      field,
      location,
      startDate,
      endDate,
      gpa,
      ...(description ? { description } : {}),
      highlights: [],
    })),
  };
}
