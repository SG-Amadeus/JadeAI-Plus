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
  severity: 'overflow' | 'truncation' | 'tight';
  section: string;
  field?: string;
  message: string;
  /** Estimated lines over capacity (overflow only) */
  excess?: number;
  /** Character count vs limit (truncation only) */
  chars?: number;
  limit?: number;
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
  /** Templates with CSS truncation on inline fields */
  hasTruncation: boolean;
  /** Content width reduction factor for truncation (padding as fraction of A4) */
  contentPadX: number;
  /** Max-width percentages for truncated fields */
  truncation: {
    companyPos: number;   // max-w-% for company/position
    department: number;   // max-w-% for department
    projectName: number;  // max-w-% for project name
    url: number;          // max-w-% for URL
  };
}

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const TEMPLATE_PROFILES: Record<string, TemplateProfile> = {
  minimal: {
    regime: 'regular', h2ExtraPx: 8, headerPx: 85, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
  },
  ats: {
    regime: 'regular', h2ExtraPx: 9, headerPx: 104, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
  },
  classic: {
    regime: 'regular', h2ExtraPx: 13, headerPx: 135, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
  },
  professional: {
    regime: 'regular', h2ExtraPx: 12, headerPx: 139, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
  },
  'minimal-blue': {
    regime: 'regular', h2ExtraPx: 18, headerPx: 158, contactRowPx: 21,
    hasTruncation: true, contentPadX: 57, // px-[15mm] ≈ 57px per side
    truncation: { companyPos: 42, department: 36, projectName: 35, url: 45 },
  },
  'standard-blue': {
    regime: 'regular', h2ExtraPx: 7, headerPx: 146, contactRowPx: 21,
    hasTruncation: true, contentPadX: 38, // px-[10mm] ≈ 38px per side
    truncation: { companyPos: 40, department: 34, projectName: 35, url: 45 },
  },
  modern: {
    regime: 'background', h2ExtraPx: 12, headerPx: 183, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
  },
};

function getProfile(template: string): TemplateProfile {
  return TEMPLATE_PROFILES[template] ?? {
    regime: BACKGROUND_TEMPLATES.has(template) ? 'background' : 'regular',
    h2ExtraPx: 12, headerPx: 120, contactRowPx: 21,
    hasTruncation: false, contentPadX: 0,
    truncation: { companyPos: 100, department: 100, projectName: 100, url: 100 },
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

// ── Per-Field Truncation Check ──

function checkFieldTruncation(
  template: string,
  theme: typeof DEFAULT_THEME,
  sections: any[],
  lang: string,
): BudgetWarning[] {
  const profile = getProfile(template);
  if (!profile.hasTruncation) return [];

  const scale = FONT_SCALE[theme.fontSize] || FONT_SCALE.medium;
  const m = theme.margin;
  // Content area width after template padding
  const contentW = A4_WIDTH - m.left - m.right - profile.contentPadX * 2;
  const glyphWidth = lang === 'zh' ? scale.body * 1.0 : scale.body * 0.55;

  function charLimit(pct: number): number {
    return Math.floor((contentW * pct / 100) / glyphWidth);
  }

  const warnings: BudgetWarning[] = [];

  for (const section of sections) {
    const c = section.content;
    if (!c?.items) continue;

    if (section.type === 'work_experience') {
      for (let i = 0; i < c.items.length; i++) {
        const item = c.items[i];
        const prefix = `${section.title}[${i}]`;

        // Company name or position (left slot) — whichever is longer
        const leftField = item.company || item.position || '';
        const leftLimit = charLimit(profile.truncation.companyPos);
        if (leftField.length > leftLimit) {
          warnings.push({
            severity: 'truncation',
            section: section.title,
            field: `${prefix}.company`,
            message: `Company/position "${leftField.slice(0, 20)}…" is ${leftField.length} chars, limit ${leftLimit} — will be truncated in ${template}`,
            chars: leftField.length,
            limit: leftLimit,
          });
        }

        // Department (middle slot)
        if (item.department) {
          const deptLimit = charLimit(profile.truncation.department);
          if (item.department.length > deptLimit) {
            warnings.push({
              severity: 'truncation',
              section: section.title,
              field: `${prefix}.department`,
              message: `Department "${item.department.slice(0, 20)}…" is ${item.department.length} chars, limit ${deptLimit} — will be truncated in ${template}`,
              chars: item.department.length,
              limit: deptLimit,
            });
          }
        }

        // Position (when separate from company)
        if (item.company && item.position) {
          const posLimit = charLimit(profile.truncation.department); // same slot
          if (item.position.length > posLimit) {
            warnings.push({
              severity: 'truncation',
              section: section.title,
              field: `${prefix}.position`,
              message: `Position "${item.position.slice(0, 20)}…" is ${item.position.length} chars, limit ${posLimit} — will be truncated in ${template}`,
              chars: item.position.length,
              limit: posLimit,
            });
          }
        }
      }
    }

    if (section.type === 'projects') {
      for (let i = 0; i < c.items.length; i++) {
        const item = c.items[i];
        const prefix = `${section.title}[${i}]`;

        const nameLimit = charLimit(profile.truncation.projectName);
        if (item.name && item.name.length > nameLimit) {
          warnings.push({
            severity: 'truncation',
            section: section.title,
            field: `${prefix}.name`,
            message: `Project name "${item.name.slice(0, 20)}…" is ${item.name.length} chars, limit ${nameLimit} — will be truncated in ${template}`,
            chars: item.name.length,
            limit: nameLimit,
          });
        }

        if (item.url) {
          const urlLimit = charLimit(profile.truncation.url);
          if (item.url.length > urlLimit) {
            warnings.push({
              severity: 'truncation',
              section: section.title,
              field: `${prefix}.url`,
              message: `URL "${item.url.slice(0, 30)}…" is ${item.url.length} chars, limit ${urlLimit} — will be truncated in ${template}`,
              chars: item.url.length,
              limit: urlLimit,
            });
          }
        }
      }
    }
  }

  return warnings;
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

  // Overflow warning
  if (totalEstimated > contentLines) {
    warnings.push({
      severity: 'overflow',
      section: '(total)',
      message: `Estimated ${totalEstimated} content lines exceeds template capacity of ${contentLines} lines (${template}, ${theme.fontSize}, lineSpacing ${theme.lineSpacing})`,
      excess: totalEstimated - contentLines,
    });
  } else if (totalEstimated >= contentLines - 1) {
    warnings.push({
      severity: 'tight',
      section: '(total)',
      message: `Estimated ${totalEstimated} content lines is within 1 line of capacity (${contentLines}) — verify with export`,
    });
  }

  // Per-field truncation warnings
  const truncationWarnings = checkFieldTruncation(template, theme, visibleSections, lang);
  warnings.push(...truncationWarnings);

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
    ok: warnings.filter(w => w.severity === 'overflow').length === 0,
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
