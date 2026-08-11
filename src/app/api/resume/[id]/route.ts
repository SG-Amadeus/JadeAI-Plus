import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { profileRepository } from '@/lib/db/repositories/profile.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { buildPersonalInfoContent } from '@/lib/profile/prefill';
import { injectResolvedPersonalInfo } from '@/lib/resume/resolve-personal-info';
import { validateThemeConfig } from '@/lib/resume/validate';

/** Strip internal credentials from resume before sending to client.
 *  userId, sharePassword, shareToken must never leave the server. */
function sanitizeResumeForClient(resume: any): any {
  const { userId, sharePassword, shareToken, ...safe } = resume;
  return safe;
}

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

    // Resolve personal_info from bound profile (profile-bound resumes store no section)
    const resolved = await injectResolvedPersonalInfo(resume as any);
    return NextResponse.json(sanitizeResumeForClient(resolved));
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
    if (themeConfig) {
      const validation = validateThemeConfig(themeConfig);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `theme.json: ${validation.errors.join('; ')}` },
          { status: 422 },
        );
      }
      // Deep-merge partial into existing config so CLI --theme doesn't wipe other fields
      const existing = (resume as any).themeConfig || {};
      updateFields.themeConfig = {
        ...existing,
        ...themeConfig,
        // Merge margin sub-object separately so partial margin doesn't lose other sides
        margin: {
          ...(existing.margin || {}),
          ...(themeConfig.margin || {}),
        },
      };
    }
    if (profileCodename !== undefined) {
      if (profileCodename) {
        // Bind profile: validate ownership, delete stale personal_info section
        const profile = await profileRepository.findByCodename(user.id, profileCodename);
        if (!profile) {
          return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
        }
        updateFields.profileCodename = profileCodename;
        updateFields.profileId = profile.id;

        // Delete any existing personal_info section — profile is now source of truth
        const existingPI = (resume.sections || []).find((s: any) =>
          s.type === 'personal_info' && !s.id.startsWith('inherited:'));
        if (existingPI) {
          await resumeRepository.deleteSection(existingPI.id);
        }
      } else {
        // Unbind profile: materialize a snapshot before clearing the reference
        if ((resume as any).profileId) {
          const profile = await profileRepository.findById((resume as any).profileId);
          if (profile) {
            const hasPI = (resume.sections || []).some((s: any) =>
              s.type === 'personal_info' && !s.id.startsWith('inherited:'));
            if (!hasPI) {
              const lang = (resume as any).language || 'zh';
              const piLabel = lang === 'en' ? 'Personal Info' : '个人信息';
              await resumeRepository.createSection({
                resumeId: id,
                type: 'personal_info',
                title: piLabel,
                sortOrder: -1,
                content: buildPersonalInfoContent(profile.data as Record<string, unknown>),
              });
              // Normalize sort orders so the new section is at position 0
              const allSections = resume.sections || [];
              for (let i = 0; i < allSections.length; i++) {
                if (allSections[i].sortOrder !== i + 1) {
                  await resumeRepository.updateSection(allSections[i].id, { sortOrder: i + 1 } as any);
                }
              }
            }
          }
        }
        updateFields.profileCodename = null;
        updateFields.profileId = null;
      }
    }
    if (Object.keys(updateFields).length > 0) {
      await resumeRepository.update(id, updateFields);
    }

    // Sync sections: create new, update existing, delete removed
    const isProfileBound = !!(updateFields.profileCodename ?? (resume as any).profileCodename);
    if (sections && Array.isArray(sections)) {
      // Filter out personal_info on derivatives and profile-bound resumes
      const filteredSections = ((resume as any).parentId || isProfileBound)
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
    const resolved = await injectResolvedPersonalInfo(updated as any);
    return NextResponse.json(sanitizeResumeForClient(resolved));
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
