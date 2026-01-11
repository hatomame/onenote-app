import React, { useRef, useEffect, useCallback, useState } from 'react';
import { CopyIcon } from './Icons';
import { useStore } from '../store/useStore';
import ContextMenu, { type MenuItem } from './ContextMenu';

interface CopyAreaProps {
  id: string; // Changed from index: number
  content: string;
  pageId: string;
}

const CopyArea: React.FC<CopyAreaProps> = ({ id, content, pageId }) => { // Changed from { content, pageId, index }
  const { state, updateCopyArea, deleteCopyArea, showToast } = useStore();
  const editRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (editRef.current && !isInternalChange.current) {
      editRef.current.innerHTML = content || '';
    }
    isInternalChange.current = false;
  }, [content, id, pageId]); // Changed from [content, pageId, index]
  const handleInput = useCallback(() => {
    if (editRef.current) {
      isInternalChange.current = true;
      updateCopyArea(pageId, id, editRef.current.innerHTML); // Changed from updateCopyArea(pageId, index, ...)
    }
  }, [pageId, id, updateCopyArea]); // Changed from [pageId, index, updateCopyArea]
  const handleCopy = async () => {
    if (!content) return;
    try {
      const typeHtml = "text/html";
      const typeText = "text/plain";
      const blobHtml = new Blob([content], { type: typeHtml });
      const plainText = editRef.current?.textContent || "";
      const blobText = new Blob([plainText], { type: typeText });
      const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typeText]: blobText })];
      await navigator.clipboard.write(data);
      showToast('書式を維持してコピーしました');
    } catch (err) {
      console.error("クリップボードへの書き込みに失敗しました:", err); // Added error logging
      navigator.clipboard.writeText(editRef.current?.textContent || "");
      showToast('テキストのみコピーしました');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const menuItems: MenuItem[] = [
    { label: 'コピー領域を削除', onClick: () => deleteCopyArea(pageId, id) } // Changed from deleteCopyArea(pageId, index)
  ];

  const renderHighlightedText = (html: string) => {
    if (!state.searchTerm) return html;
    const term = state.searchTerm;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const highlightNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.toLowerCase().includes(term.toLowerCase())) {
          const parent = node.parentNode;
          if (!parent) return;
          const parts = text.split(new RegExp(`(${term})`, 'gi'));
          const fragment = document.createDocumentFragment();
          parts.forEach((part) => {
            if (part.toLowerCase() === term.toLowerCase()) {
              const mark = document.createElement('mark');
              mark.className = 'bg-yellow-200 rounded-sm';
              mark.textContent = part;
              fragment.appendChild(mark);
            } else {
              fragment.appendChild(document.createTextNode(part));
            }
          });
          parent.replaceChild(fragment, node);
        }
      } else {
        node.childNodes.forEach(highlightNode);
      }
    };
    doc.body.childNodes.forEach(highlightNode);
    return doc.body.innerHTML;
  };

  return (
    <div 
      onContextMenu={handleContextMenu}
      className="relative group mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-md transition-all hover:bg-yellow-100 shadow-sm"
    >
      <div className="flex justify-end mb-1">
        <button 
          onClick={handleCopy}
          title="書式を維持してコピー"
          className="p-1.5 rounded-full hover:bg-yellow-200 text-yellow-700 transition-colors border border-yellow-300 bg-white shadow-sm"
        >
          <CopyIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="relative min-h-[40px">
        {state.searchTerm && (
           <div 
             className="absolute inset-0 text-sm leading-relaxed text-gray-800 pointer-events-none whitespace-pre-wrap break-words font-medium z-10"
             dangerouslySetInnerHTML={{ __html: renderHighlightedText(content) }}
           />
        )}
        <div
          ref={editRef}
          contentEditable={!state.searchTerm}
          onInput={handleInput}
          onBlur={handleInput}
          className={`w-full outline-none text-sm leading-relaxed font-medium min-h-[40px] ${state.searchTerm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />
        {!content && !state.searchTerm && (
          <div className="absolute top-0 left-0 text-yellow-600/40 pointer-events-none text-sm italic">
            コピー領域... (ここに書かれた内容はボタン一つで一括コピーできます)
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={menuItems} 
          onClose={() => setContextMenu(null)} 
        />
      )}
    </div>
  );
};

export default CopyArea;

