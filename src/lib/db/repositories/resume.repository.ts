import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { resumes, resumeSections } from '../schema';

const INHERITED_PREFIX = 'inherited:';

function normalizeThemeConfig(tc: unknown): Record<string, unknown> {
  if (tc == null) return {};
  if (typeof tc === 'string') {
    try { const parsed = JSON.parse(tc); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed; } catch { /* not JSON */ }
  }
  if (typeof tc === 'object' && !Array.isArray(tc)) return tc as Record<string, unknown>;
  return {};
}

async function loadWithMerge(resume: any) {
  const sections = await db.select().from(resumeSections)
    .where(eq(resumeSections.resumeId, resume.id))
    .orderBy(resumeSections.sortOrder);

  return { ...resume, themeConfig: normalizeThemeConfig(resume.themeConfig), sections };
}

export const resumeRepository = {
  async findAllByUserId(userId: string) {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.updatedAt));
  },

  async findById(id: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!resume[0]) return null;
    return loadWithMerge(resume[0]);
  },

  async create(data: { userId: string; title?: string; template?: string; language?: string; themeConfig?: unknown }) {
    const id = crypto.randomUUID();
    await db.insert(resumes).values({
      id,
      userId: data.userId,
      title: data.title || '未命名简历',
      template: data.template || 'minimal-blue',
      language: data.language || 'zh',
      themeConfig: data.themeConfig ?? {},
    });
    return this.findById(id);
  },

  async update(id: string, data: Partial<{ title: string; template: string; themeConfig: unknown; language: string; profileId: string | null; profileCodename: string | null }>) {
    await db.update(resumes).set({ ...data, updatedAt: new Date() } as any).where(eq(resumes.id, id));
    return this.findById(id);
  },

  async delete(id: string) {
    // Guard: check for derivatives before deleting
    const children = await db.select({ id: resumes.id }).from(resumes).where(eq(resumes.parentId, id));
    if (children.length > 0) {
      return { deleted: false, derivativeCount: children.length };
    }
    await db.delete(resumes).where(eq(resumes.id, id));
    return { deleted: true };
  },

  async deleteRecursively(id: string) {
    const children = await db.select({ id: resumes.id }).from(resumes).where(eq(resumes.parentId, id));
    for (const child of children) {
      await db.delete(resumes).where(eq(resumes.id, child.id));
    }
    await db.delete(resumes).where(eq(resumes.id, id));
  },

  async duplicate(id: string, userId: string, titleOverride?: string) {
    const original = await this.findById(id);
    if (!original) return null;

    const newId = crypto.randomUUID();
    // Derivative of a derivative keeps the same parent
    const parentId = original.parentId ?? null;
    const derivedAt = parentId ? new Date() : null;
    const orig = original as any;

    await db.insert(resumes).values({
      id: newId,
      userId,
      title: titleOverride ?? `${original.title} (副本)`,
      template: original.template,
      themeConfig: original.themeConfig,
      language: original.language,
      parentId,
      derivedAt,
      // Copy profile reference — each resume references the profile independently
      profileCodename: orig.profileCodename ?? null,
      profileId: orig.profileId ?? null,
    } as any);

    for (const section of original.sections) {
      // Skip inherited sections — they reference the root (transitional, harmless)
      if ((section as any).inherited) continue;
      // Skip personal_info when the original is profile-bound
      if (orig.profileCodename && section.type === 'personal_info') continue;

      await db.insert(resumeSections).values({
        id: crypto.randomUUID(),
        resumeId: newId,
        type: section.type,
        title: section.title,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content,
      });
    }

    return this.findById(newId);
  },

  // ── Derive / Detach ──

  async derive(rootId: string, userId: string, data: { title?: string; template?: string; language?: string }) {
    const root = await db.select().from(resumes).where(eq(resumes.id, rootId)).limit(1);
    if (!root[0]) return null;
    if (root[0].userId !== userId) return null;
    if (root[0].parentId) return { error: 'CANNOT_DERIVE_FROM_DERIVATIVE' };

    const newId = crypto.randomUUID();
    const rootProfile = root[0] as any;
    await db.insert(resumes).values({
      id: newId,
      userId,
      title: data.title || `${root[0].title} (派生)`,
      template: data.template || root[0].template,
      language: data.language || root[0].language,
      themeConfig: root[0].themeConfig,
      parentId: rootId,
      derivedAt: new Date(),
      // Copy profile reference — each resume references the profile independently
      profileCodename: rootProfile.profileCodename ?? null,
      profileId: rootProfile.profileId ?? null,
    } as any);

    // Copy all sections EXCEPT personal_info when root is profile-bound
    const sections = await db.select().from(resumeSections)
      .where(eq(resumeSections.resumeId, rootId))
      .orderBy(resumeSections.sortOrder);

    for (const section of sections) {
      if (section.type === 'personal_info' && rootProfile.profileCodename) continue;
      await db.insert(resumeSections).values({
        id: crypto.randomUUID(),
        resumeId: newId,
        type: section.type,
        title: section.title,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content,
      });
    }

    return this.findById(newId);
  },

  async detach(id: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!resume[0]) return null;
    if (!resume[0].parentId) return { error: 'ALREADY_ROOT' };

    // Normalize sort orders for all sections
    const sections = await db.select().from(resumeSections)
      .where(eq(resumeSections.resumeId, id))
      .orderBy(resumeSections.sortOrder);
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].sortOrder !== i) {
        await db.update(resumeSections)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(resumeSections.id, sections[i].id));
      }
    }

    await db.update(resumes)
      .set({ parentId: null, derivedAt: null, updatedAt: new Date() } as any)
      .where(eq(resumes.id, id));

    return this.findById(id);
  },

  // Share operations
  async findByShareToken(token: string) {
    const resume = await db.select().from(resumes).where(eq(resumes.shareToken, token)).limit(1);
    if (!resume[0]) return null;
    return loadWithMerge(resume[0]);
  },

  async incrementViewCount(id: string) {
    await db.update(resumes).set({ viewCount: sql`${resumes.viewCount} + 1` } as any).where(eq(resumes.id, id));
  },

  async updateShareSettings(id: string, settings: { isPublic?: boolean; shareToken?: string | null; sharePassword?: string | null }) {
    await db.update(resumes).set({ ...settings, updatedAt: new Date() } as any).where(eq(resumes.id, id));
  },

  // Section operations
  async createSection(data: { id?: string; resumeId: string; type: string; title: string; sortOrder: number; visible?: boolean; content?: unknown }) {
    const id = data.id || crypto.randomUUID();
    await db.insert(resumeSections).values({
      id,
      resumeId: data.resumeId,
      type: data.type,
      title: data.title,
      sortOrder: data.sortOrder,
      visible: data.visible ?? true,
      content: data.content || {},
    } as any);
    return db.select().from(resumeSections).where(eq(resumeSections.id, id)).limit(1).then((r: any[]) => r[0]);
  },

  async updateSection(id: string, data: Partial<{ title: string; sortOrder: number; visible: boolean; content: unknown }>) {
    // Skip synthetic inherited ids — they don't exist in DB
    if (id.startsWith(INHERITED_PREFIX)) return;
    await db.update(resumeSections).set({ ...data, updatedAt: new Date() } as any).where(eq(resumeSections.id, id));
  },

  async deleteSection(id: string) {
    if (id.startsWith(INHERITED_PREFIX)) return;
    await db.delete(resumeSections).where(eq(resumeSections.id, id));
  },

  async updateSectionOrder(sections: { id: string; sortOrder: number }[]) {
    for (const s of sections) {
      if (s.id.startsWith(INHERITED_PREFIX)) continue;
      await db.update(resumeSections).set({ sortOrder: s.sortOrder, updatedAt: new Date() }).where(eq(resumeSections.id, s.id));
    }
  },
};
