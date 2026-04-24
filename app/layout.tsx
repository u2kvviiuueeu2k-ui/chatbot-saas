import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatBot SaaS - Spinel Lab',
  description: 'URLを入力するだけでAIチャットボットが生成されます',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
