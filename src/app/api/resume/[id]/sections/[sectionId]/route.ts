import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';

async function verifyOwnership(resumeId: string, request: NextRequest) {
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return { error: 'Unauthorized', status: 401, user: null };
  const resume = await resumeRepository.findById(resumeId);
  if (!resume) return { error: 'Resume not found', status: 404, user: null };
  if (resume.userId !== user.id) return { error: 'Forbidden', status: 403, user: null };
  return { error: null, status: 200, user, resume };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const { id: resumeId, sectionId } = await params;
  const { error, status, resume } = await verifyOwnership(resumeId, request);
  if (error) return NextResponse.json({ error }, { status });

  const section = resume!.sections.find((s: any) => s.id === sectionId);
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // Guard: personal_info is managed by profile — reject CLI/API modifications
  if (section.type === 'personal_info' && (resume as any).profileCodename) {
    return NextResponse.json(
      { error: `Personal info is managed by profile "${(resume as any).profileCodename}". Unbind the profile via UI first.` },
      { status: 403 },
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.visible !== undefined) updates.visible = body.visible;
  if (body.content !== undefined) {
    updates.content = normalizeSectionContent(section.type, body.content);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  await resumeRepository.updateSection(sectionId, updates);
  const updated = await resumeRepository.findById(resumeId);
  const updatedSection = updated?.sections.find((s: any) => s.id === sectionId);
  return NextResponse.json(updatedSection);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const { id: resumeId, sectionId } = await params;
  const { error, status, resume } = await verifyOwnership(resumeId, request);
  if (error) return NextResponse.json({ error }, { status });

  const section = resume!.sections.find((s: any) => s.id === sectionId);
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  // Guard: personal_info is managed by profile — reject CLI/API deletion
  if (section.type === 'personal_info' && (resume as any).profileCodename) {
    return NextResponse.json(
      { error: `Personal info is managed by profile "${(resume as any).profileCodename}". Unbind the profile via UI first.` },
      { status: 403 },
    );
  }

  await resumeRepository.deleteSection(sectionId);
  return NextResponse.json({ success: true });
}
