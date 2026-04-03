/**
 * Keep roll math in sync with src/buddy/companion.ts (non–test-mode path).
 * Personality strings live in src/buddy/personality-data.json (shared).
 */
'use strict'

const fs = require('fs')
const path = require('path')

const personalityData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'src', 'buddy', 'personality-data.json'),
    'utf8',
  ),
)

const SALT = 'friend-2026-401'
const SECRET_SPECIES_CHANCE = 0.005

const RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]

const RARITY_WEIGHTS = {
  common: 30,
  uncommon: 33,
  rare: 24,
  epic: 10,
  legendary: 3,
}

const STAT_NAMES = [
  'DEBUGGING',
  'PATIENCE',
  'CHAOS',
  'WISDOM',
  'SNARK',
]

const RARITY_FLOOR = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
}

const SPECIES_ROLLABLE = [
  'duck',
  'goose',
  'blob',
  'cat',
  'dragon',
  'octopus',
  'owl',
  'penguin',
  'turtle',
  'snail',
  'ghost',
  'axolotl',
  'capybara',
  'cactus',
  'robot',
  'rabbit',
  'mushroom',
  'fox',
  'frog',
  'seal',
  'bee',
  'bear',
  'hamster',
  'dog',
  'koala',
  'sheep',
  'otter',
  'jelly',
  'chonk',
  'skull',
  'moon',
  'crystal',
  'dice',
]

const voidling = 'voidling'

const EYES = ['·', '✦', '×', '◉', '@', '°', '◇', '▽', '◕']

const HATS = [
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
]

const HAT_ASTRAL_CHANCE = {
  uncommon: 0.01,
  rare: 0.02,
  epic: 0.04,
  legendary: 0.075,
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

function rollHatRarity(rng, petRarity, hat) {
  if (hat === 'none' || petRarity === 'common') return 'standard'
  const p = HAT_ASTRAL_CHANCE[petRarity]
  return rng() < p ? 'astral' : 'standard'
}

function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {}
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

function rollInner(rng) {
  const rarity = rollRarity(rng)
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS)
  let species = pick(rng, SPECIES_ROLLABLE)
  if (rng() < SECRET_SPECIES_CHANCE) species = voidling
  const bones = {
    rarity,
    species,
    eye: pick(rng, EYES),
    hat,
    hatRarity: rollHatRarity(rng, rarity, hat),
    charm: 'none',
    shiny: rng() < 0.025,
    stats: rollStats(rng, rarity),
  }
  const inspirationSeed = Math.floor(rng() * 1e9)
  return { bones, inspirationSeed }
}

function roll(userId) {
  const rng = mulberry32(hashString(userId + SALT))
  return rollInner(rng)
}

function rollPersonality(bones, inspirationSeed) {
  const rng = mulberry32(
    hashString(`${bones.species}:${inspirationSeed}:soul-v1`),
  )
  const adj = pick(rng, personalityData.adjectives)
  const flavor = pick(rng, personalityData.flavor[bones.rarity])
  const quirk = pick(rng, personalityData.quirks)
  return `${adj}. ${flavor} ${quirk}`.slice(0, 200)
}

function hatchStoredSoul(userId, existingPersonality) {
  const { bones, inspirationSeed } = roll(userId)
  const trimmed =
    typeof existingPersonality === 'string' ? existingPersonality.trim() : ''
  const personality = trimmed
    ? trimmed.slice(0, 200)
    : rollPersonality(bones, inspirationSeed)
  return {
    name: bones.species,
    personality,
    hatchedAt: Date.now(),
  }
}

const ALL_SPECIES = [...SPECIES_ROLLABLE, voidling]

function isValidSpeciesId(s) {
  const x = String(s || '')
    .trim()
    .toLowerCase()
  return ALL_SPECIES.includes(x)
}

module.exports = {
  roll,
  rollPersonality,
  hatchStoredSoul,
  isValidSpeciesId,
  SPECIES_ROLLABLE,
  voidling,
}
