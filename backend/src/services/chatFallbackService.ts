import type { ChatContext } from './chatContextService';

/**
 * ---------------------------------------------------------------------------
 *  CHAT FALLBACK SERVICE
 *  Deterministic, farmer-friendly replies built from the SAME real data the
 *  Gemini path uses (see chatContextService). Used whenever Gemini is not
 *  configured, times out, or errors — the assistant stays useful and never
 *  invents facts either way.
 * ---------------------------------------------------------------------------
 */

type Language = 'en' | 'hi' | 'hinglish';

function pick(language: Language, en: string, hi: string, hinglish: string): string {
  if (language === 'hi') return hi;
  if (language === 'hinglish') return hinglish;
  return en;
}

export function buildFallbackReply(context: ChatContext, language: Language, farmerName?: string): string {
  const { intent, data } = context;
  const name = farmerName ? farmerName.split(' ')[0] : '';

  switch (intent) {
    case 'greeting':
      return pick(
        language,
        `Namaste${name ? ` ${name}` : ''}! I can help with your token, queue, procurement, transport or payment. What would you like to know?`,
        `नमस्ते${name ? ` ${name}` : ''}! मैं आपके टोकन, कतार, खरीद, परिवहन या भुगतान में मदद कर सकता हूँ। आप क्या जानना चाहते हैं?`,
        `Namaste${name ? ` ${name}` : ''}! Main aapke token, queue, procurement, transport ya payment mein help kar sakta hoon. Aap kya jaanna chahte hain?`,
      );

    case 'token': {
      const t = data.token as { tokenNumber: string; status: string; queuePosition: number; estimatedWait: number; centerName: string } | undefined;
      if (!t) {
        return pick(
          language,
          "You don't have a booked token yet. Book one from your dashboard to get a queue position.",
          'आपने अभी तक कोई टोकन बुक नहीं किया है। कतार में स्थान पाने के लिए डैशबोर्ड से टोकन बुक करें।',
          'Aapne abhi tak koi token book nahi kiya hai. Queue position paane ke liye dashboard se token book karein.',
        );
      }
      return pick(
        language,
        `Your token is ${t.tokenNumber} (${t.status}). Queue position ${t.queuePosition}, estimated wait ${t.estimatedWait} minutes at ${t.centerName}.`,
        `आपका टोकन ${t.tokenNumber} है (${t.status})। कतार में स्थिति ${t.queuePosition} है, ${t.centerName} पर अनुमानित प्रतीक्षा ${t.estimatedWait} मिनट है।`,
        `Aapka token ${t.tokenNumber} hai (${t.status}). Queue position ${t.queuePosition} hai, ${t.centerName} par estimated wait ${t.estimatedWait} minutes hai.`,
      );
    }

    case 'queue': {
      const q = data.queue as { farmersAhead: number; currentlyServing: string | null; estimatedWait: number; centerName: string } | undefined;
      if (!q) {
        return pick(
          language,
          "You don't have an active token right now, so there's no live queue position to check.",
          'अभी आपका कोई सक्रिय टोकन नहीं है, इसलिए कोई लाइव कतार स्थिति नहीं है।',
          'Abhi aapka koi active token nahi hai, isliye koi live queue position check karne ko nahi hai.',
        );
      }
      return pick(
        language,
        `There are ${q.farmersAhead} farmers ahead of you at ${q.centerName}. Currently serving ${q.currentlyServing ?? 'no one yet'}. Estimated wait: ${q.estimatedWait} minutes.`,
        `${q.centerName} पर आपसे आगे ${q.farmersAhead} किसान हैं। अभी ${q.currentlyServing ?? 'किसी की भी'} सेवा हो रही है। अनुमानित प्रतीक्षा: ${q.estimatedWait} मिनट।`,
        `${q.centerName} par aapke aage ${q.farmersAhead} farmers hain. Abhi ${q.currentlyServing ?? 'koi bhi'} serve ho raha hai. Estimated wait: ${q.estimatedWait} minutes.`,
      );
    }

    case 'centre': {
      const c = data.centre as { name: string; status: string; load: string } | undefined;
      if (!c) {
        return pick(
          language,
          'Please mention which procurement centre you mean, so I can check its status.',
          'कृपया बताएं कि आप किस खरीद केंद्र के बारे में पूछ रहे हैं, ताकि मैं उसकी स्थिति देख सकूँ।',
          'Please batayein aap kaunse procurement centre ke baare mein pooch rahe hain, taaki main status check kar saku.',
        );
      }
      const statusWord = pick(
        language,
        c.status === 'CLOSED' ? 'closed' : c.status === 'PAUSED' ? 'temporarily paused' : 'open',
        c.status === 'CLOSED' ? 'बंद' : c.status === 'PAUSED' ? 'अस्थायी रूप से रुका हुआ' : 'खुला',
        c.status === 'CLOSED' ? 'closed' : c.status === 'PAUSED' ? 'temporarily paused' : 'open',
      );
      return pick(
        language,
        `${c.name} is currently ${statusWord}. Queue load is ${c.load}.`,
        `${c.name} अभी ${statusWord} है। कतार का भार ${c.load} है।`,
        `${c.name} abhi ${statusWord} hai. Queue load ${c.load} hai.`,
      );
    }

    case 'centres': {
      const list = data.centres as { name: string; status: string; load: string }[] | undefined;
      if (!list || list.length === 0) {
        return pick(
          language,
          'No procurement centres are available right now.',
          'अभी कोई खरीद केंद्र उपलब्ध नहीं है।',
          'Abhi koi procurement centre available nahi hai.',
        );
      }
      const names = list.map((c) => c.name).join(', ');
      return pick(
        language,
        `Available procurement centres: ${names}. You can compare and switch from the Centres page.`,
        `उपलब्ध खरीद केंद्र: ${names}। आप केंद्र पेज से तुलना कर सकते हैं और बदल सकते हैं।`,
        `Available procurement centres: ${names}. Aap Centres page se compare karke switch kar sakte hain.`,
      );
    }

    case 'transport': {
      const t = data.transport as { vehicleType: string; totalCost: number; status: string; paymentStatus: string | null } | undefined;
      if (!t) {
        return pick(
          language,
          "You haven't booked transport yet. You can arrange it after your procurement is completed.",
          'आपने अभी तक परिवहन बुक नहीं किया है। खरीद पूरी होने के बाद आप इसे बुक कर सकते हैं।',
          'Aapne abhi tak transport book nahi kiya hai. Procurement complete hone ke baad aap ise book kar sakte hain.',
        );
      }
      return pick(
        language,
        `Your ${t.vehicleType.toLowerCase()} transport is ${t.status.toLowerCase().replace(/_/g, ' ')}. Total cost ₹${t.totalCost}${t.paymentStatus ? `, payment ${t.paymentStatus.toLowerCase()}` : ''}.`,
        `आपका ${t.vehicleType} परिवहन ${t.status} है। कुल लागत ₹${t.totalCost}${t.paymentStatus ? `, भुगतान ${t.paymentStatus}` : ''}।`,
        `Aapka ${t.vehicleType} transport ${t.status} hai. Total cost ₹${t.totalCost}${t.paymentStatus ? `, payment ${t.paymentStatus}` : ''}.`,
      );
    }

    case 'payment': {
      const p = data.payment as { kind: string; amount: number; status: string } | undefined;
      if (!p) {
        return pick(
          language,
          "You don't have any payment records yet.",
          'अभी आपका कोई भुगतान रिकॉर्ड नहीं है।',
          'Abhi aapka koi payment record nahi hai.',
        );
      }
      return pick(
        language,
        `Your latest ${p.kind.toLowerCase()} payment of ₹${p.amount} is ${p.status.toLowerCase()}.`,
        `आपका हालिया ${p.kind} भुगतान ₹${p.amount} ${p.status} है।`,
        `Aapka latest ${p.kind} payment ₹${p.amount} ${p.status} hai.`,
      );
    }

    case 'procurement': {
      const pr = data.procurement as { crop: string; status: string; totalAmount: number | null } | undefined;
      if (!pr) {
        return pick(
          language,
          "You don't have a procurement record yet.",
          'अभी आपका कोई खरीद रिकॉर्ड नहीं है।',
          'Abhi aapka koi procurement record nahi hai.',
        );
      }
      const amount = pr.totalAmount ? pick(language, `, total amount ₹${pr.totalAmount}`, `, कुल राशि ₹${pr.totalAmount}`, `, total amount ₹${pr.totalAmount}`) : '';
      return pick(
        language,
        `Your ${pr.crop} procurement status is ${pr.status.toLowerCase().replace(/_/g, ' ')}${amount}.`,
        `आपकी ${pr.crop} की खरीद की स्थिति ${pr.status} है${amount}।`,
        `Aapki ${pr.crop} ki procurement status ${pr.status} hai${amount}.`,
      );
    }

    case 'crop': {
      const c = data.crop as { name: string; msp: number } | undefined;
      if (!c) {
        return pick(
          language,
          'Please mention the crop name so I can check its MSP.',
          'कृपया फसल का नाम बताएं ताकि मैं MSP देख सकूँ।',
          'Please crop ka naam batayein taaki main MSP check kar saku.',
        );
      }
      return pick(
        language,
        `MSP (minimum support price) for ${c.name} is ₹${c.msp} per quintal.`,
        `${c.name} का MSP (न्यूनतम समर्थन मूल्य) ₹${c.msp} प्रति क्विंटल है।`,
        `${c.name} ka MSP ₹${c.msp} per quintal hai.`,
      );
    }

    case 'general':
    default:
      return pick(
        language,
        'I can help with your token, queue, procurement centre, transport or payment. Try asking about one of those.',
        'मैं आपके टोकन, कतार, खरीद केंद्र, परिवहन या भुगतान में मदद कर सकता हूँ। इनमें से किसी के बारे में पूछें।',
        'Main aapke token, queue, procurement centre, transport ya payment mein help kar sakta hoon. Inme se kisi ke baare mein poochein.',
      );
  }
}
