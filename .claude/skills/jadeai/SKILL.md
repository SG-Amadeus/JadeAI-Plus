---
name: jadeai
description: Drive the full resume lifecycle via jadeai CLI. Use when the user asks to create, edit, export, or manage resumes programmatically — including template browsing, section/item CRUD, root/derivative branching, PDF export, profile codename listing, and experience library CRUD.
---

# jadeai — Resume Lifecycle CLI

## Quick Start

```bash
jadeai start &        # 1. Start the server
jadeai ping           # 2. Verify it's reachable
```

Auth defaults to `demo-fingerprint`. Override via `--fingerprint <fp>` only if using a different user.

## Setup (only if `jadeai: command not found`)

```bash
git clone <repo-url> jadeai && cd jadeai
pnpm install && pnpm setup && pnpm link --global
```

---

## Decision Tree: Which Command to Use

### "I want to see what templates are available"
→ `jadeai template list`

### "I want to create a new resume"
→ `jadeai resume create --title "..." --template <id>`
Creates a root resume.

### "I want to see all my resumes"
→ `jadeai resume list`

### "I want to export a resume to PDF/HTML/DOCX"
→ `jadeai resume export <resume-id> --format pdf --out file.pdf`

### "I need to bulk-edit resume content locally"
→ `jadeai pull <resume-id> --out <dir>` then `jadeai push <resume-id> --from <dir>`
Pull exports each section as `<type>.json`. User edits the files. Push syncs them back.

### "I want to tailor a resume for a specific job"
→ `jadeai resume derive <root-resume-id> --title "JD: Company X"`
Creates a derivative branch. Personal info inherited from root. Then pull/push to customize.

### "I want to make a derivative standalone"
→ `jadeai resume detach <resume-id>`

### "I want to change resume metadata (title, template)"
→ `jadeai resume update <resume-id> --title "..." --template <id>`

### "I want to duplicate a resume"
→ `jadeai resume duplicate <resume-id> --title "..."`

### "I want to delete a resume"
→ `jadeai resume delete <resume-id>`
Add `--force` if it has derivatives and you want cascade delete.

### "I want to parse a PDF/image into a new resume"
→ `jadeai resume parse <file> --template <id>`

### "I want to see a resume's sections"
→ `jadeai section list <resume-id>`

### "I want to add/update/delete/reorder sections"
→ `jadeai section add <resume-id> --type <type> --title "..."`
→ `jadeai section update <resume-id> <section-id> --content <json-file>`
→ `jadeai section delete <resume-id> <section-id>`
→ `jadeai section reorder <resume-id> --order <id,id,...>`

### "I want to add/update/delete/reorder items within a section"
→ `jadeai item add <resume-id> <section-id> --item '{"key":"value"}'`
→ `jadeai item update <resume-id> <section-id> <item-id> --fields '{"key":"value"}'`
→ `jadeai item delete <resume-id> <section-id> <item-id>`
→ `jadeai item reorder <resume-id> <section-id> --order <id,id,...>`

### "I want to reference a person's profile"
→ `jadeai profile list` — list profile codenames
→ `jadeai resume create --title "..." --profile <codename>` — create resume with profile pre-fill
→ Direct the user to fill profile data in the web UI at `/profiles`

### "I want to manage my experience library (work/internship/project records)"
→ `jadeai experience list [--type work|project|internship]` — list experiences
→ `jadeai experience show <id>` — inspect a single experience (includes internal notes)
→ `jadeai experience create --type <t> --data <json|@file>` — create a new entry
→ `jadeai experience update <id> [--type <t>] [--data <json|@file>]` — update an entry (partial merge)
→ `jadeai experience delete <id> --force` — delete an entry

### "I want to pre-fill a resume from my experience library"
→ Select experience IDs via `jadeai experience list`, then pass them to `jadeai resume create --experience-ids <id,id,...>`
→ The API strips internal `notes` before copying to resume sections

---

## Command Reference

All `<resume-id>` arguments accept a raw resume **UUID** (e.g. from `jadeai resume list`).

### Infra

```
jadeai start  [--port <port>]   Start dev server (default 3000)
jadeai ping                     Test connectivity + auth + latency
```

### Global Flags

```
--base-url <url>      Server URL (default: http://localhost:3000)
--fingerprint <fp>    Auth fingerprint (default: demo-fingerprint)
--json                Machine-readable output
--quiet, -q           Suppress progress messages
-h, --help            Show help
```

### Profile

```
jadeai profile list                      List profile codenames and IDs
```

Profile data (fullName, email, phone, etc.) is managed exclusively through the web UI at `/profiles`. No CLI commands exist to read or write profile data. The CLI may only list codenames and pass `--profile <codename>` to `resume create`.

