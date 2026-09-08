import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { getAssistantResponse } from '../../services/mockAssistant';
import { aiApi, isBackendLive } from '../../services/api';

let idSeq = 0;
const newId = () => `m-${++idSeq}`;

export default function FarmerAssistant() {
  const { t, language } = useT();
  const user = useAppStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: newId(),
        role: 'assistant',
        text:
          language === 'hi'
            ? `नमस्ते ${user?.name ?? ''} 🙏 मैं किसानसेतु AI सहायक हूँ। नीचे दिए सवालों में से कोई चुनें या अपना सवाल टाइप करें।`
            : language === 'hinglish'
              ? `Namaste ${user?.name ?? ''} 🙏 Main KisanSetu AI Assistant hoon. Neeche diye sawaal try karein ya apna sawaal type karein.`
              : `Namaste ${user?.name ?? ''} 🙏 I'm the KisanSetu AI Assistant. Pick a question below or type your own.`,
        timestamp: new Date().toISOString(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const userMsg: ChatMessage = {
      id: newId(),
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setTyping(true);
    setNotice(null);

    let reply: string;
    try {
      // Force a fresh health check rather than trusting a possibly-stale
      // cached result — a single early transient failure must never
      // permanently disable the assistant for the rest of the session.
      if (!(await isBackendLive(true))) throw new Error('backend offline');
      const turns = history.slice(-9, -1).map((m) => ({
        role: m.role,
        text: m.text,
      }));
      const res = await aiApi.chat(trimmed, turns, language);
      reply = res.message;
      if (res.source === 'fallback') setNotice(t('assistant.unavailableNotice'));
    } catch (e) {
      if (import.meta.env.DEV) console.error('[assistant] Gemini chat call failed, using local fallback:', e);
      reply = await getAssistantResponse(trimmed, language);
      setNotice(t('assistant.unavailableNotice'));
    }

    setMessages((m) => [
      ...m,
      { id: newId(), role: 'assistant', text: reply, timestamp: new Date().toISOString() },
    ]);
    setTyping(false);
  }

  const quick = [
    t('assistant.quick.showCentres'),
    t('assistant.quick.checkToken'),
    t('assistant.quick.waitTime'),
    t('assistant.quick.whichCentre'),
    t('assistant.quick.centreOpen'),
    t('assistant.quick.transportCost'),
    t('assistant.quick.paymentStatus'),
    t('assistant.quick.documents'),
  ];

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col lg:h-[calc(100vh-9rem)]">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-kisan-500 text-white">
          <Bot className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-kisan-900">
            🌾 {t('assistant.title')}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-kisan-600">
            <span className="h-1.5 w-1.5 rounded-full bg-kisan-500" /> {t('assistant.online')}
          </p>
        </div>
      </div>
      <p className="mb-3 text-sm text-kisan-600">{t('assistant.hint')}</p>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-kisan-100 text-kisan-600">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'rounded-br-sm bg-kisan-500 text-white'
                    : 'rounded-bl-sm bg-kisan-50 text-kisan-900'
                }`}
              >
                {m.text}
              </div>
              {m.role === 'user' && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-kisan-500 text-white">
                  <User className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-kisan-100 text-kisan-600">
                <Bot className="h-4 w-4" />
              </span>
              <div className="rounded-2xl rounded-bl-sm bg-kisan-50 px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-kisan-400 [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-kisan-400 [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-kisan-400" />
                </span>
              </div>
            </div>
          )}
        </div>

        {notice && (
          <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            {notice}
          </p>
        )}

        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 border-t border-kisan-100 p-3">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={typing}
              className="rounded-full border border-kisan-200 bg-white px-3 py-1.5 text-xs font-semibold text-kisan-700 hover:bg-kisan-50 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          className="flex items-center gap-2 border-t border-kisan-100 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="field-input py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('assistant.placeholder')}
          />
          <button type="submit" className="btn-primary px-4 py-2.5" disabled={typing || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assistant.send')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
