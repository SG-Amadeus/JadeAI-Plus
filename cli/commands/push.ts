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

  // Get current resume (sections + profile binding)
  const resume = await client.get<{ sections: Section[]; profileCodename?: string | null }>(`/api/resume/${id}`);
  const typeToId = new Map<string, string>();
  for (const s of resume.sections) {
    typeToId.set(s.type, s.id);
  }

  let count = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const type = basename(file, '.json');

    if (type === 'personal_info' && resume.profileCodename) {
      out.progress(`Skipping ${file}: personal_info is managed by profile "${resume.profileCodename}"`);
      continue;
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
