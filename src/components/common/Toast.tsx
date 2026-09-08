import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const setToast = useAppStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-8">
      <div
        role="status"
        className="flex max-w-md items-center gap-3 rounded-xl bg-kisan-800 px-4 py-3 text-sm font-semibold text-white shadow-lift"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-kisan-300" />
        <span className="flex-1">{toast}</span>
        <button aria-label="Dismiss" onClick={() => setToast(null)}>
          <X className="h-4 w-4 text-white/70 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
