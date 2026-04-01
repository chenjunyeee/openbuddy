import React, { useEffect, useRef, useState } from 'react'
import { getCompanion } from '@buddy/companion.js'
import { renderSpriteWithMeta, spriteFrameCount } from '@buddy/sprites.js'
import {
  BUDDY_HEART_RGB_DARK,
  BUDDY_HEART_RGB_LIGHT,
  BUDDY_RARITY_RGB_DARK,
  BUDDY_RARITY_RGB_LIGHT,
} from '@buddy/types.js'
import { useAppState, useSetAppState } from './BuddyState'

const TICK_MS = 500
const PET_BURST_MS = 2500

/** 含眨眼：-1 仅替换 `{E}`；连续两拍便于看清（@500ms/tick ≈1s 闭眼） */
const IDLE_SEQUENCE = [
  0, 0, 0, 0, 1, 0, 0, 0, -1, -1, 0, 0, 2, 0, 0, 0,
]

/** 装饰行：对 `SPECIES` 中任意种族共用，不分支 species。 */
const SLEEP_ZZZ = ['    z      ', '   z z     ', '  Z   z    ']
/** 与气泡「在想中」同步：仅 `chatLoading` 且尚无流式正文时显示 */
const THINKING_SPARKLES = [' · ✦ · ✦  ', ' ✦  ·  ✦  ', '  · ✦  ·   ']

const H = '♥'
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  ',
]

/** 与爱心行同宽同高、占位避免摸宠时增删行触发 resize ↔ setBounds 微抖 */
const PET_HEART_ROW_PLACEHOLDER = ' '.repeat(PET_HEARTS[0]!.length)

const BUBBLE_LINE_CHARS = 20
const BUBBLE_MAX_LINES = 10

/** 按字符断行（中日文与混排可用） */
function wrapBubbleText(text: string): string[] {
  const lines: string[] = []
  let i = 0
  const t = text.trim()
  while (i < t.length && lines.length < BUBBLE_MAX_LINES) {
    lines.push(t.slice(i, i + BUBBLE_LINE_CHARS))
    i += BUBBLE_LINE_CHARS
  }
  if (i < t.length && lines.length > 0) {
    const last = lines[lines.length - 1]!
    lines[lines.length - 1] =
      last.slice(0, Math.max(0, BUBBLE_LINE_CHARS - 1)) + '…'
  }
  return lines
}

/** 流式输出：不整体 trim，避免前半段被吃掉 */
function wrapBubbleStreaming(text: string): string[] {
  const lines: string[] = []
  let i = 0
  const t = text.replace(/\r/g, '')
  while (i < t.length && lines.length < BUBBLE_MAX_LINES) {
    lines.push(t.slice(i, i + BUBBLE_LINE_CHARS))
    i += BUBBLE_LINE_CHARS
  }
  if (i < t.length && lines.length > 0) {
    const last = lines[lines.length - 1]!
    lines[lines.length - 1] =
      last.slice(0, Math.max(0, BUBBLE_LINE_CHARS - 1)) + '…'
  }
  return lines
}

