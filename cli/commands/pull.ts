import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { usageError } from '../errors';
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

  const resume = await client.get<{ id: string; title: string; sections: Section[] }>(`/api/resume/${id}`);

  const dir = resolve(outDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let count = 0;
  for (const section of resume.sections) {
    if (section.inherited) continue; // skip inherited personal_info on derivatives
    const file = resolve(dir, `${section.type}.json`);
    writeFileSync(file, JSON.stringify(section.content, null, 2));
    out.progress(`Wrote ${section.type}.json`);
    count++;
  }

  out.success(`Pulled ${count} sections from "${id}" to ${dir}/`);
}
