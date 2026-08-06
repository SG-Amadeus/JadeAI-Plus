import type { PersonalInfoContent } from '@/types/resume';

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
