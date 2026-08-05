# Solution #004: CLI 接口设计 — 简历制作全生命周期 CLI

## 问题

简历的全部 CRUD 操作（填写、修改、排序、导出）只能通过 Web UI 手动操作。Agent 无法驱动流程，因为没有程序化接口。

## 根因

没有 CLI 层。API 端点不完整 — 模板列表、section CRUD、item CRUD、section/item reorder 等操作没有对应的 REST 端点，CLI 无法封装。

## 解决方案

**补齐缺失的 CRUD API 端点 + 实现 thin CLI 层**。CLI 零外部依赖（纯 `fetch` + `fs`），通过 `pnpm --silent cli` 运行。

### 架构

```
Server API ←── CLI (Agent: 批量 CRUD + 导出)
           ←── Web (Human: 可视化微调 + AI 能力)
```

- CLI 是 thin API client，不做业务逻辑
- AI 能力（fill/optimize/grammar/translate/cover-letter）保留在 Web UI，CLI 不暴露（需要 API key）
- CLI 和 Web 共享同一套 API，数据一致

### CLI 实现

```
cli/
├── index.ts          # 入口：命令路由 + 全局 flag 解析
├── client.ts         # JadeClient: fetch 封装 + 错误映射 + fingerprint 认证
├── output.ts         # 输出格式化: --json vs human
├── errors.ts         # CliError + 退出码 (EX_USAGE=1, EX_NETWORK=2, EX_API=3, EX_IO=4)
├── types.ts          # 共享类型: ParsedArgs, JadeClientOpts
├── help.ts           # 顶层 help + 每命令详细 help
└── commands/
    ├── template.ts   # template list
    ├── resume.ts     # create, list, show, derive, detach, export, update, duplicate, delete, parse
    ├── section.ts    # list, reorder, update, add, delete
    ├── item.ts       # update, reorder, add, delete
    └── util.ts       # readJsonFile, parseCsv, writeOutput
```

关键设计决策:
- **`--json` 全局 flag** — 所有命令输出 `{"ok":true,"data":...}` 或 `{"ok":false,"error":"..."}`，Agent 可直接 pipe 到 `jq`
- **fingerprint 认证** — `--fingerprint <fp>` 或 `JADEAI_FINGERPRINT` 环境变量，复用现有认证机制
- **`--base-url`** — 指向服务器地址，默认 `http://localhost:3001`
- **退出码语义** — 0=成功, 1=参数错误, 2=网络错误, 3=API 错误, 4=IO 错误

### 17 个 CLI 命令

**Template:**
```bash
jadeai template list [--locale en|zh]
```

**Resume:**
```bash
jadeai resume create    --title <t> [--template <id>] [--language <lang>]
jadeai resume list
jadeai resume show      <id>
jadeai resume export    <id> --format json|html|txt|docx|pdf [--out <file>]
jadeai resume update    <id> [--title <t>] [--template <id>] [--theme <file>]
jadeai resume duplicate <id> [--title <t>]
jadeai resume delete    <id> [--force]
jadeai resume parse     <file> [--template <id>] [--language <lang>]
jadeai resume derive    <root-id> --title <t> [--template <id>]
jadeai resume detach    <id>
```

**Section:**
```bash
jadeai section list    <resume-id>
jadeai section add     <resume-id> --type <t> --title <t> [--content <file>]
jadeai section update  <resume-id> <section-id> [--title <t>] [--visible true|false] [--content <file>]
jadeai section delete  <resume-id> <section-id>
jadeai section reorder <resume-id> --order <id,id,...>
```

**Item:**
```bash
jadeai item add     <resume-id> <section-id> --item '{"key":"value"}'
jadeai item update  <resume-id> <section-id> <item-id> --fields '{"key":"value"}'
jadeai item delete  <resume-id> <section-id> <item-id>
jadeai item reorder <resume-id> <section-id> --order <id,id,...>
```

### 新增 API 端点（12 个）

