import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rootId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const root = await resumeRepository.findById(rootId);
    if (!root) return NextResponse.json({ error: 'Root resume not found' }, { status: 404 });
    if (root.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { title, template, language } = await request.json();
    const result = await resumeRepository.derive(rootId, user.id, { title, template, language });

    if (!result) return NextResponse.json({ error: 'Failed to derive' }, { status: 500 });
    if ((result as any).error === 'CANNOT_DERIVE_FROM_DERIVATIVE') {
      return NextResponse.json({ error: 'Cannot derive from a derivative. Detach it first or derive from the root.' }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/resume/[id]/derive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
