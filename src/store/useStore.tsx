import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, NotePage, Section, SectionGroup, SidebarItem, SearchMatch, CopyBlock } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'onenote_clone_persistence_v1';

/**
 * HTMLタグを除去してプレーンテキストにするヘルパー
 */
export const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface StoreState {
  state: AppState;
  
  // Actions
  setActiveNotebook: (id: string) => void;
  setActiveSection: (id: string) => void;
  setActivePage: (id: string) => void;
  
  addSection: (notebookId: string | null) => void; // null許容に修正
  addPage: (sectionId: string) => void;
  renameSection: (sectionId: string, newTitle: string) => void;
  deleteSection: (sectionId: string) => void;
  deletePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<NotePage>) => void;
  
  toggleSubpage: (pageId: string) => void;
  reorderPages: (sectionId: string, pageIds: string[]) => void;
  reorderSidebarItems: (items: SidebarItem[]) => void;
  
  moveSectionToGroup: (sectionId: string, groupId: string | undefined) => void;
  addSectionGroup: (notebookId: string) => void;
  renameSectionGroup: (groupId: string, newTitle: string) => void;
  toggleSectionGroup: (groupId: string) => void;
  removeSectionGroup: (groupId: string) => void;
  
  performSearch: (term: string) => void;
  goToNextResult: () => void;
  clearSearch: () => void;
  
  addCopyArea: (content: string) => void;
  deleteCopyArea: (pageId: string, id: string) => void;
  movePageToSection: (pageId: string, sectionId: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      state: INITIAL_DATA,

      setActiveNotebook: (id) => set((s) => ({ state: { ...s.state, activeNotebookId: id } })),
      setActiveSection: (id) => set((s) => ({ state: { ...s.state, activeSectionId: id } })),
      setActivePage: (id) => set((s) => ({ state: { ...s.state, activePageId: id } })),

      addSection: (notebookId) => set((s) => {
        const newSection: Section = {
          id: crypto.randomUUID(),
          title: '新しいセクション',
          pages: [],
          color: '#8b5cf6', // default purple
        };
        // notebookIdがnullの場合はactiveNotebookを使うなどのロジックが必要だが、
        // 今回は簡易的にstate.notebooks[0]に追加するか、引数を必須とする
        const targetNotebookId = notebookId || s.state.activeNotebookId || s.state.notebooks[0].id;
        
        const updatedNotebooks = s.state.notebooks.map(nb => {
          if (nb.id === targetNotebookId) {
             return { ...nb, sections: [...nb.sections, newSection] };
          }
          return nb;
        });

        // サイドバーの順序も更新
        const newSidebarOrder: SidebarItem[] = [
            ...s.state.sidebarOrder, 
            { id: newSection.id, type: 'section' }
        ];

        return { state: { ...s.state, notebooks: updatedNotebooks, sidebarOrder: newSidebarOrder, activeSectionId: newSection.id } };
      }),

      addPage: (sectionId) => set((s) => {
        const newPage: NotePage = {
          id: crypto.randomUUID(),
          title: '無題のページ',
          content: '',
          copyAreas: [],
          lastModified: Date.now(),
        };

        const updatedNotebooks = s.state.notebooks.map(nb => ({
          ...nb,
          sections: nb.sections.map(sec => 
            sec.id === sectionId 
              ? { ...sec, pages: [...sec.pages, newPage] }
              : sec
          )
        }));

        return { state: { ...s.state, notebooks: updatedNotebooks, activePageId: newPage.id } };
      }),

      renameSection: (id, title) => set(s => ({
        state: {
          ...s.state,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => sec.id === id ? { ...sec, title } : sec)
          }))
        }
      })),

      deleteSection: (id) => set(s => ({
        state: {
          ...s.state,
          activeSectionId: s.state.activeSectionId === id ? null : s.state.activeSectionId,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.filter(sec => sec.id !== id)
          })),
          sidebarOrder: s.state.sidebarOrder.filter(item => item.id !== id)
        }
      })),

      deletePage: (id) => set(s => ({
        state: {
          ...s.state,
          activePageId: s.state.activePageId === id ? null : s.state.activePageId,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.filter(p => p.id !== id)
            }))
          }))
        }
      })),

      updatePage: (id, updates) => set(s => ({
        state: {
          ...s.state,
          isDirty: true,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => p.id === id ? { ...p, ...updates, lastModified: Date.now() } : p)
            }))
          }))
        }
      })),

      toggleSubpage: (id) => set(s => ({
        state: {
          ...s.state,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => p.id === id ? { ...p, isSubpage: !p.isSubpage } : p)
            }))
          }))
        }
      })),

      reorderPages: (sectionId, pageIds) => set(s => ({
        state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sections: nb.sections.map(sec => {
                    if (sec.id !== sectionId) return sec;
                    // pageIdsの順序に従ってpagesを並び替える
                    const pageMap = new Map(sec.pages.map(p => [p.id, p]));
                    const newPages = pageIds.map(id => pageMap.get(id)).filter((p): p is NotePage => !!p);
                    // 万が一IDが見つからないページがあれば末尾に追加
                    const remainingPages = sec.pages.filter(p => !pageIds.includes(p.id));
                    return { ...sec, pages: [...newPages, ...remainingPages] };
                })
            }))
        }
      })),

      reorderSidebarItems: (items) => set(s => ({ state: { ...s.state, sidebarOrder: items } })),

      moveSectionToGroup: (sid, gid) => set(s => ({
        state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sections: nb.sections.map(sec => sec.id === sid ? { ...sec, groupId: gid } : sec)
            }))
        }
      })),

      addSectionGroup: (notebookId) => set(s => {
        const newGroup: SectionGroup = {
            id: crypto.randomUUID(),
            title: '新しいグループ',
            isCollapsed: false
        };
        // notebookIdに対応する処理（今回は省略、state直下に追加と仮定）
        return {
            state: {
                ...s.state,
                notebooks: s.state.notebooks.map(nb => {
                    if (nb.id === notebookId) {
                        return { ...nb, sectionGroups: [...nb.sectionGroups, newGroup] };
                    }
                    return nb;
                }),
                sidebarOrder: [...s.state.sidebarOrder, { id: newGroup.id, type: 'group' }]
            }
        };
      }),

      renameSectionGroup: (gid, title) => set(s => ({
        state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sectionGroups: nb.sectionGroups.map(g => g.id === gid ? { ...g, title } : g)
            }))
        }
      })),

      toggleSectionGroup: (gid) => set(s => ({
        state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sectionGroups: nb.sectionGroups.map(g => g.id === gid ? { ...g, isCollapsed: !g.isCollapsed } : g)
            }))
        }
      })),

      removeSectionGroup: (gid) => set(s => ({
        state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sectionGroups: nb.sectionGroups.filter(g => g.id !== gid),
                // グループ内のセクションをルートに戻す
                sections: nb.sections.map(sec => sec.groupId === gid ? { ...sec, groupId: undefined } : sec)
            })),
            sidebarOrder: s.state.sidebarOrder.filter(item => item.id !== gid)
        }
      })),

      performSearch: (term) => set(s => ({ state: { ...s.state, searchTerm: term } })), // 簡易実装
      goToNextResult: () => {}, // 簡易実装
      clearSearch: () => set(s => ({ state: { ...s.state, searchTerm: '', searchResults: [] } })),

      // ★★★ 今回の新機能実装 ★★★

      addCopyArea: (content) => set((s) => {
        const activePageId = s.state.activePageId;
        if (!activePageId) return s;

        return {
          state: {
            ...s.state,
            notebooks: s.state.notebooks.map(nb => ({
              ...nb,
              sections: nb.sections.map(sec => ({
                ...sec,
                pages: sec.pages.map(p => {
                  if (p.id === activePageId) {
                    return {
                      ...p,
                      copyAreas: [...(p.copyAreas || []), { id: crypto.randomUUID(), content }]
                    };
                  }
                  return p;
                })
              }))
            }))
          }
        };
      }),

      deleteCopyArea: (pageId, id) => set((s) => ({
        state: {
          ...s.state,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => {
                if (p.id === pageId) {
                  return {
                    ...p,
                    copyAreas: (p.copyAreas || []).filter(area => area.id !== id)
                  };
                }
                return p;
              })
            }))
          }))
        }
      })),

      movePageToSection: (pageId, targetSectionId) => set((s) => {
        // 1. 移動するページを見つけてクローンを作成
        let pageToMove: NotePage | undefined;
        
        // 全セクションからページを探す
        s.state.notebooks.forEach(nb => {
            nb.sections.forEach(sec => {
                const found = sec.pages.find(p => p.id === pageId);
                if (found) pageToMove = found;
            });
        });

        if (!pageToMove) return s; // ページが見つからなければ何もしない

        return {
            state: {
                ...s.state,
                activeSectionId: targetSectionId, // 移動先にフォーカス
                activePageId: pageId,
                notebooks: s.state.notebooks.map(nb => ({
                    ...nb,
                    sections: nb.sections.map(sec => {
                        // 移動元セクションから削除
                        if (sec.pages.some(p => p.id === pageId)) {
                            return { ...sec, pages: sec.pages.filter(p => p.id !== pageId) };
                        }
                        // 移動先セクションに追加
                        if (sec.id === targetSectionId) {
                            return { ...sec, pages: [...sec.pages, pageToMove!] };
                        }
                        return sec;
                    })
                }))
            }
        };
      }),

    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);