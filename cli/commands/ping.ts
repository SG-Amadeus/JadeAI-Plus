import { JadeClient } from '../client';
import { Output } from '../output';
import { networkError, apiError, EX_API } from '../errors';
import type { ParsedArgs } from '../types';

export async function ping(client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const start = Date.now();
  try {
    const data = await client.get<{ ok: boolean; version: string; user: { id: string; name: string | null }; timestamp: string }>('/api/ping');
    const elapsed = Date.now() - start;
    if (data.ok) {
      out.result({ ...data, latencyMs: elapsed });
    } else {
      throw apiError('Ping returned unexpected response', 200);
    }
  } catch (err: any) {
    const elapsed = Date.now() - start;
    if (err.code === EX_API) {
      err.message = `${err.message} (${elapsed}ms)`;
      throw err;
    }
    throw networkError(`Cannot reach server (${elapsed}ms): ${err.message || err}`);
  }
}
