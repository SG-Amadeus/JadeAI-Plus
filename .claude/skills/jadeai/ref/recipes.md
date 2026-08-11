# Workflow Recipes

## Recipe 1: Create and fill a resume

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

# === BUDGET GATE (MANDATORY before push) ===
# 1. Identify template capacity:
#    jadeai resume show <uuid> --json | jq '{template, themeConfig, language}'
#    → Load .claude/skills/jadeai/ref/layout/templates/<template>.md
#    → Note content_lines and per-section allocation table
# 2. Inventory content from the edited JSONs:
#    → Count items per section, highlights per item, estimated lines
#    → Use char budgets from ref/layout/content-budget.md
#    → ZH: every bullet ≈ 2 lines, description 1-2 lines per 54 chars
# 3. Compare against allocation table:
#    → Under/at budget: proceed to push
#    → Over budget: cut per cut order BEFORE pushing

# Push changes back
jadeai push <uuid> --from "$FOLDER"

# Export PDF into same folder
jadeai resume export <uuid> --format pdf --out "$FOLDER/resume.pdf" --fit-one-page
pdfinfo "$FOLDER/resume.pdf" | grep Pages  # must be Pages: 1
```

**Folder convention:** Always use a descriptive folder name based on the target company/role: `jd-{company}-{role}` (e.g. `jd-bytedance-backend`, `jd-tencent-algorithm`). All section JSONs, the exported PDF, and any reference files live in this one folder. Personal info is managed via the profile (web UI at `/profiles`) — it is never in the pull output. Profile-bound resumes reference the profile by codename; personal_info is resolved at export time.

## Recipe 2: JD-targeted branching

```bash
# Create derivative from root with JD folder
FOLDER="./jd-bytedance-backend"
jadeai resume derive <root-id> --title "JD: ByteDance Backend"
# → outputs new resume id

# Pull into JD folder, customize for target role
# (personal_info is resolved from profile at export time — never in pull output)
jadeai pull <new-id> --out "$FOLDER"
# edit $FOLDER/work_experience.json to emphasize relevant experience
# edit $FOLDER/projects.json to match JD keywords
# edit $FOLDER/skills.json to match JD keywords

# === BUDGET GATE (MANDATORY before push) ===
# 1. Identify template capacity from .claude/skills/jadeai/ref/layout/templates/<template>.md
# 2. Inventory: count items, highlights, estimated lines per content-budget.md
# 3. If over budget: cut per cut order BEFORE pushing

jadeai push <new-id> --from "$FOLDER"

