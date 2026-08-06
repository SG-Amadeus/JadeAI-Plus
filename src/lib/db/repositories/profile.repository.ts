/**
 * SECURITY: This repository must NEVER be imported by:
 *   - src/app/api/ai/**
 *   - src/lib/ai/**
 *   - src/app/api/interview/**
 *   - src/lib/interview/**
 *
 * Codename resolution for AI routes is done via the denormalized
 * resumes.profileCodename column — no personal_profiles query needed.
 *
 * Profile data endpoints are guarded by requireUiClient() which rejects
 * requests without the x-profile-ui header (CLI / agent-driven calls).
 * Only /api/profile/codenames is exempt — it returns codenames only.
 */
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../index';
import { personalProfiles } from '../schema';

export const profileRepository = {
  async findAllByUserId(userId: string) {
    return db.select().from(personalProfiles)
      .where(eq(personalProfiles.userId, userId))
      .orderBy(desc(personalProfiles.updatedAt));
  },

  async findById(id: string) {
    const result = await db.select().from(personalProfiles)
      .where(eq(personalProfiles.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findByCodename(userId: string, codename: string) {
    const result = await db.select().from(personalProfiles)
      .where(and(eq(personalProfiles.userId, userId), eq(personalProfiles.codename, codename)))
      .limit(1);
    return result[0] || null;
  },

  async findCodenamesByUserId(userId: string) {
    return db.select({
      id: personalProfiles.id,
      codename: personalProfiles.codename,
    }).from(personalProfiles)
      .where(eq(personalProfiles.userId, userId))
      .orderBy(personalProfiles.codename);
  },

  async create(data: { userId: string; codename: string; data: Record<string, unknown> }) {
    const id = crypto.randomUUID();
    await db.insert(personalProfiles).values({
      id,
      userId: data.userId,
      codename: data.codename,
      data: data.data,
    });
    return this.findById(id);
  },

  async update(id: string, data: { codename?: string; data?: Record<string, unknown> }) {
    const now = new Date();
    await db.update(personalProfiles)
      .set({ ...data, updatedAt: now } as any)
      .where(eq(personalProfiles.id, id));
    return this.findById(id);
  },

  async remove(id: string) {
    await db.delete(personalProfiles).where(eq(personalProfiles.id, id));
  },
};
