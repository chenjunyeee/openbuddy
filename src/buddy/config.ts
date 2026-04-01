import type { StoredCompanion } from './types.js'

/** Standalone mock of Claude Code global config — only what `buddy` needs. */
export type BuddyGlobalConfig = {
  userID?: string
  oauthAccount?: { accountUuid?: string }
  companion?: StoredCompanion
  companionMuted?: boolean
}

let config: BuddyGlobalConfig = {
  userID: 'demo-user',
  companionMuted: false,
}

export function getGlobalConfig(): BuddyGlobalConfig {
  return config
}

export function setGlobalConfig(patch: Partial<BuddyGlobalConfig>): void {
  config = { ...config, ...patch }
}

export function resetConfig(): void {
  config = { userID: 'demo-user', companionMuted: false }
}
