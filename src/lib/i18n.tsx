import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { mr } from './mr'

export type Lang = 'en' | 'hi' | 'mr'
type Vars = Record<string, string | number>

// Keys are the English strings; English renders as-is, Hindi and Marathi (mr.ts) look up here.
const hi: Record<string, string> = {
  'Your khata,': 'आपका खाता,', 'faster': 'तेज़', 'than a notebook.': 'नोटबुक से भी।',
  'Record udhaar in seconds, remind on WhatsApp. No ads, nothing to install.': 'उधार सेकंडों में लिखें, WhatsApp पर याद दिलाएँ। कोई विज्ञापन नहीं, कुछ इंस्टॉल नहीं।',
  'Business name': 'दुकान का नाम', 'Email': 'ईमेल', 'Password': 'पासवर्ड',
  'Create account': 'खाता बनाएँ', 'Log in': 'लॉग इन', 'Please wait…': 'कृपया रुकें…',
  'Already have an account? Log in': 'पहले से खाता है? लॉग इन करें', 'New here? Create an account': 'नए हैं? खाता बनाएँ',
  'Demo mode: data is saved only in this browser. Connect Supabase (see README) to sync across devices.': 'डेमो मोड: डेटा सिर्फ़ इसी ब्राउज़र में सेव है। सभी डिवाइस पर पाने के लिए Supabase जोड़ें।',
  'We store only names, phone numbers and amounts. No ads, no trackers.': 'हम सिर्फ़ नाम, फ़ोन नंबर और रकम रखते हैं। कोई विज्ञापन या ट्रैकर नहीं।',
  'Settings': 'सेटिंग्स', "You'll get": 'आपको मिलेंगे', "You'll give": 'आपको देने हैं', "you'll get": 'आपको मिलेंगे', "you'll give": 'आपको देने हैं',
  'settled': 'चुकता', 'Collected this week': 'इस हफ़्ते वसूला', 'Overdue': 'बकाया (देर)', 'since': 'से',
  'Customers': 'ग्राहक', 'Suppliers': 'सप्लायर', 'Search customers': 'ग्राहक खोजें', 'Search suppliers': 'सप्लायर खोजें', 'Search': 'खोजें',
  '+ Add': '+ जोड़ें', 'Sort:': 'क्रम:', 'Amount': 'रकम', 'Oldest due': 'सबसे पुराना बकाया',
  'Welcome! Three steps to your first entry': 'स्वागत है! पहली एंट्री के तीन कदम',
  'Tap “+ Add” and save a customer.': '“+ जोड़ें” दबाकर एक ग्राहक सेव करें।', 'Tap “+ Add” and save a supplier.': '“+ जोड़ें” दबाकर एक सप्लायर सेव करें।',
  'Open them and tap “You gave ₹”.': 'उन्हें खोलें और “आपने दिए ₹” दबाएँ।', 'Open them and tap “You paid ₹”.': 'उन्हें खोलें और “आपने चुकाए ₹” दबाएँ।',
  'Type the amount and save. Later, tap Remind to ask on WhatsApp.': 'रकम डालकर सेव करें। बाद में “याद दिलाएँ” से WhatsApp पर माँगें।',
  'No match for “{q}”.': '“{q}” नहीं मिला।', 'Overdue since {d}': '{d} से बकाया', 'Collect by {d}': '{d} तक वसूलना है',
  'Name, amount, note. Add “got” for a payment received.': 'नाम, रकम, नोट। पैसे मिले हों तो “got” लिखें।', 'Quick entry': 'झटपट एंट्री',
  'Remind all': 'सबको याद दिलाएँ', 'Gave': 'दिए', 'Got': 'मिले',
  'Add an amount, e.g. "sharma 420 atta"': 'रकम लिखें, जैसे "sharma 420 atta"', 'Amount must be more than 0': 'रकम 0 से ज़्यादा होनी चाहिए',
  'Start with a customer name, e.g. "sharma 420 atta"': 'पहले ग्राहक का नाम लिखें, जैसे "sharma 420 atta"',
  'No customer matches "{name}"': '"{name}" नाम का कोई ग्राहक नहीं मिला', '"{name}" matches {list}. Be more specific.': '"{name}" इनसे मेल खाता है: {list}। पूरा नाम लिखें।',
  'Could not save: {e}. Try again.': 'सेव नहीं हुआ: {e}। फिर कोशिश करें।', 'Could not undo': 'वापस नहीं हो सका',
  'Undo': 'वापस करें', 'Cancel': 'रद्द करें', 'Close': 'बंद करें', 'Delete': 'हटाएँ', 'Save': 'सेव करें', 'Edit': 'बदलें', 'Back': 'पीछे',
  'Name': 'नाम', 'Phone (for WhatsApp)': 'फ़ोन (WhatsApp के लिए)', 'Note (optional)': 'नोट (वैकल्पिक)', 'Collect by (optional)': 'वसूली की तारीख़ (वैकल्पिक)',
  'Name is required': 'नाम ज़रूरी है', 'Saving…': 'सेव हो रहा है…',
  'Edit customer': 'ग्राहक बदलें', 'Edit supplier': 'सप्लायर बदलें', 'Add customer': 'ग्राहक जोड़ें', 'Add supplier': 'सप्लायर जोड़ें',
  'Delete customer': 'ग्राहक हटाएँ', 'Delete supplier': 'सप्लायर हटाएँ', 'Delete {n}?': '{n} को हटाएँ?',
  'This removes the customer and hides all their entries from your totals.': 'इससे ग्राहक हट जाएगा और उनकी सभी एंट्री आपके टोटल से हट जाएँगी।',
  'This removes the supplier and hides all their entries from your totals.': 'इससे सप्लायर हट जाएगा और उनकी सभी एंट्री आपके टोटल से हट जाएँगी।',
  'You gave': 'आपने दिए', 'You got': 'आपको मिले', 'You paid': 'आपने चुकाए', 'Goods received': 'माल मिला', 'you gave': 'आपने दिए', 'you got': 'आपको मिले', 'you paid': 'आपने चुकाए', 'received': 'मिला',
  'You gave ₹': 'आपने दिए ₹', 'You got ₹': 'आपको मिले ₹', 'You paid ₹': 'आपने चुकाए ₹', 'Goods received ₹': 'माल मिला ₹',
  'Entry type': 'एंट्री का प्रकार', 'New balance': 'नया बैलेंस', '(settled)': '(चुकता)', "(you'll get)": '(आपको मिलेंगे)', "(you'll give)": '(आपको देने हैं)',
  'Note (e.g. atta, rice)': 'नोट (जैसे आटा, चावल)', 'Note': 'नोट', 'Date': 'तारीख़', 'Enter an amount': 'रकम डालें', 'Edit entry': 'एंट्री बदलें', 'Save entry': 'एंट्री सेव करें',
  'Delete entry': 'एंट्री हटाएँ', 'Delete this entry?': 'यह एंट्री हटाएँ?', '{a} will be removed and the balance recalculated.': '{a} हट जाएगा और बैलेंस दोबारा निकलेगा।',
  'Could not save: {e}. Your entry is still here, try again.': 'सेव नहीं हुआ: {e}। आपकी एंट्री यहीं है, फिर कोशिश करें।',
  'Could not save: {e}. Your details are still here, try again.': 'सेव नहीं हुआ: {e}। आपकी जानकारी यहीं है, फिर कोशिश करें।',
  'Entry saved': 'एंट्री सेव हुई', 'Entry updated': 'एंट्री बदली गई',
  'Remind': 'याद दिलाएँ', 'Statement PDF': 'स्टेटमेंट PDF', 'Entries': 'एंट्री', 'No phone': 'फ़ोन नहीं',
  'No entries yet. Tap “{b}” below to add the first one.': 'अभी कोई एंट्री नहीं। पहली जोड़ने के लिए नीचे “{b}” दबाएँ।',
  'Not found.': 'नहीं मिला।', 'balance': 'बैलेंस',
  'Remind on WhatsApp': 'WhatsApp पर याद दिलाएँ', '{n} owes {a}': '{n} पर {a} बकाया है', 'Tone': 'अंदाज़', 'Polite': 'विनम्र', 'Festival': 'त्योहार', 'Hindi': 'हिंदी',
  'Include UPI payment link': 'UPI पेमेंट लिंक जोड़ें', 'Add your UPI ID in Settings': 'सेटिंग्स में अपनी UPI ID जोड़ें',
  'Add a phone number for {n} to send on WhatsApp.': '{n} का फ़ोन नंबर जोड़ें ताकि WhatsApp पर भेज सकें।', 'Send on WhatsApp': 'WhatsApp पर भेजें',
  'Remind everyone': 'सबको याद दिलाएँ', 'Customers with dues: {c}, {a} in total. WhatsApp opens one chat at a time: tap Send for each.': 'बकाया वाले ग्राहक: {c}, कुल {a}। WhatsApp एक बार में एक चैट खोलता है: हर एक के लिए “भेजें” दबाएँ।',
  'Send': 'भेजें', 'Sent': 'भेजा गया', 'No phone number': 'फ़ोन नंबर नहीं', 'Nobody has dues right now.': 'अभी किसी पर बकाया नहीं है।', 'Overdue first': 'पहले देर वाले',
  'PDF statement': 'PDF स्टेटमेंट', 'From': 'से', 'To': 'तक', 'Start date must be before end date': 'शुरू की तारीख़ अंत से पहले होनी चाहिए', 'Share / download PDF': 'PDF शेयर / डाउनलोड करें',
  'Business name (shown in reminders)': 'दुकान का नाम (रिमाइंडर में दिखेगा)', 'Your name': 'आपका नाम', 'Your phone': 'आपका फ़ोन', 'UPI ID (added to reminders)': 'UPI ID (रिमाइंडर में जुड़ेगी)',
  'UPI ID looks wrong. It should look like name@bank.': 'UPI ID सही नहीं लगती। यह name@bank जैसी होनी चाहिए।', 'Saved': 'सेव हो गया', 'Could not save: {e}': 'सेव नहीं हुआ: {e}', 'Language': 'भाषा',
  'Signed in as {e}': '{e} से लॉग इन', ' (demo mode, this browser only)': ' (डेमो मोड, सिर्फ़ यही ब्राउज़र)', 'Log out': 'लॉग आउट',
  'Privacy: we store only names, phone numbers and amounts. No ads, no third-party trackers.': 'निजता: हम सिर्फ़ नाम, फ़ोन नंबर और रकम रखते हैं। कोई विज्ञापन या थर्ड-पार्टी ट्रैकर नहीं।',
  'Loading…': 'लोड हो रहा है…', 'Not signed in': 'लॉग इन नहीं है',
  // Landing page
  'Features': 'फ़ीचर', 'FAQ': 'सवाल-जवाब', 'Start free': 'मुफ़्त शुरू करें', 'New': 'नया', 'Reminders now carry a UPI link': 'अब रिमाइंडर में UPI लिंक भी',
  'Udhaar,': 'उधार,', 'finally': 'आख़िरकार', 'sorted.': 'सुलझा।',
  'The khata app for shops that give credit to the same faces every week. Three taps to write it down. One tap to ask for it back, on WhatsApp.': 'उन दुकानों का खाता ऐप जो हर हफ़्ते उन्हीं जाने-पहचाने लोगों को उधार देती हैं। लिखने के लिए तीन टैप। WhatsApp पर वापस माँगने के लिए एक टैप।',
  'Open your khata': 'अपना खाता खोलें', 'See how it works': 'देखें कैसे काम करता है', 'Opens from a link · No app to install · Hindi, Marathi & English': 'लिंक से खुलता है · कुछ इंस्टॉल नहीं · हिंदी, मराठी और English',
  'Who uses Hisaab': 'Hisaab कौन इस्तेमाल करता है', 'Kirana stores': 'किराना दुकानें', 'Tuition teachers': 'ट्यूशन टीचर', 'Milk delivery': 'दूध वाले', 'PG & mess owners': 'PG और मेस वाले', 'Newspaper rounds': 'अख़बार वाले',
  'Everything a khata needs.': 'खाते को जो चाहिए, सब।', "Nothing it doesn't.": 'जो नहीं चाहिए, कुछ नहीं।',
  "Type it like you'd": 'वैसे ही लिखें जैसे', 'say it': 'बोलते हैं', 'Hisaab finds the customer, reads the amount and saves the entry.': 'Hisaab ग्राहक ढूँढता है, रकम पढ़ता है और एंट्री सेव कर देता है।',
  'The app does': 'माँगने का काम', 'the asking': 'ऐप करता है', 'A polite WhatsApp reminder with the amount and a UPI link. Send to one customer, or everyone on the 1st.': 'रकम और UPI लिंक के साथ विनम्र WhatsApp रिमाइंडर। एक ग्राहक को भेजें, या 1 तारीख़ को सबको।',
  'Balances that': 'बैलेंस जिनके लिए', 'never': 'कभी', 'need a calculator': 'कैलकुलेटर नहीं चाहिए', "Total you'll get": 'कुल आपको मिलेंगे', 'across 41 customers · example': '41 ग्राहकों से · उदाहरण',
  'Proof,': 'सबूत,', 'not': 'न कि', 'arguments': 'बहस', 'Every entry is dated. Send a customer their full statement as a PDF.': 'हर एंट्री पर तारीख़ है। ग्राहक को उनका पूरा स्टेटमेंट PDF में भेजें।',
  'A link,': 'एक लिंक,', 'a download': 'डाउनलोड', "Opens in any phone's browser. Add it to your home screen and it behaves like an app.": 'किसी भी फ़ोन के ब्राउज़र में खुलता है। होम स्क्रीन पर जोड़ें और यह ऐप की तरह चलता है।',
  'Built for': 'बना है', 'regulars,': 'रोज़ के ग्राहकों के लिए,', 'not strangers.': 'अजनबियों के लिए नहीं।',
  'Forty families, settled at month-end': 'चालीस परिवार, महीने के आख़िर में हिसाब', 'Whose fee is pending, at a glance': 'किसकी फ़ीस बाकी है, एक नज़र में',
  'Milk & paper delivery': 'दूध और अख़बार', 'Daily drops, one monthly total': 'रोज़ की डिलीवरी, एक महीने का टोटल', 'PGs & mess owners': 'PG और मेस', 'Rent and meal dues in one list': 'किराया और खाने का बकाया एक सूची में',
  'ON PURPOSE': 'सोच-समझकर', 'Other khata apps became': 'बाकी खाता ऐप', 'everything': 'सब-कुछ वाले', 'apps.': 'ऐप बन गए।',
  'We kept one job: keep the udhaar straight and bring the money back.': 'हमने एक ही काम रखा: उधार का हिसाब सही रखना और पैसा वापस लाना।',
  'Loan offers': 'लोन के ऑफ़र', 'Ads in your ledger': 'खाते में विज्ञापन', 'Stock you never asked for': 'स्टॉक जो आपने माँगा ही नहीं', 'A 40 MB download': '40 MB का डाउनलोड', 'Just the khata.': 'बस खाता।',
  'Good': 'अच्छे', 'questions': 'सवाल',
  'Does my customer need the app?': 'क्या मेरे ग्राहक को ऐप चाहिए?', 'No. They get a WhatsApp message with the amount and a UPI link, and pay from any UPI app they already use.': 'नहीं। उन्हें रकम और UPI लिंक के साथ WhatsApp मैसेज मिलता है, और वे अपने किसी भी UPI ऐप से पैसे दे सकते हैं।',
  'What if I lose my phone?': 'अगर फ़ोन खो जाए तो?', 'Your khata is saved online. Log in on any phone or laptop and every entry is there.': 'आपका खाता ऑनलाइन सेव है। किसी भी फ़ोन या लैपटॉप पर लॉग इन करें, हर एंट्री वहीं मिलेगी।',
  'Do I have to download anything?': 'क्या कुछ डाउनलोड करना होगा?', 'No. Open the link in your browser and add it to your home screen if you like.': 'नहीं। ब्राउज़र में लिंक खोलें, चाहें तो होम स्क्रीन पर जोड़ लें।',
  'How much does it cost?': 'इसकी क़ीमत क्या है?', 'Nothing. Hisaab is free during the pilot.': 'कुछ नहीं। पायलट के दौरान Hisaab मुफ़्त है।',
  'What do you store about me?': 'आप मेरे बारे में क्या रखते हैं?', 'Only names, phone numbers and amounts. No ads, no third-party trackers, and nobody else can see your khata.': 'सिर्फ़ नाम, फ़ोन नंबर और रकम। कोई विज्ञापन या थर्ड-पार्टी ट्रैकर नहीं, और आपका खाता कोई और नहीं देख सकता।',
  'Close the khata': 'खाता आज रात', 'tonight.': 'बराबर करें।', 'Works on any phone with a browser.': 'ब्राउज़र वाले किसी भी फ़ोन पर चलता है।', 'An internship project · 2026': 'एक इंटर्नशिप प्रोजेक्ट · 2026',
  // Onboarding
  'Skip': 'छोड़ें', 'Next': 'आगे', 'Step {n} of {m}': 'कदम {n} / {m}',
  'Add the people who owe you': 'जिन पर उधार है, उन्हें जोड़ें', 'Save each customer once, with a phone number for WhatsApp. Suppliers go in their own tab.': 'हर ग्राहक को एक बार सेव करें, WhatsApp के लिए फ़ोन नंबर के साथ। सप्लायर अलग टैब में।',
  'Tap “You gave ₹” when you give credit': 'उधार देते समय “आपने दिए ₹” दबाएँ', 'Tap “You got ₹” when they pay. Type the amount, save, and the balance updates by itself.': 'पैसे मिलने पर “आपको मिले ₹” दबाएँ। रकम डालें, सेव करें, बैलेंस अपने आप बदल जाएगा।',
  'Tap Remind to ask on WhatsApp': 'WhatsApp पर माँगने के लिए “याद दिलाएँ” दबाएँ', 'The message carries the amount due and your UPI link. Add your UPI ID in Settings.': 'मैसेज में बकाया रकम और आपका UPI लिंक होता है। सेटिंग्स में अपनी UPI ID जोड़ें।',
  'Try it with a sample customer': 'एक नमूना ग्राहक के साथ आज़माएँ', 'Start with my own customers': 'अपने ग्राहकों से शुरू करें',
  'Switch light / dark mode': 'लाइट / डार्क मोड बदलें',
  'Theme': 'थीम', 'Same as phone': 'फ़ोन जैसा', 'Light': 'लाइट', 'Dark': 'डार्क',
  'Sharma ji (sample)': 'शर्मा जी (नमूना)', 'Sample customer. Delete it any time from Edit.': 'नमूना ग्राहक। “बदलें” से कभी भी हटा सकते हैं।', 'Oil, sugar': 'तेल, चीनी',
}

