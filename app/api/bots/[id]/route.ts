import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Bot } from '@/lib/models/Bot';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const bot = await Bot.findById(params.id);
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(bot);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();

  const bot = await Bot.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(bot);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const bot = await Bot.findByIdAndDelete(params.id);
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
