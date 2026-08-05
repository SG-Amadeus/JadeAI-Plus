# Issue #004: CLI 接口设计 — 简历制作全生命周期 CLI 暴露

## 现状

简历的全部操作（填写、修改、排序、导出）依赖人工在 Web UI 逐字段点击。Agent（Claude Code 等）无法参与简历制作流程，因为没有任何 CLI 接口可以调用。

## 目标

**将简历制作的完整生命周期通过 CLI 暴露出来，让 AI Agent 可以驱动全流程。**

```
┌──────────────────────────────────────────────────────────────────┐
│                      简历制作生命周期                              │
│                                                                  │
│  create ──→ fill ──→ analyze ──→ optimize ──→ reorder           │
│    │          │         │           │            │               │
│    ▼          ▼         ▼           ▼            ▼               │
│  新建     填入数据    JD分析      AI改写      排序调整             │
│                                                                  │
│  grammar ──→ translate ──→ cover-letter ──→ export              │
│     │           │              │               │                 │
│     ▼           ▼              ▼               ▼                 │
│  语法检查    翻译          求职信          导出PDF               │
│                                                                  │
│  每个节点 = 一个 CLI 命令，Agent 可独立调用或链式编排              │
└──────────────────────────────────────────────────────────────────┘
```

Agent 典型工作流：
```bash
jadeai resume create --title "前端工程师" --template minimal
jadeai resume fill <id> --data ./my-info.json
jadeai analyze <id> --jd ./jd.txt              # 看差距
jadeai optimize <id> --jd ./jd.txt             # AI 改写匹配
jadeai section reorder <id> --ids ...           # 调顺序
jadeai grammar <id>                             # 润色
jadeai resume export <id> --format pdf          # 导出
```

每个步骤独立、可重入 —— Agent 可以只跑 optimize（不改前面的 fill），也可以从零跑到导出。

## 架构定位

```
┌──────────────────────────────────────────────────┐
│                 Next.js Server                    │
│  REST API (CRUD)  +  AI Routes (chat/analysis)   │
└────────────┬──────────────────┬──────────────────┘
             │                  │
        ┌────┴────┐        ┌───┴────┐
        │   CLI   │        │  Web   │
        │ (Agent) │        │ (Human)│
        └─────────┘        └────────┘
     AI 批量操作              人工微调
```

- **Web 前端**：人类可视化微调、预览、拖拽排序
- **CLI**：Agent 驱动批量操作 —— 填表、翻译、JD 适配、导出，全自动化
- **共享同一套 API**，CLI 是 thin client，不做业务逻辑

## CLI 命令设计

### 简历生命周期

```
# 创建 & 填充
jadeai resume create --title "前端工程师" --template minimal
jadeai resume fill <id> --data ./my-info.json
jadeai resume fill <id> --jd ./jd.txt          # 根据 JD 自动生成

# 查询
jadeai resume list
jadeai resume show <id>
jadeai resume show <id> --json                  # 机器可读输出

# 导出
jadeai resume export <id> --format pdf --output ./resume.pdf
jadeai resume export <id> --format html
```

### Section 操作

```
jadeai section list <resume-id>
jadeai section add <resume-id> --type skills --title "技能"
jadeai section remove <resume-id> <section-id>
jadeai section reorder <resume-id> --ids personal_info,summary,work,skills,education

# AI 重写单个 section
jadeai section rewrite <resume-id> <section-id> --prompt "强调管理经验"
```

### Item 细粒度操作

```
jadeai item add <resume-id> <section-id> --json '{...}'
jadeai item update <resume-id> <section-id> <item-id> --json '{...}'
jadeai item remove <resume-id> <section-id> <item-id>
jadeai item reorder <resume-id> <section-id> --ids a,b,c
```

### AI 分析 & 优化

```
jadeai analyze <resume-id> --jd ./jd.txt
jadeai optimize <resume-id> --jd ./jd.txt        # AI 自动修改简历匹配 JD
jadeai translate <resume-id> --lang en
jadeai grammar <resume-id>
jadeai cover-letter <resume-id> --jd ./jd.txt
```

### 模板

```
jadeai template list
jadeai template show minimal-blue
```

## 需要新增的 API 端点

CLI 需要的、目前缺失的 API：

| 端点 | 用途 |
|------|------|
| `PATCH /api/resume/[id]/sections/reorder` | Section 排序 |
| `PATCH /api/resume/[id]/sections/[sectionId]/items/reorder` | Item 排序 |
| `PATCH /api/resume/[id]/sections/[sectionId]/items/[itemId]` | 单 item 更新 |
| `DELETE /api/resume/[id]/sections/[sectionId]/items/[itemId]` | 单 item 删除 |
| `POST /api/resume/[id]/sections/[sectionId]/items` | 单 item 新增 |
| `POST /api/resume/[id]/fill` | AI 填表：JSON 数据 → 填充简历 |
| `POST /api/resume/[id]/optimize` | AI 优化：根据 JD 自动调整全部 section |

## CLI 实现方案

CLI 作为独立脚本目录 `cli/`，纯 Node.js + `fetch`，不引入额外依赖：

```
cli/
  index.ts          # 入口，命令路由
  commands/
    resume.ts       # create, list, show, fill, export
    section.ts      # list, add, remove, reorder, rewrite
    item.ts         # add, update, remove, reorder
    ai.ts           # analyze, optimize, translate, grammar, cover-letter
    template.ts     # list, show
  client.ts         # API client wrapper (auth headers, base URL, error handling)
```

- 通过环境变量 `JADEAI_BASE_URL` 指定服务器地址
- 通过 `JADEAI_API_KEY` 或 fingerprint 做认证
- JSON 输出模式（`--json`）便于 Agent 解析结果

## 数据流：AI 填表

```
my-info.json ──┐
               ├──→ POST /api/resume/[id]/fill ──→ AI generateText ──→ 简历 sections
template ──────┘
```

`fill` API 的 prompt 设计：
```
System: 你是一个专业简历撰写助手。根据用户提供的结构化个人信息和指定的模板结构，生成专业简历内容。

规则：
- 将工作经历转化为量化成就（使用 STAR 法则）
- 技能按熟练度分组
- 教育经历标准化格式
- 个人信息直接填入，不改写
- 输出格式：{ sections: [{ type, title, content }] }
```

## 与现有功能的关系

| 现有功能 | CLI 命令 | 关系 |
|----------|----------|------|
| AI Chat | `jadeai optimize` | CLI 封装 chat + tools 调用链 |
| JD Analysis | `jadeai analyze` | 直接调用现有 API |
| Translate | `jadeai translate` | 直接调用现有 API |
| Grammar Check | `jadeai grammar` | 直接调用现有 API |
| Cover Letter | `jadeai cover-letter` | 直接调用现有 API |
| Export | `jadeai export` | 直接调用现有 API |
| 人工填表 | `jadeai resume fill` | **新增** |
| Section CRUD | `jadeai section *` | 部分新增 API |
| Item CRUD | `jadeai item *` | **新增** |

## 涉及的技术决策

- CLI 语言：TypeScript（与项目一致，可直接 import 类型定义）
- CLI 运行时：`tsx` 或 `ts-node` 直接执行，无需编译
- API 认证：复用现有 fingerprint 机制
- 输出格式：默认人类可读，`--json` 输出 JSON
