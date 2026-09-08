/**
 * Landing-page imagery — centralised so every photo can be swapped for a
 * local /src/assets/landing/*.webp file later without touching components.
 * Each entry is a real, licensed Unsplash photograph (not an illustration).
 *
 * To replace with a local asset: drop the file in this folder, `import`
 * it, and swap the URL string below for the imported reference — every
 * section that uses that key updates automatically.
 */

function unsplash(id: string, params = 'auto=format&fit=crop&q=75'): string {
  return `https://images.unsplash.com/photo-${id}?${params}`;
}

export const LANDING_IMAGES = {
  /** Hero — Indian farmer standing in a golden wheat field. */
  heroFarmer: unsplash('1628492058844-589eb5dc6a35', 'auto=format&fit=crop&q=80&w=1200'),
  /** Farmer with cattle + tractor working a paddy field (roles / problem sections). */
  farmerField: unsplash('1574943320219-553eb213f72d', 'auto=format&fit=crop&q=75&w=1000'),
  /** Close-up golden wheat ears — hero backdrop / texture accents. */
  wheatCloseup: unsplash('1499529112087-3cb3b73cec95', 'auto=format&fit=crop&q=75&w=1600'),
  /** Wide wheat field — section backdrops. */
  wheatField: unsplash('1595012255680-0a044900356a', 'auto=format&fit=crop&q=70&w=1200'),
  /** Aerial view of a tractor working a field. */
  aerialTractor: unsplash('1470114716159-e389f8712fda', 'auto=format&fit=crop&q=75&w=1200'),
  /** Combine harvesters working a wheat field, wide shot. */
  combinesWide: unsplash('1635174815612-fd9636f70146', 'auto=format&fit=crop&q=75&w=1200'),
  /** Grain sacks stacked in a warehouse — procurement-centre storage. */
  grainWarehouse: unsplash('1774946103680-3d34a461a581', 'auto=format&fit=crop&q=75&w=1200'),
  /** Sacks of grain in storage, warm light — problem-section texture. */
  grainSacks: unsplash('1764070254247-351def349875', 'auto=format&fit=crop&q=75&w=900'),
  /** Tractor-trolley loaded with grain sacks on a rural Indian road. */
  tractorTrolley: unsplash('1769018932876-2fb70ddaeeb7', 'auto=format&fit=crop&q=75&w=900'),
  /** Decorated Indian truck on a highway — transport section. */
  transportTruck: unsplash('1681004478577-cb7f8421f78c', 'auto=format&fit=crop&q=80&w=1200'),
  /** Green field at golden hour — final CTA backdrop. */
  fieldSunset: unsplash('1495107334309-fcf20504a5ab', 'auto=format&fit=crop&q=75&w=1600'),
} as const;

export type LandingImageKey = keyof typeof LANDING_IMAGES;
