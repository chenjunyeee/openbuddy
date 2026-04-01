export const RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const
export type Rarity = (typeof RARITIES)[number]

const c = String.fromCharCode

export const duck = c(0x64, 0x75, 0x63, 0x6b) as 'duck'
export const goose = c(0x67, 0x6f, 0x6f, 0x73, 0x65) as 'goose'
export const blob = c(0x62, 0x6c, 0x6f, 0x62) as 'blob'
export const cat = c(0x63, 0x61, 0x74) as 'cat'
export const dragon = c(0x64, 0x72, 0x61, 0x67, 0x6f, 0x6e) as 'dragon'
export const octopus = c(0x6f, 0x63, 0x74, 0x6f, 0x70, 0x75, 0x73) as 'octopus'
export const owl = c(0x6f, 0x77, 0x6c) as 'owl'
export const penguin = c(0x70, 0x65, 0x6e, 0x67, 0x75, 0x69, 0x6e) as 'penguin'
export const turtle = c(0x74, 0x75, 0x72, 0x74, 0x6c, 0x65) as 'turtle'
export const snail = c(0x73, 0x6e, 0x61, 0x69, 0x6c) as 'snail'
export const ghost = c(0x67, 0x68, 0x6f, 0x73, 0x74) as 'ghost'
export const axolotl = c(0x61, 0x78, 0x6f, 0x6c, 0x6f, 0x74, 0x6c) as 'axolotl'
export const capybara = c(
  0x63,
  0x61,
  0x70,
  0x79,
  0x62,
  0x61,
  0x72,
  0x61,
) as 'capybara'
export const cactus = c(0x63, 0x61, 0x63, 0x74, 0x75, 0x73) as 'cactus'
export const robot = c(0x72, 0x6f, 0x62, 0x6f, 0x74) as 'robot'
export const rabbit = c(0x72, 0x61, 0x62, 0x62, 0x69, 0x74) as 'rabbit'
export const mushroom = c(
  0x6d,
  0x75,
  0x73,
  0x68,
  0x72,
  0x6f,
  0x6f,
  0x6d,
) as 'mushroom'
export const chonk = c(0x63, 0x68, 0x6f, 0x6e, 0x6b) as 'chonk'
export const fox = c(0x66, 0x6f, 0x78) as 'fox'
export const frog = c(0x66, 0x72, 0x6f, 0x67) as 'frog'
export const seal = c(0x73, 0x65, 0x61, 0x6c) as 'seal'
export const bee = c(0x62, 0x65, 0x65) as 'bee'
export const bear = c(0x62, 0x65, 0x61, 0x72) as 'bear'

export const SPECIES = [
  duck,
  goose,
  blob,
  cat,
  dragon,
  octopus,
  owl,
  penguin,
  turtle,
  snail,
  ghost,
  axolotl,
  capybara,
  cactus,
  robot,
  rabbit,
  mushroom,
  fox,
  frog,
  seal,
  bee,
  bear,
  chonk,
] as const
export type Species = (typeof SPECIES)[number]

export const EYES = ['·', '✦', '×', '◉', '@', '°'] as const
export type Eye = (typeof EYES)[number]

export const HATS = [
  'none',
  'crown',
  'tophat',
  'propeller',
  'halo',
  'wizard',
  'beanie',
  'tinyduck',
] as const
export type Hat = (typeof HATS)[number]

export const STAT_NAMES = [
  'DEBUGGING',
  'PATIENCE',
  'CHAOS',
  'WISDOM',
  'SNARK',
] as const
export type StatName = (typeof STAT_NAMES)[number]

export type CompanionBones = {
  rarity: Rarity
  species: Species
  eye: Eye
  hat: Hat
  shiny: boolean
  stats: Record<StatName, number>
}

export type CompanionSoul = {
  name: string
  personality: string
}

export type Companion = CompanionBones &
  CompanionSoul & {
    hatchedAt: number
  }

export type StoredCompanion = CompanionSoul & { hatchedAt: number }

export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
} as const satisfies Record<Rarity, number>

export const RARITY_STARS = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★',
} as const satisfies Record<Rarity, string>

/** Ink / chalk-friendly color names for standalone terminal demo */
export const RARITY_COLORS = {
  common: 'gray',
  uncommon: 'green',
  rare: 'magenta',
  epic: 'cyan',
  legendary: 'yellow',
} as const satisfies Record<Rarity, string>

/**
 * 与 Claude Code buddy 一致：`RARITY_COLORS` → `inactive|success|permission|autoAccept|warning`
 * 色值摘自 claude-code-2.1.88 `src/utils/theme.ts` 的 lightTheme / darkTheme。
 */
export const BUDDY_RARITY_RGB_LIGHT: Record<Rarity, string> = {
  common: '#666666',
  uncommon: '#2c7a39',
  rare: '#5769f7',
  epic: '#8700ff',
  legendary: '#966c1e',
}
export const BUDDY_RARITY_RGB_DARK: Record<Rarity, string> = {
  common: '#999999',
  uncommon: '#4eba65',
  rare: '#b1b9f9',
  epic: '#af87ff',
  legendary: '#ffc107',
}
/** 抚宠时爱心行用 `autoAccept`（与 CompanionSprite 一致） */
export const BUDDY_HEART_RGB_LIGHT = '#8700ff'
export const BUDDY_HEART_RGB_DARK = '#af87ff'

export type BuddyAppState = {
  companionPetAt?: number
  /** 与 global testMode 同步：占位符与加载中输入白名单 */
  testMode?: boolean
  /** 桌宠旁气泡：Claude 回复或正在请求 */
  chatLoading?: boolean
  chatBubble?: string
  /** OpenClaw 分步引导当前步（undefined 表示未在引导中） */
  openclawGuideStep?: number
  /** 主进程：网关 URL + Token 已就绪 */
  openclawConfigured?: boolean
  /** 主进程：buddy-bootstrap-pending 已应用后锁定，不可再孵化 */
  hatchLocked?: boolean
  /** /c：切换夜间配色（桌宠与面板） */
  nightMode?: boolean
  /**
   * 自动：`sleep`＝≥5min 无对话；`playful`＝连续对话满 5min（轮次间隔≤1min）且末次活动＜1min。
   */
  petMood?: 'sleep' | 'playful'
  /** 最近一次用户发话或助手回复结束的时间戳（用于自动心情） */
  lastConversationActivityAt?: number
  /**
   * 当前「连续对话」段的起点：与上次活动时间间隔超过 1min 则重开一段。
   */
  dialogueStreakStartAt?: number
}
