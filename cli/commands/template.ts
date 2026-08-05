import { JadeClient } from '../client';
import { Output } from '../output';
import type { ParsedArgs } from '../types';

export async function templateList(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const locale = (args.flags.locale as string) || 'zh';
  const data = await client.get<{ templates: { id: string; name: string }[] }>(`/api/templates?locale=${locale}`);
  out.result(data.templates);
}
