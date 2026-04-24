import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { BotUsage } from '@/lib/models/BotUsage';
import { isAuthenticated } from '@/lib/auth';

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const bots = await Bot.find({}).sort({ createdAt: -1 }).select('-scrapedContent -systemPrompt -scrapedPages');

  const yearMonth = getCurrentYearMonth();
  const usageRecords = await BotUsage.find({
    botId: { $in: bots.map((b) => b._id) },
    yearMonth,
  });

  const usageMap = new Map(
    usageRecords.map((u) => [u.botId.toString(), u.inputTokens + u.outputTokens])
  );

  const botsWithUsage = bots.map((b) => ({
    ...b.toObject(),
    monthlyTokensUsed: usageMap.get(b._id.toString()) ?? 0,
  }));

  return NextResponse.json(botsWithUsage);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, url } = await req.json();

  if (!name || !url) {
    return NextResponse.json({ error: 'name と url は必須です' }, { status: 400 });
  }

  await connectDB();
  const bot = await Bot.create({ name, url, status: 'pending' });

  return NextResponse.json(bot, { status: 201 });
}
