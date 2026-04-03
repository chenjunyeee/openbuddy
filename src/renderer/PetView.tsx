import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  companionUserId,
  getCompanion,
  hatchCompanionSoul,
} from '@buddy/companion.js'
import { setGlobalConfig, getGlobalConfig } from '@buddy/config.js'
import { renderSpriteWithMeta, spriteFrameCount } from '@buddy/sprites.js'
import {
  type BuddyAppState,
  BUDDY_HEART_RGB_DARK,
  BUDDY_HEART_RGB_LIGHT,
  BUDDY_RARITY_RGB_DARK,
  BUDDY_RARITY_RGB_LIGHT,
} from '@buddy/types.js'
import { CompanionStatsPanel } from './CompanionStatsPanel'
import { useAppState, useSetAppState } from './BuddyState'

/** 是否仍有「气泡内容」（用于保留锚点占位，失焦隐藏时不卸载以免窗口伸缩导致精灵位移） */
export function hasPetBubbleContent(s: BuddyAppState): boolean {
  if (typeof s.openclawGuideStep === 'number') return true
  if (s.chatLoading) return true
  return Boolean((s.chatBubble ?? '').trim())
}

/** 左侧锚点是否应有内容（聊天气泡 ± /stat 属性块，同一位置）。仅桌宠也保留 DOM，与对话框同属占位隐藏，避免缩窗导致精灵位移。 */
export function hasPetSideSlotContent(s: BuddyAppState): boolean {
  return hasPetBubbleContent(s) || s.statPanelOpen === true
}

/** 与 Shell `resizeToFit`、PetView 同步：是否「画出」聊天气泡（失焦 idle 时仍可保留 DOM，仅视觉隐藏） */
export function shouldShowPetChatBubble(s: BuddyAppState): boolean {
  if (!hasPetBubbleContent(s)) return false
  if (s.chatLoading) return true
  if (typeof s.openclawGuideStep === 'number') return true
  return !s.chatBubbleIdleHidden
}

/** 左侧锚点是否可见：对话气泡或 /stat 属性（共用位，同一套失焦隐藏规则） */
export function shouldShowPetSideSlot(s: BuddyAppState): boolean {
  if (s.petSoloMode === true) return false
  if (shouldShowPetChatBubble(s)) return true
  if (s.statPanelOpen === true && !s.chatBubbleIdleHidden) return true
  return false
}

const TICK_MS = 500
const PET_BURST_MS = 2500

/** 英文名展示：物种 id 首字母大写（存储仍为小写枚举） */
function speciesLabelEnglish(species: string): string {
  if (!species) return ''
  return species.charAt(0).toUpperCase() + species.slice(1)
}

/** 含眨眼：-1 仅替换 `{E}`；连续两拍便于看清（@500ms/tick ≈1s 闭眼） */
const IDLE_SEQUENCE = [
  0, 0, 0, 0, 1, 0, 0, 0, -1, -1, 0, 0, 2, 0, 0, 0,
]

/** 装饰行：对 `SPECIES` 中任意种族共用，不分支 species。 */
const SLEEP_ZZZ = ['    z      ', '   z z     ', '  Z   z    ']
/** 与气泡「在想中」同步：仅 `chatLoading` 且尚无流式正文时显示 */
const THINKING_SPARKLES = [' · ✦ · ✦  ', ' ✦  ·  ✦  ', '  · ✦  ·   ']
/** 与爱心行同理：睡眠/在想与常态之间不换行数，减轻 buddy-resize 上下抖 */
const PET_MOOD_ROW_PLACEHOLDER = ' '.repeat(
  Math.max(
    ...SLEEP_ZZZ.map(s => s.length),
    ...THINKING_SPARKLES.map(s => s.length),
  ),
)

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

