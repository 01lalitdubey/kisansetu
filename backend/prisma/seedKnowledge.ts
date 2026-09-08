/**
 * Seeds the RAG knowledge base with VERIFIED facts only.
 *
 * Every document here traces to a real, checked source (see
 * backend/prisma/knowledge-sources/rajasthan-rms-2026-27/README.md for the
 * full provenance of the RMS 2026-27 entries). Nothing here is invented —
 * where the official centre-level list could not be safely read (a scanned
 * PDF, not machine text), that is stated explicitly in the document itself
 * rather than filled in with a guess.
 *
 * Run: npm run seed:knowledge
 */
import { prisma } from '../src/config/database';

const RMS_SOURCE = 'Rajasthan Food & Civil Supplies Department';
const RMS_SOURCE_URL = 'https://mspproc.rajasthan.gov.in/PDF/CenterList2026-27.pdf';
const RMS_AUTHORITY = 'Government of Rajasthan';
const RMS_SEASON = '2026-27';
const VERIFIED_AT = new Date('2026-09-09');

async function main() {
  const documents = [
    {
      title: 'RMS 2026-27 Wheat MSP',
      documentType: 'MSP_NOTIFICATION',
      crop: 'Wheat',
      content:
        'For the Rabi Marketing Season (RMS) 2026-27, the Minimum Support Price (MSP) for wheat in Rajasthan is ₹2,585 per quintal. ' +
        'Online farmer registration for wheat procurement begins 1 February 2026. Procurement at MSP runs from 10 March 2026 to 30 June 2026. ' +
        'Farmers register and check their assigned procurement centre through the official MSP Procurement portal (mspproc.rajasthan.gov.in) or the Food Department helpline (14435).',
      source: RMS_SOURCE,
      sourceUrl: 'https://food.rajasthan.gov.in/',
    },
    {
      title: 'RMS 2026-27 statewide procurement centre network',
      documentType: 'GOVERNMENT_ORDER',
      crop: 'Wheat',
      content:
        'The official RMS 2026-27 wheat procurement centre list (Rajasthan Food & Civil Supplies Department, order dated 25/03/2026) designates 470 purchase centres ' +
        'across all 7 administrative divisions of Rajasthan: Ajmer, Bharatpur, Jaipur, Kota, Udaipur, Bikaner and Jodhpur. Centres are operated by six procuring agencies: ' +
        'FCI (174 centres), RAJFED (133), Tilam Sangh (69), NAFED (64), RSFCSC (16) and NCCF (14), with a combined tentative procurement target of 21,00,000 MT. ' +
        'IMPORTANT: "Jaipur Division" in this official list is composed of the districts Alwar, Dausa, Dhaulpur, Kotputli-Behror and Khairthal-Tijara — ' +
        'Jaipur district itself does not appear as a district in the RMS 2026-27 wheat procurement centre list. Any centre named after a Jaipur-city locality ' +
        '(e.g. Amer, Sanganer, Chomu, Bagru) shown elsewhere in this application is prototype/demo data, not an official RMS 2026-27 wheat procurement record, ' +
        'unless a centre record explicitly says otherwise (see its dataSource field).',
      source: RMS_SOURCE,
      sourceUrl: RMS_SOURCE_URL,
    },
    {
      title: 'General wheat procurement process at MSP (India)',
      documentType: 'PROCEDURE',
      crop: 'Wheat',
      content:
        'MSP procurement generally follows: (1) farmer registration (often online, with land records / Girdawari and bank account details), ' +
        '(2) a slot or token for a specific procurement centre and date, (3) bringing produce to the centre for quality checks (moisture content, foreign matter), ' +
        '(4) weighment, (5) payment credited to the farmer\'s registered bank account, typically within a government-notified number of days after procurement. ' +
        'Exact document requirements and timelines are set by the state Food Department for each season — farmers should confirm current requirements at ' +
        'registration rather than relying on a previous season\'s rules.',
      source: 'General MSP procurement procedure (state Food Department practice)',
      sourceUrl: null,
    },
  ] as const;

  let created = 0;
  for (const doc of documents) {
    const existing = await prisma.knowledgeDocument.findFirst({ where: { title: doc.title } });
    if (existing) {
      await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: { ...doc, authority: RMS_AUTHORITY, season: RMS_SEASON, lastVerifiedAt: VERIFIED_AT },
      });
    } else {
      await prisma.knowledgeDocument.create({
        data: { ...doc, authority: RMS_AUTHORITY, season: RMS_SEASON, lastVerifiedAt: VERIFIED_AT },
      });
      created++;
    }
  }

  console.log(`✅ Knowledge base seeded: ${created} new document(s), ${documents.length - created} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
