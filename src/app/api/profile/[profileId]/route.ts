import { NextRequest, NextResponse } from 'next/server';
import { profileRepository } from '@/lib/db/repositories/profile.repository';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { requireUiClient } from '@/lib/auth/ui-only';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const uiCheck = requireUiClient(request);
    if (!uiCheck.ok) return uiCheck.response!;

    const { profileId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (profile.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('GET /api/profile/[profileId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const uiCheck = requireUiClient(request);
    if (!uiCheck.ok) return uiCheck.response!;

    const { profileId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (profile.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { codename, data } = body;

    if (codename !== undefined && typeof codename !== 'string') {
      return NextResponse.json({ error: 'Invalid codename' }, { status: 400 });
    }
    if (codename && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(codename)) {
      return NextResponse.json({ error: 'codename must be lowercase alphanumeric with hyphens' }, { status: 400 });
    }

    const updated = await profileRepository.update(profileId, {
      ...(codename !== undefined ? { codename } : {}),
      ...(data !== undefined ? { data } : {}),
    });

    // If codename changed, sync denormalized column on all bound resumes
    if (codename !== undefined && codename !== profile.codename) {
      const { resumes } = await import('@/lib/db/schema');
      const { db } = await import('@/lib/db');
      const { eq } = await import('drizzle-orm');
      await db.update(resumes)
        .set({ profileCodename: codename } as any)
        .where(eq(resumes.profileId, profileId));
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/profile/[profileId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const uiCheck = requireUiClient(request);
    if (!uiCheck.ok) return uiCheck.response!;

    const { profileId } = await params;
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await profileRepository.findById(profileId);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (profile.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Materialize personal_info snapshots into bound resumes lacking a section,
    // then clear the denormalized profileCodename on all bound resumes
    const { resumes } = await import('@/lib/db/schema');
    const { resumeSections } = await import('@/lib/db/schema');
    const { db } = await import('@/lib/db');
    const { eq } = await import('drizzle-orm');
    const { buildPersonalInfoContent } = await import('@/lib/profile/prefill');

    // Find all bound resumes
    const boundResumes = await db.select().from(resumes).where(eq(resumes.profileId, profileId));
    for (const r of boundResumes) {
      // Check if resume already has a personal_info section
      const sections = await db.select().from(resumeSections)
        .where(eq(resumeSections.resumeId, r.id));
      const hasPI = sections.some((s: any) => s.type === 'personal_info');
      if (!hasPI) {
        const lang = r.language || 'zh';
        const piLabel = lang === 'en' ? 'Personal Info' : '个人信息';
        await db.insert(resumeSections).values({
          id: crypto.randomUUID(),
          resumeId: r.id,
          type: 'personal_info',
          title: piLabel,
          sortOrder: -1,
          visible: true,
          content: buildPersonalInfoContent(profile.data as Record<string, unknown>),
        } as any);
      }
    }

    await db.update(resumes)
      .set({ profileCodename: null } as any)
      .where(eq(resumes.profileId, profileId));

    await profileRepository.remove(profileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/profile/[profileId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
