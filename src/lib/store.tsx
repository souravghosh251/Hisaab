import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { backend, type User } from './backend'
import type { Party, Profile, Txn } from './types'
import { balanceOf, groupByParty, uid } from './money'

interface Store {
  mode: 'supabase' | 'local'
  user: User | null
  ready: boolean
  profile: Profile
  parties: Party[]
  txns: Txn[]
  byParty: Map<string, Txn[]>
  balance: (partyId: string) => number
  signUp: (email: string, pw: string, business: string) => Promise<void>
  signIn: (email: string, pw: string) => Promise<void>
  signOut: () => Promise<void>
  saveProfile: (p: Profile) => Promise<void>
  saveParty: (p: Omit<Party, 'id' | 'created_at'> & { id?: string }) => Promise<Party>
  deleteParty: (id: string) => Promise<void>
  saveTxn: (t: Omit<Txn, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<Txn>
  deleteTxn: (id: string) => Promise<void>
}

const blank: Profile = { name: '', business_name: '', phone: '', upi_id: '' }
const Ctx = createContext<Store>(null as never)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile>(blank)
  const [parties, setParties] = useState<Party[]>([])
  const [txns, setTxns] = useState<Txn[]>([])

  const hydrate = useCallback(async (u: User) => {
    const s = await backend.load(u)
    setUser(u); setProfile(s.profile); setParties(s.parties); setTxns(s.txns)
  }, [])

  useEffect(() => {
    backend.getUser()
      .then((u) => (u ? hydrate(u) : undefined))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [hydrate])

  const byParty = useMemo(() => groupByParty(txns), [txns])
  const need = () => { if (!user) throw new Error('Not signed in'); return user }

  const value: Store = {
    mode: backend.mode, user, ready, profile, parties, txns, byParty,
    balance: (id) => balanceOf(byParty.get(id) ?? []),
    async signUp(e, pw, b) { await hydrate(await backend.signUp(e, pw, b)) },
    async signIn(e, pw) { await hydrate(await backend.signIn(e, pw)) },
    async signOut() {
      await backend.signOut()
      setUser(null); setParties([]); setTxns([]); setProfile(blank)
    },
    async saveProfile(p) { await backend.saveProfile(need(), p); setProfile(p) },
    async saveParty(input) {
      const u = need()
      if (input.id) {
        const prev = parties.find((p) => p.id === input.id)!
        const next: Party = { ...prev, ...input, id: prev.id }
        await backend.updateParty(u, next)
        setParties((l) => l.map((p) => (p.id === next.id ? next : p)))
        return next
      }
      const next: Party = { ...input, id: uid(), created_at: new Date().toISOString() }
      await backend.addParty(u, next)
      setParties((l) => [...l, next])
      return next
    },
    async deleteParty(id) {
      await backend.deleteParty(need(), id)
      setParties((l) => l.filter((p) => p.id !== id))
      setTxns((l) => l.filter((t) => t.party_id !== id))
    },
    async saveTxn(input) {
      const u = need()
      const now = new Date().toISOString()
      if (input.id) {
        const prev = txns.find((t) => t.id === input.id)!
        const next: Txn = { ...prev, ...input, id: prev.id, updated_at: now }
        await backend.updateTxn(u, next)
        setTxns((l) => l.map((t) => (t.id === next.id ? next : t)))
        return next
      }
      const next: Txn = { ...input, id: uid(), created_at: now, updated_at: now }
      await backend.addTxn(u, next)
      setTxns((l) => [...l, next])
      return next
    },
    async deleteTxn(id) {
      await backend.deleteTxn(need(), id)
      setTxns((l) => l.filter((t) => t.id !== id))
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
