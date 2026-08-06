import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

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

    return NextResponse.json(resume);
  } catch (error) {
    console.error('GET /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await request.json();
    const { title, template, themeConfig, sections, profileCodename, profileId } = body;

    // Update resume metadata (including profile binding)
    const updateFields: Record<string, unknown> = {};
    if (title) updateFields.title = title;
    if (template) updateFields.template = template;
    if (themeConfig) updateFields.themeConfig = themeConfig;
    if (profileCodename !== undefined) {
      updateFields.profileCodename = profileCodename || null;
      updateFields.profileId = profileId || null;
    }
    if (Object.keys(updateFields).length > 0) {
      await resumeRepository.update(id, updateFields);
    }

    // Sync sections: create new, update existing, delete removed
    if (sections && Array.isArray(sections)) {
      // On derivatives, filter out personal_info — it must come from the root
      const filteredSections = (resume as any).parentId
        ? sections.filter((s: any) => s.type !== 'personal_info')
        : sections;

      const existingSections = resume.sections || [];
      const existingIds = new Set(existingSections.map((s: any) => s.id));
      const incomingIds = new Set(filteredSections.map((s: any) => s.id));

      // Delete sections that were removed by the user
      for (const existing of existingSections) {
        if (!incomingIds.has(existing.id)) {
          await resumeRepository.deleteSection(existing.id);
        }
      }

      for (const section of filteredSections) {
        if (existingIds.has(section.id)) {
          // Update existing section
          await resumeRepository.updateSection(section.id, {
            title: section.title,
            sortOrder: section.sortOrder,
            visible: section.visible,
            content: section.content,
          });
        } else {
          // Create new section added by the user
          await resumeRepository.createSection({
            id: section.id,
            resumeId: id,
            type: section.type,
            title: section.title,
            sortOrder: section.sortOrder,
            visible: section.visible,
            content: section.content,
          });
        }
      }
    }

    const updated = await resumeRepository.findById(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const force = request.nextUrl.searchParams.get('force') === 'true';
    if (force) {
      await resumeRepository.deleteRecursively(id);
      return NextResponse.json({ success: true });
    }
    const result = await resumeRepository.delete(id);
    if (!result.deleted) {
      return NextResponse.json(
        { error: `Resume has ${result.derivativeCount} derivative(s). Delete them first or use ?force=true`, derivativeCount: result.derivativeCount },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/resume/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
