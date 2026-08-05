import { basename } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { readJsonFile, writeOutput } from './util';
import { usageError, apiError } from '../errors';
import { resolveAlias, setAlias } from '../config';
import type { ParsedArgs } from '../types';

function toAlias(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── create ──

export async function resumeCreate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const title = args.flags.title as string;
  if (!title) throw usageError('--title is required');
  const template = (args.flags.template as string) || 'classic';
  const language = (args.flags.language as string) || 'zh';
  const sectionsFile = args.flags.sections as string | undefined;

  const body: Record<string, unknown> = { title, template, language };
  if (sectionsFile) {
    body.sections = readJsonFile(sectionsFile);
  }

  const data = await client.post<{ id: string }>('/api/resume', body);
  const alias = toAlias(title);
  setAlias(alias, data.id);
  out.progress(`Alias "${alias}" → ${data.id}`);
  out.result(data);
}

// ── list ──

export async function resumeList(client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const data = await client.get<Array<{ id: string; title: string; parentId?: string | null }>>('/api/resume');
  out.result(data);
}

// ── show ──

export async function resumeShow(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const data = await client.get<{ id: string; title: string; parentId?: string | null }>(`/api/resume/${resolveAlias(id)}`);
  out.result(data);
}

// ── derive ──

export async function resumeDerive(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('root-resume-id or alias is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;
  if (args.flags.template) body.template = args.flags.template;
  if (args.flags.language) body.language = args.flags.language;

  const data = await client.post(`/api/resume/${resolveAlias(id)}/derive`, body);
  out.result(data);
}

// ── detach ──

export async function resumeDetach(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const data = await client.post(`/api/resume/${resolveAlias(id)}/detach`);
  out.result(data);
}

// ── export ──

export async function resumeExport(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const format = args.flags.format as string;
  if (!format) throw usageError('--format <json|html|txt|docx|pdf> is required');

  const params = new URLSearchParams({ format });
  if (args.flags['fit-one-page']) params.set('fitOnePage', 'true');
  if (args.flags['for-print']) params.set('forPrint', 'true');

  const { data: buf, filename } = await client.fetchBlob(`/api/resume/${resolveAlias(id)}/export?${params}`);
  const outFile = (args.flags.out as string | undefined) || filename;
  writeOutput(buf, outFile);
  out.success(`Exported to ${outFile}`);
}

// ── update ──

export async function resumeUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;
  if (args.flags.template) body.template = args.flags.template;
  if (args.flags.theme) {
    body.themeConfig = readJsonFile(args.flags.theme as string);
  }
  if (Object.keys(body).length === 0) throw usageError('at least one of --title, --template, --theme is required');

  const data = await client.put(`/api/resume/${resolveAlias(id)}`, body);
  out.result(data);
}

// ── duplicate ──

export async function resumeDuplicate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;

  const data = await client.post(`/api/resume/${resolveAlias(id)}/duplicate`, body);
  out.result(data);
}

// ── delete ──

export async function resumeDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id or alias is required');
  const rid = resolveAlias(id);
  const force = args.flags.force === true;
  const path = force ? `/api/resume/${rid}?force=true` : `/api/resume/${rid}`;
  try {
    await client.del(path);
    out.success(`Resume ${id} deleted`);
  } catch (err: any) {
    if (err?.status === 409) {
      throw usageError(`${err.message}. Use --force to delete all derivatives.`);
    }
    throw err;
  }
}

// ── parse ──

export async function resumeParse(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const filePath = args.positionals[2];
  if (!filePath) throw usageError('file path is required');

  const { readFileSync } = await import('fs');
  const file = readFileSync(filePath);

  // Use FormData via the API
  const url = `${process.env.JADEAI_BASE_URL || 'http://localhost:3000'}/api/resume/parse`;
  const form = new FormData();
  form.append('file', new Blob([file]), basename(filePath));
  if (args.flags.template) form.append('template', args.flags.template as string);
  if (args.flags.language) form.append('language', args.flags.language as string);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-fingerprint': args.global.fingerprint },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `${res.status}` }));
    throw apiError(err.error || 'Parse failed', res.status);
  }
  const data = await res.json();
  out.result(data);
}
