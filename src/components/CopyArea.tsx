
import React, { useRef, useState, useEffect } from 'react';
import { Copy, Trash2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { CopyBlock } from '../types';

interface CopyAreaProps {
  id: string;
  title: string;
  content: string;
  isOver?: boolean;
  dragPosition?: 'before' | 'after' | null;
  onRemove: (id: string) => void;
  onUpdate: (updates: Partial<CopyBlock>) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

const CopyArea: React.FC<CopyAreaProps> = ({ 
  id, title, content, isOver, dragPosition,
  onRemove, onUpdate, onDragStart, onDragOver, onDragLeave, onDrop 
}) => {
  const { showToast } = useStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== content) {
      contentRef.current.innerHTML = content;
    }
  }, [id, content]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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
      showToast("コピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      await navigator.clipboard.writeText(contentRef.current.innerText);
      showToast("テキストのみコピーしました");
    }
  };

  const handleBlurContent = () => {
    if (contentRef.current) {
      onUpdate({ content: contentRef.current.innerHTML });
    }
  };

  const handleTitleSubmit = () => {
    if (titleInputRef.current) {
      onUpdate({ title: titleInputRef.current.value || 'コピー領域' });
    }
    setIsEditingTitle(false);
  };

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative rounded border bg-white shadow-sm transition-all hover:shadow-md hover:border-purple-100 overflow-hidden ${
        isOver && dragPosition === 'before' ? 'border-t-2 border-purple-500 pt-[2px]' : 
        isOver && dragPosition === 'after' ? 'border-b-2 border-purple-500 pb-[2px]' : 'border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-50 bg-white px-3 py-1.5 cursor-move">
        <div className="flex-1 overflow-hidden mr-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              defaultValue={title}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSubmit(); }}
              className="w-full text-[10px] font-bold text-gray-700 uppercase tracking-wider outline-none ring-1 ring-purple-300 rounded px-1"
            />
          ) : (
            <span 
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
              className="text-[10px] font-bold text-gray-300 uppercase tracking-wider cursor-text truncate block select-none"
              title="ダブルクリックで題名を変更"
            >
              {title || 'コピー領域'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold text-blue-500 hover:bg-blue-50 transition-all"
            title="書式を維持してコピー"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? '完了' : 'コピー'}
          </button>
          
          <button
            onClick={() => onRemove(id)}
            className="rounded p-1 text-gray-200 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
            title="削除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div
        ref={contentRef}
        contentEditable
        onBlur={handleBlurContent}
        suppressContentEditableWarning
        className="text-[13px] leading-relaxed text-gray-700 p-4 min-h-[80px] outline-none font-medium"
      />
    </div>
  );
};

export default CopyArea;