| 端点 | 方法 | 用途 | 对应命令 |
|------|------|------|----------|
| `GET /api/templates?locale=` | GET | 模板列表+国际化名称 | `template list` |
| `PUT /api/resume/[id]/sections/reorder` | PUT | Section 排序 | `section reorder` |
| `PUT /api/resume/[id]/sections/[sid]` | PUT | 更新 section 元数据/内容 | `section update` |
| `POST /api/resume/[id]/sections` | POST | 新增 section | `section add` |
| `DELETE /api/resume/[id]/sections/[sid]` | DELETE | 删除 section | `section delete` |
| `POST /api/resume/[id]/sections/[sid]/items` | POST | 新增 item | `item add` |
| `PUT /api/resume/[id]/sections/[sid]/items/[iid]` | PUT | 更新 item 字段 | `item update` |
| `DELETE /api/resume/[id]/sections/[sid]/items/[iid]` | DELETE | 删除 item | `item delete` |
| `PUT /api/resume/[id]/sections/[sid]/items/reorder` | PUT | Item 排序 | `item reorder` |
| `POST /api/ai/fill` | POST | AI 填表（data/JD 双模式） | Web UI 用 |
| `POST /api/ai/optimize` | POST | AI 根据 JD 改写 | Web UI 用 |
| `POST /api/ai/rewrite-section` | POST | AI 重写单 section | Web UI 用 |

### CLI 实际工作流（Agent 视角）

```bash
# 设置连接
export JADEAI_BASE_URL=http://localhost:3000
export JADEAI_FINGERPRINT=demo-fingerprint

# 浏览模板
pnpm --silent cli template list

# 创建简历
ID=$(pnpm --silent cli --json resume create --title "前端工程师" --template minimal | jq -r '.data.id')

# 查看结构
pnpm --silent cli --json section list "$ID" | jq '.data[] | {id, type, title}'

# 添加项目经历
SID=$(pnpm --silent cli --json section add "$ID" --type projects --title "项目经历" | jq -r '.data.id')
pnpm --silent cli --json item add "$ID" "$SID" --item '{"name":"电商平台","description":"...","technologies":["React","Node.js"]}'

# 导出
pnpm --silent cli resume export "$ID" --format pdf --out resume.pdf
```

### 涉及文件清单

| 层 | 文件 | 操作 |
|----|------|------|
| CLI | `cli/index.ts` | **新增** — 入口 + arg parser + 命令路由 |
| CLI | `cli/client.ts` | **新增** — JadeClient HTTP wrapper |
| CLI | `cli/output.ts` | **新增** — JSON/human 双模式输出 |
| CLI | `cli/errors.ts` | **新增** — CliError + 退出码 |
| CLI | `cli/types.ts` | **新增** — 共享类型 |
| CLI | `cli/help.ts` | **新增** — 完整 help 文本 |
| CLI | `cli/commands/template.ts` | **新增** — template list |
| CLI | `cli/commands/resume.ts` | **新增** — 10 个 resume 命令 |
| CLI | `cli/commands/section.ts` | **新增** — 5 个 section 命令 |
| CLI | `cli/commands/item.ts` | **新增** — 4 个 item 命令 |
| CLI | `cli/commands/util.ts` | **新增** — 文件/CSV/JSON 辅助函数 |
| API | `src/app/api/templates/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/reorder/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/[sectionId]/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/[sectionId]/items/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/[sectionId]/items/[itemId]/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/[sectionId]/items/reorder/route.ts` | **新增** |
| API | `src/app/api/ai/fill/route.ts` | **新增** |
| API | `src/app/api/ai/optimize/route.ts` | **新增** |
| API | `src/app/api/ai/rewrite-section/route.ts` | **新增** |
| Config | `package.json` | 改 — 新增 `"cli": "tsx cli/index.ts"` script |

### 后续维护

- **新增 CLI 命令**：在 `cli/commands/` 中创建 handler → 在 `cli/index.ts` 的 `COMMANDS` 数组注册 → 在 `cli/help.ts` 添加 help 文本
- **新增 API 端点**：CLI 命令直接调用新端点，遵循现有 auth 模式（fingerprint → resolveUser → ownership check）
- **Agent 编排**：所有命令支持 `--json` 输出，可 pipe 到 `jq` 提取字段串联下一步操作
