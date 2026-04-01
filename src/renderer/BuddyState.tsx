import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { BuddyAppState } from '@buddy/types.js'

type Ctx = {
  state: BuddyAppState
  setState: Dispatch<SetStateAction<BuddyAppState>>
}

const BuddyCtx = createContext<Ctx | null>(null)

export function BuddyStateProvider({
  children,
  initialState,
}: {
  children: React.ReactNode
  initialState?: Partial<BuddyAppState>
}): React.ReactElement {
  const [state, setState] = useState<BuddyAppState>(() => ({
    ...initialState,
  }))
  const value = useMemo(() => ({ state, setState }), [state])
  return <BuddyCtx.Provider value={value}>{children}</BuddyCtx.Provider>
}

export function useAppState<T>(sel: (s: BuddyAppState) => T): T {
  const c = useContext(BuddyCtx)
  if (!c) throw new Error('BuddyStateProvider missing')
  return sel(c.state)
}

export function useSetAppState(): Dispatch<SetStateAction<BuddyAppState>> {
  const c = useContext(BuddyCtx)
  if (!c) throw new Error('BuddyStateProvider missing')
  return c.setState
}
