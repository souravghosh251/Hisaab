import { jsPDF } from 'jspdf'
import type { Party, Profile, Txn } from './types'
import { sortTxns, formatDate } from './money'

// jsPDF's built-in fonts have no ₹ glyph, so the statement uses "Rs".
const rs = (paise: number) =>
  'Rs ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(paise) / 100)

export function buildStatement(p: { party: Party; txns: Txn[]; profile: Profile; from: string; to: string }): jsPDF {
  const { party, profile, from, to } = p
  const all = sortTxns(p.txns)
  const signed = (t: Txn) => (t.type === 'gave' ? t.amount : -t.amount)
  const opening = all.filter((t) => t.txn_date < from).reduce((s, t) => s + signed(t), 0)
  const inRange = all.filter((t) => t.txn_date >= from && t.txn_date <= to)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 48
  doc.setFont('helvetica', 'bold').setFontSize(18).text(profile.business_name || 'Statement', 40, y)
  y += 22
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Statement for ${party.name}${party.phone ? ' (' + party.phone + ')' : ''}`, 40, y)
  y += 16
  doc.text(`Period: ${formatDate(from)} to ${formatDate(to)}`, 40, y)
  y += 28

  const cols = { date: 40, note: 120, gave: 380, got: 450, bal: 520 }
  const head = () => {
    doc.setFont('helvetica', 'bold').setFontSize(10)
    doc.text('Date', cols.date, y); doc.text('Details', cols.note, y)
    doc.text('You gave', cols.gave + 50, y, { align: 'right' })
    doc.text('You got', cols.got + 50, y, { align: 'right' })
    doc.text('Balance', cols.bal + 40, y, { align: 'right' })
    y += 6; doc.line(40, y, 555, y); y += 14
    doc.setFont('helvetica', 'normal')
  }
  const dr = (b: number) => `${rs(b)} ${b > 0 ? 'Dr' : b < 0 ? 'Cr' : ''}`.trim()
  head()
  doc.text('Opening balance', cols.note, y)
  doc.text(dr(opening), cols.bal + 40, y, { align: 'right' })
  y += 16

  let run = opening
  for (const t of inRange) {
    if (y > 780) { doc.addPage(); y = 48; head() }
    run += signed(t)
    doc.text(formatDate(t.txn_date), cols.date, y)
    doc.text(doc.splitTextToSize(t.note || '-', 240)[0], cols.note, y)
    if (t.type === 'gave') doc.text(rs(t.amount), cols.gave + 50, y, { align: 'right' })
    else doc.text(rs(t.amount), cols.got + 50, y, { align: 'right' })
    doc.text(dr(run), cols.bal + 40, y, { align: 'right' })
    y += 16
  }
  y += 4; doc.line(40, y, 555, y); y += 16
  doc.setFont('helvetica', 'bold')
  doc.text('Closing balance', cols.note, y)
  doc.text(dr(run), cols.bal + 40, y, { align: 'right' })
  y += 22
  doc.setFont('helvetica', 'normal').setFontSize(9)
  const label = party.type === 'customer' ? 'owes you (Dr)' : 'you owe them (Cr)'
  doc.text(
    run === 0 ? 'All settled.' : run > 0 ? `Dr = ${party.name} ${label}` : `Cr = amount ${party.name} has paid in advance / you owe`,
    40, y,
  )
  return doc
}

export async function shareOrSave(doc: jsPDF, filename: string) {
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  doc.save(filename)
}
