'use client';

import { useState } from 'react';

interface EmbedCodeProps {
  botId: string;
  appUrl: string;
}

export default function EmbedCode({ botId, appUrl }: EmbedCodeProps) {
  const [copied, setCopied] = useState(false);

  const embedCode = `<script src="${appUrl}/widget.js?botId=${botId}" async></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
      <h2 className="font-semibold text-gray-900 mb-1">埋め込みコード</h2>
      <p className="text-sm text-gray-500 mb-3">
        このコードを埋め込みたいサイトの <code className="bg-white px-1 rounded">&lt;/body&gt;</code> タグの直前に追加してください
      </p>
      <div className="bg-white border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
        <code className="flex-1 text-xs text-gray-700 font-mono break-all">{embedCode}</code>
        <button
          onClick={handleCopy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? '✓ コピー済み' : 'コピー'}
        </button>
      </div>
    </div>
  );
}
