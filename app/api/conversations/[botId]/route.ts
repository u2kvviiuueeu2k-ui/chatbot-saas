import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Conversation } from '@/lib/models/Conversation';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { botId: string } }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = 20;
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find({ botId: params.botId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments({ botId: params.botId }),
  ]);

  return NextResponse.json({ conversations, total, page, totalPages: Math.ceil(total / limit) });
}
