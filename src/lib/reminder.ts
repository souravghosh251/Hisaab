import { rupees } from './money'

export type Tone = 'polite' | 'festival'
export type MsgLang = 'en' | 'hi' | 'mr'

const templates: Record<MsgLang, Record<Tone, (n: string, a: string, s: string) => string>> = {
  en: {
    polite: (n, a, s) => `Hi ${n}, a gentle reminder from ${s}: ${a} is pending. Please pay when convenient. Thank you!`,
    festival: (n, a, s) => `Hi ${n}, wishing you and your family a happy festive season! A gentle reminder: ${a} is pending at ${s}. Thank you!`,
  },
  hi: {
    polite: (n, a, s) => `नमस्ते ${n} जी, ${s} में आपका ${a} बकाया है। कृपया सुविधा अनुसार भुगतान कर दें। धन्यवाद!`,
    festival: (n, a, s) => `नमस्ते ${n} जी, आपको और आपके परिवार को त्योहार की शुभकामनाएँ! याद दिला दें, ${s} में आपका ${a} बकाया है। धन्यवाद!`,
  },
  mr: {
    polite: (n, a, s) => `नमस्कार ${n}, ${s} कडे तुमचे ${a} बाकी आहेत. सोयीनुसार भरावेत ही विनंती. धन्यवाद!`,
    festival: (n, a, s) => `नमस्कार ${n}, तुम्हाला आणि तुमच्या कुटुंबाला सणाच्या शुभेच्छा! आठवण म्हणून, ${s} कडे तुमचे ${a} बाकी आहेत. धन्यवाद!`,
  },
}
const upiLabels: Record<MsgLang, [string, string]> = {
  en: ['Pay via UPI', 'UPI ID'],
  hi: ['UPI से भुगतान करें', 'UPI ID'],
  mr: ['UPI ने पैसे भरा', 'UPI ID'],
}

export function buildMessage(o: {
  tone: Tone; lang?: MsgLang; name: string; amount: number; shop: string; upiId?: string; includeUpi: boolean
}): string {
  const lang = o.lang ?? 'en'
  let m = templates[lang][o.tone](o.name, rupees(o.amount), o.shop)
  if (o.includeUpi && o.upiId) {
    const [pay, id] = upiLabels[lang]
    // UPI ID as plain text too: upi:// links don't open reliably on iPhone.
    m += `\n\n${pay}: ${upiLink(o.upiId, o.shop, o.amount)}\n${id}: ${o.upiId}`
  }
  return m
}

export const upiLink = (vpa: string, payee: string, paise: number) =>
  `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${(paise / 100).toFixed(2)}&cu=INR`

/** Indian numbers: 10 digits -> prefix 91. Returns digits only for wa.me. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return '91' + d
  return d.replace(/^0+/, '')
}

export function whatsappUrl(phone: string, text: string): string {
  const n = waNumber(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}
