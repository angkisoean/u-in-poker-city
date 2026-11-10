import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'pending';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txHash?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => string;
  dismissToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Omit<ToastMessage, 'id'>>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<ToastMessage, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          return updated;
        }
        return t;
      })
    );
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const duration = toast.duration ?? (toast.type === 'pending' ? 0 : 4500);

      const newToast: ToastMessage = {
        ...toast,
        id,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, updateToast }}>
      {children}

      {/* Floating Toast Notification Dock */}
      <aside aria-label="Notifications" className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            const isSuccess = toast.type === 'success';
            const isWarning = toast.type === 'warning';
            const isPending = toast.type === 'pending';

            const borderClass = isError
              ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : isSuccess
              ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : isWarning
              ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : isPending
              ? 'border-orange-500/50 shadow-[0_0_20px_rgba(255,107,0,0.25)]'
              : 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.25)]';

            const icon = isError ? '⚠️' : isSuccess ? '✅' : isWarning ? '⚡' : isPending ? '⏳' : 'ℹ️';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto w-full p-3.5 rounded-2xl bg-[#14171D]/95 backdrop-blur-xl border ${borderClass} flex items-start gap-3 text-zinc-100 shadow-2xl select-none`}
              >
                <div className="text-lg shrink-0 mt-0.5">
                  {isPending ? (
                    <span className="inline-block animate-spin">🌀</span>
                  ) : (
                    <span>{icon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-display font-bold text-xs tracking-wide text-zinc-100 truncate">
                      {toast.title}
                    </h4>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  </div>

                  {toast.message && (
                    <p className="mt-1 text-xs font-sans text-zinc-300 leading-snug break-words">
                      {toast.message}
                    </p>
                  )}

                  {toast.txHash && (
                    <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>Tx:</span>
                      <span className="text-orange-400 truncate max-w-[190px]">
                        {toast.txHash.slice(0, 10)}...{toast.txHash.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
