import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { generatePdf } from '@/lib/pdf/generate-pdf';
import { generateHtml } from './builders';
import { generatePlainText } from './plain-text';
import { generateDocxBuffer } from './docx';
import { EXPORT_SECTION_TYPES } from '@/lib/constants';
import { injectResolvedPersonalInfo } from '@/lib/resume/resolve-personal-info';
import { validateResumeBudget, type BudgetPreflightResult } from '@/lib/resume/budget-validate';

function budgetHeaders(b: BudgetPreflightResult): Record<string, string> {
  const fill = b.contentLinesAvailable > 0
    ? `${Math.round((b.contentLinesEstimated / b.contentLinesAvailable) * 100)}%`
    : '0%';
  const severities = [...new Set(b.warnings.map(w => w.severity))].join(',');
  return {
    'X-Budget-Ok': String(b.ok),
    'X-Budget-Fill': fill,
    'X-Budget-Lines': `${b.contentLinesEstimated}/${b.contentLinesAvailable}`,
    'X-Budget-Warnings': severities,
    'Access-Control-Expose-Headers': 'X-Budget-Ok, X-Budget-Fill, X-Budget-Lines, X-Budget-Warnings',
  };
}

// Chromium download + PDF render needs more time on Vercel serverless
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await resumeRepository.findById(id);
    if (!resume) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (resume.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Resolve personal_info from bound profile (if any) — injected as virtual section.
    // Falls back to existing section data for non-profile resumes.
    const resolved = await injectResolvedPersonalInfo(resume as any);
    resume.sections = resolved.sections;

    // Always run budget validation — returned alongside every export so AI / UI can react
    const budget = validateResumeBudget(resume as any);

    // Preflight mode: validate budget without generating export
    const preflight = request.nextUrl.searchParams.get('preflight') === 'true';
    if (preflight) {
      return NextResponse.json(budget);
    }

    const format = request.nextUrl.searchParams.get('format') || 'json';
    const title = resume.title || 'resume';
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `${title}-${ts}`;

    switch (format) {
      case 'json': {
        const sections = (resume.sections || [])
          .filter((s: any) => EXPORT_SECTION_TYPES.has(s.type))
          .map((s: any) => ({
            type: s.type,
            title: s.title,
            content: s.content,
          }));
        return NextResponse.json({
          version: 2,
          exportedAt: new Date().toISOString(),
          title: resume.title,
          template: resume.template,
          language: (resume as any).language || 'zh',
          sections,
          budget,
        });
      }
      case 'html': {
        const forPrint = request.nextUrl.searchParams.get('forPrint') === 'true';
        const html = await generateHtml(resume, forPrint);
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.html"`,
            ...budgetHeaders(budget),
          },
        });
      }
      case 'txt': {
        const text = generatePlainText(resume);
        return new NextResponse(text, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.txt"`,
            ...budgetHeaders(budget),
          },
        });
      }
      case 'docx': {
        const docxBuffer = await generateDocxBuffer(resume);
        return new NextResponse(new Uint8Array(docxBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.docx"`,
            ...budgetHeaders(budget),
          },
        });
      }
      case 'pdf': {
        const fitOnePage = request.nextUrl.searchParams.get('fitOnePage') === 'true';
        const pdfHtml = await generateHtml(resume, true);
        const pdfBuffer = await generatePdf(pdfHtml, { fitOnePage });
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
            ...budgetHeaders(budget),
          },
        });
      }
      default: {
        return NextResponse.json(
          { error: `Unsupported format: ${format}. Supported: json, html, txt, docx, pdf` },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('GET /api/resume/[id]/export error:', error);
    // Surface the real reason (e.g. "No Chrome/Chromium found ...") so PDF export
    // failures are diagnosable instead of a generic 500 (issue #85).
    const detail = error instanceof Error && error.message ? error.message : '';
    return NextResponse.json(
      { error: detail || 'Internal server error' },
      { status: 500 }
    );
  }
}
