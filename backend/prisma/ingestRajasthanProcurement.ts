/**
 * Runnable entry point for centre ingestion (Part 7).
 *
 *   npm run ingest:rajasthan-procurement -- path/to/centres.json
 *
 * The JSON file must be an array of IngestCentreRecord objects (see
 * backend/src/services/knowledge/centreIngestion.ts for the shape). If no
 * path is given, this reads `prisma/data/rajasthan-procurement-centres.json`.
 *
 * That file ships EMPTY on purpose: the official RMS 2026-27 centre list
 * (backend/prisma/knowledge-sources/rajasthan-rms-2026-27/) is a scanned
 * document, not machine-readable text, so its ~470 rows were not
 * hand-transcribed here — doing that without OCR + a human verification
 * pass would risk silently storing wrong data as if it were official, which
 * is worse than not having it. Populate the JSON file (via OCR tooling, a
 * department data export, or manual transcription with a second reviewer)
 * and re-run this script when you have a verified list.
 */
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/config/database';
import { ingestProcurementCentres, type IngestCentreRecord } from '../src/services/knowledge/centreIngestion';

async function main() {
  const inputPath = process.argv[2] ?? path.join(__dirname, 'data', 'rajasthan-procurement-centres.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    console.error('   Create it (an array of centre records) or pass a path as an argument.');
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as IngestCentreRecord[];
  if (!Array.isArray(raw)) {
    console.error('❌ Input file must be a JSON array of centre records.');
    process.exitCode = 1;
    return;
  }

  if (raw.length === 0) {
    console.log('ℹ️  Input file is empty — nothing to ingest yet.');
    console.log('   See backend/prisma/knowledge-sources/rajasthan-rms-2026-27/README.md for why,');
    console.log('   and what a verified centre list needs to contain before it is safe to load.');
    return;
  }

  console.log(`Ingesting ${raw.length} centre record(s) from ${inputPath}...`);
  const report = await ingestProcurementCentres(raw);

  console.log(`\n✅ Inserted: ${report.inserted}`);
  console.log(`♻️  Updated:  ${report.updated}`);
  console.log(`⏸️  Unchanged: ${report.unchanged}`);
  if (report.rejected.length) {
    console.log(`\n⚠️  Rejected ${report.rejected.length} record(s):`);
    for (const r of report.rejected) console.log(`   - ${r.record.name ?? '(unnamed)'}: ${r.reason}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
