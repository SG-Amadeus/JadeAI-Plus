import { spawn } from 'child_process';
import { JadeClient } from '../client';
import { Output } from '../output';
import type { ParsedArgs } from '../types';

export async function start(_client: JadeClient, out: Output, args: ParsedArgs): Promise<void> {
  const port = (args.flags.port as string) || '3000';
  const baseUrl = `http://localhost:${port}`;

  out.progress(`Starting JadeAI-Plus server on ${baseUrl} ...`);

  const child = spawn('pnpm', ['dev', '--port', port], {
    stdio: 'inherit',
  });

  // Poll until server responds
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`${baseUrl}/api/ping`);
      if (res.ok) {
        out.success(`Server ready at ${baseUrl}`);
        break;
      }
    } catch {
      // not ready yet
    }
  }

  // Wait for the child process (foreground until Ctrl+C)
  await new Promise<void>((resolve) => {
    child.on('exit', (code) => {
      if (code) out.progress(`Server exited (code ${code})`);
      resolve();
    });
  });
}
