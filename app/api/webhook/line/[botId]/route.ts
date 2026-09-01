import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { trackUsage } from '@/lib/cost-monitor';
import { verifyLineSignature, replyToLine } from '@/lib/line';

// Cloudflare Workers では環境変数がリクエスト処理時にしか利用できないため、
// モジュール読み込み時ではなく呼び出し時にクライアントを生成する。
function getAnthropic() {
  // Workers ランタイムの fetch を明示的に渡す（未指定だとNode流のHTTP接続を試みて失敗する）
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    fetch: globalThis.fetch.bind(globalThis),
  });
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  await connectDB();
  const bot = await Bot.findById(params.botId);

  if (!bot || !bot.lineConfig.enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!(await verifyLineSignature(rawBody, signature, bot.lineConfig.channelSecret))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue;

    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    try {
      const response = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: bot.systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const reply = response.content[0].type === 'text' ? response.content[0].text : '申し訳ありません、応答できませんでした。';

      await trackUsage(response.usage.input_tokens, response.usage.output_tokens);
      await replyToLine(bot.lineConfig.channelAccessToken, replyToken, reply);
    } catch (e) {
      console.error('LINE webhook error:', e);
    }
  }

  return NextResponse.json({ status: 'ok' });
}
