/**
 * One-time backfill: migrate existing derivatives from the old inheritance model
 * to the new profile-reference model.
 *
 * Run with: tsx scripts/backfill-profile-binding.ts
 *
 * Idempotent — safe to re-run.
 */
import { db } from '../src/lib/db';
import { resumes, resumeSections } from '../src/lib/db/schema';
import { eq, isNull, isNotNull, and, sql } from 'drizzle-orm';

async function main() {
  console.log('Backfilling profile bindings for existing derivatives…');

  // 1. Find all derivatives (resumes with parentId)
  const derivatives = await db.select().from(resumes)
    .where(isNull(resumes.profileCodename))
    .execute();

  const withParent = derivatives.filter((r: any) => r.parentId);
  console.log(`Found ${withParent.length} derivatives without profileCodename`);

  let fromParentProfile = 0;
  let materialized = 0;

  for (const deriv of withParent) {
    // Load parent
    const parent = await db.select().from(resumes)
      .where(eq(resumes.id, deriv.parentId!))
      .limit(1);

    if (!parent[0]) continue;

    if ((parent[0] as any).profileCodename) {
      // Parent is profile-bound → copy the reference
      await db.update(resumes)
        .set({
          profileCodename: (parent[0] as any).profileCodename,
          profileId: (parent[0] as any).profileId,
        } as any)
        .where(eq(resumes.id, deriv.id));
      fromParentProfile++;
    } else {
      // Parent is NOT profile-bound → materialize parent's personal_info section
      const parentSections = await db.select().from(resumeSections)
        .where(eq(resumeSections.resumeId, parent[0].id));
      const personalInfo = parentSections.find((s: any) => s.type === 'personal_info');
      if (personalInfo) {
        // Check if derivative already has a personal_info section
        const derivSections = await db.select().from(resumeSections)
          .where(eq(resumeSections.resumeId, deriv.id));
        const hasPI = derivSections.some((s: any) => s.type === 'personal_info');
        if (!hasPI) {
          await db.insert(resumeSections).values({
            id: crypto.randomUUID(),
            resumeId: deriv.id,
            type: 'personal_info',
            title: personalInfo.title,
            sortOrder: -1,
            visible: personalInfo.visible,
            content: personalInfo.content,
          } as any);

          // Normalize sort orders
          const allSections = await db.select().from(resumeSections)
            .where(eq(resumeSections.resumeId, deriv.id))
            .orderBy(resumeSections.sortOrder);
          for (let i = 0; i < allSections.length; i++) {
            await db.update(resumeSections)
              .set({ sortOrder: i } as any)
              .where(eq(resumeSections.id, allSections[i].id));
          }
        }
        materialized++;
      }
    }
  }

  // 2. Consistency pass: backfill profileId where missing but codename exists
  const { profileRepository } = await import('../src/lib/db/repositories/profile.repository');
  const missingId = await db.select().from(resumes)
    .where(and(isNull(resumes.profileId), sql`${resumes.profileCodename} IS NOT NULL`));

  let fixed = 0;
  for (const r of missingId) {
    const profile = await profileRepository.findByCodename(r.userId, (r as any).profileCodename);
    if (profile) {
      await db.update(resumes)
        .set({ profileId: profile.id } as any)
        .where(eq(resumes.id, r.id));
      fixed++;
    }
  }

  console.log(`Done: ${fromParentProfile} copied from profile-bound parent, ${materialized} materialized from non-profile parent, ${fixed} profileId backfilled`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
