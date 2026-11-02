import type { Backend, Snapshot, User } from './backend'
import type { Party, Profile, Txn } from './types'

/**
 * F26 save queue. Every change is an Op. When the network is down the Op waits in a
 * per-user outbox in localStorage and is replayed in order once back online. Nothing is
 * dropped silently: an Op the server rejects stays at the head with its error until the
 * owner retries or discards it.
 */
export type Op =
  | { k: 'saveProfile'; p: Profile }
  | { k: 'addParty'; p: Party }
  | { k: 'updateParty'; p: Party }
  | { k: 'deleteParty'; id: string }
  | { k: 'addTxn'; t: Txn }
  | { k: 'updateTxn'; t: Txn }
  | { k: 'deleteTxn'; id: string }

export interface Queued { op: Op; error?: string }

/** Apply an Op to local state. Idempotent, so replaying the outbox over a cached snapshot is safe. */
export function applyOp(s: Snapshot, op: Op): Snapshot {
  const upsert = <T extends { id: string }>(l: T[], x: T) => (l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [...l, x])
  switch (op.k) {
    case 'saveProfile': return { ...s, profile: op.p }
    case 'addParty': case 'updateParty': return { ...s, parties: upsert(s.parties, op.p) }
    case 'deleteParty': return { ...s, parties: s.parties.filter((p) => p.id !== op.id), txns: s.txns.filter((t) => t.party_id !== op.id) }
    case 'addTxn': case 'updateTxn': return { ...s, txns: upsert(s.txns, op.t) }
    case 'deleteTxn': return { ...s, txns: s.txns.filter((t) => t.id !== op.id) }
  }
}

export function runOp(b: Backend, u: User, op: Op): Promise<void> {
  switch (op.k) {
    case 'saveProfile': return b.saveProfile(u, op.p)
    case 'addParty': return b.addParty(u, op.p)
    case 'updateParty': return b.updateParty(u, op.p)
    case 'deleteParty': return b.deleteParty(u, op.id)
    case 'addTxn': return b.addTxn(u, op.t)
    case 'updateTxn': return b.updateTxn(u, op.t)
    case 'deleteTxn': return b.deleteTxn(u, op.id)
  }
}

/** True when a failure means "no connection" rather than "the server said no". */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const m = String((e as Error)?.message ?? e)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|timed? ?out/i.test(m)
}
/** A retried insert that already reached the server before the connection dropped. */
const alreadyThere = (op: Op, e: unknown) => (op.k === 'addTxn' || op.k === 'addParty') && /duplicate key|23505/i.test(String((e as Error)?.message ?? e))

const key = (userId: string) => `hisaab:outbox:${userId}`
export function readOutbox(userId: string): Queued[] {
  try { return JSON.parse(localStorage.getItem(key(userId)) ?? '[]') } catch { return [] }
}
export function writeOutbox(userId: string, q: Queued[]) {
  if (q.length) localStorage.setItem(key(userId), JSON.stringify(q))
  else localStorage.removeItem(key(userId))
}

/**
 * Send queued Ops in order. Stops at the first network error (try again later) or
 * server rejection (kept, with its error, at the head). Returns the remaining queue.
 */
export async function flush(b: Backend, u: User, q: Queued[]): Promise<Queued[]> {
  const rest = [...q]
  while (rest.length) {
    const head = rest[0]
    try {
      await runOp(b, u, head.op)
    } catch (e) {
      if (!alreadyThere(head.op, e)) {
        if (!isNetworkError(e)) rest[0] = { ...head, error: (e as Error).message }
        return rest
      }
    }
    rest.shift()
  }
  return rest
}
