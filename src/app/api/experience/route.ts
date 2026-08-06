import { NextRequest, NextResponse } from 'next/server';
import { experienceRepository } from '@/lib/db/repositories/experience.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { requireUiClient } from '@/lib/auth/ui-only';

export async function GET(request: NextRequest) {
  try {
    const uiCheck = requireUiClient(request);
    if (!uiCheck.ok) return uiCheck.response!;

    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list = await experienceRepository.findAllByUserId(user.id);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/experience error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uiCheck = requireUiClient(request);
    if (!uiCheck.ok) return uiCheck.response!;

    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !['work', 'project', 'internship'].includes(type)) {
      return NextResponse.json({ error: 'type must be "work", "project", or "internship"' }, { status: 400 });
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return NextResponse.json({ error: 'data must be a plain object' }, { status: 400 });
    }

    const entry = await experienceRepository.create({ userId: user.id, type, data });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST /api/experience error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
