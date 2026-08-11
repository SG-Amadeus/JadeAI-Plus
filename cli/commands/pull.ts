import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { usageError } from '../errors';
import { writeOutput } from './util';
import type { ParsedArgs } from '../types';

interface Section {
  id: string;
  type: string;
  title: string;
  content: unknown;
  inherited?: boolean;
}

export async function pull(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[1];
  if (!id) throw usageError('resume-id is required');
  const outDir = args.flags.out as string;
  if (!outDir) throw usageError('--out <dir> is required');

  const resume = await client.get<{
    id: string;
    title: string;
    template: string;
    themeConfig?: Record<string, unknown>;
    sections: Section[];
    profileCodename?: string | null;
  }>(`/api/resume/${id}`);

  const dir = resolve(outDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let count = 0;
  for (const section of resume.sections) {
    if (section.inherited) continue;
    // Personal info never leaves the server — write only a profile reference
    if (section.type === 'personal_info') continue;
    const file = resolve(dir, `${section.type}.json`);
    writeOutput(JSON.stringify(section.content, null, 2), file);
    out.progress(`Wrote ${section.type}.json`);
    count++;
  }

  // Write theme.json alongside section JSONs for CLI layout adjustment
  if (resume.themeConfig) {
    // Normalize: DB may store as string or already-parsed object
    const tc = typeof resume.themeConfig === 'string'
      ? JSON.parse(resume.themeConfig)
      : resume.themeConfig;
    const themeFile = resolve(dir, 'theme.json');
    writeOutput(JSON.stringify(tc, null, 2), themeFile);
    out.progress('Wrote theme.json');
  }

  // Write profile reference if bound
  if (resume.profileCodename) {
    const profileFile = resolve(dir, '_profile.txt');
    writeOutput(resume.profileCodename + '\n', profileFile);
    out.progress(`Wrote _profile.txt (profile: ${resume.profileCodename})`);
  }

  out.success(`Pulled ${count} sections from "${id}" to ${dir}/`);
}
