import type { Rarity, StoredCompanion } from './types.js'

/** /test 下 /high、/low 调节稀有度、隐藏种、异色等概率 */
export type TestLuck = 'low' | 'normal' | 'high'

/** Standalone mock of Claude Code global config — only what `buddy` needs. */
export type BuddyGlobalConfig = {
  userID?: string
  oauthAccount?: { accountUuid?: string }
  companion?: StoredCompanion
  companionMuted?: boolean
  /** 输入框 /test：按稀有度刷外形时由 companion.roll 读取 */
  testMode?: boolean
  testForcedRarity?: Rarity
  /** 每次刷新外形递增，避免 roll 缓存挡住随机 */
  testRollNonce?: string
  /** 仅 testMode：/high、/low；缺省按 normal */
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
  config = { userID: 'demo-user', companionMuted: false }
}
