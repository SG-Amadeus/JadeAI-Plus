import { readFileSync } from 'fs';
import { JadeClient } from '../client';
import { Output } from '../output';
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
  if (!id) {
    out.failure('experience show <id> — id is required');
    process.exit(1);
  }
  const entry = await client.get<ExperienceEntry>(`/api/experience/${id}`);
  out.result(entry);
}

/** Create a new experience entry. */
export async function experienceCreate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const type = args.flags.type as string | undefined;
  const raw = args.flags.data as string | undefined;

  if (!type || !['work', 'project', 'internship'].includes(type)) {
    out.failure('experience create --type <work|project|internship> --data <json|@file.json>');
    process.exit(1);
  }
  if (!raw) {
    out.failure('experience create requires --data (inline JSON or @file.json)');
    process.exit(1);
  }

  let data: Record<string, unknown>;
  try {
    data = resolveData(raw);
  } catch {
    out.failure('Invalid JSON in --data');
    process.exit(1);
  }

  const entry = await client.post<ExperienceEntry>('/api/experience', { type, data });
  out.result(entry);
}

/** Update an experience entry (partial merge on data). */
export async function experienceUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) {
    out.failure('experience update <id> — id is required');
    process.exit(1);
  }

  const type = args.flags.type as string | undefined;
  const raw = args.flags.data as string | undefined;

  if (!type && raw === undefined) {
    out.failure('experience update requires at least one of --type or --data');
    process.exit(1);
  }

  if (type && !['work', 'project', 'internship'].includes(type)) {
    out.failure('--type must be work, project, or internship');
    process.exit(1);
  }

  const body: Record<string, unknown> = {};
  if (type) body.type = type;
  if (raw !== undefined) {
    try {
      body.data = resolveData(raw);
    } catch {
      out.failure('Invalid JSON in --data');
      process.exit(1);
    }
  }

  const updated = await client.put<ExperienceEntry>(`/api/experience/${id}`, body);
  out.result(updated);
}

/** Delete an experience entry. */
export async function experienceDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) {
    out.failure('experience delete <id> — id is required');
    process.exit(1);
  }

  if (!args.flags.force) {
    out.failure('experience delete requires --force to confirm');
    process.exit(1);
  }

  await client.del(`/api/experience/${id}`);
  out.success(`Experience ${id} deleted`);
}
