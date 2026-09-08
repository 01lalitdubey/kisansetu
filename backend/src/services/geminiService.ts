import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { env, isProd } from '../config/env';
import { TOOL_DECLARATIONS, TOOL_IMPLEMENTATIONS, type ToolContext } from './agentTools';

/**
 * ---------------------------------------------------------------------------
 *  GEMINI AGENT SERVICE
 *  Wraps @google/genai and runs the KisanSetu tool-calling loop: Gemini
 *  decides which read-only backend tool(s) it needs, we execute them against
 *  Prisma (via agentTools.ts) using the AUTHENTICATED farmer's id, feed the
 *  real results back, and return Gemini's final farmer-facing text.
 *
 *  The API key NEVER leaves this process — read once from process.env
 *  (backend/.env), never logged, never echoed in a response or error message
 *  sent to a client.
 * ---------------------------------------------------------------------------
 */

export const geminiConfigured: boolean = Boolean(env.GEMINI_API_KEY);

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GenerateAgentReplyInput {
  systemInstruction: string;
  /** Prior turns, oldest first — already trimmed to a safe length by the caller. */
  history: ChatTurn[];
  message: string;
  ctx: ToolContext;
  timeoutMs?: number;
}

class GeminiTimeoutError extends Error {
  constructor() {
    super('Gemini request timed out');
    this.name = 'GeminiTimeoutError';
  }
}

/**
 * Development-only diagnostic log for a Gemini failure. Prints exactly the
 * fields useful for debugging (HTTP status, error message/code, model,
 * request id when present) and NOTHING secret — never the API key, never
 * any other provider's secret.
 */
function logGeminiFailure(err: unknown, context: { model: string; stage: string }): void {
  const e = err as { status?: number; message?: string; name?: string; requestId?: string } | undefined;
  // eslint-disable-next-line no-console
  console.error(
    `[gemini] ${context.stage} failed — model=${context.model} status=${e?.status ?? 'n/a'} ` +
      `errorName=${e?.name ?? 'n/a'} requestId=${e?.requestId ?? 'n/a'}\n` +
      `  message: ${e?.message ?? String(err)}`,
  );
  if (!isProd && err instanceof Error && err.stack) {
    // eslint-disable-next-line no-console
    console.error(err.stack);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new GeminiTimeoutError()), ms)),
  ]);
}

const MAX_429_RETRIES = 1;
const MAX_BACKOFF_MS = 3000;

function is429(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  return status === 429 || /RESOURCE_EXHAUSTED/i.test(message);
}

/** Google's 429 body often includes "Please retry in 9.4s" — honour it, capped, so we never wait too long inside one HTTP request. */
function suggestedBackoffMs(err: unknown): number {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/retry(?:Delay|_delay)?["\s:]*"?(\d+(?:\.\d+)?)s?/i) ?? message.match(/retry in (\d+(?:\.\d+)?)s/i);
  const seconds = match ? Number(match[1]) : 1.5;
  return Math.min(MAX_BACKOFF_MS, Math.max(300, seconds * 1000));
}

/**
 * A single generateContent call, with ONE bounded retry on 429/quota errors
 * only (never spam Gemini — every other error type is thrown immediately).
 */
async function callGeminiOnce(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  timeoutMs: number,
  stage: string,
) {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    try {
      return await withTimeout(ai.models.generateContent(params), timeoutMs);
    } catch (err) {
      const isLastAttempt = attempt === MAX_429_RETRIES;
      if (!is429(err) || isLastAttempt) {
        logGeminiFailure(err, { model: String(params.model), stage });
        throw err;
      }
      const delay = suggestedBackoffMs(err);
      // eslint-disable-next-line no-console
      console.warn(`[gemini] 429 rate-limited (${stage}) — retrying once in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable — the loop always returns or throws — but keeps TS happy.
  throw new Error('unreachable');
}

const MAX_TOOL_ROUNDS = 4;

/**
 * Run one KisanSetu agent turn: send the message (+ history) to Gemini with
 * the KisanSetu tool set attached, execute any tool calls it requests
 * against real backend data, and loop until it returns a final text answer.
 *
 * Throws on any failure (invalid key, quota, network, timeout, malformed
 * tool loop) — the caller (aiController) catches this and uses the
 * deterministic fallback so the farmer is never shown a broken chat.
 */
export async function generateAgentReply(input: GenerateAgentReplyInput): Promise<string> {
  const ai = getClient();
  const model = env.GEMINI_MODEL;
  const timeoutMs = input.timeoutMs ?? 20000;

  const contents: Content[] = [
    ...input.history.map((turn): Content => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: input.message }] },
  ];

  const config = {
    systemInstruction: input.systemInstruction,
    temperature: 0.3,
    maxOutputTokens: 512,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callGeminiOnce(ai, { model, contents, config }, timeoutMs, `generateContent (round ${round})`);

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      const text = response.text?.trim();
      if (!text) throw new Error('Gemini returned an empty response');
      return text;
    }

    // Echo the model's function-call turn back into the conversation, then
    // execute each requested tool and append the real results.
    const modelContent = response.candidates?.[0]?.content;
    contents.push(modelContent ?? { role: 'model', parts: calls.map((c): Part => ({ functionCall: c })) });

    const responseParts: Part[] = [];
    for (const call of calls) {
      const name = call.name ?? '';
      const impl = TOOL_IMPLEMENTATIONS[name];
      let result: Record<string, unknown>;
      if (!impl) {
        result = { error: `Unknown tool: ${name}` };
      } else {
        try {
          result = await impl(call.args ?? {}, input.ctx);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[gemini] tool "${name}" failed:`, err instanceof Error ? err.message : String(err));
          result = { error: 'This tool failed to fetch data. Tell the farmer this information is temporarily unavailable.' };
        }
      }
      responseParts.push({ functionResponse: { name, response: result } });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  throw new Error('Gemini agent exceeded the maximum number of tool-call rounds');
}
