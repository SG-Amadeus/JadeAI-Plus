import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { generatePdf } from '@/lib/pdf/generate-pdf';
import { generateHtml } from './builders';
import { generatePlainText } from './plain-text';
import { generateDocxBuffer } from './docx';
import { EXPORT_SECTION_TYPES } from '@/lib/constants';
import { sanitizePersonalInfoForExport } from './utils';
import { injectResolvedPersonalInfo } from '@/lib/resume/resolve-personal-info';
import { validateResumeBudget } from '@/lib/resume/budget-validate';

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

    // Sanitize PII from personal_info before any format touches the data.
    // This is the single choke point — all export formats (json, txt, html, pdf, docx)
    // receive a sanitized copy of the resume.
    resume.sections = resume.sections.map((s: any) => {
      if (s.type !== 'personal_info') return s;
      return { ...s, content: sanitizePersonalInfoForExport(s.content || {}) };
    });

    // Preflight mode: validate budget without generating export
    const preflight = request.nextUrl.searchParams.get('preflight') === 'true';
    if (preflight) {
      const result = validateResumeBudget(resume as any);
      return NextResponse.json(result);
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
        });
      }
      case 'html': {
        // forPrint=true returns the print-optimized layout (used by the client-side
        // "print to PDF" fallback when server Chromium is unavailable, issue #85).
        const forPrint = request.nextUrl.searchParams.get('forPrint') === 'true';
        const html = await generateHtml(resume, forPrint);
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.html"`,
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
          },
        });
      }
      case 'pdf': {
        const fitOnePage = request.nextUrl.searchParams.get('fitOnePage') === 'true';
        // Run budget preflight and attach warnings as response header
        const budget = validateResumeBudget(resume as any);
        const pdfHtml = await generateHtml(resume, true);
        const pdfBuffer = await generatePdf(pdfHtml, { fitOnePage });
        const headers: Record<string, string> = {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
        };
        if (budget.warnings.length > 0) {
          headers['X-Budget-Warnings'] = JSON.stringify(budget.warnings.map(w => `${w.severity}: ${w.message}`));
          headers['X-Budget-Ok'] = budget.ok ? 'true' : 'false';
          headers['X-Budget-Lines'] = `${budget.contentLinesEstimated}/${budget.contentLinesAvailable}`;
        }
        return new NextResponse(new Uint8Array(pdfBuffer), { status: 200, headers });
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
