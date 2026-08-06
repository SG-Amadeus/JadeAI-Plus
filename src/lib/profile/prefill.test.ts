import { describe, it, expect } from 'vitest';
import { buildEducationContent, buildPersonalInfoContent } from './prefill';

describe('buildEducationContent', () => {
  it('maps valid education array to items with ids and empty highlights', () => {
    const data = {
      education: [
        { institution: 'Tsinghua', degree: 'Bachelor', field: 'CS', startDate: '2018-09', endDate: '2022-06', gpa: '3.8' },
      ],
    };
    const result = buildEducationContent(data);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].institution).toBe('Tsinghua');
    expect(result.items[0].degree).toBe('Bachelor');
    expect(result.items[0].field).toBe('CS');
    expect(result.items[0].gpa).toBe('3.8');
    expect(result.items[0].highlights).toEqual([]);
    expect(result.items[0].id).toBeTruthy();
  });

  it('returns empty items when education key is missing', () => {
    expect(buildEducationContent({})).toEqual({ items: [] });
  });

  it('returns empty items when education is null', () => {
    expect(buildEducationContent({ education: null })).toEqual({ items: [] });
  });

  it('returns empty items when education is not an array', () => {
    expect(buildEducationContent({ education: 'string' })).toEqual({ items: [] });
  });

  it('filters out non-object entries', () => {
    const data = {
      education: [
        { institution: 'Valid', degree: 'BS', field: 'Math', startDate: '', endDate: '' },
        null,
        'not an object',
      ],
    };
    const result = buildEducationContent(data as any);
    expect(result.items).toHaveLength(1);
  });

  it('filters out entries with no institution, degree, or field', () => {
    const data = {
      education: [
        { institution: '', degree: '', field: '', startDate: '', endDate: '' },
      ],
    };
    const result = buildEducationContent(data);
    expect(result.items).toHaveLength(0);
  });

  it('does not touch educationLevel in profile data', () => {
    const data = {
      educationLevel: 'Master',
      education: [
        { institution: 'PKU', degree: 'Master', field: 'AI', startDate: '', endDate: '' },
      ],
    };
    const result = buildEducationContent(data);
    expect(result.items).toHaveLength(1);
    // educationLevel is not consumed by buildEducationContent
  });

  it('coerces fields to strings', () => {
    const data = {
      education: [
        { institution: 123, degree: true, field: null, startDate: 2020, endDate: 2024 },
      ],
    };
    const result = buildEducationContent(data as any);
    expect(result.items[0].institution).toBe('123');
    expect(result.items[0].degree).toBe('true');
    expect(result.items[0].field).toBe('');
  });

  it('includes optional location and gpa when present', () => {
    const data = {
      education: [
        { institution: 'MIT', degree: 'PhD', field: 'Physics', startDate: '', endDate: '', location: 'Boston', gpa: '4.0' },
      ],
    };
    const result = buildEducationContent(data);
    expect(result.items[0].location).toBe('Boston');
    expect(result.items[0].gpa).toBe('4.0');
  });

  it('omits optional fields when absent', () => {
    const data = {
      education: [
        { institution: 'MIT', degree: 'PhD', field: 'Physics', startDate: '', endDate: '' },
      ],
    };
    const result = buildEducationContent(data);
    expect(result.items[0].location).toBeUndefined();
    expect(result.items[0].gpa).toBeUndefined();
  });
});

describe('buildPersonalInfoContent', () => {
  it('maps profile fields to personal info', () => {
    const data = { fullName: 'Test', jobTitle: 'Dev', email: 't@t.com', phone: '123', location: 'Nowhere' };
    const result = buildPersonalInfoContent(data);
    expect(result.fullName).toBe('Test');
    expect(result.jobTitle).toBe('Dev');
    expect(result.educationLevel).toBeUndefined();
  });

  it('passes through educationLevel', () => {
    const data = { fullName: 'T', jobTitle: 'D', email: 'e', phone: 'p', location: 'l', educationLevel: 'PhD' };
    const result = buildPersonalInfoContent(data);
    expect(result.educationLevel).toBe('PhD');
  });
});
