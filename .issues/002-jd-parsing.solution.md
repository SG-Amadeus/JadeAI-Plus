# Solution #002: JD 结构化拆解

## 问题

JD 分析只输出匹配度指标（overallScore / atsScore / keywordMatches / missingKeywords / suggestions），JD 原文被当作不透明文本块折叠展示。用户无法快速了解岗位的核心职责、技术要求、硬性门槛。

## 根因

输出 schema 设计时只考虑了「简历 vs JD 匹配度」，没有要求 AI 输出 JD 本身的结构化拆解。JD 原文只在 UI 中作为原始文本展示，没有结构化渲染。

## 解决方案

**极简 AI 扩展**：在匹配度分析的同时，让 AI 输出一份 markdown 格式的 JD 结构化拆解。一个 schema 字段 + 一句 prompt + 一个 UI 区块，不引入额外 API 调用。

### 改动的文件

| 文件 | 改动 |
|------|------|
| `src/lib/ai/jd-analysis-schema.ts` | 新增 `jdBreakdown: z.string()` 字段 |
| `src/app/api/ai/jd-analysis/route.ts` | prompt 增加 jdBreakdown 输出指令 |
| `src/lib/ai/tools.ts` | `analyzeJdMatch` tool prompt 同步更新 |
| `src/components/editor/jd-analysis-dialog.tsx` | 新增「岗位拆解」区块，用 `ReactMarkdown` 渲染；`JdAnalysisResult` 类型加 `jdBreakdown?: string` |
| `messages/zh.json` / `messages/en.json` | 新增 `jdBreakdown` i18n key |

### 数据流

```
用户粘贴 JD → POST /api/ai/jd-analysis
  → generateText(prompt 包含 jdBreakdown 输出指令)
  → extractJson() 验证 Zod schema（jdBreakdown 为必填字段）
  → 持久化到 jd_analyses 表
  → UI 渲染：Score Dashboard → 岗位拆解卡片（ReactMarkdown）→ Summary → Keywords → Suggestions
```

### 向后兼容

`jdBreakdown?: string` 为可选字段。历史记录中该字段为 `undefined` 时，UI 不显示该区块，其余内容正常展示。

## 后续维护

如需调整 JD 拆解的章节结构，只需修改 `jdAnalysisOutputSchema` 中 `jdBreakdown` 的 `.describe()` 描述文本，AI 会按新格式输出。前端渲染自动适应 markdown 内容变化。
