import { prisma } from '../../config/database';

/**
 * ---------------------------------------------------------------------------
 *  CENTRE INGESTION
 *  Upserts procurement-centre records from a verified official source into
 *  PostgreSQL, WITHOUT requiring anyone to hand-edit TypeScript whenever a
 *  centre list changes. See backend/prisma/ingestRajasthanProcurement.ts for
 *  the runnable entry point (`npm run ingest:rajasthan-procurement`).
 *
 *  This never deletes existing centres — a season/source mismatch is
 *  reported, not silently dropped, so a human decides what to do with it.
 * ---------------------------------------------------------------------------
 */

export interface IngestCentreRecord {
  name: string;
  district: string;
  tehsil?: string;
  city?: string;
  addressLine?: string;
  state?: string;
  pincode?: string;
  /** Required — if the official source has no coordinates, geocode first and set geocoded: true. */
  latitude: number;
  longitude: number;
  /** true if latitude/longitude came from a geocoding step, not the official source itself (Part 6). */
  geocoded?: boolean;
  capacity?: number;
  activeCounters?: number;
  supportedCrops?: string[];
  contactNumber?: string;
  contactEmail?: string;
  operatingHours?: string;
  code?: string;
  season: string;
  source: string;
  sourceUrl?: string;
  governmentReference?: string;
}

export interface IngestReport {
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: { record: Partial<IngestCentreRecord>; reason: string }[];
}

function validate(record: IngestCentreRecord): string | null {
  if (!record.name?.trim()) return 'missing name';
  if (!record.district?.trim()) return 'missing district';
  if (!record.season?.trim()) return 'missing season';
  if (!record.source?.trim()) return 'missing source';
  if (typeof record.latitude !== 'number' || typeof record.longitude !== 'number') {
    return 'missing latitude/longitude — geocode first, never invent coordinates';
  }
  if (record.latitude < 23 || record.latitude > 31 || record.longitude < 69 || record.longitude > 79) {
    return `coordinates look outside Rajasthan (${record.latitude}, ${record.longitude}) — check for a transcription error`;
  }
  return null;
}

/**
 * Upsert a batch of verified centre records. Matches existing centres by
 * NAME (the same uniqueness rule the rest of the schema already uses).
 * Never deletes anything; never overwrites a centre's LIVE operational
 * fields (currentQueue, status, activeCounters) — those belong to the
 * centre's own officer, not to a static data sync.
 */
export async function ingestProcurementCentres(records: IngestCentreRecord[]): Promise<IngestReport> {
  const report: IngestReport = { inserted: 0, updated: 0, unchanged: 0, rejected: [] };
  const seenNames = new Set<string>();

  for (const record of records) {
    const problem = validate(record);
    if (problem) {
      report.rejected.push({ record: { name: record.name, district: record.district }, reason: problem });
      continue;
    }
    if (seenNames.has(record.name.toLowerCase())) {
      report.rejected.push({ record: { name: record.name }, reason: 'duplicate name within this batch' });
      continue;
    }
    seenNames.add(record.name.toLowerCase());

    const existing = await prisma.procurementCenter.findUnique({ where: { name: record.name } });
    const staticFields = {
      district: record.district,
      city: record.city ?? record.tehsil ?? record.district,
      addressLine: record.addressLine ?? null,
      state: record.state ?? 'Rajasthan',
      pincode: record.pincode ?? null,
      supportedCrops: record.supportedCrops ?? [],
      contactNumber: record.contactNumber ?? null,
      contactEmail: record.contactEmail ?? null,
      operatingHours: record.operatingHours ?? null,
      code: record.code ?? null,
      season: record.season,
      dataSource: 'RAJASTHAN_OFFICIAL' as const,
      governmentReference: record.governmentReference ?? null,
      lastVerifiedAt: new Date(),
    };

    if (!existing) {
      await prisma.procurementCenter.create({
        data: {
          name: record.name,
          location: [record.addressLine, record.city ?? record.tehsil, record.district].filter(Boolean).join(', '),
          latitude: record.latitude,
          longitude: record.longitude,
          capacity: record.capacity ?? 100,
          activeCounters: record.activeCounters ?? 2,
          approvalStatus: 'APPROVED',
          isSeed: false,
          mapX: 50,
          mapY: 50,
          ...staticFields,
        },
      });
      report.inserted++;
      continue;
    }

    const changed =
      existing.district !== staticFields.district ||
      existing.latitude !== record.latitude ||
      existing.longitude !== record.longitude ||
      existing.dataSource !== 'RAJASTHAN_OFFICIAL' ||
      existing.season !== record.season;

    if (!changed) {
      report.unchanged++;
      continue;
    }

    await prisma.procurementCenter.update({
      where: { id: existing.id },
      data: { latitude: record.latitude, longitude: record.longitude, ...staticFields },
    });
    report.updated++;
  }

  return report;
}
