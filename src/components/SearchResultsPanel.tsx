import React from 'react';
import { useStore } from '../store/useStore';

const SearchResultsPanel: React.FC = () => {
  const { state, jumpToResult, clearSearch } = useStore();

  if (!state.searchTerm) return null;

  return (
    <div className="absolute left-64 top-14 z-50 w-80 rounded-md border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-2">
        <span className="text-xs font-bold text-gray-500">
          検索結果: "{state.searchTerm}" ({state.searchResults.length}件)
        </span>
        <button onClick={clearSearch} className="text-xs text-blue-500 hover:underline">
          閉じる
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto p-2">
        {state.searchResults.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">見つかりませんでした</div>
        ) : (
          state.searchResults.map((match) => (
            <button
              key={match.id}
              // ★修正: indexではなく match オブジェクトそのものを渡す
              onClick={() => jumpToResult(match)}
              className="mb-1 w-full rounded-md border border-transparent p-2 text-left hover:bg-purple-50 hover:border-purple-100"
            >
              <div className="mb-0.5 text-xs font-bold text-gray-700">
                {match.fieldName === 'title' ? 'タイトル' : match.fieldName === 'content' ? '本文' : 'コピー領域'}
              </div>
              <div className="line-clamp-2 text-sm text-gray-600">
                <span dangerouslySetInnerHTML={{ __html: match.preview }} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchResultsPanel;