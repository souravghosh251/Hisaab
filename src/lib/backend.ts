import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Party, Profile, Txn } from './types'
import { uid } from './money'

export interface Snapshot { profile: Profile; parties: Party[]; txns: Txn[] }
export interface User { id: string; email: string }

export interface Backend {
  mode: 'supabase' | 'local'
  getUser(): Promise<User | null>
  signUp(email: string, password: string, businessName: string): Promise<User>
  signIn(email: string, password: string): Promise<User>
  signOut(): Promise<void>
  load(user: User): Promise<Snapshot>
  saveProfile(user: User, p: Profile): Promise<void>
  addParty(user: User, p: Party): Promise<void>
  updateParty(user: User, p: Party): Promise<void>
  deleteParty(user: User, id: string): Promise<void>
  addTxn(user: User, t: Txn): Promise<void>
  updateTxn(user: User, t: Txn): Promise<void>
  deleteTxn(user: User, id: string): Promise<void>
}

const emptyProfile = (business: string): Profile => ({ name: '', business_name: business, phone: '', upi_id: '' })

/* ---------------- Supabase ---------------- */

function supabaseBackend(sb: SupabaseClient): Backend {
  const toUser = (u: { id: string; email?: string | null }): User => ({ id: u.id, email: u.email ?? '' })
  const must = <T>(r: { data: T; error: { message: string } | null }): T => {
    if (r.error) throw new Error(r.error.message)
    return r.data
  }
  // PostgREST caps responses at 1000 rows, so page through.
  async function fetchAll<T>(table: string, order: string, filter?: (q: any) => any): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select('*').order(order).range(from, from + 999)
      if (filter) q = filter(q)
      const rows = must(await q) as T[]
      out.push(...rows)
      if (rows.length < 1000) return out
    }
  }
  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession()
      return data.session ? toUser(data.session.user) : null
    },
    async signUp(email, password, businessName) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { business_name: businessName } } })
      if (error) throw new Error(error.message)
      if (!data.session || !data.user)
        throw new Error('Check your email to confirm your account, then log in. (Turn off "Confirm email" in Supabase for instant sign-up.)')
      return toUser(data.user)
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return toUser(data.user)
    },
    async signOut() { await sb.auth.signOut() },
    async load(user) {
      let prof = must(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()) as Profile | null
      if (!prof) {
        const { data } = await sb.auth.getUser()
        prof = emptyProfile((data.user?.user_metadata?.business_name as string) ?? '')
        must(await sb.from('profiles').insert({ id: user.id, ...prof }))
      }
      const parties = await fetchAll<Party>('parties', 'created_at', (q) => q.is('deleted_at', null))
      const ids = new Set(parties.map((p) => p.id))
      const txns = (await fetchAll<Txn>('transactions', 'created_at')).filter((t) => ids.has(t.party_id))
      return { profile: prof, parties, txns }
    },
    async saveProfile(user, p) { must(await sb.from('profiles').upsert({ id: user.id, ...p })) },
    async addParty(user, p) { must(await sb.from('parties').insert({ ...p, user_id: user.id })) },
    async updateParty(_u, { id, ...rest }) { must(await sb.from('parties').update(rest).eq('id', id)) },
    async deleteParty(_u, id) { must(await sb.from('parties').update({ deleted_at: new Date().toISOString() }).eq('id', id)) },
    async addTxn(user, t) { must(await sb.from('transactions').insert({ ...t, user_id: user.id })) },
    async updateTxn(_u, { id, ...rest }) { must(await sb.from('transactions').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)) },
    async deleteTxn(_u, id) { must(await sb.from('transactions').delete().eq('id', id)) },
  }
}

/* ---------------- Local demo mode (browser only) ---------------- */

interface LocalDb {
  session: string | null // email
  users: Record<string, { id: string; hash: string; business: string }>
  data: Record<string, Snapshot>
}
const KEY = 'hisaab:db'

async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function localBackend(): Backend {
  const read = (): LocalDb => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '') } catch { return { session: null, users: {}, data: {} } }
  }
  const write = (db: LocalDb) => localStorage.setItem(KEY, JSON.stringify(db))
  const edit = (user: User, fn: (s: Snapshot) => void) => {
    const db = read()
    fn(db.data[user.id])
    write(db)
  }
  return {
    mode: 'local',
    async getUser() {
      const db = read()
      const u = db.session && db.users[db.session]
      return u ? { id: u.id, email: db.session! } : null
    },
    async signUp(email, password, businessName) {
      const db = read()
      const e = email.toLowerCase()
      if (db.users[e]) throw new Error('An account with this email already exists')
      const id = uid()
      db.users[e] = { id, hash: await sha(password), business: businessName }
      db.data[id] = { profile: emptyProfile(businessName), parties: [], txns: [] }
      db.session = e
      write(db)
      return { id, email: e }
    },
    async signIn(email, password) {
      const db = read()
      const e = email.toLowerCase()
      const u = db.users[e]
      if (!u || u.hash !== (await sha(password))) throw new Error('Wrong email or password')
      db.session = e
      write(db)
      return { id: u.id, email: e }
    },
    async signOut() { const db = read(); db.session = null; write(db) },
    async load(user) { return structuredClone(read().data[user.id]) },
    async saveProfile(user, p) { edit(user, (s) => { s.profile = p }) },
    async addParty(user, p) { edit(user, (s) => { s.parties.push(p) }) },
    async updateParty(user, p) { edit(user, (s) => { s.parties = s.parties.map((x) => (x.id === p.id ? p : x)) }) },
    async deleteParty(user, id) {
      edit(user, (s) => { s.parties = s.parties.filter((x) => x.id !== id); s.txns = s.txns.filter((t) => t.party_id !== id) })
    },
    async addTxn(user, t) { edit(user, (s) => { s.txns.push(t) }) },
    async updateTxn(user, t) { edit(user, (s) => { s.txns = s.txns.map((x) => (x.id === t.id ? t : x)) }) },
    async deleteTxn(user, id) { edit(user, (s) => { s.txns = s.txns.filter((t) => t.id !== id) }) },
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const backend: Backend = url && key ? supabaseBackend(createClient(url, key)) : localBackend()
