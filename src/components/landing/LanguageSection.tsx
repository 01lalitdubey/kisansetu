import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { LANGUAGES, useT } from '../../i18n';
import { useReducedMotion, useReveal } from './hooks';

const SLIDES = [
  { code: 'en' as const, prompt: 'What’s your language?', label: 'English' },
  { code: 'hi' as const, prompt: 'आपकी भाषा क्या है?', label: 'हिन्दी' },
  { code: 'hinglish' as const, prompt: 'Apni language choose karo.', label: 'Hinglish' },
];

/** Cross-fade typography cycle, wired to the app's real language system. */
export function LanguageSection() {
  const reduced = useReducedMotion();
  const { t, language, setLanguage } = useT();
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.3 });
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!shown || reduced) return;
    const id = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 2600);
    return () => clearInterval(id);
  }, [shown, reduced]);

  const slide = SLIDES[reduced ? 0 : i];

  return (
    <section ref={ref} id="language" className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.language.kicker')}</p>
            <h2 className="lp-h2 mt-4 max-w-[16ch] text-[var(--lp-ink)]">{t('landing.language.title')}</h2>

            <div className="mt-10 min-h-[140px]">
              <div key={slide.code} className="lp-lang-word">
                <p className="text-2xl font-semibold text-[var(--lp-ink)]/55 sm:text-3xl">{slide.prompt}</p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight text-[var(--lp-ink)] sm:text-6xl">
                  {slide.label}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors"
                  style={{
                    borderColor: language === l.code ? 'var(--lp-green-500)' : 'var(--lp-line)',
                    background: language === l.code ? 'var(--lp-green-500)' : 'white',
                    color: language === l.code ? 'white' : 'var(--lp-ink)',
                  }}
                >
                  {l.label}
                  {language === l.code && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-[var(--lp-ink)]/50">{t('landing.language.note')}</p>
          </div>

          <div className={`lp-reveal lp-card p-6 ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '120ms' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--lp-ink)]/45">
              {t('landing.language.previewLabel')}
            </p>
            <div className="mt-4 space-y-1">
              <p className="text-2xl font-extrabold text-[var(--lp-ink)]">{t('landing.language.previewText')}</p>
              <p className="text-sm font-medium text-[var(--lp-ink)]/55">
                &ldquo;Your procurement process is ready.&rdquo;
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--lp-paper)] px-4 py-3 text-sm font-semibold text-[var(--lp-ink)]/70">
              {t('landing.language.switchNote')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
