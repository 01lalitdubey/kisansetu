import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { Language } from '../../types';
import { LANGUAGES, useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';

// Phase 4: onboarding collects ONLY basic info. Crop + quantity are asked
// AFTER sign-in (first-time setup card on the dashboard).
const TOTAL_STEPS = 3;

export default function Onboarding() {
  const { t, language, setLanguage } = useT();
  const navigate = useNavigate();
  const saveOnboardingDraft = useAppStore((s) => s.saveOnboardingDraft);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canProceedStep3 = name.trim().length > 1 && mobile.trim().length >= 10;

  async function finish() {
    saveOnboardingDraft({
      name: name.trim(),
      mobile: mobile.trim(),
      village: village.trim(),
      district: 'Jaipur',
      language,
      registeredOn: new Date().toISOString().slice(0, 10),
    });
    await completeOnboarding();
    // Next: SIGN IN / CREATE ACCOUNT
    navigate('/farmer/auth', { replace: true });
  }

  return (
    <div className="bg-field flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-4 flex items-center justify-between text-sm font-semibold text-white/80">
          <span>
            {t('onboarding.step')} {step} {t('onboarding.of')} {TOTAL_STEPS}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-6 rounded-full ${i < step ? 'bg-kisan-400' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>

        <div className="card p-7">
          {/* STEP 1 — welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-kisan-500 text-3xl">
                🌾
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-kisan-900">{t('common.appName')}</h1>
              <p className="mt-3 text-lg font-semibold leading-snug text-kisan-700">
                {t('onboarding.heroLine1')}
                <br />
                {t('onboarding.heroLine2')}
                <br />
                {t('onboarding.heroLine3')}
              </p>
              <button className="btn-primary mt-7 w-full" onClick={next}>
                {t('common.getStarted')} <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* STEP 2 — language */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-extrabold text-kisan-900">
                {t('onboarding.chooseLanguage')}
              </h2>
              <p className="mt-1 text-sm text-kisan-600">{t('onboarding.languageHint')}</p>
              <div className="mt-5 space-y-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code as Language)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-base font-semibold transition-colors ${
                      language === l.code
                        ? 'border-kisan-500 bg-kisan-50 text-kisan-800'
                        : 'border-kisan-200 text-kisan-800 hover:bg-kisan-50'
                    }`}
                  >
                    {l.label}
                    {language === l.code && <Check className="h-5 w-5 text-kisan-600" />}
                  </button>
                ))}
              </div>
              <StepNav onBack={back} onNext={next} t={t} />
            </div>
          )}

          {/* STEP 3 — basic details, then SIGN IN / CREATE ACCOUNT */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-extrabold text-kisan-900">{t('onboarding.yourDetails')}</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="field-label">{t('onboarding.name')}</label>
                  <input
                    className="field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('onboarding.namePlaceholder')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">{t('onboarding.mobile')}</label>
                  <input
                    className="field-input"
                    value={mobile}
                    inputMode="numeric"
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d ]/g, ''))}
                    placeholder={t('onboarding.mobilePlaceholder')}
                  />
                </div>
                <div>
                  <label className="field-label">{t('onboarding.village')}</label>
                  <input
                    className="field-input"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder={t('onboarding.villagePlaceholder')}
                  />
                </div>
              </div>
              <div className="mt-7 flex gap-3">
                <button className="btn-secondary" onClick={back}>
                  <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={finish}
                  disabled={!canProceedStep3}
                >
                  Continue to sign in <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-kisan-500">
                Next you'll create an account or sign in. Crop &amp; quantity come after.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  disabled,
  t,
}: {
  onBack: () => void;
  onNext: () => void;
  disabled?: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="mt-7 flex gap-3">
      <button className="btn-secondary" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> {t('common.back')}
      </button>
      <button className="btn-primary flex-1" onClick={onNext} disabled={disabled}>
        {t('common.next')} <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );
}
