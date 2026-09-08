# Rajasthan RMS 2026-27 Wheat Procurement — Official Source

Retrieved and verified during the beta-readiness pass. This is the actual
official document — not a summary, not a blog post.

## Source metadata

- **title**: गेहूं खरीद क्रय केन्द्रों की सूची / RMS 2026-27 Wheat Procurement Centre List (amendment order)
- **source**: Rajasthan Food & Civil Supplies Department (खाद्य एवं नागरिक आपूर्ति विभाग)
- **sourceUrl**: https://mspproc.rajasthan.gov.in/PDF/CenterList2026-27.pdf
- **portalUrl**: https://mspproc.rajasthan.gov.in/ (RAJFED-managed MSP procurement portal)
- **documentDate**: order dated 25/03/2026 (RajKaj Ref No. 21304359, digitally signed by Deputy Commissioner Manveer Prasad Vyas)
- **season**: RMS 2026-27 (Rabi Marketing Season)
- **crop**: Wheat
- **authority**: Government of Rajasthan
- **documentType**: PDF, 17 pages, table-based (scanned/rendered — not machine-text; extracted here as page images)
- **lastVerifiedAt**: retrieved and reviewed in this session (2026-09)

## What the document actually contains

A statewide table of **470 total wheat purchase centres** across all **7
administrative divisions**: Ajmer, Bharatpur, Jaipur (division), Kota,
Udaipur, Bikaner, Jodhpur. Each row gives District → Tehsil → Centre/village
name → procuring agency (FCI / RAJFED / Tilam Sangh / NAFED / NCCF / RSFCSC)
→ tentative procurement target (MT) → centre type (Mandi / Focal Point).

Page 17 carries the official grand total: **470 centres**, agency-wise
breakdown (FCI 174, RAJFED 133, Tilam Sangh 69, NAFED 64, NCCF 14, RSFCSC 16
— totalling 2,100,000 MT tentative target).

## ⚠️ Critical finding: "Jaipur" is not a district in this list

**"Jaipur" does not appear as a district anywhere in this document.** The
division named "Jaipur Division" in this table is composed of five *other*
districts: **Alwar, Dausa, Dhaulpur, Kotputli-Behror, Khairthal-Tijara**
(see `page-05-jaipur-division.png`). Jaipur district itself is not listed
under any division in this wheat-procurement document.

This means KisanSetu's current demo centre names — Amer, Sanganer, Chomu,
Bagru, "Jaipur Grain Center" — have **no corresponding official record** in
the current RMS 2026-27 wheat MSP procurement scheme. They should continue
to be labelled as prototype/demo data (`dataSource = "DEMO"`), not presented
as official Jaipur procurement centres, until this is resolved with the
Department directly (toll-free 14435) or the product's real-data scope is
adjusted to the districts that are actually listed.

## Files in this folder

- `CenterList2026-27-official.pdf` — the exact file downloaded from the URL above.
- `page-05-jaipur-division.png` — rendered page 5, the full "Jaipur Division" table (Kotputli-Behror / Alwar / Khairthal-Tijara / Dausa / Dhaulpur rows).
- `page-17-summary-totals.png` — rendered page 17, the statewide grand-total and agency-wise summary.

## Why the centre-level rows were not transcribed into the database

The source is a dense, scanned table (not machine-readable text — see
`npm run ingest:rajasthan-procurement --help` for the extraction note). Hand
-transcribing ~470 rows from page images risks silent transcription errors
(a wrong tehsil, a transposed digit in a target) being stored as if they
were verified government fact — which would violate the project's own "never
invent / never mis-state official data" rule just as surely as fabricating
centres outright. The safe, correct next step is either (a) OCR tooling with
a human spot-check pass, or (b) requesting a machine-readable export from
the Department, before any centre-level rows from this document are upserted
with `dataSource = "RAJASTHAN_OFFICIAL"`.

The few facts that ARE safe to treat as verified without row-level OCR (the
season, the MSP, the total centre count, the division/district structure)
have been seeded into the `KnowledgeDocument` table by
`backend/prisma/seedKnowledge.ts` with this exact source citation.
