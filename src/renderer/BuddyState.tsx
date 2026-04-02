import React, {
  createContext,
  useContext,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector.js'
import type { BuddyAppState } from '@buddy/types.js'

type BuddyStore = {
  getState: () => BuddyAppState
  subscribe: (listener: () => void) => () => void
  setState: Dispatch<SetStateAction<BuddyAppState>>
}

function createBuddyStore(initial?: Partial<BuddyAppState>): BuddyStore {
  let state: BuddyAppState = { ...initial }
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setState: (action: SetStateAction<BuddyAppState>) => {
      const next =
        typeof action === 'function'
          ? (action as (prev: BuddyAppState) => BuddyAppState)(state)
          : action
      if (Object.is(next, state)) return
      state = next
      listeners.forEach(l => l())
    },
  }
}

const BuddyCtx = createContext<BuddyStore | null>(null)

export function BuddyStateProvider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState?: Partial<BuddyAppState>
}): React.ReactElement {
  const store = useMemo(() => createBuddyStore(initialState), [])
  return <BuddyCtx.Provider value={store}>{children}</BuddyCtx.Provider>
}

export function useAppState<T>(
  selector: (s: BuddyAppState) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  const store = useContext(BuddyCtx)
  if (!store) throw new Error('BuddyStateProvider missing')
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector,
    equalityFn ?? ((a, b) => Object.is(a, b)),
  )
}

export function useSetAppState(): Dispatch<SetStateAction<BuddyAppState>> {
  const store = useContext(BuddyCtx)
  if (!store) throw new Error('BuddyStateProvider missing')
  return store.setState
}
