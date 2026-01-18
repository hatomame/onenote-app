
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState, NotePage, Section, SectionGroup, SidebarItem, SearchMatch, CopyBlock } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'onenote_clone_persistence_v3';

export const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface StoreState {
  state: AppState & { isMobileNavOpen: boolean };
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
  reorderPages: (sectionId: string, draggedPageId: string, targetPageId: string, position: 'before' | 'after') => void;
  reorderSidebarItems: (items: SidebarItem[]) => void;
  moveSectionToGroup: (sectionId: string, groupId: string | undefined, targetIndex?: number) => void;
  addSectionGroup: (notebookId: string) => void;
  renameSectionGroup: (groupId: string, newTitle: string) => void;
  toggleSectionGroup: (groupId: string) => void;
  removeSectionGroup: (groupId: string) => void;
  performSearch: (term: string) => void;
  goToNextResult: () => void;
  clearSearch: () => void;
  jumpToResult: (result: SearchMatch) => void; 
  addCopyArea: (content: string) => void;
  updateCopyArea: (pageId: string, id: string, updates: Partial<CopyBlock>) => void;
  deleteCopyArea: (pageId: string, id: string) => void;
  reorderCopyAreas: (pageId: string, draggedId: string, targetId: string, position: 'before' | 'after') => void;
  movePageToSection: (pageId: string, sectionId: string) => void;
  showToast: (message: string) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      state: { ...INITIAL_DATA, isMobileNavOpen: false },

      setActiveNotebook: (id) => set((s) => ({ state: { ...s.state, activeNotebookId: id } })),
      setActiveSection: (id) => set((s) => {
        const targetSection = s.state.notebooks.flatMap(nb => nb.sections).find(sec => sec.id === id);
        return { 
          state: { 
            ...s.state, 
            activeSectionId: id, 
            activePageId: targetSection?.pages[0]?.id || null 
          } 
        };
      }),
      setActivePage: (id) => set((s) => ({ state: { ...s.state, activePageId: id, isMobileNavOpen: false } })),

      setMobileNavOpen: (open) => set(s => ({ state: { ...s.state, isMobileNavOpen: open } })),

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
            isDirty: true,
            activeSectionId: newSection.id,
            activePageId: null,
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
          copyAreas: [{ id: crypto.randomUUID(), title: 'コピー領域', content: '' }],
          lastModified: Date.now(),
        };

        return { 
          state: { 
            ...s.state, 
            isDirty: true,
            activePageId: newPage.id,
            isMobileNavOpen: false,
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
          isDirty: true,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => sec.id === id ? { ...sec, title } : sec)
          }))
        }
      })),

      deleteSection: (id) => set((s) => {
        const { notebooks, activeSectionId, activePageId } = s.state;
        const nextNotebooks = notebooks.map(nb => ({
          ...nb,
          sections: nb.sections.filter(sec => sec.id !== id),
          sidebarOrder: nb.sidebarOrder.filter(item => item.id !== id)
        }));

        let nextActiveSectionId = activeSectionId;
        let nextActivePageId = activePageId;

        if (activeSectionId === id) {
          const allRemainingSections = nextNotebooks.flatMap(nb => nb.sections);
          const firstAvailable = allRemainingSections[0] || null;
          nextActiveSectionId = firstAvailable ? firstAvailable.id : null;
          nextActivePageId = firstAvailable ? (firstAvailable.pages[0]?.id || null) : null;
        }

        return {
          state: {
            ...s.state,
            notebooks: nextNotebooks,
            activeSectionId: nextActiveSectionId,
            activePageId: nextActivePageId,
            isDirty: true
          }
        };
      }),

      deletePage: (id) => set((s) => {
        const { notebooks, activePageId } = s.state;
        let pageSection: Section | undefined;
        notebooks.forEach(nb => nb.sections.forEach(sec => {
          if (sec.pages.some(p => p.id === id)) pageSection = sec;
        }));

        if (!pageSection) return {};

        const nextNotebooks = notebooks.map(nb => ({
          ...nb,
          sections: nb.sections.map(sec => ({
            ...sec,
            pages: sec.pages.filter(p => p.id !== id)
          }))
        }));

        let nextActivePageId = activePageId;
        if (activePageId === id) {
          const remainingPages = pageSection.pages.filter(p => p.id !== id);
          nextActivePageId = remainingPages[0]?.id || null;
        }

        return {
          state: {
            ...s.state,
            notebooks: nextNotebooks,
            activePageId: nextActivePageId,
            isDirty: true
          }
        };
      }),

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
          isDirty: true,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => p.id === id ? { ...p, isSubpage: !p.isSubpage } : p)
            }))
          }))
        }
      })),

      reorderPages: (sectionId, draggedPageId, targetPageId, position) => set(s => ({
        state: {
            ...s.state,
            isDirty: true,
            notebooks: s.state.notebooks.map(nb => ({
                ...nb,
                sections: nb.sections.map(sec => {
                    if (sec.id !== sectionId) return sec;
                    
                    const oldPages = [...sec.pages];
                    const draggedIdx = oldPages.findIndex(p => p.id === draggedPageId);
                    if (draggedIdx === -1) return sec;

                    // ドラッグされたページとその直後のサブページ一式を特定
                    const draggedBlock = [oldPages[draggedIdx]];
                    let i = draggedIdx + 1;
                    while (i < oldPages.length && oldPages[i].isSubpage) {
                      draggedBlock.push(oldPages[i]);
                      i++;
                    }

                    // 元の場所からブロックを削除
                    const remainingPages = oldPages.filter(p => !draggedBlock.some(db => db.id === p.id));
                    
                    // 挿入位置を特定
                    let targetIdx = remainingPages.findIndex(p => p.id === targetPageId);
                    if (targetIdx === -1) return { ...sec, pages: [...remainingPages, ...draggedBlock] };

                    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
                    remainingPages.splice(insertIdx, 0, ...draggedBlock);

                    return { ...sec, pages: remainingPages };
                })
            }))
        }
      })),

      reorderSidebarItems: (items) => set(s => {
        const activeNbId = s.state.activeNotebookId || s.state.notebooks[0]?.id;
        return {
          state: { 
            ...s.state, 
            isDirty: true,
            notebooks: s.state.notebooks.map(nb => 
               nb.id === activeNbId 
                 ? { ...nb, sidebarOrder: items } 
                 : nb
            )
          } 
        };
      }),

      moveSectionToGroup: (sid, gid, targetIndex) => set(s => {
        const activeNbId = s.state.activeNotebookId || s.state.notebooks[0]?.id;
        const currentNb = s.state.notebooks.find(n => n.id === activeNbId);
        if (!currentNb) return {};

        const nextNotebooks = s.state.notebooks.map(nb => {
          if (nb.id !== activeNbId) return nb;

          const updatedSections = nb.sections.map(sec => sec.id === sid ? { ...sec, groupId: gid } : sec);
          let nextSidebarOrder = [...nb.sidebarOrder];
          const existsInSidebar = nextSidebarOrder.some(item => item.id === sid);

          if (gid) {
            nextSidebarOrder = nextSidebarOrder.filter(item => item.id !== sid);
          } else {
            if (!existsInSidebar) {
              const newItem = { id: sid, type: 'section' as const };
              if (typeof targetIndex === 'number') {
                nextSidebarOrder.splice(targetIndex, 0, newItem);
              } else {
                nextSidebarOrder.push(newItem);
              }
            } else if (typeof targetIndex === 'number') {
              nextSidebarOrder = nextSidebarOrder.filter(item => item.id !== sid);
              nextSidebarOrder.splice(targetIndex, 0, { id: sid, type: 'section' });
            }
          }

          return { ...nb, sections: updatedSections, sidebarOrder: nextSidebarOrder };
        });

        return { state: { ...s.state, isDirty: true, notebooks: nextNotebooks } };
      }),

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
                isDirty: true,
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
            isDirty: true,
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
            isDirty: true,
            notebooks: s.state.notebooks.map(nb => {
              const releasedSections = nb.sections.filter(sec => sec.groupId === gid);
              const releasedSidebarItems = releasedSections.map(s => ({ id: s.id, type: 'section' as const }));
              const groupIndex = nb.sidebarOrder.findIndex(item => item.id === gid);
              let nextSidebarOrder = nb.sidebarOrder.filter(item => item.id !== gid);
              if (groupIndex !== -1) {
                nextSidebarOrder.splice(groupIndex, 0, ...releasedSidebarItems);
              } else {
                nextSidebarOrder = [...nextSidebarOrder, ...releasedSidebarItems];
              }

              return {
                ...nb,
                sectionGroups: nb.sectionGroups.filter(g => g.id !== gid),
                sections: nb.sections.map(sec => sec.groupId === gid ? { ...sec, groupId: undefined } : sec),
                sidebarOrder: nextSidebarOrder
              };
            }),
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
          isMobileNavOpen: false
        }
      })),

      addCopyArea: (content) => set((s) => {
        const activePageId = s.state.activePageId;
        if (!activePageId) return {};

        return {
          state: {
            ...s.state,
            isDirty: true,
            notebooks: s.state.notebooks.map(nb => ({
              ...nb,
              sections: nb.sections.map(sec => ({
                ...sec,
                pages: sec.pages.map(p => {
                  if (p.id === activePageId) {
                    return {
                      ...p,
                      copyAreas: [...(p.copyAreas || []), { id: crypto.randomUUID(), title: 'コピー領域', content }]
                    };
                  }
                  return p;
                })
              }))
            }))
          }
        };
      }),

      updateCopyArea: (pageId, id, updates) => set((s) => ({
        state: {
          ...s.state,
          isDirty: true,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => {
                if (p.id === pageId) {
                  return {
                    ...p,
                    copyAreas: (p.copyAreas || []).map(area => 
                      area.id === id ? { ...area, ...updates } : area
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
          isDirty: true,
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

      reorderCopyAreas: (pageId, draggedId, targetId, position) => set((s) => ({
        state: {
          ...s.state,
          isDirty: true,
          notebooks: s.state.notebooks.map(nb => ({
            ...nb,
            sections: nb.sections.map(sec => ({
              ...sec,
              pages: sec.pages.map(p => {
                if (p.id !== pageId) return p;
                
                const oldAreas = [...(p.copyAreas || [])];
                const draggedIdx = oldAreas.findIndex(a => a.id === draggedId);
                if (draggedIdx === -1) return p;

                const [draggedItem] = oldAreas.splice(draggedIdx, 1);
                let targetIdx = oldAreas.findIndex(a => a.id === targetId);
                const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
                oldAreas.splice(insertIdx, 0, draggedItem);

                return { ...p, copyAreas: oldAreas };
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

        if (!pageToMove) return {};

        return {
            state: {
                ...s.state,
                isDirty: true,
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
