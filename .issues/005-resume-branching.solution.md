# Solution #005: 简历分层架构 — Root/Derivative 分支模型

## 问题

每份简历独立存储，针对不同 JD 只能 full-duplicate（含 PII）。无法表达"个人信息是全局母版、经历针对岗位定制"的层级关系。PII 在多份副本中冗余，同步困难。

## 根因

数据库没有简历之间的层级关系。`resumes` 表是平铺的，所有副本地位均等。`duplicate` 全量复制包括 personal_info section。

## 解决方案

**在 `resumes` 表上建立单层 parent-child 关系，通过 merged view 注入 inherited personal_info，AI 端点统一过滤。**

### 数据模型

`resumes` 表新增两列（`src/lib/db/schema.ts`）：

```sql
parent_id  TEXT,          -- NULL=root, 非NULL=derivative
derived_at INTEGER        -- 派生时间戳
```

无新表，无数据迁移。现有行 `parent_id IS NULL` 天然就是 root。

### 合并视图（核心机制）

`src/lib/db/repositories/resume.repository.ts` — `loadWithMerge(resume)` :

当 resume 有 `parentId` 时：
1. 加载 resume 自身的 sections
2. 加载 root 的 sections，找到 `personal_info`
3. 在 derivative 的 sections 数组首位注入标记版本：
   - `id`: `inherited:<rootId>:<sectionId>` — synthetic id，DB 中无对应行
   - `inherited`: `true`, `inheritedFrom`: `<rootId>`
4. 验证 root 和 derivative 属于同一用户

效果：
- `GET /api/resume/<derivative>` 自动包含个人信息 → 导出、前端编辑器免费
- 对 synthetic id 的任何写操作 → `updateSection`/`deleteSection` 检测前缀并跳过 → PII 不可通过 derivative 修改
- `findByShareToken` 同样走合并视图 → 分享链接自动显示个人信息

### Repository 新方法

**`derive(rootId, userId, { title?, template?, language? })`**
- 校验 root 必须是 root（`parentId IS NULL`），否则返回 `{ error: 'CANNOT_DERIVE_FROM_DERIVATIVE' }`
- 创建新 resume 行，`parentId = rootId`, `derivedAt = now`
- 复制 root 的所有 sections **除了 `personal_info`**（新 UUID）
- 返回 `findById(newId)` → 合并视图

**`detach(id)`**
- 校验 resume 必须有 `parentId`，否则返回 `{ error: 'ALREADY_ROOT' }`
- 从 root 加载 personal_info，物化为真实 section（新 UUID, sortOrder = -1）
- 重新规范化所有 section 的 sortOrder
- `UPDATE resumes SET parent_id = NULL, derived_at = NULL`

**`delete(id)` 修改**
- 删除前 `SELECT COUNT(*) FROM resumes WHERE parent_id = ?`
- 有子简历 → 返回 `{ deleted: false, derivativeCount }`
- 新增 `deleteRecursively(id)` 级联删除

**`duplicate(id)` 修改**
- derivative 的复制品保留同一个 `parentId`（仍是同一 root 的 derivative）
- derivative 复制时跳过 `personal_info` section（inherited）和 inherited marker sections
- root 复制行为不变

**`updateSection(id)` / `deleteSection(id)` / `updateSectionOrder(sections)`**
- 检测 `id.startsWith('inherited:')` → 跳过

### API 变更

**新端点：**

| 端点 | 方法 | 文件 |
|------|------|------|
| `/api/resume/[id]/derive` | POST | `src/app/api/resume/[id]/derive/route.ts` |
| `/api/resume/[id]/detach` | POST | `src/app/api/resume/[id]/detach/route.ts` |

**修改端点：**

| 端点 | 变更 |
|------|------|
| `DELETE /api/resume/[id]` | `?force=true` → 调用 `deleteRecursively`；无 force → 409 + `derivativeCount` |
| `PUT /api/resume/[id]` | derivative 的 sections sync 中过滤掉 `type === 'personal_info'` |
| `POST /api/resume/[id]/sections` | derivative 上拒绝 `type === 'personal_info'` → 400 |

