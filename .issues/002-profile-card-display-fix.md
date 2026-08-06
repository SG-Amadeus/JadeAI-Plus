# 个人档案卡片数据显示 + "用此档案创建简历"按钮修复

## 类型
bug

## 问题 1：档案卡片不显示用户姓名及数据字段

### 现象
个人档案卡片只显示 @codename（如 @amadeus），不显示存档中的真实姓名（如 张三），email/phone/jobTitle 等字段标签也全部缺失。

### 根因
SQLite 数据库中 `data` 列使用 `mode: 'json'` 存储。Drizzle 在某些情况下返回原始 JSON 字符串而非解析后的对象，导致 `profile.data?.fullName` 等访问结果为 `undefined`。

### 修复
在 `src/components/profiles/profile-list.tsx` 中新增 `parseProfileData()` 防御性解析函数。当 `profile.data` 为 JSON 字符串时自动 `JSON.parse`，再访问各字段。所有 `profile.data` 访问点统一通过该函数。

```ts
function parseProfileData(data: unknown): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return {}; }
  }
  return data as Record<string, unknown>;
}
```

## 问题 2："用此档案创建简历"按钮无效

### 现象
点击档案卡片上的"用此档案创建简历"按钮，跳转到 `/dashboard?open=create-resume&profile=codename`，但创建简历 Dialog 不自动打开，个人档案也未预选。

### 根因
Dashboard 使用 Zustand `useUIStore.activeModal` 控制 Dialog 开关，不支持 URL search params 传递状态。

### 修复
改为按钮直接调用 `POST /api/resume` 接口（传入 `profileCodename`），简历标题自动使用「姓名 的简历」格式。创建成功后直接跳转到 editor 页面。加载中显示 spinner。

```ts
const handleCreateResume = async (profile: Profile) => {
  setCreatingCodename(profile.codename);
  const data = parseProfileData(profile.data);
  const fullName = (data.fullName as string) || '';
  const title = fullName ? `${fullName} 的简历` : `${profile.codename} 的简历`;
  const res = await fetch('/api/resume', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, profileCodename: profile.codename }),
  });
  if (res.ok) {
    const resume = await res.json();
    router.push(`/editor/${resume.id}`);
  }
};
```

## 影响文件
- `src/components/profiles/profile-list.tsx` — 两处修复均在此文件
