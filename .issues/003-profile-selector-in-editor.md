# 简历编辑器个人信息区块 — 选择个人档案 & AI 润色禁用

## 类型
feature

## 概述

在简历编辑器的「个人信息」区块头部添加"选择个人档案"按钮，用户可从已创建的档案中选取并自动填充个人信息。当档案绑定后，「AI 润色」按钮自动禁用，防止 AI 覆盖档案数据。

## 需求

1. 个人信息区块标题左侧（拖拽手柄旁边）新增一个 User 图标按钮
2. 点击弹出 Popover，展示所有可用个人档案列表
3. 选择档案后自动获取档案数据并填充到个人信息表单
4. 绑定档案后：
   - User 图标变为 brand 颜色标识已绑定
   - AI 润色按钮（Sparkles）变为禁用态，tooltip 显示"已绑定个人档案，AI 润色不可用"
5. 可随时选择「不使用档案」清除绑定（已填充的信息保留在表单中）

## 实现细节

### 前端
- `src/components/editor/section-wrapper.tsx`
  - 个人信息区块头部新增 Popover 档案选择器
  - 打开 Popover 时从 `/api/profile/codenames` 获取档案列表
  - 选择档案时调用 `/api/profile/[id]`（附 `x-profile-ui: 1` header）获取完整档案数据
  - 通过 `buildPersonalInfoContent()` 转换为表单数据并写入 section content
  - 同时更新 `currentResume.profileCodename/profileId` 并触发 autosave
  - AI 润色按钮：`disabled={isPersonalInfo && !!boundProfile}`，tooltip 动态切换

### API / 数据层
- `src/app/api/resume/[id]/route.ts` — PUT 路由新增 `profileCodename` / `profileId` 字段支持
- `src/lib/db/repositories/resume.repository.ts` — `update()` 类型签名新增 profile 字段
- `src/stores/resume-store.ts` — `save()` 负载始终包含 `profileCodename` / `profileId`

### i18n
- `messages/zh.json`, `messages/en.json` — 新增：
  - `editor.selectProfile` — "选择个人档案" / "Select Profile"
  - `editor.profileBound` — "已绑定个人档案，AI 润色不可用" / "Profile bound, AI polish unavailable"
  - `editor.noProfile` — "不使用档案" / "None"

## 影响文件
- `src/components/editor/section-wrapper.tsx` — 主要 UI 逻辑
- `src/app/api/resume/[id]/route.ts` — PUT 路由支持 profile 绑定
- `src/lib/db/repositories/resume.repository.ts` — update 类型更新
- `src/stores/resume-store.ts` — save 负载包含 profile 字段
- `messages/zh.json`, `messages/en.json` — i18n

## 验证清单
- [ ] 在编辑器打开个人信息区块 → 左侧显示 User 按钮
- [ ] 点击 User 按钮 → Popover 弹出，显示已有档案列表
- [ ] 选择一个档案 → 个人信息自动填充（姓名、邮箱、电话等）
- [ ] User 图标变为 brand 颜色
- [ ] AI 润色按钮变为灰色禁用态
- [ ] 再次点击 User 按钮 → 选择「不使用档案」→ 绑定清除，AI 润色恢复
- [ ] 刷新页面 → 档案绑定和已填充信息保持