# Export into same folder
jadeai resume export <new-id> --format pdf --out "$FOLDER/resume.pdf" --fit-one-page
pdfinfo "$FOLDER/resume.pdf" | grep Pages  # must be Pages: 1
```

## Recipe 3: Multi-JD batch

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

## Recipe 4: Parse PDF into editable resume

```bash
jadeai resume parse ./old-resume.pdf --template modern
# → outputs new resume id
jadeai pull <uuid> --out ./data/
# review and edit, then push
```

## Recipe 5: Build experience library and create a resume from it

```bash
# Step 1: Write experience data to a JSON file (avoids shell escaping issues with Chinese/newlines)
cat > exp-work-1.json << 'ENDJSON'
{
  "company": "某大厂",
  "position": "高级前端工程师",
  "department": "核心平台部",
  "location": "北京",
  "startDate": "2023-01",
  "endDate": "2024-12",
  "current": false,
  "summary": "负责核心产品前端架构设计，主导技术选型与落地。这是一个完整的经历叙述，AI 会根据 JD 从中提炼亮点。",
  "technologies": ["Go", "gRPC", "PostgreSQL"],
  "highlights": [],
  "projects": [
    {"name": "内部效能平台", "highlights": ["每月节省 200 人天"]}
  ],
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

## Recipe 6: Bulk import experiences from a JSON array

```bash
# File: import.json — array of {type, data} objects
for row in $(cat import.json | jq -c '.[]'); do
  type=$(echo "$row" | jq -r '.type')
  data=$(echo "$row" | jq -c '.data')
  jadeai experience create --type "$type" --data "$data"
done
```

## Recipe 7: Fit content to one page (layout optimization)

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

## Recipe 8: JD-tailored resume with AI optimization

Uses the optimize API to automatically rewrite resume content for a specific job description while preserving factual details (company names, dates, positions). The API's system prompt enforces: **"Do NOT fabricate experience — adapt and emphasize existing content"**.

**Critical: AI optimization often generates verbose content. The budget gate (Step 4) is MANDATORY — never skip directly from optimize to export.**

```bash
# Prerequisites: server must be running
jadeai start &
jadeai ping

# Step 0 (MANDATORY): Verify personal info is not empty before proceeding
PROFILE=$(jadeai resume show <root-id> --json | jq -r '.profileCodename // ""')
if [ -z "$PROFILE" ]; then
  # No profile bound — check legacy personal_info section
  HAS_NAME=$(jadeai resume show <root-id> --json | jq -r '[.sections[] | select(.type=="personal_info") | (.content.fullName != null and .content.fullName != "")] | any')
  if [ "$HAS_NAME" != "true" ]; then
    echo "Personal info is empty. Please fill it at http://localhost:3000/profiles first."
    exit 1
  fi
fi

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

# Step 3: Preview the optimized content
jadeai resume show "$DERIVED" --json | jq '.sections[] | {type, title}'

# Step 4 (MANDATORY): Budget Gate — AI may have generated verbose content
FOLDER="./jd-<company>-<role>"
mkdir -p "$FOLDER"

# 4a. Identify template capacity
TEMPLATE=$(jadeai resume show "$DERIVED" --json | jq -r '.template')
echo "Template: $TEMPLATE → load .claude/skills/jadeai/ref/layout/templates/$TEMPLATE.md"
# Note content_lines and per-section allocation table

# 4b. Pull and inventory
jadeai pull "$DERIVED" --out "$FOLDER"
# Count items per section, highlights per item, estimate lines
# Use char budgets from ref/layout/content-budget.md
# ZH rule: every bullet ≈ 2 lines, description 1-2 lines per 54 chars

# 4c. Compare against allocation table
# → Under/at budget: proceed to push
# → Over budget: apply cut order (see Budget Gate section above)
#   Common AI-overflow fixes:
#   - Cap highlights per work item to template max (usually 2-3)
#   - Compress summary to 2 lines or cut
#   - Drop certifications/languages if tight
#   - Cut weakest project item

# 4d. Push edits (if cuts were needed)
jadeai push "$DERIVED" --from "$FOLDER"

# Step 5: Export final PDF
jadeai resume export "$DERIVED" --format pdf --out "$FOLDER/resume.pdf" --fit-one-page

# Step 6: Verify single page
pdfinfo "$FOLDER/resume.pdf" | grep Pages  # must be Pages: 1
```

**How it works:**

- `derive` copies all non-personal_info sections from the root, along with the `profileCodename` reference. Personal info (name, phone, email, etc.) is resolved from the profile at export time — never stored as a section in the derivative.
- `POST /api/ai/optimize` sends the JD + resume sections (PII automatically stripped via `getResumeForAI()`) to the AI. The AI rewrites wording to align with JD keywords and emphasis while preserving company names, dates, titles, and other facts.
- The response includes a `summary` field explaining what was changed — review it to understand what the AI adjusted.
- **Budget gate (Step 4) is mandatory after optimization.** AI frequently generates descriptions that exceed the template's line budget. Always pull, count, and compare against the template's allocation table before exporting. Apply the cut order if over budget. Never skip from optimize directly to export.

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
  # BUDGET GATE: pull, inventory, cut if over budget
  jadeai pull "$DERIVED" --out "$FOLDER"
  # → count items/highlights, compare against template allocation, cut if needed
  jadeai push "$DERIVED" --from "$FOLDER"
  jadeai resume export "$DERIVED" --format pdf --out "$FOLDER/resume.pdf" --fit-one-page
  pdfinfo "$FOLDER/resume.pdf" | grep Pages  # verify Pages: 1
done
```
