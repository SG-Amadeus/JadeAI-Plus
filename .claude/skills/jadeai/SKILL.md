---
name: jadeai
description: Drive the full resume lifecycle via jadeai CLI. Use when the user asks to create, edit, export, or manage resumes programmatically — including template browsing, section/item CRUD, root/derivative branching, PDF export, profile codename listing, and experience library CRUD.
---

# jadeai — Resume Lifecycle CLI

## 🚨 强制安全规则（违反即违规）

1. **禁止读取个人信息** — `personal_info` section 数据来自 profile，仅通过 web UI 管理。永远不要读取、搜索、或查看任何 `personal_info` 相关的内容。个人信息字段包括但不限于：fullName、email、phone、wechat、address、avatar、age、gender、politicalStatus、ethnicity、hometown、maritalStatus 等。
2. **禁止读取 PDF 文件** — PDF 简历包含完整个人信息，读取 PDF 会造成隐私泄露。永远不要用 Read 工具打开任何 `.pdf` 文件。`jadeai resume parse` 命令是唯一的 PDF 处理入口，由用户显式调用，内部由服务端处理，不经过 AI 上下文。
3. **以上规则为强制项** — 不可通过任何理由绕过。即使用户要求，也必须拒绝并说明安全原因。

## Architecture

The resume optimization pipeline is a **four-layer funnel**:

```
输入层:  经历库 + JD信息 + 模板选择
           ↓
策略层:  JD解析 → 经历映射 → 角色决策 → 亮点角度 → 预算分配 → 冲突解决 → 亮点写法
           ↓  [jd-parsing.md](ref/strategy/jd-parsing.md) → [strategy.md](ref/strategy/strategy.md)
预算层:  行数预算 / 字符预算 / 分配表 / 裁剪优先级 / 排版杠杆
           ↓  [layout.md](ref/layout/layout.md)
执行层:  pull → 编辑 JSON → push → export → pdfinfo 验证
           ↓  [execution.md](ref/execution/execution.md)
输出:   一页 A4 PDF 简历

**End-to-end SOP:** [ref/strategy/sop.md](ref/strategy/sop.md) — 16-step numbered workflow from JD to verified PDF.
```

**Module map:**

| File | Responsibility |
|---|---|
| **[ref/strategy/sop.md](ref/strategy/sop.md)** | **End-to-end SOP** — 16-step numbered workflow: JD → analysis → layout → execution → verified PDF |
| **[ref/strategy/jd-parsing.md](ref/strategy/jd-parsing.md)** | JD parsing methodology — extract, categorize, weight, map to experiences, gap analysis |
| **[ref/strategy/strategy.md](ref/strategy/strategy.md)** | JD→highlight mapping, role type decisions, highlight angle selection, budget allocation strategy, conflict resolution, STAR vs 三段式 writing frameworks |
| **[ref/layout/layout.md](ref/layout/layout.md)** | Line budget formula, margin regimes, per-template budget files index, cut order, typography levers |
| **[ref/layout/method.md](ref/layout/method.md)** | Full line-budget formula derivation with ATS worked example |
| **[ref/layout/char-budget.md](ref/layout/char-budget.md)** | Per-font-size character-per-line lookup tables (EN/ZH) |
| **[ref/layout/content-budget.md](ref/layout/content-budget.md)** | Per-template per-section allocation tables + per-item component costs |
| **[ref/layout/templates/](ref/layout/templates/)** | 7 per-template markdown budget files (typography profile, line capacity, allocation tables, cut order) |
| **[ref/execution/execution.md](ref/execution/execution.md)** | Command contract, pull/push workflow, section type reference, experience library shapes, root/derivative branching, error codes |
| **[ref/writing/internship.md](ref/writing/internship.md)** | Internship/work experience writing conventions (sub-project structure, highlight tiers) |
| **[ref/writing/project.md](ref/writing/project.md)** | Project experience writing conventions (STAR, quantified results, action verbs) |

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

### "I have a JD and want to create a targeted one-page resume"
→ Follow the **[end-to-end SOP](ref/strategy/sop.md)** — 16 steps across 3 phases:
1. **Analysis** — parse JD, map to experiences, choose angles, allocate budget
2. **Layout** — load template budget, inventory content, cut/compress per priority
3. **Execution** — edit JSON, push, export, verify single page

### "I want to see what templates are available"
→ `jadeai template list`

### "I want to create a new resume"
→ `jadeai resume create --title "..." --template <id>`
Creates a root resume. Always follow up with `jadeai pull <id> --out ./jd-{company}-{role}/` to create a JD-named folder with all section JSONs for editing.

### "I want to see all my resumes"
→ `jadeai resume list`

