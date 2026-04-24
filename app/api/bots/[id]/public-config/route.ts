import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const bot = await Bot.findById(params.id).select('settings name');
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: bot._id,
    name: bot.name,
    settings: bot.settings,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
