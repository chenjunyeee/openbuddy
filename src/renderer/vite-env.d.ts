/// <reference types="vite/client" />

declare global {
  interface Window {
    buddyDesktop?: {
      platform: NodeJS.Platform
      isDev: boolean
      resizeToFit?: (width: number, height: number) => Promise<void>
      sendChat?: (payload: {
        text: string
        companionName: string
        personality: string
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
        companion: {
          name: string
          personality: string
          hatchedAt: number
        }
        hatchLocked: boolean
      }>
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