### AI 端点防御（9 个边界）

所有 AI 端点统一添加 `.filter((s: any) => !s.inherited)` 在 `sanitizeSectionsForAI` 之前：

| 端点 | 文件 | 过滤点 |
|------|------|--------|
| optimize | `ai/optimize/route.ts` | `targetSections` 过滤 inherited |
| rewrite-section | `ai/rewrite-section/route.ts` | **403** 拒绝 inherited section + `targetSections` 过滤 |
| fill (JD mode) | `ai/fill/route.ts` | `existingSections` 过滤 inherited |
| jd-analysis | `ai/jd-analysis/route.ts` | `resumeContext` 过滤 inherited |
| grammar-check | `ai/grammar-check/route.ts` | `sectionsToCheck` 过滤 inherited |
| cover-letter | `ai/cover-letter/route.ts` | `resumeContext` 过滤 inherited |
| chat | `ai/chat/route.ts` | `resumeContext` 过滤 inherited |
| translate | `ai/translate/route.ts` | `allSections` 过滤 inherited |
| interview | `interview/[id]/chat/route.ts` | `resumeContent` 过滤 inherited |
| chat tools | `lib/ai/tools.ts` | `resumeContext` 过滤 inherited |

### CLI 变更

**新命令：**
```bash
jadeai resume derive <root-id> --title "JD: ..." [--template <id>] [--language <lang>]
jadeai resume detach <derivative-id>
```

**修改命令：**
- `resume list` — 输出中显示 `parentId`
- `resume show` — 对 derivative 显示 inherited personal_info
- `resume delete` — `--force` 级联删除所有 derivative

### 涉及文件清单

| 层 | 文件 | 操作 |
|----|------|------|
| Schema | `src/lib/db/schema.ts` | +parentId, +derivedAt |
| Schema | `src/lib/db/pg-schema.ts` | +parentId, +derivedAt |
| Migration | `drizzle/migrations/0006_*.sql` | ALTER TABLE ADD COLUMN |
| Types | `src/types/resume.ts` | +parentId, +derivedAt, +inherited, +inheritedFrom |
| Repository | `src/lib/db/repositories/resume.repository.ts` | +loadWithMerge, +derive, +detach, +deleteRecursively, 改 delete/duplicate/updateSection/deleteSection/updateSectionOrder |
| API | `src/app/api/resume/[id]/route.ts` | 改 PUT (guard), DELETE (force/409) |
| API | `src/app/api/resume/[id]/derive/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/detach/route.ts` | **新增** |
| API | `src/app/api/resume/[id]/sections/route.ts` | 改 POST (reject personal_info on derivative) |
| AI | `src/app/api/ai/optimize/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/rewrite-section/route.ts` | 403 inherited |
| AI | `src/app/api/ai/fill/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/jd-analysis/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/grammar-check/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/cover-letter/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/chat/route.ts` | 过滤 inherited |
| AI | `src/app/api/ai/translate/route.ts` | 过滤 inherited |
| AI | `src/app/api/interview/[id]/chat/route.ts` | 过滤 inherited |
| AI | `src/lib/ai/tools.ts` | 过滤 inherited |
| CLI | `cli/commands/resume.ts` | +derive, +detach, 改 list/show/delete |
| CLI | `cli/index.ts` | 注册 derive + detach |
| CLI | `cli/help.ts` | 新命令 help + 更新顶层 help |

### 后续维护

- **新增 AI 功能**：在 `sanitizeSectionsForAI` 之前添加 `.filter(s => !s.inherited)`，确保个人信息系统不会泄露给 AI。
- **支持多级层级**：如需从 derivative 再派生，当前设计需要先 detach。如需多级，可将 `derive` 的校验从 `parentId IS NULL` 改为始终允许，但需注意 inherited personal_info 的递归查找复杂度。
- **derivative 共享**：`findByShareToken` 已走合并视图，分享链接自动显示 root 个人信息，与现有分享行为一致。
