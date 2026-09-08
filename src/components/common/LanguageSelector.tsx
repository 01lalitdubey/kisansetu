import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { LANGUAGES, useT } from '../../i18n';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-kisan-200 bg-white px-3 py-2 text-sm font-semibold text-kisan-800 hover:bg-kisan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-kisan-500"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 text-kisan-600" />
        {compact ? current.short : current.label}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-kisan-100 bg-white py-1 shadow-lift"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === language}
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-kisan-800 hover:bg-kisan-50"
              >
                {l.label}
                {l.code === language && <Check className="h-4 w-4 text-kisan-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
