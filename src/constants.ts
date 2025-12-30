
export const ONENOTE_PURPLE = '#773191';
export const SECTION_COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const INITIAL_DATA = [
  {
    id: 'nb1',
    title: 'マイ ノートブック',
    sections: [
      {
        id: 'sec1',
        title: 'クイック ノート',
        color: '#8b5cf6',
        pages: [
          {
            id: 'page1',
            title: '最初のページ',
            content: 'ここに通常のメモを入力します。OneNoteのように自由な位置に書き込める感覚を再現します。',
            copyAreas: ['ここはコピー領域です。右上のアイコンをクリックすることで、この領域の内容をクリップボードに一括コピーできます。'],
            lastModified: Date.now(),
          }
        ]
      }
    ]
  }
];