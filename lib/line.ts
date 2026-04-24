import axios from 'axios';

interface LineConfig {
  channelAccessToken: string;
  notifyUserId: string;
}

export async function sendLineNotification(
  config: LineConfig,
  userMessage: string,
  botResponse: string,
  botName: string
): Promise<void> {
  if (!config.channelAccessToken || !config.notifyUserId) return;

  const text = `📨 ${botName}への問い合わせ\n\n👤 ユーザー:\n${userMessage}\n\n🤖 AI回答:\n${botResponse}`;

  await axios.post(
    'https://api.line.me/v2/bot/message/push',
    {
      to: config.notifyUserId,
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    },
    {
      headers: {
        Authorization: `Bearer ${config.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function replyToLine(
  channelAccessToken: string,
  replyToken: string,
  text: string
): Promise<void> {
  await axios.post(
    'https://api.line.me/v2/bot/message/reply',
    {
      replyToken,
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    },
    {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  return hash === signature;
}
