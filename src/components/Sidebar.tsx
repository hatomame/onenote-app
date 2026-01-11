import React, { useState, useRef, useEffect } from 'react';
import { useStore, stripHtml } from '../store/useStore';
import { PlusIcon, BookIcon, SearchIcon, ChevronDownIcon, ChevronRightIcon } from './Icons';
import ContextMenu, { type MenuItem } from './ContextMenu';

const Sidebar: React.FC = () => {
  const {
    state, setActiveSection, setActivePage,
    addSection, addPage, renameSection, deleteSection,
    deletePage, toggleSubpage, reorderSidebarItems,
    moveSectionToGroup, addSectionGroup, renameSectionGroup, toggleSectionGroup, removeSectionGroup,
    performSearch, clearSearch
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId) || state.notebooks[0];
  const activeSection = activeNotebook?.sections.find(s => s.id === state.activeSectionId);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'section' | 'page' | 'group' | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const groupRenameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSectionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingSectionId]);

  useEffect(() => {
    if (editingGroupId && groupRenameInputRef.current) {
      groupRenameInputRef.current.focus();
      groupRenameInputRef.current.select();
    }
  }, [editingGroupId]);

  const handleDragStart = (e: React.DragEvent, id: string, type: 'section' | 'page' | 'group') => {
    setDraggedId(id);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
    if (type === 'page') {
      e.dataTransfer.setData('pageId', id);
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string, targetType: 'section' | 'page' | 'group') => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || !dragType) return;
    if (draggedId === targetId) return;

    if (activeNotebook && (dragType === 'section' || dragType === 'group') && (targetType === 'section' || targetType === 'group')) {
        const currentOrder = [...activeNotebook.sidebarOrder];
        const oldIndex = currentOrder.findIndex(i => i.id === draggedId);
        const newIndex = currentOrder.findIndex(i => i.id === targetId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            currentOrder.splice(oldIndex, 1);
            currentOrder.splice(newIndex, 0, { id: draggedId, type: dragType });
            reorderSidebarItems(currentOrder);
        }
    } else if (dragType === 'page' && targetType === 'section') {
      const pageId = e.dataTransfer.getData('pageId');
      if (pageId && useStore.getState().movePageToSection) {
        useStore.getState().movePageToSection(pageId, targetId);
      }
    }
    
    setDraggedId(null);
    setDragType(null);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'section' | 'page' | 'group', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItem[] = [];

    if (type === 'section') {
      items.push(
        { label: '名前の変更', onClick: () => setEditingSectionId(id) },
        { label: '削除', onClick: () => { if (confirm('セクションを削除しますか？')) deleteSection(id); }, danger: true },
        { label: 'グループへ移動', onClick: () => {
            const confirmed = confirm('グループから出してルートへ移動しますか？');
            if (confirmed) moveSectionToGroup(id, undefined); 
        }}
      );
    } else if (type === 'page') {
      items.push(
        { label: '削除', onClick: () => { if (confirm('ページを削除しますか？')) deletePage(id); }, danger: true },
        { label: 'サブページにする/解除', onClick: () => toggleSubpage(id) }
      );
    } else if (type === 'group') {
        items.push(
            { label: '名前の変更', onClick: () => setEditingGroupId(id) },
            { label: 'グループ解除', onClick: () => removeSectionGroup(id), danger: true }
        );
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    performSearch(e.target.value);
  };

  if (!activeNotebook) return null;

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-[#f8f8f8]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-2 font-bold text-gray-700">
          <BookIcon className="h-5 w-5 text-purple-700" />
          <span className="truncate">{activeNotebook.title}</span>
        </div>
        <button onClick={() => addSectionGroup(activeNotebook.id)} title="グループ追加" className="text-gray-400 hover:text-purple-600">
            <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="検索..."
            value={localSearch}
            onChange={handleSearch}
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-purple-500 focus:outline-none"
          />
          {localSearch && (
             <button onClick={() => { setLocalSearch(''); clearSearch(); }} className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-600">×</button>
          )}
        </div>
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeNotebook.sidebarOrder.map((item) => {
            if (item.type === 'group') {
                const group = activeNotebook.sectionGroups.find(g => g.id === item.id);
                if (!group) return null;
                const groupSections = activeNotebook.sections.filter(s => s.groupId === group.id);

                return (
                    <div 
                        key={group.id} 
                        className={`mb-1 ${dragOverId === group.id ? 'border-t-2 border-purple-500' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, group.id, 'group')}
                        onDragOver={(e) => handleDragOver(e, group.id)}
                        onDrop={(e) => handleDrop(e, group.id, 'group')}
                        onContextMenu={(e) => handleContextMenu(e, 'group', group.id)}
                    >
                        <div 
                            className="flex cursor-pointer items-center gap-1 px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-200"
                            onClick={() => toggleSectionGroup(group.id)}
                        >
                            {group.isCollapsed ? <ChevronRightIcon className="h-3 w-3"/> : <ChevronDownIcon className="h-3 w-3"/>}
                            {editingGroupId === group.id ? (
                                <input
                                    ref={groupRenameInputRef}
                                    defaultValue={group.title}
                                    onBlur={(e) => {
                                        renameSectionGroup(group.id, e.target.value);
                                        setEditingGroupId(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            renameSectionGroup(group.id, e.currentTarget.value);
                                            setEditingGroupId(null);
                                        }
                                    }}
                                    className="bg-white px-1 outline-none ring-1 ring-purple-500"
                                />
                            ) : (
                                <span>{group.title}</span>
                            )}
                        </div>
                        
                        {!group.isCollapsed && (
                            <div className="ml-2 border-l-2 border-gray-300 pl-1">
                                {groupSections.map(section => (
                                    <div
                                        key={section.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, section.id, 'section')}
                                        onDragOver={(e) => handleDragOver(e, section.id)}
                                        onDrop={(e) => handleDrop(e, section.id, 'section')}
                                        onClick={() => setActiveSection(section.id)}
                                        onContextMenu={(e) => handleContextMenu(e, 'section', section.id)}
                                        className={`group relative mb-0.5 flex cursor-pointer items-center justify-between rounded-l-md border-l-4 px-3 py-2 transition-colors ${
                                            state.activeSectionId === section.id
                                            ? 'bg-white font-medium text-purple-900 shadow-sm'
                                            : 'border-transparent text-gray-600 hover:bg-gray-200'
                                        }`}
                                        style={{ borderLeftColor: state.activeSectionId === section.id ? section.color : 'transparent' }}
                                    >
                                        {editingSectionId === section.id ? (
                                            <input
                                                ref={renameInputRef}
                                                defaultValue={section.title}
                                                onBlur={(e) => {
                                                    renameSection(section.id, e.target.value);
                                                    setEditingSectionId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        renameSection(section.id, e.currentTarget.value);
                                                        setEditingSectionId(null);
                                                    }
                                                }}
                                                className="w-full bg-white px-1 outline-none ring-1 ring-purple-500"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="truncate">{section.title}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            } else {
                const section = activeNotebook.sections.find(s => s.id === item.id);
                if (!section || section.groupId) return null;

                return (
                    <div
                        key={section.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, section.id, 'section')}
                        onDragOver={(e) => handleDragOver(e, section.id)}
                        onDrop={(e) => handleDrop(e, section.id, 'section')}
                        onClick={() => setActiveSection(section.id)}
                        onContextMenu={(e) => handleContextMenu(e, 'section', section.id)}
                        className={`group relative mb-0.5 flex cursor-pointer items-center justify-between rounded-l-md border-l-4 px-3 py-2 transition-colors ${
                            state.activeSectionId === section.id
                            ? 'bg-white font-medium text-purple-900 shadow-sm'
                            : 'border-transparent text-gray-600 hover:bg-gray-200'
                        } ${dragOverId === section.id ? 'bg-purple-100' : ''}`}
                        style={{ borderLeftColor: state.activeSectionId === section.id ? section.color : 'transparent' }}
                    >
                        {editingSectionId === section.id ? (
                            <input
                                ref={renameInputRef}
                                defaultValue={section.title}
                                onBlur={(e) => {
                                    renameSection(section.id, e.target.value);
                                    setEditingSectionId(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        renameSection(section.id, e.currentTarget.value);
                                        setEditingSectionId(null);
                                    }
                                }}
                                className="w-full bg-white px-1 outline-none ring-1 ring-purple-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="truncate">{section.title}</span>
                        )}
                    </div>
                );
            }
        })}

        <div
          onClick={() => addSection(activeNotebook.id)}
          className="mt-1 flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 hover:text-purple-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span>セクションを追加</span>
        </div>
      </div>

      {/* Page List */}
      <div className="flex-1 overflow-y-auto border-t border-gray-200 bg-[#f5f5f5] custom-scrollbar">
        {activeSection ? (
          <div>
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 sticky top-0">
                {activeSection.title} のページ
            </div>
            {activeSection.pages.map((page) => (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, page.id, 'page')}
                onContextMenu={(e) => handleContextMenu(e, 'page', page.id)}
                onClick={() => setActivePage(page.id)}
                className={`cursor-pointer border-b border-gray-200 px-4 py-3 transition-colors hover:bg-white ${
                  state.activePageId === page.id ? 'bg-white border-l-4 border-l-purple-600' : 'bg-transparent border-l-4 border-l-transparent'
                } ${page.isSubpage ? 'pl-8' : ''}`}
              >
                <div className={`text-sm font-medium ${state.activePageId === page.id ? 'text-black' : 'text-gray-700'}`}>
                  {page.title || '無題のページ'}
                </div>
                <div className="mt-1 truncate text-xs text-gray-400">
                  {page.content ? stripHtml(page.content).substring(0, 30) : '追加テキストなし'}
                </div>
              </div>
            ))}
            <div
              onClick={() => addPage(activeSection.id)}
              className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-white hover:text-purple-700"
            >
              <PlusIcon className="h-4 w-4" />
              <span>ページを追加</span>
            </div>
          </div>
        ) : (
            <div className="p-4 text-center text-sm text-gray-400">セクションを選択</div>
        )}
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