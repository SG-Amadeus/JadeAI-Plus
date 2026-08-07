/**
 * SINGLE ENTRY POINT for AI code to read resume data.
 *
 * Every AI route and tool MUST use this function instead of calling
 * resumeRepository.findById() directly. It automatically strips PII from
 * all personal_info sections before the data ever reaches AI-controlled
 * memory — no per-route sanitize call needed.
 *
 * Enforced at test time by security-boundary.test.ts.
 */
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { sanitizeSectionsForAI } from '@/lib/resume/sanitize';
import type { Resume } from '@/types/resume';

export async function getResumeForAI(resumeId: string): Promise<Resume | null> {
  const resume = await resumeRepository.findById(resumeId);
  if (!resume) return null;

  return {
    ...resume,
    sections: sanitizeSectionsForAI(resume.sections),
  };
}
