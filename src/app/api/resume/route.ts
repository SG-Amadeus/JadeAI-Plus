import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { profileRepository } from '@/lib/db/repositories/profile.repository';
import { experienceRepository } from '@/lib/db/repositories/experience.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { DEFAULT_SECTIONS } from '@/lib/constants';
import { buildEducationContent, buildPersonalInfoContent } from '@/lib/profile/prefill';
import { resumes } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allResumes = await resumeRepository.findAllByUserId(user.id);
    return NextResponse.json(allResumes);
  } catch (error) {
    console.error('GET /api/resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, template, language, sections, themeConfig, profileCodename, experienceIds } = body;

    let profileId: string | null = null;
    let resolvedProfileData: Record<string, unknown> | null = null;

    // Resolve profile if codename provided (non-AI route — allowed)
    if (profileCodename && typeof profileCodename === 'string') {
      const profile = await profileRepository.findByCodename(user.id, profileCodename);
      if (!profile) {
        return NextResponse.json({ error: `Unknown profile codename: ${profileCodename}` }, { status: 400 });
      }
      profileId = profile.id;
      resolvedProfileData = profile.data as Record<string, unknown>;
    }

    const resume = await resumeRepository.create({
      userId: user.id,
      title: title || '未命名简历',
      template: template || 'minimal-blue',
      language: language || 'zh',
      ...(themeConfig ? { themeConfig } : {}),
    });

    // Bind profile to resume (denormalized columns)
    if (profileId) {
      await db.update(resumes)
        .set({ profileId, profileCodename } as any)
        .where(eq(resumes.id, resume!.id));
    }

    // Load experience library entries if referenced
    let workEntries: Record<string, unknown>[] = [];
    let projectEntries: Record<string, unknown>[] = [];
    if (Array.isArray(experienceIds) && experienceIds.length > 0) {
      const entries = await experienceRepository.findByIds(experienceIds);
      const userEntries = entries.filter((e) => e.userId === user.id);
      workEntries = userEntries
        .filter((e) => e.type === 'work' || e.type === 'internship')
        .map((e) => e.data as Record<string, unknown>);
      projectEntries = userEntries
        .filter((e) => e.type === 'project')
        .map((e) => e.data as Record<string, unknown>);
    }

    function stripNotes(item: Record<string, unknown>): Record<string, unknown> {
      const { notes, summary, description, ...rest } = item;
      // Map library summary → resume section description field
      const resolvedDescription = summary || description;
      return { ...rest, description: resolvedDescription };
    }
    function stripIds(items: Record<string, unknown>[]): Record<string, unknown>[] {
      return items.map((item) => {
        const { id, ...rest } = item;
        return { ...rest, id: crypto.randomUUID() } as Record<string, unknown>;
      });
    }

    if (resume) {
      if (Array.isArray(sections) && sections.length > 0) {
        // Import mode: use provided sections
        // If profile is bound, personal_info and education come from the profile — skip them in the import
        let sortOrder = 0;
        if (profileId && resolvedProfileData) {
          const piLabel = resume.language === 'en' ? 'Personal Info' : '个人信息';
          await resumeRepository.createSection({
            resumeId: resume.id,
            type: 'personal_info',
            title: piLabel,
            sortOrder: sortOrder++,
            content: buildPersonalInfoContent(resolvedProfileData),
          });
          const eduLabel = resume.language === 'en' ? 'Education' : '教育背景';
          await resumeRepository.createSection({
            resumeId: resume.id,
            type: 'education',
            title: eduLabel,
            sortOrder: sortOrder++,
            content: buildEducationContent(resolvedProfileData),
          });
        }
        for (const s of sections) {
          if (profileId && (s.type === 'personal_info' || s.type === 'education')) continue; // profile provides these
          await resumeRepository.createSection({
            resumeId: resume.id,
            type: s.type,
            title: s.title,
            sortOrder: sortOrder++,
            visible: s.visible,
            content: s.content,
          });
        }
      } else {
        // Default mode: create empty sections
        const lang = resume.language || 'zh';
        for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
          const s = DEFAULT_SECTIONS[i];
          const sectionTitle = lang === 'en' ? s.titleEn : s.titleZh;
          let content: unknown = {};

          if (s.type === 'personal_info') {
            content = resolvedProfileData
              ? buildPersonalInfoContent(resolvedProfileData)
              : { fullName: '', jobTitle: '', email: '', phone: '', location: '' };
          } else if (s.type === 'summary') {
            content = { text: '' };
          } else if (s.type === 'work_experience') {
            content = { items: workEntries.length > 0 ? stripIds(workEntries.map(stripNotes)) : [] };
          } else if (s.type === 'projects') {
            content = { items: projectEntries.length > 0 ? stripIds(projectEntries.map(stripNotes)) : [] };
          } else if (s.type === 'education') {
            content = resolvedProfileData
              ? buildEducationContent(resolvedProfileData)
              : { items: [] };
          } else if (s.type === 'certifications' || s.type === 'languages' || s.type === 'github' || s.type === 'custom') {
            content = { items: [] };
          } else if (s.type === 'skills') {
            content = { categories: [] };
          }

          await resumeRepository.createSection({
            resumeId: resume.id,
            type: s.type,
            title: sectionTitle,
            sortOrder: i,
            content,
          });
        }
      }

      const fullResume = await resumeRepository.findById(resume.id);
      return NextResponse.json(fullResume, { status: 201 });
    }

    return NextResponse.json({ error: 'Failed to create resume' }, { status: 500 });
  } catch (error) {
    console.error('POST /api/resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
