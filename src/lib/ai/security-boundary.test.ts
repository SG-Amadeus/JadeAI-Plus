import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

const AI_DIRS = [
  'src/app/api/ai',
  'src/lib/ai',
  'src/app/api/interview',
];

const FORBIDDEN = [
  'personal_profiles',
  'personalProfiles',
  'profile.repository',
  'profileRepository',
  "from '@/lib/db/repositories/profile.repository'",
  './profile.repository',
];

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  const fullPath = join(PROJECT_ROOT, dir);
  if (!existsSync(fullPath)) return results;

  const entries = readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(fullPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(join(dir, entry.name)));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(entryPath);
    }
  }
  return results;
}

describe('AI security boundary', () => {
  const files: string[] = [];
  for (const dir of AI_DIRS) {
    files.push(...collectFiles(dir));
  }

  it('AI and interview directories exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relativePath = file.replace(PROJECT_ROOT + '/', '');
    it(`${relativePath} must not import profile.repository`, () => {
      const content = readFileSync(file, 'utf-8');
      for (const forbidden of FORBIDDEN) {
        if (content.includes(forbidden)) {
          // Some patterns are ok in comments/test files
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(forbidden)) {
              // Skip if it's in a comment, docstring, or test file
              const trimmed = lines[i].trim();
              if (
                trimmed.startsWith('//') ||
                trimmed.startsWith('*') ||
                trimmed.startsWith('/*') ||
                file.endsWith('.test.ts')
              ) {
                continue;
              }
              expect.fail(
                `${relativePath}:${i + 1} contains forbidden reference "${forbidden}"\n  ${lines[i].trim()}\n\nAI routes must never import or reference the personal_profiles table or profile.repository. Use the denormalized resumes.profileCodename column instead.`
              );
            }
          }
        }
      }
    });
  }
});