### "I want to export a resume to PDF/HTML/DOCX"
→ `jadeai resume export <resume-id> --format pdf --out file.pdf [--fit-one-page] [--for-print]`
Use `--fit-one-page` to auto-shrink typography so the resume fits a single A4 page (last resort — prefer content budgeting first). Use `--for-print` to add print-friendly CSS (page breaks, background colors).

### "I want to fit a resume to one page / budget content"
→ Follow the **layout optimization workflow**: [strategy.md](ref/strategy/strategy.md) for JD-aware content decisions → [layout.md](ref/layout/layout.md) for per-template line budgets and cut order → [execution.md](ref/execution/execution.md) for pull/push/export commands. Apply typography levers before resorting to `--fit-one-page`.

### "I want to inspect a resume's metadata (template, theme, sections)"
→ `jadeai resume show <resume-id> --json | jq '{template, themeConfig, language, sectionTypes: [.sections[].type]}'`

### "I need to bulk-edit resume content locally"
→ `jadeai pull <resume-id> --out <dir>` then `jadeai push <resume-id> --from <dir>`
Pull exports each section as `<type>.json`. User edits the files. Push syncs them back.

### "I want to tailor a resume for a specific job"

**AI-assisted path (recommended):** Uses the optimize API to rewrite content for the JD while preserving facts.

```bash
# Step 1: Create a derivative from your root resume
jadeai resume derive <root-resume-id> --title "JD: Company X Role"

# Step 2: AI optimizes all sections for the JD
curl -s -X POST http://localhost:3000/api/ai/optimize \
  -H "Content-Type: application/json" \
  -H "x-fingerprint: <fingerprint>" \
  -H "x-provider: <provider>" \
  -H "x-api-key: <key>" \
  -d '{"resumeId":"<derivative-id>","jobDescription":"<paste JD text here>"}'

# Step 3: Export to PDF
jadeai resume export <derivative-id> --format pdf --out ./resume.pdf
```

The optimize API rewrites wording for JD keyword alignment and emphasis — company names, dates, positions, and factual details are preserved. See **Recipe 8** below for the full walkthrough with all options.

**Manual path:** `jadeai resume derive <root-resume-id> --title "JD: Company X"`
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
  - **Always prefer `@file.json` for Chinese text or multi-line content.** Inline JSON with Chinese quotes or newlines will fail to parse in the shell. Write the JSON to a file in the current working directory, then reference it with `@filename.json`.
- `experience update` does a partial merge — only send fields you want to change. At least one of `--type` or `--data` is required.
  - Same rule applies: use `@file.json` for any data containing Chinese or newlines.
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

- `section update --visible false` is the sanctioned way to hide a section (e.g., when trimming for one-page fit). Prefer hiding over deleting — hidden sections can be restored later.
- `resume update --theme <json-file>` accepts a **partial** ThemeConfig. Only include the fields you want to change (e.g. `{"lineSpacing": 1.35, "sectionSpacing": 12}`). Omitted fields keep their current values.

### Item

```
jadeai item add     <resume-id> <section-id> --item '{"key":"value"}' | --item <json-file>
jadeai item update  <resume-id> <section-id> <item-id> --fields '{"key":"value"}' | --fields <json-file>
jadeai item delete  <resume-id> <section-id> <item-id>
jadeai item reorder <resume-id> <section-id> --order <id,id,...>
```

## Section Type Reference

→ See [ref/execution/execution.md](ref/execution/execution.md) for the canonical section type table and content shapes.

## Section Ordering Convention

→ See [ref/execution/execution.md](ref/execution/execution.md) for the standard section order and principles.

## Writing Guidelines

When writing or editing resume content, consult these reference guides for detailed conventions:

- **项目经历写作规范** → [ref/writing/project.md](ref/writing/project.md) — STAR 法则、量化结果、动作动词库、项目分级标准
- **实习/工作经历写作规范** → [ref/writing/internship.md](ref/writing/internship.md) — 子项目结构、亮点分级、部门字段使用、常见错误

Load the relevant guide when the user asks to write, edit, or review project descriptions or internship/work experience entries.

**Line budget awareness**: Highlight counts and description lengths are constrained by the template's one-page line budget. For per-template highlight caps and cut-order rules, see [ref/layout/layout.md](ref/layout/layout.md) and the per-template budget files in [ref/layout/templates/](ref/layout/templates/). In general: 2-3 highlights per work experience, 1-2 per project, and keep descriptions to 2 lines or fewer.

---

## Experience Library

→ See [ref/execution/execution.md](ref/execution/execution.md) for data shapes (work/internship/project), CLI commands, and the key rules: `summary` = source of truth, `highlights` = JD-specific retellings, `notes` = AI-only.

