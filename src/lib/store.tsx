import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backend, type Snapshot, type User } from './backend'
import { MAX_PINS, type Party, type Profile, type Txn } from './types'
import { balanceOf, groupByParty, uid } from './money'
import { applyOp, flush, isNetworkError, readOutbox, runOp, writeOutbox, type Op, type Queued } from './outbox'

type Queuable<T> = T & { queued?: boolean }

interface Store {
  mode: 'supabase' | 'local'
  user: User | null
  ready: boolean
  profile: Profile
  parties: Party[]
  txns: Txn[]
  byParty: Map<string, Txn[]>
  balance: (partyId: string) => number
  /** Newest activity per party: last entry created/edited, else when the party was added (F23). */
  lastActivity: (partyId: string) => string
  // F26 save queue
  pending: number
  pendingIds: Set<string>
  syncError: string | null
  retrySync: () => void
  discardFailed: () => Promise<void>
  // Auth (F27)
  recovery: boolean
  endRecovery: () => void
  signUp: (email: string, pw: string, business: string) => Promise<void>
  signIn: (email: string, pw: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (pw: string) => Promise<void>
  signOut: () => Promise<void>
  // Data
  saveProfile: (p: Profile) => Promise<void>
  saveParty: (p: Omit<Party, 'id' | 'created_at'> & { id?: string }) => Promise<Queuable<Party>>
  togglePin: (id: string) => Promise<boolean>
  deleteParty: (id: string) => Promise<void>
  /** `ms`: time the owner took to record it (from opening the entry sheet / starting to type), for F22. */
  saveTxn: (t: Omit<Txn, 'id' | 'created_at' | 'updated_at'> & { id?: string }, meta?: { ms?: number; track?: false }) => Promise<Queuable<Txn>>
  deleteTxn: (id: string) => Promise<void>
  /** F22: first-party usage event. Props must never contain names, phones or amounts. */
  track: (name: string, props?: Record<string, unknown>) => void
}

const blank: Profile = { name: '', business_name: '', phone: '', upi_id: '' }
const empty: Snapshot = { profile: blank, parties: [], txns: [] }
const Ctx = createContext<Store>(null as never)
export const useStore = () => useContext(Ctx)

const cloud = backend.mode === 'supabase'
// Last known data, so the app opens offline. Cloud mode only; demo mode already lives in the browser.
const cacheKey = (id: string) => `hisaab:cache:${id}`
const readCache = (id: string): Snapshot | null => { try { return JSON.parse(localStorage.getItem(cacheKey(id)) ?? 'null') } catch { return null } }
// Events that could not be sent offline; dropped (not retried) if the server rejects them.
type Ev = { name: string; props: Record<string, unknown>; at: string }
const evKey = (id: string) => `hisaab:events:${id}`
const readEvents = (id: string): Ev[] => { try { return JSON.parse(localStorage.getItem(evKey(id)) ?? '[]') } catch { return [] } }

// Read before Supabase finishes the redirect: a password-reset link returns with ?reset=1.
const resetLink = new URLSearchParams(location.search).has('reset')

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const userRef = useRef<User | null>(null)
  const [ready, setReady] = useState(false)
  const [snap, setSnap] = useState<Snapshot>(empty)
  const [queue, setQueue] = useState<Queued[]>([])
  const queueRef = useRef<Queued[]>([])
  const flushing = useRef(false)
  const [recovery, setRecovery] = useState(resetLink)

  const setQ = useCallback((q: Queued[]) => {
    queueRef.current = q
    if (userRef.current) writeOutbox(userRef.current.id, q)
    setQueue(q)
  }, [])

  const hydrate = useCallback(async (u: User) => {
    let s: Snapshot
    try {
      s = await backend.load(u)
      if (cloud) localStorage.setItem(cacheKey(u.id), JSON.stringify(s))
    } catch (e) {
      const c = cloud ? readCache(u.id) : null
      if (!c || !isNetworkError(e)) throw e
      s = c
    }
    const q = readOutbox(u.id)
    const { created, ...rest } = s
    s = rest
    for (const it of q) s = applyOp(s, it.op) // unsynced changes stay visible after a reload
    userRef.current = u
    queueRef.current = q
    setQueue(q); setUser(u); setSnap(s)
    return !!created
  }, [])

  useEffect(() => {
    backend.onPasswordRecovery(() => setRecovery(true))
    backend.getUser()
      .then(async (u) => {
        // A profile created on load means a first sign-in through Google (email sign-ups track below).
        if (!u) return
        if (await hydrate(u)) track('signup', { method: 'google' })
        track('app_open')
      })
      .catch(() => {})
      .finally(() => {
        setReady(true)
        // Drop ?code= / ?reset= left by an auth redirect so a reload does not reuse them.
        if (location.search) history.replaceState(null, '', location.pathname + location.hash)
      })
  }, [hydrate])

  // Keep the offline cache current (it includes queued changes; replaying them is idempotent).
  useEffect(() => { if (cloud && user) localStorage.setItem(cacheKey(user.id), JSON.stringify(snap)) }, [snap, user])

  const flushNow = useCallback(async () => {
    const u = userRef.current
    if (!u || flushing.current) return
    flushing.current = true
    try {
      const sent = queueRef.current
      if (sent.length && !sent[0].error) {
        const rest = await flush(backend, u, sent)
        setQ([...rest, ...queueRef.current.slice(sent.length)]) // keep anything queued meanwhile
      }
      const evs = readEvents(u.id)
      if (evs.length) {
        let i = 0
        for (; i < evs.length; i++) {
          try { await backend.logEvent(u, evs[i].name, evs[i].props, evs[i].at) }
          catch (e) { if (isNetworkError(e)) break }
        }
        const left = readEvents(u.id).slice(i)
        if (left.length) localStorage.setItem(evKey(u.id), JSON.stringify(left)); else localStorage.removeItem(evKey(u.id))
      }
    } finally { flushing.current = false }
  }, [setQ])

