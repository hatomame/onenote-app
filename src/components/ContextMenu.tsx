import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // メニューの外側をクリックしたら閉じる
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // createPortal を使い、親要素のCSS(transform等)の影響を受けない body 直下に描画する
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] rounded-md border border-gray-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in duration-100"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()} // メニュー内クリックの伝播を防止
      onContextMenu={(e) => e.preventDefault()} // メニュー上での右クリックを無効化
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`flex w-full items-center px-4 py-2.5 text-left text-sm hover:bg-gray-100 transition-colors ${
            item.danger ? 'text-red-600 font-medium' : 'text-gray-700'
          }`}
        >
          {item.icon && <span className="mr-2 opacity-70">{item.icon}</span>}
          <span className="flex-1">{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
};

export default ContextMenu;