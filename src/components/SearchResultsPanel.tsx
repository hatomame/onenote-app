import React from 'react';
import { useStore } from '../store/useStore';

const SearchResultsPanel: React.FC = () => {
  const { state, jumpToResult, clearSearch } = useStore();

  if (!state.searchTerm) return null;

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
        <h3 className="font-bold text-gray-700">検索結果</h3>
        <button 
          onClick={clearSearch}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          閉じる
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            "{state.searchTerm}" で {state.searchResults.length} 件ヒット
          </p>
          
          {state.searchResults.map((match, index) => {
            const isActive = state.currentSearchResultIndex === index;
            let pageTitle = "Unknown Page";
            state.notebooks.forEach(nb => {
              nb.sections.forEach(sec => {
                const p = sec.pages.find(page => page.id === match.pageId);
                if (p) pageTitle = p.title;
              });
            });

            return (
              <button
                key={match.id}
                onClick={() => jumpToResult(index)}
                className={`w-full text-left p-3 rounded-md transition-all border ${
                  isActive ? 'bg-white border-purple-300 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-bold text-purple-700 mb-1">{pageTitle}</div>
                <div className="text-sm text-gray-800 italic line-clamp-2">
                   ...{match.preview}...
                </div>
                <div className="text-[10px] text-gray-400 mt-2">
                  フィールド: {
                    match.fieldName === 'title' ? 'タイトル' : 
                    match.fieldName === 'content' ? '本文' : 
                    `コピー領域 #${(match.copyAreaIndex || 0) + 1}`
                  }
                </div>
              </button>
            );
          })}

          {state.searchResults.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
              結果が見つかりません
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPanel;
