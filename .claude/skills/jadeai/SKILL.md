---
name: jadeai
description: Drive the full resume lifecycle via jadeai CLI. Use when the user asks to create, edit, export, or manage resumes programmatically — including template browsing, section/item CRUD, root/derivative branching, PDF export, profile codename listing, and experience library CRUD.
---

# jadeai — Resume Lifecycle CLI

## 🚨 强制安全规则（违反即违规）

1. **禁止读取个人信息** — `personal_info` section 数据来自 profile，仅通过 web UI 管理。永远不要读取、搜索、或查看任何 `personal_info` 相关的内容。个人信息字段包括但不限于：fullName、email、phone、wechat、address、avatar、age、gender、politicalStatus、ethnicity、hometown、maritalStatus 等。
2. **禁止读取 PDF 文件** — PDF 简历包含完整个人信息，读取 PDF 会造成隐私泄露。永远不要用 Read 工具打开任何 `.pdf` 文件。`jadeai resume parse` 命令是唯一的 PDF 处理入口，由用户显式调用，内部由服务端处理，不经过 AI 上下文。
3. **以上规则为强制项** — 不可通过任何理由绕过。即使用户要求，也必须拒绝并说明安全原因。

## ⚠️ 个人信息预检（所有工作流的第一步）

**在任何简历优化、生成、导出操作之前，必须先确认个人信息是否已填写。**

### 检查方法

```bash
# 检查简历是否绑定了 profile（profile-bound 简历通过 profileCodename 引用个人信息）
jadeai resume show <resume-id> --json | jq '{profileCodename, hasPersonalInfo: (.profileCodename != null)}'
```

- `hasPersonalInfo: true` → 简历绑定了 profile，正常
- `hasPersonalInfo: false` → 检查是否有 personal_info section：
  ```bash
  jadeai resume show <resume-id> --json | jq '.sections[] | select(.type=="personal_info") | {hasName: (.content.fullName != null and .content.fullName != "")}'
  ```
  如果 `hasName: false` → **个人信息为空，必须引导用户先去网页填写**

### 个人信息为空时的处理流程

1. **立即停止当前工作流**
2. **引导用户到网页填写**：http://localhost:3000/profiles
3. **用户确认已填写后**，重新检查再继续

唯一例外：纯查询操作（`resume list`、`template list`、`experience list`）不需要预检。

## Architecture

四层漏斗：

```
输入层:  经历库 + JD信息 + 模板选择
           ↓
策略层:  JD解析 → 经历映射 → 角色决策 → 亮点角度 → 预算分配 → 冲突解决 → 亮点写法
           ↓  ref/strategy/jd-parsing.md → ref/strategy/strategy.md
预算层:  行数预算 / 字符预算 / 分配表 / 裁剪优先级 / 排版杠杆
           ↓  ref/layout/layout.md
执行层:  pull → 编辑 JSON → push → export → pdfinfo 验证
           ↓  ref/execution/execution.md
输出:   一页 A4 PDF 简历
```

**End-to-end SOP:** [ref/strategy/sop.md](ref/strategy/sop.md) — 16 步完整流程。

## 🟢 Budget Gate — MANDATORY before every push/export

**成本模型不可跳过。** 每个产出 PDF 的工作流必须通过三道检查点。

### Checkpoint 1: Identify Template Capacity

```bash
jadeai resume show <id> --json | jq '{template, themeConfig, language}'
```

- 加载模板预算文件：`.claude/skills/jadeai/ref/layout/templates/<template>.md`
- 记下 `content_lines` 和 `chars_per_line`（中文 ≈ 英文的一半）
- 如果 themeConfig 非默认值，用 [ref/layout/method.md](ref/layout/method.md) 重新计算

### Checkpoint 2: Inventory & Count

```bash
jadeai pull <id> --out ./jd-<company>-<role>/
```

