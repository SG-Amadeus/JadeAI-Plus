import { JadeClient } from '../client';
import { Output } from '../output';
import type { ParsedArgs } from '../types';

/**
 * List profile codenames — the ONLY profile command exposed to CLI.
 *
 * Personal profile DATA (fullName, email, phone, etc.) is managed
 * exclusively through the web UI. No CLI command exists to create,
 * read, update, or delete profile data. This is a security boundary:
 * AI agents driving the CLI can reference codenames but cannot
 * access personal information.
 */
export async function profileList(client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const data = await client.get<Array<{ id: string; codename: string }>>('/api/profile/codenames');
  out.result(data);
}
