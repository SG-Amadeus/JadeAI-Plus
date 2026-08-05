import { JadeClient } from '../client';
import { Output } from '../output';
import { getAliases, setAlias, removeAlias } from '../config';
import { usageError } from '../errors';
import type { ParsedArgs } from '../types';

export async function aliasAdd(_client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const name = args.positionals[2];
  const id = args.positionals[3];
  if (!name) throw usageError('alias name is required');
  if (!id) throw usageError('resume-id is required');

  setAlias(name, id);
  out.success(`Alias "${name}" → ${id}`);
}

export async function aliasList(_client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const aliases = getAliases();
  const entries = Object.entries(aliases);
  if (entries.length === 0) {
    out.line('No aliases defined. Use `jadeai alias <name> <resume-id>` to create one.');
    return;
  }
  out.line('Aliases:');
  for (const [name, id] of entries) {
    out.keyValue(name, id);
  }
}

export async function aliasRemove(_client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const name = args.positionals[2];
  if (!name) throw usageError('alias name is required');

  if (removeAlias(name)) {
    out.success(`Alias "${name}" removed`);
  } else {
    throw usageError(`Alias "${name}" not found`);
  }
}
