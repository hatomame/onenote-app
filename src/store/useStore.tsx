
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppState, Notebook, Section, NotePage, SectionGroup, SidebarItem, SearchMatch } from '../types';
import { INITIAL_DATA } from '../constants';

const STORAGE_KEY = 'onenote_clone_persistence_v1';

interface StoreContextType {
  state: AppState;
  setActiveNotebook: (id: string) => void;
  setActiveSection: (id: string) => void;
  setActivePage: (id: string) => void;
  updatePage: (pageId: string, updates: Partial<NotePage>) => void;
  deletePage: (pageId: string) => void;
  toggleSubpage: (pageId: string) => void;
  addPage: (sectionId: string) => void;
  reorderPages: (sectionId: string, pageIds: string[]) => void;
  addSection: (notebookId: string) => void;
  renameSection: (sectionId: string, newTitle: string) => void;
  deleteSection: (sectionId: string) => void;
  reorderSidebarItems: (notebookId: string, items: SidebarItem[]) => void;
  moveSectionToGroup: (sectionId: string, groupId: string | undefined) => void;
  addSectionGroup: (notebookId: string, initialSectionId?: string) => void;
  renameSectionGroup: (groupId: string, newTitle: string) => void;
  toggleSectionGroup: (groupId: string) => void;
  removeSectionGroup: (groupId: string) => void;
  addCopyArea: (pageId: string) => void;
  updateCopyArea: (pageId: string, index: number, content: string) => void;
  deleteCopyArea: (pageId: string, index: number) => void;
  showToast: (message: string) => void;
  setSaved: () => void;
  performSearch: (term: string) => void;
  goToNextResult: () => void;
  clearSearch: () => void;
  jumpToResult: (index: number) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

/**
 * HTMLタグを除去してプレーンテキストにするヘルパー（プロジェクト共通）
 */
export const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 以前のデータ構造（specialContent）からの移行
        parsed.notebooks.forEach((nb: any) => {
          nb.sections.forEach((sec: any) => {
            sec.pages.forEach((page: any) => {
              if (page.specialContent !== undefined && !page.copyAreas) {
                page.copyAreas = [page.specialContent];
                delete page.specialContent;
              }
              if (!page.copyAreas || page.copyAreas.length === 0) {
                page.copyAreas = [""]; // 常に1つは持たせる
              }
            });
          });
        });
        return { 
          ...parsed, 
          toastMessage: null,
          searchTerm: '',
          searchResults: [],
          currentSearchResultIndex: -1,
          isDirty: false 
        };
      } catch (e) {
        console.error("LocalStorage parsing failed", e);
      }
    }
    
    return {
      notebooks: INITIAL_DATA.map(nb => ({ 
        ...nb, 
        sectionGroups: [],
        sidebarOrder: nb.sections.map(s => ({ id: s.id, type: 'section' })),
        sections: nb.sections.map(s => ({
          ...s,
          pages: s.pages.map(p => ({
            ...p,
            copyAreas: p.copyAreas && p.copyAreas.length > 0 ? p.copyAreas : [""]
          }))
        }))
      })),
      activeNotebookId: 'nb1',
      activeSectionId: 'sec1',
      activePageId: 'page1',
      toastMessage: null,
      isDirty: false,
      searchTerm: '',
      searchResults: [],
      currentSearchResultIndex: -1
    };
  });

  useEffect(() => {
    if (state.isDirty) {
      const dataToPersist = {
        notebooks: state.notebooks,
        activeNotebookId: state.activeNotebookId,
        activeSectionId: state.activeSectionId,
        activePageId: state.activePageId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToPersist));
      setState(prev => ({ ...prev, isDirty: false }));
    }
  }, [state.notebooks, state.activeNotebookId, state.activeSectionId, state.activePageId, state.isDirty]);

  const setActiveNotebook = (id: string) => setState(prev => ({ ...prev, activeNotebookId: id }));
  const setActiveSection = (id: string) => setState(prev => ({ ...prev, activeSectionId: id }));
  const setActivePage = (id: string) => setState(prev => ({ ...prev, activePageId: id }));

  const updatePage = useCallback((pageId: string, updates: Partial<NotePage>) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.map(page => 
            page.id === pageId ? { ...page, ...updates, lastModified: Date.now() } : page
          )
        }))
      }))
    }));
  }, []);

  const addCopyArea = (pageId: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.map(page => 
            page.id === pageId ? { ...page, copyAreas: [...page.copyAreas, ""], lastModified: Date.now() } : page
          )
        }))
      }))
    }));
  };

  const updateCopyArea = (pageId: string, index: number, content: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.map(page => {
            if (page.id !== pageId) return page;
            const newAreas = [...page.copyAreas];
            newAreas[index] = content;
            return { ...page, copyAreas: newAreas, lastModified: Date.now() };
          })
        }))
      }))
    }));
  };

  const deleteCopyArea = (pageId: string, index: number) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.map(page => {
            if (page.id !== pageId) return page;
            const newAreas = page.copyAreas.filter((_, i) => i !== index);
            return { ...page, copyAreas: newAreas, lastModified: Date.now() };
          })
        }))
      }))
    }));
  };

  const setSaved = () => setState(prev => ({ ...prev, isDirty: false }));

  const deletePage = (pageId: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.filter(p => p.id !== pageId)
        }))
      })),
      activePageId: prev.activePageId === pageId ? null : prev.activePageId
    }));
  };

  const toggleSubpage = (pageId: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => ({
          ...sec,
          pages: sec.pages.map(p => p.id === pageId ? { ...p, isSubpage: !p.isSubpage } : p)
        }))
      }))
    }));
  };

  const addPage = (sectionId: string) => {
    const newPage: NotePage = {
      id: `page_${Date.now()}`,
      title: '', // 仕様変更：「空のタイトル」で初期化
      content: '',
      copyAreas: [""], // 仕様変更：最初から1つコピー領域を作成
      lastModified: Date.now(),
      isSubpage: false,
    };

    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => 
          sec.id === sectionId ? { ...sec, pages: [...sec.pages, newPage] } : sec
        )
      })),
      activePageId: newPage.id
    }));
  };

  const reorderPages = (sectionId: string, pageIds: string[]) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => {
          if (sec.id !== sectionId) return sec;
          const sorted = [...sec.pages].sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id));
          return { ...sec, pages: sorted };
        })
      }))
    }));
  };

  const addSection = (notebookId: string) => {
    const newSection: Section = {
      id: `sec_${Date.now()}`,
      title: '新しいセクション',
      color: '#3b82f6',
      pages: []
    };
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => 
        nb.id === notebookId ? { 
          ...nb, 
          sections: [...nb.sections, newSection],
          sidebarOrder: [...nb.sidebarOrder, { id: newSection.id, type: 'section' }]
        } : nb
      ),
      activeSectionId: newSection.id
    }));
  };

  const renameSection = (sectionId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.map(sec => sec.id === sectionId ? { ...sec, title: newTitle } : sec)
      }))
    }));
  };

  const renameSectionGroup = (groupId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sectionGroups: nb.sectionGroups.map(g => g.id === groupId ? { ...g, title: newTitle } : g)
      }))
    }));
  };

  const deleteSection = (sectionId: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sections: nb.sections.filter(s => s.id !== sectionId),
        sidebarOrder: nb.sidebarOrder.filter(item => item.id !== sectionId)
      })),
      activeSectionId: prev.activeSectionId === sectionId ? null : prev.activeSectionId
    }));
  };

  const reorderSidebarItems = (notebookId: string, items: SidebarItem[]) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => 
        nb.id === notebookId ? { ...nb, sidebarOrder: items } : nb
      )
    }));
  };

  const moveSectionToGroup = (sectionId: string, groupId: string | undefined) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => {
        const updatedSections = nb.sections.map(s => s.id === sectionId ? { ...s, groupId } : s);
        let updatedSidebarOrder = [...nb.sidebarOrder];
        if (groupId) {
          updatedSidebarOrder = updatedSidebarOrder.filter(item => item.id !== sectionId);
        } else {
          if (!updatedSidebarOrder.some(item => item.id === sectionId)) {
            updatedSidebarOrder.push({ id: sectionId, type: 'section' });
          }
        }
        return {
          ...nb,
          sections: updatedSections,
          sidebarOrder: updatedSidebarOrder
        };
      })
    }));
  };

  const addSectionGroup = (notebookId: string, initialSectionId?: string) => {
    const newGroup: SectionGroup = {
      id: `group_${Date.now()}`,
      title: 'セクション グループ',
      isCollapsed: false,
    };
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => {
        if (nb.id !== notebookId) return nb;
        const updatedSections = nb.sections.map(s => 
          s.id === initialSectionId ? { ...s, groupId: newGroup.id } : s
        );
        const newOrder = nb.sidebarOrder.filter(item => item.id !== initialSectionId);
        newOrder.push({ id: newGroup.id, type: 'group' });
        return {
          ...nb,
          sectionGroups: [...nb.sectionGroups, newGroup],
          sections: updatedSections,
          sidebarOrder: newOrder
        };
      })
    }));
  };

  const toggleSectionGroup = (groupId: string) => {
    setState(prev => ({
      ...prev,
      notebooks: prev.notebooks.map(nb => ({
        ...nb,
        sectionGroups: nb.sectionGroups.map(g => 
          g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g
        )
      }))
    }));
  };

  const removeSectionGroup = (groupId: string) => {
    setState(prev => ({
      ...prev,
      isDirty: true,
      notebooks: prev.notebooks.map(nb => {
        const memberSections = nb.sections.filter(s => s.groupId === groupId);
        const updatedSections = nb.sections.map(s => 
          s.groupId === groupId ? { ...s, groupId: undefined } : s
        );
        const updatedGroups = nb.sectionGroups.filter(g => g.id !== groupId);
        const updatedSidebarOrder: SidebarItem[] = [];
        nb.sidebarOrder.forEach(item => {
          if (item.id === groupId && item.type === 'group') {
            memberSections.forEach(s => {
              updatedSidebarOrder.push({ id: s.id, type: 'section' });
            });
          } else {
            updatedSidebarOrder.push(item);
          }
        });
        return {
          ...nb,
          sections: updatedSections,
          sectionGroups: updatedGroups,
          sidebarOrder: updatedSidebarOrder
        };
      })
    }));
  };

  const showToast = (message: string) => {
    setState(prev => ({ ...prev, toastMessage: message }));
    setTimeout(() => {
      setState(prev => ({ ...prev, toastMessage: null }));
    }, 2000);
  };

  const performSearch = (term: string) => {
    if (!term.trim()) {
      clearSearch();
      return;
    }

    const matches: SearchMatch[] = [];
    state.notebooks.forEach(nb => {
      nb.sections.forEach(sec => {
        sec.pages.forEach(page => {
          // タイトル
          let startIndex = page.title.toLowerCase().indexOf(term.toLowerCase());
          if (startIndex !== -1) {
            matches.push({
              id: `${page.id}-title-${startIndex}`,
              sectionId: sec.id,
              pageId: page.id,
              fieldName: 'title',
              start: startIndex,
              preview: page.title.substring(Math.max(0, startIndex - 20), Math.min(page.title.length, startIndex + term.length + 20))
            });
          }
          // 本文
          const contentText = stripHtml(page.content);
          startIndex = 0;
          while ((startIndex = contentText.toLowerCase().indexOf(term.toLowerCase(), startIndex)) !== -1) {
            matches.push({
              id: `${page.id}-content-${startIndex}`,
              sectionId: sec.id,
              pageId: page.id,
              fieldName: 'content',
              start: startIndex,
              preview: contentText.substring(Math.max(0, startIndex - 20), Math.min(contentText.length, startIndex + term.length + 20))
            });
            startIndex += term.length;
          }
          // コピー領域
          page.copyAreas.forEach((area, areaIdx) => {
            const areaText = stripHtml(area);
            startIndex = 0;
            while ((startIndex = areaText.toLowerCase().indexOf(term.toLowerCase(), startIndex)) !== -1) {
              matches.push({
                id: `${page.id}-copyArea-${areaIdx}-${startIndex}`,
                sectionId: sec.id,
                pageId: page.id,
                fieldName: 'copyArea',
                copyAreaIndex: areaIdx,
                start: startIndex,
                preview: areaText.substring(Math.max(0, startIndex - 20), Math.min(areaText.length, startIndex + term.length + 20))
              });
              startIndex += term.length;
            }
          });
        });
      });
    });

    setState(prev => ({
      ...prev,
      searchTerm: term,
      searchResults: matches,
      currentSearchResultIndex: matches.length > 0 ? 0 : -1
    }));

    if (matches.length > 0) {
      jumpToResult(0);
    } else {
      showToast('見つかりませんでした');
    }
  };

  const goToNextResult = () => {
    if (state.searchResults.length === 0) return;
    const nextIndex = (state.currentSearchResultIndex + 1) % state.searchResults.length;
    jumpToResult(nextIndex);
  };

  const jumpToResult = (index: number) => {
    const match = state.searchResults[index];
    if (!match) return;
    setState(prev => ({
      ...prev,
      activeSectionId: match.sectionId,
      activePageId: match.pageId,
      currentSearchResultIndex: index
    }));
  };

  const clearSearch = () => {
    setState(prev => ({
      ...prev,
      searchTerm: '',
      searchResults: [],
      currentSearchResultIndex: -1
    }));
  };

  return (
    <StoreContext.Provider value={{
      state,
      setActiveNotebook,
      setActiveSection,
      setActivePage,
      updatePage,
      deletePage,
      toggleSubpage,
      addPage,
      reorderPages,
      addSection,
      renameSection,
      deleteSection,
      reorderSidebarItems,
      moveSectionToGroup,
      addSectionGroup,
      renameSectionGroup,
      toggleSectionGroup,
      removeSectionGroup,
      addCopyArea,
      updateCopyArea,
      deleteCopyArea,
      showToast,
      setSaved,
      performSearch,
      goToNextResult,
      clearSearch,
      jumpToResult
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
};