/** 蛋破壳 ASCII 帧（定宽，与精灵区锚点一致） */
const EGG_FRAMES: readonly string[][] = [
  [
    '      ██████      ',
    '    ██░░░░░░██    ',
    '   ██░░████░░██   ',
    '   ██░░████░░██   ',
    '   ██░░░░░░░░██   ',
    '    ██░░░░░░██    ',
    '      ██████      ',
    '                  ',
  ],
  [
    '      ██████      ',
    '    ██░░░░░░██    ',
    '   ██░▓████░░██   ',
    '   ██░░████▓░██   ',
    '   ██░░░░░░░░██   ',
    '    ██░░░░░░██    ',
    '      ██████      ',
    '                  ',
  ],
  [
    '      ██████      ',
    '    ██▓░░░░░██    ',
    '   ██▓░███▓░░██   ',
    '   ██░░███▓▓░██   ',
    '   ██░░▓░░░░░██   ',
    '    ██░░░░░░▓█    ',
    '      ██████      ',
    '                  ',
  ],
  [
    '      █▓▓██      ',
    '    ██▓░░░░▓█    ',
    '   █▓░░███▓░▓█    ',
    '   █▓░███▓▓░▓█    ',
    '   █▓░░▓░░░░▓█    ',
    '    █▓░░░░░▓▓     ',
    '      ▀▀▀▀        ',
    '                  ',
  ],
  [
    '       ░░░         ',
    '     ░▓▓▓▓▓░       ',
    '    ░▓░███▓▓░      ',
    '    ░▓░█▓▓▓▓░      ',
    '     ░▓░░░░▓░      ',
    '      ░▓▓▓▓░       ',
    '       ···          ',
    '                  ',
  ],
]

