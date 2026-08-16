import { basename } from 'path';
import { JadeClient } from '../client';
import { Output } from '../output';
import { readJsonFile, writeOutput } from './util';
import { usageError, apiError } from '../errors';
import type { ParsedArgs } from '../types';

// ── create ──

export async function resumeCreate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const title = args.flags.title as string;
  if (!title) throw usageError('--title is required');
  const template = (args.flags.template as string) || 'minimal-blue';
  const language = (args.flags.language as string) || 'zh';
  const profileCodename = args.flags.profile as string | undefined;
  const sectionsFile = args.flags.sections as string | undefined;
  const experienceIds = args.flags['experience-ids'] as string | undefined;
  const outDir = args.flags.out as string | undefined;

  const body: Record<string, unknown> = { title, template, language };
  if (profileCodename) body.profileCodename = profileCodename;
  if (sectionsFile) {
    body.sections = readJsonFile(sectionsFile);
  }
  if (experienceIds) {
    body.experienceIds = experienceIds.split(',').map((id) => id.trim()).filter(Boolean);
  }

  const data = await client.post<{ id: string }>('/api/resume', body);
  out.result(data);

  // Auto-pull to folder if --out is provided
  if (outDir) {
    // Dynamic import to avoid circular dependency
    const { pull } = await import('./pull');
    // Synthesize args for pull: positionals = ['pull', <id>], flags = { out: <dir> }
    const pullArgs: ParsedArgs = {
      positionals: ['pull', data.id],
      flags: { out: outDir },
      global: args.global,
      help: false,
    };
    await pull(client, out, pullArgs);
  }
}

// ── list ──

export async function resumeList(client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const data = await client.get<Array<{ id: string; title: string; parentId?: string | null }>>('/api/resume');
  out.result(data);
}

// ── show ──

function maskPersonalInfo(data: any): any {
  return {
    ...data,
    sections: (data.sections || []).map((s: any) =>
      s.type === 'personal_info'
        ? { ...s, content: { profileCodename: data.profileCodename ?? null } }
        : s
    ),
  };
}

export async function resumeShow(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');
  const data = await client.get<any>(`/api/resume/${id}`);

  // Mask personal_info content — CLI never sees PII
  const safe = maskPersonalInfo(data);

  const sectionFilter = args.flags.section as string | undefined;
  if (sectionFilter && safe.sections) {
    const section = safe.sections.find((s: any) => s.id === sectionFilter || s.type === sectionFilter);
    if (!section) throw usageError(`Section not found: ${sectionFilter}`);
    out.result(section);
  } else {
    out.result(safe);
  }
}

// ── derive ──

export async function resumeDerive(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('root-resume-id is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;
  if (args.flags.template) body.template = args.flags.template;
  if (args.flags.language) body.language = args.flags.language;

  const data = await client.post(`/api/resume/${id}/derive`, body);
  out.result(data);
}

// ── detach ──

export async function resumeDetach(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');
  const data = await client.post(`/api/resume/${id}/detach`);
  out.result(data);
}

// ── export ──

export async function resumeExport(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');
  const format = args.flags.format as string;
  if (!format) throw usageError('--format <json|html|txt|docx|pdf> is required');

  const params = new URLSearchParams({ format });
  if (args.flags['fit-one-page']) params.set('fitOnePage', 'true');
  if (args.flags['for-print']) params.set('forPrint', 'true');

  const { data: buf, filename, headers } = await client.fetchBlob(`/api/resume/${id}/export?${params}`);
  const outFile = (args.flags.out as string | undefined) || filename;
  writeOutput(buf, outFile);

  // Budget callback from export headers
  const budgetOk = headers.get('X-Budget-Ok');
  const budgetFill = headers.get('X-Budget-Fill');
  const budgetLines = headers.get('X-Budget-Lines');
  const budgetWarnings = headers.get('X-Budget-Warnings');
  const budgetInfo: Record<string, unknown> = { file: outFile, format, size: buf.length };
  if (budgetOk !== null) {
    budgetInfo.budget = {
      ok: budgetOk === 'true',
      fill: budgetFill || '?',
      lines: budgetLines || '?',
      warnings: budgetWarnings ? budgetWarnings.split(',').filter(Boolean) : [],
    };
  }
  out.result(budgetInfo);

  // Budget hints for the user / AI
  if (budgetWarnings) {
    const severities = budgetWarnings.split(',').filter(Boolean);
    if (severities.includes('overflow')) {
      out.warn(`BUDGET OVERFLOW: content exceeds page capacity (${budgetLines}, ${budgetFill} fill). Trim content or reduce font size.`);
    }
    if (severities.includes('sparse')) {
      out.warn(`BUDGET SPARSE: content under-fills the page (${budgetLines}, ${budgetFill} fill). Resume must be full — expand content or switch template.`);
    }
    if (severities.includes('tight') && !severities.includes('overflow') && !severities.includes('sparse')) {
      out.warn(`BUDGET TIGHT: ${budgetLines} lines, ${budgetFill} fill — verify with export.`);
    }
  }

  if (budgetOk === 'true') {
    out.success(`Exported to ${outFile}`);
  }
}

// ── update ──

export async function resumeUpdate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;
  if (args.flags.template) body.template = args.flags.template;
  if (args.flags.theme) {
    body.themeConfig = readJsonFile(args.flags.theme as string);
  }
  if (Object.keys(body).length === 0) throw usageError('at least one of --title, --template, --theme is required');

  const data = await client.put(`/api/resume/${id}`, body);
  out.result(data);
}

// ── duplicate ──

export async function resumeDuplicate(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');

  const body: Record<string, unknown> = {};
  if (args.flags.title) body.title = args.flags.title;

  const data = await client.post(`/api/resume/${id}/duplicate`, body);
  out.result(data);
}

// ── delete ──

export async function resumeDelete(client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const id = args.positionals[2];
  if (!id) throw usageError('resume-id is required');
  const force = args.flags.force === true;
  const path = force ? `/api/resume/${id}?force=true` : `/api/resume/${id}`;
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

  // Use FormData via the API — raw fetch needed for multipart file upload
  const url = `${args.global.baseUrl}/api/resume/parse`;
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
