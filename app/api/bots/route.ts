import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const bots = await Bot.find({}).sort({ createdAt: -1 }).select('-scrapedContent');
  return NextResponse.json(bots);
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

  // スクレイピングは行わず即座に pending 状態で作成
  const bot = await Bot.create({ name, url, status: 'pending' });

  return NextResponse.json(bot, { status: 201 });
}
