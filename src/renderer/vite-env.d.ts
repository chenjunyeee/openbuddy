/// <reference types="vite/client" />

declare global {
  interface Window {
    buddyDesktop?: {
      platform: NodeJS.Platform
      isDev: boolean
      resizeToFit?: (width: number, height: number) => Promise<void>
      sendSoloPointerState?: (
        payload:
          | { mode: 'disabled' }
          | { solo: true; overPet: boolean }
          | { solo: false; overShell: boolean },
      ) => void
      subscribeChatStream?: (
        handler: (payload: {
          streamSessionId: number
          kind: 'delta' | 'done' | 'error'
          delta?: string
          message?: string
        }) => void,
      ) => () => void
      subscribeWindowMoved?: (handler: () => void) => () => void
      sendChat?: (payload: {
        text: string
        companionName: string
        personality: string
        /** 与流式 IPC 对齐，防重复订阅或并发错序 */
        streamSessionId?: number
      }) => Promise<{
        ok: boolean
        text?: string
        error?: string
        /** 未配置 OpenClaw：由前端起单步引导 */
        needOpenclawGuide?: boolean
      }>
      resetChatSession?: () => Promise<void>
      getOpenclawStatus?: () => Promise<{ configured: boolean }>
      saveOpenclawConfig?: (payload: {
        url?: string
        token?: string
        clear?: boolean
      }) => Promise<{ ok: boolean; error?: string }>
      getProfile?: () => Promise<{
        userID: string
        companion?:
          | {
              name: string
              personality: string
              hatchedAt: number
            }
          | undefined
        hatchLocked: boolean
      }>
      saveProfile?: (payload: {
        clearCompanion?: boolean
        companion?: {
          name: string
          personality: string
          hatchedAt: number
        }
      }) => Promise<{ ok: boolean; error?: string }>
      getPaths?: () => Promise<{
        userData: string
        bootstrapPending: string
        profile: string
        openclaw: string
        bootstrapApplied: string
      }>
    }
  }
}

export {}
