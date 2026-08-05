import { JadeClient } from '../client';
import { Output } from '../output';
import type { ParsedArgs } from '../types';

export async function ping(client: JadeClient, out: Output, _args: ParsedArgs): Promise<void> {
  const start = Date.now();
  try {
    const data = await client.get<{ ok: boolean; version: string; user: { id: string; name: string | null }; timestamp: string }>('/api/ping');
    const elapsed = Date.now() - start;
    if (data.ok) {
      out.result({ ...data, latencyMs: elapsed });
    } else {
      out.error('Ping returned unexpected response');
    }
  } catch (err: any) {
    const elapsed = Date.now() - start;
    if (err?.code === 3) {
      // API error — server responded but auth failed or other issue
      out.error(`Server responded (${elapsed}ms) but: ${err.message}`);
    } else {
      out.error(`Cannot reach server (${elapsed}ms): ${err.message || err}`);
    }
  }
}
