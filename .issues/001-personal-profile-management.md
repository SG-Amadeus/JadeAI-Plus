# 个人档案 (Personal Profile) 管理功能

## 类型
feature

## 概述

新增个人档案管理功能，用户可以创建可复用的个人信息档案（如 amadeus、张三），在创建简历时自动填充个人信息，无需重复输入。同时建立硬安全边界，确保 AI 永远无法读取档案中的个人敏感数据。

## 新增功能

### 1. 数据库层
- 新增 `personal_profiles` 表：`id, userId, codename（唯一）, data（JSON）, createdAt, updatedAt`
- `resumes` 表新增 `profileId` + `profileCodename`（反范式化，AI route 无需查 profile 表）

### 2. API 路由
- `GET/POST /api/profile` — 列表 / 创建（需 `x-profile-ui: 1` header）
- `GET/PUT/DELETE /api/profile/[profileId]` — 单个 CRUD（需 `x-profile-ui: 1` header）
- `GET /api/profile/codenames` — 仅返回 `[{id, codename}]`，CLI 可用，无需 UI header
- `requireUiClient()` — 安全守卫，CLI/curl 无法获取完整 profile 数据

### 3. 简历创建集成
- `POST /api/resume` 支持 `profileCodename` 参数，自动解析并预填 `personal_info` section
- `buildPersonalInfoContent()` — 将 profile data 映射为标准 PersonalInfo 格式

### 4. 前端 — 个人档案页面 `/profiles`
- 横向滚动卡片展示，显示 @codename、姓名、masked 邮箱/电话/职位
- 创建/编辑 Dialog（17 个字段 + 头像上传）
- "用此档案创建简历"按钮一键创建简历并自动填充个人信息
- 空状态引导浏览模板或返回 Dashboard

### 5. 前端 — Landing / Dashboard 集成
- 创建简历 Dialog 新增个人档案下拉选择器
- Dashboard 顶部新增 User 图标跳转到 `/profiles`
- Landing Hero CTA 改为"建立个人档案"，新增隐私声明（AI 无法读取个人信息）

### 6. JSON 导出 v2
- `format=json` 返回新格式：`{version:2, profileCodename, profileId, sections[]}`
- 仅导出 experience 类 section（work_experience, education, projects, skills）
- 不含 `personal_info` — 保护隐私

### 7. CLI
- `jadeai profile list` — 仅显示 codename 和 ID（无数据内容）
- `jadeai resume create --profile <codename>` — 创建简历时引用 profile

### 8. AI 安全边界
- AI route（`/api/ai/**`, `/lib/ai/**`, interview route）禁止 import `profile.repository`
- AI system prompt 仅通过简历上的 `profileCodename` 字段知悉 codename
- `security-boundary.test.ts` 静态分析测试防止安全边界回归

## 安全设计

| 层 | 机制 |
|---|---|
| 数据库 | profile data 与 resume 隔离，resume 仅存 denormalized codename |
| API | `x-profile-ui: 1` header 守卫所有 data 端点，CLI 不可伪造 |
| AI routes | 静态分析禁止 import profile repository |
| Export | JSON v2 不含 personal_info，仅含 codename 引用 |
| CLI | `profile list` 仅返回 codename 列表 |

## 相关文件

### 新增文件
- `src/app/[locale]/profiles/page.tsx` — 个人档案页面
- `src/components/profiles/profile-list.tsx` — 档案卡片列表
- `src/components/profiles/profile-form.tsx` — 档案表单（17 字段 + 头像）
- `src/components/profiles/profile-form-dialog.tsx` — 创建/编辑 Dialog
- `src/hooks/use-profiles.ts` — 档案数据 hook
- `src/app/api/profile/route.ts` — GET/POST 档案列表
- `src/app/api/profile/[profileId]/route.ts` — 单个档案 CRUD
- `src/app/api/profile/codenames/route.ts` — codename 列表（CLI 可用）
- `src/lib/db/repositories/profile.repository.ts` — 档案 DB 仓库
- `src/lib/auth/ui-only.ts` — UI 专属请求守卫
- `src/lib/profile/prefill.ts` — 档案数据 → PersonalInfo 转换
- `src/lib/ai/security-boundary.test.ts` — 安全边界静态分析测试
- `cli/commands/profile.ts` — CLI profile list 命令
- `drizzle/migrations/0007_fancy_boomerang.sql` — 数据库迁移

### 修改文件
- `src/lib/db/schema.ts` — 新增 personalProfiles 表
- `src/lib/db/pg-schema.ts` — PG 同步
- `src/app/api/resume/route.ts` — POST 支持 profileCodename
- `src/app/api/resume/[id]/export/route.ts` — JSON 导出 v2
- `src/app/api/ai/chat/route.ts` — 传递 profileCodename 到 system prompt
- `src/lib/ai/prompts.ts` — system prompt 注入 profile 提示
- `src/lib/constants.ts` — 新增 EXPORT_SECTION_TYPES
- `src/types/resume.ts` — Resume 接口新增 profileId/profileCodename
- `src/components/dashboard/create-resume-dialog.tsx` — 新增 profile 选择器
- `src/app/[locale]/dashboard/page.tsx` — 新增 profiles 入口
- `src/components/landing/hero-section.tsx` — CTA 改为"建立个人档案"
- `src/components/landing/cta-section.tsx` — 链接指向 /profiles
- `src/hooks/use-resume.ts` — createResume 支持 profileCodename
- `cli/commands/resume.ts` — 新增 --profile flag
- `cli/help.ts` — 新增 profile group 帮助
- `cli/index.ts` — 注册 profile list 命令
- `messages/zh.json`, `messages/en.json` — i18n

## 验证清单
- [ ] 通过 UI 创建个人档案 → 在列表中显示
- [ ] 用档案创建简历 → editor 中 personal_info 已预填
- [ ] AI 对话 → 上下文中无档案数据，仅显示 codename 提示
- [ ] JSON 导出 → 不含 personal_info，仅含 profileCodename
- [ ] CLI `jadeai profile list` → 仅显示 codename 和 ID
- [ ] curl POST /api/profile 无 `x-profile-ui` header → 403
- [ ] `pnpm test` → 安全边界测试通过
