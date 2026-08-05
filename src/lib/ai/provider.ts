import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// === Provider metadata (data, not code) ===

type ApiProtocol = 'openai-compatible' | 'anthropic' | 'gemini';

export interface ProviderMeta {
  id: string;
  name: string;
  api: ApiProtocol;
  defaultBaseURL: string;
  defaultModel: string;
}

export const PROVIDERS: ProviderMeta[] = [
  { id: 'openai',    name: 'OpenAI',        api: 'openai-compatible', defaultBaseURL: 'https://api.openai.com/v1',               defaultModel: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic',      api: 'anthropic',         defaultBaseURL: 'https://api.anthropic.com',              defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'gemini',    name: 'Google Gemini',  api: 'gemini',            defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-2.0-flash' },
  { id: 'deepseek',  name: 'DeepSeek',      api: 'openai-compatible', defaultBaseURL: 'https://api.deepseek.com/v1',            defaultModel: 'deepseek-v4-flash' },
  { id: 'glm',       name: '智谱 GLM',      api: 'openai-compatible', defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',   defaultModel: 'glm-4-flash' },
  { id: 'qwen',      name: '通义千问',      api: 'openai-compatible', defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus' },
  { id: 'moonshot',  name: 'Moonshot',      api: 'openai-compatible', defaultBaseURL: 'https://api.moonshot.cn/v1',              defaultModel: 'moonshot-v1-8k' },
];

export type AIProvider = typeof PROVIDERS[number]['id'];

const providerMap = new Map<string, ProviderMeta>(PROVIDERS.map((p) => [p.id, p]));

export function getProviderMeta(id: string): ProviderMeta | undefined {
  return providerMap.get(id);
}

export function getProviderIds(): AIProvider[] {
  return PROVIDERS.map((p) => p.id) as AIProvider[];
}

export function isOpenAICompatible(provider: string): boolean {
  return providerMap.get(provider)?.api === 'openai-compatible';
}

// === User-facing config (extracted from request headers) ===

export interface AIConfig {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
}

export function extractAIConfig(request: NextRequest): AIConfig {
  const provider = request.headers.get('x-provider') || 'openai';
  const apiKey = request.headers.get('x-api-key') || '';
  const baseURL = request.headers.get('x-base-url') || '';
  const model = request.headers.get('x-model') || '';

  const meta = getProviderMeta(provider);
  return {
    provider,
    apiKey,
    baseURL: baseURL || meta?.defaultBaseURL || 'https://api.openai.com/v1',
    model: model || meta?.defaultModel || 'gpt-4o',
  };
}

// === Model resolution ===

export function getModel(config: AIConfig, modelOverride?: string) {
  if (!config.apiKey) {
    throw new AIConfigError('API key is required. Please configure it in Settings.');
  }
  const modelId = modelOverride || config.model;

  if (config.provider === 'anthropic') {
    const p = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL || undefined });
    return p(modelId);
  }

  if (config.provider === 'gemini') {
    const p = createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseURL || undefined });
    return p(modelId);
  }

  // All other providers (openai, deepseek, glm, qwen, moonshot, ...) are OpenAI-compatible
  const p = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  return p.chat(modelId);
}

/**
 * Returns providerOptions for JSON mode — applicable to all OpenAI-compatible providers.
 */
export function getJsonProviderOptions(config: AIConfig) {
  if (isOpenAICompatible(config.provider)) {
    return { openai: { response_format: { type: 'json_object' as const } } };
  }
  return {} as Record<string, never>;
}

export class AIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigError';
  }
}
