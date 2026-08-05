import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { resolveAlias } from '../config';
import { usageError } from '../errors';
import type { ParsedArgs } from '../types';

interface Section {
  id: string;
  type: string;
}

export async function push(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const aliasOrId = args.positionals[1];
  if (!aliasOrId) throw usageError('alias or resume-id is required');
  const fromDir = args.flags.from as string;
  if (!fromDir) throw usageError('--from <dir> is required');

  const id = resolveAlias(aliasOrId);
  const dir = resolve(fromDir);
  if (!existsSync(dir)) throw usageError(`Directory not found: ${dir}`);

  // Get current sections to map type → section-id
  const resume = await client.get<{ sections: Section[] }>(`/api/resume/${id}`);
  const typeToId = new Map<string, string>();
  for (const s of resume.sections) {
    typeToId.set(s.type, s.id);
  }

  let count = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const type = basename(file, '.json');

    const sid = typeToId.get(type);
    if (!sid) {
      out.progress(`Skipping ${file}: no section of type "${type}" in resume`);
      continue;
    }

    const content = JSON.parse(readFileSync(resolve(dir, file), 'utf-8'));
    await client.put(`/api/resume/${id}/sections/${sid}`, { content });
    out.progress(`Updated ${type}`);
    count++;
  }

  out.success(`Pushed ${count} sections to "${aliasOrId}" from ${dir}/`);
}
