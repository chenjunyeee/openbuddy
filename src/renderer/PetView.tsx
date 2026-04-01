import React, { useEffect, useRef, useState } from 'react'
import { getCompanion } from '@buddy/companion.js'
import { renderSprite, spriteFrameCount } from '@buddy/sprites.js'
import {
  BUDDY_HEART_RGB_DARK,
  BUDDY_HEART_RGB_LIGHT,
  BUDDY_RARITY_RGB_DARK,
  BUDDY_RARITY_RGB_LIGHT,
} from '@buddy/types.js'
import { useAppState, useSetAppState } from './BuddyState'

const TICK_MS = 500
const PET_BURST_MS = 2500

const IDLE_SEQUENCE = [
  0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0,
]

/** 装饰行：对 `SPECIES` 中任意种族共用，不分支 species。 */
const SLEEP_ZZZ = ['    z      ', '   z z     ', '  Z   z    ']
const PLAYFUL_SPARKLES = [' · ✦ · ✦  ', ' ✦  ·  ✦  ', '  · ✦  ·   ']

const H = '♥'
const PET_HEARTS = [
  `   ${H}    ${H}   `,
  `  ${H}  ${H}   ${H}  `,
  ` ${H}   ${H}  ${H}   `,
  `${H}  ${H}      ${H} `,
  '·    ·   ·  ',
]

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

export function PetView(): React.ReactElement {
  const setAppState = useSetAppState()
  const petAt = useAppState(s => s.companionPetAt)
  const chatLoading = useAppState(s => s.chatLoading)
  const chatBubble = useAppState(s => s.chatBubble)
  const prevChatLoading = useRef(false)
  const replyBurstUntil = useRef(0)
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
      setAppState(s => ({ ...s, companionPetAt: Date.now() }))
    })
  }, [setAppState])

  const nightMode = useAppState(s => Boolean(s.nightMode))
  /** 与种族无关：任意 `companion.species` 均适用同一套 sleep / playful 逻辑。 */
  const petMood = useAppState(s => s.petMood)
  const companion = getCompanion()
  if (!companion) {
    return (
      <div className="pet-muted">
        …
      </div>
    )
  }

  const heartInk = nightMode ? BUDDY_HEART_RGB_DARK : BUDDY_HEART_RGB_LIGHT
  const rarityInk = nightMode
    ? BUDDY_RARITY_RGB_DARK[companion.rarity]
    : BUDDY_RARITY_RGB_LIGHT[companion.rarity]
  /** 拖窗会高频刷新 `companionPetAt`，不得再绑「渲染里 reset petStartTick」否则 petAge 归零、爱心与精灵会闪 */
  const petting =
    petAt != null && Date.now() - petAt < PET_BURST_MS
  const replyBurstActive =
    !chatLoading &&
    Date.now() < replyBurstUntil.current &&
    Boolean(chatBubble?.trim())
  /** 对话兴奋态；抚摸单独叠加，不与睡觉/星星装饰互斥 */
  const chatExcited = Boolean(chatLoading) || replyBurstActive
  const spriteFast = petting || chatExcited

  const frameCount = spriteFrameCount(companion.species)
  const heartLine = petting ? PET_HEARTS[tick % PET_HEARTS.length]! : null

  let idleSeqIndex = tick % IDLE_SEQUENCE.length
  if (!spriteFast) {
    if (petMood === 'sleep') {
      idleSeqIndex = Math.floor(tick / 2) % IDLE_SEQUENCE.length
    } else if (petMood === 'playful') {
      idleSeqIndex = (tick * 2) % IDLE_SEQUENCE.length
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

  const bodyLines = renderSprite(companion, spriteFrame).map(line =>
    blink ? line.replaceAll(companion.eye, '-') : line,
  )

  const moodPrefix: string[] = []
  if (petMood === 'sleep' && !chatLoading) {
    moodPrefix.push(SLEEP_ZZZ[tick % SLEEP_ZZZ.length]!)
  } else if (petMood === 'playful' && !chatLoading) {
    moodPrefix.push(PLAYFUL_SPARKLES[tick % PLAYFUL_SPARKLES.length]!)
  }

  const spriteLines = [
    ...moodPrefix,
    ...(heartLine ? [heartLine] : []),
    ...bodyLines,
  ]

  const showBubble =
    Boolean(chatLoading) || Boolean(chatBubble != null && chatBubble.trim())

  return (
    <div className="pet-view">
      <div className="pet-row">
        {showBubble ? (
          <PetBubble loading={Boolean(chatLoading)} text={chatBubble} />
        ) : null}
        <pre
          className="sprite-pre"
          title="拖动移窗时会抚摸"
        >
          {spriteLines.map((line, i) => {
            const moodLines = moodPrefix.length
            const heartIdx = moodLines
            const isHeartRow = Boolean(heartLine) && i === heartIdx
            const isMoodRow = i < moodLines
            return (
              <React.Fragment key={i}>
                {i > 0 ? '\n' : null}
                <span
                  style={{
                    color: isHeartRow ? heartInk : rarityInk,
                    opacity: isMoodRow ? 0.92 : 1,
                  }}
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
  )
}
