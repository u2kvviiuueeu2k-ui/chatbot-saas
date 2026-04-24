import { NextRequest, NextResponse } from 'next/server';
import { getUsageStats } from '@/lib/cost-monitor';
import { isAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const yearMonth = url.searchParams.get('month') ?? undefined;
  const stats = await getUsageStats(yearMonth);

  return NextResponse.json(
    stats ?? { inputTokens: 0, outputTokens: 0, estimatedCostJpy: 0, alertSent: false }
  );
}
