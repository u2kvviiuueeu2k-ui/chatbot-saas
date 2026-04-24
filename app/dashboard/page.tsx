'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  estimatedCostJpy: number;
  alertSent: boolean;
}

interface Bot {
  _id: string;
  name: string;
  url: string;
  status: 'pending' | 'ready' | 'error';
  createdAt: string;
  settings: {
    monthlyTokenLimit: number;
  };
  monthlyTokensUsed: number;
}

function TokenUsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-indigo-500';
  const textColor =
    pct >= 100 ? 'text-red-600 font-semibold' : pct >= 80 ? 'text-yellow-600 font-semibold' : 'text-gray-400';

  return (
    <div className="mt-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">今月のトークン使用量</span>
        <span className={textColor}>
          {used.toLocaleString()} / {limit.toLocaleString()}
          {pct >= 100 && ' — 上限到達'}
          {pct >= 80 && pct < 100 && ' — 残りわずか'}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    fetch('/api/bots').then((r) => r.json()).then(setBots).catch(console.error);
    fetch('/api/usage').then((r) => r.json()).then(setUsage).catch(console.error);
  }, []);

  const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">ChatBot SaaS 管理画面</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">ボット数</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{bots.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">今月のトークン使用量（全体）</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)).toLocaleString()}
          </p>
        </div>
        <div className={`rounded-xl shadow-sm border p-6 ${
          (usage?.estimatedCostJpy ?? 0) >= 5000
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-gray-100'
        }`}>
          <p className="text-sm text-gray-500">今月の推定コスト ({currentMonth})</p>
          <p className={`text-3xl font-bold mt-1 ${
            (usage?.estimatedCostJpy ?? 0) >= 5000 ? 'text-red-600' : 'text-gray-900'
          }`}>
            ¥{Math.round(usage?.estimatedCostJpy ?? 0).toLocaleString()}
          </p>
          {usage?.alertSent && (
            <p className="text-xs text-red-600 mt-1">⚠ アラートメール送信済み</p>
          )}
        </div>
      </div>

      {/* Bots */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">ボット一覧</h2>
          <Link
            href="/dashboard/bots/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + 新規作成
          </Link>
        </div>

        {bots.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <p>ボットがありません</p>
            <Link href="/dashboard/bots/new" className="text-indigo-600 hover:underline mt-2 inline-block">
              最初のボットを作成する →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bots.map((bot) => {
              const limit = bot.settings?.monthlyTokenLimit ?? 50000;
              const used = bot.monthlyTokensUsed ?? 0;

              return (
                <div key={bot._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-gray-900">{bot.name}</p>
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
                      <p className="text-sm text-gray-400 truncate">{bot.url}</p>
                      <TokenUsageBar used={used} limit={limit} />
                    </div>
                    <div className="flex gap-2 shrink-0 mt-0.5">
                      <Link
                        href={`/dashboard/bots/${bot._id}/conversations`}
                        className="text-sm text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        会話履歴
                      </Link>
                      <Link
                        href={`/dashboard/bots/${bot._id}`}
                        className="text-sm text-indigo-600 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        設定
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
