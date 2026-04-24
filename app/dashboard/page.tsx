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
  createdAt: string;
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
          <p className="text-sm text-gray-500">今月のトークン使用量</p>
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
            {bots.map((bot) => (
              <div key={bot._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{bot.name}</p>
                  <p className="text-sm text-gray-400 truncate max-w-xs">{bot.url}</p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/bots/${bot._id}/conversations`}
                    className="text-sm text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100"
                  >
                    会話履歴
                  </Link>
                  <Link
                    href={`/dashboard/bots/${bot._id}`}
                    className="text-sm text-indigo-600 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    設定
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