统计每个 section JSON：
- Item 数量
- 每条 item 的 highlight 数量
- 估算行数（参考 [ref/layout/content-budget.md](ref/layout/content-budget.md)）
- 中文规则：每条 bullet ≈ 2 行，描述每 54 字符 ≈ 1-2 行

### Checkpoint 3: Compare & Cut

将统计结果与 [ref/layout/content-budget.md](ref/layout/content-budget.md) 中的分配表对比：
- **未超预算** → 继续 push
- **±2 行内** → 可接受，继续
- **超预算** → **先裁剪再 push**：

```
1. qr_codes / custom / github       → CUT (--visible false)
2. summary                          → 压缩到 2 行，还不够就 CUT
3. certifications / languages       → 压缩到 1 行
4. projects                         → 砍最弱的 item
5. work_experience                  → 合并角色、限制 highlights、去掉部门行
6. skills                           → 合并类别（上限 3 类）
7. education                        → 仅裁 highlights（不低于 3 行）
8. personal_info                    → 永不修改
```

### Checkpoint 4: Typography Adjustment（内容裁剪不够时）

如果内容裁剪后仍然超出，按顺序调整排版参数。**每个杠杆都是 CLI 命令**——完整参数参考 [ref/layout/theme-cli.md](ref/layout/theme-cli.md)：

| 顺序 | 参数 | 操作 | 释放行数 | 下限 |
|---|---|---|---|---|
| 1 | sectionSpacing ↓ | 编辑 `theme.json`: `"sectionSpacing": 12` → `push` | +1-3 | 4px |
| 2 | lineSpacing ↓ | 编辑 `theme.json`: `"lineSpacing": 1.35` → `push` | +3-4 | 1.15 |
| 3 | margin ↓ | 编辑 `theme.json`: `"margin": {"top": 16, "bottom": 16}` → `push` | +1-2 | 8px |
| 4 | fontSize small | 编辑 `theme.json`: `"fontSize": "small"` → `push` | +10-12 | — |
| 5 | template switch | `jadeai resume update <id> --template ats` | 不定 | — |

`pull` 导出 `theme.json` 到文件夹，编辑后 `push` 自动同步。每次只改一个参数，改完 export 验证 `pdfinfo \| grep Pages`。

**通过全部检查点后**：

```bash
jadeai push <id> --from ./jd-<company>-<role>/     # 同步 section JSONs + theme.json，一步搞定
jadeai resume export <id> --format pdf --out ./jd-<company>-<role>/resume.pdf --fit-one-page
pdfinfo ./jd-<company>-<role>/resume.pdf | grep Pages  # 必须 Pages: 1
```

**文件夹结构（一份简历 = 一个文件夹）：**
```
jd-<company>-<role>/
├── theme.json              ← pull 导出，push 自动同步
├── work_experience.json    ← pull 导出，push 同步
├── projects.json
├── education.json
├── skills.json
├── _profile.txt            ← profile codename（仅供引用）
└── resume.pdf              ← 最终输出
```

### 触发时机

每次以下操作前必须执行预算关：
- `jadeai push`（内容变更可能溢出）
- `jadeai resume export`（产出 PDF）
- `POST /api/ai/optimize` 之后（AI 可能生成过长内容）

纯查询操作例外。

---

## Quick Start

```bash
jadeai start &        # 启动服务器
jadeai ping           # 验证连通性
```

Auth 默认 `demo-fingerprint`。覆盖用 `--fingerprint <fp>`。

## Setup (only if `jadeai: command not found`)

```bash
git clone <repo-url> jadeai && cd jadeai
pnpm install && pnpm setup && pnpm link --global
```

---

## Essential Command Cheatsheet

