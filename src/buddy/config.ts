import type { Rarity, StoredCompanion } from './types.js'

/** 预留：测试模式下调节稀有度/异色等（当前无指令写入，孵蛋走默认权重） */
export type TestLuck = 'low' | 'normal' | 'high'

/** Standalone mock of Claude Code global config — only what `buddy` needs. */
export type BuddyGlobalConfig = {
  userID?: string
  oauthAccount?: { accountUuid?: string }
  companion?: StoredCompanion
  companionMuted?: boolean
  /** /test：仅用于解锁 /reboot 等（抽卡仅孵蛋） */
  testMode?: boolean
  /** 预留： companion.roll 强制稀有度（当前无 UI） */
  testForcedRarity?: Rarity
  /** 预留：刷新 roll 缓存 nonce */
  testRollNonce?: string
  /** 预留：testLuck（当前无 UI） */
  testLuck?: TestLuck
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
  config = { userID: 'demo-user', companion: undefined, companionMuted: false }
}
