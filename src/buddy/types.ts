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
export const hamster = c(
  0x68,
  0x61,
  0x6d,
  0x73,
  0x74,
  0x65,
  0x72,
) as 'hamster'
export const dog = c(0x64, 0x6f, 0x67) as 'dog'
export const koala = c(0x6b, 0x6f, 0x61, 0x6c, 0x61) as 'koala'
export const sheep = c(0x73, 0x68, 0x65, 0x65, 0x70) as 'sheep'
export const otter = c(0x6f, 0x74, 0x74, 0x65, 0x72) as 'otter'
export const jelly = c(0x6a, 0x65, 0x6c, 0x6c, 0x79) as 'jelly'
export const skull = c(0x73, 0x6b, 0x75, 0x6c, 0x6c) as 'skull'
export const moon = c(0x6d, 0x6f, 0x6f, 0x6e) as 'moon'
export const crystal = c(
  0x63,
  0x72,
  0x79,
  0x73,
  0x74,
  0x61,
  0x6c,
) as 'crystal'
export const dice = c(0x64, 0x69, 0x63, 0x65) as 'dice'
export const voidling = c(
  0x76,
  0x6f,
  0x69,
  0x64,
  0x6c,
  0x69,
  0x6e,
  0x67,
) as 'voidling'

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
  hamster,
  dog,
  koala,
  sheep,
  otter,
  jelly,
  chonk,
  skull,
  moon,
  crystal,
  dice,
  voidling,
] as const
export type Species = (typeof SPECIES)[number]

/** 孵化 / roll 算法使用的物种池（不含隐藏种 `voidling`） */
export const SPECIES_ROLLABLE = SPECIES.filter(
  (s): s is Exclude<Species, typeof voidling> => s !== voidling,
)

/** 在 `SPECIES_ROLLABLE` 结果之上额外命中隐藏种；与稀有度 roll 独立 */
export const SECRET_SPECIES_CHANCE = 0.005

export const EYES = ['·', '✦', '×', '◉', '@', '°', '◇', '▽', '◕'] as const
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
  'headphones',
  'beret',
  'antenna',
  'heartpin',
  'sprout',
  'bowhat',
  'visor',
] as const
export type Hat = (typeof HATS)[number]

/** 帽子独立稀有度：`astral` 为极低概率的幻彩帽（渐变 + 特效，与宠物本体稀有度分开 roll） */
export const HAT_RARITIES = ['standard', 'astral'] as const
export type HatRarity = (typeof HAT_RARITIES)[number]

/** 随宠物稀有度提高 astral 帽概率（common 无帽，此处仅非常规档） */
export const HAT_ASTRAL_CHANCE: Record<Exclude<Rarity, 'common'>, number> = {
  uncommon: 0.01,
  rare: 0.02,
  epic: 0.04,
  legendary: 0.075,
}

/** 脚底装饰已移除（原围巾/蝴蝶结等不再 roll）；字段保留为 `'none'` 以兼容结构 */
export const CHARMS = ['none'] as const
export type Charm = (typeof CHARMS)[number]

export const STAT_NAMES = [
  'DEBUGGING',
  'PATIENCE',
  'CHAOS',
  'WISDOM',
  'SNARK',
] as const
export type StatName = (typeof STAT_NAMES)[number]

/**
 * `/c` 循环：透明正常 → 透明夜间 → 精灵柔和白底 → 精灵柔和黑底（仅精灵区光晕，非整窗带框）
 */
export const SHELL_APPEARANCES = [
  'transparent',
  'transparent-dark',
  'sprite-backdrop-light',
  'sprite-backdrop-dark',
] as const
export type ShellAppearance = (typeof SHELL_APPEARANCES)[number]

export type CompanionBones = {
  rarity: Rarity
  species: Species
  eye: Eye
  hat: Hat
  hatRarity: HatRarity
  charm: Charm
  shiny: boolean
  stats: Record<StatName, number>
}

/** `name` 恒等于 roll 出的英文物种 id（如 `duck`），与 `CompanionBones.species` 一致 */
export type CompanionSoul = {
  name: string
  personality: string
}

export type Companion = CompanionBones &
  CompanionSoul & {
    hatchedAt: number
  }

export type StoredCompanion = CompanionSoul & { hatchedAt: number }

/** 单抽权重之和 100 → Common 约 30%，抬高绿蓝紫橙出率以偏「抽卡」手感 */
export const RARITY_WEIGHTS = {
  common: 30,
  uncommon: 33,
  rare: 24,
  epic: 10,
  legendary: 3,
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
  /** 输入框失焦超过阈值后隐藏气泡（不删 `chatBubble`，聚焦输入可再显示） */
  chatBubbleIdleHidden?: boolean
  /** OpenClaw 分步引导当前步（undefined 表示未在引导中） */
  openclawGuideStep?: number
  /** 主进程：网关 URL + Token 已就绪 */
  openclawConfigured?: boolean
  /** 主进程：buddy-bootstrap-pending 已应用后锁定，不可再孵化 */
  hatchLocked?: boolean
  /** profile 已有 companion（或内存孵化完成），为 false 时仅显示孵化台 */
  hasHatchedCompanion?: boolean
  /** /c：在 `SHELL_APPEARANCES`（透明昼夜 + 精灵软白/软黑底）间循环 */
  shellAppearance?: ShellAppearance
  /** 自动：`sleep`＝≥15s 无对话且无抚摸。✦ 星星仅在与气泡「在想中」同步的加载阶段显示（见 PetView）。 */
  petMood?: 'sleep'
  /** 最近一次用户发话或助手回复结束的时间戳（用于睡眠计时） */
  lastConversationActivityAt?: number
  /** 最近一次拖窗抚摸精灵（`buddy-window-moved`）的时间戳；与对话合并后用于「睡眠」计时 */
  lastPetAttentionAt?: number
  /** `/stat`：五条属性面板（非聊天气泡；与 Claude Code 桌宠同色语义） */
  statPanelOpen?: boolean
  /** 仅桌宠：隐藏输入框与左侧槽（气泡/属性）；右下开关可随时恢复 */
  petSoloMode?: boolean
  /** `/weather`：为 true 时隐藏顶栏云朵（保留顶距，避免 /c 白黑衬底被纵向压扁） */
  petCloudsHidden?: boolean
}
