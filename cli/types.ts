export interface CliResult<T = unknown> {
  ok: true;
  data: T;
}

export interface CliErrorResult {
  ok: false;
  error: string;
  status?: number;
}

export type CliOutput<T = unknown> = CliResult<T> | CliErrorResult;

export interface ParsedArgs {
  /** Positional arguments: command sub-path tokens */
  positionals: string[];
  /** Named flags: --flag=value or --flag → true */
  flags: Record<string, string | boolean>;
  /** Global flags hoisted from anywhere on the command line */
  global: {
    baseUrl: string;
    fingerprint: string;
    json: boolean;
    quiet: boolean;
  };
  /** --help flag set */
  help: boolean;
}

export interface JadeClientOpts {
  baseUrl: string;
  fingerprint: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
