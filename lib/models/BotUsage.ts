import mongoose, { Schema, Document } from 'mongoose';

export interface IBotUsage extends Document {
  botId: mongoose.Types.ObjectId;
  yearMonth: string;
  inputTokens: number;
  outputTokens: number;
}

const BotUsageSchema = new Schema<IBotUsage>({
  botId: { type: Schema.Types.ObjectId, required: true, ref: 'Bot' },
  yearMonth: { type: String, required: true },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
});

BotUsageSchema.index({ botId: 1, yearMonth: 1 }, { unique: true });

export const BotUsage =
  mongoose.models.BotUsage ?? mongoose.model<IBotUsage>('BotUsage', BotUsageSchema);
