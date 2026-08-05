# Issue #001: 完善多模型协议支持架构

## 现状

当前 AI provider 架构仅硬编码了 3 个协议：

| Provider | 协议类型 | SDK |
|----------|---------|-----|
| OpenAI | OpenAI 兼容 | `@ai-sdk/openai` |
| Anthropic | Anthropic 原生 | `@ai-sdk/anthropic` |
| Gemini | Google 原生 | `@ai-sdk/google` |

**问题**：DeepSeek、GLM（智谱）、通义千问、Moonshot、零一万物等国产模型都使用 **OpenAI 兼容 API**，但系统中没有它们的预设配置。用户需要选择 "OpenAI" 然后手动填入其他厂商的 API 地址，体验割裂。

## 涉及的架构组件

```
src/lib/ai/provider.ts          ← AIProvider 类型 + getModel() switch
src/stores/settings-store.ts    ← AIProvider union type + PROVIDER_DEFAULTS
src/components/settings/settings-dialog.tsx  ← AI_PROVIDERS 下拉选项
src/app/api/ai/models/route.ts  ← 模型列表获取（按 provider 分支）
src/lib/ai/tools.ts             ← getJsonProviderOptions 只对 openai 启用
```

## 设计决策

**核心洞察**：DeepSeek、GLM、Qwen、Moonshot 等**全部使用 OpenAI 兼容的 REST API**（`/v1/chat/completions`、`/v1/models`），可以直接复用 `@ai-sdk/openai` 的 `createOpenAI`，只需不同的 `baseURL`。

因此不需要引入新的 SDK 依赖，只需：
1. 扩展 `AIProvider` 类型，增加新 provider 预设
2. 为每个新 provider 提供默认的 `baseURL` + `model`
3. 在 `getModel()` 中将它们路由到 `createOpenAI` 代码路径
4. 让 `getJsonProviderOptions` 对所有 OpenAI 兼容 provider 生效
5. 在 `models/route.ts` 中使用 OpenAI 兼容方式拉取模型列表

## 待新增的 Provider 预设

| key | 名称 | 默认 API 地址 | 默认模型 |
|-----|------|-------------|---------|
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| `glm` | 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| `qwen` | 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| `moonshot` | Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| `zhipu` | 智谱（别名） | 同 glm | 同 glm |

## 实现步骤

- [ ] 1. 扩展 `AIProvider` type（settings-store.ts）
- [ ] 2. 添加 `PROVIDER_DEFAULTS` 预设（settings-store.ts）
- [ ] 3. 重构 `getModel()` 支持新 provider（provider.ts）
- [ ] 4. 更新 `getJsonProviderOptions()` 对所有 OpenAI 兼容协议生效（provider.ts）
- [ ] 5. 更新设置面板下拉选项（settings-dialog.tsx）
- [ ] 6. 更新模型列表 API（models/route.ts）
- [ ] 7. 测试每个新 provider 的 API 连通性
