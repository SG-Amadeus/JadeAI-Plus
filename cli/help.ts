const LONGEST_PATH = 17; // "resume duplicate".length

function hdr(title: string): string {
  return `\n\x1b[1m${title}\x1b[0m`;
}

function cmd(name: string, desc: string, pad = LONGEST_PATH): string {
  return `  \x1b[36m${name.padEnd(pad)}\x1b[0m  ${desc}`;
}

export const HELP_TOP = `jadeai — Resume lifecycle CLI for AI agents

Usage:  jadeai [global-flags] <command> [args...]

Global flags (before or after command):
  --base-url <url>       Server URL (env JADEAI_BASE_URL; default http://localhost:3000)
  --fingerprint <fp>     Auth fingerprint (env JADEAI_FINGERPRINT; required)
  --json                 Machine-readable output: {"ok":true,"data":...}
  --quiet, -q            Suppress progress messages on stderr
  -h, --help             Show this help
  --version              Print version

Command groups (in lifecycle order):`;

export const HELP_TEMPLATE = `${cmd('template list', 'Browse available templates')}`;

export const HELP_RESUME = [
  cmd('resume create', 'Create a root resume (step 2)'),
  cmd('resume derive', 'Branch a derivative from a root (step 3)'),
  cmd('resume detach', 'Promote derivative to standalone root'),
  cmd('resume show', 'Inspect a resume (merged view)'),
  cmd('resume export', 'Export to PDF/HTML/DOCX/TXT'),
  '',
  cmd('resume list', 'List all resumes (roots + derivatives)'),
  cmd('resume update', 'Update title/template/theme'),
  cmd('resume delete', 'Delete a resume (--force for roots with derivatives)'),
  cmd('resume duplicate', 'Duplicate a resume'),
  cmd('resume parse', 'Parse PDF/image into a new resume'),
].join('\n');

export const HELP_SECTION = [
  cmd('section list', 'List sections of a resume'),
  cmd('section reorder', 'Change section display order (step 7)'),
  cmd('section update', 'Update section title/visibility/content'),
  cmd('section add', 'Add a new section'),
  cmd('section delete', 'Delete a section'),
].join('\n');

export const HELP_PING = `${cmd('ping', 'Test connectivity to the JadeAI server')}`;
export const HELP_START = `${cmd('start', 'Start the dev server (pnpm dev)')}`;

export const HELP_PROFILE = [
  cmd('profile list', 'List profile codenames (PI managed in web UI only)'),
].join('\n');

export const HELP_EXPERIENCE = [
  cmd('experience list', 'List all experiences (--type work|project|internship)'),
  cmd('experience show', 'Get a single experience by id'),
  cmd('experience create', 'Create an experience (--type, --data <json|@file>)'),
  cmd('experience update', 'Update an experience (--type, --data)'),
  cmd('experience delete', 'Delete an experience (--force)'),
].join('\n');

export const HELP_IMPORT = [
  cmd('pull', 'Export resume sections to local JSON files'),
  cmd('push', 'Sync local JSON changes back to server'),
].join('\n');

export const HELP_ITEM = [
  cmd('item update', 'Fine-tune one item in a section (step 9a)'),
  cmd('item reorder', 'Reorder items within a section (step 9b)'),
  cmd('item add', 'Add an item to a section'),
  cmd('item delete', 'Delete an item from a section'),
].join('\n');

export function getTopHelp(): string {
  return [HELP_TOP, '', hdr('Infra'), HELP_PING, HELP_START, '', hdr('Template'), HELP_TEMPLATE, '', hdr('Profile'), HELP_PROFILE, '', hdr('Experience'), HELP_EXPERIENCE, '', hdr('Import/Export'), HELP_IMPORT, '', hdr('Resume'), HELP_RESUME, '', hdr('Section'), HELP_SECTION, '', hdr('Item'), HELP_ITEM, '', `Run 'jadeai <command> --help' for detailed usage.`].join('\n');
}

// ── Per-command help strings ──

