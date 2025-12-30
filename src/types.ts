
export interface NotePage {
  id: string;
  title: string;
  content: string;
  copyAreas: string[]; // 複数のコピー領域をサポート
  lastModified: number;
  isSubpage?: boolean;
}

export interface SectionGroup {
  id: string;
  title: string;
  isCollapsed?: boolean;
}

export interface Section {
  id: string;
  title: string;
  color: string;
  pages: NotePage[];
  groupId?: string;
}

export interface SidebarItem {
  id: string;
  type: 'section' | 'group';
}

export interface Notebook {
  id: string;
  title: string;
  sections: Section[];
  sectionGroups: SectionGroup[];
  sidebarOrder: SidebarItem[];
}

export interface SearchMatch {
  id: string;
  sectionId: string;
  pageId: string;
  fieldName: 'title' | 'content' | 'copyArea';
  copyAreaIndex?: number;
  start: number;
  preview: string;
}

export interface AppState {
  notebooks: Notebook[];
  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;
  toastMessage: string | null;
  isDirty: boolean;
  searchTerm: string;
  searchResults: SearchMatch[];
  currentSearchResultIndex: number;
}
