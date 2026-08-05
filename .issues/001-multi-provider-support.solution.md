# Solution #001: 多模型协议支持架构

## 问题

AI provider 硬编码 3 个（openai / anthropic / gemini），不支持 DeepSeek、GLM、通义千问、Moonshot 等国产模型。

## 根因

Provider 身份、API 协议、SDK 路由三者耦合在一个 switch/case 里。新增 provider 需要改动 5 个文件，且没有统一的扩展入口。

## 解决方案

**数据驱动 provider 定义 + 协议路由**。参考 pi（Claude Code）架构：Provider 身份与 API 协议解耦，同一套 `openai-compatible` 协议支撑所有 OpenAI 兼容 provider。

### 核心设计

```
PROVIDERS 元数据表（单一数据源）
├── openai    → openai-compatible ─┐
├── deepseek  → openai-compatible ─┤
├── glm       → openai-compatible ─┼── createOpenAI({ baseURL })
├── qwen      → openai-compatible ─┤
├── moonshot  → openai-compatible ─┘
├── anthropic → anthropic ────────── createAnthropic({ baseURL })
└── gemini    → gemini ───────────── createGoogleGenerativeAI({ baseURL })
```

### 改动的文件

| 文件 | 改动 |
|------|------|
| `src/lib/ai/provider.ts` | 新增 `PROVIDERS` 元数据表、`ProviderMeta` 接口、协议路由、辅助函数 |
| `src/stores/settings-store.ts` | `AIProvider` 类型 + `PROVIDER_DEFAULTS` 从元数据自动生成 |
| `src/components/settings/settings-dialog.tsx` | 下拉选项从 `PROVIDERS` 动态生成 |
| `src/app/api/ai/models/route.ts` | 模型列表获取按协议路由，OpenAI 兼容走统一路径 |

## 后续维护

### 新增一个 OpenAI 兼容的 provider

只需在 `src/lib/ai/provider.ts` 的 `PROVIDERS` 数组中加一行：

```typescript
{ id: '<provider-id>', name: '<显示名>', api: 'openai-compatible', defaultBaseURL: '<API地址>', defaultModel: '<默认模型>' }
```

示例——新增百川：
```typescript
{ id: 'baichuan', name: '百川', api: 'openai-compatible', defaultBaseURL: 'https://api.baichuan-ai.com/v1', defaultModel: 'baichuan4' },
```

不需要改动其他任何文件。设置面板、模型拉取、JSON mode、AI 对话全部自动生效。

### 新增一个非 OpenAI 兼容的 provider

如果未来需要支持新协议（如 Mistral 原生 API），需要：

1. 安装对应的 `@ai-sdk/*` 包
2. 在 `PROVIDERS` 中添加元数据，`api` 字段使用新协议名
3. 在 `getModel()` 中添加新协议分支
4. 在 `models/route.ts` 中添加模型列表获取逻辑

### 注意事项

- **默认模型名会被用户覆盖**：`PROVIDERS` 中的 `defaultModel` 只是初始占位值。用户首次使用时通过 `/api/ai/models` 实时拉取可用模型列表，也可以手动输入任意模型名。
- **模型名会随时间变化**：厂商会更新模型名称（如 deepseek-chat → deepseek-v4-flash），默认值需要跟随更新。如果用户反馈某个 provider 的默认模型不可用，更新 `defaultModel` 字段即可。
- **本地缓存**：用户切换 provider 时，之前的 baseURL/model/apiKey 会保存在 localStorage。如果更新了默认值，已有用户不会自动获得——他们需要手动重新选择模型。这只影响已经配置过该 provider 的用户。
