# Issue #002: JD 分析缺少对 JD 本身的结构化解析

## 现状

当前 JD 分析（`/api/ai/jd-analysis`）的输出完全是「简历 vs JD 匹配度」：

```typescript
// jdAnalysisOutputSchema — 全是匹配度指标，没有 JD 自身结构
{
  overallScore: number,       // 综合匹配分
  atsScore: number,           // ATS 兼容分
  summary: string,            // 综合评估（只有这里可能涉及 JD 内容）
  keywordMatches: string[],   // 命中的关键词
  missingKeywords: string[],  // 缺失的关键词
  suggestions: [...]          // 优化建议
}
```

JD 本身被当作一个不透明文本块，UI 中只在折叠面板里展示原始文本，用户无法快速了解：
- 这个岗位的核心职责是什么
- 硬性要求有哪些（必须项 vs 加分项）
- 技术要求栈是什么
- 学历/经验门槛是什么

## 期望

JD 分析结果应该包含 JD 本身的结构化拆解，让用户一眼看懂岗位要求，再结合匹配度评分定位差距。

## 涉及的文件

- `src/lib/ai/jd-analysis-schema.ts` — 输出 schema
- `src/app/api/ai/jd-analysis/route.ts` — API 路由 + prompt
- `src/components/editor/jd-analysis-dialog.tsx` — 结果展示 UI
- `src/lib/ai/tools.ts` — AI chat 中的 analyzeJdMatch tool（有重复实现）
