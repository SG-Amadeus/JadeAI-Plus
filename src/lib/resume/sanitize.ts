/**
 * PII sanitization for resume data sent to third-party AI providers.
 *
 * Sensitivity tiers ("分档"):
 *   T1 核心隐私 (never sent): fullName, email, phone, wechat
 *   T2 身份信息 (never sent): website, linkedin, github, customLinks, avatar,
 *                            age, gender, ethnicity, politicalStatus, maritalStatus,
 *                            location, hometown
 *   T3 专业展示 (sent):       jobTitle, yearsOfExperience, educationLevel
 *
 * Only the personal_info section is touched; all other sections and section
 * metadata (id/title/type/sortOrder) pass through unchanged. The DB is never
 * modified — sanitization applies to the copy that gets serialized for AI.
 */

export const PII_STRIP_FIELDS: readonly string[] = [
  // T1 — direct identifiers & contact channels
  'fullName', 'email', 'phone', 'wechat',
  // T2 — profile links, photo, personal attributes, geo
  'website', 'linkedin', 'github', 'customLinks', 'avatar',
  'age', 'gender', 'ethnicity', 'politicalStatus', 'maritalStatus',
  'location', 'hometown',
];

function stripFields(content: Record<string, unknown>): {
  sanitized: Record<string, unknown>;
  stripped: Record<string, unknown>;
} {
  const sanitized: Record<string, unknown> = {};
  const stripped: Record<string, unknown> = {};
  for (const key of Object.keys(content)) {
    if ((PII_STRIP_FIELDS as readonly string[]).includes(key)) {
      stripped[key] = content[key];
    } else {
      sanitized[key] = content[key];
    }
  }
  return { sanitized, stripped };
}

/** Copy of sections with sensitive personal_info fields removed.
 *  Never mutates input. Non-personal_info sections pass through unchanged. */
export function sanitizeSectionsForAI<T extends { type: string; content?: unknown }>(
  sections: T[],
): T[] {
  return sections.map((section) => {
    if (section.type !== 'personal_info') return section;
    const content = section.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) return section;
    const { sanitized } = stripFields(content as Record<string, unknown>);
    return { ...section, content: sanitized };
  });
}

/** Strip PII from personal_info content and return both the sanitized content
 *  and the removed fields. The caller MUST merge `stripped` back after AI
 *  processing to avoid data loss on write-back (used by translate boundaries). */
export function stripPersonalInfoForAI(content: unknown): {
  content: unknown;
  stripped: Record<string, unknown>;
} {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { content, stripped: {} };
  }
  const { sanitized, stripped } = stripFields(content as Record<string, unknown>);
  return { content: sanitized, stripped };
}

// ─── Export / public-share sanitization ─────────────────────────

/** Demographic fields stripped from personal_info in export and public share.
 *  These enable discrimination and have no place on a professional resume.
 *  Standard contact fields (fullName, jobTitle, email, phone, location,
 *  website, linkedin, github) are preserved — the document must still
 *  function as a resume. */
export const EXPORT_PII_STRIP_FIELDS: ReadonlySet<string> = new Set([
  'age', 'gender', 'politicalStatus', 'ethnicity', 'hometown',
  'maritalStatus', 'wechat', 'avatar',
]);

/** Strip sensitive demographic fields from personal_info content.
 *  Returns a new object — never mutates the input.
 *  Used by both the export pipeline and the public share endpoint. */
export function sanitizePersonalInfoForExport(content: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(content)) {
    if (!EXPORT_PII_STRIP_FIELDS.has(key)) {
      cleaned[key] = content[key];
    }
  }
  return cleaned;
}
