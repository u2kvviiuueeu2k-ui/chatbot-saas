import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  botId: mongoose.Types.ObjectId;
  sessionId: string;
  ip: string;
  messages: IMessage[];
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema<IConversation>(
  {
    botId: { type: Schema.Types.ObjectId, ref: 'Bot', required: true },
    sessionId: { type: String, required: true },
    ip: { type: String, required: true },
    messages: [MessageSchema],
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ botId: 1, createdAt: -1 });
ConversationSchema.index({ ip: 1, createdAt: -1 });

export const Conversation =
  mongoose.models.Conversation ??
  mongoose.model<IConversation>('Conversation', ConversationSchema);
