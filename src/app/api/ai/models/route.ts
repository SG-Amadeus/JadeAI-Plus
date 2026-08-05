import { NextRequest } from 'next/server';
import { getProviderMeta, isOpenAICompatible } from '@/lib/ai/provider';

export async function GET(request: NextRequest) {
  const provider = request.headers.get('x-provider') || 'openai';
  const apiKey = request.headers.get('x-api-key') || '';
  const baseURL = request.headers.get('x-base-url') || getProviderMeta(provider)?.defaultBaseURL || '';

  if (!apiKey) {
    return Response.json({ models: [] });
  }

  try {
    let models: { id: string }[] = [];

    if (provider === 'anthropic') {
      const url = baseURL
        ? `${baseURL.replace(/\/$/, '')}/v1/models`
        : 'https://api.anthropic.com/v1/models';
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (!res.ok) return Response.json({ models: [] });
      const data = await res.json();
      models = (data.data ?? []).map((m: { id: string }) => ({ id: m.id }));
    } else if (provider === 'gemini') {
      const url = baseURL
        ? `${baseURL.replace(/\/$/, '')}/models?key=${apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ models: [] });
      const data = await res.json();
      models = (data.models ?? []).map((m: { name: string }) => ({
        id: m.name.replace(/^models\//, ''),
      }));
    } else {
      // All OpenAI-compatible providers: openai, deepseek, glm, qwen, moonshot, ...
      const effectiveBaseURL = baseURL.replace(/\/$/, '');
      const res = await fetch(`${effectiveBaseURL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return Response.json({ models: [] });
      const data = await res.json();
      models = (data.data ?? data).map((m: { id: string }) => ({ id: m.id }));
    }

    return Response.json({ models });
  } catch {
    return Response.json({ models: [] });
  }
}
