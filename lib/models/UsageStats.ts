import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageStats extends Document {
  yearMonth: string; // YYYY-MM
  inputTokens: number;
  outputTokens: number;
  estimatedCostJpy: number;
  alertSent: boolean;
  updatedAt: Date;
}

const UsageStatsSchema = new Schema<IUsageStats>(
  {
    yearMonth: { type: String, required: true, unique: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    estimatedCostJpy: { type: Number, default: 0 },
    alertSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UsageStats =
  mongoose.models.UsageStats ?? mongoose.model<IUsageStats>('UsageStats', UsageStatsSchema);
