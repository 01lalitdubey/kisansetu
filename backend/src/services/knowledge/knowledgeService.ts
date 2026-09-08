import { prisma } from '../../config/database';

/**
 * ---------------------------------------------------------------------------
 *  KNOWLEDGE SERVICE (RAG — retrieval half)
 *  Static, verified knowledge (procedures, MSP notifications, government
 *  orders) — deliberately separate from live application data (queue,
 *  tokens, payments), which lives in agentTools.ts instead. See Part 13's
 *  distinction: "static knowledge" vs "live application data".
 *
 *  This is a lightweight keyword search (Postgres ILIKE), not vector/semantic
 *  search — good enough for a small, curated document set. Swapping in
 *  pgvector + embeddings later only touches this file.
 * ---------------------------------------------------------------------------
 */

export interface KnowledgeSearchInput {
  query: string;
  language?: string;
  season?: string;
  crop?: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  /** A short, relevant excerpt — never the whole document — to keep prompts small. */
  excerpt: string;
  source: string;
  sourceUrl: string | null;
  documentType: string;
  authority: string;
  season: string | null;
  documentDate: string | null;
  lastVerifiedAt: string | null;
}

const EXCERPT_RADIUS = 220;

/** Build a short excerpt around the first keyword match, falling back to the start of the document. */
function buildExcerpt(content: string, query: string): string {
  const needle = query.trim().split(/\s+/)[0]?.toLowerCase();
  const idx = needle ? content.toLowerCase().indexOf(needle) : -1;
  if (idx === -1) return content.slice(0, EXCERPT_RADIUS * 2).trim() + (content.length > EXCERPT_RADIUS * 2 ? '…' : '');
  const start = Math.max(0, idx - EXCERPT_RADIUS);
  const end = Math.min(content.length, idx + EXCERPT_RADIUS);
  return (start > 0 ? '…' : '') + content.slice(start, end).trim() + (end < content.length ? '…' : '');
}

/**
 * Search the verified knowledge base. Returns a handful of relevant
 * documents with short excerpts and full source citation — never the whole
 * knowledge base, and never without a source.
 */
export async function searchKnowledgeBase(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult[]> {
  const query = input.query.trim();
  if (!query) return [];

  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
    .slice(0, 6);
  if (terms.length === 0) return [];

  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      AND: [
        {
          OR: terms.map((term) => ({
            OR: [
              { title: { contains: term, mode: 'insensitive' as const } },
              { content: { contains: term, mode: 'insensitive' as const } },
            ],
          })),
        },
        input.season ? { OR: [{ season: input.season }, { season: null }] } : {},
        input.crop ? { OR: [{ crop: { equals: input.crop, mode: 'insensitive' as const } }, { crop: null }] } : {},
        input.language ? { OR: [{ language: input.language }, { language: 'en' }] } : {},
      ],
    },
    take: input.limit ?? 4,
    orderBy: { lastVerifiedAt: 'desc' },
  });

  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    excerpt: buildExcerpt(d.content, query),
    source: d.source,
    sourceUrl: d.sourceUrl,
    documentType: d.documentType,
    authority: d.authority,
    season: d.season,
    documentDate: d.documentDate?.toISOString().slice(0, 10) ?? null,
    lastVerifiedAt: d.lastVerifiedAt?.toISOString().slice(0, 10) ?? null,
  }));
}

/** Documents specifically about procurement rules/procedures (a narrower, common case of searchKnowledgeBase). */
export async function getProcurementRules(input: { topic?: string; crop?: string; season?: string }): Promise<KnowledgeSearchResult[]> {
  return searchKnowledgeBase({
    query: input.topic?.trim() || 'procurement process rules eligibility documents',
    crop: input.crop,
    season: input.season,
    limit: 4,
  });
}
