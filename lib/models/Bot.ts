import mongoose, { Schema, Document } from 'mongoose';

export interface IBot extends Document {
  name: string;
  url: string;
  status: 'pending' | 'ready' | 'error';
  scrapeError: string;
  scrapedContent: string;
  scrapedPages: Array<{ title: string; url: string }>;
  systemPrompt: string;
  settings: {
    primaryColor: string;
    fontFamily: string;
    position: 'bottom-right' | 'bottom-left';
    welcomeMessage: string;
    botName: string;
    showCredit: boolean;
    monthlyTokenLimit: number;
    maxScrapePages: number;
  };
  lineConfig: {
    enabled: boolean;
    channelAccessToken: string;
    channelSecret: string;
    notifyUserId: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BotSchema = new Schema<IBot>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, enum: ['pending', 'ready', 'error'], default: 'pending' },
    scrapeError: { type: String, default: '' },
    scrapedContent: { type: String, default: '' },
    scrapedPages: {
      type: [{ title: { type: String }, url: { type: String } }],
      default: [],
    },
    systemPrompt: { type: String, default: '' },
    settings: {
      primaryColor: { type: String, default: '#6366f1' },
      fontFamily: { type: String, default: 'system-ui, sans-serif' },
      position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
      welcomeMessage: { type: String, default: 'こんにちは！何でもお気軽にご質問ください。' },
      botName: { type: String, default: 'AI アシスタント' },
      showCredit: { type: Boolean, default: true },
      monthlyTokenLimit: { type: Number, default: 50000 },
      maxScrapePages: { type: Number, default: 5 },
    },
    lineConfig: {
      enabled: { type: Boolean, default: false },
      channelAccessToken: { type: String, default: '' },
      channelSecret: { type: String, default: '' },
      notifyUserId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const Bot = mongoose.models.Bot ?? mongoose.model<IBot>('Bot', BotSchema);
