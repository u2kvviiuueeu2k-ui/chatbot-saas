import mongoose, { Schema, Document } from 'mongoose';

export interface IRateLimit extends Document {
  ip: string;
  date: string; // YYYY-MM-DD
  count: number;
  createdAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    ip: { type: String, required: true },
    date: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RateLimitSchema.index({ ip: 1, date: 1 }, { unique: true });
// 2日後に自動削除
RateLimitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

export const RateLimit =
  mongoose.models.RateLimit ?? mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
