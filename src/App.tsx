import React, { useEffect, useState, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import PageList from './components/PageList';
import Editor from './components/Editor';
import Toast from './components/Toast';
import SearchResultsPanel from './components/SearchResultsPanel';
import { useStore } from './store/useStore';
import { Menu } from 'lucide-react';

function App() {
  const { state, setMobileNavOpen } = useStore();

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [pageListWidth, setPageListWidth] = useState(256);
  const [isResizing, setIsResizing] = useState<'sidebar' | 'pagelist' | null>(null);

  // Refs for resizing
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pageListRef = useRef<HTMLDivElement>(null);

  // Constants
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;

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

  // Resize Handlers
  const startResizingSidebar = useCallback(() => setIsResizing('sidebar'), []);
  const startResizingPageList = useCallback(() => setIsResizing('pagelist'), []);
  const stopResizing = useCallback(() => setIsResizing(null), []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing === 'sidebar') {
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    } else if (isResizing === 'pagelist') {
      // PageList width is (current mouse X) - (sidebar width) - (sidebar resizer width ~4px)
      // Simpler: just use delta if we tracked it, but absolute position calculation is robust
      // Assuming Sidebar is at 0.
      const newWidth = e.clientX - sidebarWidth;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setPageListWidth(newWidth);
      }
    }
  }, [isResizing, sidebarWidth]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-white text-gray-900 relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Mobile Navbar Overlay (Hidden on Desktop) */}
      <div className={`fixed inset-0 z-40 bg-black/30 lg:hidden transition-opacity ${state.isMobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileNavOpen(false)} />

      {/* 1. Sections Column */}
      <div
        ref={sidebarRef}
        style={{ width: state.isMobileNavOpen ? '100%' : sidebarWidth }}
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:transition-none lg:transform-none bg-gray-50 flex-shrink-0 ${state.isMobileNavOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full'}`}
      >
        <Sidebar />
      </div>

      {/* Resizer for Sidebar (Desktop Only) */}
      <div
        className="hidden lg:block w-1 hover:w-1.5 cursor-col-resize bg-gray-200 hover:bg-purple-400 transition-colors z-50 flex-shrink-0"
        onMouseDown={startResizingSidebar}
      />

      {/* 2. Pages Column */}
      <div
        ref={pageListRef}
        style={{ width: pageListWidth }}
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:transition-none lg:transform-none bg-white flex-shrink-0 border-r border-gray-200 ${state.isMobileNavOpen ? 'translate-x-[280px] delay-100' : '-translate-x-full'}`}
      >
        <PageList />
      </div>

      {/* Resizer for PageList (Desktop Only) */}
      <div
        className="hidden lg:block w-1 hover:w-1.5 cursor-col-resize bg-gray-200 hover:bg-purple-400 transition-colors z-50 flex-shrink-0"
        onMouseDown={startResizingPageList}
      />

      {/* Search Results Panel */}
      <SearchResultsPanel />

      {/* 3. Main Editor Column */}
      <main className="flex-1 overflow-hidden relative flex flex-col min-w-0">
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