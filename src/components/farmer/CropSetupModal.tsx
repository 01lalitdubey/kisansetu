import { useEffect, useState } from 'react';
import { Sprout } from 'lucide-react';
import type { CropType } from '../../types';
import { useAppStore } from '../../store/appStore';
import { centerApi } from '../../services/api';

const CROPS: CropType[] = ['Wheat', 'Rice', 'Maize', 'Mustard', 'Soybean', 'Cotton', 'Other'];

/**
 * First-time setup — "What are you selling today?" — shown once after sign-in
 * when the farmer profile has no crop / quantity. Editable later from Profile.
 */
export function CropSetupModal() {
  const needsCropSetup = useAppStore((s) => s.needsCropSetup);
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const updateFarmerCrop = useAppStore((s) => s.updateFarmerCrop);
  const setNeeds = useAppStore.setState;

  const [crop, setCrop] = useState<CropType>('Wheat');
  const [qty, setQty] = useState('25');
  const [saving, setSaving] = useState(false);
  const [cropIds, setCropIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!needsCropSetup || !backendEnabled) return;
    // resolve crop name -> backend cuid via any centre's schedule list is overkill;
    // use a dedicated lightweight call if available, else fall back to name only.
    (async () => {
      try {
        const schedules = (await centerApi.allSchedules()) as { crop: string; cropId: string }[];
        const map: Record<string, string> = {};
        for (const s of schedules) map[s.crop] = s.cropId;
        setCropIds(map);
      } catch {
        /* names only */
      }
    })();
  }, [needsCropSetup, backendEnabled]);

  if (!needsCropSetup) return null;

  async function save() {
    setSaving(true);
    try {
      await updateFarmerCrop(cropIds[crop] ?? '', crop, Number(qty) || 25);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-lift sm:rounded-2xl">
        <div className="flex items-center gap-2 text-kisan-700">
          <Sprout className="h-5 w-5" />
          <h2 className="text-lg font-extrabold text-kisan-900">What are you selling today?</h2>
        </div>
        <p className="mt-1 text-sm text-kisan-600">You can change this anytime from your Profile.</p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              className={`rounded-xl border px-3 py-3 text-base font-semibold transition-colors ${
                crop === c
                  ? 'border-kisan-500 bg-kisan-50 text-kisan-800'
                  : 'border-kisan-200 text-kisan-800 hover:bg-kisan-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <label className="field-label mt-4">Quantity</label>
        <div className="flex items-center gap-3">
          <input
            className="field-input"
            value={qty}
            inputMode="numeric"
            onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Quintals"
          />
          <span className="text-base font-semibold text-kisan-700">Quintals</span>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            className="btn-secondary"
            onClick={() => setNeeds({ needsCropSetup: false })}
            disabled={saving}
          >
            Later
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving || !qty}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
