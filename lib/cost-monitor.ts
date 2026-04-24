import nodemailer from 'nodemailer';
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
  if (!process.env.SMTP_HOST || !process.env.ALERT_EMAIL) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ALERT_EMAIL,
    subject: `[ChatBot SaaS] 月間APIコスト警告 - ${yearMonth}`,
    text: `${yearMonth}の推定APIコストが ¥${Math.round(costJpy).toLocaleString()} に達しました。\n\n閾値: ¥${ALERT_THRESHOLD_JPY.toLocaleString()}\n\n管理画面でご確認ください: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
}

export async function getUsageStats(yearMonth?: string) {
  await connectDB();
  const ym = yearMonth ?? getCurrentYearMonth();
  return UsageStats.findOne({ yearMonth: ym });
}
