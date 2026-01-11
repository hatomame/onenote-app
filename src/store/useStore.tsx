import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, NotePage, Section, SectionGroup, SidebarItem, SearchMatch, CopyBlock } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'onenote_clone_persistence_v1';

export const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface StoreState {
  state: AppState;
  
  setActiveNotebook: (id: string) => void;
  setActiveSection: (id: string) => void;
  setActivePage: (id: string) => void;
  
  addSection: (notebookId: string | null) => void;
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
  jumpToResult: (result: SearchMatch) => void; 
  
  addCopyArea: (content: string) => void;
  updateCopyArea: (pageId: string, id: string, content: string) => void;
  deleteCopyArea: (pageId: string, id: string) => void;
  movePageToSection: (pageId: string, sectionId: string) => void;

  showToast: (message: string) => void;
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
          color: '#8b5cf6',
        };
        const targetNotebookId = notebookId || s.state.activeNotebookId || s.state.notebooks[0]?.id;
        
        return { 
          state: { 
            ...s.state, 
            activeSectionId: newSection.id,
            notebooks: s.state.notebooks.map(nb => {
              if (nb.id === targetNotebookId) {
                 return { 
                   ...nb, 
                   sections: [...nb.sections, newSection],
                   sidebarOrder: [...nb.sidebarOrder, { id: newSection.id, type: 'section' }]
                 };
              }
              return nb;
            })
          } 
        };
      }),

      addPage: (sectionId) => set((s) => {
        const newPage: NotePage = {
          id: crypto.randomUUID(),
          title: '無題のページ',
          content: '',
          copyAreas: [],
          lastModified: Date.now(),
        };

        return { 
          state: { 
            ...s.state, 
            activePageId: newPage.id,
            notebooks: s.state.notebooks.map(nb => ({
              ...nb,
              sections: nb.sections.map(sec => 
                sec.id === sectionId 
                  ? { ...sec, pages: [...sec.pages, newPage] }
                  : sec
              )
            }))
          } 
        };
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
            sections: nb.sections.filter(sec => sec.id !== id),
            sidebarOrder: nb.sidebarOrder.filter(item => item.id !== id)
          })),
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
                    const pageMap = new Map(sec.pages.map(p => [p.id, p]));
                    const newPages = pageIds.map(id => pageMap.get(id)).filter((p): p is NotePage => !!p);
                    const remainingPages = sec.pages.filter(p => !pageIds.includes(p.id));
                    return { ...sec, pages: [...newPages, ...remainingPages] };
                })
            }))
        }
      })),

      reorderSidebarItems: (items) => set(s => {
        const activeNbId = s.state.activeNotebookId || s.state.notebooks[0]?.id;
        return {
          state: { 
            ...s.state, 
            notebooks: s.state.notebooks.map(nb => 
               nb.id === activeNbId 
                 ? { ...nb, sidebarOrder: items } 
                 : nb
            )
          } 
        };
      }),

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
        const targetNotebookId = notebookId || s.state.activeNotebookId || s.state.notebooks[0]?.id;
        return {
            state: {
                ...s.state,
                notebooks: s.state.notebooks.map(nb => {
                    if (nb.id === targetNotebookId) {
                        return { 
                          ...nb, 
                          sectionGroups: [...nb.sectionGroups, newGroup],
                          sidebarOrder: [...nb.sidebarOrder, { id: newGroup.id, type: 'group' }]
                        };
                    }
                    return nb;
                })
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
                sections: nb.sections.map(sec => sec.groupId === gid ? { ...sec, groupId: undefined } : sec),
                sidebarOrder: nb.sidebarOrder.filter(item => item.id !== gid)
            })),
        }
      })),

      performSearch: (term) => set(s => ({ state: { ...s.state, searchTerm: term } })),
      goToNextResult: () => {},
      clearSearch: () => set(s => ({ state: { ...s.state, searchTerm: '', searchResults: [] } })),

      jumpToResult: (result) => set(s => ({
        state: {
          ...s.state,
          activeSectionId: result.sectionId,
          activePageId: result.pageId,
        }
      })),

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

      updateCopyArea: (pageId, id, content) => set((s) => ({
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
                    copyAreas: (p.copyAreas || []).map(area => 
                      area.id === id ? { ...area, content } : area
                    )
                  };
                }
                return p;
              })
            }))
          }))
        }
      })),

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
        let pageToMove: NotePage | undefined;
        s.state.notebooks.forEach(nb => {
            nb.sections.forEach(sec => {
                const found = sec.pages.find(p => p.id === pageId);
                if (found) pageToMove = found;
            });
        });

        if (!pageToMove) return s;

        return {
            state: {
                ...s.state,
                activeSectionId: targetSectionId,
                activePageId: pageId,
                notebooks: s.state.notebooks.map(nb => ({
                    ...nb,
                    sections: nb.sections.map(sec => {
                        if (sec.pages.some(p => p.id === pageId)) {
                            return { ...sec, pages: sec.pages.filter(p => p.id !== pageId) };
                        }
                        if (sec.id === targetSectionId) {
                            return { ...sec, pages: [...sec.pages, pageToMove!] };
                        }
                        return sec;
                    })
                }))
            }
        };
      }),

      showToast: (message) => {
        set(s => ({ state: { ...s.state, toastMessage: message } }));
        setTimeout(() => {
          set(s => ({ state: { ...s.state, toastMessage: null } }));
        }, 3000);
      },

    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);