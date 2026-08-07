import { JadeClient } from '../client';
import { Output } from '../output';
import { readJsonFile, parseCsv } from './util';
import { usageError } from '../errors';
import type { ParsedArgs } from '../types';

export async function itemUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  const iid = args.positionals[4];
  if (!id || !sid || !iid) throw usageError('resume-id, section-id, and item-id are required');

  const fieldsFlag = args.flags.fields as string;
  if (!fieldsFlag) throw usageError('--fields \'{"key":"value"}\' or --fields @file.json is required');

  let fields: Record<string, unknown>;
  try {
    fields = fieldsFlag.startsWith('{')
      ? JSON.parse(fieldsFlag)
      : readJsonFile(fieldsFlag);
  } catch {
    throw usageError('Invalid JSON in --fields. Use inline JSON or @path/to/file.json');
  }

  const data = await client.put(`/api/resume/${id}/sections/${sid}/items/${iid}`, { fields });
  out.result(data);
}

export async function itemReorder(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  if (!id || !sid) throw usageError('resume-id and section-id are required');
  const orderFlag = args.flags.order as string;
  if (!orderFlag) throw usageError('--order <id,id,...> is required');

  const itemIds = orderFlag.startsWith('[')
    ? readJsonFile<string[]>(orderFlag)
    : parseCsv(orderFlag);

  const data = await client.put(`/api/resume/${id}/sections/${sid}/items/reorder`, { itemIds });
  out.result(data);
}

export async function itemAdd(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  if (!id || !sid) throw usageError('resume-id and section-id are required');
  const itemFlag = args.flags.item as string;
  if (!itemFlag) throw usageError('--item \'{"key":"value"}\' or --item @file.json is required');

  let item: Record<string, unknown>;
  try {
    item = itemFlag.startsWith('{')
      ? JSON.parse(itemFlag)
      : readJsonFile(itemFlag);
  } catch {
    throw usageError('Invalid JSON in --item. Use inline JSON or @path/to/file.json');
  }

  const data = await client.post(`/api/resume/${id}/sections/${sid}/items`, item);
  out.result(data);
}

export async function itemDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  const iid = args.positionals[4];
  if (!id || !sid || !iid) throw usageError('resume-id, section-id, and item-id are required');
  await client.del(`/api/resume/${id}/sections/${sid}/items/${iid}`);
  out.success(`Item ${iid} deleted`);
}
