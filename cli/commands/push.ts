import { existsSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { usageError } from '../errors';
import { readJsonFile } from './util';
import type { ParsedArgs } from '../types';

interface Section {
  id: string;
  type: string;
}

export async function push(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[1];
  if (!id) throw usageError('resume-id is required');
  const fromDir = args.flags.from as string;
  if (!fromDir) throw usageError('--from <dir> is required');
  const dir = resolve(fromDir);
  if (!existsSync(dir)) throw usageError(`Directory not found: ${dir}`);

  // Get current resume sections
  const resume = await client.get<{ sections: Section[] }>(`/api/resume/${id}`);
  const typeToId = new Map<string, string>();
  for (const s of resume.sections) {
    typeToId.set(s.type, s.id);
  }

  let count = 0;

  // Handle theme.json first if present — one push syncs everything
  const themeFile = resolve(dir, 'theme.json');
  if (existsSync(themeFile)) {
    const themeConfig = readJsonFile(themeFile);
    await client.put(`/api/resume/${id}`, { themeConfig });
    out.progress('Updated theme');
  }

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    if (file === 'theme.json') continue; // handled above
    const type = basename(file, '.json');

    // Personal info is managed exclusively through the web UI (Profile page).
    // CLI never sends PII — reject any personal_info.json file.
    if (type === 'personal_info') {
      throw usageError(`${file} cannot be pushed: personal info is managed through the web UI (Profile page). Delete this file and use --profile to bind a profile instead.`);
    }

    const sid = typeToId.get(type);
    if (!sid) {
      out.progress(`Skipping ${file}: no section of type "${type}" in resume`);
      continue;
    }

    const content = readJsonFile(resolve(dir, file));
    await client.put(`/api/resume/${id}/sections/${sid}`, { content });
    out.progress(`Updated ${type}`);
    count++;
  }

  out.success(`Pushed ${count} sections to "${id}" from ${dir}/`);
}
