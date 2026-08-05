import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';

export async function POST(
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

  const { type, title, content } = await request.json();
  if (!type || !title) {
    return NextResponse.json({ error: 'type and title are required' }, { status: 400 });
  }

  // Derivatives cannot have their own personal_info — it's inherited from root
  if ((resume as any).parentId && type === 'personal_info') {
    return NextResponse.json({ error: 'Personal info lives on the root resume. Edit the root to update it.' }, { status: 400 });
  }

  const maxOrder = resume.sections.reduce((max: number, s: any) => Math.max(max, s.sortOrder), -1);
  const section = await resumeRepository.createSection({
    resumeId,
    type,
    title,
    sortOrder: maxOrder + 1,
    content: content || {},
  });

  return NextResponse.json(section, { status: 201 });
}
