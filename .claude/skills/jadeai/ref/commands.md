# CLI Command Reference

All `<resume-id>` arguments accept a raw resume **UUID** (e.g. from `jadeai resume list`).

## Infra

```
jadeai start  [--port <port>]   Start dev server (default 3000)
jadeai ping                     Test connectivity + auth + latency
```

## Global Flags

```
--base-url <url>      Server URL (default: http://localhost:3000)
--fingerprint <fp>    Auth fingerprint (default: demo-fingerprint)
--json                Machine-readable output
--quiet, -q           Suppress progress messages
-h, --help            Show help
```

## Profile

```
jadeai profile list                      List profile codenames and IDs
```

Profile data (fullName, email, phone, etc.) is managed exclusively through the web UI at `/profiles`. No CLI commands exist to read or write profile data. The CLI may only list codenames and pass `--profile <codename>` to `resume create`.

## Experience

```
jadeai experience list   [--type work|project|internship]
jadeai experience show   <experience-id>
jadeai experience create --type <t> --data <json|@file>
jadeai experience update <experience-id> [--type <t>] [--data <json|@file>]
jadeai experience delete <experience-id> --force
```

Experience data is non-PII (work/project/internship records) and safe for AI/CLI access. These commands have full access to all fields including internal `notes`.

- `experience create` requires `--type` (work|project|internship) and `--data` (inline JSON or `@file.json`).
  - **Always prefer `@file.json` for Chinese text or multi-line content.** Inline JSON with Chinese quotes or newlines will fail to parse in the shell.
- `experience update` does a partial merge — only send fields you want to change. At least one of `--type` or `--data` is required.
- `experience delete` requires `--force` to prevent accidental deletion.
- The `notes` field on each entry is for AI reference only; it is automatically stripped when copying to a resume.

## Import / Export

```
jadeai pull <resume-id> --out <dir>    Export sections as <type>.json files
jadeai push <resume-id> --from <dir>   Read JSON files, sync to server
```

`pull` writes one file per section type (e.g. `work_experience.json`, `skills.json`). Personal info sections (`personal_info.json`) are NEVER written — personal_info is managed exclusively through the web UI profile system. For profile-bound resumes, `_profile.txt` is written with the profile codename.

`push` reads every `.json` in the directory, matches filename to section type, and updates the server via PUT. `personal_info.json` is **rejected** — pushing personal_info is forbidden.

## Template

```
jadeai template list [--locale zh|en]
```

## Resume

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

- `resume create` creates a new root resume. `--profile <codename>` binds the resume to a profile — education is pre-filled, personal_info is resolved at export time (not stored as a section).
- `resume show` masks `personal_info` content to `{ profileCodename }` only — full personal_info is never exposed via CLI.
- `resume delete` returns 409 on roots with derivatives. Use `--force` to cascade.
- `resume derive` creates a JD-targeted branch. Copies `profileCodename` reference from root. Only root resumes can be derived from.

## Section

```
jadeai section list    <resume-id>
jadeai section add     <resume-id> --type <type> --title <title> [--content <json-file>]
jadeai section update  <resume-id> <section-id> [--title <t>] [--visible true|false] [--content <json-file>]
jadeai section delete  <resume-id> <section-id>
jadeai section reorder <resume-id> --order <id,id,...>
```

- `section update --visible false` is the sanctioned way to hide a section (e.g., when trimming for one-page fit). Prefer hiding over deleting — hidden sections can be restored later.
- `resume update --theme <json-file>` accepts a **partial** ThemeConfig. Only include the fields you want to change (e.g. `{"lineSpacing": 1.35, "sectionSpacing": 12}`). Omitted fields keep their current values.

## Item

```
jadeai item add     <resume-id> <section-id> --item '{"key":"value"}' | --item <json-file>
jadeai item update  <resume-id> <section-id> <item-id> --fields '{"key":"value"}' | --fields <json-file>
jadeai item delete  <resume-id> <section-id> <item-id>
jadeai item reorder <resume-id> <section-id> --order <id,id,...>
```
