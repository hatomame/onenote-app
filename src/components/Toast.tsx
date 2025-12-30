
import React from 'react';
import { useStore } from '../store/useStore';

const Toast: React.FC = () => {
  const { state } = useStore();

  if (!state.toastMessage) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 border border-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold">{state.toastMessage}</span>
      </div>
    </div>
  );
};

export default Toast;
