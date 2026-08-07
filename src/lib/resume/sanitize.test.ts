import { describe, it, expect } from 'vitest';
import { sanitizeSectionsForAI, stripPersonalInfoForAI, PII_STRIP_FIELDS } from './sanitize';

const fullPersonalInfo = {
  fullName: 'Zhang San',
  jobTitle: 'Senior Engineer',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  wechat: 'zhangsan_wx',
  location: 'Beijing',
  hometown: 'Shanghai',
  website: 'https://zhangsan.dev',
  linkedin: 'https://linkedin.com/in/zhangsan',
  github: 'https://github.com/zhangsan',
  customLinks: [{ label: 'Blog', url: 'https://blog.example.com' }],
  avatar: 'data:image/png;base64,AAAA...',
  age: '28',
  gender: 'male',
  ethnicity: 'Han',
  politicalStatus: 'None',
  maritalStatus: 'single',
  yearsOfExperience: '8',
  educationLevel: 'Bachelor',
};

describe('sanitizeSectionsForAI', () => {
  it('strips all T1/T2 fields from personal_info', () => {
    const sections = [{ type: 'personal_info', content: { ...fullPersonalInfo } }];
    const result = sanitizeSectionsForAI(sections);
    const content = result[0].content as Record<string, unknown>;

    for (const field of PII_STRIP_FIELDS) {
      expect(content).not.toHaveProperty(field);
    }
  });

  it('keeps T3 fields in personal_info', () => {
    const sections = [{ type: 'personal_info', content: { ...fullPersonalInfo } }];
    const result = sanitizeSectionsForAI(sections);
    const content = result[0].content as Record<string, unknown>;

    expect(content.jobTitle).toBe('Senior Engineer');
    expect(content.yearsOfExperience).toBe('8');
    expect(content.educationLevel).toBe('Bachelor');
  });

  it('leaves non-personal_info sections unchanged', () => {
    const workSection = { type: 'work_experience', title: 'Experience', content: { items: [{ id: 'w1', company: 'ACME' }] } };
    const sections = [
      { type: 'personal_info', content: { ...fullPersonalInfo } },
      workSection,
    ];
    const result = sanitizeSectionsForAI(sections);
    expect(result[1]).toBe(workSection);
  });

  it('preserves section metadata (id, title, type)', () => {
    const section = { id: 'sec-1', type: 'personal_info', title: 'Basic Info', sortOrder: 0, content: { ...fullPersonalInfo } };
    const result = sanitizeSectionsForAI([section]);
    expect(result[0].id).toBe('sec-1');
    expect(result[0].type).toBe('personal_info');
    expect(result[0].title).toBe('Basic Info');
  });

  it('does not mutate the input', () => {
    const sections = [{ type: 'personal_info', content: { ...fullPersonalInfo } }];
    const frozen = JSON.stringify(sections);
    sanitizeSectionsForAI(sections);
    expect(JSON.stringify(sections)).toBe(frozen);
  });

  it('handles null content', () => {
    const sections = [{ type: 'personal_info', content: null }];
    expect(() => sanitizeSectionsForAI(sections)).not.toThrow();
    expect(sanitizeSectionsForAI(sections)[0].content).toBeNull();
  });

  it('handles empty object content', () => {
    const sections = [{ type: 'personal_info', content: {} }];
    const result = sanitizeSectionsForAI(sections);
    expect(result[0].content).toEqual({});
  });

  it('handles non-object content gracefully', () => {
    const sections = [{ type: 'personal_info', content: 'string' }];
    const result = sanitizeSectionsForAI(sections);
    expect(result[0].content).toBe('string');
  });
});

describe('stripPersonalInfoForAI', () => {
  it('returns sanitized content and stripped fields', () => {
    const { content, stripped } = stripPersonalInfoForAI({ ...fullPersonalInfo });
    const c = content as Record<string, unknown>;

    for (const field of PII_STRIP_FIELDS) {
      expect(c).not.toHaveProperty(field);
      expect(stripped).toHaveProperty(field);
    }
  });

  it('round-trips: stripped fields can be merged back to reconstruct original', () => {
    const original = { ...fullPersonalInfo };
    const { content, stripped } = stripPersonalInfoForAI(original);
    const merged = { ...(content as Record<string, unknown>), ...stripped };
    expect(merged).toEqual(original);
  });

  it('strips location as T2 PII', () => {
    const { content, stripped } = stripPersonalInfoForAI({ jobTitle: 'Dev', location: 'NYC' });
    expect(content).toEqual({ jobTitle: 'Dev' });
    expect(stripped).toEqual({ location: 'NYC' });
  });

  it('handles null/undefined gracefully', () => {
    expect(stripPersonalInfoForAI(null)).toEqual({ content: null, stripped: {} });
    expect(stripPersonalInfoForAI(undefined)).toEqual({ content: undefined, stripped: {} });
  });
});
