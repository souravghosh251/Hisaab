export type PartyType = 'customer' | 'supplier'
export type TxnType = 'gave' | 'got'
/** Where an entry was recorded from (F22 metrics). */
export type TxnSource = 'ledger' | 'quick' | 'repeat' | 'settle' | 'opening'

export interface Profile {
  name: string
  business_name: string
  phone: string
  upi_id: string
}

export interface Party {
  id: string
  name: string
  phone: string
  note: string
  alias?: string // nickname, flat no., landmark (F24)
  pinned?: boolean // shown at the top of Home (F23)
  type: PartyType
  due_date: string | null // YYYY-MM-DD
  created_at: string
}

export interface Txn {
  id: string
  party_id: string
  type: TxnType
  amount: number // integer paise
  note: string
  txn_date: string // YYYY-MM-DD
  source?: TxnSource
  created_at: string
  updated_at: string
}

export const MAX_RUPEES = 1_000_000
export const MAX_PINS = 5
/** Stored as the note of an opening-balance entry (F21); shown translated. */
export const OPENING_NOTE = 'Opening balance'
