import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import CopyArea from './CopyArea';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Editor: React.FC = () => {
  // Storeから必要なデータと関数を取得
  const { 
    state, 
    updatePage, 
    addCopyArea, 
    deleteCopyArea 
  } = useStore();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Storeの中から「現在のアクティブなページ」を探し出すロジック
  const activePage = React.useMemo(() => {
    if (!state.activePageId) return null;
    for (const nb of state.notebooks) {
      for (const sec of nb.sections) {
        const page = sec.pages.find((p) => p.id === state.activePageId);
        if (page) return page;
      }
    }
    return null;
  }, [state.notebooks, state.activePageId]);

  // ページが切り替わったらエディタの内容を更新
  useEffect(() => {
    if (activePage) {
      setContent(activePage.content);
      setTitle(activePage.title);
      if (editorRef.current && editorRef.current.innerHTML !== activePage.content) {
        editorRef.current.innerHTML = activePage.content;
      }
    } else {
      setContent('');
      setTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [activePage?.id]); // IDが変わった時だけ実行

  // タイトル更新
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePage) return;
    const newTitle = e.target.value;
    setTitle(newTitle);
    updatePage(activePage.id, { title: newTitle });
  };

  // 本文更新
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!activePage) return;
    const newContent = e.currentTarget.innerHTML;
    setContent(newContent);
    // パフォーマンスのため、本来はdebounce（遅延保存）すべきだが、今回は直接更新
    updatePage(activePage.id, { content: newContent });
  };

  // コピー領域追加
  const handleAddCopyBlock = () => {
    if (!activePage) return;
    
    const selection = window.getSelection();
    let selectedHtml = '';

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      selectedHtml = div.innerHTML;
    } else {
      selectedHtml = content; // 選択なしなら全文
    }

    if (selectedHtml) {
      addCopyArea(selectedHtml);
    }
  };

  if (!activePage) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 text-gray-400">
        ページを選択または作成してください
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-white">
      {/* ヘッダーエリア */}
      <div className="border-b border-gray-200 p-6 pb-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="ページタイトル"
          className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 outline-none"
        />
        <div className="mt-2 text-sm text-gray-500">
          最終更新: {new Date(activePage.lastModified || Date.now()).toLocaleString()}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* メインエディタ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            ref={editorRef}
            className="prose prose-lg max-w-none min-h-[500px] outline-none"
            contentEditable
            onInput={handleInput}
            suppressContentEditableWarning
          />
        </div>

        {/* コピー領域サイドパネル (右側) */}
        {(activePage.copyAreas && activePage.copyAreas.length > 0) && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
            <h3 className="mb-4 font-semibold text-gray-700">一括コピー領域</h3>
            
            <div className="space-y-4">
              <AnimatePresence>
                {activePage.copyAreas.map((block) => (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <CopyArea
                      id={block.id}
                      content={block.content}
                      // ★ここが重要: ページIDとブロックIDの両方を渡す
                      // Editor.tsx 139行目あたり
                      onRemove={(blockId) => deleteCopyArea(activePage.id, blockId)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* フローティングアクションボタン */}
      <button
        onClick={handleAddCopyBlock}
        className="fixed bottom-8 right-8 rounded-full bg-purple-600 p-4 text-white shadow-lg hover:bg-purple-700 transition-transform active:scale-95 z-10"
        title="選択範囲をコピー領域に追加"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default Editor;