function PetBubble({
  loading,
  text,
}: {
  loading: boolean
  text: string | undefined
}): React.ReactElement {
  const raw = text ?? ''
  const streaming = loading && raw.length > 0
  const linesLoadingOnly = loading && !streaming
  const lines = streaming
    ? wrapBubbleStreaming(raw)
    : !loading && raw.trim()
      ? wrapBubbleText(raw)
      : []

  return (
    <div className="pet-chat-bubble surface-card" aria-live="polite">
      <div className="pet-chat-bubble-body">
        {linesLoadingOnly ? (
          <div className="pet-chat-bubble-loading">
            <span className="pet-chat-bubble-loading-label">在想中</span>
            <span className="pet-chat-bubble-dots" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        ) : null}
        {lines.map((line, i) => (
          <div key={i} className="pet-chat-bubble-line">
            {line || ' '}
            {streaming && i === lines.length - 1 ? (
              <span className="pet-chat-stream-cursor" aria-hidden>
                ▍
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="pet-chat-bubble-tail" aria-hidden />
    </div>
  )
}

/** 用于外形变化时触发一次短促「开盒」动效（不测缓存对象，只测 roll 结果字段） */
function companionAppearanceKey(c: {
  species: string
  eye: string
  hat: string
  hatRarity: string
  charm: string
  rarity: string
  shiny: boolean
}): string {
  return `${c.species}:${c.eye}:${c.hat}:${c.hatRarity}:${c.charm}:${c.rarity}:${c.shiny ? 1 : 0}`
}

/**
 * 背景柔边小云：径向渐变 + 椭圆叠层，纯 CSS 飘动（整层横移 + 单泡上下），与精灵 tick 无关。
 */
function PetSpriteClouds(): React.ReactElement {
  return (
    <div className="pet-sprite-clouds" aria-hidden>
      <div className="pet-sprite-clouds-band">
        <div className="pet-sprite-cluster pet-sprite-cluster--a">
          <span className="pet-sprite-bubble pet-sprite-bubble--a1" />
          <span className="pet-sprite-bubble pet-sprite-bubble--a2" />
          <span className="pet-sprite-bubble pet-sprite-bubble--a3" />
        </div>
        <div className="pet-sprite-cluster pet-sprite-cluster--b">
          <span className="pet-sprite-bubble pet-sprite-bubble--b1" />
          <span className="pet-sprite-bubble pet-sprite-bubble--b2" />
          <span className="pet-sprite-bubble pet-sprite-bubble--b3" />
        </div>
        <div className="pet-sprite-cluster pet-sprite-cluster--c">
          <span className="pet-sprite-bubble pet-sprite-bubble--c1" />
          <span className="pet-sprite-bubble pet-sprite-bubble--c2" />
        </div>
      </div>
    </div>
  )
}

export function PetView(): React.ReactElement {
  const setAppState = useSetAppState()
  const petAt = useAppState(s => s.companionPetAt)
  const chatLoading = useAppState(s => s.chatLoading)
  const chatBubble = useAppState(s => s.chatBubble)
  const prevChatLoading = useRef(false)
  const replyBurstUntil = useRef(0)
  const appearancePrev = useRef<string | null>(null)
  const [gachaReveal, setGachaReveal] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), TICK_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const was = prevChatLoading.current
    prevChatLoading.current = Boolean(chatLoading)
    if (was && !chatLoading && chatBubble?.trim()) {
      replyBurstUntil.current = Date.now() + PET_BURST_MS
    }
  }, [chatLoading, chatBubble])

  useEffect(() => {
    const sub = window.buddyDesktop?.subscribeWindowMoved
    if (!sub) return
    return sub(() => {
      setAppState(s => ({
        ...s,
        companionPetAt: Date.now(),
        lastPetAttentionAt: Date.now(),
        petMood: s.petMood === 'sleep' ? undefined : s.petMood,
      }))
    })
  }, [setAppState])

  const appearance = useAppState(s => s.shellAppearance)
  const darkPalette =
    appearance === 'transparent-dark' || appearance === 'solid-night'
  /** 与种族无关：睡眠由 `petMood`；星星仅在「在想中」阶段。 */
  const petMood = useAppState(s => s.petMood)
  const companion = getCompanion()
  if (!companion) {
    return (
      <div className="pet-muted">
        …
      </div>
    )
  }

  const appearanceKey = companionAppearanceKey(companion)
  useEffect(() => {
    const first = appearancePrev.current === null
    const changed =
      appearancePrev.current !== null && appearancePrev.current !== appearanceKey
    appearancePrev.current = appearanceKey
    if (!first && !changed) return
    setGachaReveal(true)
    const t = window.setTimeout(() => setGachaReveal(false), 1100)
    return () => window.clearTimeout(t)
  }, [appearanceKey])

  const heartInk = darkPalette ? BUDDY_HEART_RGB_DARK : BUDDY_HEART_RGB_LIGHT
  const rarityInk = darkPalette
    ? BUDDY_RARITY_RGB_DARK[companion.rarity]
    : BUDDY_RARITY_RGB_LIGHT[companion.rarity]
  const spriteWrapClassNames = [
    'pet-sprite-sprite-wrap',
    gachaReveal ? 'pet-sprite-sprite-wrap--gacha' : '',
    companion.shiny ? 'pet-sprite-sprite-wrap--shiny' : '',
    companion.rarity === 'epic' ? 'pet-sprite-sprite-wrap--epic' : '',
    companion.rarity === 'legendary'
      ? 'pet-sprite-sprite-wrap--legendary'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  /** 拖窗会高频刷新 `companionPetAt`，不得再绑「渲染里 reset petStartTick」否则 petAge 归零、爱心与精灵会闪 */
  const petting =
    petAt != null && Date.now() - petAt < PET_BURST_MS
  const replyBurstActive =
    !chatLoading &&
    Date.now() < replyBurstUntil.current &&
    Boolean(chatBubble?.trim())
  /** 对话兴奋态（含整段 loading 与回复结束后的 burst）；抚摸单独叠加 */
  const chatExcited = Boolean(chatLoading) || replyBurstActive
  const spriteFast = petting || chatExcited

  /** 与 `PetBubble` 的「在想中」同条件：loading 且尚无流式字符 */
  const bubbleThinkingOnly =
    Boolean(chatLoading) && !(chatBubble != null && chatBubble.length > 0)

  const frameCount = spriteFrameCount(companion.species)
  const heartLineText = petting
    ? PET_HEARTS[tick % PET_HEARTS.length]!
    : PET_HEART_ROW_PLACEHOLDER

  let idleSeqIndex = tick % IDLE_SEQUENCE.length
  if (!spriteFast) {
    if (petMood === 'sleep') {
      idleSeqIndex = Math.floor(tick / 2) % IDLE_SEQUENCE.length
    }
  }

  let spriteFrame: number
  let blink = false
  if (spriteFast) {
    spriteFrame = tick % frameCount
  } else {
    const step = IDLE_SEQUENCE[idleSeqIndex]!
    if (step === -1) {
      spriteFrame = 0
      blink = petMood !== 'sleep'
    } else {
      spriteFrame = step % frameCount
    }
  }

  const { lines: spriteMetaLines, hatLineIndex } = renderSpriteWithMeta(
    companion,
    spriteFrame,
    blink,
  )
  const bodyLines = spriteMetaLines

  const moodPrefix: string[] = []
  if (petMood === 'sleep' && !chatLoading) {
    moodPrefix.push(SLEEP_ZZZ[tick % SLEEP_ZZZ.length]!)
  } else if (bubbleThinkingOnly) {
    moodPrefix.push(THINKING_SPARKLES[tick % THINKING_SPARKLES.length]!)
  }

  const spriteLines = [...moodPrefix, heartLineText, ...bodyLines]
  const bodyStartIdx = moodPrefix.length + 1
  const astralHatSpriteIdx =
    companion.hatRarity === 'astral' &&
    companion.hat !== 'none' &&
    hatLineIndex != null
      ? bodyStartIdx + hatLineIndex
      : null

  const showBubble =
    Boolean(chatLoading) || Boolean(chatBubble != null && chatBubble.trim())

  return (
    <div className="pet-view">
      <div className="pet-row">
        {showBubble ? (
          <PetBubble loading={Boolean(chatLoading)} text={chatBubble} />
        ) : null}
        <div className="pet-sprite-stage">
          <PetSpriteClouds />
          <div className={spriteWrapClassNames}>
            <pre
              className="sprite-pre"
              title="仅精灵区域可拖移窗口（抚摸）"
            >
              {spriteLines.map((line, i) => {
                const moodLines = moodPrefix.length
                const heartIdx = moodLines
                const isHeartRow = i === heartIdx
                const isMoodRow = i < moodLines
                const isAstralHatRow =
                  astralHatSpriteIdx != null && i === astralHatSpriteIdx
                const isPetLine = i > heartIdx && !isAstralHatRow
                const lineClass = [
                  isAstralHatRow ? 'sprite-pre-hat-astral' : null,
                  isPetLine ? 'sprite-pre-line--pet' : null,
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <React.Fragment key={i}>
                    {i > 0 ? '\n' : null}
                    <span
                      className={lineClass || undefined}
                      style={
                        isAstralHatRow
                          ? undefined
                          : {
                              color: isHeartRow && petting ? heartInk : rarityInk,
                              opacity:
                                isHeartRow && !petting
                                  ? 0
                                  : isMoodRow
                                    ? 0.92
                                    : 1,
                            }
                      }
                    >
                      {line}
                    </span>
                  </React.Fragment>
                )
              })}
              {'\n'}
              <span
                className="sprite-pre-name"
                style={{ color: rarityInk }}
              >
                {companion.name}
              </span>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
