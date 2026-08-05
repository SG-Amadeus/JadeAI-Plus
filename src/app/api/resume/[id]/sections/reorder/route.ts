import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: resumeId } = await params;
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  if (resume.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { sectionIds } = await request.json();
  if (!Array.isArray(sectionIds)) {
    return NextResponse.json({ error: 'sectionIds array is required' }, { status: 400 });
  }

  await resumeRepository.updateSectionOrder(
    sectionIds.map((id, i) => ({ id, sortOrder: i })),
  );

  const updated = await resumeRepository.findById(resumeId);
  return NextResponse.json(updated);
}
