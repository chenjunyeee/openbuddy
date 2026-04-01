import { getGlobalConfig, type TestLuck } from './config.js'
import {
  type Companion,
  type CompanionBones,
  EYES,
  HAT_ASTRAL_CHANCE,
  type Hat,
  type HatRarity,
  HATS,
  RARITIES,
  RARITY_WEIGHTS,
  type Rarity,
  SECRET_SPECIES_CHANCE,
  SPECIES_ROLLABLE,
  STAT_NAMES,
  voidling,
  type StatName,
} from './types.js'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/** 测试模式「欧气」：抬高/压低高稀有与隐藏、异色权重 */
const RARITY_WEIGHTS_TEST_HIGH = {
  common: 45,
  uncommon: 28,
  rare: 15,
  epic: 8,
  legendary: 4,
} as const satisfies Record<Rarity, number>

const RARITY_WEIGHTS_TEST_LOW = {
  common: 72,
  uncommon: 18,
  rare: 7,
  epic: 2,
  legendary: 1,
} as const satisfies Record<Rarity, number>

function activeTestLuck(): TestLuck | undefined {
  const cfg = getGlobalConfig()
  if (!cfg.testMode) return undefined
  return cfg.testLuck ?? 'normal'
}

function rarityWeightsForRoll(): Record<Rarity, number> {
  const luck = activeTestLuck()
  if (luck === 'high') return RARITY_WEIGHTS_TEST_HIGH
  if (luck === 'low') return RARITY_WEIGHTS_TEST_LOW
  return RARITY_WEIGHTS
}

function secretSpeciesChanceForRoll(): number {
  const luck = activeTestLuck()
  if (luck === 'high') return Math.min(0.06, SECRET_SPECIES_CHANCE * 12)
  if (luck === 'low') return SECRET_SPECIES_CHANCE * 0.25
  return SECRET_SPECIES_CHANCE
}

function shinyChanceForRoll(): number {
  const luck = activeTestLuck()
  if (luck === 'high') return 0.08
  if (luck === 'low') return 0.0025
  return 0.01
}

function rollRarity(rng: () => number): Rarity {
  const weights = rarityWeightsForRoll()
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= weights[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
}

function rollHatRarity(
  rng: () => number,
  petRarity: Rarity,
  hat: Hat,
): HatRarity {
  if (hat === 'none' || petRarity === 'common') return 'standard'
  const p = HAT_ASTRAL_CHANCE[petRarity]
  return rng() < p ? 'astral' : 'standard'
}

function rollStats(
  rng: () => number,
  rarity: Rarity,
): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}

const SALT = 'friend-2026-401'

export type Roll = {
  bones: CompanionBones
  inspirationSeed: number
}

function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng)
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS)
  let species = pick(rng, SPECIES_ROLLABLE)
  // 与 rollRarity 独立：极低概率覆盖为隐藏种 voidling（/high /low 在测试模式下调节）
  if (rng() < secretSpeciesChanceForRoll()) species = voidling
  const bones: CompanionBones = {
    rarity,
    species,
    eye: pick(rng, EYES),
    hat,
    hatRarity: rollHatRarity(rng, rarity, hat),
    charm: 'none',
    shiny: rng() < shinyChanceForRoll(),
    stats: rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

function rollFromForcedRarity(rng: () => number, rarity: Rarity): Roll {
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS)
  let species = pick(rng, SPECIES_ROLLABLE)
  if (rng() < secretSpeciesChanceForRoll()) species = voidling
  const bones: CompanionBones = {
    rarity,
    species,
    eye: pick(rng, EYES),
    hat,
    hatRarity: rollHatRarity(rng, rarity, hat),
    charm: 'none',
    shiny: rng() < shinyChanceForRoll(),
    stats: rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

let rollCache: { key: string; value: Roll } | undefined

export function roll(userId: string): Roll {
  const cfg = getGlobalConfig()
  const nonce = cfg.testMode && cfg.testRollNonce ? cfg.testRollNonce : ''
  const key = userId + SALT + nonce
  if (rollCache?.key === key) return rollCache.value
  const rng = mulberry32(hashString(key))
  const value =
    cfg.testMode && cfg.testForcedRarity
      ? rollFromForcedRarity(rng, cfg.testForcedRarity)
      : rollFrom(rng)
  rollCache = { key, value }
  return value
}

export function rollWithSeed(seed: string): Roll {
  return rollFrom(mulberry32(hashString(seed)))
}

export function companionUserId(): string {
  const config = getGlobalConfig()
  return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'
}

export function getCompanion(): Companion | undefined {
  const stored = getGlobalConfig().companion
  if (!stored) return undefined
  const { bones } = roll(companionUserId())
  return { ...stored, ...bones }
}

export function clearRollCache(): void {
  rollCache = undefined
}
