
import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { NotePage } from '../types';
import CopyArea from './CopyArea';
import { useStore } from '../store/useStore';
import ContextMenu, { type MenuItem } from './ContextMenu';

interface EditorProps {
  page: NotePage | null;
}

const Editor: React.FC<EditorProps> = ({ page }) => {
  const { state, updatePage, addCopyArea } = useStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // ページIDが変更された際にDOMの同期を行う
  useEffect(() => {
    if (contentRef.current) {
      const targetContent = page?.content || '';
      // 内部フラグをリセットし、DOMの内容を強制的に上書き
      isInternalChange.current = false;
      contentRef.current.innerHTML = targetContent;
    }
  }, [page?.id]);

  useEffect(() => {
    const activeMatch = document.getElementById('active-search-match');
    if (activeMatch) {
      activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state.currentSearchResultIndex, state.activePageId]);

  const handleInput = useCallback(() => {
    if (contentRef.current && page) {
      isInternalChange.current = true;
      updatePage(page.id, { content: contentRef.current.innerHTML });
    }
  }, [page, updatePage]);

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white text-gray-400">
        ページを選択するか、新しく作成してください。
      </div>
    );
  }

  const editorMenuItems: MenuItem[] = [
    { label: 'コピー領域を追加', onClick: () => addCopyArea(page.id) }
  ];

  const renderHighlightedContent = (html: string) => {
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
              const currentMatch = state.searchResults[state.currentSearchResultIndex];
              if (currentMatch && currentMatch.pageId === page.id && currentMatch.fieldName === 'content') {
                mark.id = 'active-search-match';
              }
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

  const renderHighlightedTitle = (text: string) => {
    if (!state.searchTerm) return text;
    const parts = text.split(new RegExp(`(${state.searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === state.searchTerm.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div 
      className="flex-1 flex flex-col bg-white overflow-hidden relative"
      onContextMenu={handleEditorContextMenu}
    >
      <div className="px-10 pt-8 pb-4 border-b border-gray-100 bg-white z-10 shrink-0">
        <div className="relative group">
           {state.searchTerm ? (
             <div className="w-full text-3xl font-bold py-1 break-all pointer-events-none absolute inset-0 z-10">
                {renderHighlightedTitle(page.title)}
             </div>
           ) : null}
           <input
            type="text"
            className={`w-full text-3xl font-bold border-none focus:ring-0 p-0 text-gray-900 placeholder-gray-300 ${state.searchTerm ? 'opacity-0' : 'opacity-100'}`}
            value={page.title}
            placeholder="無題のページ"
            onChange={(e) => updatePage(page.id, { title: e.target.value })}
          />
        </div>
        <div className="text-xs text-gray-400 mt-2 font-light">
          最終更新: {new Date(page.lastModified).toLocaleString('ja-JP')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar">
        <div className="max-w-4xl mx-auto pb-32">
          {page.copyAreas.map((areaContent, index) => (
            <CopyArea key={index} content={areaContent} pageId={page.id} index={index} />
          ))}

          <div className="relative mt-8 min-h-[500px]">
            {state.searchTerm && (
              <div 
                className="absolute inset-0 text-lg leading-relaxed text-gray-800 pointer-events-none whitespace-pre-wrap break-words z-20"
                dangerouslySetInnerHTML={{ __html: renderHighlightedContent(page.content) }}
              />
            )}
            
            <div
              ref={contentRef}
              contentEditable={!state.searchTerm}
              onInput={handleInput}
              onBlur={handleInput}
              className={`w-full outline-none text-lg leading-relaxed min-h-[500px] ${state.searchTerm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              style={{ minHeight: '500px' }}
            />
            {!page.content && !state.searchTerm && (
              <div className="absolute top-0 left-0 text-gray-300 pointer-events-none text-lg">
                ここに入力を開始します... (右クリックでコピー領域を追加できます)
              </div>
            )}
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={editorMenuItems} 
          onClose={() => setContextMenu(null)} 
        />
      )}
    </div>
  );
};

export default Editor;
