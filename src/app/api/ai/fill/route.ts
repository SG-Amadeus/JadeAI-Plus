import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, extractAIConfig, getJsonProviderOptions, AIConfigError } from '@/lib/ai/provider';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';
import { getResumeForAI } from '@/lib/ai/get-resume';
import { extractJson } from '@/lib/ai/extract-json';
import { z } from 'zod/v4';

const fillSchema = z.object({
  sections: z.array(z.object({
    type: z.string(),
    title: z.string(),
    content: z.unknown(),
  })),
});

export async function POST(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeId, data, jobDescription, language } = await request.json();
    if (!resumeId) return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });

    const resume = await getResumeForAI(resumeId);
    if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    if (resume.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);
    const lang = language || resume.language || 'zh';
    const langName = lang === 'zh' ? 'Simplified Chinese' : 'English';

    // Mode 1: Structured data → deterministic fill
    if (data) {
      await applyStructuredData(resumeId, resume, data);
    }

    // Mode 2: JD → AI generate
    if (jobDescription) {
      const existingSections = resume.sections.filter((s: any) => !s.inherited);
      const result = await generateText({
        model,
        maxOutputTokens: 8192,
        system: `You are a professional resume writer. Generate resume content in ${langName} based on the job description.

Rules:
- Write in ${langName} using professional, industry-standard terminology
- Use strong action verbs, quantify achievements where possible
- Fill ALL section types present in the existing resume structure
- For personal_info: only the jobTitle field is accessible; fill it appropriately
- Preserve exact JSON structure and field names
- CRITICAL: Return a single valid JSON object with key "sections" containing an array of {type, title, content}. No markdown, no code fences.`,
        prompt: `## Existing Resume Structure\n${JSON.stringify(existingSections)}\n\n## Job Description\n${jobDescription}\n\nGenerate section content tailored to this job. Return JSON with key "sections".`,
        providerOptions: getJsonProviderOptions(aiConfig),
      });
      const aiResult = extractJson(result.text, fillSchema);
      await applyAISections(resumeId, aiResult.sections);
    }

    const updated = await resumeRepository.findById(resumeId);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('POST /api/ai/fill error:', error);
    return NextResponse.json({ error: 'Failed to fill resume' }, { status: 500 });
  }
}

async function applyStructuredData(resumeId: string, resume: any, data: any): Promise<void> {
  // Map structured data keys to section types
  const typeByKey: Record<string, string> = {
    personalInfo: 'personal_info', summary: 'summary',
    workExperience: 'work_experience', education: 'education',
    skills: 'skills', projects: 'projects',
    certifications: 'certifications', languages: 'languages',
    github: 'github', custom: 'custom',
  };

  for (const [key, sectionType] of Object.entries(typeByKey)) {
    const value = data[key];
    if (!value) continue;

    const existing = resume.sections.find((s: any) => s.type === sectionType);
    if (sectionType === 'skills') {
      const content = normalizeSectionContent(sectionType, {
        categories: Array.isArray(value) ? [{ id: crypto.randomUUID(), name: 'Skills', skills: value }] : value,
      });
      if (existing) {
        await resumeRepository.updateSection(existing.id, { content });
      } else {
        await resumeRepository.createSection({ resumeId, type: sectionType, title: sectionType, sortOrder: resume.sections.length, content });
      }
    } else if (['work_experience', 'education', 'projects', 'certifications', 'languages', 'github', 'custom'].includes(sectionType)) {
      const items = Array.isArray(value) ? value : (value.items || [value]);
      const content = normalizeSectionContent(sectionType, { items: items.map((it: any) => ({ ...it, id: it.id || crypto.randomUUID() })) });
      if (existing) {
        await resumeRepository.updateSection(existing.id, { content });
      } else {
        await resumeRepository.createSection({ resumeId, type: sectionType, title: sectionType, sortOrder: resume.sections.length, content });
      }
    } else if (sectionType === 'personal_info') {
      // Profile-bound resumes: personal_info is resolved from profile at export time, never written by AI
      if ((resume as any).profileCodename) continue;
      const content = normalizeSectionContent(sectionType, typeof value === 'object' ? value : { fullName: String(value) });
      if (existing) {
        await resumeRepository.updateSection(existing.id, { content });
      }
    } else if (sectionType === 'summary') {
      const content = normalizeSectionContent(sectionType, { text: typeof value === 'string' ? value : (value.text || '') });
      if (existing) {
        await resumeRepository.updateSection(existing.id, { content });
      }
    }
  }
}

async function applyAISections(resumeId: string, sections: { type: string; title: string; content: unknown }[]): Promise<void> {
  const resume = await getResumeForAI(resumeId);
  if (!resume) return;

  for (const sec of sections) {
    // Profile-bound: personal_info is resolved from profile, never written by AI
    if (sec.type === 'personal_info' && (resume as any).profileCodename) continue;
    const existing = resume.sections.find((s: any) => s.type === sec.type);
    const content = normalizeSectionContent(sec.type, sec.content);
    if (existing) {
      await resumeRepository.updateSection(existing.id, { title: sec.title, content });
    } else {
      const maxOrder = resume.sections.reduce((max: number, s: any) => Math.max(max, s.sortOrder), -1);
      await resumeRepository.createSection({ resumeId, type: sec.type, title: sec.title, sortOrder: maxOrder + 1, content });
    }
  }
}
