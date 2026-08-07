import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, extractAIConfig, getJsonProviderOptions, AIConfigError } from '@/lib/ai/provider';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';
import { getResumeForAI } from '@/lib/ai/get-resume';
import { extractJson } from '@/lib/ai/extract-json';
import { z } from 'zod/v4';

const optimizeSchema = z.object({
  updatedSections: z.array(z.object({
    sectionId: z.string(),
    title: z.string(),
    content: z.unknown(),
  })),
  summary: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeId, jobDescription, sectionIds, language } = await request.json();
    if (!resumeId || !jobDescription) return NextResponse.json({ error: 'resumeId and jobDescription are required' }, { status: 400 });

    const resume = await getResumeForAI(resumeId);
    if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    if (resume.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);
    const lang = language || resume.language || 'zh';
    const langName = lang === 'zh' ? 'Simplified Chinese' : 'English';

    const targetSections = (sectionIds
      ? resume.sections.filter((s: any) => sectionIds.includes(s.id))
      : resume.sections).filter((s: any) => !s.inherited);
    const result = await generateText({
      model,
      maxOutputTokens: 8192,
      system: `You are an expert resume optimizer. Rewrite the provided resume sections to better match the job description.

Rules:
- Write in ${langName}
- Only modify content to better match the JD — preserve section structure and field names
- Strengthen keyword alignment with JD requirements
- Add quantifiable achievements where JD implies them
- Do NOT fabricate experience — adapt and emphasize existing content
- CRITICAL: Return a single valid JSON object with keys: "updatedSections" (array of {sectionId, title, content}) and "summary" (string explaining what was changed). No markdown, no code fences.`,
      prompt: `## Job Description\n${jobDescription}\n\n## Resume Sections to Optimize\n${JSON.stringify(targetSections)}\n\nOptimize these sections. Return JSON with "updatedSections" and "summary".`,
      providerOptions: getJsonProviderOptions(aiConfig),
    });

    const parsed = extractJson(result.text, optimizeSchema);

    // Apply changes
    const typeById = new Map(targetSections.map((s: any) => [s.id, s.type]));
    for (const updated of parsed.updatedSections) {
      const sectionType = typeById.get(updated.sectionId) as string | undefined;
      if (!sectionType) continue;
      const content = normalizeSectionContent(sectionType, updated.content);
      await resumeRepository.updateSection(updated.sectionId, { title: updated.title, content });
    }

    return NextResponse.json({
      updatedSections: parsed.updatedSections.map((s) => ({ ...s, type: typeById.get(s.sectionId) })),
      summary: parsed.summary,
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('POST /api/ai/optimize error:', error);
    return NextResponse.json({ error: 'Failed to optimize resume' }, { status: 500 });
  }
}
