export type PartyType = 'customer' | 'supplier'
export type TxnType = 'gave' | 'got'

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
  created_at: string
  updated_at: string
}

export const MAX_RUPEES = 1_000_000
