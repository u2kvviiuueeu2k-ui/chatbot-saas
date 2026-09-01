import { connectDB } from './mongodb';
import { UsageStats } from './models/UsageStats';

// claude-sonnet-4-5 pricing (USD per 1M tokens)
const INPUT_COST_USD_PER_M = 3.0;
const OUTPUT_COST_USD_PER_M = 15.0;
const USD_TO_JPY = 150;
const ALERT_THRESHOLD_JPY = 5000;

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function trackUsage(inputTokens: number, outputTokens: number): Promise<void> {
  await connectDB();
  const yearMonth = getCurrentYearMonth();

  const costUsd =
    (inputTokens / 1_000_000) * INPUT_COST_USD_PER_M +
    (outputTokens / 1_000_000) * OUTPUT_COST_USD_PER_M;
  const costJpy = costUsd * USD_TO_JPY;

  const stats = await UsageStats.findOneAndUpdate(
    { yearMonth },
    {
      $inc: { inputTokens, outputTokens, estimatedCostJpy: costJpy },
    },
    { upsert: true, new: true }
  );

  if (stats.estimatedCostJpy >= ALERT_THRESHOLD_JPY && !stats.alertSent) {
    await sendCostAlert(stats.estimatedCostJpy, yearMonth);
    await UsageStats.updateOne({ yearMonth }, { alertSent: true });
  }
}

async function sendCostAlert(costJpy: number, yearMonth: string): Promise<void> {
  // Cloudflare Workers では SMTP（nodemailer）が使えないため Resend の REST API を使用
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL;
  if (!apiKey || !to) return;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'ChatBot SaaS <onboarding@resend.dev>',
      to,
      subject: `[ChatBot SaaS] 月間APIコスト警告 - ${yearMonth}`,
      text: `${yearMonth}の推定APIコストが ¥${Math.round(costJpy).toLocaleString()} に達しました。\n\n閾値: ¥${ALERT_THRESHOLD_JPY.toLocaleString()}\n\n管理画面でご確認ください: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    }),
  });

  if (!res.ok) {
    console.error('Cost alert email failed:', res.status, await res.text().catch(() => ''));
  }
}

export async function getUsageStats(yearMonth?: string) {
  await connectDB();
  const ym = yearMonth ?? getCurrentYearMonth();
  return UsageStats.findOne({ yearMonth: ym });
}
