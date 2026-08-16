// ── Section Content & ThemeConfig Validation ──
// Lightweight structural validation — catches malformed JSON from CLI push.
// Returns clear, actionable error messages so the user can fix the file.

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Helpers ──

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

// ── Section Content Validators ──

const SECTION_VALIDATORS: Record<string, (content: unknown) => string[]> = {
  summary(content) {
    // { text: string }
    if (!isObject(content)) return ['content must be an object'];
    return [];
  },

  work_experience(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!isArray(content.items)) return ['content.items must be an array'];
    for (let i = 0; i < (content.items as unknown[]).length; i++) {
      const item = (content.items as unknown[])[i];
      if (!isObject(item)) return [`items[${i}]: must be an object`];
      if (!isString(item.company)) return [`items[${i}]: company is required and must be a string`];
      if (!isString(item.position)) return [`items[${i}]: position is required and must be a string`];
      if (item.startDate !== undefined && !isString(item.startDate)) return [`items[${i}]: startDate must be a string`];
      if (item.endDate !== undefined && !isString(item.endDate)) return [`items[${i}]: endDate must be a string`];
      if (item.highlights !== undefined && !isArray(item.highlights)) return [`items[${i}]: highlights must be an array`];
      if (item.technologies !== undefined && !isArray(item.technologies)) return [`items[${i}]: technologies must be an array`];
    }
    return [];
  },

  education(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!isArray(content.items)) return ['content.items must be an array'];
    for (let i = 0; i < (content.items as unknown[]).length; i++) {
      const item = (content.items as unknown[])[i];
      if (!isObject(item)) return [`items[${i}]: must be an object`];
      if (!isString(item.institution)) return [`items[${i}]: institution is required and must be a string`];
      if (!isString(item.degree)) return [`items[${i}]: degree is required and must be a string`];
      if (item.highlights !== undefined && !isArray(item.highlights)) return [`items[${i}]: highlights must be an array`];
    }
    return [];
  },

  projects(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!isArray(content.items)) return ['content.items must be an array'];
    for (let i = 0; i < (content.items as unknown[]).length; i++) {
      const item = (content.items as unknown[])[i];
      if (!isObject(item)) return [`items[${i}]: must be an object`];
      if (!isString(item.name)) return [`items[${i}]: name is required and must be a string`];
      if (item.highlights !== undefined && !isArray(item.highlights)) return [`items[${i}]: highlights must be an array`];
      if (item.technologies !== undefined && !isArray(item.technologies)) return [`items[${i}]: technologies must be an array`];
    }
    return [];
  },

  skills(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.categories) return []; // allow missing categories (empty skills)
    if (!isArray(content.categories)) return ['content.categories must be an array'];
    for (let i = 0; i < (content.categories as unknown[]).length; i++) {
      const cat = (content.categories as unknown[])[i];
      if (!isObject(cat)) return [`categories[${i}]: must be an object`];
      if (cat.name !== undefined && !isString(cat.name)) return [`categories[${i}]: name must be a string`];
      if (cat.skills !== undefined && !isArray(cat.skills)) return [`categories[${i}]: skills must be an array`];
    }
    return [];
  },

  certifications(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.items) return [];
    if (!isArray(content.items)) return ['content.items must be an array'];
    return [];
  },

  languages(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.items) return [];
    if (!isArray(content.items)) return ['content.items must be an array'];
    return [];
  },

  github(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.items) return [];
    if (!isArray(content.items)) return ['content.items must be an array'];
    return [];
  },

  custom(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.items) return [];
    if (!isArray(content.items)) return ['content.items must be an array'];
    return [];
  },

  qr_codes(content) {
    if (!isObject(content)) return ['content must be an object'];
    if (!content.items) return [];
    if (!isArray(content.items)) return ['content.items must be an array'];
    return [];
  },

  personal_info() {
    // Never validated — managed through web UI, not CLI
    return [];
  },
};

export function validateSectionContent(type: string, content: unknown): ValidationResult {
  const validator = SECTION_VALIDATORS[type];
  if (!validator) {
    // Unknown section types pass through (extensibility)
    return { valid: true, errors: [] };
  }
  const errors = validator(content);
  return { valid: errors.length === 0, errors };
}

// ── ThemeConfig Validator ──

const VALID_FONT_SIZES = ['small', 'medium', 'large'];
const VALID_AVATAR_STYLES = ['circle', 'oneInch'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function validateThemeConfig(config: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(config)) return { valid: false, errors: ['themeConfig must be an object'] };

  if (config.primaryColor !== undefined) {
    if (!isString(config.primaryColor) || !HEX_RE.test(config.primaryColor)) {
      errors.push(`primaryColor must be a hex color like "#1a1a1a", got ${JSON.stringify(config.primaryColor)}`);
    }
  }
  if (config.accentColor !== undefined) {
    if (!isString(config.accentColor) || !HEX_RE.test(config.accentColor)) {
      errors.push(`accentColor must be a hex color like "#3b82f6", got ${JSON.stringify(config.accentColor)}`);
    }
  }
  if (config.fontFamily !== undefined && !isString(config.fontFamily)) {
    errors.push(`fontFamily must be a string, got ${JSON.stringify(config.fontFamily)}`);
  }
  if (config.fontSize !== undefined && !VALID_FONT_SIZES.includes(config.fontSize as string)) {
    errors.push(`fontSize must be one of: small, medium, large. Got ${JSON.stringify(config.fontSize)}`);
  }
  if (config.lineSpacing !== undefined) {
    if (!isNumber(config.lineSpacing)) {
      errors.push(`lineSpacing must be a number, got ${JSON.stringify(config.lineSpacing)}`);
    } else if (config.lineSpacing < 1.0 || config.lineSpacing > 3.0) {
      errors.push(`lineSpacing must be between 1.0 and 3.0, got ${config.lineSpacing}`);
    }
  }
  if (config.sectionSpacing !== undefined) {
    if (!isNumber(config.sectionSpacing)) {
      errors.push(`sectionSpacing must be a number (px), got ${JSON.stringify(config.sectionSpacing)}`);
    } else if (config.sectionSpacing < 0 || config.sectionSpacing > 64) {
      errors.push(`sectionSpacing must be between 0 and 64px, got ${config.sectionSpacing}`);
    }
  }
  if (config.margin !== undefined) {
    if (!isObject(config.margin)) {
      errors.push('margin must be an object with top/right/bottom/left numbers');
    } else {
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const v = (config.margin as Record<string, unknown>)[side];
        if (v !== undefined && !isNumber(v)) {
          errors.push(`margin.${side} must be a number (px), got ${JSON.stringify(v)}`);
        }
      }
    }
  }
  if (config.avatarStyle !== undefined && !VALID_AVATAR_STYLES.includes(config.avatarStyle as string)) {
    errors.push(`avatarStyle must be "circle" or "oneInch", got ${JSON.stringify(config.avatarStyle)}`);
  }

  // Warn about unknown keys (optional — helps catch typos)
  const knownKeys = ['primaryColor', 'accentColor', 'fontFamily', 'fontSize', 'lineSpacing', 'margin', 'sectionSpacing', 'avatarStyle'];
  for (const key of Object.keys(config)) {
    if (!knownKeys.includes(key)) {
      errors.push(`unknown theme field "${key}" — typo? Valid fields: ${knownKeys.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
