import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Search, Book, MoreVertical, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import ContextMenu, { type MenuItem } from './ContextMenu';
import { ONENOTE_BG_SIDEBAR } from '../constants';

const Sidebar: React.FC = () => {
  const {
    state, setActiveSection,
    addSection, renameSection, deleteSection,
    moveSectionToGroup, reorderSidebarItems,
    addSectionGroup, renameSectionGroup, toggleSectionGroup, removeSectionGroup,
    performSearch
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(state.searchTerm);

  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'section' | 'group' } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'inside' | 'before' | 'after' | null>(null);

  const activeNotebook = state.notebooks.find(n => n.id === state.activeNotebookId) || state.notebooks[0];

  const renameInputRef = useRef<HTMLInputElement>(null);
  const groupRenameInputRef = useRef<HTMLInputElement>(null);
  const listAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingSectionId && renameInputRef.current) {
      const input = renameInputRef.current;
      input.focus();
      setTimeout(() => input.select(), 50);
    }
  }, [editingSectionId]);

  useEffect(() => {
    if (editingGroupId && groupRenameInputRef.current) {
      const input = groupRenameInputRef.current;
      input.focus();
      setTimeout(() => input.select(), 50);
    }
  }, [editingGroupId]);

  const openActionMenu = (e: React.MouseEvent, type: 'section' | 'group', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const items: MenuItem[] = [];

    if (type === 'section') {
      items.push(
        { label: '名前の変更', onClick: () => setEditingSectionId(id) },
        { label: '削除', danger: true, onClick: () => deleteSection(id) }
      );
    } else if (type === 'group') {
      items.push(
        { label: '名前の変更', onClick: () => setEditingGroupId(id) },
        { label: 'グループ解除', danger: true, onClick: () => removeSectionGroup(id) }
      );
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // クリックされた場所がリストエリアそのものか、背景用クラスを持つ要素の場合のみメニューを表示
    if (e.target !== listAreaRef.current && !(e.target as HTMLElement).classList.contains('sidebar-bg-clickable')) return;
    
    const items: MenuItem[] = [
      { label: '新しいセクション', onClick: () => addSection(activeNotebook.id) },
      { label: '新しいセクショングループ', onClick: () => addSectionGroup(activeNotebook.id) }
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleSectionRenameSubmit = (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      renameSection(id, newTitle.trim());
    }
    setEditingSectionId(null);
  };

  const onDragStart = (e: React.DragEvent, id: string, type: 'section' | 'group') => {
    setDraggedItem({ id, type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, targetId: string, targetType: 'section' | 'group') => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // セクションをグループの上にドラッグした場合
    if (targetType === 'group' && draggedItem.type === 'section') {
      // グループの中央付近なら「中に入れる」
      if (y > rect.height * 0.25 && y < rect.height * 0.75) {
        setDragPosition('inside');
      } else if (y <= rect.height * 0.25) {
        setDragPosition('before');
      } else {
        setDragPosition('after');
      }
    } else {
      setDragPosition(y < rect.height / 2 ? 'before' : 'after');
    }
    
    setDragOverId(targetId);
  };

  const onDrop = (e: React.DragEvent, targetId: string, targetType: 'section' | 'group') => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetId) {
      clearDragState();
      return;
    }

    // グループの中にセクションを入れる処理
    if (targetType === 'group' && draggedItem.type === 'section' && dragPosition === 'inside') {
      moveSectionToGroup(draggedItem.id, targetId);
    } else {
      // 並び替え処理
      const newOrder = [...activeNotebook.sidebarOrder];
      
      // まず移動元のアイテムを探して削除（ただし、グループ内のセクションはsidebarOrderにはいないので注意）
      // ここではsidebarOrderにあるもの（トップレベルのもの）の並び替えを想定
      const draggedIdx = newOrder.findIndex(i => i.id === draggedItem.id);
      let targetIdx = newOrder.findIndex(i => i.id === targetId);

      // もしドラッグ元がトップレベルにあれば削除
      if (draggedIdx !== -1) {
        newOrder.splice(draggedIdx, 1);
        // 削除したのでインデックスを再計算
        targetIdx = newOrder.findIndex(i => i.id === targetId);
      }

      const insertIdx = dragPosition === 'before' ? targetIdx : targetIdx + 1;
      
      if (draggedItem.type === 'section') {
        // セクションをトップレベルに移動（グループから出す場合も含む）
        moveSectionToGroup(draggedItem.id, undefined, insertIdx);
      } else {
        // グループの並び替え
        newOrder.splice(insertIdx, 0, draggedItem);
        reorderSidebarItems(newOrder);
      }
    }

    clearDragState();
  };

  const clearDragState = () => {
    setDraggedItem(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  if (!activeNotebook) return null;

  return (
    <div 
      className="flex h-full w-64 flex-col border-r border-gray-200 flex-shrink-0"
      style={{ backgroundColor: ONENOTE_BG_SIDEBAR }}
    >
      {/* Notebook Header */}
      <div className="flex items-center justify-between px-4 py-4 select-none">
        <div className="flex items-center gap-2 cursor-pointer group">
          <ChevronDown className="h-4 w-4 text-gray-600" />
          <div className="relative">
            <Book className="h-5 w-5 text-purple-700" />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100 flex items-center justify-center">
               <div className="h-2 w-2 rounded-full bg-green-600" />
            </div>
          </div>
          <span className="font-semibold text-[13px] text-gray-800 truncate">
            {activeNotebook.title}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 pt-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="セクションを検索..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              performSearch(e.target.value);
            }}
            className="w-full rounded bg-white border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:border-purple-500 focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Section List */}
      <div 
        ref={listAreaRef}
        onContextMenu={handleBackgroundContextMenu}
        className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-0.5 sidebar-bg-clickable pb-10"
      >
        {activeNotebook.sidebarOrder.map((item) => {
          if (item.type === 'group') {
            const group = activeNotebook.sectionGroups.find(g => g.id === item.id);
            if (!group) return null;
            const groupSections = activeNotebook.sections.filter(s => s.groupId === group.id);

            const isOver = dragOverId === group.id;

            return (
              <div 
                key={group.id} 
                className={`flex flex-col select-none transition-all duration-150 rounded-md ${
                  isOver && dragPosition === 'before' ? 'border-t-2 border-purple-500 pt-1' : ''
                } ${
                  isOver && dragPosition === 'after' ? 'border-b-2 border-purple-500 pb-1' : ''
                }`}
                onDragOver={(e) => onDragOver(e, group.id, 'group')}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => onDrop(e, group.id, 'group')}
              >
                {/* Group Header */}
                <div 
                  draggable
                  onDragStart={(e) => onDragStart(e, group.id, 'group')}
                  className={`flex cursor-pointer items-center justify-between gap-1 px-1 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200/80 rounded-sm group ${
                    isOver && dragPosition === 'inside' ? 'bg-purple-100 ring-2 ring-purple-300' : ''
                  }`}
                  onClick={() => toggleSectionGroup(group.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); }}
                  onContextMenu={(e) => openActionMenu(e, 'group', group.id)}
                >
                  <div className="flex items-center gap-1 flex-1 overflow-hidden pointer-events-none">
                    {/* アイコン表示：V または > */}
                    <div className="text-gray-500 shrink-0">
                        {group.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </div>
                    
                    {/* フォルダアイコン */}
                    <FolderPlus size={14} className="text-yellow-600/80 shrink-0" />

                    {editingGroupId === group.id ? (
                      <input
                        ref={groupRenameInputRef}
                        defaultValue={group.title}
                        onBlur={(e) => { renameSectionGroup(group.id, e.target.value); setEditingGroupId(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { renameSectionGroup(group.id, e.currentTarget.value); setEditingGroupId(null); } }}
                        className="bg-white px-1 outline-none ring-1 ring-purple-500 rounded text-xs w-full pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate ml-1">{group.title}</span>
                    )}
                  </div>
                  <button onClick={(e) => openActionMenu(e, 'group', group.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 rounded transition-opacity pointer-events-auto">
                    <MoreVertical className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
                
                {/* Group Children (Sections) */}
                {!group.isCollapsed && (
                  <div className="ml-3 border-l border-gray-300/50 pl-1 flex flex-col space-y-0.5 mt-0.5">
                    {groupSections.length === 0 && (
                        <div className="text-[10px] text-gray-400 pl-4 py-1 italic">
                            （空）ここにセクションをドロップ
                        </div>
                    )}
                    {groupSections.map(section => (
                      <SectionItem
                        key={section.id}
                        section={section}
                        isActive={state.activeSectionId === section.id}
                        isEditing={editingSectionId === section.id}
                        isOver={dragOverId === section.id}
                        dragPosition={dragPosition}
                        onSelect={() => setActiveSection(section.id)}
                        onStartEdit={() => setEditingSectionId(section.id)}
                        onRename={handleSectionRenameSubmit}
                        onOpenMenu={(e) => openActionMenu(e, 'section', section.id)}
                        onDragStart={(e) => onDragStart(e, section.id, 'section')}
                        onDragOver={(e) => onDragOver(e, section.id, 'section')}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(e) => onDrop(e, section.id, 'section')}
                        renameInputRef={renameInputRef}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          } else {
            // Top Level Section
            const section = activeNotebook.sections.find(s => s.id === item.id);
            if (!section || section.groupId) return null; // groupIdがあるものはグループ内で表示済み

            return (
              <SectionItem
                key={section.id}
                section={section}
                isActive={state.activeSectionId === section.id}
                isEditing={editingSectionId === section.id}
                isOver={dragOverId === section.id}
                dragPosition={dragPosition}
                onSelect={() => setActiveSection(section.id)}
                onStartEdit={() => setEditingSectionId(section.id)}
                onRename={handleSectionRenameSubmit}
                onOpenMenu={(e) => openActionMenu(e, 'section', section.id)}
                onDragStart={(e) => onDragStart(e, section.id, 'section')}
                onDragOver={(e) => onDragOver(e, section.id, 'section')}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => onDrop(e, section.id, 'section')}
                renameInputRef={renameInputRef}
              />
            );
          }
        })}

        {/* Add Buttons at bottom */}
        <div className="pt-2 flex flex-col gap-1 sidebar-bg-clickable">
            <div 
            onClick={() => addSection(activeNotebook.id)} 
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-200/50 hover:text-purple-700 rounded-md transition-all"
            >
            <Plus className="h-3 w-3" />
            <span>セクションを追加</span>
            </div>
            <div 
            onClick={() => addSectionGroup(activeNotebook.id)} 
            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:bg-gray-200/50 hover:text-purple-700 rounded-md transition-all"
            >
            <FolderPlus className="h-3 w-3" />
            <span>グループを追加</span>
            </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenu.items} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
};

interface SectionItemProps {
  section: any;
  isActive: boolean;
  isEditing: boolean;
  isOver: boolean;
  dragPosition: 'before' | 'after' | 'inside' | null;
  onSelect: () => void;
  onStartEdit: () => void;
  onRename: (id: string, title: string) => void;
  onOpenMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
}

const SectionItem: React.FC<SectionItemProps> = ({ 
  section, isActive, isEditing, isOver, dragPosition, 
  onSelect, onStartEdit, onRename, onOpenMenu,
  onDragStart, onDragOver, onDragLeave, onDrop,
  renameInputRef 
}) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    onClick={onSelect}
    onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(); }}
    onContextMenu={onOpenMenu}
    className={`group relative flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-all select-none ${
      isActive 
        ? 'bg-white font-bold text-gray-900 shadow-sm border border-gray-100 ring-1 ring-black/5' 
        : 'text-gray-600 hover:bg-gray-200/80'
    } ${
      isOver && dragPosition === 'before' ? 'border-t-2 border-purple-500' : ''
    } ${
      isOver && dragPosition === 'after' ? 'border-b-2 border-purple-500' : ''
    }`}
  >
    {isActive && (
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-md" 
        style={{ backgroundColor: section.color || '#005a9e' }} 
      />
    )}

    <div className="flex-1 truncate pointer-events-none flex items-center">
      {isEditing ? (
        <input
          ref={renameInputRef}
          autoFocus
          defaultValue={section.title}
          onBlur={(e) => onRename(section.id, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onRename(section.id, e.currentTarget.value); }}
          className="w-full bg-white px-1 outline-none ring-1 ring-purple-500 rounded text-xs pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="text-xs truncate">{section.title}</span>
      )}
    </div>
    <button 
      onClick={onOpenMenu}
      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-300 rounded transition-opacity pointer-events-auto"
    >
      <MoreVertical className="h-3 w-3 text-gray-400" />
    </button>
  </div>
);

export default Sidebar;