| 操作 | 命令 |
|---|---|
| 启动服务器 | `jadeai start &` |
| 创建简历 | `jadeai resume create --title "..." --template <id> [--profile <name>] --out ./jd-{company}-{role}/` |
| 列出简历 | `jadeai resume list` |
| 查看简历 | `jadeai resume show <id>` |
| 创建衍生 | `jadeai resume derive <root-id> --title "..."` |
| 拉取到本地 | `jadeai pull <id> --out ./jd-<company>-<role>/` |
| 推送 section 回服务 | `jadeai push <id> --from ./jd-<company>-<role>/` |
| 导出 PDF | `jadeai resume export <id> --format pdf --out file.pdf [--fit-one-page]` |
| 列出模板 | `jadeai template list` |
| 列出 profile | `jadeai profile list` |
| 列出经历库 | `jadeai experience list [--type work\|project\|internship]` |
| 创建经历 | `jadeai experience create --type <t> --data @./file.json` |
| 更新简历元数据 | `jadeai resume update <id> --title "..." --template <id>` |
| 增删隐藏 section | `jadeai section add/update/delete/reorder` |
| 增删改 item | `jadeai item add/update/delete/reorder` |

完整命令参考 → [ref/commands.md](ref/commands.md)

---

## Decision Tree

### "I have a JD and want to create a targeted one-page resume"
→ 走 **[SOP 16 步流程](ref/strategy/sop.md)**。**预算关强制执行**：
1. **Analysis** — 解析 JD，映射经历，选角度，按 JD 权重分配 section 预算
2. **Layout** — 加载模板预算文件 → 清点内容 → 对比分配表 → 按 cut order 裁剪
3. **Execution** — 编辑 JSON → **BUDGET GATE** → push → export → 验证单页

完整 Recipe → [ref/recipes.md](ref/recipes.md) Recipe 1, 2, 8

### "I want to see what templates are available"
→ `jadeai template list [--locale zh|en]`

### "I want to create a new resume"
→ `jadeai resume create --title "..." --template <id> [--profile <codename>] --out ./jd-{company}-{role}/`
创建简历并自动拉取 section JSONs + theme.json 到文件夹，一步到位。

### "I want to see all my resumes"
→ `jadeai resume list`

### "I want to export a resume to PDF"
→ `jadeai resume export <id> --format pdf --out file.pdf [--fit-one-page] [--for-print]`
`--fit-one-page` 是最后手段 —— 优先内容裁剪。

### "I want to tailor a resume for a specific job"

**AI-assisted path (recommended):**

```bash
# Step 1: 从 root 创建衍生
jadeai resume derive <root-id> --title "JD: Company X Role"

# Step 2: AI 针对 JD 优化所有 section
curl -s -X POST http://localhost:3000/api/ai/optimize \
  -H "Content-Type: application/json" \
  -H "x-fingerprint: <fingerprint>" \
  -H "x-provider: <provider>" \
  -H "x-api-key: <key>" \
  -d '{"resumeId":"<derivative-id>","jobDescription":"<paste JD text>"}'

# Step 3 (MANDATORY): Budget Gate — AI 可能生成过长内容
jadeai pull <derivative-id> --out ./jd-<company>-<role>/
# → 清点 items/highlights/行数，对比分配表，超预算则裁剪

# Step 4: 导出
jadeai resume export <derivative-id> --format pdf --out ./resume.pdf --fit-one-page
pdfinfo ./resume.pdf | grep Pages  # 必须 Pages: 1
```

完整 Recipe → [ref/recipes.md](ref/recipes.md) Recipe 8

**Manual path:** `jadeai resume derive <root-id> --title "JD: Company X"` → pull → edit → budget gate → push → export

### "I want to fit a resume to one page / budget content"
→ [ref/layout/layout.md](ref/layout/layout.md) 模板行数预算 + [ref/layout/content-budget.md](ref/layout/content-budget.md) 分配表 + [ref/strategy/strategy.md](ref/strategy/strategy.md) JD 感知取舍。先裁剪内容，最后才用 typography levers 和 `--fit-one-page`。

### "I want to inspect a resume's metadata"
→ `jadeai resume show <id> --json | jq '{template, themeConfig, language, sectionTypes: [.sections[].type]}'`

