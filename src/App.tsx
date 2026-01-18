import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PageList from './components/PageList';
import Editor from './components/Editor';
import Toast from './components/Toast';
import SearchResultsPanel from './components/SearchResultsPanel';
import { useStore } from './store/useStore';
import { Menu } from 'lucide-react';

function App() {
  const { state, setMobileNavOpen } = useStore();

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
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900 relative">
      {/* Mobile Navbar Overlay (Hidden on Desktop) */}
      <div className={`fixed inset-0 z-40 bg-black/30 lg:hidden transition-opacity ${state.isMobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileNavOpen(false)} />
      
      {/* 1. Sections Column (Hidden on Mobile unless toggled) */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex transform transition-transform duration-300 lg:translate-x-0 ${state.isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>
      
      {/* 2. Pages Column (Hidden on Mobile unless toggled) */}
      <div className={`fixed inset-y-0 left-64 z-50 lg:static lg:flex transform transition-transform duration-300 lg:translate-x-0 ${state.isMobileNavOpen ? 'translate-x-0' : '-translate-x-[512px]'}`}>
        <PageList />
      </div>

      {/* Search Results Panel */}
      <SearchResultsPanel />
      
      {/* 3. Main Editor Column */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
          <button onClick={() => setMobileNavOpen(true)} className="p-2 hover:bg-gray-100 rounded-md">
            <Menu size={24} className="text-gray-700" />
          </button>
          <span className="font-bold text-sm text-purple-800 truncate">OneNote</span>
        </div>

        <div className="flex-1 overflow-hidden relative">
           <Editor />
        </div>
      </main>

      <Toast />
    </div>
  );
}

export default App;