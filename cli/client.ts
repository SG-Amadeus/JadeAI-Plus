import { CliError, apiError, networkError } from './errors';
import type { JadeClientOpts, HttpMethod, CliOutput } from './types';

export class JadeClient {
  private baseUrl: string;
  private fingerprint: string;

  constructor(opts: JadeClientOpts) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.fingerprint = opts.fingerprint;
  }

  async request<T = unknown>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'x-fingerprint': this.fingerprint,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err: any) {
      throw networkError(`Cannot reach ${url}: ${err.message || err}`);
    }

    // Export and other binary endpoints return raw bytes
    const ct = res.headers.get('content-type') || '';

    if (!res.ok) {
      let msg = `${method} ${path} → ${res.status}`;
      if (ct.includes('application/json')) {
        try {
          const errBody = await res.json();
          if (errBody.error) msg = errBody.error;
        } catch { /* ignore parse failure */ }
      }
      if (res.status === 401) msg += ' (check JADEAI_FINGERPRINT)';
      throw apiError(msg, res.status);
    }

    if (ct.includes('application/json')) {
      return (await res.json()) as T;
    }

    // Non-JSON response (export, etc.) — return the response itself for streaming/binary handling
    return res as unknown as T;
  }

  async get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async del<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /** Fetch raw bytes (for export) */
  async fetchBlob(path: string): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const url = `${this.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'x-fingerprint': this.fingerprint },
      });
    } catch (err: any) {
      throw networkError(`Cannot reach ${url}: ${err.message || err}`);
    }

    if (!res.ok) {
      let msg = `GET ${path} → ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody.error) msg = errBody.error;
      } catch { /* ignore */ }
      if (res.status === 401) msg += ' (check JADEAI_FINGERPRINT)';
      throw apiError(msg, res.status);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const disp = res.headers.get('content-disposition') || '';
    const m = disp.match(/filename="?([^"]+)"?/);
    return {
      data: buf,
      filename: m?.[1] || 'export',
      contentType: res.headers.get('content-type') || 'application/octet-stream',
    };
  }

}