function PetBubble({
  loading,
  text,
  onClose,
}: {
  loading: boolean
  text: string | undefined
  onClose?: () => void
}): React.ReactElement {
  const raw = text ?? ''
  const streaming = loading && raw.length > 0
  const linesLoadingOnly = loading && !streaming
  const bodyText = streaming ? raw.replace(/\r/g, '') : raw.trim()
  const showBody = streaming || Boolean(bodyText)
  const showClose = Boolean(onClose) && !loading

  return (
    <div className="pet-chat-bubble-outer" aria-live="polite">
      {showClose ? (
        <button
          type="button"
          className="pet-chat-bubble__close"
          onClick={onClose}
          aria-label="关闭聊天气泡"
        >
          ×
        </button>
      ) : null}
      <div className="pet-chat-bubble surface-card">
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
          {showBody ? (
            <div className="pet-chat-bubble-line">
              {bodyText || ' '}
              {streaming ? (
                <span className="pet-chat-stream-cursor" aria-hidden>
                  ▍
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
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
 * 顶栏像素云：三团弧排（左抬高 / 中棚云 / 右略抬），`box-shadow` 拼块 + 飘动；层宽计入 buddy-resize union。
 */
function PetSpriteClouds(): React.ReactElement {
  return (
    <div className="pet-sprite-clouds" aria-hidden>
      <div className="pet-sprite-clouds-band">
        <span className="pet-pixel-cloud pet-pixel-cloud--a" />
        <span className="pet-pixel-cloud pet-pixel-cloud--b" />
        <span className="pet-pixel-cloud pet-pixel-cloud--c" />
      </div>
    </div>
  )
}

export function PetView(): React.ReactElement {
  const setAppState = useSetAppState()
  const petAt = useAppState(s => s.companionPetAt)
  const chatLoading = useAppState(s => s.chatLoading)
  const chatBubble = useAppState(s => s.chatBubble)
  const petSoloMode = useAppState(s => s.petSoloMode === true)
  const hasHatchedCompanion = useAppState(s => s.hasHatchedCompanion === true)
  const bubbleSlotActive = useAppState(hasPetSideSlotContent)
  /**
   * 已孵化即有侧栏锚点 DOM（含 solo）：避免关气泡或进 solo 时卸载锚点 → union 变窄 → buddy-resize 整窗闪。
   * 仅桌宠时 `shouldShowPetSideSlot` 为 false，用 --concealed + 穿透命中，不挡操作。
   */
  const bubbleAnchorMounted = bubbleSlotActive || hasHatchedCompanion
  const bubbleAnchorReserve =
    hasHatchedCompanion && !bubbleSlotActive
  const bubbleHasChat = useAppState(hasPetBubbleContent)
  const showBubblePaint = useAppState(shouldShowPetSideSlot)
  const statPanelOpen = useAppState(s => s.statPanelOpen === true)
  const shellAppearance = useAppState(s => s.shellAppearance)
  const dismissChatBubble = useCallback((): void => {
    setAppState(s => ({
      ...s,
      chatBubble: undefined,
      chatBubbleIdleHidden: false,
      openclawGuideStep: undefined,
    }))
  }, [setAppState])
  const closeStatPanel = useCallback((): void => {
    setAppState(s => ({ ...s, statPanelOpen: false }))
  }, [setAppState])
  const togglePetSoloMode = useCallback((): void => {
    setAppState(s => ({ ...s, petSoloMode: !s.petSoloMode }))
  }, [setAppState])

  const completeHatch = useCallback(async (): Promise<boolean> => {
    if (getGlobalConfig().companion) return true
    try {
      const soul = hatchCompanionSoul(companionUserId())
      setGlobalConfig({ companion: soul })
      const save = window.buddyDesktop?.saveProfile
      if (save) {
        const r = await save({ companion: soul })
        if (!r.ok) {
          setEggErr((r.error ?? '!').slice(0, 24))
          setGlobalConfig({ companion: undefined })
          return false
        }
      }
      setEggErr(null)
      setAppState(s => ({
        ...s,
        hasHatchedCompanion: true,
        statPanelOpen: true,
        chatBubbleIdleHidden: false,
      }))
      return true
    } catch {
      setEggErr('!')
      return false
    }
  }, [setAppState])

  const prevChatLoading = useRef(false)
  const replyBurstUntil = useRef(0)
  const appearancePrev = useRef<string | null>(null)
  const [gachaReveal, setGachaReveal] = useState(false)
  const [tick, setTick] = useState(0)
  const [eggFrame, setEggFrame] = useState(0)
  const [eggErr, setEggErr] = useState<string | null>(null)
  const [eggPhase, setEggPhase] = useState<'idle' | 'cracking'>('idle')
  const eggCrackTimersRef = useRef<{ iv?: number; to?: number }>({})
  const eggCrackingBusyRef = useRef(false)

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

  const completeHatchRef = useRef(completeHatch)
  completeHatchRef.current = completeHatch

  useEffect(() => {
    return () => {
      const { iv, to } = eggCrackTimersRef.current
      if (iv !== undefined) window.clearInterval(iv)
      if (to !== undefined) window.clearTimeout(to)
      eggCrackTimersRef.current = {}
      eggCrackingBusyRef.current = false
    }
  }, [])

  /** 回到蛋（含 /reboot）：停破壳动画并重置为可点击 */
  useEffect(() => {
    if (getGlobalConfig().companion) return
    const { iv, to } = eggCrackTimersRef.current
    if (iv !== undefined) window.clearInterval(iv)
    if (to !== undefined) window.clearTimeout(to)
    eggCrackTimersRef.current = {}
    eggCrackingBusyRef.current = false
    setEggPhase('idle')
    setEggFrame(0)
    setEggErr(null)
  }, [hasHatchedCompanion])

  const onEggHatchClick = useCallback((): void => {
    if (getGlobalConfig().companion) return
    if (eggCrackingBusyRef.current) return
    eggCrackingBusyRef.current = true
    setEggErr(null)
    setEggPhase('cracking')
    let f = 0
    setEggFrame(0)
    const iv = window.setInterval(() => {
      f++
      if (f < EGG_FRAMES.length) {
        setEggFrame(f)
      } else {
        window.clearInterval(iv)
        eggCrackTimersRef.current.iv = undefined
        const to = window.setTimeout(() => {
          eggCrackTimersRef.current.to = undefined
          void completeHatchRef.current().then(ok => {
            eggCrackingBusyRef.current = false
            if (!ok) {
              setEggPhase('idle')
              setEggFrame(0)
            }
          })
        }, 420)
        eggCrackTimersRef.current.to = to
      }
    }, TICK_MS)
    eggCrackTimersRef.current.iv = iv
  }, [])

  const darkPalette =
    shellAppearance === 'transparent-dark' ||
    shellAppearance === 'sprite-backdrop-dark'
  const spriteBackdropClass =
    shellAppearance === 'sprite-backdrop-light'
      ? 'pet-sprite-stage--backdrop-light'
      : shellAppearance === 'sprite-backdrop-dark'
        ? 'pet-sprite-stage--backdrop-dark'
        : ''
  const cloudsHidden = useAppState(s => s.petCloudsHidden === true)
  /** 与种族无关：睡眠由 `petMood`；星星仅在「在想中」阶段。 */
  const petMood = useAppState(s => s.petMood)
  const companion = getCompanion()
  const appearanceKey = companion
    ? companionAppearanceKey(companion)
    : ''

  useEffect(() => {
    if (!appearanceKey) return
    const first = appearancePrev.current === null
    const changed =
      appearancePrev.current !== null && appearancePrev.current !== appearanceKey
    appearancePrev.current = appearanceKey
    if (!first && !changed) return
    setGachaReveal(true)
    const t = window.setTimeout(() => setGachaReveal(false), 1100)
    return () => window.clearTimeout(t)
  }, [appearanceKey])

  if (!companion) {
    const eggInk = darkPalette
      ? BUDDY_RARITY_RGB_DARK.common
      : BUDDY_RARITY_RGB_LIGHT.common
    const fi =
      eggPhase === 'idle'
        ? 0
        : Math.min(eggFrame, EGG_FRAMES.length - 1)
    const eggLines = EGG_FRAMES[fi]!
    const eggFinal =
      eggPhase === 'cracking' && fi >= EGG_FRAMES.length - 1
    const eggWrapClass = [
      'pet-sprite-sprite-wrap',
      'pet-sprite-sprite-wrap--egg',
      eggFinal ? 'pet-sprite-sprite-wrap--egg-final' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const eggAnchorClass = [
      'pet-bubble-anchor',
      !showBubblePaint || bubbleAnchorReserve
        ? 'pet-bubble-anchor--concealed'
        : null,
      bubbleAnchorReserve ? 'pet-bubble-anchor--reserve' : null,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="pet-view">
        <div className="pet-row">
          {bubbleAnchorMounted ? (
            <div
              className={eggAnchorClass}
              aria-hidden={!showBubblePaint || bubbleAnchorReserve}
            >
              {statPanelOpen ? (
                <CompanionStatsPanel
                  shellAppearance={shellAppearance}
                  onClose={closeStatPanel}
                />
              ) : bubbleHasChat ? (
                <PetBubble
                  loading={Boolean(chatLoading)}
                  text={chatBubble}
                  onClose={dismissChatBubble}
                />
              ) : null}
            </div>
          ) : null}
          <div
            className={
              spriteBackdropClass
                ? `pet-sprite-stage ${spriteBackdropClass}`
                : 'pet-sprite-stage'
            }
          >
            {!cloudsHidden ? <PetSpriteClouds /> : null}
            <div className={eggWrapClass}>
              <pre
                className="sprite-pre sprite-pre--egg"
                title={
                  eggPhase === 'idle'
                    ? '点击蛋孵化（云朵区域仍可拖移窗口）'
                    : '破壳中…'
                }
                aria-label="蛋"
              >
                {eggLines.map((line, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? '\n' : null}
                    <span style={{ color: eggInk }}>{line}</span>
                  </React.Fragment>
                ))}
                {'\n'}
                <span
                  className="sprite-pre-name"
                  style={{
                    color: eggInk,
                    opacity: eggErr ? 1 : eggPhase === 'idle' ? 0.72 : 0.55,
                  }}
                >
                  {eggErr ??
                    (eggPhase === 'idle' ? '点击孵化' : ' ··· ')}
                </span>
              </pre>
              {eggPhase === 'idle' ? (
                <button
                  type="button"
                  className="egg-hatch-hit"
                  onClick={onEggHatchClick}
                  aria-label="点击孵化"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const heartInk = darkPalette ? BUDDY_HEART_RGB_DARK : BUDDY_HEART_RGB_LIGHT
  const rarityInk =
    (darkPalette
      ? BUDDY_RARITY_RGB_DARK[companion.rarity]
      : BUDDY_RARITY_RGB_LIGHT[companion.rarity]) ??
    (darkPalette ? BUDDY_RARITY_RGB_DARK.common : BUDDY_RARITY_RGB_LIGHT.common)
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

  const moodLineActive =
    (petMood === 'sleep' && !chatLoading) || bubbleThinkingOnly
  const moodLineText = moodLineActive
    ? petMood === 'sleep' && !chatLoading
      ? SLEEP_ZZZ[tick % SLEEP_ZZZ.length]!
      : THINKING_SPARKLES[tick % THINKING_SPARKLES.length]!
    : PET_MOOD_ROW_PLACEHOLDER
  const moodPrefix: string[] = [moodLineText]

  const spriteLines = [...moodPrefix, heartLineText, ...bodyLines]
  const bodyStartIdx = moodPrefix.length + 1
  const astralHatSpriteIdx =
    companion.hatRarity === 'astral' &&
    companion.hat !== 'none' &&
    hatLineIndex != null
      ? bodyStartIdx + hatLineIndex
      : null

  const petAnchorClass = [
    'pet-bubble-anchor',
    !showBubblePaint || bubbleAnchorReserve
      ? 'pet-bubble-anchor--concealed'
      : null,
    bubbleAnchorReserve ? 'pet-bubble-anchor--reserve' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="pet-view">
      <div className="pet-row">
        {bubbleAnchorMounted ? (
          <div
            className={petAnchorClass}
            aria-hidden={!showBubblePaint || bubbleAnchorReserve}
          >
            {statPanelOpen ? (
              <CompanionStatsPanel
                shellAppearance={shellAppearance}
                onClose={closeStatPanel}
              />
            ) : bubbleHasChat ? (
              <PetBubble
                loading={Boolean(chatLoading)}
                text={chatBubble}
                onClose={dismissChatBubble}
              />
            ) : null}
          </div>
        ) : null}
        <div
          className={
            spriteBackdropClass
              ? `pet-sprite-stage ${spriteBackdropClass}`
              : 'pet-sprite-stage'
          }
        >
          {!cloudsHidden ? <PetSpriteClouds /> : null}
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
                                  : isMoodRow && !moodLineActive
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
                {speciesLabelEnglish(companion.species)}
              </span>
            </pre>
            <button
              type="button"
              className={
                petSoloMode ? 'pet-solo-pip pet-solo-pip--on' : 'pet-solo-pip'
              }
              style={{
                borderColor: rarityInk,
                background: petSoloMode ? rarityInk : 'transparent',
              }}
              onClick={togglePetSoloMode}
              title={
                petSoloMode
                  ? '恢复对话与气泡（/solo off）'
                  : '仅桌宠：隐藏输入与气泡（/solo）'
              }
              aria-label={
                petSoloMode ? '关闭仅桌宠模式' : '开启仅桌宠模式'
              }
              aria-pressed={petSoloMode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
