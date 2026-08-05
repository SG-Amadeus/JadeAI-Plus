import { NextRequest, NextResponse } from 'next/server';
import { TEMPLATES } from '@/lib/constants';
import { templateLabelsMap } from '@/lib/template-labels';

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'zh';
  let messages: Record<string, any> = {};
  try {
    messages = (await import(`../../../../messages/${locale}.json`)).default;
  } catch {
    try {
      messages = (await import(`../../../../messages/zh.json`)).default;
    } catch { /* empty */ }
  }

  const templates = TEMPLATES.map((id) => {
    const key = templateLabelsMap[id];
    const name = key ? (messages[key] || id) : id;
    return { id, name };
  });

  return NextResponse.json({ templates });
}
