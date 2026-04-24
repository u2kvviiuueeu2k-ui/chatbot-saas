'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">ChatBot SaaS</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/dashboard/bots/new" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
            + 新規ボット
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  );
}
