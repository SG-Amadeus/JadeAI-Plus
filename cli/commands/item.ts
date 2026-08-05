import { JadeClient } from '../client';
import { Output } from '../output';
import { readJsonFile, parseCsv } from './util';
import { usageError } from '../errors';
import { resolveAlias } from '../config';
import type { ParsedArgs } from '../types';

export async function itemUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  const iid = args.positionals[4];
  if (!id || !sid || !iid) throw usageError('resume-id, section-id, and item-id are required');

  const fieldsFlag = args.flags.fields as string;
  if (!fieldsFlag) throw usageError('--fields \'{"key":"value"}\' or --fields <json-file> is required');

  const fields = fieldsFlag.startsWith('{')
    ? JSON.parse(fieldsFlag)
    : readJsonFile(fieldsFlag);

  const data = await client.put(`/api/resume/${resolveAlias(id)}/sections/${sid}/items/${iid}`, { fields });
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

  const data = await client.put(`/api/resume/${resolveAlias(id)}/sections/${sid}/items/reorder`, { itemIds });
  out.result(data);
}

export async function itemAdd(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  if (!id || !sid) throw usageError('resume-id and section-id are required');
  const itemFlag = args.flags.item as string;
  if (!itemFlag) throw usageError('--item \'{"key":"value"}\' or --item <json-file> is required');

  const item = itemFlag.startsWith('{')
    ? JSON.parse(itemFlag)
    : readJsonFile(itemFlag);

  const data = await client.post(`/api/resume/${resolveAlias(id)}/sections/${sid}/items`, item);
  out.result(data);
}

export async function itemDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  const sid = args.positionals[3];
  const iid = args.positionals[4];
  if (!id || !sid || !iid) throw usageError('resume-id, section-id, and item-id are required');
  await client.del(`/api/resume/${resolveAlias(id)}/sections/${sid}/items/${iid}`);
  out.success(`Item ${iid} deleted`);
}
