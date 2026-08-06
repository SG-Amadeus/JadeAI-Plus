#!/usr/bin/env tsx
import { JadeClient } from './client';
import { Output } from './output';
import { CliError, EX_USAGE } from './errors';
import { getTopHelp, getHelp } from './help';
import type { ParsedArgs } from './types';

// ── import all command handlers ──
import { templateList } from './commands/template';
import {
  resumeCreate, resumeList, resumeShow, resumeDerive, resumeDetach,
  resumeExport, resumeUpdate, resumeDuplicate, resumeDelete, resumeParse,
} from './commands/resume';
import {
  sectionList, sectionReorder, sectionUpdate, sectionAdd, sectionDelete,
} from './commands/section';
import {
  itemUpdate, itemReorder, itemAdd, itemDelete,
} from './commands/item';
import { ping } from './commands/ping';
import { start } from './commands/start';
import { pull } from './commands/pull';
import { push } from './commands/push';
import { profileList } from './commands/profile';

// ── Command registry (ordered by lifecycle) ──
interface CommandDef {
  path: string[];
  run: (client: JadeClient, out: Output, args: ParsedArgs) => Promise<void>;
}

const COMMANDS: CommandDef[] = [
  { path: ['ping'], run: ping },
  { path: ['start'], run: start },

  { path: ['template', 'list'], run: templateList },

  { path: ['profile', 'list'], run: profileList },

  { path: ['resume', 'create'], run: resumeCreate },
  { path: ['resume', 'derive'], run: resumeDerive },
  { path: ['resume', 'detach'], run: resumeDetach },
  { path: ['resume', 'show'], run: resumeShow },
  { path: ['resume', 'list'], run: resumeList },
  { path: ['resume', 'export'], run: resumeExport },
  { path: ['resume', 'update'], run: resumeUpdate },
  { path: ['resume', 'duplicate'], run: resumeDuplicate },
  { path: ['resume', 'delete'], run: resumeDelete },
  { path: ['resume', 'parse'], run: resumeParse },

  { path: ['pull'], run: pull },
  { path: ['push'], run: push },

  { path: ['section', 'list'], run: sectionList },
  { path: ['section', 'reorder'], run: sectionReorder },
  { path: ['section', 'update'], run: sectionUpdate },
  { path: ['section', 'add'], run: sectionAdd },
  { path: ['section', 'delete'], run: sectionDelete },

  { path: ['item', 'update'], run: itemUpdate },
  { path: ['item', 'reorder'], run: itemReorder },
  { path: ['item', 'add'], run: itemAdd },
  { path: ['item', 'delete'], run: itemDelete },
];

// ── Argument parser ──
function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let help = false;
  const repeatable: Record<string, number> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      help = true;
      continue;
    }
    if (arg === '-q' || arg === '--quiet') {
      flags.quiet = true;
      continue;
    }
    if (arg === '--json') {
      flags.json = true;
      continue;
    }
    if (arg === '--version') {
      flags.version = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      let key: string;
      let val: string | boolean = true;
      if (eqIdx !== -1) {
        key = arg.slice(2, eqIdx);
        val = arg.slice(eqIdx + 1);
      } else {
        key = arg.slice(2);
        // Peek next arg for value
        if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
          val = argv[++i];
        }
      }
      // Support repeatable flags: --section a --section b → section.0, section.1
      if (flags[key] !== undefined) {
        const idx = repeatable[key] || 0;
        flags[`${key}.${idx}`] = flags[key];
        delete flags[key];
        flags[key] = val;
        repeatable[key] = idx + 1;
      } else {
        flags[key] = val;
      }
    } else {
      positionals.push(arg);
    }
  }

  const baseUrl = (flags['base-url'] as string) || process.env.JADEAI_BASE_URL || 'http://localhost:3000';
  const fingerprint = (flags.fingerprint as string) || process.env.JADEAI_FINGERPRINT || 'demo-fingerprint';
  const json = flags.json === true;
  const quiet = flags.quiet === true;

  return {
    positionals,
    flags,
    global: { baseUrl, fingerprint, json, quiet },
    help,
  };
}

// ── Main ──
async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (args.flags.version) {
    console.log('jadeai CLI v0.1.0');
    process.exit(0);
  }

  const out = new Output({ json: args.global.json, quiet: args.global.quiet });

  // Find matching command
  const cmdPath = args.positionals;

  if (args.help || cmdPath.length === 0) {
    if (cmdPath.length > 0) {
      console.log(getHelp(cmdPath.join(' ')));
    } else {
      console.log(getTopHelp());
    }
    process.exit(0);
  }

  // Match command by longest path prefix
  let best: CommandDef | null = null;
  let bestLen = 0;
  for (const cmd of COMMANDS) {
    let match = true;
    for (let i = 0; i < cmd.path.length; i++) {
      if (cmdPath[i] !== cmd.path[i]) { match = false; break; }
    }
    if (match && cmd.path.length > bestLen) {
      best = cmd;
      bestLen = cmd.path.length;
    }
  }

  if (!best) {
    if (args.global.json) {
      out.error(`Unknown command: ${cmdPath.join(' ')}`);
    } else {
      out.failure(`Unknown command: ${cmdPath.join(' ')}`);
      console.error(getTopHelp());
    }
    process.exit(EX_USAGE);
  }

  const client = new JadeClient({ baseUrl: args.global.baseUrl, fingerprint: args.global.fingerprint });

  try {
    await best.run(client, out, args);
    process.exit(0);
  } catch (err) {
    if (err instanceof CliError) {
      if (args.global.json) {
        out.error(err.message, err.status);
      } else {
        out.failure(err.message);
      }
      process.exit(err.code);
    }
    throw err; // Unexpected — let it crash with stack trace
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
