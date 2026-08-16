// ── Resume Budget Preflight Validation ──
// Estimates content lines against template capacity and checks per-field
// character limits for templates with CSS truncation. Called before export
// to catch overflow before generating PDF.

import { BACKGROUND_TEMPLATES } from '@/lib/constants';

const DEFAULT_THEME = {
  primaryColor: '#1a1a1a',
  accentColor: '#3b82f6',
  fontFamily: 'Inter',
  fontSize: 'medium',
  lineSpacing: 1.5,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  sectionSpacing: 16,
  avatarStyle: 'oneInch' as const,
};

// ── Types ──

export interface BudgetWarning {
  severity: 'overflow' | 'tight' | 'sparse';
  section: string;
  message: string;
  /** Estimated lines over capacity (overflow only) */
  excess?: number;
}

export interface BudgetPreflightResult {
  ok: boolean;
  template: string;
  contentLinesAvailable: number;
  contentLinesEstimated: number;
  charsPerLineEn: number;
  charsPerLineZh: number;
  warnings: BudgetWarning[];
  /** Per-section line breakdown */
  breakdown: { section: string; lines: number }[];
}

// ── Font Size Scale ──

const FONT_SCALE: Record<string, { body: number; h2: number }> = {
  small:  { body: 12, h2: 15 },
  medium: { body: 14, h2: 17 },
  large:  { body: 16, h2: 19 },
};

// ── Template Header Estimates (in px) ──