## Root/Derivative Branching

→ See [ref/execution/execution.md](ref/execution/execution.md) for branching rules, security rules for personal profiles, and the full PII protection model.

## Workflow Recipes

### Recipe 1: Create and fill a resume

```bash
# Create root resume with JD/company as folder name
FOLDER="./jd-bytedance-backend"
jadeai resume create --title "JD: ByteDance Backend" --template modern
# → outputs resume id: <uuid>

# Pull sections into JD-named folder
jadeai pull <uuid> --out "$FOLDER"

# Edit the JSON files
vim "$FOLDER/work_experience.json"
vim "$FOLDER/projects.json"
vim "$FOLDER/skills.json"
vim "$FOLDER/summary.json"

# Push changes back
jadeai push <uuid> --from "$FOLDER"

# Export PDF into same folder
jadeai resume export <uuid> --format pdf --out "$FOLDER/resume.pdf"
```

**Folder convention:** Always use a descriptive folder name based on the target company/role: `jd-{company}-{role}` (e.g. `jd-bytedance-backend`, `jd-tencent-algorithm`). All section JSONs, the exported PDF, and any reference files live in this one folder. Personal info is managed via the profile (web UI at `/profiles`) and inherited by all resumes — it is not in the pull output.

### Recipe 2: JD-targeted branching

```bash
# Create derivative from root with JD folder
FOLDER="./jd-bytedance-backend"
jadeai resume derive <root-id> --title "JD: ByteDance Backend"
# → outputs new resume id

# Pull into JD folder, customize for target role
# (personal_info is inherited from root — not in pull output)
jadeai pull <new-id> --out "$FOLDER"
# edit $FOLDER/work_experience.json to emphasize relevant experience
# edit $FOLDER/projects.json to match JD keywords
# edit $FOLDER/skills.json to match JD keywords
jadeai push <new-id> --from "$FOLDER"

# Export into same folder
jadeai resume export <new-id> --format pdf --out "$FOLDER/resume.pdf"
```

### Recipe 3: Multi-JD batch

```bash
for jd in bytedance tencent alibaba; do
  FOLDER="./jd-${jd}-backend"
  mkdir -p "$FOLDER"
  new_id=$(jadeai resume derive <root-id> --title "JD: $jd Backend" --json | jq -r '.data.id')
  jadeai pull "$new_id" --out "$FOLDER"
  # edit $FOLDER/*.json to target the JD
  jadeai push "$new_id" --from "$FOLDER"
  jadeai resume export "$new_id" --format pdf --out "$FOLDER/resume.pdf"
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
# Step 1: Write experience data to a JSON file (avoids shell escaping issues with Chinese/newlines)
cat > exp-work-1.json << 'ENDJSON'
{
  "company": "某大厂",
  "position": "高级前端工程师",
  "startDate": "2023-01",
  "endDate": "2024-12",
  "current": false,
  "summary": "负责核心产品前端架构设计，主导技术选型与落地。这是一个完整的经历叙述，AI 会根据 JD 从中提炼亮点。",
  "technologies": ["Go", "gRPC", "PostgreSQL"],
  "highlights": [],
  "notes": "Greenfield project, led 3-person team"
}
ENDJSON

# Step 2: Create via @file.json (always use @file for Chinese/multiline content)
jadeai experience create --type work --data @./exp-work-1.json

# Project experiences work the same way
cat > exp-project-1.json << 'ENDJSON'
{
  "name": "开源项目 X",
  "url": "https://github.com/user/project",
  "startDate": "2024-03",
  "endDate": "2024-08",
  "summary": "一个实时分析仪表盘项目。完整描述项目的背景、架构、个人贡献和成果。",
  "technologies": ["Python", "FastAPI", "PostgreSQL"],
  "highlights": [],
  "notes": "Built over weekends; the streaming architecture is worth highlighting"
}
ENDJSON

jadeai experience create --type project --data @./exp-project-1.json

# List to get IDs
jadeai experience list --json

# Create resume from library entries
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

### Recipe 7: Fit content to one page (layout optimization)

```bash
# Step 1: Inspect current template and theme
jadeai resume show <id> --json | jq '{template, themeConfig, language, sectionTypes: [.sections[].type]}'

# Step 2: Pull content for inventory (PII-safe)
jadeai pull <id> --out ./jd-<company>-<role>/

# Step 3: Apply per-template budget caps (see ref/layout/layout.md and ref/layout/templates/<id>.md)
# → Count items and highlights per section
# → Compare against the template's allocation table
# → Cut/compress per the cut order

# Step 4: Push edits
jadeai push <id> --from ./jd-<company>-<role>/