export const CMD_HELP: Record<string, string> = {
  ping: `Test connectivity to the JadeAI server.

Usage: jadeai ping

Reports server version, authenticated user, and latency.
Exit code 0 = success, 2 = network error (server unreachable), 3 = API error (auth failed).`,

  start: `Start the JadeAI dev server.

Usage: jadeai start [options]

Options:
  --port <port>  Port to listen on (default: 3000)

Runs 'pnpm dev' and waits for the server to become ready.
Press Ctrl+C to stop.`,

  'template list': `List available resume templates.

Usage: jadeai template list [options]

Options:
  --json   Machine-readable output
  --locale en|zh   Language for template names (default: zh)`,

  'resume create': `Create a new empty resume.

Usage: jadeai resume create --title <t> [options]

Options:
  --title <t>          Resume title (required)
  --template <id>      Template id (default: classic)
  --language <lang>    Content language: zh|en (default: zh)
  --profile <codename> Personal profile codename to prefill personal_info
  --sections <file>    JSON file with initial sections
  --json               Machine-readable output`,

  'resume derive': `Create a derivative resume from a root. Personal info is inherited from the root.

Usage: jadeai resume derive <root-id> [options]

Options:
  --title <t>       Derivative title (default: "<root-title> (派生)")
  --template <id>   Template id (default: same as root)
  --language <lang> Language zh|en (default: same as root)
  --json            Machine-readable output`,

  'resume detach': `Detach a derivative from its root, materializing personal info as its own data.

Usage: jadeai resume detach <resume-id> [options]

Options:
  --json   Machine-readable output`,

  'resume show': `Show resume details. Derivatives include the root's personal info as an inherited section.

Usage: jadeai resume show <resume-id> [options]

Options:
  --json          Machine-readable output (full resume object)
  --section <id>  Only show this section`,

  'resume export': `Export resume to file.

Usage: jadeai resume export <resume-id> --format <fmt> [options]

Options:
  --format json|html|txt|docx|pdf   Export format (required)
  --out <file>       Output file path (default: resume-<id>.<ext>)
  --fit-one-page     Scale PDF to fit one page (PDF only)
  --for-print        Print-optimized layout (HTML only)
  --json             Return JSON with file path info`,

  pull: `Export resume sections to local JSON files for editing.

Usage: jadeai pull <resume-id> --out <dir>

Options:
  --out <dir>  Output directory (required)

Writes one <section-type>.json file per section. Skips inherited sections on derivatives.`,

  push: `Sync local JSON changes back to the server.

Usage: jadeai push <resume-id> --from <dir>

Options:
  --from <dir>  Directory containing the JSON files (required)

Reads <type>.json files, matches them to sections by type, and updates the server.`,

  'profile list': `List personal profile codenames.

Usage: jadeai profile list [options]

Options:
  --json   Machine-readable output

Returns codenames and IDs only. Personal profile DATA (fullName, email, phone, etc.)
is managed exclusively through the web UI. No CLI commands exist to read or write
profile data — this is a security boundary for AI agents.`,

  'experience list': `List experience library entries.

Usage: jadeai experience list [options]

Options:
  --type work|project|internship   Filter by type (optional)
  --json                           Machine-readable output

Returns all experience entries for the authenticated user. Each entry includes
id, type, data, and timestamps. The data field contains type-specific fields
(company/position for work/internship, name/url for projects).`,

  'experience show': `Show a single experience entry.

Usage: jadeai experience show <id>

Options:
  --json   Machine-readable output

Returns the full experience entry including all data fields and internal notes.`,

  'experience create': `Create a new experience entry.

Usage: jadeai experience create --type <type> --data <json|@file>

Options:
  --type work|project|internship   Experience type (required)
  --data <json>                    Inline JSON data (required)
  --data @path/to/file.json        Read data from file
  --json                           Machine-readable output

Examples:
  jadeai experience create --type work --data '{"company":"Acme","position":"Engineer"}'
  jadeai experience create --type project --data @./project.json`,

  'experience update': `Update an experience entry (partial merge).

Usage: jadeai experience update <id> [options]

Options:
  --type work|project|internship   Change experience type
  --data <json|@file>              Merge new fields into data (partial update)
  --json                           Machine-readable output

At least one of --type or --data is required. The --data is merged into the
existing data, so you only need to send the fields you want to change.

Example:
  jadeai experience update abc123 --data '{"description":"Updated description"}'`,

  'experience delete': `Delete an experience entry.

Usage: jadeai experience delete <id> --force

Options:
  --force   Required confirmation flag
  --json    Machine-readable output

The --force flag is required to prevent accidental deletion.`,

  'section reorder': `Reorder sections of a resume.

Usage: jadeai section reorder <resume-id> --order <id,id,...> [options]

Options:
  --order <ids>   Comma-separated section ids in desired order (required)
  --json          Machine-readable output`,

};

export function getHelp(path: string): string {
  // Try exact match first, then partial
  for (const [key, help] of Object.entries(CMD_HELP)) {
    if (key === path) return help;
  }
  // Try as prefix — find the most specific match
  let best = '';
  for (const key of Object.keys(CMD_HELP)) {
    if (path.startsWith(key) && key.length > best.length) {
      best = key;
    }
  }
  if (best) return CMD_HELP[best];
  return getTopHelp();
}
