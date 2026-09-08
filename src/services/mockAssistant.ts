import type { Language } from '../types';
import { withLatency } from './mockAI';

/**
 * ---------------------------------------------------------------------------
 *  MOCK ASSISTANT SERVICE  ("KisanSetu Saathi")
 *  Keyword-matched canned replies in all three languages. No LLM is wired
 *  up. Replace getAssistantResponse() with a call to the backend chat
 *  endpoint later; the ChatMessage shape stays the same.
 * ---------------------------------------------------------------------------
 */

type Intent = 'visit' | 'center' | 'token' | 'documents' | 'wait' | 'fallback';

const REPLIES: Record<Intent, Record<Language, string>> = {
  visit: {
    en: 'Based on the current queue, 11:30 AM is the best time to visit. Expected waiting time is around 35 minutes.',
    hi: 'मौजूदा भीड़ के आधार पर आपके लिए सुबह 11:30 बजे आना बेहतर रहेगा। अनुमानित प्रतीक्षा समय लगभग 35 मिनट है।',
    hinglish: 'Current queue ke according aapke liye 11:30 AM best rahega. Expected waiting time around 35 minute hai.',
  },
  center: {
    en: 'Your procurement center is Jaipur Grain Center. It is currently ACTIVE and accepting wheat.',
    hi: 'आपका खरीद केंद्र जयपुर ग्रेन सेंटर है। यह अभी चालू है और गेहूँ ले रहा है।',
    hinglish: 'Aapka procurement center Jaipur Grain Center hai. Abhi ACTIVE hai aur wheat le raha hai.',
  },
  token: {
    en: 'Open "My Token" to see your token number, QR code and slot. If you have not booked yet, use the AI recommended slot on your dashboard.',
    hi: 'अपना टोकन नंबर, QR कोड और समय देखने के लिए "मेरा टोकन" खोलें। यदि आपने बुक नहीं किया है, तो डैशबोर्ड पर AI सुझाया गया समय चुनें।',
    hinglish: '"Mera Token" kholein token number, QR code aur slot dekhne ke liye. Agar book nahi kiya hai to dashboard par AI recommended slot use karein.',
  },
  documents: {
    en: 'Please carry: Farmer ID, registration details, bank passbook, crop details and your digital token. Requirements may vary by center.',
    hi: 'कृपया साथ लाएँ: किसान आईडी, पंजीकरण विवरण, बैंक पासबुक, फसल विवरण और आपका डिजिटल टोकन। आवश्यकताएँ केंद्र के अनुसार बदल सकती हैं।',
    hinglish: 'Saath laayein: Farmer ID, registration details, bank passbook, crop details aur digital token. Requirements center ke hisaab se badal sakti hain.',
  },
  wait: {
    en: 'Right now the estimated waiting time at Jaipur Grain Center is about 35 minutes with 18 farmers ahead.',
    hi: 'अभी जयपुर ग्रेन सेंटर पर अनुमानित प्रतीक्षा समय लगभग 35 मिनट है और आगे 18 किसान हैं।',
    hinglish: 'Abhi Jaipur Grain Center par estimated waiting time around 35 minute hai, aage 18 kisan hain.',
  },
  fallback: {
    en: 'I can help with visit timing, your center, your token and required documents. Try one of the quick questions above.',
    hi: 'मैं विज़िट समय, आपके केंद्र, टोकन और ज़रूरी दस्तावेज़ों में मदद कर सकता हूँ। ऊपर दिए गए सवालों में से कोई चुनें।',
    hinglish: 'Main visit timing, center, token aur documents me help kar sakta hoon. Upar diye gaye quick questions try karein.',
  },
};

function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/(when|time|kab|visit|aana|slot)/.test(m)) return 'visit';
  if (/(where|center|centre|kahan|kendra|location)/.test(m)) return 'center';
  if (/(token|qr)/.test(m)) return 'token';
  if (/(document|paper|id|bank|dastavez|kagaz)/.test(m)) return 'documents';
  if (/(wait|queue|line|bheed|kitna|kitni)/.test(m)) return 'wait';
  return 'fallback';
}

/**
 * getAssistantResponse()
 * Returns the assistant's reply text for a user message in the given language.
 */
export function getAssistantResponse(message: string, language: Language): Promise<string> {
  const intent = detectIntent(message);
  return withLatency(REPLIES[intent][language] ?? REPLIES.fallback[language], 600);
}
