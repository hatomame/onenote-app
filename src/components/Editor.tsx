import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import CopyArea from './CopyArea';
import SaveConfirmDialog from './SaveConfirmDialog'; // ← 追加
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ContextMenu, { type MenuItem } from './ContextMenu';
import { ONENOTE_PURPLE } from '../constants';

const Editor: React.FC = () => {
  const {
    state,
    updatePage,
    addPage,
    addCopyArea,
    deleteCopyArea,
    updateCopyArea,
    reorderCopyAreas
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [isCopyPanelExpanded, setIsCopyPanelExpanded] = useState(false);

  const [draggedCopyAreaId, setDraggedCopyAreaId] = useState<string | null>(null);
  const [dragOverCopyAreaId, setDragOverCopyAreaId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);

  // ★追加: 削除確認ダイアログ用の状態管理
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    targetId: string | null;
    targetName: string;
  }>({ isOpen: false, targetId: null, targetName: '' });

  // ★追加: コピー領域のリサイズ用ステート
  const [copyPanelWidth, setCopyPanelWidth] = useState(320);
  const [isResizingCopyPanel, setIsResizingCopyPanel] = useState(false);

  // リサイズハンドラー
  const startResizingCopyPanel = useCallback(() => setIsResizingCopyPanel(true), []);
  const stopResizingCopyPanel = useCallback(() => setIsResizingCopyPanel(false), []);

  const resizeCopyPanel = useCallback((e: MouseEvent) => {
    if (isResizingCopyPanel) {
      // 右端固定なので、ウィンドウ幅 - マウス位置が幅になる
      const newWidth = window.innerWidth - e.clientX;
      // 最小幅 200px, 最大幅 800px (必要に応じて調整)
      if (newWidth >= 200 && newWidth <= 800) {
        setCopyPanelWidth(newWidth);
      }
    }
  }, [isResizingCopyPanel]);

  useEffect(() => {
    if (isResizingCopyPanel) {
      window.addEventListener('mousemove', resizeCopyPanel);
      window.addEventListener('mouseup', stopResizingCopyPanel);
    } else {
      window.removeEventListener('mousemove', resizeCopyPanel);
      window.removeEventListener('mouseup', stopResizingCopyPanel);
    }
    return () => {
      window.removeEventListener('mousemove', resizeCopyPanel);
      window.removeEventListener('mouseup', stopResizingCopyPanel);
    };
  }, [isResizingCopyPanel, resizeCopyPanel, stopResizingCopyPanel]);

  const activePage = useMemo(() => {
    if (!state.activePageId) return null;
    for (const nb of state.notebooks) {
      for (const sec of nb.sections) {
        const page = sec.pages.find((p) => p.id === state.activePageId);
        if (page) return page;
      }
    }
    return null;
  }, [state.notebooks, state.activePageId]);

  const handleAddCopyBlock = useCallback(() => {
    if (!activePage) return;
    const selection = window.getSelection();
    let selectedHtml = '';
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      selectedHtml = div.innerHTML;
    }
    addCopyArea(selectedHtml);
    setContextMenu(null);
  }, [activePage, addCopyArea]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCopyAreaId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedCopyAreaId === id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    setDragPosition(y < rect.height / 2 ? 'before' : 'after');
    setDragOverCopyAreaId(id);
  };

  const onDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedCopyAreaId && draggedCopyAreaId !== id && dragPosition && activePage) {
      reorderCopyAreas(activePage.id, draggedCopyAreaId, id, dragPosition);
    }
    clearDragState();
  };

  const clearDragState = () => {
    setDraggedCopyAreaId(null);
    setDragOverCopyAreaId(null);
    setDragPosition(null);
  };

  // ★追加: 削除ボタンが押されたときの処理（ダイアログを開く）
  const requestDelete = (id: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      targetId: id,
      targetName: title || 'コピー領域'
    });
  };

  // ★追加: ダイアログで「削除」が確定されたときの処理
  const executeDelete = () => {
    if (activePage && deleteConfirm.targetId) {
      deleteCopyArea(activePage.id, deleteConfirm.targetId);
    }
    setDeleteConfirm({ isOpen: false, targetId: null, targetName: '' });
  };

  const editorMenuItems: MenuItem[] = [
    { label: 'コピー領域を追加', onClick: handleAddCopyBlock, icon: <Plus size={14} /> }
  ];

  if (!activePage) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white text-gray-300 font-light p-8 text-center">
        セクションとページを選択してメモを開始してください
      </div>
    );
  }

  return (
    <div className={`flex flex-1 h-full overflow-hidden bg-white relative ${isResizingCopyPanel ? 'cursor-col-resize select-none' : ''}`} onContextMenu={handleContextMenu}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 lg:px-12 pt-6 lg:pt-10 pb-4 border-b border-gray-100 bg-white z-10">
          <input
            type="text"
            value={activePage.title}
            onChange={(e) => updatePage(activePage.id, { title: e.target.value })}
            placeholder="無題のページ"
            className="w-full text-2xl lg:text-4xl font-light text-gray-900 placeholder-gray-200 outline-none border-none focus:ring-0 p-0"
          />
          <div className="mt-2 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
            {new Date(activePage.lastModified || Date.now()).toLocaleString()}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 custom-scrollbar">
          <div
            key={activePage.id}
            className="prose prose-sm lg:prose-lg max-w-none min-h-full outline-none text-gray-800 font-normal leading-relaxed text-base lg:text-lg"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="ここにメモを入力..."
            dangerouslySetInnerHTML={{ __html: activePage.content }}
            onBlur={(e) => updatePage(activePage.id, { content: e.currentTarget.innerHTML })}
          />
        </div>
      </div>

      {/* Resizer for Copy Area */}
      <div
        className={`w-1 hover:w-1.5 cursor-col-resize bg-gray-200 hover:bg-purple-400 transition-colors z-40 flex-shrink-0 ${isCopyPanelExpanded ? 'fixed inset-y-0' : 'hidden lg:block lg:static'}`}
        style={{ right: isCopyPanelExpanded ? `${copyPanelWidth}px` : undefined }}
        onMouseDown={startResizingCopyPanel}
      />

      {/* Right Side Panel: Copy Areas */}
      <div
        style={{ width: isCopyPanelExpanded || window.innerWidth >= 1024 ? copyPanelWidth : 0 }}
        className={`fixed lg:static inset-y-0 right-0 z-30 transform transition-transform duration-300 lg:translate-x-0 bg-[#faf9f8] border-l border-gray-200 flex flex-col shrink-0 ${isCopyPanelExpanded ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'}`}
      >
        <div className="px-5 py-4 flex justify-between items-center border-b border-gray-100 bg-white min-w-[280px]">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">一括コピー領域</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => addCopyArea('')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-purple-600">
              <Plus size={16} />
            </button>
            <button onClick={() => setIsCopyPanelExpanded(false)} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-w-[280px]">
          <AnimatePresence initial={false}>
            {activePage.copyAreas && activePage.copyAreas.map((block) => (
              <motion.div key={block.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                <CopyArea
                  id={block.id} title={block.title} content={block.content}
                  isOver={dragOverCopyAreaId === block.id} dragPosition={dragPosition}
                  // ★修正: 削除ボタンが押されたらリクエスト関数を呼ぶ
                  onRemove={(blockId) => requestDelete(blockId, block.title)}
                  onUpdate={(updates) => updateCopyArea(activePage.id, block.id, updates)}
                  onDragStart={(e) => onDragStart(e, block.id)}
                  onDragOver={(e) => onDragOver(e, block.id)}
                  onDragLeave={() => setDragOverCopyAreaId(null)}
                  onDrop={(e) => onDrop(e, block.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Toggle for Copy Panel */}
      {!isCopyPanelExpanded && (
        <button onClick={() => setIsCopyPanelExpanded(true)} className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 bg-purple-700 text-white p-2 rounded-l-md shadow-lg z-20">
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => addPage(state.activeSectionId!)}
        className="fixed bottom-6 right-6 lg:right-[340px] rounded-full shadow-2xl flex items-center justify-center text-white z-20 transition-transform active:scale-95 w-14 h-14"
        style={{ backgroundColor: ONENOTE_PURPLE }}
      >
        <Plus size={28} />
      </button>

      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={editorMenuItems} onClose={() => setContextMenu(null)} />}

      {/* ★追加: 確認ダイアログコンポーネント */}
      <SaveConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="コピー領域の削除"
        message={`「${deleteConfirm.targetName}」を完全に削除しますか？\nこの操作は元に戻せません。`}
        confirmLabel="削除する"
        isDangerous={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
      />
    </div>
  );
};

export default Editor;