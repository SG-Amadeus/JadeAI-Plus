import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resume = await resumeRepository.findById(id);
    if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    if (resume.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await resumeRepository.detach(id);
    if (!result) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    if ((result as any).error === 'ALREADY_ROOT') {
      return NextResponse.json({ error: 'Resume is already a root (no parent)' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/resume/[id]/detach error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
