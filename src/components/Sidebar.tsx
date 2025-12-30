import React, { useState, useRef, useEffect } from 'react';
import { useStore, stripHtml } from '../store/useStore';
import { PlusIcon, BookIcon, SearchIcon, ChevronDownIcon, ChevronRightIcon } from './Icons';
import { ONENOTE_PURPLE } from '../constants';
import ContextMenu, { type MenuItem } from './ContextMenu';
import type { Section, SidebarItem } from '../types';

const Sidebar: React.FC = () => {
  const { 
    state, setActiveNotebook, setActiveSection, setActivePage, 
    addSection, addPage, renameSection, deleteSection, 
    deletePage, toggleSubpage, reorderPages, reorderSidebarItems,
    moveSectionToGroup, addSectionGroup, renameSectionGroup, toggleSectionGroup, removeSectionGroup,
    performSearch, goToNextResult, clearSearch
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId);
  const activeSection = activeNotebook?.sections.find(s => s.id === state.activeSectionId);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'section' | 'page' | 'group' | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const groupRenameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSectionId && renameInputRef.current) {
      renameInputRef.current.select();
    }
  }, [editingSectionId]);

  useEffect(() => {
    if (editingGroupId && groupRenameInputRef.current) {
      groupRenameInputRef.current.select();
    }
  }, [editingGroupId]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (localSearch && localSearch === state.searchTerm) {
        goToNextResult();
      } else {
        performSearch(localSearch);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (!val) {
      clearSearch();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'section' | 'page' | 'group', id: string) => {
    e.preventDefault();
    const items: MenuItem[] = [];

    if (type === 'section') {
      const section = activeNotebook?.sections.find(s => s.id === id);
      items.push({ label: 'セクション名変更', onClick: () => setEditingSectionId(id) });
      if (section?.groupId) {
        items.push({ label: 'グループから解除', onClick: () => moveSectionToGroup(id, undefined) });
      }
      items.push({ label: '削除', onClick: () => deleteSection(id) });
      items.push({ label: 'グループを作成', onClick: () => state.activeNotebookId && addSectionGroup(state.activeNotebookId, id) });
    } else if (type === 'page') {
      items.push({ label: '削除', onClick: () => deletePage(id) });
      items.push({ label: 'サブページ', onClick: () => toggleSubpage(id) });
    } else if (type === 'group') {
      items.push({ label: 'グループ名の変更', onClick: () => setEditingGroupId(id) });
      items.push({ label: 'セクショングループの解除', onClick: () => removeSectionGroup(id) });
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'section' | 'page' | 'group') => {
    // 編集モード中はドラッグを無効化
    if (editingSectionId || editingGroupId) {
      e.preventDefault();
      return;
    }
    
    // バブリング防止：子(section)ドラッグ時に親(group)ドラッグが起きないように
    e.stopPropagation();
    
    if (id === 'sec1' && type === 'section') {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'section' | 'page' | 'group') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || !dragType || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    if (dragType === 'section' && (targetType === 'section' || targetType === 'group')) {
      if (activeNotebook) {
        const targetSection = activeNotebook.sections.find(s => s.id === targetId);
        
        if (targetType === 'group' || (targetType === 'section' && targetSection?.groupId)) {
          const gid = targetType === 'group' ? targetId : targetSection?.groupId;
          moveSectionToGroup(draggedId, gid);
          setDraggedId(null);
          return;
        }

        moveSectionToGroup(draggedId, undefined);
        const currentOrder = [...activeNotebook.sidebarOrder];
        const oldIndex = currentOrder.findIndex(i => i.id === draggedId);
        const newIndex = currentOrder.findIndex(i => i.id === targetId);

        if (newIndex !== -1) {
          if (oldIndex !== -1) currentOrder.splice(oldIndex, 1);
          currentOrder.splice(newIndex, 0, { id: draggedId, type: 'section' });
          reorderSidebarItems(activeNotebook.id, currentOrder);
        }
      }
    } else if (dragType === 'group' && (targetType === 'group' || targetType === 'section')) {
      if (activeNotebook) {
        const currentOrder = [...activeNotebook.sidebarOrder];
        const oldIndex = currentOrder.findIndex(i => i.id === draggedId);
        const newIndex = currentOrder.findIndex(i => i.id === targetId);

        if (oldIndex !== -1 && newIndex !== -1) {
          currentOrder.splice(oldIndex, 1);
          currentOrder.splice(newIndex, 0, { id: draggedId, type: 'group' });
          reorderSidebarItems(activeNotebook.id, currentOrder);
        }
      }
    } else if (dragType === 'page' && activeSection && targetType === 'page') {
      const pages = activeSection.pages;
      const getBlock = (id: string): string[] => {
        const idx = pages.findIndex(p => p.id === id);
        if (idx === -1) return [id];
        if (pages[idx].isSubpage) return [id];
        const block = [id];
        for (let i = idx + 1; i < pages.length; i++) {
          if (pages[i].isSubpage) {
            block.push(pages[i].id);
          } else {
            break;
          }
        }
        return block;
      };

      const draggedBlock = getBlock(draggedId);
      const allPageIds = pages.map(p => p.id);
      const remainingIds = allPageIds.filter(id => !draggedBlock.includes(id));
      const insertIdx = remainingIds.indexOf(targetId);
      remainingIds.splice(insertIdx, 0, ...draggedBlock);
      reorderPages(activeSection.id, remainingIds);
    }
    setDraggedId(null);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragType === 'section' && draggedId) {
      moveSectionToGroup(draggedId, undefined);
    }
    setDraggedId(null);
  };

  const renderSectionItem = (section: Section) => (
    <div
      key={section.id}
      draggable={section.id !== 'sec1' && !editingSectionId}
      onDragStart={(e) => handleDragStart(e, section.id, 'section')}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, section.id, 'section')}
      onContextMenu={(e) => handleContextMenu(e, 'section', section.id)}
      onDoubleClick={() => setEditingSectionId(section.id)}
      className={`group relative border-l-4 transition-all cursor-pointer ${
        state.activeSectionId === section.id 
          ? 'bg-white font-semibold shadow-sm' 
          : 'hover:bg-gray-100 text-gray-600 border-transparent'
      }`}
      style={{ borderLeftColor: state.activeSectionId === section.id ? section.color : 'transparent' }}
    >
      {editingSectionId === section.id ? (
        <input
          ref={renameInputRef}
          autoFocus
          className="w-full px-4 py-3 text-sm border-none focus:ring-1 focus:ring-purple-400 bg-white outline-none"
          defaultValue={section.title}
          onBlur={(e) => {
            renameSection(section.id, e.target.value);
            setEditingSectionId(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              renameSection(section.id, (e.target as HTMLInputElement).value);
              setEditingSectionId(null);
            } else if (e.key === 'Escape') {
              setEditingSectionId(null);
            }
          }}
        />
      ) : (
        <button
          onClick={() => setActiveSection(section.id)}
          className="w-full text-left px-4 py-3 text-sm truncate"
        >
          {section.title}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full select-none shrink-0">
      <div className="w-16 flex flex-col items-center py-4 bg-gray-100 border-r border-gray-200">
        <div className="mb-8 p-2 rounded-lg bg-white shadow-sm" style={{ color: ONENOTE_PURPLE }}>
          <BookIcon className="w-6 h-6" />
        </div>
        {state.notebooks.map(nb => (
          <button
            key={nb.id}
            onClick={() => setActiveNotebook(nb.id)}
            className={`w-12 h-12 flex items-center justify-center rounded-lg mb-2 transition-all ${
              state.activeNotebookId === nb.id ? 'bg-white shadow-md' : 'hover:bg-gray-200'
            }`}
          >
            <span className="font-bold text-gray-600">{nb.title.charAt(0)}</span>
          </button>
        ))}
      </div>

      <div className="w-60 bg-gray-50 flex flex-col border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 z-10">
          <span className="font-semibold text-gray-700 text-sm">セクション</span>
          <button 
            onClick={() => state.activeNotebookId && addSection(state.activeNotebookId)}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        <div 
          id="sidebar-sections-root"
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-50"
          onDragOver={handleDragOver}
          onDrop={handleRootDrop}
        >
          {activeNotebook && activeNotebook.sidebarOrder.map((item) => {
            if (item.type === 'group') {
              const group = activeNotebook.sectionGroups.find(g => g.id === item.id);
              if (!group) return null;
              return (
                <div 
                  key={group.id} 
                  className="mb-1"
                  draggable={!editingGroupId}
                  onDragStart={(e) => handleDragStart(e, group.id, 'group')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id, 'group')}
                  onContextMenu={(e) => handleContextMenu(e, 'group', group.id)}
                >
                  {editingGroupId === group.id ? (
                    <div className="px-2 py-2">
                      <input
                        ref={groupRenameInputRef}
                        autoFocus
                        className="w-full px-2 py-1 text-sm border border-purple-400 bg-white outline-none rounded shadow-sm"
                        defaultValue={group.title}
                        onBlur={(e) => {
                          renameSectionGroup(group.id, e.target.value);
                          setEditingGroupId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameSectionGroup(group.id, (e.target as HTMLInputElement).value);
                            setEditingGroupId(null);
                          } else if (e.key === 'Escape') {
                            setEditingGroupId(null);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button 
                      onClick={() => toggleSectionGroup(group.id)}
                      onDoubleClick={() => setEditingGroupId(group.id)}
                      className="w-full flex items-center px-2 py-2 hover:bg-gray-200 transition-colors group"
                    >
                      <div className="mr-1 text-gray-500">
                        {group.isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">{group.title}</span>
                    </button>
                  )}
                  {!group.isCollapsed && (
                    <div className="pl-4 border-l border-gray-200 ml-4 mt-1">
                      {activeNotebook.sections
                        .filter(s => s.groupId === group.id)
                        .map(s => renderSectionItem(s))}
                    </div>
                  )}
                </div>
              );
            } else {
              const section = activeNotebook.sections.find(s => s.id === item.id);
              if (!section || section.groupId) return null;
              return renderSectionItem(section);
            }
          })}
          <div className="h-32 w-full" />
        </div>
      </div>

      <div className="w-64 bg-white flex flex-col border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 text-sm">ページ</span>
            <button 
              onClick={() => state.activeSectionId && addPage(state.activeSectionId)}
              className="p-1 hover:bg-gray-200 rounded text-gray-500"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="検索"
              className="w-full bg-gray-100 border-none rounded-md pl-9 pr-3 py-1.5 text-xs focus:ring-0"
              value={localSearch}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeSection?.pages.map(page => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => handleDragStart(e, page.id, 'page')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, page.id, 'page')}
              onContextMenu={(e) => handleContextMenu(e, 'page', page.id)}
              className={`w-full border-b border-gray-100 transition-all ${
                state.activePageId === page.id ? 'bg-purple-50' : 'hover:bg-gray-50'
              } ${page.isSubpage ? 'pl-8' : ''}`}
            >
              <button
                onClick={() => setActivePage(page.id)}
                className="w-full text-left px-4 py-4"
              >
                <div className={`text-sm font-semibold truncate ${state.activePageId === page.id ? 'text-purple-700' : 'text-gray-800'}`}>
                  {page.title || '無題のページ'}
                </div>
                <div className="text-xs text-gray-500 truncate mt-1">
                  {stripHtml(page.content) || '内容なし'}
                </div>
                <div className="text-[10px] text-gray-400 mt-2">
                  {new Date(page.lastModified).toLocaleDateString()}
                </div>
              </button>
            </div>
          ))}
          {activeSection?.pages.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400">
              ページがありません
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default Sidebar;