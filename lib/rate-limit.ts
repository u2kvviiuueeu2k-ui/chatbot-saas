import { connectDB } from './mongodb';
import { RateLimit } from './models/RateLimit';

const MAX_CONVERSATIONS_PER_DAY = 50;

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB();
  const date = getToday();

  const record = await RateLimit.findOne({ ip, date });
  const count = record?.count ?? 0;
  const remaining = Math.max(0, MAX_CONVERSATIONS_PER_DAY - count);

  return { allowed: count < MAX_CONVERSATIONS_PER_DAY, remaining };
}

export async function incrementRateLimit(ip: string): Promise<void> {
  await connectDB();
  const date = getToday();

  await RateLimit.findOneAndUpdate(
    { ip, date },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );
}
