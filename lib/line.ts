interface LineConfig {
  channelAccessToken: string;
  notifyUserId: string;
}

async function postToLine(
  endpoint: string,
  channelAccessToken: string,
  payload: unknown
): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LINE API error ${res.status}: ${detail.slice(0, 300)}`);
  }
}

export async function sendLineNotification(
  config: LineConfig,
  userMessage: string,
  botResponse: string,
  botName: string
): Promise<void> {
  if (!config.channelAccessToken || !config.notifyUserId) return;

  const text = `📨 ${botName}への問い合わせ\n\n👤 ユーザー:\n${userMessage}\n\n🤖 AI回答:\n${botResponse}`;

  await postToLine('https://api.line.me/v2/bot/message/push', config.channelAccessToken, {
    to: config.notifyUserId,
    messages: [{ type: 'text', text: text.slice(0, 5000) }],
  });
}

export async function replyToLine(
  channelAccessToken: string,
  replyToken: string,
  text: string
): Promise<void> {
  await postToLine('https://api.line.me/v2/bot/message/reply', channelAccessToken, {
    replyToken,
    messages: [{ type: 'text', text: text.slice(0, 5000) }],
  });
}

export async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): Promise<boolean> {
  // Workers ランタイムで動作させるため node:crypto ではなく WebCrypto を使用
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const bytes = new Uint8Array(mac);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const hash = btoa(binary);
  return hash === signature;
}
