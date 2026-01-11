import React, { useRef, useState } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

interface CopyAreaProps {
  id: string;
  content: string;
  onRemove: (id: string) => void;
}

const CopyArea: React.FC<CopyAreaProps> = ({ id, content, onRemove }) => {
  const { showToast } = useStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!contentRef.current) return;

    try {
      const htmlBlob = new Blob([contentRef.current.innerHTML], { type: 'text/html' });
      const textBlob = new Blob([contentRef.current.innerText], { type: 'text/plain' });
      
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });

      await navigator.clipboard.write([item]);
      
      setCopied(true);
      if (showToast) showToast("コピーしました！");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // フォールバック
      await navigator.clipboard.writeText(contentRef.current.innerText);
      if (showToast) showToast("テキストのみコピーしました");
    }
  };

  return (
    <div className="group relative mb-4 rounded-md border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* ツールバー */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-1.5">
        <span className="text-xs font-medium text-gray-500">コピー領域</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            title="書式を維持してコピー"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '完了' : 'コピー'}
          </button>
          
          <button
            onClick={() => onRemove(id)}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="この領域を削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* コンテンツ表示エリア */}
      <div
        ref={contentRef}
        className="prose prose-sm max-w-none p-4 min-h-[60px] outline-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

export default CopyArea;