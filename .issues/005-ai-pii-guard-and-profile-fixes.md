# AI PII 安全守卫与个人档案相关修复

## 类型
fix

## 概述

修复 5 个与个人档案（Personal Profile）相关的问题：AI 润色在个人信息 section 的行为、解绑档案后字段清空不完整、浏览器自动填充干扰、孤儿 profileCodename 引用、以及经历卡片 HTML 嵌套 button 错误。

## 问题与解决方案

### 1. AI 润色按钮在个人信息 section 应永久禁用

**问题**: AI 润色（Sparkles）按钮仅在绑定个人档案时禁用，解绑后又可点击。个人信息（姓名、电话、邮箱等 PII）绝不应发送给 AI，无论是否绑定档案。

**修复** (`src/components/editor/section-wrapper.tsx`):
```ts
disabled={isPersonalInfo}  // 原逻辑: isPersonalInfo && !!boundProfile
title={t('aiDisabledForPII')}  // 提示: "个人信息不适用于 AI 润色"
```

### 2. "不使用档案"解绑后未清空所有字段

**问题**: 解绑个人档案后仅清空了 5 个字段（fullName, jobTitle, email, phone, location），性别、年龄、政治面貌等 13 个字段遗留。

**修复** (`src/components/editor/section-wrapper.tsx`):
清空全部 18 个字段：
```ts
onUpdate({
  fullName: '', jobTitle: '', email: '', phone: '', location: '',
  age: '', gender: '', politicalStatus: '', ethnicity: '', hometown: '',
  maritalStatus: '', yearsOfExperience: '', educationLevel: '',
  wechat: '', website: '', linkedin: '', github: '', avatar: ''
})
```

### 3. 浏览器自动填充 "test" 到档案代号字段

**问题**: 新建个人档案时，codename 输入框被浏览器自动填充为 "test"。

**修复** (`src/components/profiles/profile-form.tsx`):
- form 标签添加 `autoComplete="off"`
- codename input 添加 `autoComplete="off"`

### 4. 删除档案后残存孤儿 profileCodename

**问题**: 在 profile 管理页删除档案后，已绑定该档案的简历上的 `profileCodename` 未清除（`profileId` 已通过 FK 置空），导致 UI 显示不一致。

**修复** (`src/stores/resume-store.ts`):
三层防御：
1. 服务端 DELETE 主动清除关联简历的 denormalized 列
2. UI 仅在 `profileId` 和 `profileCodename` 均存在时才显示"已绑定"
3. 客户端加载时自动清除孤儿引用：
```ts
if (resume.profileCodename && !resume.profileId) {
  resume = { ...resume, profileCodename: null }
}
```

### 5. 经历卡片 <button> 嵌套 <button> 导致 hydration 错误

**问题**: ExperienceCard 头部是 `<button>` 用于展开/折叠，内部包含删除 `<Button>` 组件（渲染为 `<button>`），违反 HTML 规范，导致 React hydration 错误。

**修复** (`src/components/experiences/experience-card.tsx`):
外层 `<button>` 改为 `<div role="button" tabIndex={0}>`，添加键盘事件支持：
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => setExpanded(!expanded)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); setExpanded(!expanded);
    }
  }}
>
```

## 相关文件
- `src/components/editor/section-wrapper.tsx`
- `src/components/profiles/profile-form.tsx`
- `src/stores/resume-store.ts`
- `src/components/experiences/experience-card.tsx`

## 验证
- [ ] 个人信息 section → Sparkles 按钮始终 disabled
- [ ] 解绑档案 → 所有个人信息字段清空
- [ ] 新建档案 → codename 无浏览器自动填充
- [ ] 删除档案 → 关联简历不再显示孤儿 codename
- [ ] 经历卡片 → 展开/折叠和删除均正常工作，控制台无 hydration 错误
