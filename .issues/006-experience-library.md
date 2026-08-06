# 经历库 (Experience Library)

## 类型
feature

## 概述

新增可复用的经历库功能，用户可以维护详细的工作经历、实习经历和项目经历记录。每一条记录包含完整字段以及仅供 AI 参考的"内部备注"（notes），不会被复制到简历中。创建简历时可从经历库勾选条目，自动填充到对应的 section。

## 设计决策

- **非 Dialog，原生页面** — 使用 `/experiences` 全屏页面 + 内联编辑，类似 Notion/Google Docs 的体验
- **与个人档案同模式** — 经历库和个人档案一样，先维护"源数据"，再在创建简历时引用
- **服务端剥离 notes** — `POST /api/resume` 接受 `experienceIds` 后加载条目，`stripNotes()` 移除内部备注再写入简历 section

## 新增功能

### 1. 数据库
- `experiences` 表：`id, userId, type('work'|'project'|'internship'), data(JSON), createdAt, updatedAt`
- 索引 `experience_user_idx` on `userId`

### 2. API 路由
- `GET/POST /api/experience` — 列表 / 创建（需 `x-profile-ui: 1` header）
- `GET/PUT/DELETE /api/experience/[experienceId]` — 单个 CRUD（需 `x-profile-ui: 1` header）
- `type` 验证：必须为 `"work"`, `"project"`, 或 `"internship"`
- **安全声明**：此 repository 对 AI routes 安全——experience data 非 PII

### 3. 前端页面 `/experiences`
- Hero header（渐变色 + 标题 + 副标题）
- Popover 添加按钮（选择工作/实习/项目）
- Tabs：工作经历 / 实习经历 / 项目经历
- 每个 tab 包含空状态引导或可展开卡片列表

### 4. 可展开经历卡片 (ExperienceCard)
- 收起状态：类型徽章（绿/琥珀/紫）、标题（公司·职位 或 项目名）、日期范围、技术标签、保存状态、删除按钮、展开箭头
- 展开状态：内联表单（复用 editor field 组件）、内部备注区（虚线边框提示"AI 会参考但不出现在简历上"）
- 双步删除：点击 → "确认删除?" 3 秒倒计时 → 再点击确认
- 自动保存：800ms 防抖 PUT + blur 立即 flush + 页面卸载 keepalive flush

### 5. 简历创建集成
- 创建简历 Dialog 新增"从经历库选择（可选）"区域
- 按类型分组（工作/实习/项目），checkbox 多选
- 选中条目传入 `POST /api/resume`，自动填充 `work_experience`（工作+实习）和 `projects` sections
- 空状态引导："去经历库添加工作/项目经历，创建简历时可一键导入"

### 6. 实习经历类型 (internship)
- 与工作经历共用表单字段（公司、职位、日期、描述、技术栈等）
- 独立的 tab、徽章（琥珀色）、空状态、添加按钮
- 在简历创建中合并到工作经历 section

### 7. Landing / 导航集成
- Header nav 新增"经历库"链接
- Landing Hero 新增"建立经历档案"按钮（位于"建立个人档案"和"浏览模板"之间）

## 数据流

```
/experiences page
  ├── 创建/编辑条目 → POST/PUT /api/experience
  └── 自动保存 → 800ms debounce → PUT /api/experience/[id]

创建简历 Dialog
  ├── 读取列表 → GET /api/experience (x-profile-ui: 1)
  ├── 勾选条目 → selectedExperienceIds[]
  └── 提交 → POST /api/resume { experienceIds }
              ├── findByIds(ids) + 过滤用户所有权
              ├── stripNotes() 移除内部备注
              ├── stripIds() 重新生成 UUID
              └── 填充 work_experience / projects sections
```

## AI 集成（后续）

- JD 生成 (`/api/ai/generate-resume`)：接受 `experienceIds`，加载条目（含 notes），注入 prompt，规则 "仅使用提供的经历记录——禁止编造公司、角色、日期"
- JD 优化 (`/api/ai/optimize`)：同上，规则 "可在库记录基础上强化，禁止编造"

## 相关文件

### 新增
- `src/app/[locale]/experiences/page.tsx`
- `src/components/experiences/experience-list.tsx`
- `src/components/experiences/experience-card.tsx`
- `src/components/experiences/experience-form.tsx`
- `src/hooks/use-experiences.ts`
- `src/app/api/experience/route.ts`
- `src/app/api/experience/[experienceId]/route.ts`
- `src/lib/db/repositories/experience.repository.ts`
- `src/types/experience.ts`

### 修改
- `src/lib/db/schema.ts` — 新增 experiences 表
- `src/lib/db/pg-schema.ts` — PG 同步
- `src/app/api/resume/route.ts` — POST 接受 experienceIds
- `src/components/dashboard/create-resume-dialog.tsx` — 经历选择器
- `src/hooks/use-resume.ts` — createResume 支持 experienceIds
- `src/components/layout/header.tsx` — 新增导航项
- `src/components/landing/hero-section.tsx` — 新增 CTA 按钮
- `messages/zh.json`, `messages/en.json` — i18n

## 验证
- [ ] 创建/编辑/删除工作、实习、项目经历记录
- [ ] 卡片展开/折叠、自动保存（saving→saved 状态指示）
- [ ] 双步删除确认正常工作
- [ ] 创建简历时勾选经历 → section 预填数据，notes 已剥离
- [ ] 空库时创建简历 Dialog 显示空状态引导
- [ ] 各模板正常渲染导入的经历数据