### Experience

```
jadeai experience list   [--type work|project|internship]
jadeai experience show   <experience-id>
jadeai experience create --type <t> --data <json|@file>
jadeai experience update <experience-id> [--type <t>] [--data <json|@file>]
jadeai experience delete <experience-id> --force
```

Experience data is non-PII (work/project/internship records) and safe for AI/CLI access. These commands have full access to all fields including internal `notes`.

- `experience create` requires `--type` (work|project|internship) and `--data` (inline JSON or `@file.json`).
- `experience update` does a partial merge — only send fields you want to change. At least one of `--type` or `--data` is required.
- `experience delete` requires `--force` to prevent accidental deletion.
- The `notes` field on each entry is for AI reference only; it is automatically stripped when copying to a resume.

### Import / Export

```
jadeai pull <resume-id> --out <dir>    Export sections as <type>.json files
jadeai push <resume-id> --from <dir>   Read JSON files, sync to server
```

`pull` writes one file per section type (e.g. `work_experience.json`, `skills.json`). Inherited sections (derivative personal_info) are skipped.
`push` reads every `.json` in the directory, matches filename to section type, and updates the server via PUT.

### Template

```
jadeai template list [--locale zh|en]
```

### Resume

```
jadeai resume create    --title <t> [--template <id>] [--language zh|en] [--profile <codename>] [--sections <json-file>]
jadeai resume list
jadeai resume show      <resume-id>
jadeai resume update    <resume-id> [--title <t>] [--template <id>] [--theme <json-file>]
jadeai resume duplicate <resume-id> [--title <t>]
jadeai resume delete    <resume-id> [--force]
jadeai resume parse     <pdf-or-image-file> [--template <id>] [--language zh|en]
jadeai resume export    <resume-id> --format json|html|txt|docx|pdf [--out <file>] [--fit-one-page] [--for-print]
jadeai resume derive    <root-resume-id> --title <t> [--template <id>] [--language zh|en]
jadeai resume detach    <resume-id>
```

- `resume create` creates a new root resume.
- `resume show` for derivatives includes inherited `personal_info` section with `inherited: true`.
- `resume delete` returns 409 on roots with derivatives. Use `--force` to cascade.
- `resume derive` creates a JD-targeted branch. Only root resumes can be derived from.

### Section

```
jadeai section list    <resume-id>
jadeai section add     <resume-id> --type <type> --title <title> [--content <json-file>]
jadeai section update  <resume-id> <section-id> [--title <t>] [--visible true|false] [--content <json-file>]
jadeai section delete  <resume-id> <section-id>
jadeai section reorder <resume-id> --order <id,id,...>
```

### Item

```
jadeai item add     <resume-id> <section-id> --item '{"key":"value"}' | --item <json-file>
jadeai item update  <resume-id> <section-id> <item-id> --fields '{"key":"value"}' | --fields <json-file>
jadeai item delete  <resume-id> <section-id> <item-id>
jadeai item reorder <resume-id> <section-id> --order <id,id,...>
```

## Section Type Reference

| type | content shape |
|------|---------------|
| `personal_info` | `{fullName, jobTitle, email, phone, location, ...}` |
| `summary` | `{text}` |
| `work_experience` | `{items: [{id, company, position, startDate, endDate, current, description, technologies[], highlights[]}]}` |
| `education` | `{items: [{id, institution, degree, field, startDate, endDate, gpa, highlights[]}]}` |
| `skills` | `{categories: [{id, name, skills[]}]}` |
| `projects` | `{items: [{id, name, url, description, technologies[], highlights[]}]}` |
| `certifications` | `{items: [{id, name, issuer, date, url}]}` |
| `languages` | `{items: [{id, language, proficiency, description}]}` |
| `github` | `{items: [{id, repoUrl, name, stars, language, description}]}` |
| `custom` | `{items: [{id, title, subtitle, date, description}]}` |
| `qr_codes` | `{items: [{id, label, url}]}` |

## Experience Library Data Shapes

Experience entries (stored in `experiences` table, managed via `jadeai experience *`):

### work / internship

```json
{
  "company": "Acme Corp",
  "position": "Software Engineer",
  "startDate": "2023-01",
  "endDate": "2024-12",
  "current": false,
  "description": "Built and maintained...",
  "technologies": ["TypeScript", "React", "Node.js"],
  "highlights": ["Reduced latency by 40%", "Led team of 5"],
  "notes": "Internal context: this was a greenfield project..."
}
```

### project

```json
{
  "name": "Open Source Dashboard",
  "url": "https://github.com/user/project",
  "startDate": "2024-03",
  "endDate": "2024-08",
  "description": "A real-time analytics dashboard...",
  "technologies": ["Python", "FastAPI", "PostgreSQL"],
  "highlights": ["1k+ GitHub stars", "Featured on Product Hunt"],
  "notes": "Built over weekends; the streaming architecture is worth highlighting"
}
```

