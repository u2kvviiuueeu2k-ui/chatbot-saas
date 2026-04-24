'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import EmbedCode from '@/components/EmbedCode';

interface BotSettings {
  primaryColor: string;
  fontFamily: string;
  position: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  botName: string;
  showCredit: boolean;
  monthlyTokenLimit: number;
  maxScrapePages: number;
}

interface LineConfig {
  enabled: boolean;
  channelAccessToken: string;
  channelSecret: string;
  notifyUserId: string;
}

interface Bot {
  _id: string;
  name: string;
  url: string;
  status: 'pending' | 'ready' | 'error';
  scrapeError: string;
  settings: BotSettings;
  lineConfig: LineConfig;
  scrapedContent: string;
  monthlyTokensUsed: number;
}

const FONT_OPTIONS = [
  { label: 'システムフォント', value: 'system-ui, sans-serif' },
  { label: 'Noto Sans JP', value: '"Noto Sans JP", sans-serif' },
  { label: 'Yu Gothic', value: '"Yu Gothic", sans-serif' },
  { label: 'Hiragino Sans', value: '"Hiragino Sans", sans-serif' },
];

export default function BotSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<Bot | null>(null);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [lineConfig, setLineConfig] = useState<LineConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/bots/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBot(data);
        setSettings({
          ...data.settings,
          monthlyTokenLimit: data.settings.monthlyTokenLimit ?? 50000,
          maxScrapePages: data.settings.maxScrapePages ?? 5,
        });
        setLineConfig(data.lineConfig);
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/bots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, lineConfig }),
    });
    if (res.ok) setMessage('保存しました');
    else setMessage('保存に失敗しました');
    setSaving(false);
  }

  async function handleRescrape() {
    setScraping(true);
    setMessage('');
    const res = await fetch(`/api/bots/${id}/scrape`, { method: 'POST' });
    if (res.ok) setMessage('再スクレイピング完了しました');
    else setMessage('スクレイピングに失敗しました');
    setScraping(false);
  }

  async function handleDelete() {
    if (!confirm('このボットを削除しますか？会話履歴は残ります。')) return;
    setDeleting(true);
    await fetch(`/api/bots/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (!bot || !settings || !lineConfig) {
    return <div className="text-center py-12 text-gray-400">読み込み中...</div>;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const monthlyLimit = settings.monthlyTokenLimit;
  const monthlyUsed = bot.monthlyTokensUsed ?? 0;
  const usagePct = monthlyLimit > 0 ? Math.min((monthlyUsed / monthlyLimit) * 100, 100) : 0;
  const barColor = usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-yellow-400' : 'bg-indigo-500';
  const usageTextColor = usagePct >= 100 ? 'text-red-600' : usagePct >= 80 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← 戻る</Link>
          <h1 className="text-2xl font-bold text-gray-900">{bot.name}</h1>
          {bot.status === 'pending' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">準備中</span>
          )}
          {bot.status === 'ready' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">稼働中</span>
          )}
          {bot.status === 'error' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">エラー</span>
          )}
        </div>
        <Link
          href={`/dashboard/bots/${id}/conversations`}
          className="text-sm text-gray-600 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          会話履歴
        </Link>
      </div>

      {bot.status === 'error' && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-sm text-red-700">
          スクレイピングに失敗しました: {bot.scrapeError || '不明なエラー'}。「サイト情報を再取得」ボタンで再試行できます。
        </div>
      )}

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.includes('失敗') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Embed Code */}
      <EmbedCode botId={id} appUrl={appUrl} />

      {/* Widget Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">ウィジェット設定</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ブランドカラー</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">表示位置</label>
            <select
              value={settings.position}
              onChange={(e) => setSettings({ ...settings, position: e.target.value as 'bottom-right' | 'bottom-left' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="bottom-right">右下</option>
              <option value="bottom-left">左下</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">フォント</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ボット名称</label>
          <input
            type="text"
            value={settings.botName}
            onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ウェルカムメッセージ</label>
          <textarea
            value={settings.welcomeMessage}
            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showCredit"
            checked={settings.showCredit}
            onChange={(e) => setSettings({ ...settings, showCredit: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="showCredit" className="text-sm text-gray-700">
            「Powered by Spinel Lab」クレジットを表示
          </label>
        </div>
      </div>

      {/* Limits */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">制限設定</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">月間トークン上限</label>
            <input
              type="number"
              min={1000}
              max={10000000}
              step={1000}
              value={settings.monthlyTokenLimit}
              onChange={(e) => setSettings({ ...settings, monthlyTokenLimit: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">上限超過時はチャットが停止します</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">最大クロールページ数</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxScrapePages}
              onChange={(e) => setSettings({ ...settings, maxScrapePages: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">再取得時に反映されます（1〜20）</p>
          </div>
        </div>

        {/* 今月の使用量 */}
        <div className="pt-1">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-gray-700">今月のトークン使用量</span>
            <span className={`font-medium ${usageTextColor}`}>
              {monthlyUsed.toLocaleString()} / {monthlyLimit.toLocaleString()}
              {usagePct >= 100 && ' — 上限到達'}
              {usagePct >= 80 && usagePct < 100 && ' — 残りわずか'}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* LINE Integration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">LINE連携</h2>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">オプション</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lineEnabled"
            checked={lineConfig.enabled}
            onChange={(e) => setLineConfig({ ...lineConfig, enabled: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="lineEnabled" className="text-sm text-gray-700">LINE連携を有効にする</label>
        </div>

        {lineConfig.enabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Access Token</label>
              <input
                type="password"
                value={lineConfig.channelAccessToken}
                onChange={(e) => setLineConfig({ ...lineConfig, channelAccessToken: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                placeholder="LINE Channel Access Token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel Secret</label>
              <input
                type="password"
                value={lineConfig.channelSecret}
                onChange={(e) => setLineConfig({ ...lineConfig, channelSecret: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                placeholder="LINE Channel Secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">通知先 User ID</label>
              <input
                type="text"
                value={lineConfig.notifyUserId}
                onChange={(e) => setLineConfig({ ...lineConfig, notifyUserId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                placeholder="Uxxxxxxxxxx"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-700">Webhook URL (LINEに登録してください):</p>
              <code className="block bg-white border border-gray-200 rounded px-2 py-1 text-xs break-all">
                {appUrl}/api/webhook/line/{id}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
          <button
            onClick={handleRescrape}
            disabled={scraping}
            className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {scraping ? '再取得中...' : '🔄 サイト情報を再取得'}
          </button>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm hover:bg-red-50 transition-colors"
        >
          削除
        </button>
      </div>

      {/* Scraped content preview */}
      <details className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">取得済みコンテンツのプレビュー</summary>
        <pre className="mt-3 text-xs text-gray-500 whitespace-pre-wrap max-h-64 overflow-y-auto bg-gray-50 p-3 rounded-lg">
          {bot.scrapedContent || '（コンテンツ未取得）'}
        </pre>
      </details>
    </div>
  );
}
