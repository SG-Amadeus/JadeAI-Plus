/**
 * Experience library repository.
 *
 * SAFE FOR AI ROUTES — this repository contains non-PII experience data.
 * Unlike profile.repository, it MAY be imported by src/app/api/ai/** and src/lib/ai/**.
 * It must NOT be added to the FORBIDDEN list in security-boundary.test.ts.
 */
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../index';
import { experiences } from '../schema';
import type { Experience } from '../schema';

export const experienceRepository = {
  async findAllByUserId(userId: string): Promise<Experience[]> {
    return db.select().from(experiences)
      .where(eq(experiences.userId, userId))
      .orderBy(desc(experiences.updatedAt));
  },

  async findById(id: string): Promise<Experience | null> {
    const result = await db.select().from(experiences)
      .where(eq(experiences.id, id)).limit(1);
    return result[0] || null;
  },

  async findByIds(ids: string[]): Promise<Experience[]> {
    if (!ids.length) return [];
    return db.select().from(experiences).where(inArray(experiences.id, ids));
  },

  async create(data: { userId: string; type: 'work' | 'project' | 'internship'; data: Record<string, unknown> }): Promise<Experience> {
    const id = crypto.randomUUID();
    await db.insert(experiences).values({
      id,
      userId: data.userId,
      type: data.type,
      data: data.data as any,
    });
    return (await this.findById(id))!;
  },

  async update(id: string, data: { type?: 'work' | 'project' | 'internship'; data?: Record<string, unknown> }): Promise<Experience | null> {
    const setData: Record<string, unknown> = { updatedAt: new Date() as any };
    if (data.type !== undefined) setData.type = data.type;
    if (data.data !== undefined) setData.data = data.data as any;
    await db.update(experiences).set(setData as any).where(eq(experiences.id, id));
    return this.findById(id);
  },

  async remove(id: string): Promise<void> {
    await db.delete(experiences).where(eq(experiences.id, id));
  },
};
