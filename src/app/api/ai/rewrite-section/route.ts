import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, extractAIConfig, getJsonProviderOptions, AIConfigError } from '@/lib/ai/provider';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { sanitizeSectionsForAI } from '@/lib/resume/sanitize';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';
import { extractJson } from '@/lib/ai/extract-json';
import { z } from 'zod/v4';

const rewriteSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  content: z.unknown(),
});

export async function POST(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeId, sectionId, prompt, field } = await request.json();
    if (!resumeId || !sectionId || !prompt) {
      return NextResponse.json({ error: 'resumeId, sectionId, and prompt are required' }, { status: 400 });
    }

    const resume = await resumeRepository.findById(resumeId);
    if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    if (resume.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const section = resume.sections.find((s: any) => s.id === sectionId);
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    if ((section as any).inherited) {
      return NextResponse.json({ error: 'Cannot rewrite inherited personal info. Edit the root resume instead.' }, { status: 403 });
    }

    const aiConfig = extractAIConfig(request);
    const model = getModel(aiConfig);

    const sanitized = sanitizeSectionsForAI([section])[0];
    const scopeHint = field
      ? `Only modify the "${field}" field within the section content.`
      : 'Modify the section content as needed.';

    const result = await generateText({
      model,
      maxOutputTokens: 4096,
      system: `You are a professional resume editor. Rewrite the given section based on the user's instruction.

${scopeHint}
- Preserve the exact JSON structure and all field names
- Keep IDs, URLs, dates unchanged
- Match the language of the original content
- CRITICAL: Return a single valid JSON object with keys: sectionId (string), title (string), content (object). No markdown, no code fences.`,
      prompt: `## Instruction\n${prompt}\n\n## Section to Rewrite\n${JSON.stringify(sanitized)}\n\nReturn JSON with keys: sectionId, title, content.`,
      providerOptions: getJsonProviderOptions(aiConfig),
    });

    const parsed = extractJson(result.text, rewriteSchema);
    const content = normalizeSectionContent(section.type, parsed.content);
    await resumeRepository.updateSection(sectionId, { title: parsed.title, content });

    return NextResponse.json({
      sectionId,
      type: section.type,
      title: parsed.title,
      content,
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('POST /api/ai/rewrite-section error:', error);
    return NextResponse.json({ error: 'Failed to rewrite section' }, { status: 500 });
  }
}
