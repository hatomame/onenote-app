import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import { useStore } from './store/useStore';

function App() {
  const { state } = useStore();

  // ブラウザを閉じる前の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900">
      {/* 左サイドバー */}
      <Sidebar />
      
      {/* メインエディタ */}
      <main className="flex-1 overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}

export default App;