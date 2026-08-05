import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';

async function getSection(resumeId: string, sectionId: string, request: NextRequest) {
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), section: null, type: '' };
  const resume = await resumeRepository.findById(resumeId);
  if (!resume) return { error: NextResponse.json({ error: 'Resume not found' }, { status: 404 }), section: null, type: '' };
  if (resume.userId !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), section: null, type: '' };
  const section = resume.sections.find((s: any) => s.id === sectionId);
  if (!section) return { error: NextResponse.json({ error: 'Section not found' }, { status: 404 }), section: null, type: '' };
  return { error: null, section, type: section.type };
}

function getItemList(section: any): { key: string; items: any[] } {
  const content = section.content || {};
  if (section.type === 'skills' && Array.isArray(content.categories)) {
    return { key: 'categories', items: content.categories };
  }
  if (Array.isArray(content.items)) {
    return { key: 'items', items: content.items };
  }
  return { key: 'items', items: [] };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; itemId: string }> },
) {
  const { id: resumeId, sectionId, itemId } = await params;
  const { error, section, type } = await getSection(resumeId, sectionId, request);
  if (error) return error;

  const body = await request.json();
  const { fields } = body;
  if (!fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'fields object is required' }, { status: 400 });
  }

  const { key, items } = getItemList(section!);
  const idx = items.findIndex((it: any) => it.id === itemId);
  if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  items[idx] = { ...items[idx], ...fields, id: itemId };
  const content = normalizeSectionContent(type, { ...(section!.content as any), [key]: items });
  await resumeRepository.updateSection(sectionId, { content });
  return NextResponse.json(items[idx]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string; itemId: string }> },
) {
  const { id: resumeId, sectionId, itemId } = await params;
  const { error, section, type } = await getSection(resumeId, sectionId, request);
  if (error) return error;

  const { key, items } = getItemList(section!);
  const idx = items.findIndex((it: any) => it.id === itemId);
  if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  items.splice(idx, 1);
  const content = normalizeSectionContent(type, { ...(section!.content as any), [key]: items });
  await resumeRepository.updateSection(sectionId, { content });
  return NextResponse.json({ success: true });
}
