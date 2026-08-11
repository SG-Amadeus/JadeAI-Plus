import type { CliOutput } from './types';

const isTTY = process.stdout.isTTY;

function dim(s: string) { return isTTY ? `\x1b[2m${s}\x1b[0m` : s; }
function red(s: string) { return isTTY ? `\x1b[31m${s}\x1b[0m` : s; }
function green(s: string) { return isTTY ? `\x1b[32m${s}\x1b[0m` : s; }
function bold(s: string) { return isTTY ? `\x1b[1m${s}\x1b[0m` : s; }

export interface OutputOpts {
  json: boolean;
  quiet: boolean;
}

export class Output {
  private opts: OutputOpts;

  constructor(opts: OutputOpts) {
    this.opts = opts;
  }

  /** Print a result to stdout (JSON mode) or pass through for human formatting */
  result<T>(data: T): void {
    const out: CliOutput<T> = { ok: true, data };
    console.log(JSON.stringify(out));
  }

  error(message: string, status?: number): void {
    const out = { ok: false as const, error: message, ...(status ? { status } : {}) };
    console.log(JSON.stringify(out));
  }

  /** Human-formatted line (only when not --json) */
  line(text = ''): void {
    if (!this.opts.json) console.log(text);
  }

  keyValue(key: string, value: string): void {
    if (!this.opts.json) console.log(`  ${dim(key + ':')} ${value}`);
  }

  table(headers: string[], rows: string[][]): void {
    if (this.opts.json) return;
    const cols = headers.map((h, i) => {
      const w = Math.max(h.length, ...rows.map(r => (r[i] || '').length));
      return { header: h, width: w };
    });
    const sep = cols.map(c => '-'.repeat(c.width)).join('  ');
    const header = cols.map(c => c.header.padEnd(c.width)).join('  ');
    console.log(dim(header));
    console.log(dim(sep));
    for (const row of rows) {
      console.log(row.map((v, i) => (v || '').padEnd(cols[i].width)).join('  '));
    }
  }

  section(title: string): void {
    if (!this.opts.json) console.log(`\n${bold(title)}`);
  }

  /** Progress message to stderr (not affected by --json) */
  progress(msg: string): void {
    if (!this.opts.quiet) process.stderr.write(`${dim(msg)}\n`);
  }

  success(msg: string): void {
    if (!this.opts.json) console.log(green(`✓ ${msg}`));
  }

  failure(msg: string): void {
    if (!this.opts.json) console.error(red(`✗ ${msg}`));
  }

  warn(msg: string): void {
    if (!this.opts.json) console.error(dim(`⚠ ${msg}`));
  }

  /** Print result in JSON mode, or just output raw text in human mode */
  text(data: string): void {
    if (this.opts.json) {
      console.log(JSON.stringify({ ok: true, data }));
    } else {
      console.log(data);
    }
  }
}
