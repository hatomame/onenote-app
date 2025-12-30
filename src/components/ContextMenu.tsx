
import React, { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 shadow-xl rounded-md py-1 min-w-[160px] animate-in fade-in zoom-in duration-75"
      style={{ top: y, left: x }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
