# 照片/头像显示与裁剪修复

## 类型
fix

## 概述

一寸照（one-inch photo）在编辑器预览、头像组件和简约蓝模板中显示不全、裁剪不当、尺寸过小等问题。涉及三个层面的修复：编辑器预览、预览组件（AvatarImage）、以及各模板。

## 问题描述

### 1. 一寸照显示不全（被裁剪）
- 编辑器头像预览使用 `object-cover rounded-full` 无条件裁剪，一寸照无法完整显示
- AvatarImage 组件固定使用 `object-cover`，未区分圆形头像和一寸照

### 2. 照片太小
- 编辑器预览区域固定 `h-16 w-16`
- 简约蓝模板中照片固定 62×66px，且有 `overflow-hidden` 和硬编码 `object-cover`
- 导入照片压缩过大（maxSize=200, JPEG quality=0.85）

### 3. 导入照片仍被裁剪
- 根本原因在编辑器预览层（personal-info.tsx），AvatarImage 组件修复后，编辑器预览仍在裁剪

## 解决方案

### 编辑器预览 (`src/components/editor/sections/personal-info.tsx`)
```tsx
// 动态样式：圆形头像用 object-cover，一寸照用 object-contain
className={`relative flex shrink-0 ... ${
  avatarStyle === 'circle' ? 'h-20 w-20 rounded-full' : 'h-24 w-[68px] rounded'
}`}
// img tag:
className={`h-full w-full ${avatarStyle === 'circle' ? 'object-cover' : 'object-contain'}`}
```

### AvatarImage 组件 (`src/components/preview/avatar-image.tsx`)
- 一寸照模式：`objectFit: 'contain'`，宽高比 1:1.4，最小宽度 96px
- 添加 `backgroundColor: '#f1f1f1'` 防止透明区域显示异常
- 圆形模式：`objectFit: 'cover'`，宽高相等

### 简约蓝模板 (`src/components/preview/templates/minimal-template-blue-resume.tsx`)
- 移除 `overflow-hidden` 和固定 62×66px 包裹
- 移除 AvatarImage 上冲突的硬编码 `className`
- size 62→80，右侧 padding 78→100px

### 图片导入质量 (`src/components/profiles/profile-form.tsx`)
- `resizeImage` maxSize: 200→600
- JPEG quality: 0.85→0.92
- 白色背景填充防止透明

## 相关文件
- `src/components/editor/sections/personal-info.tsx`
- `src/components/preview/avatar-image.tsx`
- `src/components/preview/templates/minimal-template-blue-resume.tsx`
- `src/components/profiles/profile-form.tsx`

## 验证
- [ ] 上传一寸照 → 编辑器显示完整，无裁剪
- [ ] 上传圆形头像 → 正常裁剪为圆形
- [ ] 简约蓝模板 → 照片完整显示，尺寸适中
- [ ] 其他模板 → 照片显示不受影响
