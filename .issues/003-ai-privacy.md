# Issue #003: 简历隐私信息泄露风险 — AI 调用边界控制

## 现状

当前所有 AI 功能（JD 分析、AI 对话、翻译）在调用第三方 AI API 时，将完整的简历 section 数据作为 prompt 上下文发送，**包括个人基础信息（姓名、邮箱、电话、地址、LinkedIn、GitHub 等 PII）**。

### 涉及的代码路径

| 功能 | 文件 | 发送的数据 |
|------|------|-----------|
| JD 分析 | `src/lib/ai/tools.ts` `analyzeJdMatch` | `JSON.stringify(resume.sections)` — 完整简历 |
| AI Chat | `src/app/api/ai/chat/` | 完整简历 sections 作为 system prompt |
| 翻译 | `src/lib/ai/tools.ts` `translateResume` | 每个 section 完整 JSON 包含 content |
| Section 更新 | `src/lib/ai/tools.ts` `updateSection` | 单 section content |
| 文本改写 | `src/lib/ai/tools.ts` `rewriteText` | 单 section 部分字段 |

### 风险分析

- **personal_info** 包含 fullName、email、phone、location、website、linkedin、github — 全部是 PII
- 数据发送到 OpenAI / Anthropic / DeepSeek / GLM / 通义千问 / Moonshot / Gemini 等第三方服务器
- 用户对这些数据传输没有可见性，也没有选择权
- 即使部分 provider 承诺不训练，数据仍然离开了用户控制范围

## 期望

确保简历敏感信息（至少 personal_info）在发送到 AI 之前经过脱敏处理，同时不影响 AI 功能的有效性。
