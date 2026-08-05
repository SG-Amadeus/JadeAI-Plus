import { JadeClient } from '../client';
import { Output } from '../output';
import { readJsonFile, parseCsv } from './util';
import { usageError } from '../errors';
import { resolveAlias } from '../config';
import type { ParsedArgs } from '../types';

export async function sectionList(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const resume = await client.get<{ sections: { id: string; type: string; title: string; sortOrder: number }[] }>(`/api/resume/${resolveAlias(id)}`);
  out.result(resume.sections);
}

export async function sectionReorder(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const orderFlag = args.flags.order as string;
  if (!orderFlag) throw usageError('--order <id,id,...> is required');

  const sectionIds = orderFlag.startsWith('[')
    ? readJsonFile<string[]>(orderFlag)
    : parseCsv(orderFlag);

  const data = await client.put(`/api/resume/${resolveAlias(id)}/sections/reorder`, { sectionIds });
  out.result(data);
}

export async function sectionUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  if (!id || !sid) throw usageError('resume-id and section-id are required');

  const body: Record<string, unknown> = {};
  if (args.flags.title !== undefined) body.title = args.flags.title;
  if (args.flags.visible !== undefined) body.visible = args.flags.visible === 'true';
  if (args.flags.content) body.content = readJsonFile(args.flags.content as string);

  if (Object.keys(body).length === 0) throw usageError('at least one of --title, --visible, --content is required');

  const data = await client.put(`/api/resume/${resolveAlias(id)}/sections/${sid}`, body);
  out.result(data);
}

export async function sectionAdd(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const type = args.flags.type as string;
  const title = args.flags.title as string;
  if (!type || !title) throw usageError('--type and --title are required');

  const body: Record<string, unknown> = { type, title };
  if (args.flags.content) body.content = readJsonFile(args.flags.content as string);

  const data = await client.post(`/api/resume/${resolveAlias(id)}/sections`, body);
  out.result(data);
}

export async function sectionDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  if (!id || !sid) throw usageError('resume-id and section-id are required');
  await client.del(`/api/resume/${resolveAlias(id)}/sections/${sid}`);
  out.success(`Section ${sid} deleted`);
}
