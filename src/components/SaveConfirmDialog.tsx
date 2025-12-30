
import React from 'react';

interface SaveConfirmDialogProps {
  fileName: string;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({ fileName, onSave, onDontSave, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-2xl w-[400px] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">メモ帳</h2>
          <p className="text-gray-700 text-sm leading-relaxed">
            {fileName} への変更内容を保存しますか？
          </p>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onSave}
            className="px-6 py-2 bg-[#0067b8] text-white rounded font-medium hover:bg-[#005da6] transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[100px]"
          >
            保存
          </button>
          <button
            onClick={onDontSave}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition-colors min-w-[100px]"
          >
            保存しない
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-100 transition-colors min-w-[100px]"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveConfirmDialog;
