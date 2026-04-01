import React, { useEffect, useRef, useState } from 'react'
import { getCompanion } from '@buddy/companion.js'
import { renderSprite, spriteFrameCount } from '@buddy/sprites.js'
import {
  BUDDY_HEART_RGB_DARK,
  BUDDY_HEART_RGB_LIGHT,
  BUDDY_RARITY_RGB_DARK,
  BUDDY_RARITY_RGB_LIGHT,
} from '@buddy/types.js'
import { useAppState } from './BuddyState'

const TICK_MS = 500
const PET_BURST_MS = 2500

const IDLE_SEQUENCE = [
  0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0,
]

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

function PetBubble({
  loading,
  text,
}: {
  loading: boolean
  text: string | undefined
}): React.ReactElement {
  const lines = loading || !text ? [] : wrapBubbleText(text)

  return (
    <div className="pet-chat-bubble surface-card" aria-live="polite">
      <div className="pet-chat-bubble-body">
        {loading ? (
          <div className="pet-chat-bubble-loading">
            <span className="pet-chat-bubble-loading-label">在想中</span>
            <span className="pet-chat-bubble-dots" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="pet-chat-bubble-line">
              {line || ' '}
            </div>
          ))
        )}
      </div>
      <div className="pet-chat-bubble-tail" aria-hidden />
    </div>
  )
}

export function PetView(): React.ReactElement {
  const petAt = useAppState(s => s.companionPetAt)
  const chatLoading = useAppState(s => s.chatLoading)
  const chatBubble = useAppState(s => s.chatBubble)
  const prevChatLoading = useRef(false)
  const replyBurstUntil = useRef(0)
  const [tick, setTick] = useState(0)
  const [{ petStartTick, forPetAt }, setPetStart] = useState({
    petStartTick: 0,
    forPetAt: petAt,
  })
  if (petAt !== forPetAt) {
    setPetStart({ petStartTick: tick, forPetAt: petAt })
  }

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

  const nightMode = useAppState(s => Boolean(s.nightMode))
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
  const petAge = petAt ? tick - petStartTick : Infinity
  const petting = petAge * TICK_MS < PET_BURST_MS
  const replyBurstActive =
    !chatLoading &&
    Date.now() < replyBurstUntil.current &&
    Boolean(chatBubble?.trim())
  const excited = petting || Boolean(chatLoading) || replyBurstActive

  const frameCount = spriteFrameCount(companion.species)
  const heartLine = petting ? PET_HEARTS[petAge % PET_HEARTS.length]! : null
  let spriteFrame: number
  let blink = false
  if (excited) {
    spriteFrame = tick % frameCount
  } else {
    const step = IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length]!
    if (step === -1) {
      spriteFrame = 0
      blink = true
    } else {
      spriteFrame = step % frameCount
    }
  }

  const bodyLines = renderSprite(companion, spriteFrame).map(line =>
    blink ? line.replaceAll(companion.eye, '-') : line,
  )
  const spriteLines = heartLine ? [heartLine, ...bodyLines] : bodyLines

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
          style={{
            margin: 0,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.15,
            fontWeight: 400,
          }}
        >
          {spriteLines.map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 ? '\n' : null}
              <span
                style={{
                  color: Boolean(heartLine) && i === 0 ? heartInk : rarityInk,
                }}
              >
                {line}
              </span>
            </React.Fragment>
          ))}
          {'\n'}
          <span
            style={{
              fontStyle: 'italic',
              opacity: 0.78,
              fontWeight: 400,
              color: rarityInk,
            }}
          >
            {companion.name}
          </span>
        </pre>
      </div>
    </div>
  )
}
