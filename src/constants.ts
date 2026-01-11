import type { AppState, Notebook } from './types';

export const ONENOTE_PURPLE = '#7719aa';

const DEFAULT_NOTEBOOK_ID = 'default-notebook';
const DEFAULT_SECTION_ID = 'default-section';
const DEFAULT_PAGE_ID = 'default-page';

const defaultNotebook: Notebook = {
  id: DEFAULT_NOTEBOOK_ID,
  title: 'マイ ノートブック',
  sidebarOrder: [{ id: DEFAULT_SECTION_ID, type: 'section' }], // ★修正: ノートブック内に移動
  sectionGroups: [],
  sections: [
    {
      id: DEFAULT_SECTION_ID,
      title: 'クイック ノート',
      color: ONENOTE_PURPLE,
      pages: [
        {
          id: DEFAULT_PAGE_ID,
          title: '無題のページ',
          content: '<p>ここにメモを入力...</p>',
          copyAreas: [],
          lastModified: Date.now(),
        },
      ],
    },
  ],
};

export const INITIAL_DATA: AppState = {
  notebooks: [defaultNotebook],
  activeNotebookId: DEFAULT_NOTEBOOK_ID,
  activeSectionId: DEFAULT_SECTION_ID,
  activePageId: DEFAULT_PAGE_ID,
  toastMessage: null,
  isDirty: false,
  searchTerm: '',
  searchResults: [],
  currentSearchResultIndex: -1,
};

export const DEFAULT_GROUPS = [];
export const DEFAULT_SECTIONS = defaultNotebook.sections;
export const DEFAULT_PAGES = defaultNotebook.sections[0].pages;