
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-10 right-10 z-[1000] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm rounded-xl p-4 shadow-2xl border backdrop-blur-md transform transition-all animate-slide-in-up flex items-start gap-3 ${
              toast.type === 'success' ? 'bg-green-900/80 border-green-700 text-green-100' :
              toast.type === 'error' ? 'bg-red-900/80 border-red-700 text-red-100' :
              toast.type === 'warning' ? 'bg-yellow-900/80 border-yellow-700 text-yellow-100' :
              'bg-slate-800/80 border-slate-600 text-blue-100'
            }`}
          >
            <div className={`mt-0.5 text-lg`}>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '🚨'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </div>
            <div className="flex-grow text-sm font-medium">{toast.message}</div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
