import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { scrapeUrl } from '@/lib/scraper';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { isAuthenticated } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const bot = await Bot.findById(params.id);
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Bot.findByIdAndUpdate(params.id, { status: 'pending', scrapeError: '' });

  try {
    const result = await scrapeUrl(bot.url);
    const systemPrompt = buildSystemPrompt(bot.name, result.content);

    await Bot.findByIdAndUpdate(params.id, {
      scrapedContent: result.content,
      scrapedPages: result.pages,
      systemPrompt,
      status: 'ready',
      scrapeError: '',
    });

    return NextResponse.json({
      success: true,
      contentLength: result.content.length,
      pages: result.pages,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await Bot.findByIdAndUpdate(params.id, { status: 'error', scrapeError: msg });
    return NextResponse.json({ error: `スクレイピング失敗: ${msg}` }, { status: 500 });
  }
}
