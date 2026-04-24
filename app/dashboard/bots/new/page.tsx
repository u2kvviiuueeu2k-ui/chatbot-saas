'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Phase = 'form' | 'scraping' | 'done' | 'error';

interface ScrapedPage {
  title: string;
  url: string;
}

export default function NewBotPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [botId, setBotId] = useState('');
  const [scrapePages, setScrapePages] = useState<ScrapedPage[]>([]);
  const [contentLength, setContentLength] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPhase('scraping');

    // Step 1: ボットを即座に作成（pending）
    const createRes = await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url }),
    });

    if (!createRes.ok) {
      const data = await createRes.json();
      setError(data.error ?? '作成に失敗しました');
      setPhase('form');
      return;
    }

    const bot = await createRes.json();
    const createdBotId: string = bot._id;
    setBotId(createdBotId);

    // Step 2: スクレイピング実行（最大60秒）
    const scrapeRes = await fetch(`/api/bots/${createdBotId}/scrape`, { method: 'POST' });

    if (!scrapeRes.ok) {
      const data = await scrapeRes.json().catch(() => ({}));
      setError(data.error ?? 'スクレイピングに失敗しました。設定画面から再取得できます。');
      setPhase('error');
      setTimeout(() => router.push(`/dashboard/bots/${createdBotId}`), 3000);
      return;
    }

    const scrapeData = await scrapeRes.json();
    setScrapePages(scrapeData.pages ?? []);
    setContentLength(scrapeData.contentLength ?? 0);
    setPhase('done');
  }

  if (phase === 'scraping') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto">
            <svg className="animate-spin w-16 h-16 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AIを準備中...</h2>
            <p className="text-gray-500 mt-2 text-sm">サイトを読み込んでAIに学習させています</p>
            <p className="text-gray-400 mt-1 text-xs">最大60秒かかる場合があります</p>
          </div>
          <div className="flex items-center gap-2 justify-center text-sm text-gray-400">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-6">
          {/* ヘッダー */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">サイト情報の取得が完了しました</h2>
            <p className="text-sm text-gray-500">AIがサイトの内容を学習しました。チャットボットを導入する準備ができています。</p>
          </div>

          {/* 統計 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">{scrapePages.length}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">クロールページ数</div>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-indigo-600">{scrapePages.length}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium">取得データ件数</div>
            </div>
          </div>

          {/* ページ一覧 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">取得したページ一覧</h3>
            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-56 overflow-y-auto">
              {scrapePages.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">ページ情報がありません</div>
              ) : (
                scrapePages.map((page, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{page.title}</div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">{page.url}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/dashboard/bots/${botId}`}
            className="block w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-center hover:bg-indigo-700 transition-colors text-sm"
          >
            このボットをサイトに導入する →
          </Link>

          <div className="text-center">
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-12 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">スクレイピングに失敗しました</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400">設定画面に移動します...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">← 戻る</Link>
        <h1 className="text-2xl font-bold text-gray-900">新しいボットを作成</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">ボット名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例: 株式会社〇〇 サポートBot"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">WebサイトURL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              このURLのページ内容をスクレイピングして、AIが学習します
            </p>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            ボットを作成する
          </button>
        </form>
      </div>
    </div>
  );
}