### "I need to bulk-edit resume content locally"
→ `jadeai pull <id> --out <dir>` → 编辑 JSON（含 `theme.json`）→ **BUDGET GATE** → `jadeai push <id> --from <dir>`
Pull 导出每个 section 为 `<type>.json`，同时导出 `theme.json`。Push 一步同步 section + theme。

### "I want to create a derivative / make it standalone"
→ `jadeai resume derive <root-id> --title "..."`
→ `jadeai resume detach <id>`

### "I want to change resume metadata"
→ `jadeai resume update <id> --title "..." --template <id> [--theme ./theme.json]`

### "I want to duplicate / delete a resume"
→ `jadeai resume duplicate <id> --title "..."`
→ `jadeai resume delete <id> [--force]`

### "I want to parse a PDF into an editable resume"
→ `jadeai resume parse <file> --template <id>`

### "I want to manage sections"
→ `jadeai section list <id>`
→ `jadeai section add <id> --type <type> --title "..."`
→ `jadeai section update <id> <sid> [--title "..."] [--visible false] [--content <json-file>]`
→ `jadeai section delete <id> <sid>`
→ `jadeai section reorder <id> --order <id,id,...>`

### "I want to manage items within a section"
→ `jadeai item add <id> <sid> --item '{"key":"value"}'`
→ `jadeai item update <id> <sid> <iid> --fields '{"key":"value"}'`
→ `jadeai item delete <id> <sid> <iid>`
→ `jadeai item reorder <id> <sid> --order <id,id,...>`

### "I want to reference a profile / manage experience library"
→ `jadeai profile list`
→ `jadeai experience list [--type work|project|internship]`
→ `jadeai experience show <id>`
→ `jadeai experience create --type <t> --data @./file.json`
→ `jadeai experience update <id> --data @./file.json`
→ `jadeai experience delete <id> --force`

---

## Section Ordering Convention（硬性布局规则）

1. **personal_info** — 始终第一
2. **education** — 紧随其后
3. **work_experience** — 工作经历（含实习）
4. **projects** — 项目经历
5. **summary** — 个人摘要（附加项，不放在经历之前）
6. **skills** — 技能（附加项，不放在经历之前）
7. **certifications** — 可选
8. **languages** — 可选
9. **github** — 可选
10. **custom** — 可选
11. **qr_codes** — 可选

核心原则：先具体经历（education → work → projects），再概括总结（summary → skills）。

---

## Reference Index

| 需要什么 | 去哪里 |
|---|---|
| 完整 CLI 命令参考 | [ref/commands.md](ref/commands.md) |
| 8 个端到端 Recipe | [ref/recipes.md](ref/recipes.md) |
| 16 步 JD→PDF SOP | [ref/strategy/sop.md](ref/strategy/sop.md) |
| JD 解析方法论 | [ref/strategy/jd-parsing.md](ref/strategy/jd-parsing.md) |
| 策略：角度/预算/冲突/写法 | [ref/strategy/strategy.md](ref/strategy/strategy.md) |
| 模板行数预算公式 | [ref/layout/layout.md](ref/layout/layout.md) |
| 字符预算表 | [ref/layout/char-budget.md](ref/layout/char-budget.md) |
| 每模板 section 分配表 | [ref/layout/content-budget.md](ref/layout/content-budget.md) |
| **ThemeConfig CLI 排版接口** | [ref/layout/theme-cli.md](ref/layout/theme-cli.md) |
| 独立模板预算文件 | [ref/layout/templates/](ref/layout/templates/) |
| Section 类型/数据形状 | [ref/execution/execution.md](ref/execution/execution.md) |
| 项目经历写作规范 | [ref/writing/project.md](ref/writing/project.md) |
| 实习/工作经历写作规范 | [ref/writing/internship.md](ref/writing/internship.md) |

## Error Codes

→ [ref/execution/execution.md](ref/execution/execution.md)