The `notes` field is for AI reference — it provides context when optimizing for a JD, but is **automatically stripped** when copying entries to a resume.

## Root/Derivative Branching

Root = personal info master + detailed experience library.
Derivative = JD-specific branch (inherits personal_info from root, owns copies of everything else).

### Rules

- Only roots (parentId == null) can be derived from.
- Deleting a root with derivatives → 409. Use `--force` to cascade.
- Duplicating a derivative keeps same parentId.
- Personal info is ONLY on root, NEVER visible to AI.
- Derivatives get root's personal_info as inherited (synthetic id, `inherited: true`).

### Security Rules — Personal Profiles

- Personal profile DATA (fullName, email, phone, github, age, etc.) is filled ONLY through the web UI at `/profiles`.
- The CLI/agent may reference profiles by codename only (`profile list`, `resume create --profile`). There are no commands to read or write profile data.
- Profile data is NEVER sent to AI providers. The `personal_profiles` table is never queried by any AI route.
- When a resume is bound to a profile, the AI system prompt receives only the codename as a reference note (e.g. "This resume references personal profile codename: `<X>`."). No profile fields are included.
- The `personal_info` section on the resume is a snapshot copy — changing the profile later does not update existing resumes.
- JSON export (`format=json`) excludes `personal_info` entirely; it exports only experience sections plus the codename reference.

## Workflow Recipes

### Recipe 1: Create and fill a resume

```bash
# Create root resume
jadeai resume create --title "My Resume" --template modern
# → outputs resume id: <uuid>

# Pull to edit locally
jadeai pull <uuid> --out ./data/

# Edit the JSON files
vim ./data/work_experience.json
vim ./data/skills.json

# Push changes back
jadeai push <uuid> --from ./data/

# Export
jadeai resume export <uuid> --format pdf --out resume.pdf
```

### Recipe 2: JD-targeted branching

```bash
# Create derivative from root
jadeai resume derive <root-id> --title "JD: ByteDance Backend"
# → outputs new resume id

# Pull, customize for JD, push
jadeai pull <new-id> --out ./bytedance/
# edit ./bytedance/work_experience.json to emphasize relevant experience
# edit ./bytedance/skills.json to match JD keywords
jadeai push <new-id> --from ./bytedance/

# Export final PDF
jadeai resume export <new-id> --format pdf --out bytedance.pdf
```

### Recipe 3: Multi-JD batch

```bash
for jd in bytedance tencent alibaba; do
  jadeai resume derive <root-id> --title "JD: $jd"
  # customize via pull/push, then export
done
```

### Recipe 4: Parse PDF into editable resume

```bash
jadeai resume parse ./old-resume.pdf --template modern
# → outputs new resume id
jadeai pull <uuid> --out ./data/
# review and edit, then push
```

### Recipe 5: Build experience library and create a resume from it

```bash
# Populate the library from various sources
jadeai experience create --type work --data '{"company":"Acme","position":"SDE","startDate":"2023-01","endDate":"2024-12","description":"Built APIs...","technologies":["Go","gRPC"],"highlights":["Reduced p99 by 60%"],"notes":"Greenfield project, led 3-person team"}'

jadeai experience create --type work --data '{"company":"StartupX","position":"Intern","startDate":"2022-06","endDate":"2022-12","description":"Frontend development...","technologies":["React","TypeScript"],"notes":"Internship — focus on ownership stories"}'

jadeai experience create --type project --data @./oss-project.json

# List to get IDs
jadeai experience list --json

# Create resume from library entries (selected in web UI or via --experience-ids)
jadeai resume create --title "Targeted Resume" --profile amadeus

# Export
jadeai resume export <uuid> --format pdf --out resume.pdf
```

### Recipe 6: Bulk import experiences from a JSON array

```bash
# File: import.json — array of {type, data} objects
for row in $(cat import.json | jq -c '.[]'); do
  type=$(echo "$row" | jq -r '.type')
  data=$(echo "$row" | jq -c '.data')
  jadeai experience create --type "$type" --data "$data"
done
```

## Error Codes

| Exit | Meaning | Action |
|------|---------|--------|
| 0 | Success | — |
| 1 | Usage error | Check missing flags or args |
| 2 | Network error | Is `jadeai start` running? |
| 3 | API error | Bad fingerprint, not found, 409 (has derivatives) |
| 4 | I/O error | File not found, permission denied |

JSON mode (`--json`) outputs `{"ok":true,"data":...}` or `{"ok":false,"error":"..."}`.
