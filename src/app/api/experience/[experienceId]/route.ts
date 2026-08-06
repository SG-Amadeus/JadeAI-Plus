import { NextRequest, NextResponse } from 'next/server';
import { experienceRepository } from '@/lib/db/repositories/experience.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

// No requireUiClient guard — experience data is non-PII and safe for AI/CLI access.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await experienceRepository.findById(experienceId);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('GET /api/experience/[experienceId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await experienceRepository.findById(experienceId);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (type !== undefined && !['work', 'project', 'internship'].includes(type)) {
      return NextResponse.json({ error: 'type must be "work", "project", or "internship"' }, { status: 400 });
    }
    if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
      return NextResponse.json({ error: 'data must be a plain object' }, { status: 400 });
    }

    const updated = await experienceRepository.update(experienceId, {
      ...(type !== undefined ? { type } : {}),
      ...(data !== undefined ? { data } : {}),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/experience/[experienceId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
) {
  try {
    const { experienceId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await experienceRepository.findById(experienceId);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await experienceRepository.remove(experienceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/experience/[experienceId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
