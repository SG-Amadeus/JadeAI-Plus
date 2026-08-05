import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { normalizeSectionContent } from '@/lib/resume/normalize-content';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  const { id: resumeId, sectionId } = await params;
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resume = await resumeRepository.findById(resumeId);
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  if (resume.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const section = resume.sections.find((s: any) => s.id === sectionId);
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const { itemIds } = await request.json();
  if (!Array.isArray(itemIds)) {
    return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
  }

  const content = section.content || {};
  let listKey: string;
  let items: any[];

  if (section.type === 'skills' && Array.isArray(content.categories)) {
    listKey = 'categories';
    items = content.categories;
  } else if (Array.isArray(content.items)) {
    listKey = 'items';
    items = content.items;
  } else {
    return NextResponse.json({ error: 'Section has no item list' }, { status: 400 });
  }

  // Reorder: create a new array in the requested order
  const itemMap = new Map(items.map((it: any) => [it.id, it]));
  const reordered = itemIds.map((id: string) => itemMap.get(id)).filter(Boolean);
  // Append any items not in the reorder list
  for (const item of items) {
    if (!itemIds.includes(item.id)) reordered.push(item);
  }

  const updatedContent = normalizeSectionContent(section.type, { ...content, [listKey]: reordered });
  await resumeRepository.updateSection(sectionId, { content: updatedContent });

  const updated = await resumeRepository.findById(resumeId);
  return NextResponse.json(updated?.sections.find((s: any) => s.id === sectionId));
}
