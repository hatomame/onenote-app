import React, { useState } from 'react';
import { useStore, stripHtml } from '../store/useStore';
import { PlusIcon } from './Icons';
import { MoreVertical } from 'lucide-react';
import ContextMenu, { type MenuItem } from './ContextMenu';

const PageList: React.FC = () => {
  const {
    state, setActivePage, addPage, deletePage, toggleSubpage, reorderPages
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

  const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId) || state.notebooks[0];
  const activeSection = activeNotebook?.sections.find(s => s.id === state.activeSectionId);

  const openActionMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItem[] = [
      {
        label: '削除',
        danger: true,
        onClick: () => {
          deletePage(id);
        }
      },
      { label: 'サブページにする/解除', onClick: () => toggleSubpage(id) }
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPageId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedPageId === id) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragPosition(y < rect.height / 2 ? 'before' : 'after');
    setDragOverId(id);
  };

  const onDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedPageId && draggedPageId !== id && dragPosition && activeSection) {
      reorderPages(activeSection.id, draggedPageId, id, dragPosition);
    }
    clearDragState();
  };

  const clearDragState = () => {
    setDraggedPageId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-gray-200 bg-white flex-shrink-0">
      {activeSection ? (
        <>
          <div className="px-4 py-3 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <span className="flex-1 pr-2 whitespace-normal break-words text-left">{activeSection.title}</span>
            <button onClick={() => addPage(activeSection.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-600 transition-colors shrink-0">
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar select-none">
            {activeSection.pages.map((page) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => onDragStart(e, page.id)}
                onDragOver={(e) => onDragOver(e, page.id)}
                onDrop={(e) => onDrop(e, page.id)}
                onDragLeave={() => setDragOverId(null)}
                onClick={() => setActivePage(page.id)}
                onContextMenu={(e) => openActionMenu(e, page.id)}
                className={`group relative cursor-pointer px-4 py-3 transition-all border-b border-gray-50 hover:bg-gray-50 ${state.activePageId === page.id ? 'bg-white shadow-[inset_4px_0_0_0_#7719aa] bg-gray-50' : ''
                  } ${page.isSubpage ? 'pl-8' : ''} ${dragOverId === page.id && dragPosition === 'before' ? 'border-t-2 border-purple-500 pt-[10px]' : ''
                  } ${dragOverId === page.id && dragPosition === 'after' ? 'border-b-2 border-purple-500 pb-[10px]' : ''
                  }`}
              >
                <div className="flex justify-between items-start gap-2 pointer-events-none">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold whitespace-normal break-words leading-tight ${state.activePageId === page.id ? 'text-gray-900' : 'text-gray-600'}`}>
                      {page.title || '無題のページ'}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400 font-normal whitespace-normal break-words line-clamp-2">
                      {page.content ? stripHtml(page.content).substring(0, 40) : 'メモ内容なし'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openActionMenu(e, page.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity shrink-0 pointer-events-auto"
                  >
                    <MoreVertical className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}

            <div onClick={() => addPage(activeSection.id)} className="flex cursor-pointer items-center gap-2 px-4 py-4 text-xs text-gray-400 hover:text-purple-700 transition-colors">
              <PlusIcon className="h-3 w-3" />
              <span>ページを追加</span>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-xs text-gray-400 mt-10">セクションを選択してノートを開始しましょう</div>
      )}

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
};

export default PageList;