# Issue #005: 简历分层架构 — Root/Derivative 分支模型

## 现状

每份简历是完全独立的实体。用户针对不同 JD 投递时，只能 `duplicate` 完整复制（包括个人信息 PII），然后手动修改。这导致：

1. **PII 冗余**：姓名、邮箱、手机等个人信息在多份简历中重复存储。修改需要逐份更新。
2. **无差异化来源**：无法区分"详细的原始经历（母版）"和"针对某 JD 的精简优化版"。所有副本平权，Agent 无法理解层级关系。
3. **CLI/Agent 工作流断裂**：Agent 从零建简历时，无法区分"个人信息（全局唯一母版）"和"岗位适配（JD 定制分支）"，每次都要复制全部数据。
4. **AI 可见性边界模糊**：虽然 `sanitizeSectionsForAI` 剥离了 PII 字段，但 personal_info section 仍作为整体发送给 AI（只是字段为空）。缺乏结构层级的"个人信息完全不出现在 AI 请求中"的保证。

## 目标

**Root（根简历）= 个人信息母版 + 详细经历库。Derivative（派生简历）= 针对 JD 的定制分支。**

```
Root（个人信息 + 详细经历）     ← 唯一 PII 来源，AI 完全不可见
 ├── Derivative A（JD: 后端）  ← 经历/技能针对 JD 优化，AI 可见
 ├── Derivative B（JD: 前端）  ← 经历/技能针对 JD 优化，AI 可见
 └── Derivative C（JD: 全栈）  ← 经历/技能针对 JD 优化，AI 可见
```

### 分层可见性

| 层级 | 内容 | 存储位置 | AI 可见 | 编辑方式 |
|------|------|----------|---------|----------|
| **PII 层** | personal_info | 仅 Root（inherited 注入 derivative） | **不可见** | 仅通过 root 编辑 |
| **可编辑层** | summary, work_experience, education, skills, projects 等 | Derivative 自有副本 | **可见** | AI/手动自由编辑 |

### 核心机制

- **合并视图**：`GET /api/resume/<derivative>` 返回的 sections 在首位注入 root 的 personal_info（synthetic id `inherited:<rootId>:<sectionId>`，标记 `inherited: true`）。导出、前端编辑器自动获得完整简历。
- **写保护**：synthetic id 在 DB 中无对应行，`updateSection`/`deleteSection` 天然无副作用。PII 无法通过 derivative 修改。
- **级联语义**：删除 root 需要 `?force=true`（先删所有 derivative）；derivative 脱离 root（detach）后 personal_info 物化为自身数据。

## Agent 工作流

```bash
# 1. 创建根简历（个人信息母版 + 详细经历库）
ROOT=$(jadeai resume create --title "我的母版简历" --template modern --json | jq -r '.data.id')

# 2. 填写个人信息（仅此一份，所有 derivative 共享）
jadeai section update "$ROOT" <personal_info_sid> --content personal.json

# 3. 填写详细经历（根版本，最完整的描述）
jadeai section update "$ROOT" <work_sid> --content detailed-work.json

# 4. 针对 JD 创建 derivative（个人信息自动继承）
D1=$(jadeai resume derive "$ROOT" --title "JD: 字节后端" --json | jq -r '.data.id')
# ... 在 Web UI 中 AI 优化 derivative 的经历/技能匹配 JD ...

# 5. 导出（自动合并个人信息）
jadeai resume export "$D1" --format pdf --out bytedance.pdf

# 6. 个人信息更新（只需改 root，所有 derivative 自动同步）
jadeai section update "$ROOT" <personal_info_sid> --content updated.json
```

## 涉及的技术决策

- **Schema 最小化**：resumes 表仅新增 `parentId`（自引用 FK）+ `derivedAt`（时间戳），无新表。现有数据 `parentId = NULL` 天然就是 root。
- **单层层级**：derivative 不能再被 derive（需先 detach 为 root）。避免深层嵌套的复杂度。
- **inherited marker**：通过 synthetic id 前缀 `inherited:` 标记，所有 AI 端点统一过滤。防御深度 — repository 层 + API 层双重保护。
- **duplicate 语义**：derivative 的复制品保留同一个 `parentId`（仍是同一 root 的 derivative）；root 的复制品是独立 root（现有行为不变）。
