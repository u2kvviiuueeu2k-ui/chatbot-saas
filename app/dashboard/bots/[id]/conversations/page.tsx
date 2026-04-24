'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  _id: string;
  sessionId: string;
  ip: string;
  messages: Message[];
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export default function ConversationsPage() {
  const { id } = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${id}?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setConversations(data.conversations);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      });
  }, [id, page]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/bots/${id}`} className="text-gray-400 hover:text-gray-600">← 設定に戻る</Link>
        <h1 className="text-2xl font-bold text-gray-900">会話履歴</h1>
        <span className="text-sm text-gray-400">{total}件</span>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-12 text-center text-gray-400">
          まだ会話がありません
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div key={conv._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === conv._id ? null : conv._id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {conv.messages.length} メッセージ ({conv.messages.filter(m => m.role === 'user').length} ターン)
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      IP: {conv.ip} ・ {new Date(conv.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {(conv.inputTokens + conv.outputTokens).toLocaleString()} tokens
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expanded === conv._id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expanded === conv._id && (
                <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-gray-50">
                  {conv.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-lg px-4 py-2 rounded-xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← 前
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            次 →
          </button>
        </div>
      )}
    </div>
  );
}
