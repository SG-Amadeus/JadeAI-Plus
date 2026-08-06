# 经历库数据模型重构、CLI-Web 同步修复、品牌重塑

## 类型
fix + enhancement

## 概述

本迭代解决了三个关键问题：

1. **经历库数据模型重构** — 将经历库类型从简历 section 类型中解耦，建立 `summary`（完整叙事）→ `highlights`（JD 特定描述）→ resume `description`（映射副本）的三层数据模型
2. **CLI-Web 指纹同步修复** — 浏览器 FingerprintJS 生成随机 ID 与 CLI 默认 `demo-fingerprint` 不匹配，导致双方数据不可见
3. **品牌重塑** — 从 JadeAI 更名为 JadeAI-Plus，清理所有 UI 文案、CLI 帮助、i18n、seed 数据、alt 属性

## 问题分析

### 1. 经历库数据模型（Issue #006 后续）

原有类型 `LibraryWorkItem extends WorkExperienceItem` 直接复用简历 section 的字段定义，存在两个问题：

- `highlights` 字段在简历中是一句话亮点，但经历库需要的是**完整的、面向不同 JD 的段落描述**
- `description` 语义模糊——是简历用的简短描述还是 AI 理解用的完整叙事？

**重新设计：**

- `summary` = **完整叙事（source of truth）**，多段落 prose，支持 Markdown 按角度组织。越丰富，AI 生成的 JD 特定内容质量越高
- `highlights` = **JD 特定的经历重述**，每个 highlight 是段落级描述，不是一句话要点。同一段 summary，面对前端岗 vs 后端岗 vs 管理岗应该生成不同的 highlights
- `notes` = AI 内部参考，复制到简历时自动剥离
- 简历 section 的 `description` 从 `summary` 映射而来（`stripNotes` 时处理）
- 向后兼容：`getSummary()` 同时读取 `summary || description`

### 2. CLI-Web 指纹同步

**症状：** CLI 创建的经历在前端 `/experiences` 页面看不到，反之亦然。

**根因：**
- 浏览器端 `useFingerprint` 使用 FingerprintJS 生成随机浏览器指纹（如 `abc123def456`）
- CLI 默认使用 `demo-fingerprint` 作为 `x-fingerprint` header
- 两个不同的指纹 = 两个不同的"用户" = 完全隔离的数据

**修复：**
- 重写 `use-fingerprint.ts`：当 `AUTH_ENABLED=false` 时，始终将 `localStorage['jade_fingerprint']` 写为 `demo-fingerprint`
- 移除 FingerprintJS 依赖（不再需要生成浏览器指纹）
- 在 `/experiences` 页面添加 `useFingerprint` 调用 + loading guard（该页面之前根本没有调用此 hook）

### 3. 品牌重塑

- `APP_NAME` 常量改为 `'JadeAI-Plus'`
- CLI help/start 文案：`JadeAI server` → `JadeAI-Plus server`
- i18n（zh.json, en.json）4 个 key
- `.env.example` APP_NAME
- Seed 数据全部替换为明显占位符（"示例城市"、"某某科技有限公司"、"示例理工大学"），仅保留用户名 `amadeus`
- README：更新 GitHub URL 为 `SG-Amadeus/JadeAI-Plus`，添加 Skills 安装说明、License 权限说明（Apache 2.0 允许 fork/modify/distribute/commercial use）
- Landing page：移除 "Star on GitHub | 1,882" 展示（桌面+移动端）
- 8 个文件中的 alt 文本、品牌链接更新

## 变更清单

| 文件 | 变更 |
|------|------|
| `src/types/experience.ts` | 独立类型 `LibraryWorkData`/`LibraryProjectData`，`getSummary()` 向后兼容 |
| `src/components/experiences/experience-form.tsx` | Summary 优先布局（6 行 + 品牌高亮），highlights 降级 |
| `src/components/experiences/experience-list.tsx` | 默认数据 shape 更新，`suppressHydrationWarning` 修复 Radix 水合错误 |
| `src/app/[locale]/experiences/page.tsx` | `useFingerprint` + loading guard |
| `src/hooks/use-fingerprint.ts` | 重写：auth 关闭时强制 `demo-fingerprint` |
| `src/app/api/resume/route.ts` | `stripNotes()`：summary→description 映射 |
| `src/lib/constants.ts` | APP_NAME → 'JadeAI-Plus' |
| `src/lib/db/seed-demo.ts` | 全部假数据 |
| `src/lib/db/seed.ts` | 全部假数据 |
| `src/lib/db/sample-resume.ts` | 全部假数据 |
| CLI `help.ts`, `start.ts` | JadeAI server → JadeAI-Plus server |
| `messages/zh.json`, `en.json` | appName, summary, highlights fields |
| `.env.example` | APP_NAME |
| `README.md` | GitHub URL, Skills, License |
| `src/components/landing/landing-header.tsx` | 移除 GitHub Star，更新 alt |
| 8 个文件 | alt 文本 + 品牌链接 |
| `.claude/skills/jadeai/SKILL.md` | 数据模型语义、@file.json 模式、recipes 更新 |

## 技术要点

- **数据模型层级:** `summary`（完整叙事）→ AI 理解 → `highlights`（JD 特定重述）→ `stripNotes` → resume `description`
- **指纹同步:** `AUTH_ENABLED=false` 时，CLI 和 Web 必须共享同一指纹。解决方案：Web 端不生成随机指纹，直接写入 `demo-fingerprint`
- **Radix 水合错误:** `useId()` 在服务端和客户端生成不同 ID → `suppressHydrationWarning` on `<Tabs>` 和 Popover trigger
- **全局链接:** `pnpm link --global` 创建的符号链接指向项目目录。目录改名后需重新 `pnpm link --global`
