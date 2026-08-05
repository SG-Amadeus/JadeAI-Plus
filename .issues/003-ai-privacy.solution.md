# Solution #003: 简历隐私脱敏 — AI 调用边界控制

## 问题

所有 AI 功能将完整 `resume.sections`（含 19 个 personal_info 字段：fullName, email, phone, wechat, avatar, website, linkedin, github 等）直接发送到第三方 AI API。8 条代码路径中只有 translate route 去掉了 `avatar`，其余全部完整传输 PII。

## 根因

没有统一的脱敏层。每个 AI 边界直接 `JSON.stringify(resume.sections)` 或逐 section 映射 content，没有过滤敏感字段的意识。

## 解决方案

**集中式脱敏工具 + 全边界覆盖**。新增 `src/lib/resume/sanitize.ts`，在数据离开服务端之前统一脱敏，不修改 DB。

### 敏感度分档

```
T1 核心隐私 → 永不发送: fullName, email, phone, wechat
T2 身份标识 → 永不发送: website, linkedin, github, customLinks, avatar,
                       age, gender, ethnicity, politicalStatus, maritalStatus
T3 专业展示 → 发送:     jobTitle, location, hometown, yearsOfExperience, educationLevel
```

### 两条 API

```typescript
// 批量脱敏 — 只读边界用（6 处）
sanitizeSectionsForAI(sections) → sections

// 脱敏 + 返还 — 翻译边界用（2 处，需 merge-back 防数据丢失）
stripPersonalInfoForAI(content) → { content, stripped }
```

### 翻译边界的特殊处理

翻译是唯一会写回 DB 的 AI 功能。strip 掉的字段必须在翻译后 merge 回去，否则会从 DB 永久删除：

```
strip → translate → merge back stripped → normalize → write DB
```

### 覆盖的 8 个边界

| # | 边界 | 保护方式 |
|---|------|----------|
| 1 | AI Chat | `sanitizeSectionsForAI` |
| 2 | JD 分析 | `sanitizeSectionsForAI` |
| 3 | analyzeJdMatch tool | `sanitizeSectionsForAI` |
| 4 | Grammar Check | `sanitizeSectionsForAI` |
| 5 | Cover Letter | `sanitizeSectionsForAI` |
| 6 | 面试模拟 | `sanitizeSectionsForAI` |
| 7 | 翻译 API | `stripPersonalInfoForAI` + merge-back |
| 8 | translateResume tool | `stripPersonalInfoForAI` + merge-back |

## 后续维护

### 新增 AI 功能

任何新增的 AI 调用路径，在序列化 resume 数据之前调用 `sanitizeSectionsForAI()`。如果是翻译类写回边界的，使用 `stripPersonalInfoForAI()` + merge-back。

### 调整脱敏字段

编辑 `src/lib/resume/sanitize.ts` 中的 `PII_STRIP_FIELDS` 数组，增删字段即可。所有边界自动生效。

### 注意事项

- **T3 字段（jobTitle/location/hometown）在翻译时会被发送给 AI**，因为这些字段需要翻译。如果后续需要收紧，将其移入 `PII_STRIP_FIELDS` 即可，翻译后将保留原文。
- **tool 的 result 回传**：`updateSection` / `rewriteText` 等 tool 的 execute 结果包含 `updatedContent`，会作为 tool output 回传给模型。这些内容来自 AI 自身的输出，不是 DB 中的原始 PII。