# Step 5: Apply typography levers if needed (only after content decisions)
echo '{"lineSpacing":1.35,"sectionSpacing":12}' > ./theme.json
jadeai resume update <id> --theme ./theme.json

# Step 6: Export with fit-one-page as safety net
jadeai resume export <id> --format pdf --out ./jd-<company>-<role>/resume.pdf --fit-one-page

# Step 7: Verify single page (metadata only)
pdfinfo ./jd-<company>-<role>/resume.pdf | grep Pages
```

The key principle: **content budgeting before typography shrinking**. The `--fit-one-page` flag is a last resort — it shrinks fonts down to 80% and squashes spacing. Prefer cutting optional sections and compressing highlights first. See [ref/layout/layout.md](ref/layout/layout.md) for the full methodology and [ref/strategy/strategy.md](ref/strategy/strategy.md) for JD-aware trade-off decisions.

### Recipe 8: JD-tailored resume with AI optimization

Uses the optimize API to automatically rewrite resume content for a specific job description while preserving factual details (company names, dates, positions). The API's system prompt enforces: **"Do NOT fabricate experience — adapt and emphasize existing content"**.

```bash
# Prerequisites: server must be running
jadeai start &
jadeai ping

# Step 1: Create a derivative from your best-fit root resume
DERIVED=$(jadeai resume derive <root-id> --title "JD: Company Role" --json | jq -r '.data.id')
echo "Derived resume: $DERIVED"

# Step 2: Optimize all sections for the JD (paste full JD text into the JSON body)
# Required headers: x-fingerprint (auth user), x-provider + x-api-key (AI provider)
curl -s -X POST http://localhost:3000/api/ai/optimize \
  -H "Content-Type: application/json" \
  -H "x-fingerprint: demo-fingerprint" \
  -H "x-provider: deepseek" \
  -H "x-api-key: $DEEPSEEK_API_KEY" \
  -d "{\"resumeId\":\"$DERIVED\",\"jobDescription\":\"$(cat jd.txt | sed 's/"/\\"/g' | tr '\n' ' ')\"}"

# Optional: target only specific sections by ID
# Add "sectionIds": ["<id1>", "<id2>"] to the JSON body

# Step 3: Preview the optimized content before exporting
jadeai resume show "$DERIVED" --json | jq '.sections[] | {type, title}'

# Step 4: Fine-tune manually if needed
jadeai pull "$DERIVED" --out ./jd-<company>-<role>/
# edit JSON files, then:
jadeai push "$DERIVED" --from ./jd-<company>-<role>/

# Step 5: Export final PDF
jadeai resume export "$DERIVED" --format pdf --out ./jd-<company>-<role>/resume.pdf --fit-one-page

# Step 6: Verify single page
pdfinfo ./jd-<company>-<role>/resume.pdf | grep Pages
```

**How it works:**

- `derive` copies all non-personal_info sections from the root. Personal info (name, phone, email, etc.) is inherited read-time from the root's profile — never stored in the derivative.
- `POST /api/ai/optimize` sends the JD + resume sections (PII automatically stripped via `getResumeForAI()`) to the AI. The AI rewrites wording to align with JD keywords and emphasis while preserving company names, dates, titles, and other facts.
- The response includes a `summary` field explaining what was changed — review it to understand what the AI adjusted.
- After optimization, export the PDF. Review and iterate by re-running step 2 with refined keywords or by manually editing via pull/push.

**AI provider headers:** The optimize endpoint requires `x-provider` and `x-api-key` (or `x-base-url` for custom endpoints). Supported providers: `deepseek`, `openai`, `anthropic`, `google`, `zai`, `siliconflow`, `custom`. See `src/lib/ai/provider.ts` for the full list.

**Multi-JD batch variant:**

```bash
for jd_file in jd-*.txt; do
  company=$(basename "$jd_file" .txt | sed 's/^jd-//')
  FOLDER="./jd-${company}"
  mkdir -p "$FOLDER"
  DERIVED=$(jadeai resume derive <root-id> --title "JD: $company" --json | jq -r '.data.id')
  curl -s -X POST http://localhost:3000/api/ai/optimize \
    -H "Content-Type: application/json" \
    -H "x-fingerprint: demo-fingerprint" \
    -H "x-provider: deepseek" \
    -H "x-api-key: $DEEPSEEK_API_KEY" \
    -d "{\"resumeId\":\"$DERIVED\",\"jobDescription\":\"$(cat "$jd_file" | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
  jadeai resume export "$DERIVED" --format pdf --out "$FOLDER/resume.pdf" --fit-one-page
done
```

## Error Codes

→ See [ref/execution/execution.md](ref/execution/execution.md) for exit code table and JSON mode format.
