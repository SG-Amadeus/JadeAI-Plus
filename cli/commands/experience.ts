import { readFileSync } from 'fs';
import { JadeClient } from '../client';
import { Output } from '../output';
import { usageError } from '../errors';
import type { ParsedArgs } from '../types';

interface ExperienceEntry {
  id: string;
  userId: string;
  type: 'work' | 'project' | 'internship';
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function resolveData(raw: string): Record<string, unknown> {
  if (raw.startsWith('@')) {
    return JSON.parse(readFileSync(raw.slice(1), 'utf-8'));
  }
  return JSON.parse(raw);
}

/** List all experiences, optionally filtered by type. */
export async function experienceList(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const list = await client.get<ExperienceEntry[]>('/api/experience');
  const filterType = args.flags.type as string | undefined;
  const filtered = filterType
    ? list.filter((e) => e.type === filterType)
    : list;
  out.result(filtered);
}

/** Show a single experience entry. */
export async function experienceShow(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('experience show <id> — id is required');
  const entry = await client.get<ExperienceEntry>(`/api/experience/${id}`);
  out.result(entry);
}

/** Create a new experience entry. */
export async function experienceCreate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const type = args.flags.type as string | undefined;
  const raw = args.flags.data as string | undefined;

  if (!type || !['work', 'project', 'internship'].includes(type)) {
    throw usageError('experience create --type <work|project|internship> --data <json|@file.json>');
  }
  if (!raw) {
    throw usageError('experience create requires --data (inline JSON or @file.json)');
  }

  let data: Record<string, unknown>;
  try {
    data = resolveData(raw);
  } catch {
    throw usageError('Invalid JSON in --data');
  }

  const entry = await client.post<ExperienceEntry>('/api/experience', { type, data });
  out.result(entry);
}

/** Update an experience entry (partial merge on data). */
export async function experienceUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('experience update <id> — id is required');

  const type = args.flags.type as string | undefined;
  const raw = args.flags.data as string | undefined;

  if (!type && raw === undefined) {
    throw usageError('experience update requires at least one of --type or --data');
  }

  if (type && !['work', 'project', 'internship'].includes(type)) {
    throw usageError('--type must be work, project, or internship');
  }

  const body: Record<string, unknown> = {};
  if (type) body.type = type;
  if (raw !== undefined) {
    try {
      body.data = resolveData(raw);
    } catch {
      throw usageError('Invalid JSON in --data');
    }
  }

  const updated = await client.put<ExperienceEntry>(`/api/experience/${id}`, body);
  out.result(updated);
}

/** Delete an experience entry. */
export async function experienceDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('experience delete <id> — id is required');

  if (!args.flags.force) {
    throw usageError('experience delete requires --force to confirm');
  }

  await client.del(`/api/experience/${id}`);
  out.success(`Experience ${id} deleted`);
}
