import { NextRequest, NextResponse } from 'next/server';
import { profileRepository } from '@/lib/db/repositories/profile.repository';
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

    const profiles = await profileRepository.findAllByUserId(user.id);
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('GET /api/profile error:', error);
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
    const { codename, data } = body;

    if (!codename || typeof codename !== 'string') {
      return NextResponse.json({ error: 'codename is required' }, { status: 400 });
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(codename) || codename.length > 32) {
      return NextResponse.json({ error: 'codename must be lowercase alphanumeric with hyphens, max 32 chars' }, { status: 400 });
    }

    const existing = await profileRepository.findByCodename(user.id, codename);
    if (existing) {
      return NextResponse.json({ error: 'Codename already exists' }, { status: 409 });
    }

    const profile = await profileRepository.create({
      userId: user.id,
      codename,
      data: data || {},
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('POST /api/profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