  useEffect(() => {
    if (!user) return
    flushNow()
    const on = () => flushNow()
    window.addEventListener('online', on)
    const iv = setInterval(flushNow, 20_000)
    return () => { window.removeEventListener('online', on); clearInterval(iv) }
  }, [user, flushNow])

  const need = () => { if (!userRef.current) throw new Error('Not signed in'); return userRef.current }

  /** Send now, or queue when offline (or when older changes are still waiting). Returns true if queued. */
  async function commit(op: Op): Promise<boolean> {
    const u = need()
    let queued = queueRef.current.length > 0
    if (!queued) {
      try { await runOp(backend, u, op) }
      catch (e) { if (!isNetworkError(e)) throw e; queued = true }
    }
    if (queued) setQ([...queueRef.current, { op }])
    setSnap((s) => applyOp(s, op))
    return queued
  }

  const track = useCallback((name: string, props: Record<string, unknown> = {}) => {
    const u = userRef.current
    if (!u) return
    const at = new Date().toISOString()
    backend.logEvent(u, name, props, at).catch((e) => {
      if (!isNetworkError(e)) return // analytics must never break the app
      const evs = [...readEvents(u.id), { name, props, at }].slice(-200)
      localStorage.setItem(evKey(u.id), JSON.stringify(evs))
    })
  }, [])

  const byParty = useMemo(() => groupByParty(snap.txns), [snap.txns])
  const activity = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of snap.parties) m.set(p.id, p.created_at)
    for (const t of snap.txns) {
      const at = t.updated_at > t.created_at ? t.updated_at : t.created_at
      if (at > (m.get(t.party_id) ?? '')) m.set(t.party_id, at)
    }
    return m
  }, [snap.parties, snap.txns])
  const pendingIds = useMemo(() => {
    const s = new Set<string>()
    for (const { op } of queue) {
      if ('t' in op) s.add(op.t.id)
      else if ('p' in op && 'id' in op.p) s.add((op.p as Party).id)
    }
    return s
  }, [queue])

  const value: Store = {
    mode: backend.mode, user, ready, ...snap, byParty,
    balance: (id) => balanceOf(byParty.get(id) ?? []),
    lastActivity: (id) => activity.get(id) ?? '',
    pending: queue.length,
    pendingIds,
    syncError: queue[0]?.error ?? null,
    retrySync() {
      if (queueRef.current[0]?.error) setQ([{ op: queueRef.current[0].op }, ...queueRef.current.slice(1)])
      flushNow()
    },
    async discardFailed() {
      setQ(queueRef.current.slice(1))
      // The discarded change is still shown locally; reload from the server to drop it.
      if (userRef.current) await hydrate(userRef.current).catch(() => {})
    },
    recovery,
    endRecovery: () => setRecovery(false),
    async signUp(e, pw, b) {
      await hydrate(await backend.signUp(e, pw, b))
      track('signup', { method: 'email' })
      track('app_open') // the first session starts here, not on a page load
    },
    async signIn(e, pw) { await hydrate(await backend.signIn(e, pw)); track('app_open') },
    signInWithGoogle: () => backend.signInWithGoogle(),
    sendPasswordReset: (e) => backend.sendPasswordReset(e),
    async updatePassword(pw) { await backend.updatePassword(pw); setRecovery(false) },
    async signOut() {
      const u = userRef.current
      await backend.signOut()
      // The outbox is kept: unsynced entries go up on the next sign-in on this phone.
      if (u) localStorage.removeItem(cacheKey(u.id))
      userRef.current = null; queueRef.current = []
      setUser(null); setQueue([]); setSnap(empty)
    },
    async saveProfile(p) { await commit({ k: 'saveProfile', p }) },
    async saveParty(input) {
      if (input.id) {
        const prev = snap.parties.find((p) => p.id === input.id)!
        const next: Party = { ...prev, ...input, id: prev.id }
        return { ...next, queued: await commit({ k: 'updateParty', p: next }) }
      }
      const next: Party = { alias: '', pinned: false, ...input, id: uid(), created_at: new Date().toISOString() }
      return { ...next, queued: await commit({ k: 'addParty', p: next }) }
    },
    async togglePin(id) {
      const p = snap.parties.find((x) => x.id === id)
      if (!p) return false
      if (!p.pinned && snap.parties.filter((x) => x.pinned && x.type === p.type).length >= MAX_PINS) return false
      await commit({ k: 'updateParty', p: { ...p, pinned: !p.pinned } })
      return true
    },
    async deleteParty(id) { await commit({ k: 'deleteParty', id }) },
    async saveTxn(input, meta) {
      const now = new Date().toISOString()
      if (input.id) {
        const prev = snap.txns.find((t) => t.id === input.id)!
        const next: Txn = { ...prev, ...input, id: prev.id, updated_at: now }
        return { ...next, queued: await commit({ k: 'updateTxn', t: next }) }
      }
      const next: Txn = { source: 'ledger', ...input, id: uid(), created_at: now, updated_at: now }
      const queued = await commit({ k: 'addTxn', t: next })
      if (next.source !== 'opening' && meta?.track !== false) {
        const ms = meta?.ms !== undefined ? Math.round(meta.ms) : undefined
        track('entry_saved', { source: next.source, type: next.type, queued, ...(ms !== undefined && { ms }) })
      }
      return { ...next, queued }
    },
    async deleteTxn(id) { await commit({ k: 'deleteTxn', id }) },
    track,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