interface TemplateProfile {
  regime: 'regular' | 'background';
  /** Extra px beyond line_h_h2 for section title (margins + borders + padding) */
  h2ExtraPx: number;
  /** Estimated header block height in px (name + contacts + divider) */
  headerPx: number;
  /** Per contact-grid row height in px (for personal_info grid) */
  contactRowPx: number;
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const TEMPLATE_PROFILES: Record<string, TemplateProfile> = {
  minimal:       { regime: 'regular', h2ExtraPx: 8,  headerPx: 85,  contactRowPx: 21 },
  ats:           { regime: 'regular', h2ExtraPx: 9,  headerPx: 104, contactRowPx: 21 },
  classic:       { regime: 'regular', h2ExtraPx: 13, headerPx: 135, contactRowPx: 21 },
  professional:  { regime: 'regular', h2ExtraPx: 12, headerPx: 139, contactRowPx: 21 },
  'minimal-blue':  { regime: 'regular', h2ExtraPx: 18, headerPx: 158, contactRowPx: 21 },
  'standard-blue': { regime: 'regular', h2ExtraPx: 7,  headerPx: 146, contactRowPx: 21 },
  modern:        { regime: 'background', h2ExtraPx: 12, headerPx: 183, contactRowPx: 21 },
};

function getProfile(template: string): TemplateProfile {
  return TEMPLATE_PROFILES[template] ?? {
    regime: BACKGROUND_TEMPLATES.has(template) ? 'background' : 'regular',
    h2ExtraPx: 12, headerPx: 120, contactRowPx: 21,
  };
}

// ── Core Budget Formula ──

function estimateContentLines(
  theme: typeof DEFAULT_THEME,
  template: string,
  sectionCount: number,
  contactRowCount: number,
): { contentLines: number; charsEn: number; charsZh: number; lineHBody: number; usableH: number } {
  const profile = getProfile(template);
  const scale = FONT_SCALE[theme.fontSize] || FONT_SCALE.medium;
  const lineHBody = scale.body * theme.lineSpacing;
  const lineHH2 = scale.h2 * theme.lineSpacing;
  const m = theme.margin;

  const usableH = profile.regime === 'background'
    ? A4_HEIGHT
    : A4_HEIGHT - m.top - m.bottom;

  const headerPx = profile.headerPx + (contactRowCount > 0 ? contactRowCount * profile.contactRowPx : 0);
  const secOverhead = lineHH2 + profile.h2ExtraPx + theme.sectionSpacing;
  const fixed = headerPx + sectionCount * secOverhead;
  const contentLines = Math.floor((usableH - fixed) / lineHBody);

  const contentW = A4_WIDTH - m.left - m.right;
  const charsEn = Math.floor(contentW / (scale.body * 0.55));
  const charsZh = Math.floor(contentW / (scale.body * 1.0));

  return { contentLines, charsEn, charsZh, lineHBody, usableH };
}

// ── Per-Section Line Estimation ──

function estimateSectionLines(section: any, charsPerLine: number, lang: string): number {
  const c = section.content;
  if (!c) return 0;

  const cpL = lang === 'zh' ? Math.floor(charsPerLine * 0.55) : charsPerLine;

  switch (section.type) {
    case 'summary': {
      const text = (c as any).text || '';
      return Math.max(1, Math.ceil(text.length / cpL));
    }
    case 'work_experience': {
      let lines = 0;
      for (const item of (c.items || [])) {
        lines += 1; // header row
        if (item.department) lines += 0.5 as unknown as number; // department line (shared with header)
        if (item.description) lines += Math.max(1, Math.ceil(item.description.length / cpL));
        if (item.technologies?.length) lines += 1;
        for (const h of (item.highlights || [])) {
          lines += lang === 'zh' ? 2 : Math.max(1, Math.ceil(h.length / cpL));
        }
        for (const proj of (item.projects || [])) {
          lines += 1; // project name
          for (const h of (proj.highlights || [])) {
            lines += lang === 'zh' ? 2 : Math.max(1, Math.ceil(h.length / cpL));
          }
        }
      }
      return Math.ceil(lines);
    }
    case 'education': {
      let lines = 0;
      for (const item of (c.items || [])) {
        lines += 1; // header
        if (item.gpa || item.description) lines += 1;
        for (const h of (item.highlights || [])) {
          lines += lang === 'zh' ? 2 : Math.max(1, Math.ceil(h.length / cpL));
        }
      }
      return lines;
    }
    case 'projects': {
      let lines = 0;
      for (const item of (c.items || [])) {
        lines += 1; // header
        if (item.description) lines += Math.ceil(item.description.length / cpL);
        if (item.technologies?.length) lines += 1;
        for (const h of (item.highlights || [])) {
          lines += lang === 'zh' ? 2 : Math.max(1, Math.ceil(h.length / cpL));
        }
      }
      return lines;
    }
    case 'skills': {
      const cats = (c as any).categories || [];
      return Math.max(1, cats.length);
    }
    case 'certifications':
    case 'languages':
    case 'github':
    case 'custom':
    case 'qr_codes': {
      const items = c.items || [];
      return Math.max(0, items.length);
    }
    default:
      return 1;
  }
}

// ── Main Entry Point ──

export function validateResumeBudget(
  resume: {
    template: string;
    themeConfig?: any;
    language?: string;
    sections: any[];
  },
): BudgetPreflightResult {
  const theme = { ...DEFAULT_THEME, ...(resume.themeConfig || {}),
    margin: { ...DEFAULT_THEME.margin, ...(resume.themeConfig?.margin || {}) },
  };
  const template = resume.template || 'classic';
  const lang = resume.language || 'zh';
  const profile = getProfile(template);

  const visibleSections = (resume.sections || []).filter((s: any) =>
    s.visible !== false && s.type !== 'personal_info' && !isSectionEmpty(s),
  );

  // Count contact rows for header estimate
  const pi = resume.sections.find((s: any) => s.type === 'personal_info');
  const contactCount = pi?.content
    ? [pi.content.phone, pi.content.email, pi.content.wechat, pi.content.location,
       pi.content.github, pi.content.linkedin, pi.content.gender, pi.content.age,
       pi.content.ethnicity, pi.content.politicalStatus, pi.content.hometown,
       pi.content.maritalStatus, pi.content.yearsOfExperience, pi.content.educationLevel,
      ].filter(Boolean).length
    : 0;
  const contactRows = Math.ceil(contactCount / 2); // 2-column grid

  const { contentLines, charsEn, charsZh, lineHBody, usableH } = estimateContentLines(
    theme, template, visibleSections.length, contactRows,
  );

  const cpL = lang === 'zh' ? charsZh : charsEn;

  // Estimate each section
  const breakdown: { section: string; lines: number }[] = [];
  let totalEstimated = 0;
  for (const section of visibleSections) {
    const lines = estimateSectionLines(section, cpL, lang);
    breakdown.push({ section: section.title || section.type, lines });
    totalEstimated += lines;
  }

  const warnings: BudgetWarning[] = [];
  const utilization = contentLines > 0 ? totalEstimated / contentLines : 0;
  const emptyLines = Math.max(0, contentLines - totalEstimated);

  // Overflow (>10% over capacity) — hard block, can't fix with margin/font tweaks alone
  if (totalEstimated > contentLines * 1.1) {
    warnings.push({
      severity: 'overflow',
      section: '(total)',
      message: `Estimated ${totalEstimated} lines exceeds capacity by >10% (${contentLines} lines, ${Math.round(utilization * 100)}% fill, +${totalEstimated - contentLines} over) — trim content before export`,
      excess: totalEstimated - contentLines,
    });
  } else if (totalEstimated > contentLines) {
    // Within 10% overflow — fixable via margin/font adjustments
    warnings.push({
      severity: 'tight',
      section: '(total)',
      message: `Estimated ${totalEstimated} lines slightly over capacity (${contentLines} lines, +${totalEstimated - contentLines} over, ${Math.round((utilization - 1) * 100)}%) — try reducing margins or font size`,
    });
  }

  // Sparse — content does not fill the page. Resume taboo: must be full.
  if (utilization < 0.85) {
    warnings.push({
      severity: 'sparse',
      section: '(total)',
      message: `Content fills only ${Math.round(utilization * 100)}% of the page (${totalEstimated}/${contentLines} lines, ~${emptyLines} empty lines) — resume must be full, expand content or switch to a denser template`,
    });
  } else if (utilization < 0.95) {
    warnings.push({
      severity: 'tight',
      section: '(total)',
      message: `Content at ${Math.round(utilization * 100)}% fill (${totalEstimated}/${contentLines} lines, ~${emptyLines} empty lines) — slight gap at bottom, consider adding a highlight or two`,
    });
  }

  // Per-section tight warnings
  for (const b of breakdown) {
    if (b.lines > 10) {
      warnings.push({
        severity: 'tight',
        section: b.section,
        message: `Section "${b.section}" uses ${b.lines} lines — consider trimming highlights or reducing items`,
      });
    }
  }

  return {
    ok: warnings.filter(w => w.severity === 'overflow' || w.severity === 'sparse').length === 0,
    template,
    contentLinesAvailable: contentLines,
    contentLinesEstimated: totalEstimated,
    charsPerLineEn: charsEn,
    charsPerLineZh: charsZh,
    warnings,
    breakdown,
  };
}

function isSectionEmpty(section: any): boolean {
  const c = section.content;
  if (!c) return true;
  if (section.type === 'summary') return !c.text;
  if (section.type === 'skills') {
    return !c.categories?.length || c.categories.every((cat: any) => !cat.skills?.length);
  }
  if ('items' in c) return !c.items?.length;
  return false;
}