interface I18n { lang: Lang; setLang: (l: Lang) => void; t: (s: string, v?: Vars) => string }
const Ctx = createContext<I18n>({ lang: 'en', setLang: () => {}, t: (s) => s })
export const useI18n = () => useContext(Ctx)

const tables: Record<Lang, Record<string, string> | null> = { en: null, hi, mr }
// Each language named in its own script, so people can find theirs.
const names: Record<Lang, string> = { en: 'English', hi: 'हिंदी', mr: 'मराठी' }

const KEY = 'hisaab:lang'
const isLang = (s: unknown): s is Lang => s === 'en' || s === 'hi' || s === 'mr'
function initial(): Lang {
  try { const s = localStorage.getItem(KEY); if (isLang(s)) return s } catch { /* private mode */ }
  const nav = navigator.language?.slice(0, 2)
  return isLang(nav) ? nav : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = (l: Lang) => { set(l); try { localStorage.setItem(KEY, l) } catch { /* ignore */ } }
  const t = (s: string, v?: Vars) => {
    let out = tables[lang]?.[s] ?? s
    if (v) for (const k in v) out = out.split(`{${k}}`).join(String(v[k]))
    return out
  }
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

/** Language dropdown. A native select so phones show their own picker. */
export function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language / भाषा</span>
      <svg className="pointer-events-none absolute left-3 text-muted hidden sm:block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="appearance-none rounded-full border border-line bg-surface text-fg min-h-[44px] pl-4 sm:pl-9 pr-8 text-sm font-medium cursor-pointer outline-none focus-visible:border-fg"
      >
        {(Object.keys(names) as Lang[]).map((l) => <option key={l} value={l}>{names[l]}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  )
}
