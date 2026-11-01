import { rupees } from './money'

export type Tone = 'polite' | 'festival' | 'hindi'

export function buildMessage(o: {
  tone: Tone; name: string; amount: number; shop: string; upiId?: string; includeUpi: boolean
}): string {
  const amt = rupees(o.amount)
  let m: string
  if (o.tone === 'hindi')
    m = `नमस्ते ${o.name} जी, ${o.shop} में आपका ${amt} बकाया है। कृपया सुविधा अनुसार भुगतान कर दें। धन्यवाद!`
  else if (o.tone === 'festival')
    m = `Hi ${o.name}, wishing you and your family a happy festive season! A gentle reminder: ${amt} is pending at ${o.shop}. Thank you!`
  else
    m = `Hi ${o.name}, a gentle reminder from ${o.shop}: ${amt} is pending. Please pay when convenient. Thank you!`
  if (o.includeUpi && o.upiId) {
    const link = upiLink(o.upiId, o.shop, o.amount)
    // UPI ID as plain text too: upi:// links don't open reliably on iPhone.
    m += `\n\nPay via UPI: ${link}\nUPI ID: ${o.upiId}`
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
