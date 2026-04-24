import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { BotUsage } from '@/lib/models/BotUsage';
import { Conversation } from '@/lib/models/Conversation';
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limit';
import { trackUsage } from '@/lib/cost-monitor';
import { sendLineNotification } from '@/lib/line';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TURNS = 10;

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const ip = getClientIp(req);
  const sessionId = req.headers.get('x-session-id') ?? crypto.randomUUID();
  const { message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 });
  }

  await connectDB();

  const bot = await Bot.findById(params.botId);
  if (!bot) return NextResponse.json({ error: 'Bot not found' }, { status: 404 });

  // 月間トークン上限チェック
  const yearMonth = getCurrentYearMonth();
  const monthlyLimit = bot.settings?.monthlyTokenLimit ?? 50000;
  const botUsage = await BotUsage.findOne({ botId: params.botId, yearMonth });
  const totalTokensUsed = botUsage ? botUsage.inputTokens + botUsage.outputTokens : 0;

  if (totalTokensUsed >= monthlyLimit) {
    return NextResponse.json(
      { error: '今月の利用上限に達しました。来月またお試しください。' },
      {
        status: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
        },
      }
    );
  }

  let conversation = await Conversation.findOne({ botId: params.botId, sessionId });

  const isNewConversation = !conversation;

  if (isNewConversation) {
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: '1日の会話上限（50回）に達しました。明日またお試しください。' },
        { status: 429 }
      );
    }
    await incrementRateLimit(ip);

    conversation = await Conversation.create({
      botId: params.botId,
      sessionId,
      ip,
      messages: [],
    });
  }

  const userTurns = conversation!.messages.filter((m: { role: string }) => m.role === 'user').length;
  if (userTurns >= MAX_TURNS) {
    return NextResponse.json(
      { error: '1セッションの上限（10ターン）に達しました。ページを再読み込みして新しい会話を始めてください。' },
      { status: 429 }
    );
  }

  const history = conversation!.messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
  history.push({ role: 'user', content: message });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: bot.systemPrompt,
      messages: history,
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // ボットごとの月間使用量を記録
    await BotUsage.findOneAndUpdate(
      { botId: params.botId, yearMonth },
      { $inc: { inputTokens, outputTokens } },
      { upsert: true }
    );

    await Conversation.findByIdAndUpdate(conversation!._id, {
      $push: {
        messages: [
          { role: 'user', content: message, timestamp: new Date() },
          { role: 'assistant', content: assistantMessage, timestamp: new Date() },
        ],
      },
      $inc: { inputTokens, outputTokens },
    });

    await trackUsage(inputTokens, outputTokens);

    if (bot.lineConfig.enabled && bot.lineConfig.channelAccessToken) {
      sendLineNotification(bot.lineConfig, message, assistantMessage, bot.settings.botName).catch(
        console.error
      );
    }

    return NextResponse.json(
      { message: assistantMessage, sessionId },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
        },
      }
    );
  } catch (e: unknown) {
    console.error('Claude API error:', e);
    return NextResponse.json({ error: 'AI応答の生成に失敗しました' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
    },
  });
}
